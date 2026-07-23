# 计费系统架构详解

## 概述

Cossistant 的计费系统是一个基于 **Polar.sh 计费平台 + 三级计划体系 + AI 信用额度计量** 的完整计费架构，支持免费版、Hobby版、Pro版三个层级，包含33项功能控制、滚动窗口硬限制、以及精密的AI信用额度计费模型。

**核心特性**：
- 三级计划体系：Free → Hobby → Pro，33项功能细粒度控制
- Polar.sh 深度集成：订阅管理、计量表、折扣引擎
- 30天滚动窗口硬限制：对话数、消息数双重限制
- AI信用额度计费：4维度计费（基础+模型+思考+工具）
- 多级缓存策略：内存缓存 + Redis二级缓存
- 故障降级机制：停电模式(Outage Mode) + 熔断保护
- 自托管兼容模式：全功能免费无限制
- 分布式锁机制：防止并发竞态条件
- 早鸟折扣支持：促销价格与原价并行

---

## 目录

1. [系统架构总览](#1-系统架构总览)
2. [核心文件映射](#2-核心文件映射)
3. [计划配置与功能矩阵](#3-计划配置与功能矩阵)
4. [计费状态与订阅管理](#4-计费状态与订阅管理)
5. [硬限制策略与滚动窗口](#5-硬限制策略与滚动窗口)
6. [AI信用额度计量](#6-ai-信用额度计量)
7. [Polar平台集成](#7-polar平台集成)
8. [多租户与权限控制](#8-多租户与权限控制)
9. [缓存策略与性能优化](#9-缓存策略与性能优化)
10. [故障降级与停电模式](#10-故障降级与停电模式)
11. [API端点完整参考](#11-api端点完整参考)
12. [监控指标与告警](#12-监控指标与告警)

---

## 1. 系统架构总览

### 1.1 分层架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   前端表示层 (Web/Dashboard)                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  /[websiteSlug]/settings/plan                     ┌─────────────────────────────────────┐ │  │
│  │    ├─ 套餐计划展示与选择                            │  AiCreditUsageDisplay              │ │  │
│  │    ├─ 使用情况统计(对话/消息/联系人/团队成员)        │    └─ AI信用额度可视化仪表盘       │ │  │
│  │    ├─ 结账流程引导                                └─────────────────────────────────────┘ │  │
│  │    └─ 硬限制警告与锁定提示                                                            │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                     │
                                                     │ tRPC
                                                     │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    API路由层 (tRPC /plan Router)                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  getPlanInfo                   ── 获取网站计划信息、使用情况、硬限制状态                       │  │
│  │  getPlansForOrganization       ── 组织内多网站计划批量查询                                    │  │
│  │  createCheckout                ── 创建Polar结账会话或升级订阅                               │  │
│  │  getPublicDiscountInfo         ── 查询公开折扣信息                                          │  │
│  │  getDiscountInfo               ── (认证后)查询折扣详情                                       │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                     │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    核心业务逻辑层 (lib/)                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  plans/access.ts               ── 计划访问控制、缓存、降级策略                                │  │
│  │  plans/config.ts               ── 33项功能配置、三级计划定义、Polar产品ID映射                 │  │
│  │  plans/polar.ts                ── Polar API封装、客户管理、订阅操作、分布式锁               │  │
│  │  plans/discount.ts             ── 折扣计算、早鸟优惠逻辑                                      │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  ai-credits/config.ts          ── 4维度定价公式、9款AI模型目录、3种模型 surcharge          │  │
│  │  ai-credits/guard.ts           ── 信用额度守门人、停电模式判断、余额检查                   │  │
│  │  ai-credits/plan-view.ts       ── 计划视图转换、AI模型可用性过滤                           │  │
│  │  ai-credits/polar-meter.ts     ── Polar计量表网关、缓存、熔断、乐观消费                    │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  billing-mode.ts               ── 计费开关、Polar启用检测                                    │  │
│  │  polar.ts                      ── Polar SDK客户端初始化                                     │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                     │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    数据持久层                                                       │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  ┌────────────────────────────┐  │
│  │  PostgreSQL (主数据库)   │  │  Redis (缓存/锁/限流)            │  │  Polar.sh (外部计费平台)   │  │
│  │  - websites表           │  │  ├─ plan:website-subscription:lock│  │  ├─ Customers             │  │
│  │  - organizations表      │  │  ├─ ai-credit:meter:             │  │  ├─ Subscriptions         │  │
│  │  - conversations统计    │  │  ├─ ai-credit:meter-lock:        │  │  ├─ Products              │  │
│  │  - messages统计          │  │  └─ ai-credit:ingest-backoff:    │  │  ├─ Meters                │  │
│  │  - contacts统计          │  │                                  │  │  ├─ Checkouts             │  │
│  │  - team_members统计      │  │                                  │  │  └─ Discounts             │  │
│  └─────────────────────────┘  └──────────────────────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 关键设计原则

1. **按网站计费**：每个Website独立订阅，不共享组织级配额
2. **三级分层**：Free (限制) → Hobby (中间) → Pro (全功能)
3. **硬限制执行**：滚动30天窗口，超量即锁定对话
4. **故障友好**：Polar不可用时自动降级，不中断核心服务
5. **缓存优先**：内存+Redis二级缓存，减少Polar API调用
6. **计量精确**：AI信用4维度计费，支持17+工具调用细分
7. **自托管兼容**：自部署模式无任何计费限制
8. **分布式锁**：Redis锁保护订阅创建、计量读取等临界区

---

## 2. 核心文件映射

### 2.1 文件目录树

```
apps/api/src/lib/
├── plans/
│   ├── access.ts               # 计划访问控制、缓存、降级策略 (500+行)
│   ├── config.ts               # 33项功能配置、三级计划定义 (440+行)
│   ├── polar.ts                # Polar API封装、订阅管理、分布式锁 (650+行)
│   └── discount.ts             # 折扣计算、早鸟优惠逻辑
├── ai-credits/
│   ├── config.ts               # AI定价公式、模型目录、33项功能配置 (490+行)
│   ├── guard.ts                # 信用额度守门人、停电模式判断 (150+行)
│   ├── plan-view.ts            # 计划视图转换、AI模型过滤 (100+行)
│   └── polar-meter.ts          # Polar计量表网关、缓存、熔断 (700+行)
├── billing-mode.ts             # 计费模式开关 (30行)
└── polar.ts                    # Polar SDK客户端初始化

apps/api/src/trpc/routers/
└── plan.ts                     # /plan tRPC路由器、5个端点 (440+行)

apps/api/src/db/queries/
└── usage.ts                    # 使用量统计、滚动窗口硬限制计算

apps/web/src/lib/
├── plan-pricing.ts             # 前端定价展示逻辑
└── plan-billing.ts             # 前端计费交互逻辑
```

### 2.2 核心文件功能清单

| 文件名 | 主要功能 | 关键类/函数 |
|--------|---------|-----------|
| **`plans/config.ts`** | 33项功能定义，三级计划配置，Polar产品ID映射，AI模型surcharge | `FEATURE_CONFIG`, `PLAN_CONFIG`, `getPlanConfig()`, `mapPolarProductToPlan()` |
| **`plans/access.ts`** | 计划信息获取，两级缓存，故障降级，自托管模式处理 | `getPlanForWebsite()`, `canUse()`, `getSelfHostedPlanInfo()` |
| **`plans/polar.ts`** | Polar客户管理，订阅CRUD，重复订阅归一化，Redis分布式锁 | `getCustomerByOrganizationId()`, `getSubscriptionForWebsite()`, `ensureFreeSubscriptionForWebsite()`, `updateWebsiteSubscriptionProduct()` |
| **`ai-credits/config.ts`** | 4维度AI定价公式，9款模型目录，思考功能额外收费，工具调用计费 | `AI_CREDIT_PRICING_CONFIG`, `AI_AGENT_MODEL_CATALOG`, `calculateAiCreditCharge()`, `getMinimumAiCreditCharge()` |
| **`ai-credits/polar-meter.ts`** | Polar计量表网关，5种数据源状态，乐观消费，熔断回退 | `getAiCreditMeterState()`, `ingestAiCreditUsage()`, `grantAiCreditUsage()` |
| **`ai-credits/guard.ts`** | AI执行守门人，余额检查，停电模式授权，模型白名单 | `guardAiCreditRun()` |
| **`trpc/routers/plan.ts`** | tRPC计划端点，计划信息查询，结账创建，折扣查询 | `getPlanInfo()`, `createCheckout()`, `getPlansForOrganization()` |

---

## 3. 计划配置与功能矩阵

### 3.1 三级计划体系

```typescript
// 计划层级
type PlanName = "free" | "hobby" | "pro";

// 优先级排名 (用于多订阅冲突时选最高)
const PLAN_RANK: Record<PlanName, number> = {
  free: 0,
  hobby: 1,
  pro: 2,
};
```

### 3.2 33项功能完整清单

| 功能分类 | Feature Key | Free | Hobby | Pro | 说明 |
|---------|------------|------|-------|-----|------|
| **核心限制** | | | | | |
| | conversations | 20 | null | null | 30天滚动对话数限制，null=无限 |
| | messages | 200 | null | null | 30天滚动消息数限制 |
| | contacts | 25 | 2000 | 6000 | 最大联系人存储数 |
| | conversation-retention | 30 | null | null | 对话保留天数，null=永久 |
| | team-members | 1 | 2 | 4 | 团队成员席位 |
| **通知** | | | | | |
| | email-notifications | ✓ | ✓ | ✓ | 邮件通知 |
| | email-reply | ✓ | ✓ | ✓ | 邮件直接回复 |
| **分享与协作** | | | | | |
| | dashboard-file-sharing | ✗ | ✓ | ✓ | 仪表板文件分享 |
| **翻译** | | | | | |
| | auto-translate | ✗ | ✗ | ✓ | 自动翻译 (消耗AI信用) |
| **AI模型** | | | | | |
| | latest-ai-models | ✗ | ✓ | ✓ | 最新AI模型访问权 |
| | ai-support-agents | 1 | 1 | 1 | AI客服代理数量 |
| **AI训练** | | | | | |
| | ai-agent-training-links | 5 | null | null | 训练URL数量 |
| | ai-agent-training-mb | 0.25 | 10 | 40 | 训练内容大小限制(MB) |
| | ai-agent-crawl-pages-per-source | 5 | 1000 | 1000 | 每源爬取页数 |
| | ai-agent-training-pages-total | 5 | null | null | 总爬取页数 |
| | ai-agent-training-faqs | 5 | null | null | FAQ条目数 |
| | ai-agent-training-files | 2 | null | null | 文件上传数 |
| | ai-agent-training-interval | 180min | 10min | 0min | 训练间隔(0=随时) |
| **AI信用** | | | | | |
| | ai-credit | 50 | 1000 | 3000 | 每月AI信用额度 |
| **集成** | | | | | |
| | pro-integrations | ✗ | ✗ | ✓ | 高级企业集成 |
| | rest-api | ✓ | ✓ | ✓ | REST API访问 |
| | webhooks | ✓ | ✓ | ✓ | Webhook支持 |
| **托管** | | | | | |
| | self-host | ✓ | ✓ | ✓ | 自托管支持 |
| **客服** | | | | | |
| | slack-support | ✗ | ✓ | ✓ | Slack创始人支持 |
| | slack-custom-channel | ✗ | ✗ | ✓ | 专属Slack频道 |
| **其他** | | | | | |
| | custom-events | ✓ | ✓ | ✓ | 自定义事件追踪 |
| | ai-workflows | ✓ | ✓ | ✓ | AI工作流 |
| | openrouter-byok | ✗ | ✗ | ✓ | 自带OpenRouter密钥 |
| | custom-ai-skills | ✓ | ✓ | ✓ | 自定义AI技能 |
| | custom-ai-agent-avatar | ✗ | ✗ | ✓ | 自定义AI代理头像 |

### 3.3 Polar产品ID映射

```typescript
// 环境变量配置
// POLAR_PRODUCT_ID_FREE_SANDBOX / _PRODUCTION
// POLAR_PRODUCT_ID_HOBBY_SANDBOX / _PRODUCTION
// POLAR_PRODUCT_ID_PRO_SANDBOX / _PRODUCTION

const POLAR_PRODUCT_IDS: Record<PlanName, { sandbox: string; production?: string }> = {
  free: { sandbox: "4543a3c8-bbf6-47e2-84f6-0d78b334b15a", production: "4bdd01d7-6092-48ab-8589-0666ffab18fc" },
  hobby: { sandbox: "b060ff1e-c2dd-4c02-a3e4-395d7cce84a0", production: "758ff687-1254-422f-9b4a-b23d39c6b47e" },
  pro: { sandbox: "c87aa036-2f0b-40da-9338-1a1fcc191543", production: "f34bf87c-96ab-4e54-9167-c4de8527669a" },
};
```

---

## 4. 计费状态与订阅管理

### 4.1 BillingStatus数据结构

```typescript
type BillingProvider = "polar" | "disabled";

type BillingStatus = {
  enabled: boolean;                    // 计费是否启用
  provider: BillingProvider;           // 计费提供方
  canManageSubscription: boolean;      // 是否可管理订阅
};
```

### 4.2 PlanInfo完整结构

```typescript
type ResolvedPlanName = PlanName | "self_hosted";

type HardLimitsUnavailableReason =
  | "billing_provider_unavailable"    // Polar不可用
  | "billing_disabled";               // 计费禁用(自托管)

type PlanInfo = {
  planName: ResolvedPlanName;         // 解析后的计划名
  displayName: string;                // 展示名称
  price?: number;                     // 月费(USD)
  features: Record<FeatureKey, FeatureValue>;  // 33项功能配置
  hardLimitsEnforced: boolean;        // 是否强制执行硬限制
  hardLimitsUnavailableReason: HardLimitsUnavailableReason | null;
  billing: BillingStatus;             // 计费状态
};
```

### 4.3 自托管特殊处理

```typescript
function resolveSelfHostedFeatures(): Record<FeatureKey, FeatureValue> {
  const referencePlan = getPlanConfig("pro");
  
  return Object.fromEntries(
    Object.entries(referencePlan.features).map(([featureKey, value]) => {
      if (featureKey === "ai-agent-training-interval") {
        return [featureKey, 0];  // 即时训练
      }
      if (typeof value === "boolean") {
        return [featureKey, true];  // 所有boolean功能全开
      }
      return [featureKey, null];  // 所有数值功能无限
    })
  ) as Record<FeatureKey, FeatureValue>;
}

function getSelfHostedPlanInfo(): PlanInfo {
  return {
    planName: "self_hosted",
    displayName: "Self-Hosted",
    price: undefined,
    features: resolveSelfHostedFeatures(),
    hardLimitsEnforced: false,         // 自托管无硬限制
    hardLimitsUnavailableReason: "billing_disabled",
    billing: {
      enabled: false,
      provider: "disabled",
      canManageSubscription: false,
    },
  };
}
```

---

## 5. 硬限制策略与滚动窗口

### 5.1 Dashboard硬限制策略结构

```typescript
type DashboardHardLimitPolicy = {
  enforced: boolean;                     // 是否强制执行
  unavailableReason: string | null;     // 不可用原因
  windowStart: string;                   // 滚动窗口起始时间 (ISO)
  messageLimit: number | null;           // 消息数量限制
  conversationLimit: number | null;      // 对话数量限制
};

// 窗口大小固定为30天
const HARD_LIMIT_ROLLING_WINDOW_DAYS = 30;

function getHardLimitRollingWindowStart(now: Date = new Date()): string {
  const start = new Date(now);
  start.setDate(start.getDate() - HARD_LIMIT_ROLLING_WINDOW_DAYS);
  return start.toISOString();
}
```

### 5.2 策略解析流程

```typescript
function resolveDashboardHardLimitPolicy(
  planInfo: PlanInfo,
  now: Date = new Date()
): DashboardHardLimitPolicy {
  return {
    enforced: planInfo.hardLimitsEnforced,
    unavailableReason: planInfo.hardLimitsUnavailableReason,
    windowStart: getHardLimitRollingWindowStart(now),
    messageLimit: toNumericHardLimit(planInfo.features.messages),
    conversationLimit: toNumericHardLimit(planInfo.features.conversations),
  };
}
```

### 5.3 对话锁定机制

```typescript
// 按创建时间排序，取第N个对话作为截止点
async function getRollingWindowConversationHardLimitCutoff(
  db: DatabaseClient,
  params: {
    websiteId: string;
    organizationId: string;
    limit: number;
    windowStart: string;
  }
): Promise<{ cutoff: ConversationHardLimitCutoff | null }> {
  // 查询窗口内的对话，按创建时间升序
  // 取第limit个作为截止点，后续对话全部锁定
}

type ConversationHardLimitCutoff = {
  id: string;
  createdAt: string;
};

// 对话锁定判断
function isDashboardConversationLocked(params: {
  conversation: { id: string; createdAt: string };
  policy: DashboardHardLimitPolicy;
  cutoff: ConversationHardLimitCutoff | null;
}): boolean {
  if (!params.policy.enforced) return false;
  return isConversationAfterHardLimitCutoff(params.conversation, params.cutoff);
}
```

---

## 6. AI信用额度计量

### 6.1 四维定价公式

```typescript
const AI_CREDIT_PRICING_CONFIG = {
  baseRunCredits: 1,                    // 基础运行费 = 1信用
  includedBillableTools: 2,              // 前2个工具调用免费
  perExtraToolCredits: 0.5,              // 超出后每个工具 = 0.5信用
  excludedToolNames: [                   // 不收费的工具列表
    "sendAcknowledgeMessage",
    "sendMessage",
    "sendFollowUpMessage",
    "sendPrivateMessage",
    "aiDecision",
    "respond",
    "escalate",
    "resolve",
    "markSpam",
    "skip",
    "loadSkill",
  ],
} as const;
```

### 6.2 AI模型目录与Surcharge

```typescript
type AiAgentModelCatalogItem = {
  id: string;
  label: string;
  provider: string;
  icon: string;
  requiresLatestModels: boolean;         // 需要latest-ai-models功能
  modelSurchargeCredits: number;         // 模型额外收费
  outageAllowed: boolean;                // 停电模式下是否可用
  thinkingSupported: boolean;             // 是否支持思考功能
  thinkingSurchargeCredits: number;      // 思考额外收费
  thinkingReasoningMaxTokens: number | null;
  isDefault?: boolean;
};

const AI_AGENT_MODEL_CATALOG: readonly AiAgentModelCatalogItem[] = [
  // 免费基础模型 (无surcharge)
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "DeepSeek", 
    requiresLatestModels: false, modelSurchargeCredits: 0, 
    outageAllowed: true, thinkingSupported: false, thinkingSurchargeCredits: 0,
    isDefault: true },
  { id: "moonshotai/kimi-k2-0905", label: "Kimi K2", provider: "Moonshot AI",
    requiresLatestModels: false, modelSurchargeCredits: 0,
    outageAllowed: true, thinkingSupported: false, thinkingSurchargeCredits: 0 },
  
  // 中间模型 (轻微surcharge)
  { id: "moonshotai/kimi-k2.5", label: "Kimi K2.5", provider: "Moonshot AI",
    requiresLatestModels: false, modelSurchargeCredits: 0,
    outageAllowed: true, thinkingSupported: true, thinkingSurchargeCredits: 0.5,
    thinkingReasoningMaxTokens: 512 },
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6", provider: "Moonshot AI",
    requiresLatestModels: false, modelSurchargeCredits: 0.5,
    outageAllowed: true, thinkingSupported: true, thinkingSurchargeCredits: 0.5,
    thinkingReasoningMaxTokens: 512 },
  
  // 高级模型 (Hobby/Pro专属，高surcharge)
  { id: "openai/gpt-5.5", label: "GPT-5.5", provider: "OpenAI",
    requiresLatestModels: true, modelSurchargeCredits: 3.5,
    outageAllowed: false, thinkingSupported: true, thinkingSurchargeCredits: 3,
    thinkingReasoningMaxTokens: 512 },
  { id: "openai/gpt-5.2-chat", label: "GPT-5.2", provider: "OpenAI",
    requiresLatestModels: true, modelSurchargeCredits: 1,
    outageAllowed: false, thinkingSupported: false, thinkingSurchargeCredits: 0 },
  { id: "openai/gpt-5.1-chat", label: "GPT-5.1", provider: "OpenAI",
    requiresLatestModels: true, modelSurchargeCredits: 1,
    outageAllowed: false, thinkingSupported: false, thinkingSurchargeCredits: 0 },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI",
    requiresLatestModels: true, modelSurchargeCredits: 1,
    outageAllowed: false, thinkingSupported: true, thinkingSurchargeCredits: 0.5,
    thinkingReasoningMaxTokens: 512 },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "Google",
    requiresLatestModels: true, modelSurchargeCredits: 1,
    outageAllowed: false, thinkingSupported: true, thinkingSurchargeCredits: 0.5,
    thinkingReasoningMaxTokens: 512 },
] as const;
```

### 6.3 信用费用计算详解

```typescript
type AiCreditChargeBreakdown = {
  baseCredits: number;          // 基础运行费
  modelCredits: number;         // 模型surcharge
  thinkingCredits: number;       // 思考功能surcharge
  toolCredits: number;           // 工具调用费
  totalCredits: number;          // 总计
  billableToolCount: number;     // 收费工具数
  excludedToolCount: number;     // 免费工具数
  totalToolCount: number;        // 总工具数
};

function calculateAiCreditCharge(params: {
  modelId: string;
  toolCallsByName?: Record<string, number> | null;
  aiThinkingEnabled?: boolean | null;
}): AiCreditChargeBreakdown {
  // Step 1: 基础 + 模型 + 思考 费用
  const minimumCharge = getMinimumAiCreditCharge(params.modelId, {
    aiThinkingEnabled: params.aiThinkingEnabled,
  });
  
  // Step 2: 工具调用统计与过滤
  const { billableToolCount, excludedToolCount, totalToolCount } =
    getToolCallStats(params.toolCallsByName);
  
  // Step 3: 超出免费额度的工具计费
  const toolCredits = getToolCredits(billableToolCount);
  
  return {
    baseCredits: minimumCharge.baseCredits,
    modelCredits: minimumCharge.modelCredits,
    thinkingCredits: minimumCharge.thinkingCredits,
    toolCredits,
    totalCredits: roundCredits(minimumCharge.totalCredits + toolCredits),
    billableToolCount,
    excludedToolCount,
    totalToolCount,
  };
}

// 工具计费：max(0, (billable - 2) * 0.5)
function getToolCredits(billableToolCount: number): number {
  const extraBillableTools = Math.max(
    0,
    billableToolCount - AI_CREDIT_PRICING_CONFIG.includedBillableTools
  );
  return roundCredits(extraBillableTools * AI_CREDIT_PRICING_CONFIG.perExtraToolCredits);
}
```

---

## 7. Polar平台集成

### 7.1 客户与订阅状态管理

```typescript
type WebsiteSubscriptionStatus = "active" | "trialing" | string;

type CustomerState = {
  customerId: string;
  activeSubscriptions: Array<{
    id: string;
    productId: string;
    productName?: string;
    status: WebsiteSubscriptionStatus;
    metadata?: Record<string, unknown>;
    createdAt?: string | null;
    currentPeriodStart?: string | null;
  }>;
  grantedBenefits: Array<{
    id: string;
    benefitId: string;
    benefitType: string;
  }>;
};
```

### 7.2 网站-订阅映射机制

```typescript
// Website ID存储在Subscription metadata中
// key: websiteId, value: string

function getWebsiteIdFromSubscription(
  subscription: WebsiteSubscription
): string | null {
  if (!(subscription.metadata && typeof subscription.metadata === "object")) {
    return null;
  }
  const value = subscription.metadata.websiteId;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

// 按网站过滤所有订阅
function getSubscriptionsForWebsite(
  customerState: CustomerState | null,
  websiteId: string
): WebsiteSubscription[] {
  if (!customerState) return [];
  
  return rankSubscriptionsForWebsite(
    customerState.activeSubscriptions.filter(
      (sub) => getWebsiteIdFromSubscription(sub) === websiteId
    )
  );
}
```

### 7.3 订阅排名与冲突解决

当一个网站有多个活跃订阅时，按以下优先级排序取最高：

```typescript
function rankSubscriptionsForWebsite(
  subscriptions: WebsiteSubscription[]
): WebsiteSubscription[] {
  return [...subscriptions].sort((a, b) => {
    // 1. 首先按计划等级 (pro > hobby > free)
    const rankDiff =
      getPlanRankFromSubscription(b) - getPlanRankFromSubscription(a);
    if (rankDiff !== 0) return rankDiff;
    
    // 2. 同等级优先 active > trialing
    const activeDiff =
      Number(b.status === "active") - Number(a.status === "active");
    if (activeDiff !== 0) return activeDiff;
    
    // 3. 同状态优先周期较新的订阅
    const periodDiff =
      toDateNumber(b.currentPeriodStart) - toDateNumber(a.currentPeriodStart);
    if (periodDiff !== 0) return periodDiff;
    
    // 4. 最后按创建时间
    return toDateNumber(b.createdAt) - toDateNumber(a.createdAt);
  });
}
```

### 7.4 免费订阅保障机制

```typescript
// 带Redis分布式锁的免费订阅创建
const WEBSITE_SUBSCRIPTION_LOCK_PREFIX = "plan:website-subscription:lock";
const WEBSITE_SUBSCRIPTION_LOCK_TTL_MS = 10_000; // 10秒锁

async function ensureFreeSubscriptionForWebsite(params: {
  organizationId: string;
  websiteId: string;
}): Promise<EnsureFreeSubscriptionResult> {
  // Step 1: 获取Redis分布式锁
  const lockKey = buildWebsiteSubscriptionLockKey(params.websiteId);
  const lockToken = `${params.websiteId}:${Date.now()}:${random()}`;
  const acquiredLock = await redis.set(lockKey, lockToken, "PX", TTL, "NX");
  
  if (!acquiredLock) {
    return { status: "skipped_lock_contention", ... };
  }
  
  try {
    // Step 2: 归一化现有订阅(撤销重复)
    const normalized = await normalizeWebsiteSubscriptions({
      organizationId: params.organizationId,
      websiteId: params.websiteId,
    });
    
    if (normalized.subscription) {
      return { status: "already_exists", ... };
    }
    
    // Step 3: 创建新的Free计划订阅
    const created = await polarClient.subscriptions.create({
      customerId: customer.id,
      productId: freePlan.polarProductId,
      metadata: { websiteId: params.websiteId },
    });
    
    return { status: "created", subscriptionId: created.id, ... };
  } finally {
    // Step 4: 释放锁(校验token防止误删他人锁)
    await releaseWebsiteLock({ redis, lockKey, lockToken });
  }
}
```

### 7.5 重复订阅归一化

```typescript
async function normalizeWebsiteSubscriptions(params: {
  organizationId: string;
  websiteId: string;
}): Promise<{
  subscription: WebsiteSubscription | null;
  revokedSubscriptionIds: string[];
}> {
  const subscriptions = getSubscriptionsForWebsite(customerState, params.websiteId);
  const preferred = subscriptions[0] ?? null;
  
  if (subscriptions.length <= 1 || !preferred) {
    return { subscription: preferred, revokedSubscriptionIds: [] };
  }
  
  // 撤销排名靠后的重复订阅
  const revokedSubscriptionIds: string[] = [];
  for (const subscription of subscriptions) {
    if (subscription.id === preferred.id) continue;
    
    try {
      await polarClient.subscriptions.revoke({ id: subscription.id });
      revokedSubscriptionIds.push(subscription.id);
    } catch (error) {
      console.error(`Failed to revoke duplicate subscription ${subscription.id}`, error);
    }
  }
  
  return { subscription: preferred, revokedSubscriptionIds };
}
```

---

## 8. 多租户与权限控制

### 8.1 按网站独立计费模型

**核心设计原则**：不使用组织级订阅，每个网站必须有自己的订阅。

```typescript
// getPlanForWebsite 中无fallback逻辑
let planName: PlanName | null = null;

if (websiteSubscription) {
  // 仅使用网站特定的订阅
  const subscriptionCustomerState = {
    customerId: customerState?.customerId ?? "",
    activeSubscriptions: [websiteSubscription],  // 仅该网站的订阅
    grantedBenefits: customerState?.grantedBenefits ?? [],
  };
  planName = await getPlanFromCustomerState(subscriptionCustomerState);
}
// No fallback to organization-level subscriptions!

const finalPlanName: PlanName = planName ?? "free";  // 默认降级到Free
```

### 8.2 组织内多网站计划查询

```typescript
async function getPlansForOrganization(params: {
  organizationId: string;
  userId: string;
}) {
  // Step 1: 验证用户组织成员身份
  const membership = await getOrganizationMemberByUserId(params.userId);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
  
  // Step 2: 获取组织内所有网站
  const websites = await listOrganizationWebsitePlanTargets(params.organizationId);
  
  // Step 3: 获取一次Customer State (批处理，减少Polar API调用)
  const customerState = await getCustomerStateByOrganizationId(params.organizationId);
  
  // Step 4: 对每个网站独立映射计划
  return Promise.all(websites.map(async (site) => {
    const subscription = getSubscriptionForWebsite(customerState, site.id);
    
    if (subscription) {
      const tempState = {
        customerId: customerState?.customerId ?? "",
        activeSubscriptions: [subscription],
        grantedBenefits: customerState?.grantedBenefits ?? [],
      };
      const planName = await getPlanFromCustomerState(tempState);
      const config = getPlanConfig(planName ?? "free");
      return { websiteId: site.id, planName, displayName: config.displayName };
    }
    
    // 无订阅默认Free
    const freePlan = getPlanConfig("free");
    return { websiteId: site.id, planName: "free", displayName: freePlan.displayName };
  }));
}
```

---

## 9. 缓存策略与性能优化

### 9.1 计划信息两级缓存

```typescript
// 内存缓存 (lib level)
const PLAN_CACHE_SUCCESS_TTL_MS = 10_000;  // 成功结果缓存10秒
const PLAN_CACHE_FAILURE_TTL_MS = 3000;    // 失败结果缓存3秒

type CachedPlanEntry = {
  expiresAt: number;
  plan: PlanInfo;
};

const planCache = new Map<string, CachedPlanEntry>();

// 读取流程
async function getPlanForWebsite(website: Website): Promise<PlanInfo> {
  // Cache Hit
  const cached = planCache.get(website.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.plan;
  }
  
  const stalePlan = cached?.plan ?? null;
  
  try {
    // 实际Polar API调用...
    const plan = await fetchPlanFromPolar(website);
    
    // 写入成功缓存
    planCache.set(website.id, {
      expiresAt: Date.now() + PLAN_CACHE_SUCCESS_TTL_MS,
      plan,
    });
    
    return plan;
  } catch (error) {
    if (stalePlan) {
      // 使用陈旧数据 + 降级策略
      const degradedPlan: PlanInfo = {
        ...stalePlan,
        hardLimitsEnforced: false,  // 降级不执行硬限制
        hardLimitsUnavailableReason: "billing_provider_unavailable",
      };
      
      planCache.set(website.id, {
        expiresAt: Date.now() + PLAN_CACHE_FAILURE_TTL_MS,
        plan: degradedPlan,
      });
      
      return degradedPlan;
    }
    
    // Fallback到Free计划
    return getFallbackFreePlan();
  }
}
```

### 9.2 AI计量表Redis缓存

```typescript
const METER_CACHE_KEY_PREFIX = "ai-credit:meter";
const METER_LOCK_KEY_PREFIX = "ai-credit:meter-lock";
const INGEST_BACKOFF_KEY_PREFIX = "ai-credit:ingest-backoff";
const METER_LOCK_TTL_MS = 4000;

// 5种数据源状态
type AiCreditMeterSource =
  | "live"        // 实时从Polar获取
  | "cache"       // 新鲜缓存命中
  | "stale_cache" // 陈旧缓存回退
  | "outage"      // 完全停电模式
  | "disabled";   // 计费禁用

// 缓存TTL配置 (环境变量控制)
// AI_CREDIT_BALANCE_CACHE_TTL_SECONDS = 新鲜缓存有效期
// AI_CREDIT_BALANCE_STALE_TTL_SECONDS = 陈旧缓存最大保留期

function isWithinSeconds(params: {
  nowMs: number;
  isoTimestamp: string | null;
  seconds: number;
}): boolean {
  if (!(params.isoTimestamp && params.seconds > 0)) return false;
  const parsed = Date.parse(params.isoTimestamp);
  if (Number.isNaN(parsed)) return false;
  return params.nowMs - parsed <= params.seconds * 1000;
}
```

---

## 10. 故障降级与停电模式

### 10.1 计划系统降级流程

```
Polar API 调用失败
    │
    ├─ 检查是否有陈旧缓存
    │   ├─ YES → 使用陈旧数据 + hardLimitsEnforced=false
    │   └─ NO  → 降级到默认Free计划 + hardLimitsEnforced=false
    │
    └─ 写入短期失败缓存 (3秒)，防止雪崩
```

### 10.2 AI信用额度守门人逻辑

```typescript
async function guardAiCreditRun(params: {
  organizationId: string;
  modelId: string;
  aiThinkingEnabled?: boolean | null;
}): Promise<AiCreditGuardResult> {
  const minimumCharge = getMinimumAiCreditCharge(params.modelId, {
    aiThinkingEnabled: params.aiThinkingEnabled,
  });
  
  let meterState: AiCreditMeterState;
  try {
    meterState = await getAiCreditMeterState(params.organizationId);
  } catch (error) {
    // Polar API完全失败
    meterState = {
      organizationId: params.organizationId,
      meterId: null, balance: null, consumedUnits: null,
      creditedUnits: null, meterBacked: false,
      source: "outage", lastSyncedAt: now,
      outage: true, outageReason: "polar_error",
    };
  }
  
  // Case 1: 计费禁用 → 全部允许
  if (meterState.source === "disabled") {
    return { allowed: true, mode: "normal", reason: "Billing disabled", ... };
  }
  
  // Case 2: 有计量表且余额充足 → 允许
  if (meterState.meterBacked && typeof meterState.balance === "number") {
    if (meterState.balance >= minimumCharge.totalCredits) {
      return { allowed: true, mode: "normal", reason: "Sufficient AI credits", ... };
    }
    // 余额不足 → 阻止
    return { allowed: false, mode: "normal", reason: "Insufficient AI credits",
             blockedReason: "insufficient_credits", ... };
  }
  
  // Case 3: 计量表未配置 → 阻止所有AI运行
  if (meterState.outageReason === "meter_not_configured" || 
      meterState.outageReason === "meter_not_found") {
    return { allowed: false, mode: "normal", 
             reason: "AI credits meter is not configured correctly",
             blockedReason: "meter_configuration_invalid", ... };
  }
  
  // Case 4: 停电模式白名单检查
  if (isOutageAllowedModel(params.modelId)) {
    return { allowed: true, mode: "outage",
             reason: "Polar meter unavailable, allowing outage fallback model", ... };
  }
  
  // Case 5: 停电模式但模型不在白名单 → 阻止
  return { allowed: false, mode: "outage",
           reason: "Polar meter unavailable and selected model not allowed in outage mode",
           blockedReason: "outage_model_not_allowed", ... };
}
```

### 10.3 停电模式允许的模型白名单

只有 `outageAllowed: true` 的模型在停电模式下可以运行：

| 模型 | 停电模式可用 | 原因 |
|-----|-------------|------|
| DeepSeek V4 Pro | ✓ | 稳定的基础模型 |
| Kimi K2 | ✓ | 稳定的基础模型 |
| Kimi K2.5 | ✓ | 中等模型 |
| Kimi K2.6 | ✓ | 中等模型 |
| GPT-5.5 | ✗ | 高端/付费模型 |
| GPT-5.2 | ✗ | 高端/付费模型 |
| GPT-5.1 | ✗ | 高端/付费模型 |
| GPT-5 Mini | ✗ | 高端/付费模型 |
| Gemini 3 Flash | ✗ | 高端/付费模型 |

---

## 11. API端点完整参考

### 11.1 tRPC Router: `/plan`

#### `getPlanInfo` - 获取单个网站计划信息

**输入**：`{ websiteSlug: string }`

**输出**：
```typescript
{
  plan: {
    name: PlanName;
    displayName: string;
    price?: number;
    features: Record<FeatureKey, FeatureValue>;
  };
  billing: BillingStatus;
  usage: {
    messages: number;        // 当前窗口已用消息数
    conversations: number;   // 当前窗口已用对话数
    contacts: number;        // 当前联系人总数
    teamMembers: number;     // 当前团队成员数
  };
  hardLimitStatus: {
    rollingWindowDays: 30;
    windowStart: string;     // ISO时间戳
    enforced: boolean;        // 是否强制执行限制
    unavailableReason: string | null;
    messages: {
      limit: number | null;
      used: number;
      reached: boolean;
    };
    conversations: {
      limit: number | null;
      used: number;
      reached: boolean;
      lockCutoff: { id: string; createdAt: string } | null;
    };
  };
  aiCredits: AiCreditMeterState;     // AI计量表状态
  aiModels: AiPlanModelsView;         // 可用AI模型列表
}
```

**流程**：
1. 验证网站访问权限
2. `getPlanForWebsite()` 获取计划信息
3. 并行查询4项使用量统计
4. 计算硬限制策略与截止点
5. 获取AI计量表状态
6. 获取计划可用AI模型列表

---

#### `getPlansForOrganization` - 批量查询组织内所有网站计划

**输入**：`{ organizationId: string }`

**输出**：
```typescript
Array<{
  websiteId: string;
  planName: PlanName;
  displayName: string;
}>
```

**性能优化**：只调用一次Polar `getCustomerState()`，然后在内存中对每个网站独立计算

---

#### `createCheckout` - 创建结账会话或升级订阅

**输入**：
```typescript
{
  websiteSlug: string;
  targetPlan: "free" | "hobby" | "pro";
}
```

**输出**：
```typescript
// 新购买场景
| { mode: "checkout"; checkoutUrl: string; }
// 升级成功场景
| { mode: "updated"; }
```

**流程**：
1. 验证网站访问权限
2. 获取目标计划的Polar Product ID
3. 验证Customer存在性
4. `normalizeWebsiteSubscriptions()` 清理重复订阅
5. 如果已有订阅：
   - 调用 `updateWebsiteSubscriptionProduct()` 升级
   - 成功 → 返回 `mode: "updated"`
   - 需要支付 → 创建新结账会话
6. 如果无订阅：创建Polar Checkout Session
7. 返回checkout URL
8. 成功跳转：`${PUBLIC_APP_URL}/${websiteSlug}/settings/plan?checkout_success=true`
9. 失败跳转：`${PUBLIC_APP_URL}/${websiteSlug}/settings/plan?checkout_error=true`

**Subscription Update 失败原因分类**：
```typescript
type WebsiteSubscriptionUpdateFailureReason =
  | "payment_required"   // 需要支付流程
  | "not_found"          // 订阅不存在
  | "config_error"       // 产品配置错误
  | "failed";            // 其他错误
```

---

#### `getPublicDiscountInfo` - (公开)查询折扣信息

**输入**：`{ discountId?: string }` (默认EARLY_BIRD)

**输出**：折扣详情对象 (或null)

---

#### `getDiscountInfo` - (认证)查询折扣信息

同 `getPublicDiscountInfo`，但需要用户登录

---

## 12. 监控指标与告警

### 12.1 关键业务指标

| 指标名称 | 类型 | 说明 | 告警阈值 |
|---------|------|------|---------|
| `billing.polar_api_error_rate` | Gauge | Polar API 错误率 | > 10% 5分钟 |
| `billing.plan_cache_hit_rate` | Gauge | 计划缓存命中率 | < 80% |
| `billing.meter_cache_hit_rate` | Gauge | 计量表缓存命中率 | < 80% |
| `billing.hard_limit_enforced_count` | Counter | 硬限制触发次数 | 异常峰值 |
| `billing.outage_mode_triggered` | Counter | 停电模式触发次数 | > 0 |
| `billing.subscription_normalization_count` | Counter | 重复订阅归一化次数 | 异常 |
| `ai_credits.usage_per_minute` | Gauge | AI信用消耗速率 | 异常峰值 |
| `ai_credits.insufficient_credit_blocks` | Counter | 余额不足阻止次数 | > 10 每分钟 |

### 12.2 日志事件模式

```
[plans] Missing Polar customer invariant violation
  → 关键：Customer不存在，可能是onboarding问题

[plans] Revoked duplicate active subscriptions
  → 正常：多订阅竞态清理

[ai-credits] Guard meter lookup failed for org=xxx
  → Polar API调用失败

[ai-credits] Failed to ingest usage event for org=xxx
  → 使用量上报失败，触发backoff

[ai-credits] Meter gateway failure for org=xxx
  → 严重：Redis或Polar完全不可用
```

### 12.3 关键错误SLO

| 场景 | 目标SLO | 降级策略 |
|-----|---------|---------|
| Polar API 可用性 | 99.9% | 陈旧缓存回退 → 停电模式 |
| 计划信息查询P95 | < 100ms | 内存缓存命中 |
| AI计量查询P95 | < 50ms | Redis缓存命中 |
| 结账创建成功率 | 99.5% | 错误提示 + 重试 |

---

## 总结

这个计费系统具有：

✅ **架构分层清晰**：5层架构，职责边界明确
✅ **计划控制精细**：33项功能细粒度控制
✅ **AI计费精密**：4维度定价，支持17+工具细分
✅ **故障友好**：多级降级策略，停电模式保障可用性
✅ **性能优异**：内存+Redis二级缓存，批处理优化
✅ **并发安全**：Redis分布式锁保护临界区
✅ **自托管兼容**：全功能免费，无任何限制
✅ **多租户隔离**：按网站独立计费，完全隔离

---

**文档版本**：1.0.0  
**最后更新**：2026-07-22  
**基于代码**：commit HEAD
