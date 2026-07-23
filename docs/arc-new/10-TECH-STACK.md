# 统一技术栈

## 1. 核心技术栈总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  TypeScript  │  │  React 18    │  │  Tailwind CSS│  │  tRPC Client │  │
│  │  (Type Safe) │  │  (Hooks)     │  │  (Atomic CSS)│  │  (End-to-End │  │
│  │              │  │              │  │              │  │  Type Safety)│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  React Hook  │  │  React Query │  │  React Table │  │  React Hook  │  │
│  │  Form        │  │  (Data Fetch)│  │  (Datagrids) │  │  Form (Cont.)│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Backend Layer                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │  Node.js >= 20       │  │  Hono / Express      │  │  tRPC Server     │ │
│  │  (Runtime)            │  │  (HTTP Framework)    │  │  (RPC Layer)     │ │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘ │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │  Drizzle ORM         │  │  Zod                 │  │  Ai18n           │ │
│  │  (Type-Safe SQL)     │  │  (Schema Validation) │  │  (i18n)          │ │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘ │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │  OpenAI SDK          │  │  OpenRouter API      │  │  BullMQ          │ │
│  │  (LLM Integration)   │  │  (Model Gateway)     │  │  (Job Queue)     │ │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘ │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │  Tinybird SDK        │  │  @tinybirdco/charts  │  │  Polar.sh        │ │
│  │  (Analytics Events)  │  │  (Data Visualization)│  │  (Billing)       │ │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Infrastructure Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  PostgreSQL 16+              │  │  Redis 7+                         │ │
│  │  + pgvector                  │  │  (Cache + Real-time Pub/Sub)      │ │
│  │  (Vector Search Engine)      │  │                                   │ │
│  └──────────────────────────────┘  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  Vercel                      │  │  CloudFlare                        │ │
│  │  (Hosting + Edge Functions)  │  │  (CDN + Edge Headers)             │ │
│  └──────────────────────────────┘  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  AWS S3 / R2                │  │  Upstash / Vercel KV               │ │
│  │  (Object Storage)           │  │  (Serverless Redis)                │ │
│  └──────────────────────────────┘  └──────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Developer Experience                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Turborepo   │  │  Biome       │  │  Vitest      │  │  Playwright  │  │
│  │  (Monorepo)  │  │  (Lint/Format)│  │  (Unit Test) │  │  (E2E Test)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. 监控与可观测性

### 11.1 日志聚合

| 层级 | 工具 | 特点 |
|------|------|------|
| **应用日志** | Vercel Logs + Datadog | 结构化 JSON, 实时流式 |
| **数据库日志** | PostgreSQL pg_stat_statements | 慢查询分析, 查询性能 |
| **Redis 监控** | Upstash Metrics | 内存使用率, 命令延迟 |

**结构化日志格式**：
```typescript
// 标准日志字段
interface LogEntry {
  timestamp: string;      // ISO 8601
  level: "debug" | "info" | "warn" | "error";
  service: "api" | "web" | "workers";
  traceId?: string;       // OpenTelemetry Trace ID
  userId?: string;
  websiteId?: string;
  message: string;
  duration?: number;      // ms
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### 11.2 性能监控 (APM)

**关键指标**：
| 指标类别 | 具体指标 | 告警阈值 |
|----------|----------|----------|
| **API 延迟** | p50, p95, p99 响应时间 | p95 > 2s 告警 |
| **数据库** | 查询延迟, 连接池使用率 | > 80% 告警 |
| **Redis** | 命中 miss 率, 内存使用率 | miss rate > 20% 告警 |
| **AI API** | Token 消耗速率, 失败率 | 失败率 > 5% 告警 |

**Vercel Analytics 集成**：
- Web Vitals (LCP, FID, CLS)
- 自定义事件追踪
- 地区性能热力图

### 11.3 错误追踪

| 工具 | 用途 | 关键特性 |
|------|------|----------|
| **Sentry** | 前端 + 后端错误捕获 | Source Maps, 堆栈跟踪, 用户上下文 |
| **LogRocket** | 前端会话重放 | 用户行为回放, 网络请求记录 |

**错误分级策略**：
1. **CRITICAL**：系统不可用（数据库连接失败, 500 错误率 > 10%）
   - 即时通知：电话 + Slack + 邮件
2. **HIGH**：核心功能受损（AI 回复失败率 > 5%, WebSocket 断开异常）
   - 15分钟内响应：Slack + 邮件
3. **MEDIUM**：边缘功能异常
   - 每日汇总邮件
4. **LOW**：调试信息
   - 仅日志记录

---

## 12. 第三方服务集成

### 12.1 AI 服务

| 服务 | 集成方式 | 用途 | Fallback |
|------|----------|------|----------|
| **OpenRouter** | REST API | LLM 模型网关 | 本地缓存回复 |
| **OpenAI** | 官方 SDK | Embedding 生成 | text-embedding-3-small → large |
| **Replicate** | REST API | 开源模型运行 | N/A |

**调用重试策略**：
```typescript
// 指数退避 + 抖动
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,   // 1s
  maxDelay: 10000,      // 10s
  backoffFactor: 2,
  jitter: true
};
```

### 12.2 通信服务

| 服务 | 用途 | 特性 |
|------|------|------|
| **Resend** | 邮件发送 | 事务邮件, 营销邮件, 模板管理 |
| **Twilio** | 短信通知 | SLA 告警, 紧急通知 |
| **Slack API** | 团队通知 | 新对话提醒, 升级提醒 |

### 12.3 计费与支付

| 服务 | 用途 | 集成深度 |
|------|------|----------|
| **Polar.sh** | 订阅计费, 发票 | 深度集成 (单一可信源) |
| **Stripe** | 备用支付网关 | 轻量集成 |

### 12.4 对象存储

| 服务 | 用途 | 特性 |
|------|------|------|
| **Cloudflare R2** | 文件上传, 知识库附件 | S3 兼容, 零出口费 |
| **AWS S3** | 备份存储 | 合规归档, 生命周期管理 |

**文件处理流程**：
```
用户上传文件
     │
     ▼
前端签名请求 (tRPC mutation)
     │
     ▼
直接上传到 R2 (Presigned URL)
     │
     ▼
回调通知 API 服务
     │
     ▼
异步处理：
  ├─ 生成缩略图
  ├─ 内容提取 (PDF / DOCX / TXT)
  ├─ 向量化并存入知识库
  └─ 更新数据库记录
```

---

## 13. 技术选型总结

### 13.1 核心原则

1. **类型安全优先**：全栈 TypeScript, 端到端 tRPC, Drizzle ORM
2. **云原生架构**：Serverless + Edge, 按需扩展, 零运维
3. **开源优先**：使用成熟开源组件，减少供应商锁定
4. **性能预算**：API p95 < 2s, Web Vitals 全部达绿区
5. **开发者体验**：本地开发 < 30s 启动, Hot Module Replacement

### 13.2 技术债务管理

| 债务类型 | 处理策略 | 时间线 |
|----------|----------|--------|
| 代码重构 | 每次 sprint 预留 20% 时间 | 持续 |
| 依赖升级 | 每月批量更新 minor 版本 | 每月 |
| 性能优化 | 基于监控数据，优先解决 p95 瓶颈 | 季度 |
| 安全补丁 | 高优先级漏洞 24h 内修复 | 即时 |

### 13.3 未来技术路线

| 阶段 | 技术方向 | 目标 |
|------|----------|------|
| **Q3 2024** | WebAssembly 优化 | AI 推理部分本地运行 |
| **Q4 2024** | 边缘数据库 | Cloudflare D1 + 本地缓存 |
| **Q1 2025** | 多模态支持 | 图片理解, 语音识别 |
| **Q2 2025** | 私有化部署 | Docker Compose, Kubernetes |

---

## 11. 监控与可观测性

### 11.1 日志聚合

| 层级 | 工具 | 特点 |
|------|------|------|
| **应用日志** | Vercel Logs + Datadog | 结构化 JSON, 实时流式 |
| **数据库日志** | PostgreSQL pg_stat_statements | 慢查询分析, 查询性能 |
| **Redis 监控** | Upstash Metrics | 内存使用率, 命令延迟 |

**结构化日志格式**：
```typescript
// 标准日志字段
interface LogEntry {
  timestamp: string;      // ISO 8601
  level: "debug" | "info" | "warn" | "error";
  service: "api" | "web" | "workers";
  traceId?: string;       // OpenTelemetry Trace ID
  userId?: string;
  websiteId?: string;
  message: string;
  duration?: number;      // ms
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### 11.2 性能监控 (APM)

**关键指标**：
| 指标类别 | 具体指标 | 告警阈值 |
|----------|----------|----------|
| **API 延迟** | p50, p95, p99 响应时间 | p95 > 2s 告警 |
| **数据库** | 查询延迟, 连接池使用率 | > 80% 告警 |
| **Redis** | 命中 miss 率, 内存使用率 | miss rate > 20% 告警 |
| **AI API** | Token 消耗速率, 失败率 | 失败率 > 5% 告警 |

**Vercel Analytics 集成**：
- Web Vitals (LCP, FID, CLS)
- 自定义事件追踪
- 地区性能热力图

### 11.3 错误追踪

| 工具 | 用途 | 关键特性 |
|------|------|----------|
| **Sentry** | 前端 + 后端错误捕获 | Source Maps, 堆栈跟踪, 用户上下文 |
| **LogRocket** | 前端会话重放 | 用户行为回放, 网络请求记录 |

**错误分级策略**：
1. **CRITICAL**：系统不可用（数据库连接失败, 500 错误率 > 10%）
   - 即时通知：电话 + Slack + 邮件
2. **HIGH**：核心功能受损（AI 回复失败率 > 5%, WebSocket 断开异常）
   - 15分钟内响应：Slack + 邮件
3. **MEDIUM**：边缘功能异常
   - 每日汇总邮件
4. **LOW**：调试信息
   - 仅日志记录

---

## 12. 第三方服务集成

### 12.1 AI 服务

| 服务 | 集成方式 | 用途 | Fallback |
|------|----------|------|----------|
| **OpenRouter** | REST API | LLM 模型网关 | 本地缓存回复 |
| **OpenAI** | 官方 SDK | Embedding 生成 | text-embedding-3-small → large |
| **Replicate** | REST API | 开源模型运行 | N/A |

**调用重试策略**：
```typescript
// 指数退避 + 抖动
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,   // 1s
  maxDelay: 10000,      // 10s
  backoffFactor: 2,
  jitter: true
};
```

### 12.2 通信服务

| 服务 | 用途 | 特性 |
|------|------|------|
| **Resend** | 邮件发送 | 事务邮件, 营销邮件, 模板管理 |
| **Twilio** | 短信通知 | SLA 告警, 紧急通知 |
| **Slack API** | 团队通知 | 新对话提醒, 升级提醒 |

### 12.3 计费与支付

| 服务 | 用途 | 集成深度 |
|------|------|----------|
| **Polar.sh** | 订阅计费, 发票 | 深度集成 (单一可信源) |
| **Stripe** | 备用支付网关 | 轻量集成 |

### 12.4 对象存储

| 服务 | 用途 | 特性 |
|------|------|------|
| **Cloudflare R2** | 文件上传, 知识库附件 | S3 兼容, 零出口费 |
| **AWS S3** | 备份存储 | 合规归档, 生命周期管理 |

**文件处理流程**：
```
用户上传文件
     │
     ▼
前端签名请求 (tRPC mutation)
     │
     ▼
直接上传到 R2 (Presigned URL)
     │
     ▼
回调通知 API 服务
     │
     ▼
异步处理：
  ├─ 生成缩略图
  ├─ 内容提取 (PDF / DOCX / TXT)
  ├─ 向量化并存入知识库
  └─ 更新数据库记录
```

---

## 13. 技术选型总结

### 13.1 核心原则

1. **类型安全优先**：全栈 TypeScript, 端到端 tRPC, Drizzle ORM
2. **云原生架构**：Serverless + Edge, 按需扩展, 零运维
3. **开源优先**：使用成熟开源组件，减少供应商锁定
4. **性能预算**：API p95 < 2s, Web Vitals 全部达绿区
5. **开发者体验**：本地开发 < 30s 启动, Hot Module Replacement

### 13.2 技术债务管理

| 债务类型 | 处理策略 | 时间线 |
|----------|----------|--------|
| 代码重构 | 每次 sprint 预留 20% 时间 | 持续 |
| 依赖升级 | 每月批量更新 minor 版本 | 每月 |
| 性能优化 | 基于监控数据，优先解决 p95 瓶颈 | 季度 |
| 安全补丁 | 高优先级漏洞 24h 内修复 | 即时 |

### 13.3 未来技术路线

| 阶段 | 技术方向 | 目标 |
|------|----------|------|
| **Q3 2024** | WebAssembly 优化 | AI 推理部分本地运行 |
| **Q4 2024** | 边缘数据库 | Cloudflare D1 + 本地缓存 |
| **Q1 2025** | 多模态支持 | 图片理解, 语音识别 |
| **Q2 2025** | 私有化部署 | Docker Compose, Kubernetes |

---

## 2. 语言与运行时

### 2.1 TypeScript

| 配置 | 值 | 说明 |
|------|-----|------|
| 版本 | 5.4+ | 使用最新稳定版 |
| 模式 | Strict | 完全严格类型检查 (`strict: true`) |
| 包管理 | pnpm | 高性能 monorepo 包管理 |
| TSConfig | Project References | 跨包类型引用优化 |

**关键 `tsconfig.json` 配置**：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  }
}
```

---

## 3. 前端框架与库

### 3.1 React 生态

| 库 | 版本 | 用途 | 替代方案 |
|----|------|------|----------|
| **React** | 18.x | UI 框架 | - |
| **React DOM** | 18.x | DOM 渲染 | - |
| **Tailwind CSS** | 3.4+ | 原子化 CSS | Styled Components, Emotion |
| **React Hook Form** | 7.x | 表单管理 | Formik |
| **TanStack Query** | 5.x | 数据获取缓存 | SWR, RTK Query |
| **TanStack Table** | 8.x | 数据表格 | AG Grid, MUI DataGrid |
| **Zod** | 3.x | 表单验证 | Yup, Joi |
| **tRPC** | 11.x | 端到端类型安全 API | GraphQL, REST |
| **Day.js** | 2.x | 日期处理 | date-fns, Luxon |

### 3.2 状态管理策略

**分层状态管理**：

```
┌─────────────────────────────────────────────────────────────┐
│  Global State (极少使用)                                      │
│  - User Session   (tRPC + cookies)                           │
│  - Feature Flags  (environment variables + polling)          │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Server State (TanStack Query)                                │
│  - Cache invalidation by tRPC mutation                       │
│  - Background refetch on window focus                         │
│  - Stale-while-revalidate                                    │
│  - Optimistic updates                                         │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Local Component State (useState / useReducer)               │
│  - Form inputs                                                │
│  - UI toggles (modals, dropdowns, accordions)               │
│  - Local derived data                                         │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  URL State (Search Params)                                   │
│  - Filter / Sort state (shareable via link)                  │
│  - Pagination                                                 │
│  - Tab selection                                              │
└─────────────────────────────────────────────────────────────┘
```

**状态管理原则**：
1. 状态下沉到最低可用层级（避免过早全局化）
2. 服务器状态 = TanStack Query 全权管理，不混入 useState
3. 表单状态 = React Hook Form (uncontrolled 默认模式)
4. 复杂交互状态 = useReducer + Context
5. 多页面共享 = URL Search Params

---

## 4. 后端框架与核心库

### 4.1 Web 框架：Hono

| 特性 | 说明 |
|------|------|
| 路由 | 基于中间件模式的洋葱圈架构 |
| HTTP 适配器 | Vercel Edge Functions, Node.js, Cloudflare Workers |
| 类型安全 | 与 Zod, tRPC 完全集成 |
| 性能 | 比 Express 快 ~2x, 接近 Fastify |
| 中间件 | CORS, Rate Limit, Compression, Logger |

**典型中间件栈**：
```typescript
// 请求顺序
app.use("*", cors())           // 1. CORS
app.use("*", compress())       // 2. 压缩
app.use("*", logger())         // 3. 请求日志
app.use("*", rateLimiter())    // 4. 限流
app.use("*", authMiddleware()) // 5. 鉴权
```

### 4.2 tRPC 端到端 API

**架构优势**：
- 输入输出完全类型安全（无需 OpenAPI / JSON Schema）
- 自动生成客户端调用代码，零类型转换
- 程序支持 Subscriptions (WebSocket)
- Request 级上下文注入（DB, User, Permissions）

**调用链路**：
```
Browser tRPC Client
       │
       ▼
tRPC HTTP Link (Batching + Abort Signal)
       │
       ▼
Hono tRPC Adapter
       │
       ▼
Procedure Middleware Stack
  ├─ authMiddleware()
  ├─ rateLimitMiddleware()
  ├─ organizationGuard()
  └─ websiteGuard()
       │
       ▼
Procedure Handler (input validated by Zod)
       │
       ▼
Drizzle ORM DB Query
       │
       ▼
Serializer (确保不暴露敏感字段)
```

### 4.3 Drizzle ORM

| 特性 | 说明 |
|------|------|
| 类型安全 | SQL 查询的每一列都有类型 |
| 零运行时代价 | 编译期生成代码，无反射开销 |
| Migration | SQL-down, SQL-first, 自动生成 diff |
| 关系查询 | 支持 JOIN / Eager Load / Lazy Load |
| 原生支持 | PostgreSQL, MySQL, SQLite, Cloudflare D1 |

**查询示例**：
```typescript
// 类型安全的 JOIN + WHERE + LIMIT
const conversations = await db
  .select({
    id: conversation.id,
    visitorName: visitor.name,
    messagePreview: sql<string>`left(${timelineItem.message}, 100)`,
    assigneeName: user.name,
  })
  .from(conversation)
  .leftJoin(visitor, eq(conversation.visitorId, visitor.id))
  .leftJoin(user, eq(conversation.assigneeUserId, user.id))
  .where(
    and(
      eq(conversation.websiteId, websiteId),
      eq(conversation.status, "open")
    )
  )
  .orderBy(desc(conversation.updatedAt))
  .limit(50);
```

---

## 5. AI 与向量基础设施

### 5.1 模型网关：OpenRouter

| 特性 | 说明 |
|------|------|
| 统一 API | 调用 100+ 模型使用同一套 OpenAI-compatible 接口 |
| Fallback 机制 | 模型不可用时自动降级 |
| 消费统计 | 按 token / 按模型 / 按项目 计量计费 |
| BYOK 支持 | 客户自带 API Key 直接计费 |

**支持的主流模型**：
| Provider | 模型 | 典型用途 |
|----------|------|----------|
| **OpenAI** | GPT-4o / GPT-4 Turbo | 主力模型，高质量回复 |
| **OpenAI** | GPT-3.5 Turbo | 快速、低成本 |
| **Anthropic** | Claude 3 Opus | 长上下文、RAG 检索 |
| **Anthropic** | Claude 3 Sonnet | 平衡性能/成本 |
| **Mistral** | Large 2 | 多语言、工具调用 |

### 5.2 Embedding 模型

| 模型 | 维度 | 成本 | 用途 |
|------|------|------|------|
| **text-embedding-3-small** | 1536 | $0.02 / 1M tokens | 知识库向量检索（主力） |
| **text-embedding-3-large** | 3072 | $0.13 / 1M tokens | 高精度搜索（可选） |

### 5.3 pgvector 向量数据库

**部署方式**：标准 PostgreSQL 16+ + pgvector 0.7+ 扩展

**索引类型**：
| 索引 | 算法 | 场景 |
|------|------|------|
| HNSW | Hierarchical Navigable Small Worlds | 生产环境（高性能索引） |
| IVFFlat | Inverted File Flat | 小规模数据集（索引创建快，查询慢） |

**距离函数选择**：
```sql
-- 余弦相似度（推荐，归一化向量）
embedding <=> query_embedding

-- 欧氏距离
embedding <-> query_embedding

-- 内积
embedding <#> query_embedding
```

---

## 6. 实时消息基础设施

### 6.1 Redis + BullMQ

| 组件 | 版本 | 用途 |
|------|------|------|
| **Redis** | 7.x | 分布式缓存、Pub/Sub、Rate Limit |
| **BullMQ** | 5.x | 任务队列、延迟任务、重试机制 |

**队列定义**：

```
┌─────────────────────────────────────────────────────────┐
│  AI Generation Queue                                      │
│  Concurrency: 10                                         │
│  Jobs:                                                    │
│  - AI reply generation                                   │
│  - Conversation summarization                             │
│  - Knowledge embedding update                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Notification Queue                                       │
│  Concurrency: 50 (IO bound)                              │
│  Jobs:                                                    │
│  - Email sending (Resend / Nodemailer)                   │
│  - Webhook deliveries (third-party integrations)         │
│  - Push notifications (mobile / browser)                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Analytics Event Queue                                    │
│  Concurrency: 100                                        │
│  Jobs:                                                    │
│  - Tinybird event ingestion (fire-and-forget)             │
│  - Usage tracking aggregation                             │
└─────────────────────────────────────────────────────────┘
```

**BullMQ 高级特性使用**：
1. **Parent-child jobs**：Pipeline 多步骤工作流
2. **Delayed jobs**：SLA 超时提醒、后续跟进消息
3. **Rate Limiter**：外部 API 调用频率控制
4. **Repeatable jobs**：Cron 定时任务（账单结算、日报汇总）
5. **Concurrency control**：按资源类型控制并发（保护 OpenAI Rate Limit）

### 6.2 WebSocket 实时连接

**架构模式**：多实例 + Redis Pub/Sub 跨实例广播

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel Edge Network (Sticky Sessions)                       │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┐               ┌──────────────────────┐
    │  API Instance 1  │──────────────▶│                      │
    │  (WebSocket)     │◀──────────────│    Redis Pub/Sub     │
    └────────┬─────────┘               │                      │
             │                         └──────────┬───────────┘
    ┌────────┴────────┐                            │
    │  API Instance 2  │◀──────────────────────────┘
    │  (WebSocket)     │
    └────────┬─────────┘
             │
             ▼
    Browser Clients (React + WebSocket API)
```

**连接生命周期事件**：
- `connection` / `disconnect`
- `join:website:{id}` / `leave:website:{id}`
- `join:conversation:{id}` / `leave:conversation:{id}`
- `typing:start` / `typing:stop`
- `event:new-message` / `event:status-changed`

---

## 7. 数据分析与可视化

### 7.1 Tinybird 实时分析平台

**核心概念**：
| 概念 | 说明 |
|------|------|
| **Data Source** | 事件流存储（Append-only，列式存储） |
| **Materialized View** | 预聚合视图，增量更新，毫秒级查询 |
| **Pipe** | SQL 查询端点，带参数、缓存控制 |
| **API Endpoint** | Pipe 对外暴露的 HTTP 端点 |

**事件类型**：
- `presence_events`：访客上下线、在线状态
- `visitor_activity_events`：页面浏览、焦点、心跳
- `conversation_metrics`：对话开始、回复、解决、升级等
- `usage_events`：token 消耗、API 调用计数

### 7.2 Charting 方案

| 库 | 用途 | 特点 |
|----|------|------|
| **@tinybirdco/charts** | 时间序列图表 | Tinybird 原生集成，零配置 |
| **Recharts** | 自定义图表 | 完全可定制，React 生态集成 |
| **tremor** | Dashboard 组件 | 开箱即用的图表 + 指标卡片 |

---

## 8. 部署与基础设施

### 8.1 Vercel 部署架构

```
                     ┌──────────────────┐
                     │   Vercel DNS    │
                     │   (Worldwide)   │
                     └────────┬─────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│  Vercel Edge Network                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │  Tokyo  │  │  Seoul  │  │  SF     │  │  EU    │   │
│  │  Edge   │  │  Edge   │  │  Edge   │  │  Edge  │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
│         │           │          │           │           │
│         └───────────┴──────────┴───────────┘           │
│                      │                                     │
│                      ▼                                     │
│              GeoIP + Request Headers                       │
│              (CF-IPCity / CF-Region / CF-IPCountry)       │
└──────────────────────────────┬────────────────────────────┘
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
          ▼                                         ▼
┌─────────────────────┐                ┌──────────────────────────────┐
│  Edge Function      │                │  Serverless Function         │
│  (tRPC Subscriptions)│                │  (tRPC Queries + Mutations)  │
│  Duration: 30s max  │                │  Duration: 15s/60s/300s      │
└─────────────────────┘                └──────────────┬───────────────┘
                                                       │
          ┌────────────────────────────────────────────┴───────────┐
          │                        │                                │
          ▼                        ▼                                ▼
┌──────────────────┐  ┌──────────────────────┐  ┌───────────────────────────────┐
│  PostgreSQL      │  │  Redis (Upstash)    │  │  External APIs               │
│  (Primary DB)    │  │  (Cache + BullMQ)   │  │  OpenAI / OpenRouter         │
│  + pgvector      │  │  (Redis 7+)         │  │  Tinybird                    │
│  + TimescaleDB   │  │  - Persistence      │  │  Polar.sh                    │
│  (Time-series)   │  │  - TTL              │  │  Resend                      │
└──────────────────┘  └──────────────────────┘  └───────────────────────────────┘
```

### 8.2 数据库

| 数据库 | 版本 | 用途 | 部署 |
|--------|------|------|------|
| **PostgreSQL** | 16+ | 主数据库（关系型 + 向量） | Supabase / AWS RDS |
| **pgvector** | 0.7+ | 向量索引扩展 | PostgreSQL 扩展 |
| **TimescaleDB** | 2.13+ | 时序数据优化（分析数据） | PostgreSQL 扩展 |
| **Redis** | 7+ | 缓存、Pub/Sub、任务队列 | Upstash / Vercel KV |

**PostgreSQL 关键配置**：
```sql
-- 连接池配置
max_connections = 100
shared_buffers = 25% RAM
effective_cache_size = 75% RAM

-- pgvector 优化
maintenance_work_mem = 2GB  -- HNSW 索引构建
work_mem = 64MB            -- 排序操作

-- 时序优化 (TimescaleDB)
timescaledb.max_background_workers = 8
```

**数据库连接池模式**：
```
┌─────────────────────────────────────────────────────┐
│  Application Servers (10+ instances)                │
│  ├─ Each with local pool: 10 connections           │
│  └─ Total app connections: 100+                     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  PgBouncer (Transaction Pooling)                    │
│  ├─ Pool size: 20-30 active connections             │
│  └─ Transaction-level pooling (lower latency)       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
          PostgreSQL (max_connections = 100)
```

---

## 9. 开发者体验

### 9.1 Monorepo 工具链

| 工具 | 用途 | 配置 |
|------|------|------|
| **Turborepo** | Task orchestration, build caching | `turbo.json` |
| **pnpm** | Package manager, workspace | `pnpm-workspace.yaml` |
| **Changesets** | Version management, changelogs | `.changeset/` |

**Turborepo Pipeline 配置**：
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "lint": {},
    "typecheck": {},
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 9.2 代码质量工具

| 工具 | 职责 | 执行时机 |
|------|------|----------|
| **Biome** | Lint + Format + Import sort | pre-commit, CI |
| **TypeScript** | 类型检查 | pre-push, CI |
| **Vitest** | 单元测试 | pre-push, CI |
| **Playwright** | E2E 测试 | CI, PR gate |

**Biome 配置原则**：
- Format：一致的代码风格（2 spaces, semicolons, trailing commas）
- Lint：strict 模式，no unused imports/variables
- Import sort：按组排序（builtin → external → internal）

### 9.3 本地开发环境

**一键启动命令**：
```bash
# 完整开发环境
pnpm dev

# 单独启动服务
pnpm dev:api      # API 服务 (localhost:3001)
pnpm dev:web      # Web 前端 (localhost:3000)
pnpm dev:workers  # Worker 服务

# 数据库操作
pnpm db:generate  # Drizzle 生成迁移
pnpm db:migrate   # 执行迁移
pnpm db:studio    # 数据库 GUI
```

**环境变量管理**：
```
.env.example      # 模板文件（提交到 Git）
.env.local        # 本地开发配置（忽略）
.env.development  # 开发环境共享配置
.env.production   # 生产环境配置
```

---

## 10. 安全与合规

### 10.1 身份认证与授权

| 层级 | 机制 | 说明 |
|------|------|------|
| **Authentication** | NextAuth.js / Auth.js | OAuth, Email Magic Link |
| **Session** | JWT + HttpOnly Cookie | Secure, SameSite=Lax |
| **Authorization** | tRPC Middleware | 按组织/网站权限隔离 |
| **Rate Limiting** | Redis + Fixed Window | 按 IP / User 限流 |

**权限模型**：
```typescript
// Role-based Access Control
enum Role {
  OWNER = "owner",      // 完全权限（包括删除、计费）
  ADMIN = "admin",      // 管理权限（成员、设置）
  AGENT = "agent",      // 客服权限（对话、访客）
  VIEWER = "viewer"     // 只读权限
}
```

### 10.2 数据安全

**加密策略**：
| 数据类型 | 加密方式 | 存储位置 |
|----------|----------|----------|
| 用户密码 | bcrypt (12 rounds) | 数据库 |
| API Keys | AES-256-GCM | 数据库（加密存储） |
| PII 数据 | 字段级加密 | 数据库 |
| 传输中 | TLS 1.3 | 网络层 |

**敏感数据处理**：
1. 日志脱敏：自动屏蔽 email, phone, token 等字段
2. 数据库审计：所有数据修改记录 `createdBy` / `updatedBy`
3. 数据保留：按 GDPR / CCPA 要求设置保留策略
4. 数据删除：软删除 + 定时硬清理（30天后）

### 10.3 CORS 与安全头

**Hono 安全中间件配置**：
```typescript
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(","),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

app.use(
  "*",
  secureHeaders({
    xFrameOptions: "DENY",
    xXssProtection: "1; mode=block",
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  })
);
```

---
## 11. 监控与可观测性

### 11.1 日志聚合

| 层级 | 工具 | 特点 |
|------|------|------|
| **应用日志** | Vercel Logs + Datadog | 结构化 JSON, 实时流式 |
| **数据库日志** | PostgreSQL pg_stat_statements | 慢查询分析, 查询性能 |
| **Redis 监控** | Upstash Metrics | 内存使用率, 命令延迟 |

**结构化日志格式**：
```typescript
// 标准日志字段
interface LogEntry {
  timestamp: string;      // ISO 8601
  level: "debug" | "info" | "warn" | "error";
  service: "api" | "web" | "workers";
  traceId?: string;       // OpenTelemetry Trace ID
  userId?: string;
  websiteId?: string;
  message: string;
  duration?: number;      // ms
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### 11.2 性能监控 (APM)

**关键指标**：
| 指标类别 | 具体指标 | 告警阈值 |
|----------|----------|----------|
| **API 延迟** | p50, p95, p99 响应时间 | p95 > 2s 告警 |
| **数据库** | 查询延迟, 连接池使用率 | > 80% 告警 |
| **Redis** | 命中 miss 率, 内存使用率 | miss rate > 20% 告警 |
| **AI API** | Token 消耗速率, 失败率 | 失败率 > 5% 告警 |

**Vercel Analytics 集成**：
- Web Vitals (LCP, FID, CLS)
- 自定义事件追踪
- 地区性能热力图

### 11.3 错误追踪

| 工具 | 用途 | 关键特性 |
|------|------|----------|
| **Sentry** | 前端 + 后端错误捕获 | Source Maps, 堆栈跟踪, 用户上下文 |
| **LogRocket** | 前端会话重放 | 用户行为回放, 网络请求记录 |

**错误分级策略**：
1. **CRITICAL**：系统不可用（数据库连接失败, 500 错误率 > 10%）
   - 即时通知：电话 + Slack + 邮件
2. **HIGH**：核心功能受损（AI 回复失败率 > 5%, WebSocket 断开异常）
   - 15分钟内响应：Slack + 邮件
3. **MEDIUM**：边缘功能异常
   - 每日汇总邮件
4. **LOW**：调试信息
   - 仅日志记录

---

## 12. 第三方服务集成

### 12.1 AI 服务

| 服务 | 集成方式 | 用途 | Fallback |
|------|----------|------|----------|
| **OpenRouter** | REST API | LLM 模型网关 | 本地缓存回复 |
| **OpenAI** | 官方 SDK | Embedding 生成 | text-embedding-3-small → large |
| **Replicate** | REST API | 开源模型运行 | N/A |

**调用重试策略**：
```typescript
// 指数退避 + 抖动
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,   // 1s
  maxDelay: 10000,      // 10s
  backoffFactor: 2,
  jitter: true
};
```

### 12.2 通信服务

| 服务 | 用途 | 特性 |
|------|------|------|
| **Resend** | 邮件发送 | 事务邮件, 营销邮件, 模板管理 |
| **Twilio** | 短信通知 | SLA 告警, 紧急通知 |
| **Slack API** | 团队通知 | 新对话提醒, 升级提醒 |

### 12.3 计费与支付

| 服务 | 用途 | 集成深度 |
|------|------|----------|
| **Polar.sh** | 订阅计费, 发票 | 深度集成 (单一可信源) |
| **Stripe** | 备用支付网关 | 轻量集成 |

### 12.4 对象存储

| 服务 | 用途 | 特性 |
|------|------|------|
| **Cloudflare R2** | 文件上传, 知识库附件 | S3 兼容, 零出口费 |
| **AWS S3** | 备份存储 | 合规归档, 生命周期管理 |

**文件处理流程**：
```
用户上传文件
     │
     ▼
前端签名请求 (tRPC mutation)
     │
     ▼
直接上传到 R2 (Presigned URL)
     │
     ▼
回调通知 API 服务
     │
     ▼
异步处理：
  ├─ 生成缩略图
  ├─ 内容提取 (PDF / DOCX / TXT)
  ├─ 向量化并存入知识库
  └─ 更新数据库记录
```

---

## 13. 技术选型总结

### 13.1 核心原则

1. **类型安全优先**：全栈 TypeScript, 端到端 tRPC, Drizzle ORM
2. **云原生架构**：Serverless + Edge, 按需扩展, 零运维
3. **开源优先**：使用成熟开源组件，减少供应商锁定
4. **性能预算**：API p95 < 2s, Web Vitals 全部达绿区
5. **开发者体验**：本地开发 < 30s 启动, Hot Module Replacement

### 13.2 技术债务管理

| 债务类型 | 处理策略 | 时间线 |
|----------|----------|--------|
| 代码重构 | 每次 sprint 预留 20% 时间 | 持续 |
| 依赖升级 | 每月批量更新 minor 版本 | 每月 |
| 性能优化 | 基于监控数据，优先解决 p95 瓶颈 | 季度 |
| 安全补丁 | 高优先级漏洞 24h 内修复 | 即时 |

### 13.3 未来技术路线

| 阶段 | 技术方向 | 目标 |
|------|----------|------|
| **Q3 2024** | WebAssembly 优化 | AI 推理部分本地运行 |
| **Q4 2024** | 边缘数据库 | Cloudflare D1 + 本地缓存 |
| **Q1 2025** | 多模态支持 | 图片理解, 语音识别 |
| **Q2 2025** | 私有化部署 | Docker Compose, Kubernetes |

---
