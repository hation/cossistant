# Cossistant 项目架构文档

## 概述

**Cossistant** 是一个开源的 React 聊天支持组件系统，提供无头组件、实时消息传递和完整的后端基础设施，以代码优先、API 驱动的理念优先考虑开发者体验和 AI 友好文档。

---

## 目录

- [项目结构](#项目结构)
- [核心应用架构](#核心应用架构)
- [技术栈](#技术栈)
- [主要功能](#主要功能)
- [数据流程](#数据流程)
- [AI 集成](#ai-集成)

---

## 项目结构

### Monorepo 架构

```
cossistant/
├── apps/                    # 应用程序
│   ├── api/               # Hono API 服务器
│   ├── web/               # Next.js Web 前端
│   ├── workers/           # BullMQ 后台工作进程
│   ├── facehash-landing/  # FaceHash 产品着陆页
│   └── geoip/             # Python 地理 IP 服务
│
├── packages/              # 可重用包
│   ├── browser/           # 浏览器嵌入组件
│   └── core/              # 核心功能
│
├── examples/              # 示例应用
│   ├── nextjs-tailwind/  # Next.js + Tailwind 示例
│   └── react-vite/       # React + Vite 示例
│
├── docs/                  # 项目文档
├── infra/                 # 基础设施配置
│   └── aws/              # AWS 资源配置
├── .changeset/           # Changeset 配置
└── package.json          # Monorepo 根配置
```

---

## 核心应用架构

### 1. apps/api/ - Hono API 服务器

**职责**：提供 REST API、tRPC、WebSocket 和 AI 对话处理

```
apps/api/src/
├── ai-pipeline/                # AI 对话流水线
│   ├── primary-pipeline/
│   │   └── steps/decision/smart/model-runner.ts
│   ├── background-pipeline/
│   │   └── title-review.ts
│   ├── logger.ts
│   └── index.ts
├── db/                         # Drizzle ORM 数据库
│   ├── schema/               # 数据库表定义
│   │   ├── ai-agent.ts
│   │   ├── conversation.ts
│   │   ├── knowledge.ts
│   │   └── website.ts
│   ├── queries/              # 数据库查询
│   └── mutations/            # 数据库变更
├── lib/                        # 工具库
│   ├── ai.ts                # AI 模型配置
│   ├── ai-credits/          # AI 计费系统
│   ├── plans/               # 订阅计划配置
│   ├── polar.ts             # Polar 集成
│   ├── env.ts               # 环境变量管理
│   └── embedding-client.ts  # 嵌入模型客户端
├── rest/                       # REST API 路由
│   ├── middleware/
│   └── routers/
│       ├── ai-agent.ts
│       ├── knowledge.ts
│       ├── messages.ts
│       └── website.ts
├── trpc/                       # tRPC 路由
│   ├── middleware/
│   └── routers/
├── ws/                         # WebSocket 连接处理
│   ├── connection-registry.ts
│   ├── realtime-pubsub.ts
│   ├── router.ts
│   └── socket.ts
├── services/                   # 业务服务
│   ├── firecrawl.ts         # 网页爬取
│   ├── geoip.ts             # 地理 IP
│   └── upload.ts            # 文件上传
├── workflows/                  # 工作流处理
├── resend/                     # Resend 邮件服务
├── ses/                        # AWS SES 邮件
└── index.ts                   # 服务入口点
```

**关键文件**：
- `apps/api/src/env.ts` - 环境变量定义
- `apps/api/src/lib/ai.ts` - AI 模型和提供方配置
- `apps/api/src/ai-pipeline/` - AI 对话流水线

### 2. apps/web/ - Next.js Web 前端

**职责**：提供管理界面、文档和着陆页

```
apps/web/src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/         # 仪表板界面
│   ├── (lander-docs)/       # 着陆页和文档
│   ├── api/                # API 路由
│   ├── layout.tsx
│   └── providers.tsx
├── components/                 # React 组件
│   ├── ui/                 # shadcn/ui 组件
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── sidebar.tsx
│   ├── globe/
│   └── seo/
├── lib/                        # 工具库
│   ├── auth/               # 认证
│   ├── trpc/               # tRPC 客户端
│   ├── llm.tsx            # LLM 集成
│   ├── utils.ts
│   └── date.ts
├── registry/                   # 组件注册
│   ├── next/
│   └── react/
└── hooks/                      # React Hooks
    ├── use-config.ts
    └── use-mobile.ts
```

**关键文件**：
- `apps/web/src/app/providers.tsx` - 应用提供方配置
- `apps/web/src/app/layout.tsx` - 根布局

### 3. apps/workers/ - 后台工作进程

**职责**：处理异步任务和后台队列

```
apps/workers/src/
├── queues/                     # BullMQ 队列处理
│   └── index.ts
├── db.ts                      # 数据库连接
├── env.ts                     # 环境变量
├── realtime.ts                # 实时通信
└── index.ts                   # 工作进程入口
```

### 4. apps/geoip/ - Python 地理 IP 服务

```
apps/geoip/src/
├── main.py
├── config.py
├── database.py
└── models.py
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **运行时** | Bun 1.3.1 | JavaScript/TypeScript 运行时 |
| **Monorepo** | Turborepo | 管理多包项目 |
| **前端** | Next.js 16 + React + TypeScript | App Router |
| **API** | Hono + tRPC | 轻量级后端 + 类型安全 API |
| **数据库** | Drizzle ORM + PostgreSQL | TypeScript 优先 ORM |
| **缓存/队列** | Redis + BullMQ | 消息队列和任务调度 |
| **认证** | Better Auth | 现代认证解决方案 |
| **AI** | @ai-sdk | 支持多种 LLM 提供方 |
| **样式** | TailwindCSS + shadcn/ui | 实用优先 CSS + UI 组件 |
| **部署** | Docker + Docker Compose | 容器化部署 |
| **邮件** | Resend + AWS SES | 邮件发送服务 |
| **存储** | AWS S3 | 对象存储 |

---

## 主要功能

### 1. 聊天支持组件
- **Headless 组件** - 无 UI 的 React hooks 和原语
- **React SDK** - `@cossistant/react`
- **Next.js 绑定** - `@cossistant/next`

### 2. 实时消息
- WebSocket 实时通信
- PubSub 消息传递
- 连接管理

### 3. AI 对话
- 智能回复生成
- 知识库 RAG（检索增强生成）
- 多模型支持
- AI 计费和用量追踪

### 4. 知识库
- 文档分块和向量化
- 向量搜索
- 链接源管理

### 5. 访客追踪
- 网站访客识别
- 会话管理
- 在线状态

### 6. 计费系统
- 订阅计划管理
- AI 用量计费
- Polar 集成

---

## 数据流程

### 聊天消息流程

```
┌─────────────────┐
│   用户消息      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Web 前端 (Next.js)             │
│  - Support Widget               │
│  - WebSocket 连接               │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  API 服务器 (Hono)              │
│  - WebSocket Router             │
│  - 连接管理                      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  AI Pipeline                    │
│  ┌─────────────────────────┐   │
│  │ 1. 分析消息             │   │
│  │ 2. 决定路由             │   │
│  │ 3. 调用模型             │   │
│  │ 4. 生成回复             │   │
│  └─────────────────────────┘   │
│  (apps/api/src/ai-pipeline/)   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  数据库 (PostgreSQL)            │
│  - 保存对话                     │
│  - 保存消息                     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  返回用户                       │
│  - WebSocket                    │
│  - UI 更新                      │
└─────────────────────────────────┘
```

### AI Pipeline 流程

```
用户消息
   ↓
[Phase 1] 预处理
   ↓
[Phase 2] 智能决策 (model-runner.ts)
   ├─ 使用 LLM 分析用户意图
   ├─ 决定是调用工具还是直接回复
   └─ 选择合适的模型
   ↓
[Phase 3] 工具调用（如需要）
   ├─ 知识库搜索
   ├─ 数据库查询
   └─ 其他工具
   ↓
[Phase 4] 生成最终回复
   ↓
[Phase 5] 后处理
   ├─ 标题生成 (title-review.ts)
   └─ 保存对话
   ↓
返回用户
```

---

## AI 集成

### 配置说明

**环境变量**（`apps/api/.env` 和 `apps/workers/.env`）：

```env
# AI 提供方选择
AI_PROVIDER=openai-compatible  # 或 openrouter

# OpenAI 兼容 API 配置
OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/plan/v3
OPENAI_API_KEY=your-api-key-here

# 模型配置
AI_MODEL_DEFAULT=deepseek-v4-pro
AI_MODEL_FAST=deepseek-v4-pro
AI_MODEL_SUMMARY=deepseek-v4-pro
AI_MODEL_EMBEDDING=doubao-embedding-vision
```

### 核心文件

| 文件 | 说明 |
|------|------|
| `apps/api/src/lib/ai.ts` | AI 模型和提供方配置 |
| `apps/api/src/ai-pipeline/primary-pipeline/steps/decision/smart/model-runner.ts` | 智能决策模型运行器 |
| `apps/api/src/ai-pipeline/background-pipeline/title-review.ts` | 标题生成和审查 |
| `apps/api/src/lib/ai-credits/config.ts` | AI 模型计费配置 |
| `apps/api/src/ai-pipeline/shared/generation/internal/attempt.ts` | 对话生成尝试 |

### 模型类型

- **Decision Model** - 决策模型：`deepseek-v4-pro`
- **Chat Model** - 对话模型：`deepseek-v4-pro`
- **Fast Model** - 快速模型：`deepseek-v4-pro`
- **Summary Model** - 摘要模型：`deepseek-v4-pro`
- **Embedding Model** - 嵌入模型：`doubao-embedding-vision`

### 最近修复（2026-07-22）

1. **移除 OpenRouter 依赖**
   - 直接使用 OpenAI 兼容 API
   - 重写 `model-runner.ts`
   - 重写 `title-review.ts`
   - 重写 `attempt.ts`

2. **配置 DeepSeek**
   - 添加 `deepseek-v4-pro` 到模型目录
   - 设置为默认模型

3. **环境变量管理**
   - 在 `env.ts` 添加新变量
   - 配置 `AI_PROVIDER=openai-compatible`

4. **域名验证**
   - 允许 `localhost` 用于开发
   - 修复域名清理逻辑

---

## 启动服务

### 使用 Docker Compose（推荐）

```bash
# 启动所有基础设施
docker compose up -d

# 运行数据库迁移
cd apps/api
bun run scripts/migrate.ts

# 运行数据种子
bun run scripts/seed.ts
```

### 启动各个服务

**API 服务器**（端口 8787）：
```bash
cd apps/api
bun run dev
```

**Workers**（端口 8790）：
```bash
cd apps/workers
bun run dev
```

**Web 前端**（端口 3000）：
```bash
cd apps/web
bun run dev
```

### 访问服务

| 服务 | URL | 说明 |
|------|-----|------|
| Web 前端 | http://localhost:3000 | 主应用和仪表板 |
| API | http://localhost:8787 | API 服务器 |
| AI DevTools | http://localhost:4983 | AI SDK 开发工具 |

---

## 数据库架构

### 核心表

| 表 | 说明 |
|----|------|
| `users` | 用户账户 |
| `organizations` | 组织 |
| `members` | 组织成员 |
| `websites` | 网站配置 |
| `ai_agents` | AI 代理配置 |
| `conversations` | 对话记录 |
| `messages` | 消息内容 |
| `knowledge` | 知识库内容 |
| `link_sources` | 链接源 |
| `api_keys` | API 密钥 |
| `feedback` | 用户反馈 |

---

## 开发命令

```bash
# 安装依赖
bun install

# 启动所有服务开发模式
bun run dev

# 构建所有包
bun run build

# 类型检查
bun run check-types

# 代码检查
bun run lint

# 代码修复
bun run fix

# 创建 changeset
bun run changeset
```

---

## 许可证

本项目采用 **AGPL-3.0** 许可证用于非商业用途。

### 商业使用

如需商业使用或需要设置费的部署，请联系：anthony@cossistant.com

---

*文档版本：1.0.0*
*最后更新：2026-07-22*
