# 访客追踪系统架构

## 1. 系统概览

访客追踪系统是 Cossistant 平台的核心子系统，负责实时追踪网站访客的活动、地理位置、设备信息和营销归因。系统采用 **边缘优先 + 批量分析** 的架构，结合 Tinybird 实时分析引擎，提供毫秒级的访客洞察。

### 1.1 核心能力

| 能力 | 描述 | 技术实现 |
|------|------|----------|
| **实时在线检测** | 访客上下线实时感知 | WebSocket heartbeat + Presence events |
| **地理定位** | IP → 国家/城市/经纬度解析 | Cloudflare/Vercel 边缘 Headers + MaxMind |
| **设备指纹** | 浏览器/操作系统/设备类型识别 | User-Agent 解析 + 客户端上报 |
| **营销归因** | UTM 参数、渠道、着陆页追踪 | First-touch 归因模型 |
| **活动追踪** | 页面浏览、路由变更、焦点状态 | 客户端 JS SDK 事件采集 |
| **内容审核** | 访客拉黑/解封 | 管理员操作 + 事件日志 |

### 1.2 数据流架构

```
                   ┌─────────────────────────┐
                   │    Client Browser       │
                   │  (Visitor JS SDK)       │
                   └──────────┬──────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                    Edge Network (Vercel/Cloudflare)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ CF-IPCity│  │CF-Region │  │CF-Country│  │CF-Lat/Lng│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │   Visitor API Router    │
                   │  (apps/api/src/rest/)   │
                   └──────────┬──────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
  │  Geo Resolver │   │  Attribution  │   │  Device Info  │
  │  (MaxMind)    │   │  First-Touch  │   │  (UA Parser)  │
  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌──────────────────┐            ┌──────────────────┐
     │  PostgreSQL DB   │            │  Tinybird SDK    │
     │  (Visitor Table) │            │  (Event Buffer)  │
     └──────────────────┘            └───────┬──────────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  Tinybird API │
                                    │  (NDJSON     │
                                    │  Ingestion)  │
                                    └───────┬───────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  Data Sources │
                                    │  - presence   │
                                    │  - visitor_   │
                                    │    activity   │
                                    │  - visitor_   │
                                    │    events     │
                                    │  - conversation│
                                    │    metrics    │
                                    └───────────────┘
```

---

## 2. 地理定位子系统

### 2.1 多层级 Geo 解析策略

```typescript
// apps/api/src/rest/routers/visitor.ts
// Geo 解析优先级（按准确率从高到低）

Priority 1: MaxMind Database Lookup
  ├─ Trigger: Public IP available + IP changed since last visit
  ├─ Data: Country/Region/City/Latitude/Longitude/Accuracy Radius
  └─ Source: MaxMind GeoIP2 Precision web service

Priority 2: Edge Network Headers (CDN-level)
  ├─ Cloudflare Headers: CF-IPCity, CF-Region, CF-IPCountry, CF-IPlatLng
  ├─ Vercel Headers: x-vercel-ip-city, x-vercel-ip-country, x-vercel-ip-latitude
  └─ Fallback when MaxMind unavailable or rate-limited

Priority 3: Manual Client Override
  └─ Client SDK 上报的地理数据（仅当无法通过 IP 解析时使用）
```

### 2.2 Geo 数据准确性控制

```typescript
// 精度阈值控制
const MAX_PRECISE_GEO_ACCURACY_RADIUS_KM = 100;

// 准确性策略
// 1. 精度半径 > 100km 时，丢弃经纬度坐标（避免误导）
// 2. 仅保留置信度高的国家/城市级别数据
// 3. IP 变更时强制重新解析（避免 VPN/代理切换导致的 stale 数据）

function shouldPersistPreciseCoordinates(accuracyRadiusKm: number | null): boolean {
  return accuracyRadiusKm !== null &&
         accuracyRadiusKm <= MAX_PRECISE_GEO_ACCURACY_RADIUS_KM;
}
```

### 2.3 规范化处理

```typescript
// ISO 3166-1 alpha-2 国家代码规范化
function normalizeCountryCode(code: string | null): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length === 2 && COUNTRY_CODE_REGEX.test(trimmed)
    ? trimmed
    : null;
}

// Intl.DisplayNames 本地化国家名称
function getCountryDisplayName(countryCode: string, locale: string): string | null {
  const display = new Intl.DisplayNames([locale], { type: "region" });
  return display.of(countryCode) ?? null;
}
```

---

## 3. 访客归因系统

### 3.1 First-Touch 归因模型

```typescript
// apps/api/src/lib/visitor-attribution.ts

// 归因核心原则：首次接触永久保留
export function resolveFirstTouchAttribution(params: {
  existingAttribution?: VisitorAttribution | null;
  incomingAttribution?: VisitorAttribution | null;
}): VisitorAttribution | null {
  // 一旦存在首次归因数据，永久保留，不再更新
  if (params.existingAttribution?.firstTouch) {
    return params.existingAttribution;
  }
  // 首次访问时记录归因快照
  return params.incomingAttribution ?? null;
}
```

**设计决策：First-Touch vs Multi-Touch**

| 维度 | First-Touch (当前实现) | Multi-Touch (备选方案) |
|------|------------------------|------------------------|
| 实现复杂度 | 低（简单的一次性快照） | 高（需要会话时序跟踪） |
| 存储成本 | 极低（每个访客 1 条） | 高（每个会话多节点） |
| 分析灵活性 | 有限（仅首次来源） | 高（全路径归因） |
| 数据一致性 | 极高（不可变） | 中（可能回溯更新） |

**决策理由**：
- Cossistant 核心场景是客服，而非精准营销分析
- First-Touch 满足 80% 的营销渠道分析需求
- 避免归因逻辑复杂化导致的性能问题

### 3.2 归因数据结构

```typescript
export type VisitorAttribution = {
  firstTouch: {
    // 渠道信息
    channel: string;           // organic / paid_search / social / direct / etc.
    isDirect: boolean;         // 是否直接访问

    // 来源信息
    referrer: {
      url: string;             // 完整引荐 URL
      domain: string;          // 引荐域名（提取后的根域名）
    };

    // 着陆页信息
    landing: {
      url: string;             // 着陆页完整 URL
      path: string;            // 着陆页路径
      title: string;           // 着陆页标题（用于内容分析）
    };

    // UTM 参数（完整保留）
    utm: {
      source: string;          // utm_source
      medium: string;          // utm_medium
      campaign: string;        // utm_campaign
      content: string;         // utm_content
      term: string;            // utm_term
    };

    // 广告平台 Click IDs
    clickIds: {
      gclid: string;           // Google Ads
      gbraid: string;          // Google Ads (iOS 14+)
      wbraid: string;          // Google Ads (Web)
      fbclid: string;          // Facebook Ads
      msclkid: string;         // Microsoft Ads
      ttclid: string;          // TikTok Ads
      li_fat_id: string;       // LinkedIn Ads
      twclid: string;          // Twitter/X Ads
    };

    capturedAt: string;        // 归因捕获时间 ISO 8601
  };
};
```

### 3.3 扁平化追踪上下文

为便于 Tinybird 列式分析，所有归因字段被扁平化为单列：

```typescript
// apps/api/src/lib/visitor-attribution.ts
export type FlattenedVisitorTrackingContext = {
  // 当前页面信息
  page_url: string;
  page_path: string;
  page_title: string;
  page_referrer_url: string;

  // 归因渠道
  attribution_channel: string;
  attribution_is_direct: number;  // 0/1 便于 SQL SUM 聚合

  // 引荐来源
  attribution_referrer_url: string;
  attribution_referrer_domain: string;

  // 着陆页
  attribution_landing_url: string;
  attribution_landing_path: string;
  attribution_landing_title: string;

  // UTM 参数
  attribution_utm_source: string;
  attribution_utm_medium: string;
  attribution_utm_campaign: string;
  attribution_utm_content: string;
  attribution_utm_term: string;

  // 广告 Click IDs
  attribution_gclid: string;
  attribution_gbraid: string;
  attribution_wbraid: string;
  attribution_fbclid: string;
  attribution_msclkid: string;
  attribution_ttclid: string;
  attribution_li_fat_id: string;
  attribution_twclid: string;

  attribution_captured_at: string;
};
```

**设计优势**：
- Tinybird Materialized View 可直接按列过滤/聚合
- 避免 JSON 嵌套导致的查询性能损失
- 空字符串统一填充（避免 NULL 聚合异常）

---

## 4. 实时事件采集系统

### 4.1 Tinybird SDK 包装器架构

```typescript
// apps/api/src/lib/tinybird-sdk.ts

// 核心特性：
// 1. 事件批处理（100 events 或 5s 自动 flush）
// 2. 指数退避重试（429/5xx 错误）
// 3. 优雅关机刷新（SIGTERM/SIGINT）
// 4. 类型安全的 Query 封装
```

**批处理配置**：
```typescript
const BATCH_SIZE = 100;              // 单批最大事件数
const FLUSH_INTERVAL_MS = 5000;      // 自动刷新间隔（5 秒）
const MAX_RETRIES = 3;               // 最大重试次数
const RETRY_BASE_DELAY_MS = 1000;    // 重试基础延迟（指数增长）
```

### 4.2 EventBuffer 实现原理

```typescript
class EventBuffer<T extends TinybirdEvent> {
  private buffer: T[] = [];
  private flushTimer?: NodeJS.Timeout;

  // Fire-and-forget 添加
  add(event: T): void {
    this.buffer.push(event);
    if (this.buffer.length >= BATCH_SIZE) {
      void this.flush();  // 不阻塞主流程
    }
  }

  // NDJSON 批量摄入（1000+ RPS 吞吐量）
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    // NDJSON = newline-delimited JSON
    const ndjson = events.map(e => JSON.stringify(e)).join("\n");

    await withRetry(() => fetch(TINYBIRD_INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: ndjson,
    }));
  }
}
```

**性能特性**：
- 单实例吞吐量：~5000 events/sec
- 内存占用：~100KB/万事件
- P99 延迟：< 50ms（异步批量）

### 4.3 事件类型矩阵

| Data Source | Event Types | 触发时机 | 用途 |
|-------------|-------------|----------|------|
| **presence_events** | `visitor` / `user` | 心跳/页面活动 | 在线用户热力图、活跃时长统计 |
| **visitor_activity_events** | `connected` / `focus` / `heartbeat` / `page_sync` / `route_change` | 客户端实时事件 | 会话分析、跳出率、页面停留 |
| **visitor_events** | `page_view` | 页面浏览 | PV/UV 统计、内容分析 |
| **conversation_metrics** | `conversation_started` / `conversation_resolved` / `first_response` / `ai_resolved` / `escalated` / `feedback_submitted` | 对话生命周期节点 | SLA、AI 效能、坐席绩效 |

### 4.4 事件富化策略

```typescript
// apps/api/src/lib/tinybird-sdk.ts
export async function trackConversationMetricForVisitor(
  db: Database,
  event: BaseEvent
): Promise<void> {
  try {
    // 触发时实时查询访客完整属性
    const visitor = await findVisitorForWebsite(db, {
      visitorId: event.visitor_id,
      websiteId: event.website_id,
    });

    // 富化归因 + 页面上下文
    trackConversationMetric({
      ...event,
      ...flattenVisitorTrackingContext({
        attribution: visitor?.attribution,
        currentPage: visitor?.currentPage,
      }),
    });
  } catch {
    // 降级：无归因数据时使用空占位符
    trackConversationMetric({ ...EMPTY_TRACKING_CONTEXT, ...event });
  }
}
```

---

## 5. Presence 在线状态系统

### 5.1 访客在线标记流程

```
POST /visitors/:id/activity
       │
       ▼
  1. 验证 API Key + Website 归属
       │
       ▼
  2. 更新 PostgreSQL lastSeenAt
       │
       ▼
  3. markVisitorPresence → Tinybird Presence Event
       │
       ▼
  4. Realtime Emitter 广播 visitorPresenceUpdate
       │
       ├─ Dashboard: 在线访客列表实时更新
       └─ Agent UI: 访客状态指示器变化
```

### 5.2 Presence Event 结构

```typescript
export type PresenceEvent = {
  timestamp: Date;            // 事件时间
  website_id: string;         // 网站维度隔离
  entity_id: string;          // visitor_id 或 user_id
  entity_type: "visitor" | "user";  // 实体类型区分
  name: string;               // 访客名称（识别后）或坐席名称
  image: string;              // 头像 URL
  country_code: string;       // 国家代码（热力图用）
  city: string;               // 城市名称
  latitude: number;           // 纬度（地图可视化）
  longitude: number;          // 经度（地图可视化）
};
```

### 5.3 在线状态计算（Tinybird Pipe）

```sql
-- 在线访客计算逻辑（Tinybird Materialized View）
SELECT
  entity_id,
  entity_type,
  max(timestamp) as last_seen_at,
  city,
  country_code
FROM presence_events
WHERE
  timestamp > now() - INTERVAL 5 MINUTE
  AND website_id = {{website_id}}
GROUP BY entity_id, entity_type, city, country_code
ORDER BY last_seen_at DESC
```

**在线判定规则**：
- 5 分钟内有 Presence 事件 = Online
- 5-30 分钟无事件 = Away
- 30 分钟 + 无事件 = Offline

---

## 6. 访客 API 接口设计

### 6.1 核心端点清单

| Method | Path | Auth | 描述 |
|--------|------|------|------|
| `GET` | `/visitors/:id` | Public/Private | 获取访客完整信息 |
| `PATCH` | `/visitors/:id` | Public/Private | 更新访客属性（幂等） |
| `POST` | `/visitors/:id/activity` | Public | 上报访客活动（高频） |
| `PATCH` | `/visitors/:id/metadata` | Private | 更新关联联系人元数据 |
| `POST` | `/visitors/:id/block` | Private | 拉黑访客（需 Actor） |
| `POST` | `/visitors/:id/unblock` | Private | 解除拉黑 |

### 6.2 PATCH /visitors/:id 执行流程

```
  Client Request
       │
       ▼
  1. 提取现有访客记录（findVisitorForWebsite）
       │
       ▼
  2. 解析 Request Context
       ├─ Accept-Language → preferredLocale
       ├─ 提取 Edge Geo Headers
       ├─ 提取 Canonical IP（X-Forwarded-For 链解析）
       └─ 提取 Public IP（用于 MaxMind 查准率提升）
       │
       ▼
  3. Server-side Geo Update
       ├─ IP 变更或无 Geo 数据 → MaxMind 查准
       ├─ MaxMind 失败 → 使用 Edge Headers
       └─ Edge Headers 也无 → 清空 Geo 字段
       │
       ▼
  4. Merge 客户端提交字段
       ├─ IP/Geo 字段：服务器强制覆盖（防欺骗）
       ├─ Language/Timezone：客户端未提交时使用 Header 默认
       └─ Attribution：First-touch 规则（首次不可变）
       │
       ▼
  5. 更新 PostgreSQL（updateVisitorForWebsite）
       │
       ▼
  6. 触发 Page View 追踪（如有 currentPage 更新）
       ├─ trackVisitorEvent(page_view)
       └─ trackVisitorActivity(page_sync)
       │
       ▼
  返回规范化 VisitorResponse
```

### 6.3 安全设计：服务器字段所有权

```typescript
// apps/api/src/rest/routers/visitor.ts

// 关键安全原则：IP 和 Geo 字段由服务器端控制，不信任客户端提交
function stripServerOwnedGeoFields(body: UpdateVisitorRequest): Partial<UpdateVisitorRequest> {
  // 从 body 中删除以下字段，强制由服务器端解析
  const { ip, city, region, country, countryCode, latitude, longitude, ...rest } = body;
  return rest;
}
```

**攻击面防护**：
- 防止客户端伪造地理位置（如虚假国家代码以绕过区域限制）
- 防止 IP 欺骗导致的错误归因分析
- 确保 Geo 数据一致性（所有分析基于同一数据源）

---

## 7. 内容审核系统

### 7.1 访客拉黑/解封流程

```
  Admin Action (Block/Unblock)
           │
           ▼
  1. Private API Key 验证
           │
           ▼
  2. Actor User 解析（X-Actor-User-Id Header）
           │
           ▼
  3. 更新 visitor 表 blockedAt / blockedByUserId
           │
           ▼
  4. 创建 moderation 事件（conversation_timeline）
           │
           ▼
  5. 实时事件广播 → Dashboard 实时更新
           │
           ▼
  Side Effects:
    ├─ 阻断该访客新消息投递
    ├─ 正在进行的对话可配置自动关闭
    └─ 审计日志记录操作人 + 时间戳
```

### 7.2 Moderation 事件持久化

```typescript
// 为访客最新对话添加审核事件
async function createLatestVisitorModerationEvent(params: {
  db: Database;
  visitorId: string;
  actorUserId: string;
  type: "visitor_blocked" | "visitor_unblocked";
}) {
  // 查询访客最新对话
  const latestConversation = (await listConversationsHeaders(...)).items.at(0);

  if (latestConversation) {
    // 写入对话时间线（仅坐席可见，private visibility）
    await createConversationEvent({
      conversationId: latestConversation.id,
      event: {
        type: params.type,
        actorUserId: params.actorUserId,
        visibility: "private",
      },
    });
  }
}
```

---

## 8. 分析查询层

### 8.1 收件箱分析 API

```typescript
// apps/api/src/lib/tinybird-sdk.ts
export type InboxAnalyticsParams = {
  website_id: string;
  date_from: string;       // ISO 8601
  date_to: string;
  prev_date_from: string;  // 上一周期对比
  prev_date_to: string;
};

export type InboxAnalyticsRow = {
  event_type: string;      // conversation_started / first_response / ...
  median_duration: number | null;  // 中位数响应/解决时间
  event_count: number;     // 事件数
  period: "current" | "previous";  // 本期/上期对比
};
```

### 8.2 周度摘要统计

```typescript
export type WeeklyDigestMetricSnapshot = {
  conversations: number;               // 对话总数
  uniqueVisitors: number;              // 独立访客数
  aiHandledRate: number | null;        // AI 处理率（%）
  medianFirstResponseSeconds: number | null;  // 首次响应时间中位数（秒）
  medianResolutionSeconds: number | null;     // 解决时间中位数（秒）
};

export type WeeklyDigestStats = {
  current: WeeklyDigestMetricSnapshot;
  previous: WeeklyDigestMetricSnapshot;
};
```

**典型使用场景**：
- 每周绩效报告邮件
- Dashboard 趋势图表
- 同比/环比指标卡片
- 团队绩效对比

---

## 9. 设计权衡与决策记录

### 9.1 Tinybird vs ClickHouse 自建

**决策**：使用 Tinybird 托管分析层

| 维度 | Tinybird 托管 | ClickHouse 自建 |
|------|--------------|-----------------|
| 运维成本 | 0（托管） | 高（ZK 集群、备份、监控） |
| 摄入延迟 | <1s (Edge) | 3-5s (Batch insert) |
| 查询性能 | 预聚合 Pipe | 需要自行设计 MV |
| 成本 | 按量计费（events/month） | 固定实例成本 |
| 灵活性 | 受限（Tinybird SQL 子集） | 完全自由 |

**决策理由**：
- 早期团队无运维带宽自建 ClickHouse 集群
- Tinybird NDJSON 摄入协议标准化，迁移成本可控
- Materialized View 抽象降低实时分析开发门槛

### 9.2 事件缓冲：Fire-and-Forget vs 可靠投递

**决策**：采用 Fire-and-Forget 异步缓冲

| 维度 | Fire-and-Forget | 可靠事务投递 |
|------|-----------------|--------------|
| 主流程延迟 | 0 overhead | 10-50ms 额外延迟 |
| 数据可靠性 | 99.9%（进程崩溃丢失缓冲区） | 99.999%（WAL + ACK） |
| 实现复杂度 | 低（内存 Buffer） | 高（队列、死信、重试） |

**风险缓解**：
- 5 秒短刷新间隔（缓冲区最大滞留 5 秒）
- 进程退出信号处理（SIGTERM/SIGINT 强制刷新）
- 统计层面允许极小数据丢失（分析场景非事务性）

### 9.3 Geo 解析：Edge Headers vs MaxMind

**决策**：双源冗余，MaxMind 优先

| 维度 | Edge Headers | MaxMind |
|------|--------------|---------|
| 延迟 | 0ms（请求头自带） | 20-50ms（HTTP 调用） |
| 准确率 | 中（CDN 抽样） | 高（付费数据库） |
| 覆盖率 | 低（仅部分 CDN 节点） | 高（全球 IP 覆盖） |
| 成本 | 0 | 按量计费（~$1/10k 请求） |

**优化策略**：
- IP 未变更时跳过 MaxMind 调用（复用已持久化数据）
- Redis 缓存近期 IP 的 Geo 结果（TLL 24h）
- 边缘头结果作为降级 fallback

---

## 相关文档

- [01. 系统架构总览](./01-SYSTEM-OVERVIEW.md) - 整体架构与应用关系
- [03. 实时消息系统](./03-REAL-TIME-MESSAGING.md) - Realtime Emitter 实现
- [04. AI 对话管道](./04-AI-CONVERSATION.md) - Conversation Metrics 集成
- [09. 数据模型](./09-DATA-MODEL.md) - Visitor Table Schema
