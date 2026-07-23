# AI对话系统架构方案

## 概述

Cossistant AI对话系统是一个现代化的实时对话处理系统，采用**双管道架构**（Primary Pipeline + Background Pipeline），基于队列的异步处理模型，提供智能回复、知识检索、工具调用、元数据自动维护等功能。

**核心特性**：
- 双管道异步处理架构（实时回复 + 后台维护）
- 三阶段智能决策流程（Intake → Decision → Generation）
- 丰富的工具生态系统
- 知识增强对话（Knowledge RAG）
- 实时事件驱动机制
- 完善的计费与配额控制

---

## 目录

- [系统架构总览](#系统架构总览)
- [数据库层](#数据库层)
- [AI管道层](#ai管道层)
- [工具与功能层](#工具与功能层)
- [提示工程层](#提示工程层)
- [实时事件层](#实时事件层)
- [工作与数据流](#工作与数据流)
- [关键技术实现](#关键技术实现)
- [错误处理与恢复](#错误处理与恢复)
- [扩展与优化建议](#扩展与优化建议)

---

## 系统架构总览

### 架构层级图

```
┌───────────────────────────────────────────────────────────────────────┐
│                          Web / Mobile 层                              │
│                      (浏览器/APP前端界面)                              │
└────────────────────────────────────┬──────────────────────────────────┘
                                     │ (WebSocket / Rest API)
                                     ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         API 服务层 (Hono)                             │
│                    (REST / tRPC / WebSocket)                          │
└────────────────────────────────────┬──────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────────┐     ┌─────────────────────────┐   ┌───────────────────────┐
│  Primary Queue   │     │    Background Queue     │   │    Real-time Events    │
│  (ai-agent)      │     │  (ai-agent-background)  │   │   (Emitter)           │
└────────┬─────────┘     └────────────┬────────────┘   └───────────┬───────────┘
         │                             │                            │
         ▼                             ▼                            ▼
┌───────────────────────────────┐  ┌───────────────────────────────────────────┐
│   Primary Pipeline          │  │      Background Pipeline               │
│   (实时对话处理)           │  │      (元数据/标题/分类/审查)            │
└───────────────────────────────┘  └───────────────────────────────────────────┘
         │
         ├────────────────────────┬───────────────────────┐
         ▼                        ▼                       ▼
┌──────────────────┐     ┌─────────────────────────┐   ┌───────────────────────┐
│  Intake Step     │     │    Decision Step       │   │    Generation Step    │
│  (数据收集)      │     │    (智能决策)         │   │    (工具/生成/回复)  │
└──────────────────┘     └─────────────────────────┘   └───────────────────────┘
```

### 核心技术栈

| 层级 | 技术选择 | 说明 |
|------|---------|------|
| **运行时** | Bun 1.3.1+ | 高性能 JavaScript 运行时 |
| **数据库** | PostgreSQL + Drizzle ORM | 关系型数据库 + TypeScript ORM |
| **向量检索** | pgvector + HNSW | PostgreSQL向量扩展 |
| **队列引擎** | BullMQ + Redis | 消息队列与工作流引擎 |
| **实时通信** | WebSocket + Server-Sent Events | 双向实时消息 |
| **AI SDK** | @ai-sdk (Vercel) | 多模型兼容的AI调用库 |
| **任务调度** | Upstash QStash | 分布式调度 |

---

## 数据库层

### 核心数据表

#### 1. conversation (对话主表)

**文件位置**: `apps/api/src/db/schema/conversation.ts`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | nanoid(21) | 对话唯一ID（Nanoid） |
| `organizationId` | ulid | 组织ID，外键关联 |
| `websiteId` | ulid | 网站ID，外键关联 |
| `visitorId` | ulid | 访客ID，外键关联 |
| `status` | enum | 对话状态：open / closed / pending |
| `priority` | enum | 优先级：low / normal / high / urgent |
| `sentiment` | enum | 情感：positive / neutral / negative |
| `title` | text | 内部标题（管理员可见） |
| `visitorTitle` | text | 访客可见标题 |
| `visitorTitleLanguage` | text | 访客标题语言代码 |
| `visitorLanguage` | text | 访客语言代码 |
| `channel` | text | 渠道：widget / email / other |
| `escalatedAt` | timestamp | 升级时间 |
| `escalationReason` | text | 升级原因 |
| `escalationHandledAt` | timestamp | 升级处理时间 |
| `escalationHandledByUserId` | ulid | 处理升级的用户ID |
| `aiPausedUntil` | timestamp | AI暂停时间（暂不回复） |
| `aiAgentLastProcessedMessageId` | ulid | AI最后处理的消息ID（游标） |
| `aiAgentLastProcessedMessageCreatedAt` | timestamp | 最后消息时间 |
| `lastMessageAt` | timestamp | 最后消息时间 |
| `lastMessageBy` | ulid | 最后消息发送者 |
| `firstResponseAt` | timestamp | 首次回复时间 |
| `resolvedAt` | timestamp | 解决时间 |
| `visitorRating` | integer | 访客评分（1-5） |
| `visitorRatingAt` | timestamp | 评分时间 |
| `metadata` | jsonb | 元数据（JSON） |
| `deletedAt` | timestamp | 软删除标记 |

**索引策略**:
```sql
-- 租户隔离索引
INDEX idx_conversation_org_idx (organizationId);
INDEX idx_conversation_website_status_idx (websiteId, status);

-- 性能优化索引
INDEX idx_conversation_org_priority_idx (organizationId, priority);
INDEX idx_conversation_website_org_deleted_idx (websiteId, organizationId, deletedAt);

-- 分页查询优化
INDEX idx_conversation_org_website_updated_idx (organizationId, websiteId, updatedAt, id);
INDEX idx_conversation_org_website_created_idx (organizationId, websiteId, createdAt, id);
```

#### 2. conversation_timeline_item (对话时间线/消息)

**时间线类型枚举**:
- `visitor_message` - 访客消息
- `agent_message` - AI消息
- `note` - 内部备注
- `visitor_action` - 访客事件
- `system_event` - 系统事件
- `user_action` - 管理员操作

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | ulid | 条目ID |
| `conversationId` | nanoid | 对话ID，外键 |
| `organizationId` | ulid | 组织ID |
| `type` | enum | 时间线条目类型 |
| `visibility` | enum | 可见性：public / internal / private |
| `text` | text | 内容文本 |
| `parts` | jsonb | 富文本内容（结构化） |
| `userId` | ulid | 关联用户ID |
| `visitorId` | ulid | 关联访客ID |
| `aiAgentId` | ulid | 关联AI代理ID |
| `createdAt` | timestamp | 创建时间 |
| `deletedAt` | timestamp | 软删除标记 |

**索引策略**:
```sql
INDEX idx_conversation_timeline_item_org_conv_visibility_idx
  (organizationId, conversationId, visibility);
INDEX idx_conversation_timeline_item_conv_created_idx
  (conversationId, createdAt, id);
```

#### 3. conversation_seen (已读标记)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | ulid | 标记ID |
| `organizationId` | ulid | 组织ID |
| `conversationId` | nanoid | 对话ID |
| `userId` | ulid | 用户ID（或者是visitor或者aiAgent） |
| `visitorId` | ulid | 访客ID |
| `aiAgentId` | ulid | AI代理ID |
| `lastSeenAt` | timestamp | 最后看到的时间 |
| `createdAt` | timestamp | 创建时间 |
| `updatedAt` | timestamp | 更新时间 |

**约束**: 每个actor（user/visitor/aiAgent）在一个conversation只有一个seen记录

#### 4. conversation_assignee (对话分配)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | ulid | 分配记录ID |
| `organizationId` | ulid | 组织ID |
| `conversationId` | nanoid | 对话ID |
| `userId` | ulid | 分配给的用户ID |
| `assignedByUserId` | ulid | 分配者用户ID |
| `assignedByAiAgentId` | ulid | 分配者AI代理ID |
| `assignedAt` | timestamp | 分配时间 |
| `unassignedAt` | timestamp | 解除分配时间 |
| `createdAt` | timestamp | 创建时间 |

#### 5. conversation_participant (对话参与者)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | ulid | 参与者记录ID |
| `organizationId` | ulid | 组织ID |
| `conversationId` | nanoid | 对话ID |
| `userId` | ulid | 用户ID |
| `status` | enum | 状态：active / inactive / removed |
| `reason` | text | 状态变更原因 |
| `requestedByUserId` | ulid | 请求变更的用户ID |
| `requestedByAiAgentId` | ulid | 请求变更的AI代理ID |
| `joinedAt` | timestamp | 加入时间 |
| `leftAt` | timestamp | 离开时间 |
| `createdAt` | timestamp | 创建时间 |

#### 6. conversation_view (对话视图关联)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | ulid | 记录ID |
| `organizationId` | ulid | 组织ID |
| `conversationId` | nanoid | 对话ID |
| `viewId` | ulid | 视图ID |
| `addedByUserId` | ulid | 添加者用户ID |
| `addedByAiAgentId` | ulid | 添加者AI代理ID |
| `createdAt` | timestamp | 创建时间 |
| `deletedAt` | timestamp | 删除时间 |

---

## AI管道层

### Primary Pipeline (主管道 - 实时对话)

**文件位置**: `apps/api/src/ai-pipeline/primary-pipeline/index.ts`

#### Pipeline三阶段流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Trigger (新消息进入队列)                         │
│                  触发消息进入ai-agent queue                         │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Intake Step (数据准备阶段)                       │
│───────────────────────────────────────────────────────────────────────│
│  1. 加载对话和网站上下文                                            │
│  2. 解析历史消息（formatHistory）                                    │
│  3. 解析模型配置（modelResolution）                                   │
│  4. 加载访客信息（visitorContext）                                   │
│  5. 加载AI代理配置（aiAgent）                                        │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Decision Step (智能决策阶段)                     │
│───────────────────────────────────────────────────────────────────────│
│  1. 范围边界检测（Scope Boundary Rules）                             │
│  2. 模式选择（Mode Selection）                                       │
│  3. 标签检测（Tag Detection）                                       │
│  4. 决策结果映射（Result Mapping）                                  │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐
│   │         Decision Outcomes (可能的决策结果)                       │
│   ├─────────────────────────────────────────────────────────────────┤
│   │ shouldAct=true/false          (是否采取行动)                     │
│   │ mode=full/background_only/skip (行动模式)                       │
│   │ scope_boundary_redirect        (范围边界重定向)                  │
│   │ reason=string                 (决策原因)                        │
│   └─────────────────────────────────────────────────────────────────┘
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Generation Step (生成与行动阶段)                  │
│───────────────────────────────────────────────────────────────────────│
│  1. 启动Typing指示器（开始显示输入中）                              │
│  2. 执行Generation Runtime（多工具循环）                            │
│  3. 调用ToolSet（sendMessage/updateTitle/...）                       │
│  4. 记录Usage和Credit（计费）                                       │
│  5. 知识澄清处理（Knowledge Gap Clarification）                     │
│  6. 停止Typing指示器                                                │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                输出结果并安排Background Pipeline                   │
│───────────────────────────────────────────────────────────────────────│
│  1. 更新DB游标（aiAgentLastProcessedMessageId）                   │
│  2. 安排Background任务（30秒延迟）                                  │
│  3. 发送Realtime事件（processing_completed）                        │
│  4. 记录Usage到timeline                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Intake Step详解

**文件位置**: `apps/api/src/ai-pipeline/primary-pipeline/steps/intake/`

#### 主要子组件

| 文件 | 功能 |
|------|------|
| `load-context.ts` | 加载对话、网站、AI代理上下文 |
| `history.ts` | 格式化历史消息为对话上下文 |
| `model-resolution.ts` | 解析并验证模型配置 |
| `types.ts` | 类型定义 |

#### 核心流程

```typescript
async function runIntakeStep(params: {
  db: DrizzleDB;
  input: PrimaryPipelineInput;
}): Promise<
  | { status: "ready"; data: IntakeReadyContext }
  | { status: "skipped"; reason: string; cursorDisposition: CursorDisposition }
> {
  // 1. 验证权限
  // 2. 加载对话、网站、AI代理
  // 3. 加载历史消息并格式化
  // 4. 解析模型配置
  // 5. 构建generationEntries
  // 6. 检查是否有later messages来避免重复处理
  // 7. 返回IntakeReadyContext或跳过
}
```

### Decision Step详解

**文件位置**: `apps/api/src/ai-pipeline/primary-pipeline/steps/decision/`

#### 决策流程图

```
                    ┌─────────────────────┐
                    │   消息到达        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Scope Boundary   │
                    │  (范围边界规则)   │
                    │  (smart/rules)   │
                    └──────────┬──────────┘
                               │
                               ▼
          ┌───────────────────────────────────────┐
          │  是否应该直接重定向？                 │
          │  (scope_boundary_redirect)          │
          └───────────┬───────────────────────────┘
                      │
              ┌───────┴────────┐
              │ 是           │否
              ▼              ▼
┌───────────────────┐  ┌────────────────────────────────┐
│  scope_boundary  │  │  Tag Detection (标签检测)    │
│  立即回复       │  │  检测/情感/分类线索        │
└───────────────────┘  └───────────────┬─────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Deterministic    │
                    │  (确定性规则)      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Smart Decision   │
                    │  (LLM智能决策)     │
                    │  (可选)            │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Result Mapping  │
                    │  (结果映射)       │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │ DecisionOutcome (决策结果)      │
              ├────────────────────────────────┤
              │ - shouldAct (true/false)      │
              │ - mode (full/background/skip) │
              │ - reason (解释)               │
              └────────────────────────────────┘
```

#### 决策类型

| 类型 | 说明 | 触发条件 |
|------|------|---------|
| `deterministic` | 确定性规则决策 | 简单场景，无需LLM |
| `smart` | LLM智能决策 | 复杂场景，需要语义理解 |

#### DecisionOutcome枚举

```typescript
type DecisionOutcome =
  | "reply"
  | "reply_with_escape_hatch"
  | "request_clarification"
  | "knowledge_gap_clarification"
  | "scope_boundary_redirect"
  | "background_only"
  | "skip";
```

### Generation Step详解

**文件位置**: `apps/api/src/ai-pipeline/shared/generation/`

#### Generation Runtime架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Generation Runtime (生成运行时)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐
│  │  1. 构建System Prompt (prompt/builder.ts)                      │
│  │  ├─ coreDocuments (security.md/agent.md/behaviour.md)          │
│  │  ├─ visitorContext                                            │
│  │  ├─ timelineContext                                           │
│  │  ├─ toolInventory                                             │
│  │  └─ languagePolicy                                            │
│  └─────────────────────────────────────────────────────────────────┘
│                              │
│                              ▼
│  ┌─────────────────────────────────────────────────────────────────┐
│  │  2. 工具循环（Tool Loop）                                    │
│  │  ┌────────────────────────────────────────────────────────────┐ │
│  │  │  [Loop]                                                  │ │
│  │  │   │                                                        │ │
│  │  │   ▼                                                        │ │
│  │  │  sendMessage (发送公开消息)                             │ │
│  │  │  updateTitle (更新标题)                                  │ │
│  │  │  updateStatus (更新状态)                                  │ │
│  │  │  updatePriority (更新优先级)                              │ │
│  │  │  updateSentiment (更新情感)                              │ │
│  │  │  updateCategorization (更新分类)                         │ │
│  │  │  escalate (升级)                                         │ │
│  │  │  requestHelp (请求帮助)                                  │ │
│  │  │  requestKnowledgeClarification (知识澄清请求)           │ │
│  │  │  internalNote (内部备注)                                  │ │
│  │  │  assign (分配)                                           │ │
│  │  │  knowledgeSearch (知识搜索)                             │ │
│  │  │  memoryRemember / memoryRecall (记忆功能)              │ │
│  │  │  finish (结束)                                          │ │
│  │  └────────────────────────────────────────────────────────────┘ │
│  └─────────────────────────────────────────────────────────────────┘
│                              │
│                              ▼
│  ┌─────────────────────────────────────────────────────────────────┐
│  │  3. Telemetry（遥测记录）                                     │
│  │  ├─ Token计数与计费（token-usage.ts）                          │
│  │  ├─ Timeline私有事件（timeline.ts）                            │
│  │  ├─ Usage事件记录                                              │
│  │  └─ Debug日志（debug-log.ts）                                  │
│  └─────────────────────────────────────────────────────────────────┘
│                              │
│                              ▼
│  ┌─────────────────────────────────────────────────────────────────┐
│  │  4. 生成最终结果                                              │
│  │  ├─ status (completed/skipped/error/blocked)                 │
│  │  ├─ action (实际行动对象)                                      │
│  │  ├─ publicMessagesSent (公共消息数量)                          │
│  │  ├─ usage (Token使用情况)                                      │
│  │  └─ creditGuard (计费检查结果)                                │
│  └─────────────────────────────────────────────────────────────────┘
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 运行时核心文件

| 文件 | 功能 |
|------|------|
| `generation/index.ts` | 运行时入口，编排整个流程 |
| `generation/internal/attempt.ts` | 单次生成尝试（包含容错和重试） |
| `generation/internal/debug-log.ts` | 调试日志（保存完整提示） |
| `generation/internal/runtime-utils.ts` | 运行时工具函数 |
| `generation/internal/system-prompt-debug-dump.ts` | 系统提示调试导出 |
| `generation/internal/thinking-trace.ts` | 思考过程追踪 |
| `generation/messages/format-history.ts` | 历史消息格式化 |
| `generation/prompt/builder.ts` | 系统提示构建器 |
| `generation/prompt/templates.ts` | 提示模板 |

---

## 工具与功能层

### ToolSet工具注册表

**文件位置**: `apps/api/src/ai-pipeline/shared/tools/index.ts`

### 可用工具列表

| 工具名称 | 功能描述 | 可见性 |
|---------|---------|-------|
| `sendMessage` | 发送公开消息给访客 | 常用 |
| `updateTitle` | 更新对话标题 | 后台 |
| `updateStatus` | 更新对话状态（open/closed） | 后台 |
| `updatePriority` | 更新对话优先级 | 后台 |
| `updateSentiment` | 更新情感分析 | 后台 |
| `updateCategorization` | 分类对话 | 后台 |
| `escalate` | 升级到人工处理 | 常用 |
| `requestHelp` | 请求团队成员帮助 | 常用 |
| `requestKnowledgeClarification` | 请求知识澄清 | 常用 |
| `internalNote` | 添加内部备注 | 常用 |
| `assign` | 分配对话给人 | 常用 |
| `knowledgeSearch` | 搜索知识库 | 常用 |
| `memoryRemember` | 记住信息 | 后台 |
| `memoryRecall` | 回忆信息 | 后台 |
| `finish` | 结束工具调用 | 内部 |

### 工具分类系统

#### 1. Messaging Tools (消息类工具)

**文件**: `apps/api/src/ai-pipeline/shared/actions/send-message.ts`

```typescript
async function sendMessage(params: {
  db: DrizzleDB;
  organizationId: string;
  websiteId: string;
  conversationId: string;
  visitorId: string;
  aiAgentId: string;
  text: string;
  idempotencyKey: string;
}): Promise<{ created: boolean; paused: boolean }>
```

**功能**:
- 发送公开消息到timeline
- 支持idempotency（幂等性）
- 检查aiPausedUntil（AI暂停状态）

#### 2. Analysis Tools (分析类工具)

| 工具 | 功能 |
|------|------|
| `updateTitle` | 基于消息内容生成标题 |
| `updateSentiment` | 情感分析并标记 |
| `updateCategorization` | 分类对话（基于View） |
| `escalate` | 升级逻辑（带reason） |

#### 3. Knowledge Tools (知识类工具)

**文件**: `apps/api/src/ai-pipeline/shared/tools/knowledge-clarification.ts`

```typescript
async function knowledgeSearch(params: {
  db: DrizzleDB;
  organizationId: string;
  websiteId: string;
  conversationId: string;
  aiAgentId: string;
  query: string;
  limit: number;
})
```

**知识搜索流程**:
1. 将查询文本向量化（generateEmbedding）
2. 使用pgvector HNSW做相似度搜索
3. 返回相关的knowledge_chunk
4. 格式化为RAG上下文

#### 4. Memory Tools (记忆类工具)

```typescript
// memoryRemember - 记住信息
async function memoryRemember(params: {
  db: DrizzleDB;
  conversationId: string;
  key: string;
  value: string;
})

// memoryRecall - 回忆信息
async function memoryRecall(params: {
  db: DrizzleDB;
  conversationId: string;
  key?: string;
})
```

#### 5. Admin Tools (管理类工具)

| 工具 | 功能 |
|------|------|
| `assign` | 分配对话给用户 |
| `requestHelp` | @团队成员请求帮助 |
| `internalNote` | 添加私有备注 |
| `updateStatus` | 改变对话状态 |

### 工具实现结构

每个工具都有:
1. `definition` - 工具配置（名称、描述、参数schema）
2. `execute` - 执行逻辑
3. 可选的guard（执行前检查）

---

## 提示工程层

### Prompt Bundle结构

**文件位置**: `apps/api/src/ai-pipeline/shared/prompt/`

#### 核心文档（Core Documents）

系统默认加载以下核心文档，按顺序排列：

| 文档名 | 优先级 | 说明 |
|--------|--------|------|
| `security.md` | 1 | 安全策略（防止越狱） |
| `agent.md` | 2 | AI代理个性与角色 |
| `behaviour.md` | 3 | 行为准则与风格 |
| `visitor-contact.md` | 4 | 访客联系方式处理 |
| `participation.md` | 5 | 人工介入规则 |
| `grounding.md` | 6 | 事实依据规则 |
| `capabilities.md` | 7 | 功能能力说明 |

#### Prompt Builder

**文件位置**: `apps/api/src/ai-pipeline/shared/generation/prompt/builder.ts`

```typescript
export function buildGenerationSystemPrompt(params: {
  input: GenerationRuntimeInput;
  promptBundle: ResolvedPromptBundle;
  toolset: ToolSet;
  toolNames: string[];
  toolSkills?: Array<{ label: string; content: string }>;
}): string {
  const sections = [
    ...buildCorePromptStages(params.promptBundle),
    buildContextFactsStage(params.input),
    buildCurrentTriggerStage(params.input),
    buildConversationTitleStage(params.input),
    buildTimelineSemanticsStage(),
    buildLanguagePolicyStage(params.input),
    buildAvailableViewsStage(params.input),
    buildToolStage({
      toolset: params.toolset,
      toolNames: params.toolNames,
    }),
    buildToolSkillStage({
      toolSkills: params.toolSkills ?? [],
    }),
    buildModeInstructions({
      mode: params.input.mode,
      humanCommand: params.input.humanCommand,
    }),
    REPLY_FLOW_CONTRACT,
  ];
  
  return sections.filter((section) => section.trim().length > 0).join("\n\n");
}
```

#### Prompt模板系统

**文件位置**: `apps/api/src/ai-pipeline/shared/generation/prompt/templates.ts`

**主要模板**:
- `REPLY_FLOW_CONTRACT` - 回复流程契约
- `TOOL_PROTOCOL` - 工具调用协议
- `buildModeInstructions()` - 模式特定的指令

---

## 实时事件层

### Realtime Emitter

**文件位置**: `apps/api/src/realtime/emitter.ts`

### 事件类型

| 事件名 | 说明 | 受众 |
|--------|------|-------|
| `processing_started` | AI开始处理 | visitor + dashboard |
| `typing_started` | 显示输入中 | visitor + dashboard |
| `typing_stopped` | 隐藏输入中 | visitor + dashboard |
| `processing_completed` | AI处理完成 | visitor + dashboard |
| `seen` | 已读标记更新 | dashboard |
| `action` | 完成工具调用 | dashboard |
| `error` | 错误发生 | dashboard |

### Seen State Manager

**文件位置**: `apps/api/src/realtime/support-state.ts`

---

## 工作与数据流

### 完整消息处理流程

```
[1] 访客发送消息
     │
     ├─ API层接收消息（WebSocket/Rest）
     ├─ 插入conversation_timeline_item
     ├─ 更新conversation.lastMessageAt
     └─ 进入Primary Queue
         │
         │
[2] Primary Worker执行Primary Pipeline
         │
         ├─ INTAKE阶段
         │  ├─ 加载conversation/website/aiAgent
         │  ├─ 格式化历史消息
         │  ├─ 解析模型配置
         │  └─ 收集上下文
         │
         ├─ DECISION阶段
         │  ├─ 范围边界检查
         │  ├─ 标签检测
         │  ├─ 智能决策
         │  └─ 结果映射
         │
         ├─ GENERATION阶段
         │  ├─ 启动typing indicator
         │  ├─ Tool Loop (工具调用)
         │  │  ├─ knowledgeSearch (知识搜索)
         │  │  ├─ sendMessage (发送回复)
         │  │  └─ ...其他工具
         │  ├─ 停止typing indicator
         │  └─ Usage遥测
         │
         └─ PIPELINE完成
             │
             ├─ 更新DB游标
             ├─ 安排Background任务（30s delay）
             ├─ 发送realtime events
             └─ 完成
         │
[3] Background Pipeline执行（30秒后）
         │
         ├─ Title Review（标题生成/修正）
         ├─ Knowledge Gap Review（知识缺口检查）
         ├─ Categorization（分类优化）
         └─ 元数据维护
         │
[4] 完成！
```

### 队列系统

#### Primary Queue (ai-agent)

**配置位置**: `packages/jobs/src/triggers/ai-agent.ts`

| 特性 | 值 |
|------|-----|
| Job ID格式 | `ai-agent-{conversationId}` |
| 重试策略 | 3次，指数退避 |
| 超时时间 | 300秒 |
| 并发限制 | 100 |

#### Background Queue (ai-agent-background)

| 特性 | 值 |
|------|-----|
| Job ID格式 | `ai-agent-background-{conversationId}` |
| 延迟调度 | 30秒（30_000 ms） |
| 策略 | 如果有active或pending，取消旧的添加新的（去重/debounce） |

### Cursor机制

**字段**:
- `conversation.aiAgentLastProcessedMessageId`
- `conversation.aiAgentLastProcessedMessageCreatedAt`

**机制**: FIFO处理，按顺序处理每条消息，跳过已处理的

---

## 关键技术实现

### 1. ContentHash（内容去重）

**原理**: 对content做SHA-256哈希，相同的content相同hash，避免重复

```typescript
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
```

### 2. pgvector + HNSW向量索引

**SQL索引**:
```sql
CREATE INDEX idx_embedding_hnsw
ON knowledge_chunk
USING hnsw (embedding vector_cosine_ops);
```

**查询示例**:
```sql
SELECT
  id,
  content,
  embedding <=> $1 AS distance
FROM knowledge_chunk
WHERE organizationId = $2
AND websiteId = $3
AND knowledgeId = COALESCE($4, knowledgeId)
ORDER BY distance
LIMIT $5;
```

**相似度转换**:
```typescript
const similarity = 1 - distance;
```

### 3. Knowledge Gap Clarification（知识澄清）

**流程**:
1. 检测用户问题中的知识缺口
2. 生成clarification request（澄清请求）
3. 在conversation上标记澄清状态
4. 后台进行gap analysis

**文件位置**:
- `apps/api/src/ai-pipeline/shared/knowledge-gap/immediate-clarification.ts`
- `apps/api/src/services/knowledge-clarification.ts`

### 4. Scope Boundary（范围边界）

**功能**: 配置规则，当用户消息匹配时直接重定向到预设回复

**文件位置**:
- `apps/api/src/ai-pipeline/primary-pipeline/steps/decision/scope-boundary.ts`
- `apps/api/src/ai-pipeline/primary-pipeline/steps/decision/smart/rules.ts`

---

## 错误处理与恢复

### Pipeline错误策略

| 错误类型 | 策略 |
|---------|------|
| **Intake错误** | 跳过或重试（cursorDisposition: retry/advance） |
| **Decision错误** | 记录并跳过，安全模式（确定性路径） |
| **Generation错误** | 检查是否发送了public messages。如果是，advance cursor。如果不是且没副作用，retry |
| **CreditGuard阻止** | record blocked event，advance cursor |
| **工具调用错误** | 工具内部捕获，继续flow |

### Retryable判断

```typescript
// 当且仅当：
// 没有发送public messages（publicMessagesSent === 0）
// 没有durable mutations（durableMutationCount === 0）
// 时，才允许retry
```

### Cursor Disposition枚举

```typescript
type CursorDisposition =
  | "retry"  // 不advance，下次重试
  | "advance" // 前进到下一条消息
  | "pin";    // 保持在当前message（特殊情况）
```

---

## 安全考虑

### 1. Kill Switch（安全开关）

**文件位置**: `apps/api/src/ai-pipeline/shared/safety/kill-switch.ts`

### 2. Security文档

**加载位置**: Prompt bundle中的`security.md`

内容包括:
- 不透露内部信息
- 不执行恶意指令
- 内容审核规则
- 越狱防护

---

## 关键文件索引

| 文件路径 | 功能模块 |
|---------|---------|
| **数据库Schema** | |
| `apps/api/src/db/schema/conversation.ts` | 对话相关表定义 |
| `apps/api/src/db/schema/ai-agent.ts` | AI代理配置表 |
| `apps/api/src/db/schema/knowledge.ts` | 知识库表 |
| `apps/api/src/db/schema/knowledge-clarification.ts` | 知识澄清表 |
| **AI Pipeline** | |
| `apps/api/src/ai-pipeline/index.ts` | 管道总入口 |
| `apps/api/src/ai-pipeline/primary-pipeline/index.ts` | 主管道实现 |
| `apps/api/src/ai-pipeline/primary-pipeline/steps/intake/index.ts` | Intake步骤 |
| `apps/api/src/ai-pipeline/primary-pipeline/steps/decision/index.ts` | Decision步骤 |
| `apps/api/src/ai-pipeline/primary-pipeline/internal/typing.ts` | Typing控制 |
| `apps/api/src/ai-pipeline/primary-pipeline/internal/seen.ts` | Seen标记管理 |
| `apps/api/src/ai-pipeline/primary-pipeline/internal/trace.ts` | Debug trace |
| `apps/api/src/ai-pipeline/primary-pipeline/internal/usage.ts` | Usage记录 |
| `apps/api/src/ai-pipeline/primary-pipeline/steps/decision/smart/` | Smart决策实现 |
| `apps/api/src/ai-pipeline/primary-pipeline/steps/decision/scope-boundary.ts` | 范围边界规则 |
| `apps/api/src/ai-pipeline/primary-pipeline/steps/decision/tag-detection.ts` | 标签检测 |
| **Generation** | |
| `apps/api/src/ai-pipeline/shared/generation/index.ts` | Generation runtime入口 |
| `apps/api/src/ai-pipeline/shared/generation/internal/attempt.ts` | 单次生成尝试 |
| `apps/api/src/ai-pipeline/shared/generation/prompt/builder.ts` | 系统提示构建 |
| `apps/api/src/ai-pipeline/shared/generation/messages/format-history.ts` | 历史消息格式化 |
| **Tools** | |
| `apps/api/src/ai-pipeline/shared/tools/index.ts` | 工具注册表 |
| `apps/api/src/ai-pipeline/shared/tools/messaging.ts` | 消息相关工具 |
| `apps/api/src/ai-pipeline/shared/tools/knowledge-clarification.ts` | 知识澄清工具 |
| `apps/api/src/ai-pipeline/shared/tools/knowledge.ts` | 知识搜索工具 |
| `apps/api/src/ai-pipeline/shared/tools/memory.ts` | 记忆工具 |
| `apps/api/src/ai-pipeline/shared/tools/analysis.ts` | 分析工具 |
| `apps/api/src/ai-pipeline/shared/tools/finish.ts` | 结束工具 |
| **Action实现** | |
| `apps/api/src/ai-pipeline/shared/actions/send-message.ts` | sendMessage实现 |
| `apps/api/src/ai-pipeline/shared/actions/update-title.ts` | updateTitle实现 |
| `apps/api/src/ai-pipeline/shared/actions/escalate.ts` | escalate实现 |
| `apps/api/src/ai-pipeline/shared/actions/assign.ts` | assign实现 |
| `apps/api/src/ai-pipeline/shared/actions/categorize.ts` | categorize实现 |
| **Prompt** | |
| `apps/api/src/ai-pipeline/shared/prompt/instructions.ts` | 提示指令构建 |
| `apps/api/src/ai-pipeline/shared/prompt/resolver.ts` | 提示解析器 |
| `apps/api/src/ai-pipeline/shared/prompt/documents.ts` | 核心文档 |
| `apps/api/src/ai-pipeline/shared/prompt/templates.ts` | 提示模板 |
| `apps/api/src/ai-pipeline/shared/prompt/behaviour-catalog.ts` | 行为目录 |
| **Usage & Telemetry** | |
| `apps/api/src/ai-pipeline/shared/usage/index.ts` | 使用记录 |
| `apps/api/src/ai-pipeline/shared/usage/timeline.ts` | Timeline记录 |
| `apps/api/src/ai-pipeline/shared/usage/token-usage.ts` | Token使用 |
| `apps/api/src/ai-pipeline/shared/tools/telemetry/logging.ts` | 遥测日志 |
| `apps/api/src/ai-pipeline/shared/tools/telemetry/timeline.ts` | Timeline遥测 |
| `apps/api/src/ai-pipeline/shared/tools/telemetry/sanitize.ts` | 数据脱敏 |
| **Knowledge Gap** | |
| `apps/api/src/ai-pipeline/shared/knowledge-gap/immediate-clarification.ts` | 即时澄清 |
| `apps/api/src/ai-pipeline/shared/knowledge-gap/post-generation-immediate-clarification.ts` | 生成后澄清 |
| `apps/api/src/ai-pipeline/shared/knowledge-gap/intent-sufficiency.ts` | 意图充分性检查 |
| `apps/api/src/ai-pipeline/shared/knowledge-gap/search-signals.ts` | 搜索信号 |
| `apps/api/src/ai-pipeline/shared/knowledge-gap/tool-clarification-context.ts` | 工具澄清上下文 |
| **Realtime Events** | |
| `apps/api/src/realtime/emitter.ts` | 事件发射器 |
| `apps/api/src/realtime/support-state.ts` | 状态管理 |
| `apps/api/src/ai-pipeline/shared/events/progress.ts` | 进度事件 |
| `apps/api/src/ai-pipeline/shared/events/typing.ts` | Typing事件 |
| `apps/api/src/ai-pipeline/shared/events/seen.ts` | Seen事件 |
| **Background Pipeline** | |
| `apps/api/src/ai-pipeline/background-pipeline/index.ts` | 后台管道入口 |
| `apps/api/src/ai-pipeline/background-pipeline/title-review.ts` | 标题审查 |
| `apps/api/src/ai-pipeline/background-pipeline/knowledge-gap-review.ts` | 知识缺口审查 |
| **Workers** | |
| `apps/workers/src/queues/ai-agent/worker.ts` | Primary Worker |
| `apps/workers/src/queues/ai-agent-background/worker.ts` | Background Worker |

---

## 技术栈总结

| 组件 | 技术 | 版本/说明 |
|------|------|---------|
| **运行时** | Bun | 1.3.1+ |
| **数据库** | PostgreSQL + pgvector | 15+ |
| **ORM** | Drizzle ORM | 最新 |
| **队列** | BullMQ + Redis | |
| **实时通信** | WebSocket (SSE) | |
| **调度** | Upstash QStash | |
| **AI SDK** | @ai-sdk (Vercel) | |
| **API框架** | Hono | |
| **tRPC** | tRPC v11 | |
| **前端** | Next.js 16 | App Router |

---

## 扩展与优化建议

### 1. 性能优化

| 优化方向 | 建议 |
|---------|------|
| **向量检索** | 考虑专用向量数据库（Pinecone/Weaviate/Qdrant） |
| **缓存** | Redis中缓存knowledge列表、hot conversations、prompt bundles |
| **批量** | 优化批量嵌入、批量查询 |
| **分块** | 可调的chunk size/overlap |

### 2. 功能增强

| 方向 | 建议 |
|------|------|
| **多模态** | image理解、voice支持 |
| **Agent协作** | multi-agent讨论（Routor/Specialist/Ensemble） |
| **RAG增强** | 重新排序、HyDE、RAG Fusion |
| **插件生态** | 开放第三方tool/action |

### 3. 可观测性

| 方向 | 建议 |
|------|------|
| **Tracing** | 完整的分布式trace（OpenTelemetry） |
| **Metrics** | Pipeline延迟、成功率、token使用dashboard |
| **Debug** | 更好的prompt检查、history检查UI |

---

## 附录

### 相关文档

- `docs/ARCHITECTURE.md` - 项目总体架构
- `docs/KNOWLEDGE_ARCHITECTURE.md` - 知识库架构
- `apps/api/src/ai-pipeline/ai-pipeline-workflow-spec.md` - 工作流规范

### 相关数据库查询

- `apps/api/src/db/queries/conversation.ts` - 对话查询
- `apps/api/src/db/queries/knowledge.ts` - 知识查询
- `apps/api/src/db/queries/vector-search.ts` - 向量搜索查询

---

*文档版本*: 1.0.0  
*最后更新*: 2026-07-22  
*基于代码版本*: 当前开发分支  
