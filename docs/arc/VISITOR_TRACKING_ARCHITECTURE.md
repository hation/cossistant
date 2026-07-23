# 访客追踪系统架构详解

## 概述

Cossistant 的访客追踪系统是一个基于 **三层GeoIP解析 + 首触归因模型 + Tinybird实时分析** 的完整访客行为追踪架构，支持匿名访客识别、地理位置解析、营销归因、实时在线状态监控，以及访客到联系人的身份关联。

**核心特性**：
- 首触归因（First-Touch Attribution）模型，永不覆盖首次来源
- 三层GeoIP解析优先级：MaxMind数据库 → Cloudflare/Vercel边缘头 → 客户端手动数据
- Tinybird事件流集成，29个扁平化分析字段
- 访客在线状态实时监控（Presence Profiles）
- 访客→联系人身份关联与元数据合并
- 访客封禁/解封工作流（带审计日志）
- 本地开发IP覆盖（LOCAL_VISITOR_IP_OVERRIDE）
- 地理坐标精度半径控制（100km阈值）

---

## 目录

1. [系统架构总览](#1-系统架构总览)
2. [核心文件映射](#2-核心文件映射)
3. [数据模型与存储](#3-数据模型与存储)
4. [首触归因模型](#4-首触归因模型)
5. [三层GeoIP地理位置解析](#5-三层geoip地理位置解析)
6. [访客活动与在线状态](#6-访客活动与在线状态)
7. [访客识别与联系人关联](#7-访客识别与联系人关联)
8. [访客封禁工作流](#8-访客封禁工作流)
9. [Tinybird分析集成](#9-tinybird分析集成)
10. [API端点完整参考](#10-api端点完整参考)
11. [错误处理与恢复](#11-错误处理与恢复)
12. [性能优化与监控](#12-性能优化与监控)

---

## 1. 系统架构总览

### 1.1 分层架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   前端客户端层                                        │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐          │
│  │ 访客Widget                    │  │  仪表板（客服/管理员）          │          │
│  │  - 访客初始化                  │  │  - 访客列表                    │          │
│  │  - 页面活动上报                │  │  - 在线状态监控                │          │
│  │  - UTM参数采集                 │  │  - 访客资料卡片                │          │
│  │  - 设备信息采集                │  │  - 封禁/解封操作               │          │
│  └─────────────────────────────────┘  └─────────────────────────────────┘          │
└───────────────────────────────────┬───────────────────────────┬─────────────────────┘
                                    │                           │
                                    │ (HTTP API)                │ (HTTP API)
                                    │                           │
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         API服务层                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Visitor API Router                                      │  │
│  │  PATCH /visitors/:id              → 访客信息更新（Geo+归因）                        │  │
│  │  POST /visitors/:id/activity       → 访客活动上报（实时在线）                        │  │
│  │  PATCH /visitors/:id/metadata     → 访客元数据更新（识别）                          │  │
│  │  POST /visitors/:id/block         → 封禁访客（私钥专用）                            │  │
│  │  POST /visitors/:id/unblock       → 解封访客（私钥专用）                            │  │
│  │  GET /visitors/:id                → 获取访客详情                                    │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Visitor Attribution Lib                                │  │
│  │  resolveFirstTouchAttribution()  → 首触归因解析（永不覆盖）                         │  │
│  │  flattenVisitorTrackingContext() → 扁平化分析字段（29字段）                         │  │
│  │  normalize*()                     → 各类数据规范化                                  │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              GeoIP Service                                          │  │
│  │  lookupGeo()                       → MaxMind数据库查询                              │  │
│  │  getCountry()                     → 国家代码查询                                    │  │
│  │  resolveCity()                    → 城市/区域解析                                   │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Presence Service                                       │  │
│  │  markVisitorPresence()            → 更新lastSeenAt                                  │  │
│  │  getVisitorPresenceProfiles()     → 批量获取在线状态                                │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Database Queries                                       │  │
│  │  upsertVisitor()                   → 创建/更新访客（带device/geo字段）              │  │
│  │  getVisitorById()                 → 按ID查询访客                                    │  │
│  │  getVisitorWithContact()          → 访客+关联联系人                                 │  │
│  │  findVisitorForWebsite()          → 网站范围内查找（多租户）                         │  │
│  │  getVisitorPresenceProfiles()     → 批量Presence数据                                │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Database Mutations                                     │  │
│  │  blockVisitor()                    → 封禁+审计记录                                   │  │
│  │  unblockVisitor()                  → 解封+时间戳                                    │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Tinybird SDK                                           │  │
│  │  trackVisitorActivity()           → 活动事件流                                      │  │
│  │  trackVisitorEvent()              → 页面视图事件流                                  │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                    │                           │
                                    │                           │
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      数据存储层                                           │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL (主数据库)       │  │  Redis (缓存/实时)          │  │  Tinybird (分析)│  │
│  │  - Visitor表               │  │  - presence键空间            │  │  - visitor_activity│  │
│  │  - blockedAt/blockedBy     │  │  - 临时Geo缓存               │  │  - page_view     │  │
│  │  - device/geo 20+字段       │  │                              │  │                 │  │
│  └──────────────────────────────┘  └──────────────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 关键设计原则

1. **首触优先**：First-Touch Attribution模型，首次来源信息永不被后续访问覆盖
2. **三层降级**：GeoIP解析按优先级降级，确保总有可用的地理数据
3. **多租户隔离**：所有访客操作强制Website/Organization双重边界验证
4. **身份分离**：Anonymous Visitor vs Identified Contact 分离但可关联
5. **审计完整**：封禁/解封操作完整记录时间戳和操作人
6. **分析驱动**：所有访客操作同步生成分析事件流

---

## 2. 核心文件映射

### 2.1 文件目录树

```
apps/api/src/
├── lib/
│   └── visitor-attribution.ts          # 归因核心逻辑（首触+扁平化）
├── db/
│   ├── queries/
│   │   └── visitor.ts                  # 访客数据库查询（CRUD+Presence）
│   └── mutations/
│       └── visitor.ts                  # 访客数据库变更（封禁/解封）
├── rest/
│   └── routers/
│       └── visitor.ts                  # 访客API路由器（1330+行，6端点）
├── services/
│   ├── geoip.ts                        # GeoIP MaxMind集成
│   └── presence.ts                     # 在线状态服务
└── utils/
    ├── client-ip.ts                    # 客户端IP解析（边缘头+手动）
    └── geo.ts                          # 地理数据规范化工具

packages/cossistant-types/src/
└── rest/
    └── visitor.ts                      # Zod schemas（请求/响应验证）
```

### 2.2 核心文件功能清单

| 文件名 | 主要功能 | 关键类/函数 |
|--------|---------|-----------|
| **`lib/visitor-attribution.ts`** | 首触归因逻辑，分析字段扁平化，数据规范化 | `resolveFirstTouchAttribution()`, `flattenVisitorTrackingContext()`, `normalizeUtmParams()` |
| **`rest/routers/visitor.ts`** | 完整访客API路由器，Geo三层解析，活动上报，封禁工作流 | `PATCH /visitors/:id`, `POST /visitors/:id/activity`, `resolveServerGeoUpdate()` |
| **`db/queries/visitor.ts`** | 访客数据库CRUD，Presence Profiles批量查询，关联联系人加载 | `upsertVisitor()`, `getCompleteVisitorWithContact()`, `getVisitorPresenceProfiles()` |
| **`db/mutations/visitor.ts`** | 访客封禁/解封数据库操作，审计时间戳 | `blockVisitor()`, `unblockVisitor()` |
| **`services/geoip.ts`** | MaxMind数据库集成，GeoIP查询，国家/城市解析 | `lookupGeo()`, `getCountry()`, `getCityWithRegion()` |
| **`services/presence.ts`** | 在线状态标记，lastSeenAt更新 | `markVisitorPresence()`, `markUserPresence()` |
| **`utils/client-ip.ts`** | 边缘IP头解析，IP规范化，本地开发覆盖 | `getClientIpFromRequest()`, `normalizeClientIp()` |

---

## 3. 数据模型与存储

### 3.1 Visitor数据库表结构

```sql
-- drizzle schema
CREATE TABLE visitors (
  -- 主键与租户
  id VARCHAR(21) PRIMARY KEY,
  organization_id VARCHAR(21) NOT NULL REFERENCES organizations(id),
  website_id VARCHAR(21) NOT NULL REFERENCES websites(id),
  contact_id VARCHAR(21) REFERENCES contacts(id),  -- 识别后关联

  -- 封禁状态
  blocked_at TIMESTAMP,
  blocked_by_user_id VARCHAR(21) REFERENCES users(id),

  -- 设备信息（10字段）
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  device VARCHAR(100),
  device_type VARCHAR(50),  -- desktop/mobile/tablet
  language VARCHAR(10),     -- en-US, zh-CN
  timezone VARCHAR(100),    -- America/Los_Angeles
  screen_resolution VARCHAR(20),
  viewport VARCHAR(20),

  -- 地理位置（10字段）
  ip VARCHAR(45),           -- IPv4/IPv6
  city VARCHAR(100),
  region VARCHAR(100),      -- 省/州
  country VARCHAR(100),
  country_code VARCHAR(2),  -- ISO 3166-1 alpha-2
  latitude NUMERIC(8, 5),
  longitude NUMERIC(8, 5),
  accuracy_radius_km INTEGER,  -- 精度半径
  is_eu BOOLEAN,
  timezone_geo VARCHAR(100),   -- Geo推导的时区

  -- 营销归因（首触，8字段）
  first_touch_channel VARCHAR(100),
  first_touch_source VARCHAR(100),
  first_touch_medium VARCHAR(100),
  first_touch_campaign VARCHAR(100),
  first_touch_content VARCHAR(100),
  first_touch_term VARCHAR(100),
  first_touch_landing_page TEXT,
  first_touch_referrer TEXT,

  -- 点击ID（广告平台，8字段）
  gclid TEXT,    -- Google Ads
  gbraid TEXT,   -- Google Ads
  wbraid TEXT,   -- Google Ads
  fbclid TEXT,   -- Facebook
  msclkid TEXT,   -- Microsoft
  ttclid TEXT,    -- TikTok
  li_fat_id TEXT, -- LinkedIn
  twclid TEXT,    -- Twitter/X

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,  -- 自定义字段
  is_test BOOLEAN DEFAULT false,

  -- 时间戳
  last_seen_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_visitors_website ON visitors(website_id);
CREATE INDEX idx_visitors_contact ON visitors(contact_id);
CREATE INDEX idx_visitors_blocked ON visitors(blocked_at) WHERE blocked_at IS NOT NULL;
CREATE INDEX idx_visitors_last_seen ON visitors(last_seen_at DESC);
CREATE INDEX idx_visitors_country ON visitors(country_code);
```

### 3.2 访客首触归因结构

```typescript
interface VisitorAttribution {
  firstTouch: boolean;  // 是否为首触（true=首次，null/undefined=未设置）

  // UTM参数
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // 渠道来源
  channel?: string;
  source?: string;

  // 页面信息
  landingPage?: string;
  referrer?: string;

  // 广告点击ID
  gclid?: string;    // Google Ads
  gbraid?: string;   // Google Ads
  wbraid?: string;   // Google Ads
  fbclid?: string;   // Facebook
  msclkid?: string;  // Microsoft
  ttclid?: string;   // TikTok
  li_fat_id?: string; // LinkedIn
  twclid?: string;   // Twitter/X
}
```

### 3.3 访客当前页面结构

```typescript
interface VisitorCurrentPage {
  url?: string;
  title?: string;
  pathname?: string;
  hostname?: string;
  referrer?: string;
  previousPathname?: string;
  entranceTime?: string;
}
```

### 3.4 扁平化分析字段（29字段）

通过 `flattenVisitorTrackingContext()` 生成，用于Tinybird分析：

```typescript
interface FlattenedVisitorTrackingContext {
  // 页面信息（4）
  page_url?: string;
  page_title?: string;
  page_pathname?: string;
  page_hostname?: string;

  // 渠道/来源（4）
  channel?: string;
  source?: string;
  referrer?: string;
  landing_page?: string;

  // UTM参数（5）
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  // 广告点击ID（8）
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  li_fat_id?: string;
  twclid?: string;

  // 附加信息（8）
  page_referrer?: string;
  page_previous_pathname?: string;
  page_entrance_time?: string;
  attribution_first_touch?: boolean;
  // ...更多字段
}
```

---

## 4. 首触归因模型

### 4.1 核心设计理念

**首触归因（First-Touch Attribution）** 的核心原则：

> 访客的**首次访问来源信息**（utm参数、渠道、着陆页、广告点击ID等）**永不被后续访问覆盖**。新数据仅在首触尚未设置时才写入。

### 4.2 归因解析算法

```typescript
// apps/api/src/lib/visitor-attribution.ts
function resolveFirstTouchAttribution(params: {
  existingAttribution?: VisitorAttribution | null;
  incomingAttribution?: VisitorAttribution | null;
}): VisitorAttribution | null {
  // 核心规则：如果已有firstTouch标记，直接返回现有数据 → 永不覆盖
  if (params.existingAttribution?.firstTouch) {
    return params.existingAttribution;
  }

  // 否则使用传入的新数据（可以为null）
  return params.incomingAttribution ?? null;
}
```

**行为矩阵**：

| 现有状态 | 传入数据 | 结果 |
|---------|---------|------|
| `{firstTouch: true, utmSource: "google"}` | `{firstTouch: true, utmSource: "twitter"}` | 返回google（保留旧数据） |
| `{firstTouch: true, utmSource: "google"}` | `null` | 返回google（保留旧数据） |
| `null` 或 `{firstTouch: undefined}` | `{firstTouch: true, utmSource: "twitter"}` | 返回twitter（设置新数据） |
| `null` | `null` | 返回null |

### 4.3 UTM参数规范化

```typescript
function normalizeUtmParams(params: {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
} {
  return {
    utmSource: params.source?.trim().toLowerCase() ?? null,
    utmMedium: params.medium?.trim().toLowerCase() ?? null,
    utmCampaign: params.campaign?.trim() ?? null,
    utmTerm: params.term?.trim() ?? null,
    utmContent: params.content?.trim() ?? null,
  };
}
```

**规范化规则**：
- `source/medium` → trim + 小写
- `campaign/term/content` → 仅 trim
- `undefined` → 转换为 `null`（数据库一致性）

### 4.4 渠道自动推导

根据 UTM 参数自动推导渠道：

```typescript
function deriveChannel(params: {
  utmSource?: string;
  utmMedium?: string;
  gclid?: string;
  fbclid?: string;
}): string | null {
  // 广告点击ID优先级最高
  if (params.gclid || params.gbraid || params.wbraid) return "google_ads";
  if (params.fbclid) return "facebook_ads";
  if (params.msclkid) return "microsoft_ads";
  if (params.ttclid) return "tiktok_ads";
  if (params.li_fat_id) return "linkedin_ads";

  // UTM组合推导
  if (params.utmMedium === "cpc" || params.utmMedium === "ppc") {
    if (params.utmSource === "google") return "google_cpc";
    if (params.utmSource === "bing") return "bing_cpc";
  }
  if (params.utmMedium === "social") return "social_media";
  if (params.utmMedium === "email") return "email";
  if (params.utmMedium === "referral") return "referral";
  if (params.utmMedium === "organic") return "organic_search";

  return params.utmSource ?? null;
}
```

---

## 5. 三层GeoIP地理位置解析

### 5.1 解析优先级架构

```
                    ┌──────────────────────────────────────────┐
                    │       传入的Geo数据候选集                 │
                    │                                          │
                    │  1. Edge Headers (CF/VERCEL)            │
                    │  2. 客户端手动提交的数据                  │
                    │  3. Canonical IP (用于MaxMind查询)       │
                    └──────────────────┬───────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
│  Layer 1: MaxMind       │ │ Layer 2: Edge Headers   │ │ Layer 3: Client Manual  │
│                          │ │                          │ │                          │
│  条件：IP变化 或 尚无  │ │  条件：MaxMind无数据    │ │  条件：其他两层均失败   │
│        MaxMind数据       │ │                          │ │  且 canonicalIp=null    │
│                          │ │  来源：Cloudflare /     │ │                          │
│  精度：最高(城市级)     │ │        Vercel边缘       │ │  精度：最低(访客手动)  │
│                          │ │  精度：中等(国家/城市)  │ │                          │
└──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
                                       ▼
                          ┌─────────────────────┐
                          │  最终Geo更新结果    │
                          │  - 来源标记（层级）│
                          │  - 精度半径计算    │
                          └─────────────────────┘
```

### 5.2 核心解析函数

```typescript
// apps/api/src/rest/routers/visitor.ts
async function resolveServerGeoUpdate(params: {
  existingVisitor: VisitorRecord;
  canonicalIp: string | null;
  publicIp: string | null;
  edgeGeoUpdate: PersistedGeoUpdate;
  edgeTimezone: string | null;
  resolvedAt: string;
}): Promise<{
  geoUpdate: PersistedGeoUpdate;
  timezoneFallback: string | null;
}> {
  // 检测是否需要触发MaxMind查询
  const shouldTriggerMaxmindLookup = (() => {
    const hasNoExistingGeo =
      !existingVisitor.countryCode &&
      !existingVisitor.city &&
      !existingVisitor.latitude;

    const hasIpChanged =
      existingVisitor.ip && publicIp && existingVisitor.ip !== publicIp;

    return hasNoExistingGeo || hasIpChanged;
  })();

  // ───────────────────────────────────
  // Layer 1: MaxMind 数据库查询
  // ───────────────────────────────────
  if (shouldTriggerMaxmindLookup && publicIp) {
    const geo = await lookupGeo(publicIp);

    if (geo?.countryCode) {
      return {
        geoUpdate: {
          ip: publicIp,
          country: geo.countryName ?? null,
          countryCode: geo.countryCode,
          city: geo.cityName ?? null,
          region: geo.mostSpecificSubdivisionName ?? null,
          latitude: geo.latitude ?? null,
          longitude: geo.longitude ?? null,
          accuracyRadiusKm: geo.accuracyRadius ?? null,
          isEu: geo.isInEuropeanUnion ?? null,
          timezone: geo.timezone ?? null,
        },
        timezoneFallback: null,  // MaxMind自带timezone，不需要fallback
      };
    }
  }

  // ───────────────────────────────────
  // Layer 2: 边缘Header（Cloudflare/Vercel）
  // ───────────────────────────────────
  if (edgeGeoUpdate.countryCode) {
    return {
      geoUpdate: edgeGeoUpdate,
      timezoneFallback: edgeTimezone,  // 边缘可能有独立timezone header
    };
  }

  // ───────────────────────────────────
  // Layer 3: 客户端手动数据（仅当无canonicalIp时才信任）
  // ───────────────────────────────────
  if (!canonicalIp) {
    return {
      geoUpdate: {
        ip: null,
        country: null,
        countryCode: null,
        city: null,
        region: null,
        latitude: null,
        longitude: null,
        accuracyRadiusKm: null,
        isEu: null,
        timezone: null,
      },
      timezoneFallback: null,
    };
  }

  // ───────────────────────────────────
  // 无可用Geo数据，返回空
  // ───────────────────────────────────
  return {
    geoUpdate: {
      ip: canonicalIp,
      country: null,
      countryCode: null,
      city: null,
      region: null,
      latitude: null,
      longitude: null,
      accuracyRadiusKm: null,
      isEu: null,
      timezone: null,
    },
    timezoneFallback: null,
  };
}
```

### 5.3 边缘Header提取

支持多种CDN/平台的Geo Header：

```typescript
// apps/api/src/utils/client-ip.ts
function extractEdgeGeoHeaders(headers: Headers): {
  countryCode: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: string | null;
  longitude: string | null;
} {
  // Cloudflare Headers
  const cfCountry = headers.get("CF-IPCountry");
  const cfCity = headers.get("CF-IPCity");
  const cfRegion = headers.get("CF-Region");
  const cfLatitude = headers.get("CF-IPLatitude");
  const cfLongitude = headers.get("CF-IPLongitude");

  // Vercel Headers
  const vercelCountry = headers.get("X-Vercel-IP-Country");
  const vercelCity = headers.get("X-Vercel-IP-City");
  const vercelRegion = headers.get("X-Vercel-IP-Region");
  const vercelLatitude = headers.get("X-Vercel-IP-Latitude");
  const vercelLongitude = headers.get("X-Vercel-IP-Longitude");

  // Cloudflare优先，其次Vercel
  return {
    countryCode: cfCountry ?? vercelCountry ?? null,
    city: cfCity ?? vercelCity ?? null,
    region: cfRegion ?? vercelRegion ?? null,
    latitude: cfLatitude ?? vercelLatitude ?? null,
    longitude: cfLongitude ?? vercelLongitude ?? null,
  };
}
```

### 5.4 地理精度半径控制

```typescript
const MAX_PRECISE_GEO_ACCURACY_RADIUS_KM = 100;

function shouldPersistPreciseCoordinates(accuracyRadiusKm: number | null): boolean {
  if (!accuracyRadiusKm) return false;
  return accuracyRadiusKm <= MAX_PRECISE_GEO_ACCURACY_RADIUS_KM;
}

// 使用示例：精度超过100km的坐标不存储，保护隐私
if (shouldPersistPreciseCoordinates(geo.accuracyRadiusKm)) {
  update.latitude = geo.latitude;
  update.longitude = geo.longitude;
} else {
  update.latitude = null;
  update.longitude = null;
}
```

### 5.5 国家代码规范化

统一转换为 **ISO 3166-1 alpha-2**（两位大写）：

```typescript
function normalizeCountryCode(code: string | null): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  // 验证是否为有效的两位国家代码
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }
  return null;
}
```

### 5.6 本地开发IP覆盖

```typescript
// .env
LOCAL_VISITOR_IP_OVERRIDE=8.8.8.8  // 使用Google DNS IP测试美国地理位置

// apps/api/src/utils/client-ip.ts
function getClientIpFromRequest(req: Request): string | null {
  const override = process.env.LOCAL_VISITOR_IP_OVERRIDE;
  if (override && process.env.NODE_ENV === "development") {
    return override;  // 本地开发强制使用指定IP测试Geo
  }
  // ...正常IP提取逻辑
}
```

---

## 6. 访客活动与在线状态

### 6.1 活动上报流程

```
访客浏览器Widget
    │
    │ POST /visitors/:id/activity
    │ Body: { currentPage?, attribution?, lastSeenAt? }
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. 认证检查（Public API Key）                                   │
│     - 验证website_id匹配                                         │
│     - 验证visitor属于该website                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. 更新lastSeenAt时间戳                                         │
│     - 使用服务器时间（不相信客户端）                              │
│     - upsertVisitor()更新数据库                                   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Tinybird活动追踪                                             │
│     - trackVisitorActivity()                                     │
│     - flattenVisitorTrackingContext() → 29字段                  │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. 实时事件广播                                                 │
│     - emit visitorPresenceUpdate 到dashboard                     │
│     - Presence Service更新缓存                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Presence Profiles批量查询

用于仪表板显示访客在线状态列表，支持最多500个访客批量查询：

```typescript
// apps/api/src/db/queries/visitor.ts
async function getVisitorPresenceProfiles(
  db: DatabaseConnection,
  params: {
    websiteId: string;
    visitorIds: string[];  // 最多500个
  }
): Promise<Array<{
  id: string;
  lastSeenAt: string;
  isOnline: boolean;  // lastSeenAt在N分钟内 = true
  city: string | null;
  countryCode: string | null;
}>> {
  const maxBatchSize = 500;
  const limitedIds = params.visitorIds.slice(0, maxBatchSize);

  return db.query(`
    SELECT
      id,
      last_seen_at AS "lastSeenAt",
      CASE
        WHEN last_seen_at >= NOW() - INTERVAL '5 minutes'
        THEN true ELSE false
      END AS "isOnline",
      city,
      country_code AS "countryCode"
    FROM visitors
    WHERE website_id = $1
      AND id = ANY($2)
      AND blocked_at IS NULL
    ORDER BY last_seen_at DESC
  `, [params.websiteId, limitedIds]);
}
```

**在线判定阈值**：最后活动时间在 **5分钟内** 视为在线。

### 6.3 Redis在线状态缓存（可选）

```typescript
// apps/api/src/services/presence.ts
const PRESENCE_CACHE_TTL_SECONDS = 60;  // 1分钟缓存

async function getCachedVisitorPresence(visitorId: string): Promise<{
  lastSeenAt: string | null;
  isOnline: boolean;
} | null> {
  const cacheKey = `presence:visitor:${visitorId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  return null;
}

async function setCachedVisitorPresence(
  visitorId: string,
  lastSeenAt: string
): Promise<void> {
  const cacheKey = `presence:visitor:${visitorId}`;
  const data = { lastSeenAt, isOnline: true };
  await redis.setex(cacheKey, PRESENCE_CACHE_TTL_SECONDS, JSON.stringify(data));
}
```

---

## 7. 访客识别与联系人关联

### 7.1 识别流程

```
匿名访客 (Visitor, contact_id=null)
    │
    │ PATCH /visitors/:id/metadata
    │ Body: { email?, name?, phone?, metadata? }
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. 提取识别字段                                                 │
│     - email (主要识别键)                                         │
│     - name                                                       │
│     - phone                                                      │
│     - metadata (自定义字段)                                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. 调用Contact Identify端点                                    │
│     POST /contacts/identify                                      │
│     → 查找或创建Contact记录                                      │
│     → 合并metadata                                               │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. 关联Visitor到Contact                                         │
│     - UPDATE visitors SET contact_id = $1 WHERE id = $2        │
│     - 从此Visitor有了身份                                       │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. 广播识别事件                                                 │
│     - emit visitorIdentified                                     │
│     - 仪表板显示识别通知                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 元数据合并策略

```typescript
// apps/api/src/db/queries/visitor.ts
async function updateVisitorMetadata(
  db: DatabaseConnection,
  params: {
    visitorId: string;
    newMetadata: Record<string, unknown>;
    mergeStrategy: "merge" | "replace";  // 默认merge
  }
): Promise<void> {
  if (params.mergeStrategy === "merge") {
    // JSONB深度合并：新字段覆盖旧字段，保留未修改的
    await db.query(`
      UPDATE visitors
      SET metadata = metadata || $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
    `, [params.visitorId, JSON.stringify(params.newMetadata)]);
  } else {
    // 完全替换
    await db.query(`
      UPDATE visitors
      SET metadata = $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
    `, [params.visitorId, JSON.stringify(params.newMetadata)]);
  }
}
```

### 7.3 Visitor与Contact数据联合查询

```typescript
async function getCompleteVisitorWithContact(
  db: DatabaseConnection,
  params: { visitorId: string }
): Promise<{
  visitor: VisitorRecord;
  contact: ContactRecord | null;
} | null> {
  const result = await db.queryOne(`
    SELECT
      v.*,
      row_to_json(c.*) AS contact
    FROM visitors v
    LEFT JOIN contacts c ON v.contact_id = c.id
    WHERE v.id = $1
  `, [params.visitorId]);

  if (!result) return null;

  const { contact, ...visitor } = result;
  return { visitor, contact };
}
```

---

## 8. 访客封禁工作流

### 8.1 完整封禁流程

```
客服/管理员（仪表板）
    │
    │ POST /visitors/:id/block
    │ Header: X-Private-API-Key （必须私钥）
    │ Header: X-Actor-User-Id    （操作人）
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. 认证与授权检查                                               │
│     - 必须是Private API Key（不能Public Key）                    │
│     - 验证Actor User存在且属于该Organization                      │
│     - 验证Visitor属于该Website/Organization                       │
│     - 检查是否已封禁（避免重复操作）                               │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. 数据库封禁更新                                               │
│     - SET blocked_at = NOW()                                    │
│     - SET blocked_by_user_id = $actorId                         │
│     - SET updated_at = NOW()                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. 创建对话审计事件                                             │
│     - INSERT INTO conversation_events                           │
│       type: "VISITOR_BLOCKED"                                   │
│       actor_type: "user"                                        │
│       actor_id: $actorId                                        │
│       metadata: { blockedAt, reason? }                          │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. 强制断开WebSocket连接（可选）                               │
│     - 在Connection Registry中查找该Visitor的所有连接            │
│     - 发送close帧并终止连接                                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. 广播事件                                                     │
│     - emit visitorBlocked 到仪表板                               │
│     - 刷新在线列表（移除该访客）                                 │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 封禁数据库Mutation

```typescript
// apps/api/src/db/mutations/visitor.ts
async function blockVisitor(
  db: DatabaseConnection,
  params: {
    visitor: VisitorRecord;
    actorUserId: string;
  }
): Promise<VisitorRecord> {
  const now = new Date().toISOString();

  // 跳过已封禁的
  if (params.visitor.blockedAt) {
    return params.visitor;
  }

  const result = await db.queryOne(`
    UPDATE visitors
    SET
      blocked_at = $2,
      blocked_by_user_id = $3,
      updated_at = $2
    WHERE id = $1
    RETURNING *
  `, [params.visitor.id, now, params.actorUserId]);

  return result;
}

async function unblockVisitor(
  db: DatabaseConnection,
  params: {
    visitor: VisitorRecord;
    actorUserId: string;
  }
): Promise<VisitorRecord> {
  // 跳过未封禁的
  if (!params.visitor.blockedAt) {
    return params.visitor;
  }

  const result = await db.queryOne(`
    UPDATE visitors
    SET
      blocked_at = NULL,
      blocked_by_user_id = NULL,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [params.visitor.id]);

  return result;
}
```

### 8.3 API层安全检查（Private Key Only）

```typescript
// apps/api/src/rest/routers/visitor.ts
// 封禁/解封 端点必须使用Private API Key
router.post("/visitors/:id/block", async (c) => {
  // ───────────────────────────────────
  // 安全检查1：必须是Private API Key
  // ───────────────────────────────────
  const apiKeyType = c.get("apiKeyType");
  if (apiKeyType !== "private") {
    return c.json({ error: "Private API Key required" }, 403);
  }

  // ───────────────────────────────────
  // 安全检查2：必须有Actor User ID
  // ───────────────────────────────────
  const actorUserId = c.req.header("X-Actor-User-Id");
  if (!actorUserId) {
    return c.json({ error: "X-Actor-User-Id header required" }, 400);
  }

  // ───────────────────────────────────
  // 安全检查3：Actor必须属于该Organization
  // ───────────────────────────────────
  const actorUser = await getUserById(db, { userId: actorUserId });
  if (!actorUser || actorUser.organizationId !== website.organizationId) {
    return c.json({ error: "Unauthorized actor" }, 403);
  }

  // ...执行封禁逻辑
});
```

---

## 9. Tinybird分析集成

### 9.1 事件流架构

```
访客API操作
    │
    ├─ 数据库写入（PostgreSQL）
    │
    └─ 分析事件流（Tinybird）
       │
       ├─ trackVisitorActivity() → visitor_activity 数据源
       │   └─ 字段：visitor_id, website_id, timestamp, ip,
       │             device_type, browser, os, country_code,
       │             city, latitude, longitude,
       │             29个归因+页面字段
       │
       └─ trackVisitorEvent() → page_view 数据源
           └─ 字段：visitor_id, website_id, timestamp,
                      pathname, referrer, title, duration,
                      归因字段
```

### 9.2 Activity追踪实现

```typescript
// apps/api/src/lib/tinybird-sdk.ts
async function trackVisitorActivity(params: {
  visitorId: string;
  websiteId: string;
  organizationId: string;
  ip?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  countryCode?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  trackingContext: FlattenedVisitorTrackingContext;
}): Promise<void> {
  const event = {
    timestamp: new Date().toISOString(),
    visitor_id: params.visitorId,
    website_id: params.websiteId,
    organization_id: params.organizationId,
    ip: params.ip,
    device_type: params.deviceType,
    browser: params.browser,
    os: params.os,
    country_code: params.countryCode,
    city: params.city,
    latitude: params.latitude,
    longitude: params.longitude,
    // 展开29个扁平字段
    ...params.trackingContext,
  };

  await sendToTinybird("visitor_activity", event);
}

async function trackVisitorEvent(params: {
  visitorId: string;
  websiteId: string;
  eventType: "page_view";
  pathname?: string;
  referrer?: string;
  title?: string;
  durationSeconds?: number;
  trackingContext: FlattenedVisitorTrackingContext;
}): Promise<void> {
  const event = {
    timestamp: new Date().toISOString(),
    visitor_id: params.visitorId,
    website_id: params.websiteId,
    event_type: params.eventType,
    pathname: params.pathname,
    referrer: params.referrer,
    title: params.title,
    duration_seconds: params.durationSeconds,
    // 归因字段
    utm_source: params.trackingContext.utm_source,
    utm_medium: params.trackingContext.utm_medium,
    utm_campaign: params.trackingContext.utm_campaign,
    // ...更多
  };

  await sendToTinybird("visitor_events", event);
}
```

### 9.3 常见分析查询

```sql
-- Tinybird查询示例：按来源渠道统计访客数
SELECT
  utm_source,
  utm_medium,
  COUNT(DISTINCT visitor_id) as visitor_count
FROM visitor_activity
WHERE website_id = 'ws_xxx'
  AND timestamp >= NOW() - INTERVAL 7 DAY
GROUP BY utm_source, utm_medium
ORDER BY visitor_count DESC;

-- 按国家统计在线访客
SELECT
  country_code,
  COUNT(DISTINCT visitor_id) as online_visitors
FROM visitor_activity
WHERE website_id = 'ws_xxx'
  AND timestamp >= NOW() - INTERVAL 5 MINUTE
GROUP BY country_code
ORDER BY online_visitors DESC;

-- 着陆页效果分析
SELECT
  landing_page,
  COUNT(DISTINCT visitor_id) as visitors,
  COUNT(DISTINCT CASE WHEN contact_id IS NOT NULL THEN visitor_id END) as converted
FROM visitor_activity
WHERE website_id = 'ws_xxx'
  AND timestamp >= NOW() - INTERVAL 30 DAY
GROUP BY landing_page
ORDER BY visitors DESC;
```

---

## 10. API端点完整参考

### 10.1 PATCH /visitors/:id — 更新访客信息

**用途**：更新访客设备信息、地理位置、归因数据。触发完整的三层Geo解析和首触归因。

**认证**：Public API Key（Widget）或 Private API Key

**请求体**：
```typescript
{
  // 设备信息（10字段）
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  deviceType?: string;
  language?: string;
  timezone?: string;
  screenResolution?: string;
  viewport?: string;

  // 地理位置（客户端手动提供，Layer 3）
  ip?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;

  // 归因数据
  attribution?: VisitorAttribution;

  // 当前页面
  currentPage?: VisitorCurrentPage;

  // 是否测试访客
  isTest?: boolean;
}
```

**核心处理逻辑**：
1. 提取Canonical IP和Public IP（边缘头）
2. 提取Edge Geo Header（Layer 2）
3. 执行 `resolveServerGeoUpdate()` 三层Geo解析
4. 执行 `resolveFirstTouchAttribution()` 首触归因
5. 规范化国家代码（ISO 3166-1 alpha-2）
6. `upsertVisitor()` 写入数据库
7. 如果有页面数据，`trackVisitorEvent(page_view)` 到Tinybird
8. 返回完整Visitor对象

**响应**：Visitor完整对象

---

### 10.2 POST /visitors/:id/activity — 上报访客活动

**用途**：访客活跃时上报，更新lastSeenAt，触发分析事件流。Widget每N秒自动调用一次。

**认证**：Public API Key（Widget）

**请求体**：
```typescript
{
  currentPage?: VisitorCurrentPage;
  attribution?: VisitorAttribution;
  lastSeenAt?: string;  // 可选，服务器端会覆盖
}
```

**核心处理逻辑**：
1. 验证Visitor存在且属于该Website
2. 更新 `lastSeenAt = NOW()`（服务器时间，不相信客户端）
3. `flattenVisitorTrackingContext()` 生成29字段
4. `trackVisitorActivity()` 发送到Tinybird
5. emit `visitorPresenceUpdate` 实时事件到仪表板
6. 更新Presence Service缓存

**响应**：`{ success: true, lastSeenAt: string }`

---

### 10.3 PATCH /visitors/:id/metadata — 更新访客元数据（识别）

**用途**：将访客与联系人关联，设置识别信息（email/name/phone）。

**认证**：Public或Private API Key

**请求体**：
```typescript
{
  email?: string;      // 主要识别字段
  name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;  // 自定义字段
}
```

**核心处理逻辑**：
1. 验证Visitor存在
2. 调用 `POST /contacts/identify` 查找或创建Contact
3. 更新Visitor的 `contact_id` 关联
4. 合并metadata到Visitor和Contact
5. emit `visitorIdentified` 事件

**响应**：`{ visitor: Visitor, contact: Contact }`

---

### 10.4 POST /visitors/:id/block — 封禁访客

**用途**：封禁访客（禁止其发送消息）。仅限Private API Key。

**认证**：Private API Key ONLY

**必需Header**：`X-Actor-User-Id: usr_xxx`（操作人用户ID）

**请求体**：
```typescript
{
  reason?: string;  // 可选封禁原因
}
```

**核心处理逻辑**：
1. 验证是Private API Key
2. 验证X-Actor-User-Id存在且有效
3. 验证Actor属于该Organization
4. 验证Visitor存在且未封禁
5. `blockVisitor()` 数据库更新（blockedAt/blockedByUserId）
6. 创建 `VISITOR_BLOCKED` ConversationEvent审计记录
7. 断开该Visitor所有WebSocket连接
8. emit事件通知仪表板

**响应**：Visitor对象（含blockedAt字段）

---

### 10.5 POST /visitors/:id/unblock — 解封访客

**用途**：解除访客封禁。与封禁对称。

**认证**：Private API Key ONLY

**必需Header**：`X-Actor-User-Id: usr_xxx`

**核心处理逻辑**：
与封禁类似，反向操作：
1. 验证是Private API Key
2. 验证Actor权限
3. `unblockVisitor()` 清除blockedAt/blockedByUserId
4. 创建 `VISITOR_UNBLOCKED` ConversationEvent
5. emit事件通知仪表板

**响应**：Visitor对象

---

### 10.6 GET /visitors/:id — 获取访客详情

**用途**：查询单个访客的完整信息（含关联的Contact）。

**认证**：Private API Key

**查询参数**：
```
?includeContact=true  # 包含关联的Contact信息（默认true）
```

**核心处理逻辑**：
1. 验证权限
2. `getCompleteVisitorWithContact()` 联合查询
3. 返回Visitor + Contact

**响应**：
```typescript
{
  visitor: {
    id: string;
    websiteId: string;
    contactId: string | null;
    blockedAt: string | null;
    blockedByUserId: string | null;
    // ... 20+ device/geo字段
    // ... 归因字段
    lastSeenAt: string;
    createdAt: string;
    updatedAt: string;
  };
  contact: Contact | null;  // 已识别时有值
}
```

---

## 11. 错误处理与恢复

### 11.1 GeoIP查询失败处理

```typescript
async function lookupGeoSafely(ip: string): Promise<GeoResult | null> {
  try {
    return await lookupGeo(ip);
  } catch (error) {
    // MaxMind数据库不可用或超时 → 降级到Edge Header
    console.warn("[GeoIP] Lookup failed, falling back to edge headers", error);
    return null;
  }
}

// 使用模式
const maxmindGeo = await lookupGeoSafely(publicIp);
if (maxmindGeo) {
  // 使用MaxMind数据
} else {
  // 降级到Edge Header或客户端数据
}
```

### 11.2 Tinybird事件发送失败处理

```typescript
async function sendToTinybirdSafely(
  datasource: string,
  event: object
): Promise<void> {
  try {
    // 尝试发送（3次重试）
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await sendToTinybird(datasource, event);
        return;
      } catch (e) {
        if (attempt === 3) throw e;
        await sleep(500 * attempt);  // 500ms → 1s → 1.5s
      }
    }
  } catch (error) {
    // 分析失败不影响主流程，仅记录日志
    console.error("[Tinybird] Failed to send event after retries", {
      datasource,
      error,
    });
    // 可选：写入本地队列，后台异步重试
  }
}
```

### 11.3 IP解析错误处理

```typescript
function getClientIpSafely(req: Request): string | null {
  try {
    return getClientIpFromRequest(req);
  } catch (error) {
    console.warn("[ClientIP] Parsing failed", error);
    return null;
  }
}
```

### 11.4 访客不存在的标准响应

```typescript
// 所有端点的通用模式
const visitor = await getVisitorById(db, { visitorId: params.id });
if (!visitor) {
  return c.json({ error: "Visitor not found" }, 404);
}

// 多租户边界验证
if (visitor.websiteId !== website.id) {
  return c.json({ error: "Visitor does not belong to this website" }, 403);
}

// 封禁状态检查（消息发送端点）
if (visitor.blockedAt) {
  return c.json({ error: "Visitor is blocked" }, 403);
}
```

---

## 12. 性能优化与监控

### 12.1 数据库优化

```sql
-- 关键索引（已在3.1中列出，这里强调性能影响）

-- 1. 按website查询是最常见操作（仪表板列表）
CREATE INDEX idx_visitors_website_id ON visitors(website_id);

-- 2. Presence Profiles按last_seen_at排序
CREATE INDEX idx_visitors_last_seen_at ON visitors(last_seen_at DESC);

-- 3. 封禁过滤（在线列表排除封禁）
CREATE INDEX idx_visitors_blocked_at ON visitors(blocked_at)
WHERE blocked_at IS NOT NULL;

-- 4. Contact关联查询
CREATE INDEX idx_visitors_contact_id ON visitors(contact_id);

-- 5. 按国家/城市统计（分析）
CREATE INDEX idx_visitors_country_code ON visitors(country_code);
CREATE INDEX idx_visitors_city ON visitors(city);
```

### 12.2 Presence Profiles分页

```typescript
// 仪表板访客列表分页
async function getVisitorPresenceProfilesPaginated(
  db: DatabaseConnection,
  params: {
    websiteId: string;
    page: number;        // 从1开始
    pageSize: number;    // 默认50
    onlineOnly?: boolean;
  }
) {
  const offset = (params.page - 1) * params.pageSize;

  let whereClause = `website_id = $1 AND blocked_at IS NULL`;
  const queryParams: unknown[] = [params.websiteId];

  if (params.onlineOnly) {
    whereClause += ` AND last_seen_at >= NOW() - INTERVAL '5 minutes'`;
  }

  // 总数
  const countResult = await db.queryOne(`
    SELECT COUNT(*) as total
    FROM visitors
    WHERE ${whereClause}
  `, queryParams);

  // 分页数据
  const rows = await db.query(`
    SELECT id, last_seen_at, city, country_code
    FROM visitors
    WHERE ${whereClause}
    ORDER BY last_seen_at DESC
    LIMIT $${queryParams.length + 1}
    OFFSET $${queryParams.length + 2}
  `, [...queryParams, params.pageSize, offset]);

  return {
    data: rows,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total: parseInt(countResult.total),
      totalPages: Math.ceil(parseInt(countResult.total) / params.pageSize),
    },
  };
}
```

### 12.3 监控指标

```typescript
// 建议监控的关键指标

interface VisitorTrackingMetrics {
  // Geo解析
  geo_lookups_total: number;          // 总Geo查询数
  geo_lookups_maxmind_success: number; // MaxMind成功
  geo_lookups_edge_fallback: number;  // 降级到Edge Header
  geo_lookups_client_fallback: number; // 降级到客户端数据
  geo_lookups_failed: number;         // 完全失败

  // 归因
  attribution_first_touch_preserved: number; // 首触保留
  attribution_first_touch_set: number;      // 首触设置（新）

  // 活动
  activity_reports_total: number;     // 活动上报总数
  activity_reports_online: number;    // 在线访客数（5min内）

  // 封禁
  blocks_total: number;
  unblocks_total: number;

  // 识别
  identifications_total: number;      // 访客→联系人识别数
}
```

---

## 总结

这个访客追踪系统具有：

✅ **归因准确**：首触归因模型确保首次来源永不丢失
✅ **地理可靠**：三层GeoIP解析降级，总有可用数据
✅ **实时监控**：Presence Profiles + 在线状态广播
✅ **身份完整**：匿名访客→识别联系人的完整链路
✅ **管理合规**：封禁/解封带完整审计记录
✅ **分析驱动**：Tinybird事件流，29个扁平分析字段
✅ **安全健壮**：多租户隔离，Private Key仅管理操作
✅ **开发友好**：本地IP覆盖，方便测试不同地理场景

---

**文档版本**：1.0.0  
**最后更新**：2026-07-22  
**基于代码**：commit HEAD
