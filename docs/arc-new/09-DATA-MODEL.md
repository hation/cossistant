# 数据模型与 Schema

## 1. ER 图总览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Core Identity Layer                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │ Organization │────▶│   Website    │────▶│  AI Agent    │                 │
│  │  (组织)      │     │  (网站/品牌) │     │  (AI代理)    │                 │
│  └──────────────┘     └──────────────┘     └──────────────┘                 │
│         │                      │                      │                        │
│         ▼                      ▼                      ▼                        │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │  User        │     │   Visitor    │     │  AI Agent    │                 │
│  │  (坐席用户)  │     │   (访客)     │     │  Prompt Doc  │                 │
│  └──────────────┘     └──────────────┘     └──────────────┘                 │
│                                │                                             │
│                                ▼                                             │
│                         ┌──────────────┐                                     │
│                         │  Contact     │                                     │
│                         │ (联系人档案) │                                     │
│                         └──────────────┘                                     │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Conversation Layer                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────┐     ┌──────────────────────────┐     ┌──────────────┐    │
│  │ Conversation │◀───│  Conversation Timeline    │───▶│  Feedback    │    │
│  │  (对话)      │     │  Item (消息/事件/...)    │     │  (评价)     │    │
│  └──────────────┘     └──────────────────────────┘     └──────────────┘    │
│         │                                                                            │
│         ▼                                                                            │
│  ┌──────────────────────────┐                                                       │
│  │ Knowledge Clarification   │                                                       │
│  │ Request (知识澄清请求)    │                                                       │
│  └──────────────────────────┘                                                       │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Knowledge Layer                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────┐    ┌─────────────────────────────────┐                       │
│  │ Knowledge    │───▶│       Chunk (Vector Store)      │                       │
│  │ (知识库条目) │    │  (分块向量存储，支持多源关联)      │                       │
│  └──────────────┘    └─────────────────────────────────┘                       │
│                         ┌──────────────┐  ┌──────────────┐                      │
│                         │  VisitorId   │  │  ContactId   │                      │
│                         │  (访客记忆)  │  │ (联系人记忆) │                      │
│                         └──────────────┘  └──────────────┘                      │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Infrastructure Layer                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ API Keys     │  │ Auth OAuth   │  │ OpenRouter   │  │ Lifecycle    │    │
│  │ (API 密钥)   │  │ (第三方登录)  │  │ BYOK         │  │ Email Queue  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 设计原则与规范

### 2.1 核心规范

| 规范 | 描述 |
|------|------|
| **ULID 主键** | 所有表使用 ULID，避免 ID 泄露 + 时间有序 + 全局唯一 |
| **时间戳标准** | `createdAt` / `updatedAt` / `deletedAt` 软删除三件套 |
| **租户隔离** | 所有业务表必带 `organizationId` + `websiteId` 双层隔离 |
| **外键一致性** | 所有外键 `ON DELETE CASCADE` + 显式索引 |
| **JSONB 使用** | 仅用于灵活扩展字段（如 metadata），核心字段必须列定义 |
| **Drizzle ORM** | 统一 Drizzle ORM Schema，类型安全同步 |

### 2.2 命名约定

| 对象类型 | 约定 | 示例 |
|----------|------|------|
| 表名 | 蛇形小写，复数形式 | `conversation_timeline_item` |
| 列名 | 驼峰命名，与 TypeScript 一致 | `aiAgentId`, `visitorId` |
| 索引名 | `{table}_{columns}_{type}` | `chunk_embedding_idx` |
| 外键名 | `{table}_{column}_fkey` | `chunk_website_id_fkey` |
| 枚举值 | UPPER_SNAKE_CASE | `CONVERSATION_STARTED` |

---

## 3. 核心实体详解

### 3.1 Organization & Website

```typescript
// apps/api/src/db/schema/website.ts
type Organization = {
  id: Ulid;                 // 组织 ID
  name: string;             // 组织名称
  slug: string;             // URL 友好的标识（唯一）
  metadata: Jsonb | null;   // 自定义元数据
  createdAt: Date;
  updatedAt: Date;
};

type Website = {
  id: Ulid;                 // 网站 ID
  organizationId: Ulid;     // 所属组织
  name: string;             // 网站名称
  slug: string;             // 子域名或路径标识
  domain: string | null;    // 绑定的域名
  defaultLanguage: string;  // 默认语言（如 'en', 'zh-CN'）
  timezone: string | null;  // 时区
  
  // AI 计费配置
  openrouterApiKeyEncrypted: string | null;
  polarCustomerId: string | null;     // Polar.sh 计费客户 ID
  
  // 功能开关
  autoTranslateEnabled: boolean;      // 自动翻译开关
  autoResolveEnabled: boolean;        // AI 自动标记已解决
  
  metadata: Jsonb | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;   // 软删除
};
```

**设计要点**：
- **双层租户模型**：一个 Organization 拥有多个 Website，独立计费、独立配置
- **Polar 集成**：计费配置放在 Website 层，支持按网站计费
- **域名白名单**：用于验证 Widget 嵌入权限

### 3.2 AI Agent

```typescript
// apps/api/src/db/schema/ai-agent.ts
type AiAgent = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  name: string;                        // Agent 名称（如 "客服助手"）
  description: string | null;
  
  // 模型配置
  model: string;                       // 默认模型，如 "openai/gpt-4o"
  provider: "openai" | "openrouter" | "anthropic";
  maxTokens: number | null;            // 输出 token 上限
  temperature: number | null;          // 温度参数（0-2）
  
  // 行为开关
  isActive: boolean;                    // 启用/停用开关
  canEscalate: boolean;                 // 是否允许升级到坐席
  canMarkSpam: boolean;                 // 是否允许标记垃圾消息
  canResolve: boolean;                  // 是否允许自动解决对话
  
  // 自定义配置（JSONB，可扩展）
  systemPromptOverride: string | null;  // 全局系统提示词覆盖
  customInstructions: Jsonb | null;     // 自定义指令集合
  behaviorSettings: Jsonb | null;       // 行为配置
  
  // 多语言支持
  language: string | null;
  languageFallbackEnabled: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
```

**设计决策**：
- 每个 Website 可以有多个 AI Agent，按业务场景划分（如售前、售后、VIP专属）
- `behaviorSettings` 作为灵活配置层，避免频繁改动 Schema
- Provider 抽象层：OpenAI API 直接调用 或 通过 OpenRouter 统一路由

### 3.3 Visitor & Contact

```typescript
// apps/api/src/db/schema/website.ts
type Visitor = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  
  // 身份信息
  identified: boolean;                   // 是否已识别为联系人
  contactId: Ulid | null;               // 关联到 Contact（如已识别）
  
  // 设备与环境
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  device: string | null;
  deviceType: string | null;             // mobile / desktop / tablet
  
  // 地理位置
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geoSource: string | null;              // maxmind / edge_header
  
  // 语言偏好
  language: string | null;
  timezone: string | null;
  
  // 归因（首次访问来源）
  attribution: Jsonb | null;             // 渠道、着陆页、UTM参数快照
  currentPage: Jsonb | null;             // 当前页面信息
  
  // 运营标记
  blockedAt: Date | null;
  blockedByUserId: Ulid | null;
  
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Contact = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  
  // 基本信息
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  
  // 客户信息
  company: string | null;
  tags: string[] | null;
  customFields: Jsonb | null;           // 客户自定义字段
  
  // 关联
  externalId: string | null;             // CRM 外部 ID
  mergedIntoContactId: Ulid | null;     // 合并标记
  
  // 状态
  subscribed: boolean;                   // 邮件订阅状态
  optedOutAt: Date | null;
  bouncedAt: Date | null;
  
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
```

**设计要点**：
- **Visitor → Contact 关联**：未识别访客是 Visitor，识别后关联到 Contact 档案
- **Contact 合并**：支持合并重复联系人，保留原始 ID 做重定向
- **customFields 灵活扩展**：客户可自定义字段，无需 Schema 变更

---

## 4. 对话系统 Schema

### 4.1 Conversation

```typescript
// apps/api/src/db/schema/conversation.ts
type Conversation = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  visitorId: Ulid;
  
  // 参与者
  assigneeUserId: Ulid | null;          // 分配坐席
  aiAgentId: Ulid | null;               // 参与的 AI Agent
  
  // 状态
  status: "open" | "pending" | "resolved" | "closed" | "spam";
  priority: "low" | "normal" | "high" | "urgent";
  escalationReason: string | null;
  
  // 语言
  language: string | null;
  languageDetectedAt: Date | null;
  languageConfidence: number | null;    // 0-1
  
  // 来源与归因
  source: "widget" | "api" | "email" | "chat";
  sourceMetadata: Jsonb | null;         // 来源详情
  attribution: Jsonb | null;             // 首次访问归因快照
  
  // 统计指标
  messageCount: number;                  // 消息总数
  humanMessageCount: number;             // 坐席消息数
  aiMessageCount: number;                // AI 消息数
  visitorMessageCount: number;           // 访客消息数
  
  // SLA 时间点
  firstResponseAt: Date | null;          // 首次响应时间
  firstHumanResponseAt: Date | null;     // 首次坐席响应时间
  resolvedAt: Date | null;               // 标记解决时间
  closedAt: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
```

**索引设计**：
```sql
-- 列表查询主索引（按时间排序）
CREATE INDEX conversation_website_status_created_idx 
ON conversation (websiteId, status, createdAt DESC);

-- 坐席个人工作台
CREATE INDEX conversation_assignee_idx 
ON conversation (websiteId, assigneeUserId, createdAt DESC);

-- 访客历史对话
CREATE INDEX conversation_visitor_idx 
ON conversation (websiteId, visitorId, createdAt DESC);
```

### 4.2 Conversation Timeline Item

```typescript
// apps/api/src/db/schema/conversation.ts
type ConversationTimelineItem = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  conversationId: Ulid;
  
  // 类型区分
  type: string                           // 事件类型（见下方枚举）
  visibility: "public" | "private";     // 访客可见 or 仅坐席可见
  
  // 发送者（多态）
  senderType: "visitor" | "human_agent" | "ai_agent" | "system";
  visitorId: Ulid | null;
  userId: Ulid | null;
  aiAgentId: Ulid | null;
  
  // 消息内容
  message: string | null;
  messageHtml: string | null;
  contentType: "text" | "markdown" | "html";
  format: Jsonb | null;                  // 富文本格式信息
  
  // 附件
  attachments: Jsonb[] | null;           // 文件附件列表
  inlineImages: Jsonb[] | null;          // 内嵌图片
  
  // AI 元数据
  aiGenerationId: string | null;         // 关联到 Generation 记录
  aiModel: string | null;                // 使用的模型
  aiProvider: string | null;             // AI 服务商
  aiTokens: number | null;                // 消耗 token 数
  aiConfidence: number | null;            // 0-1 置信度
  aiThought: string | null;               // 思维链记录（内部可见）
  
  // 翻译
  originalLanguage: string | null;
  translatedLanguage: string | null;
  translatedBy: "ai" | "human" | null;
  translationId: string | null;
  
  // 引用
  inReplyToTimelineItemId: Ulid | null;  // 回复引用
  quotedContent: string | null;           // 引用内容快照
  
  // 编辑历史
  editedAt: Date | null;
  lastEditedByUserId: Ulid | null;
  lastEditedByAiAgentId: Ulid | null;
  
  createdAt: Date;
  updatedAt: Date;
};

// Timeline Item 类型枚举
const TIMELINE_ITEM_TYPES = {
  // 消息类
  MESSAGE: "message",
  NOTE: "note",                           // 内部备注（private）
  
  // 状态变更类
  STATUS_CHANGED: "status_changed",
  PRIORITY_CHANGED: "priority_changed",
  ASSIGNEE_CHANGED: "assignee_changed",
  
  // AI 行为类
  AI_ESCALATED: "ai_escalated",
  AI_SUGGESTION_ACCEPTED: "ai_suggestion_accepted",
  
  // 坐席行为类
  HUMAN_JOINED: "human_joined",
  HUMAN_LEFT: "human_left",
  
  // 访客行为类
  VISITOR_BLOCKED: "visitor_blocked",
  VISITOR_UNBLOCKED: "visitor_unblocked",
  
  // 系统事件类
  LANGUAGE_DETECTED: "language_detected",
  CONVERSATION_MERGED: "conversation_merged",
  
  // 知识库相关
  KNOWLEDGE_CLARIFICATION_REQUESTED: "knowledge_clarification_requested",
  KNOWLEDGE_APPLIED: "knowledge_applied",
} as const;
```

**设计决策**：
- **单表多态 Timeline**：所有事件（消息、状态变更、备注等）共享一张表，简化查询
- **Visibility 分层**：`public` 访客可见，`private` 坐席内部使用
- **Sender 多态**：四种发送者类型，用 `senderType` + 对应外键字段区分
- **AI 元数据内置**：AI 消息直接附带 Token、模型、置信度等指标

---

## 5. 知识库系统 Schema

### 5.1 Knowledge

```typescript
// apps/api/src/db/schema/knowledge.ts
type Knowledge = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  
  // 来源类型
  sourceType: "article" | "faq" | "url" | "manual" | "pdf";
  sourceUrl: string | null;             // 原文 URL
  sourceTitle: string | null;            // 原文标题
  
  // 内容
  title: string;
  content: string;                       // 纯文本内容
  summary: string | null;                // AI 生成的摘要
  contentHtml: string | null;            // 富文本 HTML
  
  // 分类与标签
  category: string | null;
  tags: string[] | null;
  
  // FAQ 专用字段
  question: string | null;               // FAQ 问题
  answer: string | null;                 // FAQ 答案
  relatedQuestions: string[] | null;
  
  // 来源抓取信息
  lastCrawledAt: Date | null;
  crawlStatus: "pending" | "success" | "failed" | null;
  crawlError: string | null;
  contentHash: string | null;            // 内容哈希，检测变化
  
  // 审核与生命周期
  reviewStatus: "draft" | "published" | "archived";
  reviewedByUserId: Ulid | null;
  reviewedAt: Date | null;
  
  // 统计信息
  viewCount: number;                      // 查看次数
  helpfulCount: number;                   // 标记有用次数
  notHelpfulCount: number;                // 标记无用次数
  aiUsedCount: number;                    // AI 引用次数
  
  // 语言
  language: string | null;
  
  metadata: Jsonb | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
```

**索引设计**：
```sql
-- 全文检索（使用 PostgreSQL GIN）
CREATE INDEX knowledge_content_idx ON knowledge 
USING GIN (to_tsvector('english', content));

-- 分类列表查询
CREATE INDEX knowledge_website_category_idx 
ON knowledge (websiteId, category, updatedAt DESC);
```

### 5.2 Chunk（向量存储）

```typescript
// apps/api/src/db/schema/chunk.ts
type Chunk = {
  id: Ulid;
  websiteId: Ulid;
  
  // 多源关联（互斥，仅有一个非空）
  knowledgeId: Ulid | null;
  visitorId: Ulid | null;
  contactId: Ulid | null;
  
  sourceType: "knowledge" | "visitor_memory" | "contact_memory";
  
  content: string;                       // 分块内容
  embedding: vector(1536);              // OpenAI text-embedding-3-small
  chunkIndex: number | null;             // 原文中的顺序
  
  // 搜索用元数据（冗余存储，提高检索性能）
  title: string | null;
  sourceUrl: string | null;
  category: string | null;
  
  metadata: Jsonb | null;
  
  createdAt: Date;
  updatedAt: Date;
};
```

**索引设计**：
```sql
-- HNSW 向量索引，余弦相似度
CREATE INDEX chunk_embedding_idx ON chunk 
USING hnsw (embedding vector_cosine_ops);

-- 来源过滤复合索引
CREATE INDEX chunk_website_source_type_idx 
ON chunk (websiteId, sourceType);

-- 关联查询索引
CREATE INDEX chunk_knowledge_idx ON chunk (knowledgeId);
CREATE INDEX chunk_visitor_idx ON chunk (visitorId);
CREATE INDEX chunk_contact_idx ON chunk (contactId);
```

### 5.3 Knowledge Clarification Request

```typescript
// apps/api/src/db/schema/knowledge-clarification.ts
type KnowledgeClarificationRequest = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  aiAgentId: Ulid;
  
  // 触发来源
  conversationId: Ulid | null;
  targetKnowledgeId: Ulid | null;
  source: "conversation" | "faq";
  
  // 核心信息
  topicSummary: string;
  topicFingerprint: string | null;       // 规范化指纹，精确去重
  topicEmbedding: vector(1536) | null;   // 向量语义去重
  
  // 工作流状态
  status: 
    | "analyzing" 
    | "awaiting_answer" 
    | "draft_ready" 
    | "applied" 
    | "dismissed" 
    | "retry_required";
  stepIndex: number;                      // 当前轮次
  maxSteps: number;                       // 最大轮次
  
  // 问题规划
  questionPlan: Jsonb | null;             // Array<{id, question, suggestedAnswers...}>
  currentQuestion: string | null;
  suggestedAnswers: string[] | null;
  inputMode: "textarea_first" | "suggested_answers" | null;
  questionScope: "broad_discovery" | "narrow_detail" | null;
  
  // 上下文快照
  contextSnapshot: Jsonb | null;          // 对话历史 + 搜索证据快照
  
  // FAQ 草稿输出
  draftFaqPayload: Jsonb | null;          // {title, question, answer, categories...}
  
  // 错误处理
  lastError: string | null;
  retryCount: number;
  nextRetryAt: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
};
```

**关联表**：
- `KnowledgeClarificationTurn`：每一轮问答记录（AI问题 + 人类回答）
- `KnowledgeClarificationSignal`：复用信号（相同问题多次触发时记录）

---

## 6. 基础设施 Schema

### 6.1 API Keys

```typescript
// apps/api/src/db/schema/api-keys.ts
type ApiKey = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid | null;                // NULL = 组织级密钥
  
  name: string;
  keyPrefix: string;                      // 前 8 位，用于显示和检索
  keyHash: string;                        // bcrypt 哈希存储
  
  // 权限范围
  scope: "public" | "private" | "admin";  // public: 仅访客端API
                                            // private: 坐席和管理API
                                            // admin: 组织级管理API
  
  // 来源限制
  allowedOrigins: string[] | null;        // CORS 白名单
  allowedIpRanges: string[] | null;        // IP 白名单
  
  // 使用限制
  rateLimitPerMinute: number | null;
  rateLimitPerHour: number | null;
  dailyLimit: number | null;
  
  // 使用统计
  lastUsedAt: Date | null;
  lastUsedFromIp: string | null;
  usageCount: number;
  
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
```

### 6.2 OpenRouter BYOK

```typescript
// apps/api/src/db/schema/openrouter-byok.ts
type OpenRouterByokConfig = {
  id: Ulid;
  organizationId: Ulid;
  websiteId: Ulid;
  
  // 加密存储的密钥
  apiKeyEncrypted: string;
  
  // 模型配置
  allowedModels: string[] | null;          // NULL = 所有可用模型
  blockedModels: string[] | null;
  defaultModel: string | null;
  
  // 费用限额
  monthlySpendLimit: number | null;        // 月度花费限额（美元）
  currentMonthSpend: number;
  spendUpdatedAt: Date | null;
  
  // 使用统计
  totalRequests: number;
  totalTokens: number;
  
  // 状态
  isActive: boolean;
  lastValidatedAt: Date | null;
  lastValidationError: string | null;
  
  // Fallback 策略
  fallbackToPlatform: boolean;             // 超限额时回退到平台密钥
  fallbackThresholdPercent: number;        // 触发回退的阈值百分比
  
  createdAt: Date;
  updatedAt: Date;
};
```

**设计要点**：
- **敏感数据加密**：API Key 使用 `AES-256-GCM` 加密存储，不落盘
- **额度控制**：支持月度花费限额，超限额自动 fallback
- **模型白名单**：限制 BYOK Key 可使用的模型范围

---

## 7. 索引策略与性能优化

### 7.1 常用查询模式索引矩阵

| 表 | 查询场景 | 索引 |
|----|----------|------|
| **Conversation** | 按状态 + 时间倒序（列表页） | `(websiteId, status, createdAt DESC)` |
| | 坐席分配视图 | `(websiteId, assigneeUserId, createdAt DESC)` |
| | 访客历史对话 | `(websiteId, visitorId, createdAt DESC)` |
| **Conversation Timeline Item** | 对话消息流 | `(conversationId, createdAt ASC)` |
| | 坐席发件箱 | `(userId, createdAt DESC)` |
| **Visitor** | 快速查找访客 | `(websiteId, id)` |
| | 按 IP 去重 | `(websiteId, ip, createdAt DESC)` |
| **Chunk** | 向量检索 | `HNSW (embedding vector_cosine_ops)` |
| | 按来源过滤 | `(websiteId, sourceType)` |
| **Knowledge** | 按分类列表 | `(websiteId, category, updatedAt DESC)` |
| | 全文搜索 | `GIN (to_tsvector('english', content))` |

### 7.2 向量查询性能优化

```sql
-- Indexes already defined in schema

-- 查询优化建议：
-- 1. 预热：pg_ivm 创建增量物化视图（高频查询模式）
-- 2. 结果限制：LIMIT 10-20，避免返回过多向量
-- 3. 阈值过滤：minSimilarity 0.3-0.4，剔除噪声结果

-- 典型查询计划：
-- 1. embedding 生成（应用层，OpenAI API）
-- 2. HNSW 索引扫（<= 1ms，万级向量）
-- 3. 条件过滤（websiteId + sourceType）
-- 4. 结果排序（LIMIT 之后内存排序，可忽略）
```

### 7.3 软删除与数据归档

**软删除设计**：
- 所有业务表使用 `deletedAt: Date | null`
- 应用层查询自动带上 `WHERE deletedAt IS NULL`
- 可恢复删除，安全且可逆

**归档策略**：
- 超过 90 天的已关闭对话：归档到 S3 + 仅保留元数据
- Chunk 关联的 Knowledge 归档后，Chunk 也一并归档
- 保留统计数据，不归档原始明细

---

## 8. 迁移策略

### 8.1 Schema 变更流程

Drizzle ORM Migration 工作流：
```bash
# 1. 修改 schema/*.ts 定义
vim apps/api/src/db/schema/conversation.ts

# 2. 生成迁移文件
pnpm db:generate

# 3. 审查生成的 SQL
cat migrations/0001_add_new_field.sql

# 4. 本地测试迁移
pnpm db:migrate:local

# 5. Staging 验证
pnpm db:migrate:staging

# 6. Production 执行
pnpm db:migrate:prod
```

### 8.2 零停机迁移模式

| 迁移类型 | 策略 | 示例 |
|----------|------|------|
| **新增字段** | 先加列（默认 NULL），部署代码，回填数据 | `ALTER TABLE conversation ADD COLUMN aiTokens INT NULL` |
| **字段重命名** | 先加新列，双写，回填，切读，删除旧列 | `visitorIp -> visitorIpAddress` |
| **新增表** | 先建表，部署代码，逐步流量切换 | Knowledge Clarification 表 |
| **索引新增** | 并发创建（CONCURRENTLY），不锁表 | `CREATE INDEX CONCURRENTLY ...` |
| **删除字段** | 先停写，确认无查询引用，最后删除 | 确认 metrics 无引用后执行 |

### 8.3 数据回填

**Chunk Embedding 批量生成示例**：
```typescript
// 批量处理，每批 100 条，避免 OpenAI rate limit
async function backfillEmbeddings(db: Database) {
  const cursor = await db.query.chunk.findMany({
    where: isNull(chunk.embedding),
    limit: 100,
  });
  
  // 批量生成 embedding
  const embeddings = await generateEmbeddings(
    cursor.map(c => c.content)
  );
  
  // 批量更新（事务）
  await db.transaction(async tx => {
    for (let i = 0; i < cursor.length; i++) {
      await tx.update(chunk)
        .set({ embedding: embeddings[i] })
        .where(eq(chunk.id, cursor[i].id));
    }
  });
}
```

---

## 相关文档

- [01. 系统架构总览](./01-SYSTEM-OVERVIEW.md) - 整体架构与数据流
- [04. AI 对话管道](./04-AI-CONVERSATION.md) - Conversation 数据流转
- [05. 知识库 RAG 系统](./05-KNOWLEDGE-BASE.md) - Chunk 向量检索
- [07. 计费系统](./07-BILLING.md) - Polar 计费相关表结构
