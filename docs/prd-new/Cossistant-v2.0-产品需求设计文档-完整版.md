# Cossistant 产品需求设计文档 - v2.0 版本

| 文档版本 | v2.0 |
|---------|------|
| 产品版本 | v2.0 |
| 撰写日期 | 2026-07-22 |
| 产品名称 | Cossistant - 无头实时客户支持平台 |
| 文档状态 | 初稿 |
| 前置依赖 | v1.5 全部功能完成 |

---

## 1. 版本概述

### 1.1 版本核心主题

**企业级能力 + 生态开放 + 平台化**

v2.0 版本是 Cossistant 的里程碑版本，从"工具型产品"升级为"平台型产品"。核心是开放完整的 API 生态，引入 MCP Server 工具调用能力实现可扩展的 AI Agent，同时补全企业级安全、合规、集成能力，满足中大型企业客户需求。

### 1.2 版本目标

| 目标类型 | 具体目标 | 成功指标 |
|---------|---------|---------|
| **平台化** | 完整 API 生态开放，开发者可基于 Cossistant 构建上层应用 | API 调用量占比 ≥ 30% |
| **AI 可扩展** | MCP Server 落地，支持自定义工具和第三方集成 | 可用工具 ≥ 20 个 |
| **企业级就绪** | SSO、RBAC、审计日志等企业特性完整 | 可通过 Enterprise 采购评审 |
| **生态集成** | 主流办公和自动化工具集成完成 | 覆盖 Slack/Teams/Zapier 等 Top 5 平台 |
| **规模化能力** | 支持单租户 10000+ 并发，多租户隔离安全加固 | 通过企业级安全渗透测试 |

### 1.3 目标用户升级

| 用户角色 | 核心诉求 | 使用场景 |
|---------|---------|---------|
| **中大型企业客服负责人** | 企业级安全合规、SSO、审计、SLA 保障 | 数千人规模企业的全球化客服 |
| **平台开发者** | 完整 API、Webhook、可扩展性 | 基于 Cossistant 构建垂直行业客服方案 |
| **AI Agent 开发者** | MCP Server 工具调用、可定制 AI 工作流 | 构建行业专用的智能客服 Agent |
| **ISV/解决方案商** | 白标、多租户管理、API 分销 | 打包 Cossistant 能力卖给自己的客户 |

---

## 2. 新增功能模块总览

| 模块名称 | 功能范围 | 优先级 | v1.5 状态 |
|---------|---------|--------|-----------|
| **MCP Server 工具平台** | Model Context Protocol、标准工具集、自定义工具、工具市场 | P0 | 无 |
| **API 生态完整** | REST v1 完整、tRPC 公共接口、Webhook 系统、OAuth 2.0、API Keys 管理 | P0 | 仅内部 tRPC |
| **高级 AI 特性** | 智能路由、访客记忆、联系人合并、多轮推理、AI 质量评估 | P0 | 基础双管道 |
| **企业级安全与合规** | SSO/SAML、RBAC 细粒度权限、审计日志、数据加密、合规导出 | P0 | 基础权限 |
| **集成生态系统** | Slack/Teams 集成、Zapier、BYOK 自带模型、自定义 AI 头像 | P0 | 无 |
| **内容审核与安全** | 访客黑名单、内容过滤、敏感数据检测、防刷屏、AI 内容审核 | P1 | 无 |
| **高级分析与洞察** | 会话洞察、根因分析、AI 质量评估、A/B 测试、预测告警 | P1 | 基础报表 |
| **白标与多租户管理** | 完整白标能力、Partner 多租户管理、使用量统计与计费 | P2 | 无 |

---

## 3. 详细功能需求

### 3.1 MCP Server 工具平台

#### 3.1.1 MCP (Model Context Protocol) 核心架构

**功能描述**：基于 Anthropic MCP 协议，构建标准的工具调用平台，让 AI Agent 可以安全地调用各种内部和第三方工具。

```
┌─────────────────────────────────────────────────────────┐
│                    AI Conversation Pipeline                │
│                                                           │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │   Primary    │────▶│ Generation   │                  │
│  │   Pipeline   │     │   Stage      │                  │
│  └──────────────┘     └──────┬───────┘                  │
│                              │                           │
│                     ┌────────▼────────┐                 │
│                     │   Tool Call     │                 │
│                     │   Executor      │                 │
│                     └────────┬────────┘                 │
│                              │                           │
└──────────────────────────────┼────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────┐
│                    MCP Server 工具层                         │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 标准工具  │ │ 自定义工具│ │ 第三方工具│ │ 企业内部  │   │
│  │ 内置集    │ │ JS/Python│ │ MCP 服务 │ │ 系统集成  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MCP-001 | 完整实现 Anthropic MCP Protocol 服务端 | P0 |
| MCP-002 | 工具调用安全沙箱，隔离执行环境 | P0 |
| MCP-003 | 工具权限控制：按网站、按 AI Agent 配置可用工具 | P0 |
| MCP-004 | 工具调用审计日志，所有调用可追溯 | P0 |
| MCP-005 | 工具调用超时、重试、熔断机制 | P0 |
| MCP-006 | 工具调用结果验证和错误处理 | P0 |

#### 3.1.2 标准内置工具集（v2.0 首批）

| 工具名称 | 功能描述 | 优先级 |
|---------|---------|--------|
| **search_knowledge_base** | 知识库语义搜索 | P0 |
| **identify_visitor** | 访客身份识别、历史对话查询 | P0 |
| **send_message** | 发送公共消息给访客 | P0 |
| **send_private_note** | 发送仅客服可见的内部备注 | P0 |
| **escalate_to_agent** | 升级对话到人类坐席 | P0 |
| **resolve_conversation** | 标记对话已解决 | P0 |
| **skip_noop** | 不执行任何操作，跳过 | P0 |
| **add_tags** | 给对话添加标签 | P0 |
| **set_priority** | 设置对话优先级 | P0 |
| **assign_agent** | 分配对话给特定客服 | P0 |
| **lookup_contact** | 查找联系人信息 | P0 |
| **create_contact** | 创建新联系人 | P0 |
| **update_contact** | 更新联系人信息 | P0 |
| **http_request** | 发起 HTTP 请求（需配置白名单） | P1 |
| **run_javascript** | 执行自定义 JavaScript 代码（沙箱） | P1 |

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MCP-TOOL-001 | 上述 10+ 标准工具完整实现 | P0 |
| MCP-TOOL-002 | 工具输入输出 Schema 标准化定义 | P0 |
| MCP-TOOL-003 | 工具使用统计和成功率监控 | P0 |
| MCP-TOOL-004 | 工具调用前置/后置 Hook | P0 |

#### 3.1.3 自定义工具开发平台

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MCP-CUST-001 | 支持 JavaScript/TypeScript 编写自定义工具 | P0 |
| MCP-CUST-002 | 在线代码编辑器，带语法高亮和自动补全 | P0 |
| MCP-CUST-003 | 工具测试功能：模拟调用、查看输入输出 | P0 |
| MCP-CUST-004 | 工具版本管理，支持回滚 | P0 |
| MCP-CUST-005 | 工具环境变量和密钥管理（加密存储） | P0 |
| MCP-CUST-006 | 执行时间和内存限制，防止恶意代码 | P0 |

#### 3.1.4 第三方 MCP 服务集成

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MCP-EXT-001 | 支持连接外部 MCP Server（HTTP/WebSocket） | P0 |
| MCP-EXT-002 | 工具自动发现和注册 | P0 |
| MCP-EXT-003 | 连接健康检查和自动重连 | P0 |
| MCP-EXT-004 | 预置热门 MCP 服务一键接入（如 Browser Use、数据库工具等） | P1 |

### 3.2 API 生态完整

#### 3.2.1 REST API v1 完整

| 资源分类 | 端点 | 方法 | 优先级 |
|---------|------|------|--------|
| **Conversations** | /api/v1/conversations | GET/POST | P0 |
| | /api/v1/conversations/{id} | GET/PUT/DELETE | P0 |
| | /api/v1/conversations/{id}/messages | GET/POST | P0 |
| | /api/v1/conversations/{id}/assign | POST | P0 |
| **Messages** | /api/v1/messages | GET/POST | P0 |
| | /api/v1/messages/{id} | GET/PUT/DELETE | P0 |
| **Knowledge Base** | /api/v1/knowledge | GET/POST | P0 |
| | /api/v1/knowledge/{id} | GET/PUT/DELETE | P0 |
| | /api/v1/knowledge/search | POST | P0 |
| **Visitors** | /api/v1/visitors | GET | P0 |
| | /api/v1/visitors/{id} | GET/PUT | P0 |
| **Contacts** | /api/v1/contacts | GET/POST | P0 |
| | /api/v1/contacts/{id} | GET/PUT/DELETE | P0 |
| **Analytics** | /api/v1/analytics/metrics | GET | P0 |
| | /api/v1/analytics/conversations | GET | P0 |
| **Webhooks** | /api/v1/webhooks | GET/POST | P0 |
| | /api/v1/webhooks/{id} | GET/PUT/DELETE | P0 |

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| API-REST-001 | 上述所有 REST 端点完整实现 | P0 |
| API-REST-002 | OpenAPI 3.0 规范文档自动生成 | P0 |
| API-REST-003 | Swagger UI 交互式文档 | P0 |
| API-REST-004 | 版本化 API，支持 v1/v2 共存 | P0 |
| API-REST-005 | 速率限制：按 API Key 限流 | P0 |
| API-REST-006 | 请求 ID 追踪，完整可观测 | P0 |

#### 3.2.2 tRPC 公共接口开放

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| API-TRPC-001 | 仪表板内部使用的 tRPC 接口对外公开 | P0 |
| API-TRPC-002 | tRPC 类型定义 npm 包发布 | P0 |
| API-TRPC-003 | tRPC 订阅（WebSocket）公共接口 | P0 |
| API-TRPC-004 | tRPC 客户端 SDK 文档和示例 | P0 |

#### 3.2.3 Webhook 事件系统

**事件类型（首批）**：
- `conversation.created` - 新对话创建
- `conversation.updated` - 对话状态更新
- `conversation.assigned` - 对话分配
- `conversation.resolved` - 对话解决
- `message.created` - 新消息
- `visitor.created` - 新访客
- `visitor.identified` - 访客识别
- `contact.created` - 新联系人

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| API-WEB-001 | Webhook 端点管理（创建、编辑、删除） | P0 |
| API-WEB-002 | 事件类型订阅配置 | P0 |
| API-WEB-003 | 签名验证（HMAC-SHA256） | P0 |
| API-WEB-004 | 重试机制（指数退避，最多 5 次） | P0 |
| API-WEB-005 | 发送日志和成功率监控 | P0 |
| API-WEB-006 | 失败告警通知 | P0 |
| API-WEB-007 | 测试功能：手动发送测试事件 | P0 |

#### 3.2.4 OAuth 2.0 认证系统

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| API-OAUTH-001 | OAuth 2.0 Authorization Code Flow 实现 | P0 |
| API-OAUTH-002 | OAuth 应用管理（创建、编辑、删除） | P0 |
| API-OAUTH-003 | Client ID / Client Secret 生成和密钥轮转 | P0 |
| API-OAUTH-004 | Scope 权限控制 | P0 |
| API-OAUTH-005 | 授权页面白标定制 | P0 |
| API-OAUTH-006 | Token 管理（过期、刷新、撤销） | P0 |

#### 3.2.5 API Keys 管理

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| API-KEY-001 | 每个网站可创建多个 API Key | P0 |
| API-KEY-002 | API Key 权限配置（只读/读写） | P0 |
| API-KEY-003 | API Key 过期时间设置（永不过期/自定义） | P0 |
| API-KEY-004 | API Key 轮转功能 | P0 |
| API-KEY-005 | API Key 使用统计和日志 | P0 |
| API-KEY-006 | 异常使用告警（突增流量、异常时段） | P0 |

### 3.3 高级 AI 特性

#### 3.3.1 智能对话路由

**功能描述**：基于对话内容、访客属性、客服负载等因素，智能决定由 AI 处理还是分配给最合适的人类客服。

```
新对话进入
    │
    ▼
智能路由引擎
    ├─ 意图识别：问题分类（技术/计费/产品/销售）
    ├─ 难度评估：简单/中等/复杂
    ├─ 情感分析：正向/中性/负向/愤怒
    ├─ 访客价值：新用户/付费用户/VIP
    ├─ 客服负载：各客服当前处理量、在线状态
    └─ 技能匹配：客服专业技能标签
    │
    ▼
路由决策
    ├─ AI 自动处理（简单、常见问题）
    ├─ 分配给技能匹配的客服 A
    ├─ 分配给当前最空闲的客服 B
    ├─ VIP 通道：优先分配给高级客服
    └─ 愤怒用户：直接升级到主管
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-ROUTE-001 | 意图识别和问题分类 | P0 |
| AI-ROUTE-002 | 问题难度评估模型 | P0 |
| AI-ROUTE-003 | 客服技能标签体系 | P0 |
| AI-ROUTE-004 | 负载均衡分配算法 | P0 |
| AI-ROUTE-005 | VIP 用户识别和优先路由 | P0 |
| AI-ROUTE-006 | 负面情感用户优先人工处理 | P0 |
| AI-ROUTE-007 | 路由规则可视化配置 | P0 |
| AI-ROUTE-008 | 路由效果 A/B 测试 | P1 |

#### 3.3.2 访客记忆系统

**功能描述**：AI 记住跨对话的访客偏好、历史问题、个人信息等，提供更连贯的个性化服务。

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-MEM-001 | 访客记忆向量存储，跨对话持久化 | P0 |
| AI-MEM-002 | 自动提取记忆点：偏好、禁忌、重要事实 | P0 |
| AI-MEM-003 | 对话开始时自动加载相关记忆到上下文 | P0 |
| AI-MEM-004 | 记忆重要性评分，自动淘汰低价值记忆 | P0 |
| AI-MEM-005 | 记忆编辑功能：客服可手动添加/修改/删除 | P0 |
| AI-MEM-006 | 记忆时间衰减：近期记忆权重更高 | P0 |

#### 3.3.3 联系人合并与身份解析

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-CONTACT-001 | 基于邮箱、手机号、设备指纹的身份去重 | P0 |
| AI-CONTACT-002 | 重复联系人自动识别和合并建议 | P0 |
| AI-CONTACT-003 | 合并时保留所有历史对话和活动记录 | P0 |
| AI-CONTACT-004 | 合并回滚功能 | P0 |
| AI-CONTACT-005 | 联系人画像：360 度视图，聚合所有渠道信息 | P0 |
| AI-CONTACT-006 | 自定义字段：支持扩展联系人属性 | P0 |

#### 3.3.4 AI 质量评估与持续优化

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-QUAL-001 | AI 回复自动评分：相关性、准确性、友好度 | P0 |
| AI-QUAL-002 | 低质量回复自动标记，提示人工审核 | P0 |
| AI-QUAL-003 | AI 改进建议：基于失败案例生成优化建议 | P0 |
| AI-QUAL-004 | 知识库 Gap 分析：识别高频未覆盖问题 | P0 |
| AI-QUAL-005 | Prompt 版本管理和 A/B 测试 | P0 |
| AI-QUAL-006 | AI 性能仪表盘：回复率、解决率、升级率趋势 | P0 |

### 3.4 企业级安全与合规

#### 3.4.1 SSO 单点登录

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| SEC-SSO-001 | SAML 2.0 协议支持 | P0 |
| SEC-SSO-002 | OIDC (OpenID Connect) 协议支持 | P0 |
| SEC-SSO-003 | Okta、Azure AD、Google Workspace 预置集成 | P0 |
| SEC-SSO-004 | 强制 SSO 选项（禁用密码登录） | P0 |
| SEC-SSO-005 | SCIM 用户自动同步 | P0 |
| SEC-SSO-006 | Just-in-Time 用户自动创建 | P0 |

#### 3.4.2 RBAC 细粒度权限控制

**角色层级**：
```
Organization Owner
    ├─ Admin（组织管理员）
    │   ├─ Billing Admin（计费管理员）
    │   ├─ Knowledge Admin（知识库管理员）
    │   └─ Analytics Admin（报表管理员）
    └─ Website Manager（网站管理员）
        ├─ Supervisor（客服主管）
        └─ Agent（普通客服）
```

**权限维度**：
- 对话：查看/回复/分配/删除/导出
- 知识库：查看/创建/编辑/审核/删除
- 报表：查看/导出/管理
- 用户：邀请/编辑/删除/角色管理
- 计费：查看/订阅/发票/支付方式
- 设置：修改网站配置/AI 设置/集成

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| SEC-RBAC-001 | 上述角色体系完整实现 | P0 |
| SEC-RBAC-002 | 自定义角色创建 | P0 |
| SEC-RBAC-003 | 细粒度权限配置 | P0 |
| SEC-RBAC-004 | 权限继承和覆盖 | P0 |
| SEC-RBAC-005 | 权限变更审计日志 | P0 |

#### 3.4.3 审计日志

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| SEC-AUDIT-001 | 所有用户操作完整审计记录 | P0 |
| SEC-AUDIT-002 | 审计事件类型：登录/登出/数据修改/配置变更/权限变更 | P0 |
| SEC-AUDIT-003 | 审计日志不可删除，只读 | P0 |
| SEC-AUDIT-004 | 审计日志查询和筛选 | P0 |
| SEC-AUDIT-005 | 审计日志导出（CSV/JSON） | P0 |
| SEC-AUDIT-006 | 审计日志保留策略（可配置，默认 1 年） | P0 |
| SEC-AUDIT-007 | 合规报告自动生成（SOC 2、GDPR 等） | P1 |

#### 3.4.4 数据安全与合规

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| SEC-DATA-001 | 静态数据加密（AES-256） | P0 |
| SEC-DATA-002 | 传输加密（TLS 1.3） | P0 |
| SEC-DATA-003 | 敏感数据自动识别和脱敏 | P0 |
| SEC-DATA-004 | 数据驻留选项（EU/US/APAC） | P1 |
| SEC-DATA-005 | GDPR 数据导出和删除请求处理 | P0 |
| SEC-DATA-006 | HIPAA 合规模式（BAA 签署） | P1 |
| SEC-DATA-007 | 数据备份和灾难恢复方案 | P0 |

### 3.5 集成生态系统

#### 3.5.1 Slack/Teams 双向同步

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| INT-SLACK-001 | Slack Bot 集成，在 Slack 内处理对话 | P0 |
| INT-TEAMS-002 | Microsoft Teams 集成 | P0 |
| INT-SYNC-003 | 消息双向实时同步 | P0 |
| INT-NOTI-004 | 新对话通知、@提及提醒 | P0 |
| INT-ACTION-005 | Slack/Teams 内快捷操作（标记解决/分配/添加标签） | P0 |
| INT-WARN-006 | SLA 告警、高优对话提醒 | P0 |

#### 3.5.2 BYOK（Bring Your Own Key）自带模型

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| INT-BYOK-001 | 支持客户自带 OpenAI API Key | P0 |
| INT-BYOK-002 | 支持客户自带 Anthropic API Key | P0 |
| INT-BYOK-003 | OpenRouter 集成，支持 100+ 模型 | P0 |
| INT-BYOK-004 | 模型路由配置：不同场景使用不同模型 | P0 |
| INT-BYOK-005 | Fallback 配置：主模型不可用时自动切换备用 | P0 |
| INT-BYOK-006 | Token 消耗直接计费到客户账号，不经过平台 | P0 |

#### 3.5.3 CRM 和帮助台集成

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| INT-CRM-001 | Zendesk 双向同步 | P0 |
| INT-CRM-002 | Intercom 双向同步 | P0 |
| INT-CRM-003 | HubSpot 联系人同步 | P0 |
| INT-CRM-004 | Salesforce 集成 | P1 |
| INT-CRM-005 | 对话转工单自动创建 | P0 |
| INT-CRM-006 | 联系人信息自动同步和匹配 | P0 |

#### 3.5.4 Zapier/Make 无代码集成

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| INT-ZAP-001 | 官方 Zapier 应用发布 | P0 |
| INT-ZAP-002 | Trigger：新对话、新消息、对话解决等 | P0 |
| INT-ZAP-003 | Action：创建对话、发送消息、添加标签等 | P0 |
| INT-ZAP-004 | Search：查找对话、查找联系人等 | P0 |
| INT-ZAP-005 | Make (Integromat) 集成 | P1 |

### 3.6 内容审核与安全

#### 3.6.1 访客黑名单

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MOD-BAN-001 | 访客拉黑功能：基于 IP/设备指纹/访客 ID | P0 |
| MOD-BAN-002 | 拉黑时效配置：永久/临时（1 天/7 天/30 天） | P0 |
| MOD-BAN-003 | 拉黑原因记录 | P0 |
| MOD-BAN-004 | 黑名单管理界面 | P0 |
| MOD-BAN-005 | 自动拉黑规则：刷屏、辱骂、关键词触发 | P0 |

#### 3.6.2 内容过滤与审核

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MOD-FILT-001 | 敏感词过滤：自定义词库 | P0 |
| MOD-FILT-002 | AI 内容审核：辱骂、色情、暴力、广告识别 | P0 |
| MOD-FILT-003 | 违规消息自动拦截或标记 | P0 |
| MOD-FILT-004 | PII（个人身份信息）自动识别和脱敏 | P0 |
| MOD-FILT-005 | 客服消息审核队列 | P1 |

#### 3.6.3 反滥用保护

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MOD-ANTI-001 | 消息频率限制：防止刷屏 | P0 |
| MOD-ANTI-002 | 重复消息检测 | P0 |
| MOD-ANTI-003 | 机器人检测：reCAPTCHA v3 集成 | P0 |
| MOD-ANTI-004 | 大规模攻击自动防护 | P0 |
| MOD-ANTI-005 | 异常行为告警 | P0 |

### 3.7 高级分析与洞察

#### 3.7.1 会话洞察

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| ANAL-INS-001 | 对话主题聚类：自动发现高频问题 | P0 |
| ANAL-INS-002 | 情感趋势分析：整体满意度走向 | P0 |
| ANAL-INS-003 | 常见问题 Top 列表 | P0 |
| ANAL-INS-004 | 流失预警：识别高风险用户对话 | P0 |
| ANAL-INS-005 | 转化机会识别：潜在销售线索 | P0 |

#### 3.7.2 根因分析

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| ANAL-RCA-001 | 升级到人工的原因分类和统计 | P0 |
| ANAL-RCA-002 | AI 失败原因分析 | P0 |
| ANAL-RCA-003 | 知识库覆盖缺口分析 | P0 |
| ANAL-RCA-004 | SLA 违约根因分析 | P0 |
| ANAL-RCA-005 | 可操作的优化建议生成 | P0 |

#### 3.7.3 预测与告警

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| ANAL-PRED-001 | 对话量预测：基于历史数据和节假日 | P0 |
| ANAL-PRED-002 | 客服人力需求智能建议 | P0 |
| ANAL-PRED-003 | 峰值负载预警 | P0 |
| ANAL-PRED-004 | AI 性能异常检测 | P0 |
| ANAL-PRED-005 | 知识库内容过时提醒 | P0 |

#### 3.7.4 A/B 测试框架

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| ANAL-AB-001 | AI Prompt A/B 测试 | P0 |
| ANAL-AB-002 | 知识库版本 A/B 测试 | P0 |
| ANAL-AB-003 | 路由策略 A/B 测试 | P0 |
| ANAL-AB-004 | 实时统计显著性检验 | P0 |
| ANAL-AB-005 | 赢家自动灰度全量 | P0 |

---

## 4. 非功能需求（企业级）

### 4.1 性能与扩展性

| 指标 | v2.0 目标值 |
|-----|------------|
| 单实例并发连接 | ≥ 10,000 |
| 水平扩展能力 | 支持 100+ 实例集群 |
| API 响应时间 P95 | < 200ms |
| 数据库查询 P95 | < 100ms |
| MCP 工具调用超时 | 可配置，默认 30s |
| 消息端到端延迟 | < 50ms |

### 4.2 可靠性与 SLA

| 指标 | 目标值 |
|-----|-------|
| 系统可用性 | ≥ 99.9%（企业版） |
| 数据持久性 | 99.9999999% |
| RPO（恢复点目标） | < 1 小时 |
| RTO（恢复时间目标） | < 4 小时 |
| 月度计划内维护窗口 | < 4 小时 |

### 4.3 安全认证

| 认证 | 目标 |
|-----|------|
| SOC 2 Type II | v2.0 发布后 3 个月内 |
| GDPR 合规 | 已满足 |
| HIPAA 就绪 | v2.0 发布时 |
| ISO 27001 | 路线图中 |
| 渗透测试 | 每季度一次 |

---

## 5. 上线策略

### 5.1 分阶段发布

| 阶段 | 功能范围 | 目标用户 | 时间 |
|-----|---------|---------|------|
| **Beta** | MCP Server、REST API、核心企业功能 | 早期企业客户、开发者 | v2.0 前 4 周 |
| **RC** | 全部功能，性能优化 | 所有付费客户 | v2.0 前 2 周 |
| **GA** | 正式发布，文档完善，支持到位 | 全量用户 | v2.0 正式日 |

### 5.2 迁移计划

- 数据迁移：零停机，向后兼容
- API 版本：v1 继续支持至少 6 个月，平滑迁移指引
- 计费迁移：无感知，现有订阅自动延续

---

## 6. 未来路线图展望

| 版本 | 主题 | 核心方向 |
|-----|------|---------|
| **v2.5** | 行业垂直方案 | 电商、SaaS、金融等行业预置解决方案包 |
| **v3.0** | 多语言与全球化 | 50+ 语言自动翻译、多区域部署、GDPR/CCPA 完整 |
| **v3.5** | 语音与视频 | 语音客服、视频通话、屏幕共享 |
| **v4.0** | AI 自主 Agent | 端到端自主解决复杂问题，零人工干预 |

---

**文档结束**



---

## 附录：架构文档级详细技术规格

### MCP Server 完整协议实现

#### MCP 核心架构




### MCP Server 完整协议实现

#### MCP 核心架构

```
                          ┌─────────────────────────────────────────┐
                          │         Cossistant MCP Server            │
                          │                                           │
  AI Pipeline ───────────▶│  ┌──────────────┐  ┌──────────────────┐  │
                          │  │  身份认证层   │  │  工具发现协议     │  │
  第三方 LLM ────────────▶│  │  API Key     │  │  List Tools      │  │
                          │  │  签名验证     │  │                  │  │
  自定义应用 ────────────▶│  └──────────────┘  └──────────────────┘  │
                          │           │                   │            │
                          │  ┌──────────────┐  ┌──────────────────┐  │
                          │  │  权限控制层   │  │  工具执行沙箱     │  │
                          │  │  按工具授权   │  │  超时/资源限制    │  │
                          │  │  速率限制     │  │  异常捕获         │  │
                          │  └──────────────┘  └──────────────────┘  │
                          │           │                   │            │
                          │  ┌──────────────────────────────────────┐ │
                          │  │         标准工具集（15+）             │ │
                          │  │  conversations.*  对话操作            │ │
                          │  │  visitors.*       访客查询            │ │
                          │  │  knowledge.*      知识库              │ │
                          │  │  contacts.*       联系人              │ │
                          │  │  analytics.*      报表                │ │
                          │  │  webhooks.*       Webhook             │ │
                          │  └──────────────────────────────────────┘ │
                          └──────────────────────────────────────────┘
                                      │
                                      ▼
                          ┌──────────────────────────────┐
                          │    第三方 MCP 服务器市场      │
                          │  • 文件系统访问              │
                          │  • 数据库查询                │
                          │  • CRM 集成                 │
                          │  • 自定义工具                 │
                          └──────────────────────────────┘
```

#### MCP 标准工具集完整列表

| 工具 ID | 工具名称 | 功能描述 | 权限范围 |
|---------|--------|---------|---------|
| `conversations.list` | 列出对话 | 获取对话列表，支持筛选、分页、排序 | 只读 |
| `conversations.get` | 获取对话详情 | 获取单个对话的完整信息和消息历史 | 只读 |
| `conversations.sendMessage` | 发送消息 | 作为客服发送消息到对话 | 读写 |
| `conversations.assign` | 分配对话 | 将对话分配给指定坐席 | 读写 |
| `conversations.resolve` | 标记解决 | 将对话标记为已解决状态 | 读写 |
| `conversations.addTag` | 添加标签 | 为对话添加自定义标签 | 读写 |
| `conversations.removeTag` | 移除标签 | 从对话移除标签 | 读写 |
| `visitors.get` | 获取访客信息 | 获取访客的完整档案、设备、地理位置 | 只读 |
| `visitors.search` | 搜索访客 | 按邮箱、姓名、ID 搜索访客 | 只读 |
| `visitors.listOnline` | 列出在线访客 | 获取当前在线的所有访客列表 | 只读 |
| `knowledge.search` | 搜索知识库 | 语义搜索知识库文章 | 只读 |
| `knowledge.get` | 获取知识库文章 | 获取完整文章内容 | 只读 |
| `knowledge.create` | 创建知识库文章 | 创建新的知识库文章草稿 | 读写 |
| `knowledge.update` | 更新知识库文章 | 更新已有文章内容 | 读写 |
| `contacts.get` | 获取联系人信息 | 获取联系人完整档案和历史对话 | 只读 |
| `contacts.search` | 搜索联系人 | 按邮箱、电话等搜索联系人 | 只读 |
| `contacts.merge` | 合并联系人 | 合并重复的联系人记录 | 读写 |
| `notes.create` | 添加内部备注 | 为对话添加客服私有备注 | 读写 |
| `analytics.query` | 查询报表数据 | 查询指定时间范围的统计指标 | 只读 |
| `webhooks.trigger` | 触发 Webhook | 手动触发自定义 Webhook 事件 | 读写 |



#### MCP 工具调用协议规范

**工具调用请求格式**：
```typescript
type McpToolCallRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: "tools/call";
  params: {
    name: string;                    // 工具 ID
    arguments: Record<string, any>;  // 参数对象
    _meta: {                         // 元数据（审计用）
      callerType: "ai_pipeline" | "external_client" | "dashboard";
      callerId: string;
      websiteId: string;
      conversationId?: string;
    };
  };
};
```

**工具调用响应格式**：
```typescript
type McpToolCallResponse = {
  jsonrpc: "2.0";
  id: string | number;
  result?: {
    content: Array<{
      type: "text" | "image";
      text?: string;
      data?: string;
      mimeType?: string;
    }>;
    isError?: boolean;
    _meta: {
      executionTimeMs: number;
      toolVersion: string;
    };
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
};
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MCP-001 | 完整实现 Model Context Protocol 规范 | P0 |
| MCP-002 | 支持 SSE 传输协议，兼容所有 MCP 客户端 | P0 |
| MCP-003 | 每个工具调用独立鉴权，权限最小化 | P0 |
| MCP-004 | 工具调用完整审计日志：调用方、参数、结果、耗时、状态 | P0 |
| MCP-005 | 执行超时控制：默认 30 秒，可配置 | P0 |
| MCP-006 | 全局速率限制：每个客户端 100 次/分钟 | P0 |
| MCP-007 | 外部 MCP 服务器集成：支持连接第三方 MCP Server | P0 |
| MCP-008 | 故障隔离：单个工具或外部服务器故障不影响其他功能 | P0 |

### REST API v1 完整端点规范（40+ 端点）

#### 认证端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| POST | `/api/v1/auth/email/login` | 邮箱密码登录 |
| POST | `/api/v1/auth/magic-link/send` | 发送 Magic Link |
| POST | `/api/v1/auth/magic-link/verify` | 验证 Magic Link |
| POST | `/api/v1/auth/refresh` | 刷新 Access Token |
| POST | `/api/v1/auth/logout` | 登出 |

#### 组织端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/organizations` | 获取当前用户的组织列表 |
| GET | `/api/v1/organizations/{id}` | 获取组织详情 |
| PUT | `/api/v1/organizations/{id}` | 更新组织信息 |
| GET | `/api/v1/organizations/{id}/members` | 列出组织成员 |
| POST | `/api/v1/organizations/{id}/members/invite` | 邀请新成员 |
| DELETE | `/api/v1/organizations/{id}/members/{userId}` | 移除成员 |

#### 网站端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/websites` | 列出网站列表 |
| POST | `/api/v1/websites` | 创建新网站 |
| GET | `/api/v1/websites/{id}` | 获取网站详情 |
| PUT | `/api/v1/websites/{id}` | 更新网站配置 |
| DELETE | `/api/v1/websites/{id}` | 归档网站 |
| GET | `/api/v1/websites/{id}/widget-config` | 获取 Widget 配置 |
| PUT | `/api/v1/websites/{id}/widget-config` | 更新 Widget 配置 |

#### 对话端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/conversations` | 列出对话（支持筛选、分页、排序） |
| POST | `/api/v1/conversations` | 手动创建新对话 |
| GET | `/api/v1/conversations/{id}` | 获取对话详情 |
| PUT | `/api/v1/conversations/{id}` | 更新对话信息 |
| GET | `/api/v1/conversations/{id}/timeline` | 获取对话完整时间线 |
| POST | `/api/v1/conversations/{id}/messages` | 发送消息 |
| POST | `/api/v1/conversations/{id}/assign` | 分配对话给坐席 |
| POST | `/api/v1/conversations/{id}/resolve` | 标记对话已解决 |
| POST | `/api/v1/conversations/{id}/reopen` | 重新打开对话 |
| POST | `/api/v1/conversations/{id}/close` | 关闭对话 |
| GET | `/api/v1/conversations/{id}/tags` | 获取对话标签 |
| POST | `/api/v1/conversations/{id}/tags` | 添加标签 |
| DELETE | `/api/v1/conversations/{id}/tags/{tagId}` | 移除标签 |
| POST | `/api/v1/conversations/{id}/notes` | 添加内部备注 |
| POST | `/api/v1/conversations/{id}/export` | 导出对话记录 |



#### 访客端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/visitors` | 列出访客 |
| GET | `/api/v1/visitors/{id}` | 获取访客详情 |
| PUT | `/api/v1/visitors/{id}` | 更新访客信息 |
| GET | `/api/v1/visitors/{id}/conversations` | 获取访客历史对话 |
| GET | `/api/v1/visitors/online` | 获取在线访客列表 |
| POST | `/api/v1/visitors/{id}/block` | 拉黑访客 |
| POST | `/api/v1/visitors/{id}/unblock` | 解除拉黑 |

#### 知识库端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/knowledge` | 列出知识库文章 |
| POST | `/api/v1/knowledge` | 创建新文章 |
| GET | `/api/v1/knowledge/{id}` | 获取文章详情 |
| PUT | `/api/v1/knowledge/{id}` | 更新文章 |
| DELETE | `/api/v1/knowledge/{id}` | 归档文章 |
| POST | `/api/v1/knowledge/{id}/publish` | 发布文章 |
| POST | `/api/v1/knowledge/search` | 语义搜索知识库 |
| POST | `/api/v1/knowledge/crawl` | 触发 URL 爬取 |
| POST | `/api/v1/knowledge/import/pdf` | 导入 PDF 文档 |

#### 坐席端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/agents` | 列出坐席列表 |
| POST | `/api/v1/agents` | 创建坐席 |
| GET | `/api/v1/agents/{id}` | 获取坐席详情 |
| PUT | `/api/v1/agents/{id}` | 更新坐席信息 |
| DELETE | `/api/v1/agents/{id}` | 移除坐席 |
| GET | `/api/v1/agents/{id}/availability` | 获取坐席在线状态 |
| PUT | `/api/v1/agents/{id}/availability` | 设置坐席在线/离开 |
| GET | `/api/v1/agents/{id}/performance` | 获取坐席绩效统计 |

#### 报表端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/analytics/overview` | 获取总览统计卡片数据 |
| GET | `/api/v1/analytics/conversations` | 对话趋势统计 |
| GET | `/api/v1/analytics/messages` | 消息统计 |
| GET | `/api/v1/analytics/agents` | 坐席绩效排行 |
| GET | `/api/v1/analytics/ai` | AI 效能统计 |
| GET | `/api/v1/analytics/traffic` | 访客流量统计 |
| GET | `/api/v1/analytics/countries` | 按国家/地区分布 |
| GET | `/api/v1/analytics/satisfaction` | 满意度统计 |
| GET | `/api/v1/analytics/response-times` | 响应时间统计 |

#### Webhook 端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/webhooks` | 列出 Webhook 配置 |
| POST | `/api/v1/webhooks` | 创建新 Webhook |
| GET | `/api/v1/webhooks/{id}` | 获取 Webhook 详情 |
| PUT | `/api/v1/webhooks/{id}` | 更新 Webhook 配置 |
| DELETE | `/api/v1/webhooks/{id}` | 删除 Webhook |
| POST | `/api/v1/webhooks/{id}/test` | 发送测试事件 |
| GET | `/api/v1/webhooks/{id}/deliveries` | 获取投递历史 |
| GET | `/api/v1/webhooks/event-types` | 获取所有支持的事件类型 |

#### 审计日志端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/audit-logs` | 查询审计日志（支持筛选、分页） |
| GET | `/api/v1/audit-logs/{id}` | 获取单条日志详情 |
| POST | `/api/v1/audit-logs/export` | 导出审计日志 |

#### API Keys 端点

| 方法 | 路径 | 功能 |
|-----|------|------|
| GET | `/api/v1/api-keys` | 列出 API Keys（仅显示部分 Key） |
| POST | `/api/v1/api-keys` | 创建新 API Key（仅显示一次 Secret） |
| DELETE | `/api/v1/api-keys/{id}` | 撤销 API Key |
| PUT | `/api/v1/api-keys/{id}/rotate` | 轮转 API Key |

### OAuth 2.0 授权完整流程规范

```
第三方应用发起授权（用户在第三方应用点击"连接 Cossistant"）
    │
    ▼
跳转到 Cossistant 授权页面
    GET /oauth/authorize
    ?client_id=xxx
    &redirect_uri=https://third-party.com/callback
    &response_type=code
    &scope=conversations:read+contacts:read
    &state=random_state_string
    │
    ▼
用户登录（如未登录）
    │
    ▼
显示授权确认页面
    ├─ 第三方应用名称、Logo、描述
    ├─ 请求的权限列表（清晰说明每个权限的作用）
    └─ [允许] [拒绝] 按钮
    │
    ▼
用户点击允许
    │
    ▼
生成 Authorization Code（有效期 10 分钟，只能使用一次）
    │
    ▼
重定向回第三方应用 redirect_uri
    302 Location: https://third-party.com/callback
    ?code=AUTHORIZATION_CODE
    &state=random_state_string
    │
    ▼
第三方应用后端用 Code 交换 Token
    POST /oauth/token
    Authorization: Basic base64(client_id:client_secret)
    Content-Type: application/x-www-form-urlencoded
    
    grant_type=authorization_code
    &code=AUTHORIZATION_CODE
    &redirect_uri=https://third-party.com/callback
    │
    ▼
返回 Token 响应
    {
      "access_token": "xxx",        // 有效期 1 小时
      "token_type": "Bearer",
      "expires_in": 3600,
      "refresh_token": "yyy",       // 有效期 30 天
      "scope": "conversations:read contacts:read"
    }
    │
    ▼
使用 Access Token 调用 API
    Header: Authorization: Bearer <access_token>
    │
    ▼
Access Token 过期后，用 Refresh Token 刷新
    POST /oauth/token
    grant_type=refresh_token
    &refresh_token=yyy
```

---
