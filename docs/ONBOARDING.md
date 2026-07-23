# Cossistant 入职指南

## 项目概览

**Cossistant** 是一个开源的 React 聊天支持 widget，专为开发人员设计，提供灵活、可定制的聊天解决方案。项目采用代码优先、API 驱动的理念，提供无头组件、实时消息传递和完整的后端基础设施。

### 技术栈
- **主要语言**: TypeScript (1,866 files), JavaScript, Python, SQL, CSS
- **框架**: React, Next.js, Hono, tRPC, Drizzle ORM, Tailwind CSS
- **实时通信**: WebSockets
- **部署**: Docker, AWS 基础设施
- **架构**: Turborepo 单仓库，多包管理

### 项目统计
- **总文件数**: 2,316 个
- **复杂度**: 非常大（very-large）
- **分析时间**: 2026-07-22

---

## 架构层次

### 1. 前端层（Frontend Layer）
**用户界面和客户端逻辑**

包含以下组件：
- **@cossistant/react** - React SDK，提供 100+ 个无头组件和完整的 Hooks 系统
- **@cossistant/browser** - 浏览器端轻量级嵌入组件，支持 script 标签直接嵌入
- **@cossistant/next** - Next.js 特定绑定和工具
- **apps/web** - Next.js 管理界面

### 2. 核心层（Core Layer）
**核心库和共享逻辑**

- **@cossistant/core** - 核心库，负责 API 连接和数据管理
  - API 客户端（REST + WebSocket）
  - 实时事件监听和处理
  - 状态管理和缓存
  - 访客跟踪和识别

### 3. 后端层（Backend Layer）
**服务器端 API 和服务**

- **apps/api** - 基于 Hono 的后端 API 服务器
  - REST 和类型安全的 tRPC API
  - WebSocket 实时通信
  - AI 对话处理和工具调用
  - PostgreSQL 数据库 + Drizzle ORM

- **apps/workers** - BullMQ 后台工作进程
  - 异步任务处理（AI 对话、邮件发送）
  - 队列管理和任务调度
  - 错误处理和重试机制

- **apps/geoip** - Python 地理 IP 服务
  - 访客位置定位
  - IP 地址解析

### 4. 示例层（Examples Layer）
**示例应用和演示代码**

- **examples/nextjs-tailwind** - Next.js + Tailwind CSS 示例应用
- **examples/react-vite** - React + Vite 示例应用

### 5. 文档层（Documentation Layer）
**项目文档和架构说明**

- **README.md** - 项目说明文档
- **docs/ARCHITECTURE.md** - 详细架构文档
- **docs/AI_CONVERSATION_ARCHITECTURE.md** - AI 对话系统架构
- **docs/BILLING_ARCHITECTURE.md** - 计费系统架构

### 6. 基础设施层（Infrastructure Layer）
**部署和运营资源**

- **infra/aws** - AWS 基础设施配置
- **tinybird** - Tinybird 实时分析服务
- **package.json** - Turborepo 项目配置

---

## 关键概念

### 1. 无头组件架构
Cossistant 采用无头组件设计，提供高度可定制的 UI 组件，允许开发人员完全控制外观和行为。

### 2. 实时通信
基于 WebSocket 和 Redis Pub/Sub 的实时通信系统，支持：
- 消息推送
- 打字状态指示
- 已读状态更新
- 在线状态跟踪

### 3. 双管道 AI 对话系统
- **主管道**：实时对话处理，包含 intake、decision、generation 三个阶段
- **后台管道**：对话维护，包括标题生成、内容分类、情感分析

### 4. 工具生态系统
支持多种工具集成：
- 搜索工具：语义搜索和知识库检索
- 爬取工具：Firecrawl 网页爬取
- 代码工具：代码执行和调试
- 文件工具：文件解析和处理

---

## 引导式导览

### 步骤 1：项目概览
从 README.md 开始，了解项目的目的和架构。

### 步骤 2：前端 SDK
探索 @cossistant/react 包，查看无头组件和 Hooks 系统。

### 步骤 3：核心库
学习 @cossistant/core 如何管理 API 连接和数据。

### 步骤 4：后端 API
查看 apps/api 目录，了解 API 服务器架构和 AI 对话处理。

### 步骤 5：工作进程
探索 apps/workers，了解后台任务处理机制。

### 步骤 6：示例应用
查看 examples/nextjs-tailwind 和 examples/react-vite，了解如何使用 Cossistant。

### 步骤 7：基础设施
了解部署和监控系统，包括 AWS 配置和 Tinybird 分析服务。

---

## 文件地图

### 主要源文件位置

#### 前端相关
```
packages/react/           # React SDK
├── src/
│   ├── components/      # 100+ 无头组件
│   ├── hooks/           # 核心 Hooks
│   └── index.ts         # 入口文件

packages/core/            # 核心库
├── src/
│   ├── api/            # API 连接管理
│   ├── store/          # 状态管理
│   └── index.ts

packages/browser/        # 浏览器嵌入组件
├── src/
│   └── index.ts

apps/web/                # Next.js 管理界面
├── src/
│   ├── app/            # 页面路由
│   ├── components/     # UI 组件
│   └── lib/            # 工具函数
```

#### 后端相关
```
apps/api/                # Hono API 服务器
├── src/
│   ├── ai-pipeline/    # AI 对话流水线
│   ├── db/             # Drizzle ORM 数据库
│   ├── rest/           # REST API 路由
│   ├── trpc/           # tRPC 路由
│   ├── ws/             # WebSocket 连接
│   └── services/       # 业务服务

apps/workers/           # BullMQ 工作进程
├── src/
│   ├── jobs/          # 后台任务
│   └── worker.ts

apps/geoip/            # 地理 IP 服务
├── src/
│   └── main.py
```

#### 基础设施
```
infra/aws/             # AWS 配置
tinybird/             # 实时分析服务
├── datasources/
├── endpoints/
└── pipes/
```

---

## 复杂度热点

### 需要特别关注的区域

#### 1. AI 对话系统
**位置**: `apps/api/src/ai-pipeline/`

包含复杂的决策流程：
- 主管道：实时对话处理
- 后台管道：维护任务
- 工具调用系统
- 多模型支持（OpenAI、Anthropic、OpenRouter）

#### 2. 实时通信系统
**位置**: `apps/api/src/ws/`

基于 WebSocket 的复杂通信系统：
- 连接管理
- 事件广播和订阅
- Redis Pub/Sub 集成
- 消息推送机制

#### 3. 数据库架构
**位置**: `apps/api/src/db/`

复杂的数据库模型：
- 对话管理（conversations、messages）
- 知识库管理（knowledge）
- AI 代理（ai_agents）
- 访客跟踪（visitors）
- 向量存储（pgvector）

#### 4. 前端组件库
**位置**: `packages/react/src/`

包含 100+ 个无头组件：
- 组件状态管理
- 可访问性支持
- 主题和样式系统
- 文件上传和处理

---

## 快速开始

### 本地开发

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建项目
bun run build

# 运行测试
bun run test
```

### 常用命令

```bash
# 代码格式化
bun run format

# 类型检查
bun run typecheck

# 查看项目结构
bun run ls:all
```

---

## 学习资源

### 官方文档
- [Cossistant 文档](https://cossistant.com/docs)
- [快速入门指南](https://cossistant.com/docs/quickstart)
- [贡献者指南](https://cossistant.com/docs/others/contributors)

### 架构文档
- `docs/ARCHITECTURE.md` - 详细架构说明
- `docs/AI_CONVERSATION_ARCHITECTURE.md` - AI 系统架构
- `docs/REALTIME_ARCHITECTURE.md` - 实时通信架构

### 示例应用
- `examples/nextjs-tailwind/` - Next.js 示例
- `examples/react-vite/` - React 示例

---

## 联系信息

- **问题报告**: [GitHub Issues](https://github.com/cossistant/cossistant/issues)
- **讨论**: [Discord 社区](https://discord.gg/vQkPjgvzcc)
- **支持**: 发送邮件至 anthony@cossistant.com

---

## 许可证

该项目使用 AGPL-3.0 许可证（非商业用途）。商业用途需要联系获取商业许可证。

