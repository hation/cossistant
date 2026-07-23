# 知识库 RAG 系统架构

## 1. 系统概览

知识库 RAG（Retrieval-Augmented Generation）系统是 Cossistant AI 客服的核心知识引擎，负责存储、索引、检索和利用组织知识库内容生成高质量的访客回答。系统采用 **PostgreSQL + pgvector** 架构，结合多层级语义检索、智能质量评估和闭环知识改进机制。

### 1.1 核心能力

| 能力 | 描述 | 实现方式 |
|------|------|----------|
| **向量语义搜索** | 基于文本相似度的上下文检索 | OpenAI Embeddings + pgvector HNSW |
| **多源 Chunk 化** | 支持文章、FAQ、网页等多种来源 | Text Chunker + Metadata 索引 |
| **搜索质量评估** | 三级信号质量（strong/weak/none） | 相似度阈值 + 证据内容分析 |
| **知识缺口检测** | 自动识别知识库无法回答的问题 | Search Signals + Clarification 工作流 |
| **多轮澄清机制** | AI 生成问题，人工补充答案 | Knowledge Clarification Pipeline |
| **FAQ 自动生成** | 从澄清对话自动提取知识条目 | 结构化输出 + 类目建议 |
| **记忆持久化** | 访客/联系人上下文长期记忆 | Visitor Memory / Contact Memory Chunks |

### 1.2 系统边界

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Knowledge Base RAG                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Ingestion  │    │   Vector     │    │ Retrieval    │       │
│  │   Pipeline   │───▶│    Index     │───▶│   Pipeline   │       │
│  │              │    │              │    │              │       │
│  │ - Crawl URL  │    │ - HNSW       │    │ - Query Gen  │       │
│  │ - Parse HTML │    │ - pgvector   │    │ - Rerank     │       │
│  │ - Chunking   │    │ - Cosine     │    │ - Context    │       │
│  │              │    │   Distance   │    │   Compose    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Knowledge Clarification Engine                    │ │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │ │
│  │  │ Gap Det. │──▶│ Q Plan   │──▶│ AI Q&A   │──▶│ FAQ Gen  │ │ │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────┐   ┌──────────────────────────┐    │
│  │  Visitor Memory Store    │   │  Contact Memory Store    │    │
│  │  (Long-term context)     │   │  (Customer profile)      │    │
│  └──────────────────────────┘   └──────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
           │                                     │
           ▼                                     ▼
┌───────────────────────┐           ┌───────────────────────────┐
│     PostgreSQL DB     │           │   AI Generation Pipeline    │
│  (knowledge + chunk)  │           │   (Context injection)      │
└───────────────────────┘           └───────────────────────────┘
```

---

## 2. 数据模型与存储

### 2.1 Knowledge 表（知识库条目）

```typescript
// apps/api/src/db/schema/knowledge.ts
type Knowledge = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  
  // 来源类型
  sourceType: "article" | "faq" | "url" | "manual";
  
  // 内容字段
  sourceTitle: string | null;
  sourceUrl: string | null;
  content: string;
  
  // 元数据
  language: string | null;
  categories: string[] | null;
  tags: string[] | null;
  
  // SEO / 关联
  relatedQuestions: string[] | null;
  
  // 状态
  lastReviewedAt: Date | null;
  reviewStatus: "draft" | "published" | "archived" | null;
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
```

**设计决策**：
- 多态 sourceType 支持灵活来源（无需为每种来源建表）
- relatedQuestions 字段支持语义相似查询和推荐
- reviewStatus 实现草稿 → 发布 → 归档的内容生命周期

### 2.2 Chunk 表（向量分片）

```typescript
// apps/api/src/db/schema/chunk.ts
type Chunk = {
  id: Ulid;
  websiteId: Ulid;            // 网站级租户隔离
  
  // 多源关联（任一非空即可）
  knowledgeId: Ulid | null;    // 关联 Knowledge 条目
  visitorId: Ulid | null;      // 访客记忆上下文
  contactId: Ulid | null;      // 联系人记忆上下文
  
  // 来源类型，决定检索时的过滤逻辑
  sourceType: "knowledge" | "visitor_memory" | "contact_memory";
  
  // 检索字段
  content: string;             // 纯文本内容，用于嵌入和显示
  embedding: vector(1536);    // OpenAI text-embedding-3-small 向量
  chunkIndex: number | null;   // 原始文档中的位置索引，用于排序
  
  // 扩展元数据
  metadata: Jsonb | null;      // 任意结构化元数据（标题、URL、来源等）
  
  createdAt: Date;
  updatedAt: Date;
};
```

**索引策略**：

```sql
-- 1. HNSW 向量索引：余弦相似度快速检索
CREATE INDEX chunk_embedding_idx ON chunk 
USING hnsw (embedding vector_cosine_ops);

-- 2. 租户隔离索引：查询时必带的过滤条件
CREATE INDEX chunk_website_idx ON chunk (websiteId);

-- 3. 来源类型过滤索引
CREATE INDEX chunk_source_type_idx ON chunk (sourceType);

-- 4. 外键关联索引（分场景过滤）
CREATE INDEX chunk_knowledge_idx ON chunk (knowledgeId);
CREATE INDEX chunk_visitor_idx ON chunk (visitorId);
CREATE INDEX chunk_contact_idx ON chunk (contactId);

-- 5. 复合查询索引（最常用模式）
CREATE INDEX chunk_website_source_type_idx ON chunk (websiteId, sourceType);
```

**设计决策**：
- **单表多态设计**：知识、访客记忆、联系人记忆共享同一张 chunk 表，通过 sourceType 区分，简化向量检索代码路径
- **1536 固定维度**：OpenAI text-embedding-3-small 标准输出，兼容未来模型升级
- **metadata JSONB**：灵活存储来源信息，支持 UI 显示和调试
- **chunkIndex**：当单个 Knowledge 拆分为多个 chunk 时，保持原始顺序

### 2.3 Knowledge Clarification 表（知识澄清）

```typescript
// apps/api/src/db/schema/knowledge-clarification.ts
type KnowledgeClarificationRequest = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  aiAgentId: Ulid;
  
  // 关联来源
  conversationId: Ulid | null;    // 触发澄清的对话
  targetKnowledgeId: Ulid | null; // 关联知识库条目（FAQ 优化场景）
  
  // 核心信息
  source: "conversation" | "faq";  // 来源类型
  status:                          // 生命周期状态
    | "analyzing"                  // AI 分析中
    | "awaiting_answer"            // 等待人类回答
    | "draft_ready"                // AI 生成了 FAQ 草稿
    | "applied"                    // 已采纳到知识库
    | "dismissed"                  // 已忽略
    | "retry_required";            // 需要重试
  topicSummary: string;            // 主题摘要（指纹去重用）
  topicFingerprint: string | null; // 规范化指纹（排重）
  topicEmbedding: vector(1536) | null; // 向量相似匹配
  
  // 问答计划与状态
  questionPlan: Jsonb | null;     // AI 规划的问题列表
  currentQuestion: string | null;
  suggestedAnswers: string[] | null;  // AI 建议的候选答案
  inputMode: "textarea_first" | "suggested_answers" | null;
  questionScope: "broad_discovery" | "narrow_detail" | null;
  
  // 输出产物
  draftFaqPayload: {
    title: string | null;
    question: string;
    answer: string;
    categories: string[];
    relatedQuestions: string[];
  } | null;
  
  maxSteps: number;              // 最大问答轮次
  stepIndex: number;             // 当前轮次
  
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

**设计决策**：
- **状态机驱动**：清晰的生命周期流转 → 可预测的 UI 展示
- **双重排重机制**：
  - topicFingerprint：精确字符串匹配（规范化后）
  - topicEmbedding：向量相似度匹配（阈值 0.9，间隔 0.04 防混淆）
- **questionPlan 缓存**：AI 生成的多轮问题规划持久化，免每次重新生成

---

## 3. 向量检索系统

### 3.1 核心查询：findSimilarChunks

```typescript
// apps/api/src/db/queries/vector-search.ts
export async function findSimilarChunks(
  db: Database,
  query: string,
  options: {
    websiteId: string;
    sourceType?: "knowledge" | "visitor_memory" | "contact_memory";
    visitorId?: string;
    contactId?: string;
    knowledgeId?: string;
    minSimilarity?: number;  // 默认 0.3
    limit?: number;           // 默认 10
  }
): Promise<Array<{
  id: string;
  content: string;
  similarity: number;
  sourceType: string;
  knowledgeId: string | null;
  visitorId: string | null;
  contactId: string | null;
  chunkIndex: number | null;
  metadata: unknown;
}>>;
```

**执行流程**：

```
Query Text
    │
    ▼
generateEmbedding(query)  // OpenAI API 调用
    │
    ▼
db.select()
  .from(chunk)
  .where(
    eq(chunk.websiteId, websiteId),  // 租户隔离，必选
    gt(similarity, minSimilarity),   // 相似度过滤，默认 0.3
    // 可选过滤条件
    sourceType ? eq(chunk.sourceType, sourceType) : alwaysTrue,
    visitorId ? eq(chunk.visitorId, visitorId) : alwaysTrue,
    contactId ? eq(chunk.contactId, contactId) : alwaysTrue,
    knowledgeId ? eq(chunk.knowledgeId, knowledgeId) : alwaysTrue,
  )
  .orderBy(desc(similarity))  // 按相似度降序
  .limit(limit)
```

### 3.2 专用包装器：知识库检索

```typescript
// apps/api/src/db/queries/vector-search.ts
export async function findSimilarKnowledge(
  db: Database,
  query: string,
  websiteId: string,
  options?: { knowledgeId?: string; minSimilarity?: number; limit?: number }
): Promise<Array<{
  id: string;
  content: string;
  similarity: number;
  sourceType: string;
  knowledgeId: string | null;
  chunkIndex: number | null;
  sourceTitle?: string | null;  // 关联 Knowledge 表的标题
  sourceUrl?: string | null;    // 关联 Knowledge 表的 URL
}>>;
```

**特性**：
- 自动 inner join knowledge 表获取来源元信息
- 默认过滤已删除的 knowledge 条目（deletedAt is null）
- 支持限定在特定 knowledgeId 内检索（局部文档问答）

### 3.3 记忆检索：Visitor & Contact Memory

```typescript
// 访客长期记忆检索（对话上下文增强用）
export async function findSimilarVisitorMemories(
  db: Database,
  query: string,
  options: { websiteId: string; visitorId: string }
);

// 联系人上下文检索（客服查看历史时用）
export async function findSimilarContactMemories(
  db: Database,
  query: string,
  options: { websiteId: string; contactId: string }
);
```

---

## 4. 搜索质量评估系统

### 4.1 Search Signals 三级信号机制

```typescript
// apps/api/src/ai-pipeline/shared/knowledge-gap/search-signals.ts
export type SearchQualitySignal = "strong" | "weak" | "none";

// 评估维度：
// 1. similarity 数值：>0.7 = strong, 0.4-0.7 = weak, <0.4 = none
// 2. 结果数量：多个高相似度结果 = strong
// 3. 内容覆盖度：结果是否覆盖问题关键实体
```

**质量评估矩阵**：

| Signal | 相似度区间 | 触发动作 | AI 行为 |
|--------|----------|----------|---------|
| **strong** | > 0.7 且有多个结果 | - | 基于检索结果自信回答 |
| **weak** | 0.4 - 0.7 或单条高相似度 | 回答 + 知识澄清建议 | 谨慎回答，标注可能需要更新 |
| **none** | < 0.4 或无结果 | 触发知识澄清工作流 | 告知无法回答，升级到人工 |

### 4.2 知识缺口检测触发条件

```typescript
// 触发知识澄清的条件
function shouldTriggerClarification(params: {
  searchSignals: SearchQualitySignal;
  mode: "respond_to_visitor" | "background_only";
  hasUsefulReply: boolean;
}): boolean {
  // 条件 1：访客面向模式 + 搜索无结果
  if (params.mode === "respond_to_visitor" && params.searchSignals === "none") {
    return true;
  }
  
  // 条件 2：弱搜索结果但实际无法生成有用回答
  if (params.searchSignals === "weak" && !params.hasUsefulReply) {
    return true;
  }
  
  // 条件 3：答案中出现"我不知道"、"需要确认"等不确定性表达
  if (replyContainsUncertainty()) {
    return true;
  }
  
  return false;
}
```

### 4.3 知识库澄清工具：requestKnowledgeClarification

```typescript
// apps/api/src/ai-pipeline/shared/tools/knowledge-clarification.ts
export function createRequestKnowledgeClarificationTool(ctx: PipelineContext) {
  return tool({
    description:
      "Start a private team clarification workflow to improve " +
      "knowledge base precision without escalating the conversation.",
    
    inputSchema: z.object({
      topicSummary: z.string().min(1).max(1000),
    }),
    
    execute: async ({ topicSummary }) => {
      // 1. 前置检查：如果已有 strong 搜索质量但无有用回复，禁止调用
      if (ctx.mode === "respond_to_visitor" && 
          getBestSearchSignal(ctx) === "strong" && 
          !hasUsefulVisitorReply(ctx)) {
        return { success: false, error: "Send grounded answer first" };
      }
      
      // 2. 构建上下文快照（对话历史 + 搜索证据）
      const { contextSnapshot } = await buildToolDrivenClarificationContext({
        ctx,
        searchEvidence: getKnowledgeClarificationSearchEvidenceFromToolExecutions(
          ctx.runtimeState.toolExecutions
        ),
      });
      
      // 3. 创建澄清请求（DB 持久化）
      return requestKnowledgeClarificationAction({
        db: ctx.db,
        conversation: ctx.conversation,
        organizationId: ctx.organizationId,
        websiteId: ctx.websiteId,
        aiAgentId: ctx.aiAgentId,
        topicSummary,
        contextSnapshot,
      });
    },
  });
}
```

**设计决策**：
- **访客侧保护**：有 strong 证据时必须先给出 grounded answer，不能直接开澄清流程（防 AI 偷懒）
- **上下文快照**：将触发时的对话历史、搜索证据、关联 FAQ 一次性持久化，避免上下文漂移
- **实时事件发射**：创建后立即通过 Realtime 通知坐席端有新的澄清任务待处理

---

## 5. 知识澄清工作流引擎

### 5.1 工作流状态机

```
                            ┌──────────────────────────┐
                            │      analyzing           │
                            │  (AI 生成问题规划)       │
                            └──────────┬───────────────┘
                                       │
                            ┌──────────▼───────────────┐
                            │   awaiting_answer        │
                            │  (等待人类坐席回答)      │
                            └──────────┬───────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
┌───────────────▼──────────┐  ┌──────▼───────────────┐  ┌──▼───────────────┐
│      draft_ready         │  │  analyzing (next Q)  │  │   applied         │
│  (AI 生成 FAQ 草稿)      │  │  (多轮问答循环)      │  │  (已入知识库)      │
└──────────────────────────┘  └──────────────────────┘  └──────────────────┘
                                       │
                            ┌──────────▼───────────────┐
                            │       dismissed          │
                            │  (人工忽略该澄清请求)    │
                            └──────────────────────────┘
```

### 5.2 上下文构建与快照

```typescript
// apps/api/src/lib/knowledge-clarification-context.ts
export type KnowledgeClarificationContextSnapshot = {
  // 触发源信息
  sourceTrigger: {
    text: string | null;               // 触发问题原文
    timestamp: string | null;          // 触发时间
    senderType: string | null;         // 发送者类型
  };
  
  // 对话历史摘要（JSON 序列化）
  conversationTranscript: string | null;
  
  // 知识库搜索证据
  kbSearchEvidence: Array<{
    query: string;
    result: {
      title: string | null;
      content: string;
      sourceUrl: string | null;
      similarity: number | null;
    };
  }> | null;
  
  // 已关联的 FAQ 快照
  linkedFaq: {
    question: string;
    answer: string | null;
    sourceTitle: string | null;
  } | null;
  
  // 已有的澄清问答对
  priorClarificationQas: Array<{
    question: string;
    answer: string;
  }> | null;
};
```

**构建策略**：
- **触发时一次性快照**：避免对话继续进行导致上下文漂移
- **搜索证据保留**：记录当时的搜索结果和相似度，方便后续复盘检索质量
- **Linked FAQ 引用**：如有 targetKnowledgeId，附带原 FAQ 内容方便对比修改

### 5.3 问题规划与生成

**多轮问答规划（Question Plan）**：

```typescript
// 典型 questionPlan 结构示例
[
  {
    id: "q1_context",
    question: "客户提到的套餐具体指哪个产品？",
    suggestedAnswers: ["专业版套餐", "企业版套餐", "试用版套餐"],
    inputMode: "suggested_answers",
    questionScope: "narrow_detail",
    missingFact: "产品套餐名称",
    whyItMatters: "套餐不同对应的定价和功能差异很大"
  },
  {
    id: "q2_usage",
    question: "客户是遇到了什么具体的使用问题？",
    suggestedAnswers: ["登录问题", "功能报错", "使用教程", "账号限制"],
    inputMode: "suggested_answers",
    questionScope: "narrow_detail",
    missingFact: "问题场景分类",
    whyItMatters: "不同类型问题需要不同的解决方案模板"
  }
]
```

**AI 生成 prompt 片段**：

```
你是知识库澄清专家。基于访客对话和搜索证据，规划最多 {maxSteps} 个澄清问题：

1. 每个问题必须指向一个明确的缺失事实（missingFact）
2. 每个问题提供 3 个候选答案（suggestedAnswers）
3. inputMode：首问可用 textarea_first 开放式，后续用 suggested_answers
4. questionScope：broad_discovery（首问）或 narrow_detail（后续）
5. 说明为什么需要这个信息（whyItMatters）

话题：{topicSummary}
对话历史：
{conversationTranscript}

搜索证据：
{kbSearchEvidence}

返回 JSON 格式的 questionPlan 数组。
```

### 5.4 FAQ 草稿生成

**draftFaqPayload 结构**：

```typescript
{
  title: string | null;             // 建议的知识库标题
  question: string;                 // FAQ 问题（标准化问句）
  answer: string;                   // 答案内容（基于澄清对话）
  categories: string[];             // 建议的类目列表
  relatedQuestions: string[];       // 相关问题推荐
}
```

**生成触发条件**：
- 达到 maxSteps 轮次上限
- 人工标记"信息足够"
- AI 检测到已有足够信息生成完整答案

**质量控制**：
- Answer 必须包含 grounded facts（来自上下文和澄清答案）
- Categories 从现有知识库类目列表中选择 + 可建议新类目
- Related Questions 基于向量相似度推荐已有 FAQ

---

## 6. 去重与复用机制

### 6.1 双重去重策略

```
相同问题多次触发 → 避免重复澄清工作
        │
        ▼
┌─────────────────────────────────────────────────┐
│  Level 1: Topic Fingerprint (精确匹配)          │
│  - 文本规范化（小写、去标点、去停用词）         │
│  - MD5 哈希作为 fingerprint                      │
│  - 唯一约束：(websiteId, topicFingerprint)     │
└─────────────────────────────────────────────────┘
        │
        ▼  精确未命中
┌─────────────────────────────────────────────────┐
│  Level 2: Vector Similarity (语义匹配)          │
│  - topicEmbedding = generateEmbedding(topic)    │
│  - HNSW 索引 top-5 检索                         │
│  - 第一名 ≥ 0.9 且领先第二名 ≥ 0.04 → 匹配      │
│  - 避免边界混淆：0.89 vs 0.90 → 不判定为重复    │
└─────────────────────────────────────────────────┘
```

### 6.2 跨对话复用信号

当检测到可复用的澄清请求时，创建关联信号而非新建请求：

```typescript
// apps/api/src/db/schema/knowledge-clarification-signal.ts
type KnowledgeClarificationSignal = {
  id: Ulid;
  requestId: Ulid;                 // 指向主澄清请求
  sourceKind: "conversation" | "faq";
  
  // 触发源（二选一）
  conversationId: Ulid | null;
  knowledgeId: Ulid | null;
  
  triggerMessageId: Ulid | null;   // 对话中的触发消息
  summary: string;                  // 本次触发的摘要
  searchEvidence: Jsonb | null;    // 本次的搜索证据快照
  createdAt: Date;
};
```

**价值**：
- 坐席端可看到一个澄清请求服务了多少对话
- 统计高频问题，指导知识库内容优先级
- 避免团队重复回答相同问题

---

## 7. 文本分块与嵌入

### 7.1 Text Chunker

```typescript
// apps/api/src/utils/text-chunker.ts

// 分块策略：
// 1. 语义感知分块：优先在段落、句子边界切分
// 2. 重叠窗口：相邻 chunk 重叠 ~20% 内容，避免上下文断裂
// 3. Token 预算：适配 embedding 模型的上下文窗口

export function chunkText(
  text: string,
  options: {
    maxTokens?: number;      // 默认 512 tokens
    overlapTokens?: number;  // 默认 100 tokens（约 20%）
    preserveParagraphs?: boolean;  // 默认 true
  }
): Array<{
  content: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
}>;
```

**分块最佳实践**：
- **知识 FAQ**：短内容，通常 1 个 FAQ = 1 chunk
- **长文章/文档**：按段落优先，超出则按句子，最后按单词
- **网页爬取**：先提取正文（去广告导航），再分块

### 7.2 Embedding 客户端

```typescript
// apps/api/src/lib/embedding-client.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// 单文本嵌入
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " "),  // 换行符可能影响质量
    dimensions: 1536,  // 显式指定，兼容未来默认变化
  });
  
  return response.data[0].embedding;
}

// 批量嵌入（节省 API 调用次数）
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // 单批次限制 2048 个输入，超长分批
  const batches = chunkArray(texts, 2048);
  const results: number[][] = [];
  
  for (const batch of batches) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map(t => t.replace(/\n/g, " ")),
      dimensions: 1536,
    });
    results.push(...response.data.map(d => d.embedding));
  }
  
  return results;
}
```

**嵌入优化策略**：
- **预处理**：去除多余换行、统一空白字符
- **批量调用**：一次 API 调用处理多条文本，节省成本和时间
- **缓存**：相同内容的嵌入结果可缓存（Redis / 内存），避免重复计算
- **降级**：OpenAI 不可用时可降级到本地嵌入模型（如 Xenova Transformers.js）

---

## 8. 设计权衡与决策记录

### 8.1 pgvector vs Pinecone / Weaviate

**决策**：使用 PostgreSQL + pgvector

| 维度 | pgvector | Pinecone | Weaviate |
|------|----------|----------|----------|
| 运维复杂度 | 低（已有 PostgreSQL） | 中（托管服务） | 高（自托管集群） |
| 数据一致性 | 强（同 DB 事务） | 弱（异步同步） | 中（批量导入） |
| 查询延迟 | 中（HNSW 适合万级） | 低（专用基础设施） | 中 |
| 成本 | 低（已在 DB 预算内） | 高（按 vector + query 计费） | 中 |
| 生态集成 | 完美（Drizzle ORM 原生支持） | 需要自定义同步 | 需要自定义同步 |

**决策理由**：
- Cossistant 当前知识库规模（单租户万级）pgvector 完全够用
- 避免引入新的外部依赖，降低系统复杂度
- 事务一致性：knowledge 和 chunk 更新在同一事务，无同步延迟问题
- 未来规模增长：可升级到 pgvector 分区表，或评估专用向量数据库迁移

### 8.2 单表多态 vs 分表存储

**决策**：knowledge / visitor_memory / contact_memory 共享 chunk 表，sourceType 区分

| 维度 | 单表多态 | 分表存储 |
|------|----------|----------|
| 查询代码复用 | 高（一套 vector search） | 低（每类写一套） |
| 跨类型联合检索 | 天然支持（不传 sourceType 过滤） | 需要 JOIN / UNION |
| 索引维护成本 | 中（复合索引覆盖常用模式） | 低（各表独立索引） |
| 数据隔离清晰度 | 中（需记得带 sourceType） | 高 |

**决策理由**：
- 三种 source 共享 90% 的检索逻辑，代码复用价值高
- 未来可能需要跨类型检索（knowledge + visitor memory 联合上下文）
- 可通过 CHECK 约束 + 触发器保证单条记录只有一个外键非空

### 8.3 澄清工作流：内联 vs 异步

**决策**：完全异步工作流，独立于主对话 Pipeline

| 维度 | 内联同步 | 异步工作流 |
|------|----------|----------|
| 访客体验 | 等待澄清 → 回答延迟高 | AI 先尽力回答，后台补充知识库 |
| 实时性 | 一次对话完成问答闭环 | 知识库改进不阻塞当前对话 |
| 人工参与 | 需要坐席中断当前对话 | 坐席后台批量处理澄清任务 |
| 知识累积速度 | 快（对话内完成） | 慢但持续（离线批量改进） |

**决策理由**：
- 访客对话不能被知识库澄清阻塞，体验优先
- 组织知识库改进是后台任务，不追求实时性
- 坐席工作模式偏好批量处理任务，而非穿插在对话中
- 澄清结果可用于未来对话，不依赖当前对话复用

---

## 相关文档

- [01. 系统架构总览](./01-SYSTEM-OVERVIEW.md) - 整体架构与应用关系
- [04. AI 对话管道](./04-AI-CONVERSATION.md) - RAG 检索结果注入到对话上下文
- [06. 访客追踪系统](./06-VISITOR-TRACKING.md) - Visitor Memory 来源上下文
- [09. 数据模型](./09-DATA-MODEL.md) - Knowledge / Chunk Schema 详解
