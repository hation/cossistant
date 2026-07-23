# Cossistant 系统整体架构

| 文档版本 | 创建日期 | 基于代码版本 |
|---------|---------|-------------|
| v1.0 | 2026-07-22 | Git HEAD |

---

## 1. 系统概述

Cossistant 是一个 **无头 (Headless) 实时客户支持平台**，采用 **三应用 + 共享包** 的 Monorepo 架构，提供可嵌入的访客 Widget、AI 智能回复、实时消息、知识库 RAG、对话管理、计费订阅等完整功能。

**设计原则：**
- **开发者优先**：API 驱动、类型安全、完整文档
- **实时优先**：所有交互基于 WebSocket 实时通信
- **AI 原生**：深度集成大语言模型，智能自动化
- **多租户隔离**：Organization → Website 双层隔离
- **故障友好**：多级降级机制，Polar 故障不影响核心功能

---

## 2. 应用架构总览

### 2.1 三应用架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                            Cossistant 平台                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────┐  ┌───────────────────────┐  ┌─────────────┐  │
│  │   API 应用 (Hono)    │  │  Web 应用 (Next.js)    │  │  Workers    │  │
│  │   apps/api/          │  │    apps/web/          │  │  (BullMQ)    │  │
│  │   617 个文件         │  │    915 个文件         │  │  32 个文件   │  │
│  │                      │  │                        │  │              │  │
│  │  • REST/v1 API       │  │  • 仪表板 UI          │  │  • 5个队列   │  │
│  │  • tRPC 接口         │  │  • 文档站点            │  │  • BullMQ   │  │
│  │  • WebSocket 服务    │  │  • 访客 Widget         │  │  • 健康检查  │  │
│  │  • MCP Server        │  │  • Next.js App Router  │  │  • Bull Board│  │
│  │  • AI Pipeline       │  │                        │  │              │  │
│  │  • 知识库 RAG        │  │                        │  │              │  │
│  │  • 访客追踪/归因     │  │                        │  │              │  │
│  │  • 邮件发送          │  │                        │  │              │  │
│  │  • Polar 计费集成    │  │                        │  │              │  │
│  └──────────────────────┘  └───────────────────────┘  └──────────────┘  │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                        共享包 (packages/) 555 个文件                  │ │
│  │                                                                     │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │ │
│  │  │  types   │ │   core   │ │  redis   │ │ browser  │ │  memory   │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │ │
│  │  │   jobs   │ │ location │ │   tiny   │ │ markdown │ │ release   │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. API 应用核心结构

**代码路径**：`apps/api/src/` (465 个文件)

### 3.1 入口与核心路由

**主入口**：`apps/api/src/index.ts`

| 路由类型 | 路径前缀 | 说明 |
|---------|---------|------|
| **REST API** | `/v1` | 公开 REST 接口，剥离 Cookie，跨域访问 |
| **tRPC** | `/trpc` | 仪表板专用类型安全 API，会话认证，限流 |
| **WebSocket** | `/ws` | 实时消息连接，访客/客服实时通信 |
| **MCP** | `/mcp` | Model Context Protocol Server，AI 工具调用 |
| **Auth** | `/api/auth/*` | 认证端点，Better Auth 集成 |
| **Polar** | `/polar` | 计费 Webhook 与回调端点，可选启用 |
| **Resend** | `/resend` | 邮件发送服务集成 |
| **Workflow** | `/workflow` | 工作流路由 |
| **Knowledge** | `/api/knowledge-clarification` | 知识库澄清流端点 |
| **Health** | `/health` | 健康检查端点 |
| **OpenAPI** | `/openapi`, `/docs` | API 文档，Swagger UI |

### 3.2 核心模块目录

```
apps/api/src/
├── index.ts                    # 应用入口，路由挂载
├── env.ts                      # 环境变量定义与校验
├──
├── ai-pipeline/               # AI 对话管道 (130 个文件)
│   ├── index.ts               # 导出 Pipeline
│   ├── primary-pipeline/      # 实时主管道 (访客消息→AI 回复)
│   ├── background-pipeline/   # 异步后台管道 (标题生成、知识缺口分析)
│   ├── shared/                # 共享: 事件、进度、思考、知识澄清
│   └── logger.ts              # AI 执行日志
├──
├── realtime/                  # 实时事件发射器 (2 个文件)
│   ├── emitter.ts             # RealtimeEmitter 统一事件发送入口
│   └── support-state.ts       # 客服在线状态管理
├──
├── ws/                        # WebSocket 连接层 (6 个文件)
│   ├── socket.ts              # 连接建立/关闭、消息处理
│   ├── router.ts              # 事件路由与分发规则
│   ├── connection-registry.ts # 本地连接注册表与索引
│   └── realtime-pubsub.ts     # Redis Streams 跨实例事件总线
├──
├── db/                        # 数据库层 (66 个文件)
│   ├── index.ts              # Drizzle DB 实例
│   ├── schema/               # 数据表定义 (20+ 表)
│   ├── queries/              # 读查询
│   ├── mutations/            # 写操作
│   └── cache/                # Bun Redis 缓存
├──
├── lib/                      # 核心业务库 (58 个文件)
│   ├── plans/               # 订阅计划、计费配置
│   ├── ai-credits/          # AI 信用额度、计量、守护
│   ├── polar.ts             # Polar 计费平台集成
│   ├── auth.ts              # 认证初始化
│   ├── visitor-attribution.ts  # 访客来源归因
│   └── embedding-client.ts  # 向量嵌入客户端
├──
├── utils/                    # 工具函数 (56 个文件)
│   ├── access-control.ts    # 访问控制
│   ├── api-keys/           # API 密钥管理
│   ├── conversation-realtime.ts  # 对话实时工具
│   ├── websocket-connection.ts
│   ├── websocket-message.ts
│   ├── health.ts            # 健康检查逻辑
│   └── format-visitor.ts   # 访客数据格式化
├──
├── trpc/                     # tRPC 路由层 (38 个文件)
│   ├── init.ts             # tRPC 初始化
│   ├── middleware/         # 认证、组织上下文中间件
│   └── routers/            # 各功能模块 tRPC 路由
├──
├── rest/                     # REST API 层 (38 个文件)
│   ├── middleware/          # 认证中间件
│   ├── routers/            # REST 端点路由
│   ├── openapi.ts          # OpenAPI 规范生成
│   └── openapi-document.ts # API 文档
├──
├── mail/                     # 邮件服务 (14 个文件)
│   ├── config.ts           # 邮件配置
│   └── providers/          # Resend、SES 提供商
├──
├── lifecycle-email/         # 生命周期邮件 (7 个文件)
│   ├── content.ts          # 邮件内容模板
│   ├── eligibility.ts      # 发送资格判定
│   └── scheduling.ts       # 调度逻辑
├──
├── services/                # 业务服务 (12 个文件)
│   ├── firecrawl.ts       # 网页爬虫
│   ├── geoip.ts           # IP 地理位置
│   └── upload.ts          # 文件上传
├──
├── support-capabilities/    # 对话支持能力 (8 个文件)
│   ├── conversations.ts    # 对话 CRUD
│   └── errors.ts           # 错误定义
├──
├── workflows/               # 工作流 (8 个文件)
│   ├── constants.ts        # 常量定义
│   ├── index.ts            # 工作流入口
│   ├── message/            # 消息工作流
│   └── docs/              # 工作流文档
├──
├── middleware/              # 中间件 (1 个文件)
│   └── rate-limit.ts      # 全局限流 (auth, trpc, mcp, ws, default)
├──
├── polar/                   # Polar 集成 (1 个文件)
│   └── index.ts           # Polar Webhook 与客户端
├──
├── resend/                  # Resend 邮件集成 (2 个文件)
│   ├── index.ts
│   └── index.test.ts
├──
├── ses/                     # AWS SES 邮件集成 (2 个文件)
│   ├── index.ts
│   └── index.test.ts
├──
├── routes/                  # 特殊路由 (2 个文件)
│   └── knowledge-clarification-stream.ts  # 知识库澄清 SSE
├──
├── test-support/            # 测试辅助
├── mcp/                     # MCP 工具 (3 个文件)
│   ├── index.ts            # MCP Server 入口
│   └── tools.ts            # MCP 工具实现
└──
├── notifications/           # 通知 (2 个文件)
    └── marketing-email-preferences.ts
```

---

## 4. Workers 应用结构

**代码路径**：`apps/workers/src/` (23 个文件)

### 4.1 队列架构

**主入口**：`apps/workers/src/index.ts`

BullMQ 工作队列应用，负责异步任务处理，与 API 应用共享 Redis 和数据库。

```
apps/workers/src/
├── index.ts                # 应用入口，启动 Worker，注册 Bull Board
├── env.ts                  # 环境变量
├── db.ts                   # 数据库连接
├── queues/                 # 队列处理器定义
│   └── index.ts
└── logging/               # AI 代理对话日志捕获
    └── ai-agent-conversation-log-router.ts
```

### 4.2 队列清单

| 队列名称 | 说明 | 触发源 |
|---------|------|-------|
| **MESSAGE_NOTIFICATION** | 新消息邮件通知 | API 实时事件 |
| **AI_AGENT** | AI 代理主处理队列 | 访客消息 |
| **AI_AGENT_BACKGROUND** | AI 代理后台任务 (标题生成) | 对话状态变更 |
| **LIFECYCLE_EMAIL** | 生命周期邮件 (欢迎、使用提醒) | 定时触发 |
| **WEB_CRAWL** | 网页爬虫队列 (知识库导入) | 仪表板用户操作 |

### 4.3 Bull Board 管理界面

- 路径：`/queues`
- 认证：`X-Bull-Board-Token` Header 认证
- 功能：监控队列状态、查看等待/处理/失败任务、重试失败任务

---

## 5. Web 应用结构

**代码路径**：`apps/web/src/` (835 个文件)

### 5.1 核心架构

Next.js 14+ App Router 前端应用，包含：

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # 仪表板路由组 (需登录)
│   ├── (lander-docs)/     # 着陆页与文档路由组
│   └── providers.tsx      # React 上下文提供方 (Trpc, Theme 等)
├──
├── components/             # React 组件库
│   ├── ui/               # Shadcn/ui 组件 (Button, Dialog, Sidebar 等)
│   ├── globe/            # Globe 3D 组件
│   └── seo/             # SEO 元数据组件
├──
├── lib/                  # 前端工具库
│   ├── auth/            # 认证客户端
│   ├── trpc/            # tRPC 客户端配置
│   ├── date.ts          # 日期格式化
│   └── utils.ts         # 通用工具
├──
├── hooks/                # React Hooks
│   ├── use-config.ts
│   └── use-mobile.ts
├──
├── registry/             # 组件注册
│   ├── next/
│   └── react/
└──
├── content/              # 文档内容 (56 个文件，父目录级别)
    ├── changelog/       # 更新日志
    └── docs/           # 文档站点
```

---

## 6. 共享包架构

**代码路径**：`packages/*` (555 个文件)

### 6.1 包清单

| 包名 | 路径 | 文件数 | 核心功能 |
|-----|------|-------|---------|
| **@cossistant/types** | `packages/types/src/` | 大量 | 共享 TypeScript 类型定义 |
| **@cossistant/core** | `packages/core/src/` | 大量 | 核心认证、Store、授权 |
| **@cossistant/redis** | `packages/redis/src/` | 少 | Redis 连接、BullMQ 配置 |
| **@cossistant/browser** | `packages/browser/src/` | 中等 | 可嵌入 Widget 组件 |
| **@cossistant/memory** | `packages/memory/src/` | 大量 | 内存存储、Repository 模式 |
| **@cossistant/jobs** | `packages/jobs/src/` | 少 | 任务队列数据结构定义 |
| **@cossistant/location** | `packages/location/src/` | 少 | IP 地理位置 |
| **@cossistant/tiny-markdown** | `packages/tiny-markdown/src/` | 中等 | Markdown 渲染 |
| **@cossistant/release** | `packages/release/src/` | 中等 | 发布流程自动化 |

### 6.2 核心包示例

#### @cossistant/core

```
packages/core/src/
├── auth/              # 认证相关
└── store/            # 状态存储
```

#### @cossistant/memory

```
packages/memory/src/
├── repositories/      # Repository 模式实现
└── services/         # 业务服务
```

---

## 7. 跨应用数据流

### 7.1 访客消息实时处理流

```
访客浏览器 Widget
    │
    │ 1. 消息发送 (WebSocket)
    ▼
┌─────────────────────────────────────────────────────────┐
│  API 应用 - Hono WebSocket                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ socket.ts: upgradeWebSocket + message handler       │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                  │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │ connection-registry.ts: 注册连接，建立 visitor 索引│  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │ 2. 本地广播 + Redis 广播       │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │ realtime-pubsub.ts: Redis Streams XADD              │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │ 跨实例事件总线                  │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │ RealtimeEmitter.emit() 事件类型验证 + 路由          │  │
│  └──────────────────────┬─────────────────────────────┘  │
└─────────────────────────┼─────────────────────────────────┘
                          │ 3. 触发 AI Pipeline
┌─────────────────────────▼─────────────────────────────────┐
│  AI Pipeline Primary (实时)                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 决策: model-runner.ts → LLM 判定下一步动作           │ │
│  │ 工具调用: 知识库检索、数据库查询、发送消息            │ │
│  │ 生成回复                                               │ │
│  └──────────────────────┬─────────────────────────────┘ │
└─────────────────────────┼──────────────────────────────────┘
                          │ 4. 发送 AI 回复 (反向流)
                          │
                          ▼
               客服仪表板实时收到消息
```

### 7.2 计费与限流数据流

```
任何 API/tRPC/WebSocket 调用
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  middleware/rate-limit.ts                                │
│  5 类限流器: auth / trpc / mcp / ws / default            │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│  ai-credits/guard.ts: AI 信用守护                         │
│  • 检查余额是否足够                                        │
│  • Polar 故障时停电模式降级:                              │
│    → 允许基础模型，暂停高级模型，停止计量                   │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│  ai-credits/polar-meter.ts: 计量计费                      │
│  • 每次 AI 调用消费 1+N 信用                              │
│  • Redis 缓存余额，减少 Polar API 调用                    │
└───────────────────────────────────────────────────────────┘
```

---

## 8. 技术栈总览（摘要）

完整技术栈请参见 [10-TECH-STACK](./10-TECH-STACK.md)

| 层级 | 核心技术 | 版本 | 说明 |
|-----|---------|------|------|
| **运行时** | Bun | latest | 高性能 TypeScript 运行时 |
| **Monorepo** | Turborepo | latest | 构建缓存与任务编排 |
| **API 框架** | Hono | latest | 轻量、快速、Edge-ready |
| **API 协议** | tRPC + REST | latest | 类型安全 + 通用接口 |
| **前端框架** | Next.js App Router | 14+ | React 全栈框架 |
| **数据库** | PostgreSQL + Drizzle ORM | latest | 类型安全 SQL 查询 |
| **向量检索** | pgvector | latest | PostgreSQL 向量扩展 |
| **实时通信** | Bun Native WebSocket | builtin | 原生高性能 |
| **事件总线** | Redis Streams | 7+ | 跨 API 实例事件分发 |
| **任务队列** | BullMQ | latest | 可靠异步任务处理 |
| **认证** | Better Auth | latest | 全功能认证解决方案 |
| **计费** | Polar.sh | latest | SaaS 订阅与用量计费 |
| **AI SDK** | Vercel AI SDK | latest | 多模型统一接口 |
| **样式** | Tailwind CSS + Shadcn/ui | latest | 实用优先样式 |
| **邮件** | Resend + AWS SES | latest | 双邮件提供商 |

---

## 9. 关键设计模式

| 模式 | 应用场景 | 代码位置 |
|-----|---------|---------|
| **Repository 模式** | 数据访问抽象 | `packages/memory/src/repositories/` |
| **事件驱动架构** | 实时消息、AI 管道进度 | `realtime/emitter.ts`, `ws/router.ts` |
| **管道与过滤器** | AI 消息处理多步流程 | `ai-pipeline/primary-pipeline/steps/` |
| **状态机** | 对话状态流转 | `support-capabilities/conversations.ts` |
| **守护模式** | AI 信用、权限检查 | `ai-credits/guard.ts` |
| **断路器/降级** | Polar 故障时停电模式 | `ai-credits/polar-meter.ts` |
| **索引模式** | ConnectionRegistry 多维度索引 | `ws/connection-registry.ts` |
| **发布订阅** | Redis Streams 跨实例事件 | `ws/realtime-pubsub.ts` |

---

## 10. 外部依赖

| 服务 | 用途 | 是否必需 |
|-----|------|---------|
| **PostgreSQL** | 主数据库、向量检索 | ✅ 必需 |
| **Redis** | 缓存、会话、队列、事件总线 | ✅ 必需 |
| **Polar.sh** | 订阅计费、AI 信用计量 | ❌ 可选（可禁用） |
| **OpenAI/Deepseek/Anthropic** | LLM 推理 | ✅ 必需（可配置任意提供商） |
| **Resend / AWS SES** | 邮件发送 | ❌ 二选一，可禁用 |
| **Firecrawl** | 网页爬取 (知识库导入) | ❌ 可选 |

---

## 相关文档

- [03 实时消息系统](./03-REAL-TIME-MESSAGING.md)
- [04 AI 对话管道](./04-AI-CONVERSATION.md)
- [07 计费与订阅系统](./07-BILLING.md)
- [09 统一数据模型](./09-DATA-MODEL.md)
- [10 统一技术栈](./10-TECH-STACK.md)

---

*文档由代码分析自动生成，如有疑问请对照源代码核实。*
