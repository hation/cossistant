# AI 对话管道系统架构

## 1. 系统概览

AI 对话管道系统是 Cossistant 平台的核心智能引擎，负责处理访客消息、进行智能决策并生成自动化回复。系统采用 **三级流水线架构**，结合确定性规则与 LLM 智能决策，支持实时响应与后台分析双模式运行。

### 1.1 核心设计原则

| 原则 | 描述 | 实现方式 |
|------|------|----------|
| **可观测性** | 完整的 pipeline 执行追踪与日志 | 三级 metrics、工作流 ID、深度追踪模式 |
| **幂等性** | 防止重复消息与副作用 | 基于 idempotency key 的 ULID 生成 |
| **优雅降级** | 外部服务不可用时的保护机制 | AI credits guard、scope boundary 重定向 |
| **质量保证** | 生成回复的质量校验 | Answer-first repair 机制 |
| **成本控制** | 精确的 token 与 AI 积分计量 | 工具级别计费、thinking credits 分离 |

### 1.2 系统边界

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Conversation Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Intake     │───▶│   Decision   │───▶│  Generation  │    │
│  │    Stage     │    │    Stage     │    │    Runtime   │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                    │                    │            │
│         ▼                    ▼                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  Model Res.  │    │  Determin.   │    │  Tool Exec.  │    │
│  │  Context Ld. │    │  Smart (LLM)  │    │  Validation  │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
           │                          │
           ▼                          ▼
  ┌──────────────────┐      ┌──────────────────┐
  │  Real-time Msg   │      │  Background Jobs │
  │  (WebSocket)     │      │  (Title, Sent.)  │
  └──────────────────┘      └──────────────────┘
```

---

## 2. 流水线架构

### 2.1 双 Pipeline 模式

```typescript
// apps/api/src/ai-pipeline/index.ts
export type PipelineKind = "primary" | "background";
```

| Pipeline 类型 | 触发时机 | 执行模式 | 核心目标 |
|---------------|----------|----------|----------|
| **Primary** | 新消息到达时 | 实时、同步 | 生成访客可见的回复 |
| **Background** | 对话状态变更后 | 异步、延迟 | 元数据分析（标题、情感、分类） |

### 2.2 Primary Pipeline 三阶段

#### Stage 1: Intake（接入阶段）

**职责**：加载所有必要上下文，验证执行前置条件。

```typescript
// apps/api/src/ai-pipeline/primary-pipeline/steps/intake/index.ts
export async function runIntakeStep(params: {
  db: Database;
  input: PrimaryPipelineInput;
}): Promise<IntakeStepResult>;
```

**Intake 子步骤**：

1. **AI Agent 验证**
   - 检查 agent 是否存在且处于激活状态
   - 模型 ID 解析与迁移（model migration）

2. **对话上下文加载**
   - 触发消息元数据验证
   - 对话历史分段（before_trigger / trigger / after_trigger）
   - 访客上下文信息（语言、地区、设备）

3. **决策消息准备**
   - 提取用于决策阶段的精简消息集
   - 检测后续人类/AI消息（用于跳过决策）

4. **模型解析持久化**
   - 支持模型版本平滑迁移
   - 记录 modelIdOriginal → modelIdResolved 映射

**Intake 结果状态**：
- `ready`：所有上下文加载完成，进入下一阶段
- `skipped`：前置条件不满足（agent 未激活、消息不属于对话等）
- `retry`：可重试的失败场景

#### Stage 2: Decision（决策阶段）

**职责**：决定 AI 应如何响应，采用 **确定性优先 + LLM 兜底** 的双层决策策略。

```typescript
// apps/api/src/ai-pipeline/primary-pipeline/steps/decision/index.ts
export async function runDecisionStep(params: {
  db: Database;
  input: DecisionStepInput;
}): Promise<DecisionResult>;
```

**2A: 确定性决策层**

```typescript
// 规则示例（确定性，无需调用 LLM）
function runDeterministicDecision(input: DecisionStepInput) {
  // 1. 空消息跳过
  if (!triggerText.trim()) return skip("Empty trigger message");
  
  // 2. 仅命令前缀（如 "/标题"）
  if (isHumanCommandPrefix(triggerText)) return backgroundOnly();
  
  // 3. 范围边界检测（超出 AI 处理范围）
  if (matchesScopeBoundary(triggerText)) return scopeBoundaryRedirect();
  
  // 4. 已分配人类且无明确 AI 指令
  if (conversationState.hasHumanAssignee) return skip("Human assignee present");
}
```

**2B: 智能决策层（LLM）**

当确定性规则无法判定时，调用 LLM 进行深度分析：

```typescript
export type ResponseMode =
  | "respond_to_visitor"      // 面向访客回复
  | "respond_to_command"      // 响应人类命令
  | "background_only";        // 仅后台分析

export type DecisionResult = {
  shouldAct: boolean;
  mode: ResponseMode;
  reason: string;
  humanCommand: string | null;
  decisionOutcome?: "normal" | "scope_boundary_redirect";
  scopeBoundaryRuleId?: string;
};
```

**决策策略解析**：
- 从 `decision.md` skill 文件加载组织特定的决策规则
- 支持自定义 escalation 策略、工作时间规则等
- 策略解析失败时 fallback 到默认行为

#### Stage 3: Generation（生成阶段）

**职责**：执行 LLM 工具调用循环，生成最终动作与回复。

```typescript
// apps/api/src/ai-pipeline/shared/generation/index.ts
export async function runGenerationRuntime(
  input: GenerationRuntimeInput
): Promise<GenerationRuntimeResult>;
```

**生成运行时核心流程**：

```
1.  Prompt Bundle 解析
    ├── System Prompt（身份、技能、安全约束）
    ├── Tool Skills（工具使用说明）
    └── Custom Instructions（组织自定义配置）

2.  Toolset 构建与权限门控
    ├── 基于 pipeline kind 过滤可用工具
    ├── 基于 AI Agent behavior settings 启用/禁用工具
    └── 验证 finish tool 存在性（respond/escalate/resolve/skip）

3.  Message 格式化
    ├── 对话历史标准化
    ├── 工具执行记录注入
    └── 分段标记（before/trigger/after）

4.  Generation Attempt 执行
    ├── 主尝试（attempt=1）
    └── Answer-first 修复尝试（attempt=2，需要时）

5.  Post-generation 验证
    ├── 公共消息契约校验
    ├── 知识库搜索质量评估
    └── 知识缺口自动澄清
```

**Generation 执行状态**：

| 状态 | 描述 | 后续动作 |
|------|------|----------|
| `completed` | 成功执行并选择最终动作 | 更新 conversation 状态 |
| `blocked` | AI credits 不足或计费阻断 | 跳过、通知管理员 |
| `error` | 运行时错误（超时、API 失败等） | 可重试、记录日志 |
| `skipped` | 通过 skip tool 主动跳过 | 不执行任何变更 |

---

## 3. 工具系统

### 3.1 工具分类与可用性矩阵

```typescript
// apps/api/src/ai-pipeline/shared/tools/catalog.ts
export const SHARED_PIPELINE_TOOL_CATALOG = [
  // 上下文工具
  { id: "searchKnowledgeBase", availability: { primary: true, background: true } },
  { id: "identifyVisitor", availability: { primary: true, background: true } },
  
  // 知识澄清工具
  { id: "requestKnowledgeClarification", availability: { primary: true, background: false } },
  
  // 元数据分析工具（仅后台）
  { id: "updateConversationTitle", availability: { primary: false, background: true } },
  { id: "updateSentiment", availability: { primary: false, background: true } },
  { id: "setPriority", availability: { primary: false, background: true } },
  { id: "categorizeConversation", availability: { primary: false, background: true } },
  
  // 消息工具
  { id: "sendMessage", availability: { primary: true, background: false, publicOnly: true } },
  { id: "sendPrivateMessage", availability: { primary: true, background: true } },
  
  // 完成工具（Finish Tools）
  { id: "respond", availability: { primary: true, background: false, publicOnly: true } },
  { id: "escalate", availability: { primary: true, background: false, publicOnly: true } },
  { id: "resolve", availability: { primary: true, background: false, publicOnly: true } },
  { id: "markSpam", availability: { primary: true, background: false, publicOnly: true } },
  { id: "skip", availability: { primary: true, background: true } },
] as const;
```

### 3.2 工具执行状态机

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  pending │────▶│ running  │────▶│  result  │
└──────────┘     └──────────┘     └──────────┘
                      │
                      ▼
                 ┌──────────┐
                 │   error  │
                 └──────────┘
```

```typescript
// apps/api/src/ai-pipeline/shared/tools/contracts.ts
export type ToolExecutionSnapshot = {
  toolName: string;
  callId: string;
  state: "pending" | "running" | "result" | "error";
  input?: Record<string, unknown>;
  output?: { data: unknown; timingMs?: number };
  error?: { message: string; code?: string };
  startedAt: string;
  finishedAt?: string;
};
```

### 3.3 核心工具详解

#### sendMessage：公共消息发送

**关键特性**：
- **幂等性保证**：基于 idempotencyKey 生成确定性 ULID
- **自动翻译**：根据网站与访客语言自动翻译
- **Rogue 保护**：窗口化 AI 消息计数，超限自动暂停
- **计划检查**：验证 auto-translate 功能权限

```typescript
// apps/api/src/ai-pipeline/shared/actions/send-message.ts
export async function sendMessage(params: {
  db: Database;
  conversationId: string;
  organizationId: string;
  websiteId: string;
  visitorId: string;
  aiAgentId: string;
  text: string;
  idempotencyKey: string;  // 关键：去重键
}): Promise<{
  messageId: string;
  created: boolean;
  paused?: boolean;
}>;
```

#### searchKnowledgeBase：知识库搜索

**搜索质量等级**：
- `none`：未找到相关内容
- `weak`：找到部分相关但不足以回答
- `strong`：找到充分的可回答证据

**搜索信号使用**：
- `strong` → 强制使用知识库内容回答，禁止 skip
- `weak` → 建议结合上下文回答，可请求澄清
- `none` → 可 escalate 或要求更多信息

#### escalate：升级到人类坐席

**升级触发场景**：
1. 知识库搜索无果且无法安全回答
2. 访客明确要求人工
3. 情绪检测为负面且无法安抚
4. 超出 AI scope boundary 规则

---

## 4. Answer-first 修复机制

### 4.1 修复触发条件

```typescript
// apps/api/src/ai-pipeline/shared/generation/index.ts
type VisitorReplyValidationFailure = {
  code:
    | "missing_public_reply"        // 缺少公共回复
    | "actionable_search_skipped"   // 有搜索结果但跳过
    | "question_only_public_reply"; // 仅发送澄清问题
  reason: string;
  bestSearchExecution: ParsedSearchExecution | null;
};
```

### 4.2 修复流程

```
Primary Attempt 失败 (验证不通过)
          │
          ▼
    ┌─────────────┐
    │  收集证据   │
    │  - 搜索结果
    │  - 已发送回复
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │  修复 Prompt │
    │  - 明确规则
    │  - 复用已有证据
    │  - 禁用搜索工具
    └─────────────┘
          │
          ▼
    Repair Attempt (attempt=2)
          │
          ▼
    再次验证 → 成功/失败
```

### 4.3 修复工具白名单

```typescript
const ANSWER_FIRST_REPAIR_TOOL_ALLOWLIST = [
  "sendMessage",    // 仅允许发送消息
  "respond",        // 完成响应
  "escalate",       // 升级（最后手段）
];
```

**修复规则**：
1. 必须先发送有用的公共回复，才能结束
2. 如果之前搜索到证据，必须基于证据回答
3. 不允许只问澄清问题而不提供任何实际帮助
4. 修复尝试中禁止再次调用搜索工具
5. 最终只能 respond 或 escalate

---

## 5. 计费与配额系统

### 5.1 AI Credits Guard

**计费维度**：

```typescript
// apps/api/src/ai-pipeline/shared/generation/contracts.ts
export type GenerationRuntimeResult = {
  // ...
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;  // Thinking 模型专用
  };
  thinking?: {
    requested: boolean;
    enabled: boolean;
    supported: boolean;
    thinkingCredits: number;    // 单独计量
    reasoningMaxTokens: number | null;
  };
  chargeableToolCallsByName?: Record<string, number>;  // 工具级别计费
  // ...
};
```

**信用检查点**：
- Generation Runtime 入口（执行前预检查）
- 每个 Tool 调用前（增量计费）
- 超出配额时立即 block，返回 blocked 状态

### 5.2 多来源计费路由

```typescript
export type OpenRouterBillingSource =
  | "cossistant"           // Cossistant 统一付费
  | "customer_openrouter"  // 客户自带 OpenRouter API Key
  | "cossistant_platform"; // 平台级计费（企业版）
```

**BYOK 重试机制**：
- 客户 OpenRouter Key 失败时可 fallback 到 Cossistant
- 记录重试状态，支持幂等重试
- 失败时保留原始错误码与计费来源

---

## 6. 安全与防护

### 6.1 Rogue AI 防护

**目的**：防止 AI 失控连续发送大量消息。

```typescript
// apps/api/src/ai-pipeline/shared/safety/kill-switch.ts
export async function recordOutboundPublicAiMessageAndMaybePause({
  db,
  redis,
  conversationId,
  organizationId,
  messageId,
}): Promise<{ paused: boolean; messageCount: number }>;
```

**工作原理**：
1. Redis 滑动窗口计数器（默认 5 分钟窗口）
2. 每发送一条公共消息计数 +1
3. 超过阈值（如 10 条/5 分钟）自动设置 pause 标志
4. pause 状态下所有 sendMessage 调用直接跳过
5. 需要人工干预解除 pause 状态

### 6.2 Scope Boundary 边界防护

**目的**：当访客话题超出 AI 处理范围时，优雅重定向。

```typescript
// apps/api/src/ai-pipeline/primary-pipeline/steps/decision/scope-boundary.ts
export type ScopeBoundaryRule = {
  id: string;
  pattern: string | RegExp;
  redirectMessage: string;
  escalate?: boolean;
};
```

**触发流程**：
1. Decision 阶段检测到 scope boundary 匹配
2. 设置 decisionOutcome = "scope_boundary_redirect"
3. Generation 阶段跳过，直接执行 scope boundary handler
4. 发送预设的重定向消息（如 "这个问题需要销售团队处理..."）
5. 可选择自动 escalate

---

## 7. 可观测性

### 7.1 Pipeline Metrics

```typescript
// apps/api/src/ai-pipeline/primary-pipeline/utils/stage-metrics.ts
export type PrimaryPipelineMetrics = {
  intakeMs: number;      // 接入阶段耗时
  decisionMs: number;    // 决策阶段耗时
  generationMs: number;  // 生成阶段耗时
  totalMs: number;       // 总耗时
};
```

### 7.2 日志结构

```
[ai-pipeline:{area}] conv={id} workflowRunId={id} evt={event}
  ├─ area: primary / intake / decision / generation
  ├─ evt: start / ready / skip / completed / error / blocked
  └─ fields: 结构化上下文（模型、耗时、原因、工具计数等）
```

### 7.3 深度追踪模式

**启用条件**：`AI_AGENT_DEEP_TRACE_ENABLED = true`

**追踪内容**：
- 完整的 system prompt 快照（写入文件）
- 每个工具调用的输入/输出 payload
- LLM 请求/响应原始数据
- 决策规则匹配详情
- 尝试历史与修复记录

---

## 8. Background Pipeline 后台管道

### 8.1 后台任务类型

| 任务 | 触发器 | 工具 | 目的 |
|------|--------|------|------|
| **标题生成** | 新对话 3 条消息后 | `updateConversationTitle` | 便于坐席快速识别 |
| **情感分析** | 每条新消息后 | `updateSentiment` | 负面情绪优先分配 |
| **优先级设置** | 情感/内容分析后 | `setPriority` | high/normal/low 三级 |
| **对话分类** | 消息内容分析 | `categorizeConversation` | 路由到对应团队 |
| **知识缺口审查** | 搜索弱/无结果时 | 内部分析 | 改进知识库内容 |

### 8.2 执行特性

- **延迟执行**：访客不在线时才运行，避免资源竞争
- **无公共消息**：所有操作仅 dashboard 可见
- **可重试**：失败时 BullMQ 自动重试
- **幂等**：相同内容重复执行无副作用

---

## 9. 关键数据流

### 9.1 Primary Pipeline 完整执行链

```
Incoming Message
      │
      ▼
  BullMQ Job
      │
      ▼
  runPrimaryPipeline()
      ├─► 1. runIntakeStep()
      │     ├─ 验证 AI Agent 激活
      │     ├─ 解析模型 ID
      │     ├─ 加载对话与触发消息
      │     └─ 构建 generationEntries
      │
      ├─► 2. runDecisionStep()
      │     ├─ 确定性规则检查
      │     │   ├─ scope boundary?
      │     │   ├─ human command?
      │     │   ├─ human assigned?
      │     │   └─ ...
      │     └─ 智能决策（LLM）
      │          ├─ 加载 decision policy
      │          └─ 判定 response mode
      │
      ├─► 3. Scope Boundary Redirect (如需)
      │     └─ sendMessage + 结束
      │
      └─► 4. runGenerationRuntime()
            ├─ 解析 prompt bundle
            ├─ 构建 toolset
            ├─ Primary Attempt
            │    ├─ LLM 调用循环
            │    ├─ 工具执行
            │    └─ 选择最终动作
            ├─ 验证 visitor reply 契约
            │    └─ Answer-first Repair（失败时）
            ├─ AI Credits 计量
            ├─ 知识缺口澄清检查
            └─ 实时事件发射
```

---

## 10. 设计权衡与决策记录

### 10.1 确定性优先 vs 全 LLM 决策

**决策**：采用确定性优先 + LLM 兜底的双层策略。

| 维度 | 全 LLM | 确定性优先 |
|------|--------|------------|
| 延迟 | 高（每次都要调用） | 低（快速路径直接跳过） |
| 成本 | 高 | 低（80% 情况免调用） |
| 可预测性 | 低 | 高（关键路径确定） |
| 灵活性 | 高 | 中（规则需手动维护） |

**结果**：约 80% 的跳过决策由确定性规则完成，仅 20% 需要 LLM。

### 10.2 Answer-first 修复机制

**问题**：AI 常常在找到搜索证据后仍然只发澄清问题，不实际回答。

**方案**：引入二次修复尝试，强制 AI 必须先给出有用回答。

| 权衡 | 描述 |
|------|------|
| ✅ 质量提升 | 访客获得实际帮助的比例显著提升 |
| ⚠️ 额外成本 | 修复尝试需要额外的 LLM 调用（~+15% 成本） |
| ⚠️ 延迟增加 | 最坏情况需要两次 LLM 往返 |

### 10.3 工具预算控制

**决策**：设置 `maxToolInvocationsPerRun` 限制（默认 5 次非 finish 工具）。

**理由**：
- 防止无限工具调用循环
- 控制单次运行的成本上限
- 迫使 AI 在有限步骤内做出决策

---

## 11. 扩展点

### 11.1 自定义决策策略

通过组织级 `decision.md` skill 文件实现：

```markdown
# Decision Policy

## 工作时间规则
- 周一至周五 9:00-18:00：AI 自动响应
- 其他时间：AI 收集信息后立即 escalate

## 升级阈值
- 访客连续 2 次表示不满 → escalate
- 搜索结果 retrievalQuality = none → escalate
```

### 11.2 自定义工具

**扩展路径**：
1. 在 `shared/tools/` 创建新工具 factory
2. 在 catalog 注册，配置可用性
3. 添加对应的 default skill 说明
4. 添加 telemetry spec（事件名、属性映射）

### 11.3 Prompt 定制层

Prompt Bundle 解析支持三层覆盖：
1. **Base**：系统内置（安全、身份、工具说明）
2. **Skill 层**：组织级自定义 skill
3. **Runtime 层**：特定对话的上下文注入

---

## 相关文档

- [01. 系统架构总览](./01-SYSTEM-OVERVIEW.md) - 整体架构与应用关系
- [03. 实时消息系统](./03-REAL-TIME-MESSAGING.md) - 事件发射与 WebSocket 集成
- [05. 知识库 RAG 系统](./05-KNOWLEDGE-BASE.md) - 搜索实现与向量检索
- [07. 计费与订阅系统](./07-BILLING.md) - AI Credits 计量与计费
- [09. 数据模型](./09-DATA-MODEL.md) - conversation / timeline_item Schema
