# Cossistant 产品需求设计文档 - MVP v1.0 版本

| 文档版本 | v1.0 |
|---------|------|
| 产品版本 | MVP |
| 撰写日期 | 2026-07-22 |
| 产品名称 | Cossistant - 无头实时客户支持平台 |
| 文档状态 | 初稿 |

---

## 1. 产品概述

### 1.1 产品定位

**Cossistant** 是一个 **API 驱动的无头(Headless)实时客户支持平台**，专为开发者和 SaaS 团队设计，提供可嵌入的访客 Widget、AI 智能回复、实时消息通信、知识库 RAG 等完整客户支持基础设施。

**核心差异化**：
- ✅ **开发者优先**：完整 API 驱动，全栈 TypeScript 类型安全
- ✅ **实时优先**：WebSocket 毫秒级通信，Redis Streams 分布式事件总线
- ✅ **AI 原生**：双管道 AI 处理架构，智能决策引擎 + 知识库 RAG
- ✅ **故障友好**：多级降级机制，确保核心功能 99.9% 可用性
- ✅ **灵活可定制**：无头架构，前端完全可定制，不绑定特定 UI

### 1.2 MVP 版本目标

**MVP 核心目标**：验证产品核心价值，实现「访客 → 实时消息 → AI 回复 → 客服处理」的最小闭环。

| 目标类型 | 具体目标 | 成功指标 |
|---------|---------|---------|
| **功能闭环** | 访客可通过 Widget 发起对话，AI 可自动回复，客服可在仪表板响应 | 对话完整率 ≥ 95% |
| **性能目标** | 实时消息延迟 < 100ms，AI 响应时间 < 5s | P95 消息延迟 < 150ms |
| **稳定性目标** | 核心功能可用性 ≥ 99.5% | 系统无重大故障 |
| **规模目标** | 支持单租户 100 并发访客，10 并发客服 | 压力测试通过 |

### 1.3 目标用户

| 用户角色 | 核心诉求 | 使用场景 |
|---------|---------|---------|
| **SaaS 产品开发者** | 快速集成客户支持功能，无需从零构建 | 将 Widget 嵌入产品，数天内上线客服功能 |
| **初创团队客服负责人** | 低成本启动客服系统，AI 自动化减少人工 | 小团队处理客户咨询，AI 自动回答常见问题 |
| **独立开发者** | 轻量级客服解决方案，开箱即用 | 个人项目/小型产品的客户支持 |

---

## 2. 产品架构（MVP 范围）

### 2.1 系统整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    访客端 (Visitor Widget)                │
│              可嵌入 JS Widget，访客发起对话入口            │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                    客服端 (Dashboard)                     │
│              对话列表、消息处理、知识库管理                │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                    Hono API 后端                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ REST/v1  │ │   tRPC   │ │WebSocket │                 │
│  └──────────┘ └──────────┘ └──────────┘                 │
│  AI Pipeline | 实时事件总线 | 知识库 | 访客追踪 | 计费    │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                     基础设施层                            │
│          PostgreSQL (+ pgvector) | Redis Streams         │
└──────────────────────────────────────────────────────────┘
```

### 2.2 MVP 核心模块清单

| 模块名称 | 功能范围（MVP） | 优先级 |
|---------|----------------|--------|
| **租户管理模块** | 组织注册、网站创建、基础配置 | P0 |
| **认证与权限模块** | 用户注册登录、基本权限控制 | P0 |
| **访客 Widget 模块** | 可嵌入 Widget、对话发起 | P0 |
| **实时消息模块** | WebSocket 连接、消息收发、在线状态 | P0 |
| **AI 对话管道模块** | Primary Pipeline、单轮 AI 回复、基础工具 | P0 |
| **知识库模块** | 文章增删改查、手动录入、基础检索 | P0 |
| **对话管理模块** | 对话列表、消息历史、状态管理 | P0 |
| **客服仪表板模块** | 对话列表视图、消息处理界面 | P0 |
| **计费模块** | 免费计划配额限制、基础计量 | P1 |
| **访客追踪模块** | 基础在线状态、访客信息展示 | P1 |

---

## 3. 详细功能需求

### 3.1 租户管理模块

#### 3.1.1 组织（Organization）管理

**功能描述**：系统最高层级的租户隔离单位，拥有一个或多个网站。

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| ORG-001 | 用户注册时自动创建默认组织 | P0 |
| ORG-002 | 支持组织基本信息编辑（名称、头像、描述） | P0 |
| ORG-003 | 组织成员管理：邀请成员、角色分配（Owner/Member） | P0 |
| ORG-004 | 组织层面的全局配置管理 | P1 |

**数据字段**：
```
- id: ULID 主键
- name: 组织名称
- slug: 组织唯一标识（URL 友好）
- avatarUrl: 组织头像
- timezone: 组织时区
- createdAt/updatedAt: 时间戳
```

#### 3.1.2 网站（Website）管理

**功能描述**：计费和功能隔离的基本单位，每个网站独立配置、独立计费。

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| WEB-001 | 组织内可创建多个网站，每个网站对应一个产品/域名 | P0 |
| WEB-002 | 网站基本信息配置（名称、域名、品牌色、Logo） | P0 |
| WEB-003 | 网站级别的功能开关配置 | P0 |
| WEB-004 | 每个网站生成唯一的 Widget 嵌入代码 | P0 |
| WEB-005 | 网站 Widget 外观自定义（颜色、欢迎语、位置） | P0 |

**数据字段**：
```
- id: ULID 主键
- organizationId: 所属组织 ID
- name: 网站名称
- domain: 绑定域名
- brandColor: 品牌主题色
- welcomeMessage: Widget 欢迎语
- widgetPosition: Widget 位置（bottom-right/bottom-left）
- planId: 订阅计划
- createdAt/updatedAt: 时间戳
```

### 3.2 认证与权限模块

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AUTH-001 | 支持邮箱密码注册登录 | P0 |
| AUTH-002 | 支持 Magic Link 免密登录 | P0 |
| AUTH-003 | 组织内角色权限：Owner（全部权限）、Member（操作权限） | P0 |
| AUTH-004 | 会话管理：记住登录状态、登出功能 | P0 |
| AUTH-005 | 访客无需注册，通过 Widget 匿名对话 | P0 |

### 3.3 访客 Widget 模块

#### 3.3.1 Widget 嵌入

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| WIDGET-001 | 提供一行 JS 代码嵌入方式，复制粘贴即可使用 | P0 |
| WIDGET-002 | Widget 加载不影响宿主页面性能（异步加载） | P0 |
| WIDGET-003 | 支持多语言自动检测（根据访客浏览器语言） | P0 |

**嵌入代码示例**：
```html
<script defer src="https://widget.cossistant.io/embed.js" 
        data-website-id="ws_xxxxxxxxxxxx"></script>
```

#### 3.3.2 Widget 交互流程

```
访客进入页面
    │
    ▼
Widget 右下角悬浮按钮显示（品牌色）
    │
    ├─ 点击展开 → 欢迎消息 + 输入框
    │
    ├─ 输入消息发送
    │
    ├─ 实时显示 AI 或客服回复
    │
    └─ 支持发送图片/附件（MVP 仅支持纯文本）
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| WIDGET-004 | Widget 默认收起，点击展开对话窗口 | P0 |
| WIDGET-005 | 显示在线状态（客服在线/离线） | P0 |
| WIDGET-006 | 支持发送纯文本消息，实时显示发送状态 | P0 |
| WIDGET-007 | 消息气泡区分访客消息和客服/AI 消息 | P0 |
| WIDGET-008 | 显示"对方正在输入..."状态 | P0 |
| WIDGET-009 | AI 回复时显示打字动画效果 | P0 |

### 3.4 实时消息模块

#### 3.4.1 WebSocket 连接管理

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MSG-001 | Bun 原生 WebSocket，支持高并发连接 | P0 |
| MSG-002 | 连接建立时自动进行租户校验（Organization + Website） | P0 |
| MSG-003 | 断线自动重连（指数退避策略） | P0 |
| MSG-004 | 连接状态实时反馈给前端 | P0 |

#### 3.4.2 事件路由与分发

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MSG-005 | Redis Streams 跨实例事件总线，支持水平扩展 | P0 |
| MSG-006 | 事件类型：消息创建、对话状态变更、在线状态变更 | P0 |
| MSG-007 | 支持定向投递：特定访客、网站所有客服 | P0 |
| MSG-008 | 客服发送消息时排除发送者自己（不回显） | P0 |

#### 3.4.3 核心事件类型（MVP）

| 事件类型 | 触发场景 | 接收方 |
|---------|---------|--------|
| `visitor:message:created` | 访客发送新消息 | 访客 + 网站所有客服 |
| `user:message:created` | 客服发送消息 | 访客 + 网站其他客服 |
| `agent:message:created` | AI 自动回复 | 访客 + 网站所有客服 |
| `conversation:created` | 新对话创建 | 网站所有客服 |
| `presence:visitor:online` | 访客上线 | 网站所有客服 |
| `presence:visitor:offline` | 访客下线 | 网站所有客服 |

### 3.5 AI 对话管道模块（MVP 简化版）

#### 3.5.1 Primary Pipeline 实时响应

**功能描述**：访客发送消息后，AI 实时生成回复的处理流程。MVP 版本简化为单轮回复，无 Background Pipeline。

```
访客消息
    │
    ▼
Stage 1: Intake 上下文加载
    ├─ 验证 AI Agent 存在且激活
    ├─ 加载对话历史（最近 N 条消息）
    └─ 加载访客基本信息
    │
    ▼
Stage 2: Decision 决策层
    ├─ 确定性规则检查（空消息、人类命令等）
    └─ LLM 决策：是否需要回复、是否需要升级
    │
    ▼
Stage 3: Generation 生成层
    ├─ Prompt 构建（系统提示 + 对话历史）
    ├─ 工具集：知识库搜索 + 发送消息
    ├─ LLM 调用生成回复
    └─ 消息写入数据库 + 实时事件发射
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-001 | 支持 OpenAI GPT 模型作为基础 LLM | P0 |
| AI-002 | Primary Pipeline 三级流水线架构 | P0 |
| AI-003 | 确定性规则优先，减少不必要的 LLM 调用 | P0 |
| AI-004 | 支持知识库搜索工具，AI 可引用知识回答 | P0 |
| AI-005 | AI 回复消息实时推送给访客和客服 | P0 |
| AI-006 | 记录 Token 消耗，用于后续计量计费 | P0 |

#### 3.5.2 AI Agent 配置

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-007 | 每个网站可配置独立的 AI Agent | P0 |
| AI-008 | AI Agent 基础配置：名称、头像、欢迎语 | P0 |
| AI-009 | AI Agent 系统提示词自定义 | P0 |
| AI-010 | AI 功能开关（可关闭 AI，纯人工客服） | P0 |

### 3.6 知识库模块

#### 3.6.1 知识库文章管理

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| KB-001 | 支持手动创建知识库文章（富文本编辑器） | P0 |
| KB-002 | 文章分类：Article（长文）、FAQ（问答对） | P0 |
| KB-003 | 文章状态管理：草稿（Draft）→ 已发布（Published）→ 已归档（Archived） | P0 |
| KB-004 | 文章列表：按状态筛选、搜索、分页 | P0 |
| KB-005 | 文章编辑：标题、内容、分类标签 | P0 |

**文章数据字段**：
```
- id: ULID 主键
- organizationId/websiteId: 租户隔离
- title: 文章标题
- content: 文章内容（Markdown/HTML）
- type: article/faq
- status: draft/published/archived
- viewCount: 浏览次数
- aiUsedCount: AI 引用次数
- createdAt/updatedAt/publishedAt: 时间戳
```

#### 3.6.2 向量检索基础能力

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| KB-006 | 文章发布时自动生成向量嵌入（Embedding） | P0 |
| KB-007 | 支持 pgvector 余弦相似度检索 | P0 |
| KB-008 | AI 对话时自动检索相关知识库文章 | P0 |
| KB-009 | 检索结果 Top K 可配置（默认 3 条） | P0 |
| KB-010 | 检索相似度阈值可配置（默认 0.7） | P0 |

### 3.7 对话管理模块

#### 3.7.1 对话生命周期

**对话状态流转**：
```
open（新对话，待处理）
    │
    ├─ pending（处理中，已分配坐席）
    │
    ├─ resolved（已解决）
    │
    └─ closed（已关闭）
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| CONV-001 | 访客发送第一条消息时自动创建新对话 | P0 |
| CONV-002 | 对话状态：open/pending/resolved/closed | P0 |
| CONV-003 | 对话分配：可手动分配给客服人员 | P0 |
| CONV-004 | 对话标记解决/重新打开 | P0 |
| CONV-005 | 对话参与者：访客 + 分配的客服 + AI Agent | P0 |

#### 3.7.2 对话时间线（Timeline Item）

**功能描述**：单表多态设计，统一存储消息、状态变更、系统事件等所有对话内活动。

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| CONV-006 | 时间线类型：消息类、状态变更类、AI 行为类、系统事件类 | P0 |
| CONV-007 | 可见性分层：public（访客可见）、private（仅客服可见） | P0 |
| CONV-008 | 发送者区分：visitor、human_agent、ai_agent、system | P0 |
| CONV-009 | AI 消息附带 Token 消耗统计 | P0 |
| CONV-010 | 消息时间顺序排列，支持无限滚动加载 | P0 |

### 3.8 客服仪表板模块

#### 3.8.1 对话列表视图

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| DASH-001 | 左侧对话列表，按状态分组（全部、待处理、处理中、已解决） | P0 |
| DASH-002 | 对话卡片显示：访客头像、最新消息预览、时间、状态标签 | P0 |
| DASH-003 | 对话列表按最后活跃时间倒序排列 | P0 |
| DASH-004 | 新对话到达时桌面通知 + 声音提醒 | P0 |
| DASH-005 | 搜索功能：按访客名称、消息内容搜索对话 | P0 |

#### 3.8.2 对话详情视图

```
┌─────────────────────────────────────────────────────────┐
│  访客信息侧栏          │  消息时间线区域                  │
│  ┌───────────────┐    │  ┌────────────────────────────┐  │
│  │ 访客头像       │    │  │ 客服/AI/访客消息气泡        │  │
│  │ 访客名称       │    │  │  按时间倒序排列            │  │
│  │ 设备/浏览器    │    │  └────────────────────────────┘  │
│  │ 地理位置       │    │                                  │
│  │ 当前页面       │    │  ┌────────────────────────────┐  │
│  └───────────────┘    │  │  消息输入框 + 发送按钮      │  │
│                        │  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| DASH-006 | 三栏布局：对话列表 + 消息时间线 + 访客信息 | P0 |
| DASH-007 | 消息时间线实时更新，新消息自动滚动到底部 | P0 |
| DASH-008 | 消息输入框支持纯文本，回车发送 | P0 |
| DASH-009 | 显示访客基本信息：设备、地理位置、当前页面 | P0 |
| DASH-010 | 客服状态切换：在线/离开/离线 | P0 |

### 3.9 计费模块（MVP 简化版）

#### 3.9.1 免费计划配额

| 资源类型 | 免费计划限制 | 超限行为 |
|---------|-------------|---------|
| 对话数量 | 20 / 30 天 | 无法创建新对话，访客提示升级 |
| 消息数量 | 200 / 30 天 | 无法发送新消息 |
| 联系人存储 | 25 个 | 无法创建新联系人 |
| 对话保留 | 30 天 | 30 天后自动归档 |
| 团队席位 | 1 个 | 无法邀请新成员 |
| 月度 AI 信用 | 50 Credits | 超出后 AI 自动回复关闭 |

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BILL-001 | 默认免费计划，无需支付即可使用 | P0 |
| BILL-002 | 30 天滚动窗口计量 | P0 |
| BILL-003 | 配额使用情况在仪表板显示 | P0 |
| BILL-004 | 接近配额上限时预警提示 | P1 |
| BILL-005 | 自托管模式：全部功能免费，无限制 | P1 |

### 3.10 访客追踪模块（MVP 简化版）

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| TRACK-001 | 访客在线状态实时检测（在线/离线） | P0 |
| TRACK-002 | 访客设备信息识别（浏览器、操作系统） | P0 |
| TRACK-003 | 访客 IP 地理位置解析（国家/城市） | P0 |
| TRACK-004 | 访客当前访问页面追踪 | P0 |
| TRACK-005 | 仪表板显示在线访客列表 | P1 |

---

## 4. 非功能需求

### 4.1 性能需求

| 指标 | 目标值 | 测量方式 |
|-----|-------|---------|
| 页面加载时间（仪表板首屏） | < 2s | Lighthouse |
| Widget 加载时间 | < 500ms | 性能监控 |
| WebSocket 连接建立时间 | < 300ms | 后端监控 |
| 消息端到端延迟（访客→客服） | < 100ms | P95 |
| AI 响应时间（从发送到显示） | < 5s | P95 |
| 知识库检索时间 | < 200ms | P95 |
| 并发连接数 | 单实例 ≥ 1000 | 压力测试 |

### 4.2 可靠性需求

| 指标 | 目标值 |
|-----|-------|
| 核心功能可用性 | ≥ 99.5% |
| 数据持久化可靠性 | PostgreSQL ACID 保证 |
| 消息投递保证 | At-least-once |
| 故障恢复时间（重启） | < 30s |
| 数据库备份策略 | 每日自动备份 |

### 4.3 安全需求

| 需求编号 | 需求描述 |
|---------|---------|
| SEC-001 | 所有 API 接口鉴权，防止未授权访问 |
| SEC-002 | Organization + Website 双层租户隔离，防止越权访问 |
| SEC-003 | WebSocket 连接建立时校验租户权限 |
| SEC-004 | 密码采用 bcrypt 加密存储 |
| SEC-005 | 访客 IP 和 Geo 字段服务器端强制覆盖，不信任客户端 |
| SEC-006 | XSS 防护：消息内容转义输出 |
| SEC-007 | CORS 配置，仅允许可信域名 |

### 4.4 兼容性需求

| 环境 | 支持范围 |
|-----|---------|
| 浏览器（访客 Widget） | Chrome、Firefox、Safari、Edge 最新 2 个版本 |
| 浏览器（仪表板） | Chrome、Firefox、Safari、Edge 最新 2 个版本 |
| 移动端 | 响应式设计，适配手机和平板 |
| 自托管环境 | Docker 镜像，支持 Kubernetes/普通服务器 |

---

## 5. 数据统计与埋点

### 5.1 核心业务指标

| 指标名称 | 计算方式 | 统计维度 |
|---------|---------|---------|
| 对话总数 | 新建对话计数 | 日/周/月、网站 |
| 消息总数 | 消息发送计数 | 日/周/月、发送者类型 |
| AI 回复率 | AI 回复消息数 / 总消息数 | 日/周/月 |
| 首次响应时间 | 对话创建到第一条回复的时间 | P50/P90 |
| 对话解决率 | 已解决对话数 / 总对话数 | 日/周/月 |
| 访客满意度 | 好评数 / 总评价数（MVP 暂不实现） | 日/周/月 |

### 5.2 MVP 仪表板统计卡片

| 卡片名称 | 显示内容 |
|---------|---------|
| 今日对话 | 今日新增对话数 + 环比 |
| 待处理对话 | 当前 open 状态对话数 |
| AI 回复数 | 今日 AI 自动回复消息数 |
| 在线访客 | 当前在线访客数 |

---

## 6. 上线标准与验收标准

### 6.1 功能验收标准

- ✅ 所有 P0 需求开发完成，通过测试
- ✅ 核心流程端到端验证：访客发消息 → AI 回复 → 客服处理
- ✅ 压力测试通过：100 并发访客，系统稳定运行
- ✅ 安全测试通过：无高危漏洞

### 6.2 性能验收标准

- ✅ Widget 加载 < 500ms
- ✅ 消息端到端延迟 < 100ms（P95）
- ✅ AI 响应时间 < 5s（P95）
- ✅ 仪表板首屏加载 < 2s

### 6.3 上线检查清单

| 检查项 | 状态 |
|-----|------|
| 生产环境配置完成 | ☐ |
| 数据库迁移脚本验证通过 | ☐ |
| Redis 连接池配置优化 | ☐ |
| 监控告警配置完成 | ☐ |
| 日志收集配置完成 | ☐ |
| 备份策略生效 | ☐ |
| 域名和 SSL 证书配置 | ☐ |
| 官方文档 MVP 版本发布 | ☐ |

---

## 7. 后续版本规划（预告）

| 版本 | 核心主题 | 主要功能 | 计划时间 |
|-----|---------|---------|---------|
| **v1.5** | AI 能力增强 + 用户体验优化 | Background Pipeline、知识库自动导入、访客归因分析、邮件通知、数据报表 | MVP 后 4-6 周 |
| **v2.0** | 企业级能力 + 生态开放 | MCP Server 工具调用、高级 AI 特性、内容审核、完整 API 生态、高级集成 | v1.5 后 6-8 周 |

---

**文档结束**


---

## 8. 附录：架构文档级详细技术规格

### 8.1 完整数据模型字段定义（补充）

#### 8.1.1 Visitor（访客）数据模型

```typescript
type Visitor = {
  id: string;                        // ULID
  websiteId: string;
  organizationId: string;
  
  // 身份信息
  displayName: string | null;         // 显示名称（访客自定义或 AI 生成）
  email: string | null;               // 访客邮箱
  phone: string | null;               // 访客电话
  externalId: string | null;          // 客户系统外部 ID（用于集成）
  
  // 设备指纹
  fingerprintHash: string | null;     // 设备指纹哈希，用于去重识别
  userAgent: string | null;           // 浏览器 User-Agent
  browserName: string | null;         // 浏览器名称（解析后）
  browserVersion: string | null;      // 浏览器版本
  osName: string | null;              // 操作系统名称
  osVersion: string | null;           // 操作系统版本
  deviceType: string | null;          // 设备类型：desktop/mobile/tablet
  screenResolution: string | null;    // 屏幕分辨率
  
  // 地理位置（IP 解析）
  ipAddress: string | null;           // 访客 IP 地址
  country: string | null;              // 国家代码（如 CN）
  region: string | null;               // 省份/州
  city: string | null;                 // 城市
  timezone: string | null;             // 访客时区
  latitude: number | null;             // 纬度
  longitude: number | null;            // 经度
  isp: string | null;                  // 网络服务提供商
  
  // 在线状态
  isOnline: boolean;                   // 当前是否在线
  lastSeenAt: Date;                    // 最后活跃时间
  lastActivePage: string | null;       // 最后访问的页面 URL
  
  // 会话统计
  totalSessions: number;               // 总会话次数
  totalMessages: number;               // 总发送消息数
  totalConversations: number;          // 总对话数
  firstVisitAt: Date | null;           // 首次访问时间
  
  // 行为标签
  tags: string[];                      // 访客标签数组
  
  // 关联联系人（可选）
  contactId: string | null;            // 关联的已识别联系人 ID
  
  // 语言
  language: string | null;             // 访客浏览器语言
  
  // 元数据
  metadata: Jsonb | null;              // 自定义字段
  
  createdAt: Date;
  updatedAt: Date;
};
```

**索引设计**：
```sql
CREATE INDEX visitors_website_id_idx ON visitors(websiteId);
CREATE INDEX visitors_organization_id_idx ON visitors(organizationId);
CREATE INDEX visitors_email_idx ON visitors(email);
CREATE INDEX visitors_fingerprint_hash_idx ON visitors(fingerprintHash);
CREATE INDEX visitors_is_online_idx ON visitors(isOnline);
CREATE INDEX visitors_last_seen_at_idx ON visitors(lastSeenAt DESC);
CREATE INDEX visitors_contact_id_idx ON visitors(contactId);
```

#### 8.1.2 Conversation（对话）数据模型

```typescript
type Conversation = {
  id: string;                        // ULID
  websiteId: string;
  organizationId: string;
  
  // 参与者
  visitorId: string;                  // 访客 ID
  assignedUserId: string | null;      // 分配的坐席 ID
  aiAgentId: string | null;           // AI Agent ID
  
  // 状态
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  
  // 分类
  category: string | null;            // 对话分类标签
  tags: string[];                     // 标签数组
  
  // 消息统计
  messageCount: number;               // 消息总数
  visitorMessageCount: number;        // 访客消息数
  agentMessageCount: number;          // 客服消息数
  aiMessageCount: number;             // AI 消息数
  
  // 时间指标
  firstResponseAt: Date | null;       // 首次回复时间（客服或 AI）
  firstHumanResponseAt: Date | null;  // 首次人工回复时间
  resolvedAt: Date | null;            // 解决时间
  closedAt: Date | null;              // 关闭时间
  
  // 响应时间统计（秒）
  firstResponseTime: number | null;    // 首次响应耗时
  avgResponseTime: number | null;      // 平均响应耗时
  resolutionTime: number | null;       // 解决耗时
  
  // 满意度
  satisfactionScore: number | null;    // 访客评分（1-5）
  satisfactionComment: string | null;  // 访客评价
  
  // 来源
  source: "widget" | "api" | "email" | "slack";  // 对话来源
  entryPage: string | null;            // 发起对话的页面
  
  // 语言
  language: string | null;             // 对话检测到的语言
  
  // AI 相关
  aiHandled: boolean | null;           // 是否全程 AI 处理无人工介入
  aiEscalated: boolean;                // AI 是否主动升级人工
  aiTokensUsed: number;                // AI 消耗总 tokens
  
  // 内部备注
  internalNotes: string | null;        // 客服私有备注
  
  // 元数据
  metadata: Jsonb | null;
  
  createdAt: Date;
  updatedAt: Date;
};
```

**索引设计**：
```sql
CREATE INDEX conversations_website_id_idx ON conversations(websiteId);
CREATE INDEX conversations_organization_id_idx ON conversations(organizationId);
CREATE INDEX conversations_visitor_id_idx ON conversations(visitorId);
CREATE INDEX conversations_assigned_user_id_idx ON conversations(assignedUserId);
CREATE INDEX conversations_status_idx ON conversations(status);
CREATE INDEX conversations_priority_idx ON conversations(priority);
CREATE INDEX conversations_created_at_idx ON conversations(createdAt DESC);
CREATE INDEX conversations_resolved_at_idx ON conversations(resolvedAt);
```

#### 8.1.3 Conversation Timeline Item（时间线）数据模型

**设计原则**：单表多态设计，统一存储消息、状态变更、系统事件等所有对话内活动。

```typescript
type ConversationTimelineItem = {
  id: string;                        // ULID
  conversationId: string;
  websiteId: string;
  organizationId: string;
  
  // 核心类型字段
  type: string;                       // 时间线类型枚举（见下文）
  subType: string | null;             // 子类型，进一步细分
  
  // 可见性控制
  visibility: "public" | "internal" | "private";  // public=访客可见
  
  // 发送者（根据 type 决定是哪个有值）
  visitorId: string | null;
  userId: string | null;              // 客服用户 ID
  aiAgentId: string | null;
  
  // 消息内容（type=message 时有值）
  content: string | null;              // 消息正文
  contentType: "text" | "markdown" | "html";
  
  // 附件
  attachments: Jsonb | null;           // 附件数组
  
  // 引用/回复
  inReplyToItemId: string | null;     // 回复的消息 ID
  quotedContent: string | null;        // 引用内容快照
  
  // AI 元数据
  aiModel: string | null;              // 使用的 AI 模型
  aiPromptTokens: number | null;       // Prompt token 数
  aiCompletionTokens: number | null;   // 回复 token 数
  aiTotalTokens: number | null;        // 总 token 数
  aiLatencyMs: number | null;          // AI 生成耗时（毫秒）
  aiToolsUsed: Jsonb | null;           // AI 调用的工具列表
  
  // 状态变更元数据（type=status_changed 等时有值）
  oldStatus: string | null;
  newStatus: string | null;
  oldPriority: string | null;
  newPriority: string | null;
  oldAssigneeId: string | null;
  newAssigneeId: string | null;
  
  // 编辑历史
  editedAt: Date | null;
  lastEditedByUserId: string | null;
  
  // 消息状态
  isDeleted: boolean;                  // 软删除标记
  deletedAt: Date | null;
  
  // 幂等性
  idempotencyKey: string | null;       // 客户端幂等键
  
  createdAt: Date;
  updatedAt: Date;
};
```

**Timeline Item 类型枚举完整列表**：
```typescript
const TIMELINE_ITEM_TYPES = {
  // ========== 消息类 ==========
  MESSAGE: "message",                            // 普通消息
  NOTE: "note",                                  // 内部备注（private）
  SYSTEM_MESSAGE: "system_message",              // 系统消息
  
  // ========== 状态变更类 ==========
  STATUS_CHANGED: "status_changed",             // 对话状态变更
  PRIORITY_CHANGED: "priority_changed",         // 优先级变更
  ASSIGNEE_CHANGED: "assignee_changed",         // 坐席分配变更
  TAG_ADDED: "tag_added",                        // 添加标签
  TAG_REMOVED: "tag_removed",                    // 移除标签
  
  // ========== AI 行为类 ==========
  AI_GENERATED: "ai_generated",                  // AI 生成的回复
  AI_ESCALATED: "ai_escalated",                  // AI 升级人工
  AI_SUGGESTION: "ai_suggestion",                // AI 建议（供客服参考）
  AI_SUGGESTION_ACCEPTED: "ai_suggestion_accepted",  // 客服采纳 AI 建议
  KNOWLEDGE_RETRIEVED: "knowledge_retrieved",    // AI 检索到知识库
  
  // ========== 坐席行为类 ==========
  HUMAN_JOINED: "human_joined",                  // 客服加入对话
  HUMAN_LEFT: "human_left",                      // 客服离开对话
  TYPING_STARTED: "typing_started",              // 开始输入
  TYPING_STOPPED: "typing_stopped",              // 停止输入
  
  // ========== 访客行为类 ==========
  VISITOR_IDENTIFIED: "visitor_identified",      // 访客被识别为联系人
  VISITOR_BLOCKED: "visitor_blocked",            // 访客被拉黑
  VISITOR_UNBLOCKED: "visitor_unblocked",        // 访客被解除拉黑
  
  // ========== 系统事件类 ==========
  LANGUAGE_DETECTED: "language_detected",        // 检测到对话语言
  CONVERSATION_MERGED: "conversation_merged",    // 对话被合并
  CONVERSATION_SPLIT: "conversation_split",      // 对话被拆分
  EXPORTED: "exported",                           // 对话被导出
} as const;
```

**索引设计**：
```sql
-- 最核心查询：对话消息流，按时间排序
CREATE INDEX conversation_timeline_conversation_created_idx 
  ON conversation_timeline(conversationId, createdAt ASC);

-- 类型过滤
CREATE INDEX conversation_timeline_type_idx 
  ON conversation_timeline(conversationId, type);

-- 可见性过滤（客服 vs 访客看到的内容不同）
CREATE INDEX conversation_timeline_visibility_idx 
  ON conversation_timeline(conversationId, visibility);

-- 发送者查询
CREATE INDEX conversation_timeline_visitor_id_idx ON conversation_timeline(visitorId);
CREATE INDEX conversation_timeline_user_id_idx ON conversation_timeline(userId);
CREATE INDEX conversation_timeline_ai_agent_id_idx ON conversation_timeline(aiAgentId);

-- 全文搜索（PostgreSQL tsvector）
CREATE INDEX conversation_timeline_content_search_idx 
  ON conversation_timeline USING GIN (to_tsvector('english', content));
```

### 8.2 WebSocket 连接管理详细规格

#### 8.2.1 连接建立流程

```
访客页面加载 Widget
    │
    ▼
建立 WebSocket 连接
    ├─ URL: wss://api.cossistant.io/ws
    ├─ Query 参数: websiteId, visitorId（可选）
    └─ Header: Authorization（客服连接时）
    │
    ▼
后端中间件校验
    ├─ 校验 websiteId 存在且有效
    ├─ 校验来源域名在 allowedOrigins 中（CORS）
    └─ 客服连接：校验 JWT Token 权限
    │
    ▼
连接建立成功
    │
    ▼
WebSocket 上下文绑定
    ├─ 绑定 connectionId（UUID）
    ├─ 绑定 websiteId
    ├─ 绑定 visitorId 或 userId
    └─ 加入 Redis Channel: channel:site:{websiteId}
    │
    ▼
发送 `connected` 确认消息给客户端
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| WS-001 | Bun 原生 WebSocket，无额外依赖，高性能 | P0 |
| WS-002 | 连接建立时必须校验 websiteId，拒绝无效租户连接 | P0 |
| WS-003 | 访客连接不需要鉴权，客服连接需要 JWT Token | P0 |
| WS-004 | CORS 校验：来源域名必须在网站的 allowedOrigins 列表中 | P0 |
| WS-005 | 每个连接分配唯一的 connectionId（UUID v4） | P0 |
