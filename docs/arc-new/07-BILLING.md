# Cossistant 计费与订阅系统架构

| 文档版本 | 创建日期 | 基于代码版本 |
|---------|---------|-------------|
| v1.0 | 2026-07-22 | Git HEAD |

---

## 1. 系统概述

Cossistant 采用 **按网站计费 + 三级订阅计划 + AI 信用额度计量** 的混合计费模式，底层使用 **Polar.sh** 作为计费平台。设计核心原则：

1. **每个网站独立订阅** - 无组织级共享配额，每个网站必须有独立订阅
2. **故障友好降级** - Polar 不可用时自动切换到停电模式，不中断核心服务
3. **多级缓存策略** - 内存缓存 + 超时降级，减少 Polar API 调用
4. **30 天滚动窗口** - 对话/消息硬限制采用滑动窗口计量
5. **自托管兼容** - 自部署模式全功能免费，无任何计费限制

---

## 2. 三级订阅计划

### 2.1 计划对比总表

| 功能 | Free | Hobby ($20/mo promo) | Pro ($40/mo promo) |
|-----|------|---------------------|-------------------|
| **对话数量** | 20 / 30 天 | 无限 | 无限 |
| **消息数量** | 200 / 30 天 | 无限 | 无限 |
| **联系人存储** | 25 | 2000 | 6000 |
| **对话保留** | 30 天 | 永久 | 永久 |
| **团队席位** | 1 | 2 | 4 |
| **邮件通知** | ✅ | ✅ | ✅ |
| **邮件直接回复** | ✅ | ✅ | ✅ |
| **仪表板文件分享** | ❌ | ✅ | ✅ |
| **自动翻译** | ❌ | ❌ | ✅ |
| **Slack 创始人支持** | ❌ | ✅ | ✅ |
| **专属 Slack 频道** | ❌ | ❌ | ✅ |
| **高级集成** | ❌ | ❌ | ✅ |
| **自带 OpenRouter Key** | ❌ | ❌ | ✅ |
| **最新 AI 模型** | ❌ | ✅ | ✅ |
| **自定义 AI 头像** | ❌ | ❌ | ✅ |
| **月度 AI 信用** | 50 | 1000 | 3000 |
| **AI 代理数量** | 1 | 1 | 1 |
| **训练 URL 数量** | 5 | 无限 | 无限 |
| **训练存储限制** | 0.25 MB | 10 MB | 40 MB |
| **单源爬取页面** | 5 | 1000 | 1000 |
| **总训练页面** | 5 | 无限 | 无限 |
| **FAQ 条目** | 5 | 无限 | 无限 |
| **文件条目** | 2 | 无限 | 无限 |
| **训练间隔** | 180 分钟 | 10 分钟 | 即时 (0 分钟) |
| **REST API** | ✅ | ✅ | ✅ |
| **Webhooks** | ✅ | ✅ | ✅ |
| **自托管** | ✅ | ✅ | ✅ |
| **自定义事件** | ✅ | ✅ | ✅ |

**注**：`null` = 无限制，布尔值 = 是否启用。

---

### 2.2 计划配置数据结构

```typescript
// apps/api/src/lib/plans/config.ts
type PlanName = "free" | "hobby" | "pro";

type FeatureValue = number | boolean | null;

type PlanConfig = {
  name: PlanName;
  displayName: string;
  price?: number;                    // USD 每月
  priceWithPromo?: number;           // 促销价
  isRecommended?: boolean;           // 是否推荐计划
  polarProductId?: string;           // Polar 产品 ID 映射
  polarProductName?: string;         // Polar 产品名称映射
  features: Record<FeatureKey, FeatureValue>;
};

// 33 项功能定义
type FeatureKey =
  | "conversations" | "messages" | "contacts"
  | "conversation-retention" | "team-members"
  | "email-notifications" | "email-reply"
  | "dashboard-file-sharing" | "auto-translate"
  | "slack-support" | "slack-custom-channel"
  | "pro-integrations" | "rest-api" | "webhooks"
  | "self-host" | "custom-events" | "ai-workflows"
  | "ai-credit" | "openrouter-byok" | "latest-ai-models"
  | "custom-ai-skills" | "custom-ai-agent-avatar"
  | "ai-support-agents" | "ai-agent-training-links"
  | "ai-agent-training-mb" | "ai-agent-crawl-pages-per-source"
  | "ai-agent-training-pages-total" | "ai-agent-training-faqs"
  | "ai-agent-training-files" | "ai-agent-training-interval";
```

### 2.3 Polar 产品 ID 映射

| 计划 | Sandbox (开发环境) | Production (生产环境) |
|-----|---------------------|----------------------|
| Free | `4543a3c8-bbf6-47e2-84f6-0d78b334b15a` | `4bdd01d7-6092-48ab-8589-0666ffab18fc` |
| Hobby | `b060ff1e-c2dd-4c02-a3e4-395d7cce84a0` | `758ff687-1254-422f-9b4a-b23d39c6b47e` |
| Pro | `c87aa036-2f0b-40da-9338-1a1fcc191543` | `f34bf87c-96ab-4e54-9167-c4de8527669a` |

---

## 3. 计划获取与缓存机制

### 3.1 核心函数签名

```typescript
// apps/api/src/lib/plans/access.ts
export async function getPlanForWebsite(
  _website: Website
): Promise<PlanInfo>;

export async function canUse(
  featureKey: FeatureKey,
  _website: Website
): Promise<boolean>;

type PlanInfo = {
  planName: PlanName | "self_hosted";
  displayName: string;
  price?: number;
  features: Record<FeatureKey, FeatureValue>;
  hardLimitsEnforced: boolean;
  hardLimitsUnavailableReason: "billing_provider_unavailable" | "billing_disabled" | null;
  billing: BillingStatus;
};
```

### 3.2 两级缓存策略

```
调用 getPlanForWebsite(websiteId)
       │
       ▼
    检查内存缓存
       │
       ├─ 命中 && 未过期 → 直接返回 ✅
       │
       └─ 未命中 or 过期
              │
              ▼
          调用 Polar API
              │
              ├─ 成功
              │   └─ 写入缓存 TTL 10 秒
              │
              └─ 失败
                  ├─ 有陈旧缓存？→ 返回降级模式（关闭硬限制）✅
                  └─ 无陈旧缓存？→ 返回免费计划（关闭硬限制）✅
```

### 3.3 缓存常量

```typescript
const PLAN_CACHE_SUCCESS_TTL_MS = 10_000;  // 成功结果缓存 10 秒
const PLAN_CACHE_FAILURE_TTL_MS = 3000;     // 失败结果缓存 3 秒
```

---

## 4. 故障降级与停电模式

### 4.1 降级流程

```
Polar API 调用失败
       │
       ▼
┌─────────────────────────────────┐
│ 检查是否有陈旧缓存？           │
└───────────────┬─────────────────┘
                │
         ┌──────┴──────┐
         │              │
         ▼              ▼
      有陈旧缓存    无陈旧缓存
         │              │
         ▼              ▼
  ┌─────────────┐  ┌──────────────────┐
  │ 返回陈旧计划│  │ 返回免费默认计划│
  │ + 关闭硬限制│  │ + 关闭硬限制     │
  └─────────────┘  └──────────────────┘
         │              │
         └──────┬───────┘
                ▼
       用户体验透明降级
       - AI 信用可能显示不准确
       - 但对话/消息等核心功能不中断
```

### 4.2 自托管特殊模式

自托管环境自动启用最大权限计划：

```typescript
function resolveSelfHostedFeatures(): Record<FeatureKey, FeatureValue> {
  const referencePlan = getPlanConfig("pro");

  return Object.fromEntries(
    Object.entries(referencePlan.features).map(([featureKey, value]) => {
      if (featureKey === "ai-agent-training-interval") {
        return [featureKey, 0];  // 0 = 可随时训练
      }
      if (typeof value === "boolean") {
        return [featureKey, true];  // 所有 boolean 功能全开
      }
      return [featureKey, null];  // 所有 numeric 限制全部取消
    })
  );
}
```

自托管特征：
- **全部功能启用** - 所有 boolean = true
- **所有配额无限** - 所有 number = null
- **无硬限制** - `hardLimitsEnforced = false`
- **无计费检查** - `billing.enabled = false`

---

## 5. 计费开关与状态

### 5.1 核心启用判断

```typescript
// apps/api/src/lib/billing-mode.ts
export function isPolarEnabled(): boolean {
  if (!env.POLAR_API_TOKEN) {
    return false;
  }

  if (env.POLAR_ENABLED === false) {
    return false;
  }

  return true;
}
```

**关闭计费的方法**：
1. 环境变量 `POLAR_ENABLED=false`
2. **或者**，未设置 `POLAR_API_TOKEN`

两种方式都会导致系统进入自托管模式。

### 5.2 计费状态结构

```typescript
type BillingStatus = {
  enabled: boolean;
  provider: "polar" | "disabled";
  canManageSubscription: boolean;
};
```

---

## 6. Polar 平台集成流程

### 6.1 客户-订阅状态流

```
用户访问仪表板
       │
       ▼
 1. getCustomerByOrganizationId(orgId)
       │
       ├─ ✅ 客户存在 → 继续
       └─ ❌ 客户不存在 → 触发 Polar 客户创建
                               │
                               ▼
                      2. createPolarCustomerIfNecessary()
                               │
                               ▼
                      3. getCustomerState(customerId)
                               │
                               ▼
                      4. getSubscriptionForWebsite(websiteId)
                               │
                               ├─ 有订阅 → getPlanFromCustomerState()
                               └─ 无订阅 → 默认免费计划
```

### 6.2 按网站订阅机制

**重要设计决策**：每个网站必须有独立订阅，**没有组织级订阅回退**。

```typescript
// apps/api/src/lib/plans/access.ts

if (websiteSubscription) {
  // ✅ 有网站特定订阅 → 使用该订阅
  const subscriptionCustomerState = {
    customerId: customerState.customerId,
    activeSubscriptions: [websiteSubscription],  // 仅此网站
    grantedBenefits: customerState.grantedBenefits,
  };
  planName = await getPlanFromCustomerState(subscriptionCustomerState);
}

// ❌ 没有组织级回退！
// 如果没有该网站的订阅，planName 保持 null，然后降级到免费
const finalPlanName: PlanName = planName ?? "free";
```

**设计原理**：确保粒度控制，支持同一个组织有不同网站使用不同计划。

---

## 7. 网站订阅元数据存储

网站 ID **不存储在数据库中**，而是存储在 Polar 订阅的元数据字段：

```json
// Polar 订阅 metadata
{
  "websiteId": "ws_abc123xyz"
}
```

查找过程：

```typescript
function getSubscriptionForWebsite(
  customerState: CustomerState,
  websiteId: string
): WebsiteSubscription | null {
  for (const sub of customerState.activeSubscriptions) {
    const websiteIdInMeta = sub.metadata?.websiteId;
    if (websiteIdInMeta === websiteId) {
      return sub;
    }
  }
  return null;
}
```

**优点**：
- 不需要额外数据库表和迁移
- 数据单一可信源：Polar
- 支持任意时间从仪表板调整

---

## 8. 前端计费信息获取

### 8.1 tRPC 查询端点

```typescript
// apps/api/src/trpc/routers/plan.ts

export const planRouter = router({
  // 获取单个网站计划信息
  getInfo: publicProcedure.input(...).query(async ({ input }) => {
    const website = await getWebsiteByPublicId(input.websiteId);
    return getPlanForWebsite(website);
  }),

  // 批量获取组织内所有网站计划
  getPlansForOrganization: authedProcedure.input(...).query(async ({ input }) => {
    const websites = await listOrganizationWebsitePlanTargets(input.organizationId);
    // 所有网站共享同一个 Customer，单次请求即可
    const customer = await getCustomerByOrganizationId(input.organizationId);
    const customerState = customer ? await getCustomerState(customer.id) : null;

    return Promise.all(
      websites.map(async (site) => {
        const subscription = getSubscriptionForWebsite(customerState, site.id);
        return subscription ? mapToPlanInfo(subscription) : freePlan;
      })
    );
  }),
});
```

### 8.2 结账流程

1. 前端调用 `createCheckout` mutation
2. API 调用 Polar Checkout Sessions API
3. 返回重定向 URL
4. 用户完成支付后，Polar 通过 Webhook 回调
5. Webhook 处理器更新 subscription metadata (websiteId)

---

## 9. 硬限制执行（草案）

### 9.1 30 天滚动窗口计数

```typescript
// 对话超限判断逻辑
async function checkConversationLimit(
  websiteId: string,
  planInfo: PlanInfo
): Promise<{ exceeded: boolean; remaining: number }> {
  if (!planInfo.hardLimitsEnforced) {
    // 停电模式或降级状态下：不执行限制
    return { exceeded: false, remaining: Infinity };
  }

  const limit = planInfo.features.conversations;
  if (limit === null) {
    // null = 无限制
    return { exceeded: false, remaining: Infinity };
  }

  const windowStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const count = await countConversationsInWindow(websiteId, windowStart);

  return {
    exceeded: count >= limit,
    remaining: Math.max(0, limit - count),
  };
}
```

### 9.2 超限行为

| 限制项 | 达到限制后的行为 |
|-------|----------------|
| **对话** | 无法创建新对话，访客看到"已达到限制"提示 |
| **消息** | 无法发送消息，访客提示升级 |
| **联系人** | 无法导入新联系人 |
| **团队成员** | 无法邀请新成员加入 |
| **AI 信用** | 超出后 AI 自动回复降级为纯人工 |

---

## 10. 计费架构安全

### 10.1 安全检查点

```
每次计划信息检查
      │
      ▼
┌─────────────────────────────────┐
│ 1. 验证网站归属权限           │
│    只有组织成员能查看          │
└──────────────────┬──────────────┘
                   │
                   ▼
┌─────────────────────────────────┐
│ 2. 公共 API 信息脱敏          │
│    不暴露 Polar Customer ID   │
│    不暴露 Polar Subscription ID│
└──────────────────┬──────────────┘
                   │
                   ▼
┌─────────────────────────────────┐
│ 3. 管理员操作权限检查          │
│    创建结账链接需要管理员权限   │
└─────────────────────────────────┘
```

### 10.2 Polar Webhook 验证

```typescript
// Polar Webhook 签名验证
async function verifyPolarWebhookSignature(
  request: Request,
  rawBody: string
): Promise<boolean> {
  const signature = request.headers.get("polar-signature");
  const hmac = crypto.createHmac("sha256", env.POLAR_WEBHOOK_SECRET);
  const expected = hmac.update(rawBody).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature || ""),
    Buffer.from(expected)
  );
}
```

---

## 11. 计费相关数据库 Schema

```typescript
// apps/api/src/db/schema/websites.ts

const websites = pgTable("websites", {
  // ...其他字段

  // 注意：没有 plan/subscription 字段！
  // = Polar 是唯一可信源
  // = 数据库中不存储任何订阅信息

  // 只有：
  organizationId: text("organization_id").references(() => organizations.id),
  // Polar Customer ID 也不存储在 DB，运行时 API 查询获得
});
```

**设计原则**：
- 订阅状态唯一可信源 = Polar
- 数据库 = 缓存，Polar = 事实
- 避免双写，避免数据不一致
- 通过元数据在 Polar 中关联 websiteId

---

## 12. 关键设计权衡

| 决策 | 优点 | 缺点 |
|-----|-----|------|
| **Polar 作为唯一事实源** | 无数据双写，无一致性问题 | Polar 故障时依赖降级机制 |
| **按网站订阅而非组织** | 灵活计费，不同网站不同计划 | 多网站客户需多次结账 |
| **内存缓存 10 秒** | 性能好，减少 Polar API 调用 | 订阅变更最多 10 秒后才生效 |
| **降级关闭硬限制而非拒绝服务** | 客户故障无感，核心服务可用 | 故障期间会有一些超额使用 |
| **订阅元数据不在 DB 存储** | 架构简单，少维护 | 每次获取计划需要 API 调用 Polar |

---

## 相关文档

- [01 系统整体架构](./01-SYSTEM-OVERVIEW.md)
- [09 统一数据模型](./09-DATA-MODEL.md)

---

*文档由代码分析自动生成，如有疑问请对照源代码核实。*
