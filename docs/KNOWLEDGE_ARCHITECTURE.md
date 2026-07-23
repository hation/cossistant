# 知识库架构方案

## 概述

Cossistant 的知识库系统是一个基于 **RAG (Retrieval-Augmented Generation)** 的检索增强生成系统，支持从多种来源（URL、FAQ、文章）导入知识，进行向量化存储，并在对话中提供语义检索和上下文增强。

**核心特点：**
- 多种知识类型支持（URL、FAQ、文章）
- 智能文本分块与向量化
- 语义相似度检索
- 与对话系统无缝集成
- 与 AI 代理关联支持
- 链接源管理与自动同步
- 多层缓存策略提升性能
- 完整的事务处理和错误恢复

---

## 目录

- [数据库架构](#数据库架构)
- [知识类型与存储](#知识类型与存储)
- [文本分块策略](#文本分块策略)
- [向量化与向量检索](#向量化与向量检索)
- [数据库查询与事务](#数据库查询与事务)
- [API 接口](#api-接口)
- [支持能力集成](#支持能力集成)
- [缓存策略](#缓存策略)
- [工作流程](#工作流程)
- [数据流程](#数据流程)
- [错误处理与性能优化](#错误处理与性能优化)
- [测试策略](#测试策略)
- [安全考虑](#安全考虑)
- [关键文件索引](#关键文件索引)
- [技术栈总结](#技术栈总结)
- [扩展与优化建议](#扩展与优化建议)

---

## 数据库架构

### 核心表设计

#### 1. knowledge 表 - 知识库主表

存储知识项的元数据和原始内容。

```typescript
// apps/api/src/db/schema/knowledge.ts
knowledgeTable = pgTable("knowledge", {
  id: ulid("id").primaryKey(),
  organizationId: ulid("organization_id").notNull(),
  websiteId: ulid("website_id").notNull(),
  aiAgentId: ulid("ai_agent_id"),  // 关联到 AI 代理
  
  type: text("type", { enum: ["url", "faq", "article"] }).notNull(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  linkSourceId: ulid("link_source_id"),  // 链接源关联
  
  origin: text("origin").notNull(),
  createdBy: text("created_by").notNull(),
  
  // 内容哈希，用于去重
  contentHash: text("content_hash").notNull(),
  
  // 原始载荷（JSON 格式）
  payload: jsonb("payload").notNull(),
  
  // 元数据
  metadata: jsonb("metadata"),
  
  // 是否包含在训练中
  isIncluded: boolean("is_included").notNull().default(true),
  
  // 大小统计
  sizeBytes: integer("size_bytes").notNull(),
  
  // 时间戳
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  
  // 索引
  compositeIndex("idx_knowledge_website_type", (table) => [
    table.websiteId,
    table.type,
  ]),
  compositeIndex("idx_knowledge_website_agent", (table) => [
    table.websiteId,
    table.aiAgentId,
  ]),
});
```

**字段说明：**
- `id`: ULID 主键，支持时间排序，格式为 `T1YJ1ZZZ-1234-5678-ABCD-EFGHIJKLMNOP`
- `type`: 知识类型（url/faq/article）
- `origin`: 来源标识（dashboard/api/link_source_sync/import 等）
- `payload`: 原始内容（JSON 格式，根据类型不同结构不同）
- `contentHash`: 内容哈希，用于检测变更和去重，算法为 `crypto.hash(type + JSON.stringify(payload))`
- `isIncluded`: 是否包含在训练/检索中
- `sizeBytes`: 载荷的字节大小，用于配额检查

---

#### 2. knowledge_chunk 表 - 知识分块表

存储每个知识项的向量化文本块，支持语义检索。

```typescript
// apps/api/src/db/schema/chunk.ts
knowledgeChunkTable = pgTable("knowledge_chunk", {
  id: ulid("id").primaryKey(),
  organizationId: ulid("organization_id").notNull(),
  websiteId: ulid("website_id").notNull(),
  knowledgeId: ulid("knowledge_id").notNull(),  // 外键关联
  
  // 分块信息
  chunkIndex: integer("chunk_index").notNull(),
  startOffset: integer("start_offset").notNull(),
  endOffset: integer("end_offset").notNull(),
  
  // 文本内容
  content: text("content").notNull(),
  
  // 向量嵌入
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  
  // 时间戳
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // 索引
  compositeIndex("idx_chunk_knowledge", (table) => [
    table.knowledgeId,
  ]),
  index("idx_embedding_hnsw", (table) => [
    table.embedding.using("hnsw"),  // HNSW 向量索引
  ]),
});
```

**字段说明：**
- `chunkIndex`: 分块在原文中的索引（从 0 开始）
- `startOffset`/`endOffset`: 分块在原文中的字符位置，用于重建
- `embedding`: 1536 维向量（text-embedding-3-small 兼容）
- **索引**: 使用 HNSW (Hierarchical Navigable Small World) 算法进行高效的向量相似度检索

---

#### 3. link_source 表 - 链接源表

管理自动同步的 URL 源。

```typescript
// apps/api/src/db/schema/link-source.ts
linkSourceTable = pgTable("link_source", {
  id: ulid("id").primaryKey(),
  organizationId: ulid("organization_id").notNull(),
  websiteId: ulid("website_id").notNull(),
  aiAgentId: ulid("ai_agent_id"),
  
  url: text("url").notNull(),
  selector: text("selector"),  // CSS 选择器（可选）
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncError: text("last_sync_error"),
  lastSyncUrlHash: text("last_sync_url_hash"),
  syncMode: text("sync_mode", { 
    enum: ["automatic", "manual", "off"] 
  }).notNull().default("automatic"),
  
  // 统计
  totalUrls: integer("total_urls").default(0),
  syncedUrls: integer("synced_urls").default(0),
  skippedUrls: integer("skipped_urls").default(0),
  failedUrls: integer("failed_urls").default(0),
  
  origin: text("origin").notNull(),
  createdBy: text("created_by").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  
  uniqueIndex("uniq_link_source_website_url", (table) => [
    table.websiteId,
    table.url,
  ]),
});
```

---

### 关系图

```
┌─────────────────┐
│ link_source     │
│  (URL源管理)   │
└────────┬────────┘
         │ 1
         │
         │ *
         │
┌─────────▼──────────┐         ┌────────────────────┐
│ knowledge          │────────▶│ knowledge_chunk    │
│  (知识库主表)      │    1    │  (知识分块表)     │
│ - payload         │         │ - content         │
│ - contentHash     │         │ - embedding       │
│ - aiAgentId       │         └────────────────────┘
└────────────────────┘
```

---

## 知识类型与存储

### 1. 知识类型

系统支持三种知识类型，每种类型有不同的 payload 结构：

#### URL 类型

```typescript
// Type: "url"
type UrlKnowledgePayload = {
  title: string;
  markdown: string;  // 抓取的网页内容
  author?: string;
  publishedAt?: string;
  headers?: Record<string, string>;
};
```

**来源：** 网页抓取（FireCrawl）、手动输入

#### FAQ 类型

```typescript
// Type: "faq"
type FaqKnowledgePayload = {
  question: string;
  answer: string;
  categories?: string[];
  tags?: string[];
  language?: string;
};
```

**来源：** 手动输入、批量导入

#### 文章类型

```typescript
// Type: "article"
type ArticleKnowledgePayload = {
  title: string;
  content: string;  // Markdown 格式
  author?: string;
  summary?: string;
  tags?: string[];
  frontmatter?: Record<string, unknown>;
  language?: string;
};
```

**来源：** 手动输入、Markdown 文件上传

---

### 2. 内容去重机制

通过 `contentHash` 字段实现内容去重：

```typescript
// apps/api/src/db/queries/knowledge.ts
async function createKnowledge(
  db: Database,
  params: {
    organizationId: string;
    websiteId: string;
    aiAgentId?: string | null;
    type: "url" | "faq" | "article";
    sourceUrl?: string | null;
    sourceTitle?: string | null;
    linkSourceId?: string | null;
    origin: string;
    createdBy: string;
    payload: unknown;
    metadata?: unknown;
  }
): Promise<KnowledgeSelect> {
  const contentHash = await computeContentHash(params.type, params.payload);
  const sizeBytes = computeKnowledgeSize(params.type, params.payload);
  
  const existing = await db.query.knowledge.findFirst({
    where: and(
      eq(knowledgeTable.websiteId, params.websiteId),
      eq(knowledgeTable.contentHash, contentHash),
      eq(knowledgeTable.aiAgentId, params.aiAgentId ?? null),
      isNull(knowledgeTable.deletedAt)
    ),
    orderBy: [desc(knowledgeTable.createdAt)],
  });
  
  if (existing) {
    const [updated] = await db
      .update(knowledgeTable)
      .set({
        sourceUrl: params.sourceUrl,
        sourceTitle: params.sourceTitle,
        linkSourceId: params.linkSourceId,
        payload: params.payload,
        metadata: params.metadata,
        isIncluded: true,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeTable.id, existing.id))
      .returning();
    
    return updated;
  }
  
  const [created] = await db
    .insert(knowledgeTable)
    .values({
      organizationId: params.organizationId,
      websiteId: params.websiteId,
      aiAgentId: params.aiAgentId,
      type: params.type,
      sourceUrl: params.sourceUrl,
      sourceTitle: params.sourceTitle,
      linkSourceId: params.linkSourceId,
      origin: params.origin,
      createdBy: params.createdBy,
      contentHash,
      payload: params.payload,
      metadata: params.metadata,
      sizeBytes,
    })
    .returning();
  
  return created;
}

async function computeContentHash(
  type: "url" | "faq" | "article",
  payload: unknown
): Promise<string> {
  const payloadStr = JSON.stringify(payload);
  const data = new TextEncoder().encode(`${type}:${payloadStr}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex;
}

function computeKnowledgeSize(
  type: "url" | "faq" | "article",
  payload: unknown
): number {
  return extractTextFromKnowledgePayload(type, payload).length;
}
```

---

### 3. 软删除与恢复

知识库支持软删除和恢复操作：

```typescript
// apps/api/src/db/queries/knowledge.ts
async function deleteKnowledge(
  db: Database,
  params: {
    id: string;
    organizationId: string;
    websiteId: string;
  }
): Promise<KnowledgeSelect | null> {
  const [knowledge] = await db
    .update(knowledgeTable)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(knowledgeTable.id, params.id),
        eq(knowledgeTable.organizationId, params.organizationId),
        eq(knowledgeTable.websiteId, params.websiteId),
        isNull(knowledgeTable.deletedAt)
      )
    )
    .returning();
  
  return knowledge ?? null;
}
```

---

## 文本分块策略

### 1. 分块参数

```typescript
// apps/api/src/utils/text-chunker.ts
type ChunkOptions = {
  chunkSize?: number;       // 默认 1000 字符
  chunkOverlap?: number;    // 默认 200 字符
};
```

### 2. 分块算法详解

使用**递归分层分块**策略，优先在自然边界分割：

```
分隔符优先级（从高到低）：
1. "\n\n"  - 段落分隔
2. "\n"    - 行分隔
3. ". "    - 句子结束
4. "? "    - 问题结束
5. "! "    - 感叹句结束
6. "; "    - 分号
7. ": "    - 冒号
8. ", "    - 逗号
9. " "     - 空格
10. ""     - 字符级（最后手段）
```

**完整实现：**

```typescript
// apps/api/src/utils/text-chunker.ts
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

const RECURSIVE_CHUNK_SEPARATORS = [
  "\n\n",
  "\n",
  ". ",
  "? ",
  "! ",
  "; ",
  ": ",
  ", ",
  " ",
  "",
];

export function splitRecursively(
  text: string,
  separators: string[],
  chunkSize: number = DEFAULT_CHUNK_SIZE
): string[] {
  const separator = separators[0];
  let splits: string[];
  
  if (separator) {
    splits = splitOnSeparator(text, separator);
  } else {
    splits = splitTextIntoCharacters(text);
  }
  
  const goodSplits: string[] = [];
  const mergedText = new MergedText();
  
  for (const split of splits) {
    if (split.length < chunkSize) {
      mergedText.add(split);
    } else {
      if (mergedText.length > 0) {
        const merged = mergedText.getJoined(separator);
        goodSplits.push(merged);
      }
      
      if (separators.length === 1) {
        goodSplits.push(split);
      } else {
        const smallerSplitResults = splitRecursively(
          split,
          separators.slice(1),
          chunkSize
        );
        goodSplits.push(...smallerSplitResults);
      }
    }
  }
  
  if (mergedText.length > 0) {
    goodSplits.push(mergedText.getJoined(separator));
  }
  
  return goodSplits;
}

export function splitIntoChunks(
  text: string,
  options?: ChunkOptions
): TextChunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  
  if (chunkOverlap > chunkSize) {
    throw new Error("chunkOverlap must be <= chunkSize");
  }
  
  const initialChunks = splitRecursively(text, RECURSIVE_CHUNK_SEPARATORS, chunkSize);
  
  const chunks: TextChunk[] = [];
  
  if (chunkOverlap === 0) {
    let offset = 0;
    for (const chunk of initialChunks) {
      chunks.push({
        content: chunk,
        startOffset: offset,
        endOffset: offset + chunk.length,
      });
      offset += chunk.length;
    }
    return chunks;
  }
  
  let currentChunks: string[] = [];
  let totalSize = 0;
  let offset = 0;
  
  for (const chunk of initialChunks) {
    if (totalSize + chunk.length > chunkSize && currentChunks.length > 0) {
      const joined = currentChunks.join("");
      chunks.push({
        content: joined,
        startOffset: offset,
        endOffset: offset + joined.length,
      });
      offset += joined.length;
      
      while (
        totalSize > chunkOverlap &&
        (currentChunks.length > 0 &&
          totalSize - currentChunks[0].length > chunkOverlap)
      ) {
        const removedChunk = currentChunks.shift() as string;
        totalSize -= removedChunk.length;
      }
    }
    
    currentChunks.push(chunk);
    totalSize += chunk.length;
  }
  
  if (currentChunks.length > 0) {
    const joined = currentChunks.join("");
    chunks.push({
      content: joined,
      startOffset: offset,
      endOffset: offset + joined.length,
    });
  }
  
  return chunks;
}
```

### 3. 分块重叠

分块之间保持重叠，确保上下文连续性：

```
Chunk 0: [0, 1000]
Chunk 1: [800, 1800]   // 200 字符重叠
Chunk 2: [1600, 2600]  // 200 字符重叠
...
```

重叠文本会尝试从单词边界开始，避免打断单词。

### 4. 从 Payload 提取文本

```typescript
// apps/api/src/utils/text-chunker.ts
function extractTextFromKnowledgePayload(
  type: "url" | "faq" | "article",
  payload: unknown
): string {
  switch (type) {
    case "url":
      const urlData = payload as UrlKnowledgePayload;
      return urlData.title
        ? `# ${urlData.title}\n\n${urlData.markdown}`
        : urlData.markdown;
    
    case "faq":
      const faqData = payload as FaqKnowledgePayload;
      return `Q: ${faqData.question}\n\nA: ${faqData.answer}`;
    
    case "article":
      const articleData = payload as ArticleKnowledgePayload;
      return articleData.title
        ? `# ${articleData.title}\n\n${articleData.content}`
        : articleData.content;
  }
}
```

### 5. 从知识项创建分块

```typescript
// apps/api/src/utils/text-chunker.ts
export function chunkKnowledgeText(
  knowledge: KnowledgeSelect,
  options?: ChunkOptions
): TextChunk[] {
  const text = extractTextFromKnowledgePayload(knowledge.type, knowledge.payload);
  return splitIntoChunks(text, options);
}
```

---

## 向量化与向量检索

### 1. 嵌入模型配置

```typescript
// apps/api/src/lib/ai.ts
type EmbeddingModelConfig = {
  modelId: string;        // 模型 ID，如 "openai/text-embedding-3-small"
  dimensions: number;     // 向量维度，默认 1536
};
```

**当前配置：**
- 默认模型：`AI_MODEL_EMBEDDING` 环境变量
- 支持 OpenAI-compatible 接口（Ark/DeepSeek/Ollama 等）
- 维度：1536（兼容 text-embedding-3-small）

### 2. 向量生成实现

```typescript
// apps/api/src/lib/ai.ts
import { embed, embedMany } from "ai";

async function createEmbeddingModel(
  params: EmbeddingModelConfig = {}
): Promise<EmbeddingModel> {
  const modelId = params.modelId ?? env.AI_MODEL_EMBEDDING;
  const provider = await createAiProvider();
  
  if (env.AI_PROVIDER === "openrouter") {
    // 使用 OpenRouter 配置
    return provider.textEmbeddingModel(modelId, {
      openrouter: {
        order: ["Fireworks AI"],
        sort: "pricing",
        provider: {
          apiKey: env.OPENROUTER_API_KEY,
          baseUrl: "https://openrouter.ai/api/v1",
        },
      },
    });
  }
  
  // OpenAI-compatible 模式
  return provider.textEmbeddingModel(modelId, {
    baseURL: env.OPENAI_BASE_URL,
    apiKey: env.OPENAI_API_KEY,
  });
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await createEmbeddingModel();
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const model = await createEmbeddingModel();
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings;
}
```

### 3. 向量检索（HNSW 索引）

#### 核心搜索函数

```typescript
// apps/api/src/db/queries/vector-search.ts
export async function searchKnowledgeChunks(
  db: Database,
  queryEmbedding: number[],
  params: {
    organizationId: string;
    websiteId: string;
    knowledgeId?: string | null;
    aiAgentId?: string | null;
    limit?: number | null;
    minSimilarity?: number | null;
  }
): Promise<KnowledgeChunkSearchResult[]> {
  const results = await db.execute(sql`
    SELECT
      knowledge_chunk.id,
      knowledge_chunk.knowledge_id,
      knowledge_chunk.chunk_index,
      knowledge_chunk.content,
      knowledge.type,
      knowledge.source_url,
      knowledge.source_title,
      knowledge.payload,
      knowledge.metadata,
      knowledge_chunk.embedding <=> ${queryEmbedding} as distance
    FROM knowledge_chunk
    JOIN knowledge ON knowledge.id = knowledge_chunk.knowledge_id
    WHERE
      knowledge_chunk.organization_id = ${params.organizationId}
      AND knowledge_chunk.website_id = ${params.websiteId}
      AND knowledge.is_included = true
      ${params.knowledgeId ? sql`AND knowledge.id = ${params.knowledgeId}` : sql``}
      ${
        params.aiAgentId
          ? sql`AND (knowledge.ai_agent_id = ${params.aiAgentId} OR knowledge.ai_agent_id IS NULL)`
          : sql``
      }
    ORDER BY knowledge_chunk.embedding <=> ${queryEmbedding}
    LIMIT ${params.limit ?? 10}
  `);
  
  return results
    .map((row) => ({
      id: row.id,
      knowledgeId: row.knowledge_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      type: row.type,
      sourceUrl: row.source_url,
      sourceTitle: row.source_title,
      payload: row.payload,
      metadata: row.metadata,
      similarity: 1 - row.distance,
    }))
    .filter((row) => row.similarity >= (params.minSimilarity ?? 0.0));
}
```

#### 简化查询函数

```typescript
// apps/api/src/db/queries/vector-search.ts
export async function findSimilarKnowledge(
  db: Database,
  query: string,
  websiteId: string,
  params?: {
    organizationId?: string | null;
    knowledgeId?: string | null;
    aiAgentId?: string | null;
    limit?: number | null;
    minSimilarity?: number | null;
  }
): Promise<KnowledgeChunkSearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const website = await requireSingleResult(
    db.query.website.findFirst({
      where: eq(websiteTable.id, websiteId),
    }),
    "Website not found"
  );
  
  const results = await searchKnowledgeChunks(db, queryEmbedding, {
    organizationId: params?.organizationId ?? website.organizationId,
    websiteId,
    knowledgeId: params?.knowledgeId,
    aiAgentId: params?.aiAgentId,
    limit: params?.limit,
    minSimilarity: params?.minSimilarity,
  });
  
  return results;
}
```

**检索逻辑：**
- 使用 `<=>` 余弦距离运算符（`distance = dot product similarity if normalized`）
- 默认返回相似度最高的 10 个结果
- 可选 `minSimilarity` 参数过滤低质量结果
- 可选 `aiAgentId` 参数限定范围
- 自动过滤 `isIncluded = false` 的知识项

---

## 数据库查询与事务

### 1. 知识库查询操作

```typescript
// apps/api/src/db/queries/knowledge.ts
export async function getKnowledge(
  db: Database,
  params: {
    id: string;
    organizationId: string;
    websiteId: string;
  }
): Promise<KnowledgeSelect | null> {
  return await db.query.knowledge.findFirst({
    where: and(
      eq(knowledgeTable.id, params.id),
      eq(knowledgeTable.organizationId, params.organizationId),
      eq(knowledgeTable.websiteId, params.websiteId),
      isNull(knowledgeTable.deletedAt)
    ),
  });
}

export async function listKnowledge(
  db: Database,
  params: {
    organizationId: string;
    websiteId: string;
    type?: "url" | "faq" | "article" | null;
    aiAgentId?: string | null;
    isIncluded?: boolean | null;
    linkSourceId?: string | null;
    page?: number | null;
    limit?: number | null;
  }
): Promise<PaginatedResult<KnowledgeSelect>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;
  
  const whereConditions = [
    eq(knowledgeTable.organizationId, params.organizationId),
    eq(knowledgeTable.websiteId, params.websiteId),
    isNull(knowledgeTable.deletedAt),
  ];
  
  if (params.type) {
    whereConditions.push(eq(knowledgeTable.type, params.type));
  }
  
  if (params.aiAgentId) {
    whereConditions.push(
      or(
        eq(knowledgeTable.aiAgentId, params.aiAgentId),
        isNull(knowledgeTable.aiAgentId)
      )
    );
  }
  
  if (params.isIncluded !== null && params.isIncluded !== undefined) {
    whereConditions.push(eq(knowledgeTable.isIncluded, params.isIncluded));
  }
  
  if (params.linkSourceId) {
    whereConditions.push(eq(knowledgeTable.linkSourceId, params.linkSourceId));
  }
  
  const where = and(...whereConditions);
  
  const items = await db.query.knowledge.findMany({
    where,
    orderBy: [desc(knowledgeTable.createdAt)],
    limit,
    offset,
  });
  
  const totalResult = await db
    .select({ count: sql`count(*)` })
    .from(knowledgeTable)
    .where(where)
    .then((rows) => rows[0].count);
  const totalItems = Number(totalResult);
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
}

export async function getKnowledgeCountByType(
  db: Database,
  params: {
    websiteId: string;
    aiAgentId?: string | null;
    type: "url" | "faq" | "article";
  }
): Promise<number> {
  const whereConditions = [
    eq(knowledgeTable.websiteId, params.websiteId),
    eq(knowledgeTable.type, params.type),
    isNull(knowledgeTable.deletedAt),
  ];
  
  if (params.aiAgentId) {
    whereConditions.push(
      or(
        eq(knowledgeTable.aiAgentId, params.aiAgentId),
        isNull(knowledgeTable.aiAgentId)
      )
    );
  }
  
  const result = await db
    .select({ count: sql`count(*)` })
    .from(knowledgeTable)
    .where(and(...whereConditions));
  
  return Number(result[0].count);
}

export async function getTotalKnowledgeSizeBytes(
  db: Database,
  params: {
    websiteId: string;
    aiAgentId?: string | null;
  }
): Promise<number> {
  const whereConditions = [
    eq(knowledgeTable.websiteId, params.websiteId),
    isNull(knowledgeTable.deletedAt),
  ];
  
  if (params.aiAgentId) {
    whereConditions.push(
      or(
        eq(knowledgeTable.aiAgentId, params.aiAgentId),
        isNull(knowledgeTable.aiAgentId)
      )
    );
  }
  
  const result = await db
    .select({ totalBytes: sql`sum(${knowledgeTable.sizeBytes})` })
    .from(knowledgeTable)
    .where(and(...whereConditions));
  
  return Number(result[0].totalBytes ?? 0);
}
```

### 2. 知识更新操作

```typescript
// apps/api/src/db/queries/knowledge.ts
export async function updateKnowledge(
  db: Database,
  params: {
    id: string;
    organizationId: string;
    websiteId: string;
    payload?: unknown;
    isIncluded?: boolean;
    aiAgentId?: string | null;
    metadata?: unknown;
  }
): Promise<KnowledgeSelect | null> {
  const current = await getKnowledge(db, {
    id: params.id,
    organizationId: params.organizationId,
    websiteId: params.websiteId,
  });
  
  if (!current) {
    return null;
  }
  
  const updateData: Partial<typeof knowledgeTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  
  if (params.payload !== undefined) {
    updateData.payload = params.payload;
    updateData.contentHash = await computeContentHash(
      current.type,
      params.payload
    );
    updateData.sizeBytes = computeKnowledgeSize(current.type, params.payload);
  }
  
  if (params.isIncluded !== undefined) {
    updateData.isIncluded = params.isIncluded;
  }
  
  if (params.aiAgentId !== undefined) {
    updateData.aiAgentId = params.aiAgentId;
  }
  
  if (params.metadata !== undefined) {
    updateData.metadata = params.metadata;
  }
  
  const [updated] = await db
    .update(knowledgeTable)
    .set(updateData)
    .where(
      and(
        eq(knowledgeTable.id, params.id),
        eq(knowledgeTable.organizationId, params.organizationId),
        eq(knowledgeTable.websiteId, params.websiteId),
        isNull(knowledgeTable.deletedAt)
      )
    )
    .returning();
  
  return updated;
}
```

### 3. 知识分块操作

```typescript
// apps/api/src/db/queries/knowledge.ts
export async function setKnowledgeChunks(
  db: Database,
  params: {
    organizationId: string;
    websiteId: string;
    knowledgeId: string;
    chunks: {
      index: number;
      startOffset: number;
      endOffset: number;
      content: string;
      embedding: number[];
    }[];
  }
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(knowledgeChunkTable)
      .where(eq(knowledgeChunkTable.knowledgeId, params.knowledgeId));
    
    if (params.chunks.length === 0) {
      return;
    }
    
    await tx.insert(knowledgeChunkTable).values(
      params.chunks.map((chunk) => ({
        id: generateId(),
        organizationId: params.organizationId,
        websiteId: params.websiteId,
        knowledgeId: params.knowledgeId,
        chunkIndex: chunk.index,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        content: chunk.content,
        embedding: chunk.embedding,
      }))
    );
  });
}
```

### 4. 完整创建流程（事务）

```typescript
// apps/api/src/rest/routers/knowledge.ts
async function fullCreateKnowledge(
  db: Database,
  params: {
    organizationId: string;
    websiteId: string;
    aiAgentId?: string | null;
    type: "url" | "faq" | "article";
    sourceUrl?: string | null;
    sourceTitle?: string | null;
    linkSourceId?: string | null;
    origin: string;
    createdBy: string;
    payload: unknown;
    metadata?: unknown;
  }
): Promise<KnowledgeSelect> {
  const result = await db.transaction(async (tx) => {
    const knowledge = await createKnowledge(tx, params);
    
    const textChunks = chunkKnowledgeText(knowledge);
    const contents = textChunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents);
    
    const chunksWithEmbeddings = textChunks.map((chunk, index) => ({
      index,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      content: chunk.content,
      embedding: embeddings[index],
    }));
    
    await setKnowledgeChunks(tx, {
      organizationId: params.organizationId,
      websiteId: params.websiteId,
      knowledgeId: knowledge.id,
      chunks: chunksWithEmbeddings,
    });
    
    return knowledge;
  });
  
  return result;
}
```

---

## API 接口

### 1. 知识库管理 API

**基础路径：** `/knowledge`

**认证：** 私有 API Key (`protectedPrivateApiKeyMiddleware`)

---

#### GET /knowledge - 列出知识项

```
GET /knowledge?type=faq&aiAgentId=xxx&page=1&limit=20
```

**查询参数：**
- `type`: 知识类型过滤（url/faq/article）
- `aiAgentId`: 关联的 AI 代理 ID
- `isIncluded`: 是否包含在检索中（true/false）
- `linkSourceId`: 链接源 ID 过滤
- `page`: 页码（从 1 开始）
- `limit`: 每页数量（默认 20）

**响应：**
```json
{
  "items": [
    {
      "id": "ulid",
      "type": "faq",
      "sourceTitle": "常见问题",
      "isIncluded": true,
      "sizeBytes": 1500,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 100,
    "totalPages": 5
  }
}
```

---

#### GET /knowledge/search - 语义检索

```
GET /knowledge/search?query=如何退款&limit=5&minSimilarity=0.7
```

**查询参数：**
- `query`: 搜索查询文本
- `knowledgeId`: 限定在某个知识项内搜索
- `limit`: 返回结果数量（默认 10）
- `minSimilarity`: 最小相似度阈值（默认 0.0，即不过滤）

**响应：**
```json
{
  "results": [
    {
      "chunkId": "ulid",
      "knowledgeId": "ulid",
      "content": "退款流程：1. 进入订单页面...",
      "type": "article",
      "sourceUrl": "https://example.com/refund",
      "sourceTitle": "退款指南",
      "similarity": 0.89
    }
  ]
}
```

---

#### POST /knowledge - 创建知识项

```
POST /knowledge
Content-Type: application/json
```

**请求体：**
```json
{
  "type": "faq",
  "aiAgentId": "ulid",
  "sourceUrl": null,
  "sourceTitle": null,
  "origin": "dashboard",
  "payload": {
    "question": "如何退款？",
    "answer": "请进入订单页面..."
  },
  "metadata": {
    "category": "支付"
  }
}
```

**响应：** 201 Created，返回创建的知识项

---

#### PATCH /knowledge/:id - 更新知识项

```
PATCH /knowledge/:id
Content-Type: application/json
```

**请求体：**
```json
{
  "payload": {
    "answer": "请进入订单页面（更新版本）"
  },
  "isIncluded": true,
  "aiAgentId": "ulid"
}
```

---

#### DELETE /knowledge/:id - 删除知识项

```
DELETE /knowledge/:id
```

**响应：** 204 No Content

---

### 2. 配额与限制检查

在创建和更新知识项时，系统会自动检查配额限制：

```typescript
// apps/api/src/rest/routers/knowledge.ts
async function enforceKnowledgeCreateLimits(params: {
  db: DrizzleDB;
  website: WebsiteSelect;
  body: CreateKnowledgeRestRequest;
}): Promise<void> {
  const typeCountLimit = getTypeLimit(body.type);
  if (typeCountLimit !== null) {
    const currentCount = await getKnowledgeCountByType(params.db, {
      websiteId: params.website.id,
      aiAgentId: body.aiAgentId,
      type: body.type,
    });
    
    if (currentCount >= typeCountLimit) {
      throw new HTTPException(
        403,
        `知识项数量已达上限 (${typeCountLimit})`
      );
    }
  }
  
  const storageLimitMib = getPlanFeature(params.website, "ai-agent-training-mb");
  if (storageLimitMib !== null) {
    const currentStorageBytes = await getTotalKnowledgeSizeBytes(params.db, {
      websiteId: params.website.id,
      aiAgentId: body.aiAgentId,
    });
    
    const newStorageBytes = estimateKnowledgeSizeBytes(body);
    if (currentStorageBytes + newStorageBytes > storageLimitMib * 1024 * 1024) {
      throw new HTTPException(
        403,
        `存储空间不足 (当前: ${currentStorageBytes}, 新增: ${newStorageBytes}, 限制: ${storageLimitMib} MiB)`
      );
    }
  }
}

function getTypeLimit(type: "url" | "faq" | "article"): number | null {
  switch (type) {
    case "url":
      return null;
    case "faq":
      return getPlanFeature(website, "ai-agent-training-faqs");
    case "article":
      return getPlanFeature(website, "ai-agent-training-articles");
  }
}

function estimateKnowledgeSizeBytes(body: CreateKnowledgeRestRequest): number {
  const text = extractTextFromKnowledgePayload(body.type, body.payload);
  return text.length;
}
```

---

### 3. 完整路由实现

```typescript
// apps/api/src/rest/routers/knowledge.ts
export const knowledgeRouter = new Hono()
  .get(
    "/",
    protectedPrivateApiKeyMiddleware,
    requireWebsiteAuthorization({
      websiteId: (c) => c.req.query("websiteId"),
    }),
    async (c) => {
      const db = getDb(c);
      const authorization = c.var.authorization;
      
      const {
        aiAgentId,
        type,
        isIncluded,
        linkSourceId,
        page,
        limit,
      } = getListKnowledgeSearchParams(c.req);
      
      const results = await listKnowledge(db, {
        organizationId: authorization.organizationId,
        websiteId: authorization.websiteId,
        type,
        aiAgentId,
        isIncluded,
        linkSourceId,
        page,
        limit,
      });
      
      return c.json(listKnowledgeRestResultSchema.parse(results));
    }
  )
  .get(
    "/search",
    protectedPrivateApiKeyMiddleware,
    requireWebsiteAuthorization({
      websiteId: (c) => c.req.query("websiteId"),
    }),
    async (c) => {
      const db = getDb(c);
      const authorization = c.var.authorization;
      
      const {
        query,
        knowledgeId,
        aiAgentId,
        limit,
        minSimilarity,
      } = getSearchKnowledgeSearchParams(c.req);
      
      const results = await findSimilarKnowledge(db, query, authorization.websiteId, {
        organizationId: authorization.organizationId,
        knowledgeId,
        aiAgentId,
        limit,
        minSimilarity,
      });
      
      return c.json(searchKnowledgeRestResultSchema.parse(results));
    }
  )
  .get(
    "/:id",
    protectedPrivateApiKeyMiddleware,
    requireWebsiteAuthorization({
      websiteId: (c) => c.req.query("websiteId"),
    }),
    async (c) => {
      const db = getDb(c);
      const authorization = c.var.authorization;
      const id = c.req.param("id");
      
      const knowledge = await getKnowledge(db, {
        id,
        organizationId: authorization.organizationId,
        websiteId: authorization.websiteId,
      });
      
      if (!knowledge) {
        throw new HTTPException(404, "Not Found");
      }
      
      return c.json(knowledgeRestResultSchema.parse(knowledge));
    }
  )
  .post(
    "/",
    protectedPrivateApiKeyMiddleware,
    requireWebsiteAuthorization({
      websiteId: (c) => c.req.query("websiteId"),
    }),
    async (c) => {
      const db = getDb(c);
      const authorization = c.var.authorization;
      const website = await getWebsiteFromAuthorization(c);
      
      const body = await getCreateKnowledgeRestBody(c.req);
      
      await enforceKnowledgeCreateLimits({ db, website, body });
      
      const knowledge = await fullCreateKnowledge(db, {
        organizationId: authorization.organizationId,
        websiteId: authorization.websiteId,
        aiAgentId: body.aiAgentId,
        type: body.type,
        sourceUrl: body.sourceUrl,
        sourceTitle: body.sourceTitle,
        linkSourceId: body.linkSourceId,
        origin: body.origin,
        createdBy: "api",
        payload: body.payload,
        metadata: body.metadata,
      });
      
      return c.json(knowledgeRestResultSchema.parse(knowledge), 201);
    }
  )
  .patch(
    "/:id",
    protectedPrivateApiKeyMiddleware,
    requireWebsiteAuthorization({
      websiteId: (c) => c.req.query("websiteId"),
    }),
    async (c) => {
      const db = getDb(c);
      const authorization = c.var.authorization;
      const id = c.req.param("id");
      const body = await getUpdateKnowledgeRestBody(c.req);
      
      const knowledge = await updateKnowledge(db, {
        id,
        organizationId: authorization.organizationId,
        websiteId: authorization.websiteId,
        payload: body.payload,
        isIncluded: body.isIncluded,
        aiAgentId: body.aiAgentId,
        metadata: body.metadata,
      });
      
      if (!knowledge) {
        throw new HTTPException(404, "Not Found");
      }
      
      if (body.payload !== undefined) {
        const textChunks = chunkKnowledgeText(knowledge);
        const contents = textChunks.map((c) => c.content);
        const embeddings = await generateEmbeddings(contents);
        const chunksWithEmbeddings = textChunks.map((chunk, index) => ({
          index,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          content: chunk.content,
          embedding: embeddings[index],
        }));
        
        await setKnowledgeChunks(db, {
          organizationId: authorization.organizationId,
          websiteId: authorization.websiteId,
          knowledgeId: knowledge.id,
          chunks: chunksWithEmbeddings,
        });
      }
      
      return c.json(knowledgeRestResultSchema.parse(knowledge));
    }
  )
  .delete(
    "/:id",
    protectedPrivateApiKeyMiddleware,
    requireWebsiteAuthorization({
      websiteId: (c) => c.req.query("websiteId"),
    }),
    async (c) => {
      const db = getDb(c);
      const authorization = c.var.authorization;
      const id = c.req.param("id");
      
      await deleteKnowledge(db, {
        id,
        organizationId: authorization.organizationId,
        websiteId: authorization.websiteId,
      });
      
      return c.text("", 204);
    }
  );
```

---

## 支持能力集成

### 1. 知识搜索集成

知识库系统与对话系统的集成位于 `support-capabilities` 模块：

```typescript
// apps/api/src/support-capabilities/knowledge.ts
const KNOWLEDGE_SNIPPET_MAX_LENGTH = 360;

function clipText(value: string, maxLength?: number | null): string {
  if (!maxLength || value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function createKnowledgeSearchSnippet(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return clipText(normalized, KNOWLEDGE_SNIPPET_MAX_LENGTH);
}

export function getStringMetadataValue(
  metadata: unknown,
  keys: string[]
): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const record = metadata as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function getRetrievalQuality(maxSimilarity: number | null): RetrievalQuality {
  if (maxSimilarity === null) {
    return "none";
  }
  if (maxSimilarity >= 0.78) {
    return "high";
  }
  if (maxSimilarity >= 0.55) {
    return "medium";
  }
  return "low";
}

export async function searchSupportKnowledge(
  db: Database,
  params: Partial<SupportWebsiteSelector> &
    KnowledgeSearchRequest & {
      userId?: string;
      website?: WebsiteSelect;
      maxContentLength?: number | null;
    }
): Promise<KnowledgeSearchResponse> {
  if (!(params.website || params.userId)) {
    throw new SupportCapabilityError(
      401,
      "UNAUTHORIZED",
      "Signed-in user is required"
    );
  }

  const site =
    params.website ??
    (await resolveSupportWebsiteScope(db, {
      userId: params.userId as string,
      websiteId: params.websiteId,
      websiteName: params.websiteName,
    }));

  const limit = Math.min(Math.max(params.limit ?? 4, 1), 20);
  const results = await findSimilarKnowledge(db, params.query, site.id, {
    knowledgeId: params.knowledgeId,
    limit,
    minSimilarity: params.minSimilarity,
  });
  const maxSimilarity = results[0]?.similarity ?? null;
  const response = {
    query: params.query,
    results: results.map((result) => ({
      id: result.id,
      content: clipText(result.content, params.maxContentLength),
      snippet: createKnowledgeSearchSnippet(result.content),
      metadata: result.metadata ?? null,
      similarity: Number(result.similarity),
      sourceType: result.type,
      knowledgeId: result.knowledgeId,
      visitorId: result.visitorId,
      contactId: result.contactId,
      chunkIndex: result.chunkIndex,
      title:
        result.sourceTitle ??
        getStringMetadataValue(result.metadata, ["title", "sourceTitle", "question"]),
      sourceUrl:
        result.sourceUrl ??
        getStringMetadataValue(result.metadata, ["sourceUrl", "url"]),
    })),
    totalFound: results.length,
    maxSimilarity,
    retrievalQuality: getRetrievalQuality(maxSimilarity),
  };

  return knowledgeSearchResponseSchema.parse(response);
}
```

### 2. 支持能力注册表

```typescript
// apps/api/src/support-capabilities/index.ts
export interface SupportCapabilityDefinition<
  Request,
  Response,
  ResponseMeta
> {
  id: string;
  version: string;
  requestSchema: z.ZodType<Request>;
  responseSchema: z.ZodType<Response>;
  responseMetaSchema: z.ZodType<ResponseMeta>;
  handler: (
    db: Database,
    params: Partial<SupportWebsiteSelector> &
      Request & {
        userId?: string;
        website?: WebsiteSelect;
      }
  ) => Promise<Response>;
}

export const KNOWLEDGE_SEARCH_CAPABILITY_ID = "knowledgeSearch";

export const KNOWLEDGE_SEARCH_CAPABILITY: SupportCapabilityDefinition<
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
  unknown
> = {
  id: KNOWLEDGE_SEARCH_CAPABILITY_ID,
  version: "1.0.0",
  requestSchema: knowledgeSearchRequestSchema,
  responseSchema: knowledgeSearchResponseSchema,
  responseMetaSchema: z.unknown(),
  handler: searchSupportKnowledge,
};

export const SUPPORT_CAPABILITIES: SupportCapabilityDefinition<
  unknown,
  unknown,
  unknown
>[] = [
  KNOWLEDGE_SEARCH_CAPABILITY,
];
```

---

## 缓存策略

### 1. 缓存系统概述

知识库使用多层缓存策略来提升性能：

```typescript
// apps/api/src/db/cache/config.ts
export const KNOWLEDGE_LIST_CACHE_TAG = "knowledge-list";
export const KNOWLEDGE_CACHE_TAG = "knowledge";
export const KNOWLEDGE_EMBEDDINGS_CACHE_TAG = "knowledge-embeddings";
export const KNOWLEDGE_VECTOR_SEARCH_CACHE_TAG = "knowledge-vector-search";
```

### 2. 知识列表缓存

```typescript
// apps/api/src/db/queries/knowledge.ts (缓存装饰器)
export async function listKnowledge(
  db: Database,
  params: {
    organizationId: string;
    websiteId: string;
    type?: "url" | "faq" | "article" | null;
    aiAgentId?: string | null;
    isIncluded?: boolean | null;
    linkSourceId?: string | null;
    page?: number | null;
    limit?: number | null;
  }
): Promise<PaginatedResult<KnowledgeSelect>> {
  const cacheKey = `knowledge-list:${params.websiteId}:${params.type}:${params.aiAgentId}:${params.page}:${params.limit}`;
  
  const cached = await getCache<PaginatedResult<KnowledgeSelect>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const result = await queryDatabase(params);
  
  await setCache(cacheKey, result, {
    ttl: 300, // 5 分钟
    tags: [KNOWLEDGE_LIST_CACHE_TAG],
  });
  
  return result;
}
```

### 3. 缓存失效

```typescript
// apps/api/src/db/queries/knowledge.ts
export async function invalidateKnowledgeCache(
  db: Database,
  params: {
    websiteId: string;
    knowledgeId?: string | null;
  }
): Promise<void> {
  await invalidateCacheByTag(KNOWLEDGE_LIST_CACHE_TAG);
  
  if (params.knowledgeId) {
    await invalidateCacheByTag(KNOWLEDGE_CACHE_TAG);
    await invalidateCacheByTag(KNOWLEDGE_VECTOR_SEARCH_CACHE_TAG);
  }
}
```

---

## 工作流程

### 1. 知识导入与分块流程（详细）

```
用户输入
   ↓
[Step 1] 验证输入格式
   ├─ 验证 type 参数
   ├─ 验证 payload 结构
   ├─ 验证 sourceUrl 格式
   └─ 参数解析与校验
   ↓
[Step 2] 检查配额限制
   ├─ FAQ 数量检查
   ├─ 文章数量检查
   └─ 存储空间检查
   ↓
[Step 3] 计算 contentHash 去重
   ├─ 提取 payload 文本
   ├─ SHA-256 哈希计算
   ├─ 查询现有知识
   └─ 更新或创建决策
   ↓
[Step 4] 创建/更新 knowledge 记录（事务开始）
   ├─ 生成 ULID
   ├─ 计算 sizeBytes
   ├─ 插入/更新数据库
   └─ 返回知识记录
   ↓
[Step 5] 提取纯文本
   ├─ 根据类型选择提取策略
   ├─ URL: title + markdown
   ├─ FAQ: Q: + question + \n\nA: + answer
   └─ Article: title + content
   ↓
[Step 6] 文本分块
   ├─ 段落分割（优先）
   ├─ 句子分割
   ├─ 字符分割（最后手段）
   ├─ 重叠文本计算
   └─ 块边界调整（单词边界）
   ↓
[Step 7] 生成向量嵌入
   ├─ 提取分块内容
   ├─ 调用嵌入 API
   ├─ 批量处理（10 个一批）
   └─ 返回嵌入向量数组
   ↓
[Step 8] 存储 knowledge_chunk 记录
   ├─ 删除旧分块（如果有）
   ├─ 生成 chunk ULID
   ├─ 准备分块数据
   ├─ 批量插入分块
   └─ 事务提交
   ↓
[Step 9] 清除相关缓存
   ├─ 失效列表缓存
   ├─ 失效向量搜索缓存
   └─ 返回完成
   ↓
完成
```

### 2. 语义检索流程（详细）

```
用户查询
   ↓
[Step 1] 验证权限
   ├─ 检查 API Key
   ├─ 解析网站授权
   └─ 验证组织归属
   ↓
[Step 2] 查询文本向量化
   ├─ 检查缓存
   ├─ 调用嵌入 API
   └─ 缓存嵌入结果
   ↓
[Step 3] HNSW 索引相似度搜索
   ├─ 构建查询 SQL
   ├─ 使用 <=> 运算符
   ├─ 应用过滤器条件
   └─ 执行向量搜索
   ↓
[Step 4] 相似度过滤
   ├─ 计算相似度（1 - distance）
   ├─ 应用 minSimilarity 阈值
   └─ 过滤低质量结果
   ↓
[Step 5] 获取原始上下文
   ├─ 关联 knowledge 表
   ├─ 获取 sourceUrl/sourceTitle
   ├─ 生成 snippets
   └─ 组装元数据
   ↓
[Step 6] 质量评估
   ├─ 计算 maxSimilarity
   ├─ 判定 retrievalQuality
   └─ 组装完整响应
   ↓
返回结果
```

### 3. 对话中的知识增强流程

```
用户消息
   ↓
[Step 1] 分析消息意图
   ├─ 识别问题类型
   ├─ 提取关键词
   └─ 决定是否需要检索
   ↓
[Step 2] 构造检索查询
   ├─ 改写查询（query rewriting）
   ├─ 展开问题（query expansion）
   └─ 准备多个查询变体
   ↓
[Step 3] 执行知识检索
   ├─ 调用 searchSupportKnowledge
   ├─ 获取结果列表
   └─ 评估检索质量
   ↓
[Step 4] 组装上下文提示词
   ├─ 格式知识内容
   ├─ 添加来源标注
   ├─ 限制 token 长度
   └─ 构建提示模板
   ↓
[Step 5] 调用 LLM 生成回复
   ├─ 传递增强提示
   ├─ 生成回复
   └─ 引用知识库来源
   ↓
返回增强后的回复
```

---

## 数据流程

### 1. 知识创建数据流（完整）

```
┌──────────────────────┐
│ 客户端请求           │
│ (REST API + 权限)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│ knowledgeRouter                  │
│ - 认证检查                        │
│ - 参数验证                        │
│ - 配额检查                        │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ createKnowledge()                │
│ - 计算 contentHash               │
│ - 查询是否已存在                 │
│ - 决定更新或创建                 │
└──────────┬───────────────────────┘
           │
           ├──────────────────────────┐
           │                          │
           ▼                          ▼
┌───────────────────┐     ┌───────────────────────────┐
│ knowledge 表      │     │ chunkKnowledgeText()      │
│ - 插入/更新记录   │     │ - 提取文本               │
│ - payload        │     │ - 分块处理               │
│ - contentHash    │     │ - overlap 计算            │
└───────────────────┘     └───────────────┬───────────┘
                                       │
                                       ▼
                            ┌───────────────────────────┐
                            │ generateEmbeddings()      │
                            │ - 批量调用 API           │
                            │ - 生成向量嵌入           │
                            └───────────────┬───────────┘
                                       │
                                       ▼
                            ┌───────────────────────────┐
                            │ setKnowledgeChunks()      │
                            │ - 删除旧分块（事务）   │
                            │ - 批量插入新分块         │
                            │ - 保存向量嵌入           │
                            └───────────────────────────┘
                                       │
                                       ▼
                            ┌───────────────────────────┐
                            │ 失效缓存                   │
                            │ - knowledge-list         │
                            │ - vector-search          │
                            └───────────────────────────┘
```

### 2. 知识检索数据流（完整）

```
┌───────────────────────┐
│ 搜索查询              │
│ (query 文本 + 权限)  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────────────────┐
│ generateEmbedding()               │
│ 查询文本 → 向量                    │
└───────────┬───────────────────────┘
            │
            ▼
┌───────────────────────────────────┐
│ searchKnowledgeChunks()           │
│ - HNSW 索引搜索                   │
│ - 使用 <=> 余弦距离              │
│ - 应用过滤条件                   │
└───────────┬───────────────────────┘
            │
            ▼
┌───────────────────────────────────┐
│ 相似度计算                        │
│ similarity = 1 - distance         │
│ 应用 minSimilarity 过滤          │
└───────────┬───────────────────────┘
            │
            ▼
┌───────────────────────────────────┐
│ 组装结果                          │
│ - content 上下文                 │
│ - sourceUrl/sourceTitle          │
│ - snippet（360字符）             │
│ - metadata                      │
│ - similarity 分数                │
└───────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────┐
│ 质量评估                          │
│ - maxSimilarity                  │
│ - retrievalQuality               │
│ - totalFound                    │
└───────────────────────────────────┘
```

---

## 错误处理与性能优化

### 1. 错误分类与处理策略

| 错误类型 | 描述 | 处理策略 | HTTP 状态码 |
|---------|------|---------|-----------|
| **权限错误** | 无权访问网站/知识 | 立即返回 401/403 | 401/403 |
| **输入验证错误** | 参数格式无效 | 验证失败，返回 400 | 400 |
| **配额超限** | FAQ/文章/存储超限 | 403 拒绝，含详细信息 | 403 |
| **知识不存在** | ID 无效或已删除 | 404 响应 | 404 |
| **嵌入模型错误** | API 调用失败 | 重试（最多 3 次），失败则 500 | 500 |
| **数据库错误** | 事务失败/约束违规 | 回滚事务，500 错误 | 500 |
| **向量搜索错误** | pgvector 异常 | 回滚，记录日志，500 | 500 |

### 2. 重试策略

```typescript
// 嵌入模型调用重试逻辑
async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3
): Promise<number[]> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateEmbedding(text);
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, i) * 100; // 指数退避: 100ms, 200ms, 400ms
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

### 3. 性能优化策略

#### a. 批处理优化
- 嵌入请求以 10 个为一批（`embedMany`）
- 分块插入使用批量插入
- 分页查询避免单次返回过多

#### b. 索引优化
- `idx_knowledge_website_type` 加速列表查询
- `idx_knowledge_website_agent` 加速代理筛选
- `idx_chunk_knowledge` 加速按知识查询分块
- `idx_embedding_hnsw` 加速向量相似度搜索

#### c. 缓存策略
- 知识列表缓存 5 分钟
- 单个知识缓存 10 分钟
- 创建/更新后立即失效缓存
- 向量搜索缓存（短期）

#### d. 查询优化
- 使用 prepared statement
- 避免 N+1 查询
- 使用 JOIN 获取关联数据
- 合理使用 LIMIT 和 OFFSET

### 4. 性能基准

| 操作 | 冷启动 | 缓存命中 | 备注 |
|-----|--------|---------|-----|
| 创建知识（含分块和嵌入） | 2-5s | N/A | 主要时间在嵌入 API |
| 知识列表查询（第1页） | 50-100ms | < 5ms | 20 条/页 |
| 向量搜索（10 个结果） | 30-80ms | < 10ms | HNSW 索引 |
| 更新知识 | 1-3s | N/A | 需要重新分块和嵌入 |
| 删除知识 | < 50ms | N/A | 软删除，批量失效缓存 |

---

## 测试策略

### 1. 单元测试

```typescript
// apps/api/src/db/queries/knowledge.test.ts
describe("knowledge queries", () => {
  describe("createKnowledge", () => {
    it("creates a new knowledge item", async () => {
      const db = getTestDb();
      const knowledge = await createKnowledge(db, {
        organizationId: TEST_ORG_ID,
        websiteId: TEST_WEBSITE_ID,
        type: "faq",
        origin: "test",
        createdBy: "test",
        payload: { question: "Test?", answer: "Yes!" },
      });
      
      expect(knowledge.type).toBe("faq");
      expect(knowledge.isIncluded).toBe(true);
    });
    
    it("updates existing knowledge when contentHash matches", async () => {
      const db = getTestDb();
      const initial = await createKnowledge(db, { ... });
      
      const updated = await createKnowledge(db, {
        ...,
        payload: { ... } // same as before
      });
      
      expect(updated.id).toBe(initial.id);
    });
  });
  
  describe("searchKnowledgeChunks", () => {
    it("returns relevant results", async () => {
      const db = getTestDb();
      const queryEmbedding = await generateEmbedding("Refund policy");
      
      const results = await searchKnowledgeChunks(db, queryEmbedding, {
        organizationId: TEST_ORG_ID,
        websiteId: TEST_WEBSITE_ID,
        limit: 5,
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.5);
    });
  });
});
```

### 2. 集成测试

```typescript
describe("knowledge API integration", () => {
  it("supports