# Cossistant 产品需求设计文档 - v1.5 版本

| 文档版本 | v1.5 |
|---------|------|
| 产品版本 | v1.5 |
| 撰写日期 | 2026-07-22 |
| 产品名称 | Cossistant - 无头实时客户支持平台 |
| 文档状态 | 初稿 |
| 前置依赖 | MVP v1.0 全部功能完成 |

---

## 1. 版本概述

### 1.1 版本核心主题

**AI 能力增强 + 用户体验优化 + 商业化准备**

v1.5 版本在 MVP 基础上，重点完善 AI 对话的深度能力，增强知识库自动化，补全访客分析能力，同时完成完整的计费系统，为商业化和规模化增长做准备。

### 1.2 版本目标

| 目标类型 | 具体目标 | 成功指标 |
|---------|---------|---------|
| **AI 能力提升** | 双管道 AI 架构落地，AI 解决率显著提升 | AI 独立解决率 ≥ 60% |
| **知识库自动化** | 支持 URL 爬虫和 PDF 导入，降低知识录入成本 | 知识录入效率提升 50% |
| **数据洞察** | 完整的访客分析和对话报表，数据驱动优化 | 报表覆盖 80% 核心业务场景 |
| **商业化就绪** | 完整计费系统上线，支持付费订阅转化 | 转化率 ≥ 5% |
| **用户体验** | 邮件通知、对话标签等体验优化功能 | 用户满意度提升 20% |

### 1.3 目标用户扩展

| 用户角色 | 新增诉求 | 使用场景 |
|---------|---------|---------|
| **成长型 SaaS 团队** | 更强大的 AI 自动化能力，减少人工成本 | 日接待量 50+，需要 AI 解决大部分常见问题 |
| **数据驱动的运营人员** | 需要数据分析指导客服优化 | 查看对话报表，优化知识库和 AI 提示词 |
| **付费意向客户** | 需要更高配额和高级功能 | 从免费计划升级到付费计划 |

---

## 2. 新增/增强功能模块总览

| 模块名称 | 功能范围 | 优先级 | MVP 状态 |
|---------|---------|--------|---------|
| **AI 双管道增强** | Background Pipeline、Answer-first 修复、Rogue AI 防护 | P0 | 仅 Primary Pipeline |
| **知识库增强** | URL 自动爬虫、PDF 导入、知识澄清工作流 | P0 | 仅手动录入 |
| **访客追踪完整** | Tinybird 实时分析、营销归因、活动追踪 | P0 | 基础在线状态 |
| **计费系统完整** | Polar 集成、Hobby/Pro 计划、AI Credits 计量、结账流程 | P0 | 仅免费计划 |
| **邮件通知系统** | 生命周期邮件、新对话通知、邮件渠道 | P0 | 无 |
| **对话管理增强** | 标签、优先级、自动分类、情感分析、批量操作 | P1 | 基础状态管理 |
| **数据报表模块** | 实时仪表盘、业务报表、导出功能 | P1 | 仅基础统计卡片 |
| **工作流引擎** | BullMQ 异步队列、知识澄清 SSE 工作流 | P1 | 无 |

---

## 3. 详细功能需求

### 3.1 AI 双管道架构增强

#### 3.1.1 Background Pipeline 后台分析

**功能描述**：Primary Pipeline 响应访客后，异步启动 Background Pipeline 进行对话元数据的深度分析，不影响实时响应性能。

```
Primary Pipeline 完成（访客已收到回复）
    │
    ▼
BullMQ 异步队列调度 Background Pipeline Job
    │
    ▼
后台分析任务并行执行
    ├─ 对话标题自动生成
    ├─ 对话情感分析（正向/中性/负向）
    ├─ 对话自动分类（产品问题/技术支持/计费咨询等）
    ├─ 优先级自动设置（高/中/低）
    ├─ 知识缺口识别（知识库未覆盖的问题）
    └─ 访客/联系人记忆更新
    │
    ▼
分析结果写入 Timeline Item（仅客服可见）
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-BG-001 | BullMQ 异步队列调度 Background Job | P0 |
| AI-BG-002 | 对话标题自动生成（简洁概括对话主题） | P0 |
| AI-BG-003 | 对话情感分析：正向/中性/负向三分类 + 置信度 | P0 |
| AI-BG-004 | 对话自动分类：可配置分类体系，AI 自动打标 | P0 |
| AI-BG-005 | 对话优先级自动设置：高/中/低三档 | P0 |
| AI-BG-006 | 知识缺口识别：识别 AI 无法回答的问题，建议补充知识库 | P0 |
| AI-BG-007 | 分析结果实时推送到仪表板（时间线私有条目） | P0 |

#### 3.1.2 Answer-first 修复机制

**功能描述**：解决 AI "找到搜索证据但仍然只问澄清问题不实际回答" 的问题，确保 AI 先给出实质性回答，再问澄清问题。

**修复触发条件**：
- 未发送任何公共消息
- 只发送了内部/私有消息
- 只调用了搜索等非回复工具
- 公共消息被判定为"无实际帮助"

**修复流程**：
```
Primary Attempt 完成
    │
    ▼
Answer-first 契约校验
    ├─ 是否有实际帮助访客的内容？
    └─ 是否只问了澄清问题？
    │
    ▼ 验证失败
Repair Attempt（二次尝试）
    ├─ 禁用搜索工具（避免重复搜索）
    ├─ 强制要求先给出已有信息的回答
    └─ 澄清问题放在回答之后
    │
    ▼
验证成功 → 发送回复
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-AF-001 | Answer-first 公共消息契约校验 | P0 |
| AI-AF-002 | 验证失败时自动触发 Repair Attempt | P0 |
| AI-AF-003 | Repair Attempt 禁用知识库搜索工具 | P0 |
| AI-AF-004 | 修复前后的 Token 分别计量 | P0 |
| AI-AF-005 | 仪表盘显示修复率指标，用于 AI 质量优化 | P1 |

#### 3.1.3 Rogue AI 防护机制

**功能描述**：防止 AI 失控循环发送消息，保护用户体验和成本控制。

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| AI-SAFE-001 | 滑动窗口限制：1 分钟内同一对话最多发送 5 条消息 | P0 |
| AI-SAFE-002 | 超限自动 kill switch：冻结该对话的 AI 能力 | P0 |
| AI-SAFE-003 | 管理员告警通知：AI 异常行为实时告警 | P0 |
| AI-SAFE-004 | 仪表板显示异常日志，便于排查问题 | P1 |

### 3.2 知识库增强模块

#### 3.2.1 URL 自动爬虫导入

**功能描述**：输入网站 URL，自动爬取整站内容并生成知识库文章。

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| KB-CRAWL-001 | Firecrawl 集成，支持单 URL 爬取 | P0 |
| KB-CRAWL-002 | 支持整站爬取（可配置爬取深度） | P0 |
| KB-CRAWL-003 | 爬取进度实时显示（SSE 实时推送） | P0 |
| KB-CRAWL-004 | 自动内容清洗：移除导航、页脚、广告等噪声 | P0 |
| KB-CRAWL-005 | 自动分段生成 Chunk 和向量嵌入 | P0 |
| KB-CRAWL-006 | 爬取完成后生成导入报告（成功/失败数量） | P0 |
| KB-CRAWL-007 | 支持爬取任务队列，并发控制 | P1 |

#### 3.2.2 PDF 文档导入

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| KB-PDF-001 | 支持上传 PDF 文件，最大 50MB | P0 |
| KB-PDF-002 | 自动文本提取和内容分段 | P0 |
| KB-PDF-003 | 保留文档标题、章节结构 | P0 |
| KB-PDF-004 | 生成向量嵌入，支持语义检索 | P0 |
| KB-PDF-005 | 支持批量上传多个 PDF | P1 |

#### 3.2.3 知识澄清工作流

**功能描述**：AI 遇到知识库未覆盖的问题时，自动发起澄清请求，收集新知识。

```
AI 识别知识缺口 → 创建 KnowledgeClarificationRequest
    │
    ▼
状态：analyzing（分析问题，规划澄清问题）
    │
    ▼
状态：awaiting_answer（等待客服回答）
    │
    ├─ 仪表板弹框提醒客服
    ├─ 显示 AI 建议的澄清问题
    └─ 客服可编辑问题和答案
    │
    ▼
客服提交答案
    │
    ▼
状态：applied（已应用到知识库）
    ├─ 自动创建知识库文章
    ├─ 生成向量嵌入
    └─ 后续对话可引用该新知识
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| KB-CLAR-001 | AI 自动识别知识缺口，创建澄清请求 | P0 |
| KB-CLAR-002 | 知识澄清工作流状态机：analyzing → awaiting_answer → applied/dismissed | P0 |
| KB-CLAR-003 | AI 自动生成建议的澄清问题 | P0 |
| KB-CLAR-004 | 客服仪表板待处理澄清请求列表 | P0 |
| KB-CLAR-005 | 客服编辑确认后，自动生成知识库文章 | P0 |
| KB-CLAR-006 | 语义去重：相似问题不重复创建澄清请求 | P0 |
| KB-CLAR-007 | SSE 实时推送澄清请求状态更新 | P1 |

### 3.3 访客追踪完整功能

#### 3.3.1 Tinybird 实时分析引擎

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| TRACK-TB-001 | Tinybird 集成，4 类核心事件实时摄入 | P0 |
| TRACK-TB-002 | presence_events：访客/客服上下线事件 | P0 |
| TRACK-TB-003 | visitor_activity_events：客户端实时活动（focus/heartbeat/route_change） | P0 |
| TRACK-TB-004 | visitor_events：页面浏览事件 | P0 |
| TRACK-TB-005 | conversation_metrics：对话生命周期指标 | P0 |
| TRACK-TB-006 | Materialized View 预聚合，查询 < 100ms | P0 |
| TRACK-TB-007 | 事件缓冲：Fire-and-Forget 异步 + 批处理（100 events 或 5s flush） | P0 |

#### 3.3.2 营销归因分析

**归因模型**：First-touch（首次接触归因），一旦存在首次归因数据，永久保留不再更新。

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| TRACK-ATTR-001 | UTM 参数完整追踪：source/medium/campaign/term/content | P0 |
| TRACK-ATTR-002 | 渠道追踪：自然搜索、付费广告、社交媒体、直接访问等 | P0 |
| TRACK-ATTR-003 | 引荐来源追踪 | P0 |
| TRACK-ATTR-004 | 着陆页追踪 | P0 |
| TRACK-ATTR-005 | 广告平台 Click IDs 支持（Google、Facebook 等） | P0 |
| TRACK-ATTR-006 | 首次接触归因永久保留，不被后续访问覆盖 | P0 |
| TRACK-ATTR-007 | 归因数据扁平化存储，便于 Tinybird 列式分析 | P0 |
| TRACK-ATTR-008 | 仪表板按渠道分析对话量和转化效果 | P0 |

#### 3.3.3 访客画像增强

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| TRACK-VIS-001 | MaxMind 完整地理定位：国家/地区/城市/经纬度/精度半径 | P0 |
| TRACK-VIS-002 | Edge Headers 降级方案（Cloudflare/Vercel） | P0 |
| TRACK-VIS-003 | 设备指纹：浏览器、操作系统、屏幕分辨率 | P0 |
| TRACK-VIS-004 | 会话分析：访问时长、页面浏览数、跳出率 | P0 |
| TRACK-VIS-005 | 访客历史对话记录关联 | P0 |
| TRACK-VIS-006 | 在线状态实时计算：在线 / Away（5-30分钟） / Offline（30+分钟） | P0 |
| TRACK-VIS-007 | 服务器端强制覆盖 IP/Geo，防止客户端伪造 | P0 |

### 3.4 计费系统完整功能

#### 3.4.1 三级订阅计划

| 功能维度 | Free | Hobby ($20/mo 首发价) | Pro ($40/mo 首发价) |
|---------|------|---------------------|-------------------|
| **对话数量** | 20 / 30 天 | 无限 | 无限 |
| **消息数量** | 200 / 30 天 | 无限 | 无限 |
| **联系人存储** | 25 | 2000 | 6000 |
| **对话保留** | 30 天 | 永久 | 永久 |
| **团队席位** | 1 | 2 | 4 |
| **月度 AI 信用** | 50 Credits | 1000 Credits | 3000 Credits |
| **知识刷新间隔** | 180 分钟 | 10 分钟 | 即时 (0 分钟) |
| **自带 OpenRouter Key** | ❌ | ❌ | ✅ |
| **高级集成** | ❌ | ❌ | ✅ |
| **自定义 AI 头像** | ❌ | ❌ | ✅ |

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BILL-PLAN-001 | Polar.sh 计费平台完整集成 | P0 |
| BILL-PLAN-002 | 三级订阅计划：Free / Hobby / Pro | P0 |
| BILL-PLAN-003 | 按网站计费，每个网站独立订阅 | P0 |
| BILL-PLAN-004 | Website ID 存储在 Polar 订阅 metadata，非本地数据库 | P0 |
| BILL-PLAN-005 | 组织内批量获取：所有网站共享同一个 Customer，单次请求 | P0 |

#### 3.4.2 AI Credits 计量系统

**计费单位**：1 AI Credit = 约 1000 tokens（输入+输出）

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BILL-CRED-001 | 每次 LLM 调用精确计量 Token 消耗（输入+输出） | P0 |
| BILL-CRED-002 | 30 天滚动窗口计算 AI Credits 使用量 | P0 |
| BILL-CRED-003 | AI 调用前预检查余额，不足时降级 | P0 |
| BILL-CRED-004 | 余额不足时 AI 自动回复关闭，仅人工客服模式 | P0 |
| BILL-CRED-005 | 仪表板实时显示 AI Credits 剩余量和使用率 | P0 |
| BILL-CRED-006 | 支持超额购买额外 AI Credits 包 | P1 |

#### 3.4.3 故障降级机制（停电模式）

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BILL-FAIL-001 | Polar API 调用失败时自动降级 | P0 |
| BILL-FAIL-002 | 两级缓存策略：成功结果 10s TTL，失败结果 3s TTL | P0 |
| BILL-FAIL-003 | 陈旧缓存回退： Polar 不可用时返回陈旧计划 | P0 |
| BILL-FAIL-004 | 降级状态下自动关闭硬限制（停电模式），核心功能不中断 | P0 |
| BILL-FAIL-005 | 仪表板显示降级状态告警，提示用户计费服务异常 | P0 |
| BILL-FAIL-006 | 自托管模式：全部功能免费，无限制，无计费检查 | P0 |

#### 3.4.4 结账与订阅管理

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BILL-CHECK-001 | 仪表板内创建 Polar 结账链接，跳转支付页面 | P0 |
| BILL-CHECK-002 | Webhook 签名验证（HMAC-SHA256），确保订阅更新安全 | P0 |
| BILL-CHECK-003 | 支付成功后自动更新订阅计划，即时生效 | P0 |
| BILL-CHECK-004 | 订阅管理：查看当前计划、更换计划、取消订阅 | P0 |
| BILL-CHECK-005 | 发票历史查看和下载 | P0 |
| BILL-CHECK-006 | 续费提醒邮件，到期前 7 天、3 天、1 天发送 | P1 |

### 3.5 邮件通知系统

#### 3.5.1 邮件服务基础架构

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MAIL-INF-001 | Resend + AWS SES 双邮件提供商，自动故障转移 | P0 |
| MAIL-INF-002 | BullMQ 邮件队列，异步发送不阻塞主流程 | P0 |
| MAIL-INF-003 | 邮件模板系统，支持变量替换 | P0 |
| MAIL-INF-004 | 邮件发送状态追踪（成功/失败/打开/点击） | P0 |
| MAIL-INF-005 | 退订链接，符合 CAN-SPAM 合规 | P0 |

#### 3.5.2 生命周期邮件

| 需求编号 | 邮件类型 | 触发时机 | 优先级 |
|---------|---------|---------|--------|
| MAIL-LC-001 | 欢迎邮件 | 用户注册后 1 小时 | P0 |
| MAIL-LC-002 | 首次对话完成感谢 | 第一个对话标记解决后 | P0 |
| MAIL-LC-003 | 使用提醒（7 天未活跃） | 注册后 7 天未创建对话 | P1 |
| MAIL-LC-004 | 配额预警 | 免费计划使用 80% 时 | P0 |
| MAIL-LC-005 | 功能引导系列邮件 | 注册后第 1/3/7 天 | P1 |

#### 3.5.3 实时通知邮件

| 需求编号 | 邮件类型 | 触发时机 | 优先级 |
|---------|---------|---------|--------|
| MAIL-NOT-001 | 新对话提醒邮件 | 新对话创建，无客服在线时 | P0 |
| MAIL-NOT-002 | 对话分配通知 | 对话分配给特定客服时 | P0 |
| MAIL-NOT-003 | 访客消息离线提醒 | 客服离线时访客发送消息 | P0 |
| MAIL-NOT-004 | AI 升级人工提醒 | AI 自动升级到人工时 | P1 |

### 3.6 对话管理增强

#### 3.6.1 对话标签与分类

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| CONV-TAG-001 | 支持自定义对话标签体系 | P0 |
| CONV-TAG-002 | AI 自动分类打标签（Background Pipeline） | P0 |
| CONV-TAG-003 | 客服手动添加/移除标签 | P0 |
| CONV-TAG-004 | 按标签筛选对话列表 | P0 |
| CONV-TAG-005 | 标签使用统计报表 | P1 |

#### 3.6.2 优先级与 SLA

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| CONV-SLA-001 | 对话优先级：高/中/低三档 | P0 |
| CONV-SLA-002 | AI 自动设置优先级（基于情感、关键词） | P0 |
| CONV-SLA-003 | 客服手动调整优先级 | P0 |
| CONV-SLA-004 | 按优先级排序对话列表（高优在前） | P0 |
| CONV-SLA-005 | SLA 计时器：首次响应时间、解决时间目标 | P1 |
| CONV-SLA-006 | SLA 违约告警 | P1 |

#### 3.6.3 批量操作

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| CONV-BATCH-001 | 多选对话批量标记解决 | P1 |
| CONV-BATCH-002 | 多选对话批量分配客服 | P1 |
| CONV-BATCH-003 | 多选对话批量添加标签 | P1 |
| CONV-BATCH-004 | 多选对话批量导出 | P1 |

### 3.7 数据报表模块

#### 3.7.1 实时仪表盘

```
┌─────────────────────────────────────────────────────────┐
│  核心指标卡片（今日）                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │  对话数  │ │ AI回复率 │ │ 首次响应 │ │ 解决率  │        │
│  │   +15%  │ │   68%   │ │  2.3min │ │   85%   │        │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│                                                           │
│  趋势图表（近 7 天）                                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ██ 对话数    ██ 消息数    ██ AI 回复量            │  │
│  │──────────────────────────────────────────────────│  │
│  │                                                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  渠道来源分布                                             │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  自然搜索 40%   │  │  热门页面 Top 5              │  │
│  │  付费广告 25%   │  │  1. /pricing                │  │
│  │  直接访问 20%   │  │  2. /docs                   │  │
│  │  社交媒体 15%   │  │  ...                        │  │
│  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| REPORT-DASH-001 | 核心指标卡片：对话数、消息数、AI 回复率、首次响应时间、解决率 | P0 |
| REPORT-DASH-002 | 趋势图表：近 7/30 天对话量、消息量趋势 | P0 |
| REPORT-DASH-003 | 渠道来源分布饼图 | P0 |
| REPORT-DASH-004 | 热门页面排行 | P0 |
| REPORT-DASH-005 | 在线访客实时数、客服在线数 | P0 |
| REPORT-DASH-006 | 实时数据流刷新（Tinybird Pipe） | P0 |

#### 3.7.2 业务分析报表

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| REPORT-ANA-001 | 对话分析报表：按状态、按渠道、按标签、按时间 | P0 |
| REPORT-ANA-002 | 客服绩效报表：对话处理数、首次响应时间、平均解决时间 | P0 |
| REPORT-ANA-003 | AI 效能报表：AI 回复率、独立解决率、升级人工率 | P0 |
| REPORT-ANA-004 | 知识库报表：文章浏览量、AI 引用次数、知识缺口统计 | P0 |
| REPORT-ANA-005 | 访客分析报表：地域分布、设备分布、活跃时段 | P0 |

#### 3.7.3 导出功能

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| REPORT-EXP-001 | 支持报表数据导出为 CSV 格式 | P0 |
| REPORT-EXP-002 | 支持自定义时间范围导出 | P0 |
| REPORT-EXP-003 | 对话记录完整导出（包含消息历史） | P0 |
| REPORT-EXP-004 | 定时邮件报表（每日/每周摘要） | P1 |

---

## 4. 非功能需求增强

### 4.1 性能需求升级

| 指标 | v1.5 目标值 |
|-----|------------|
| Background Job 处理延迟 | < 10s |
| 报表查询响应时间 | < 500ms |
| 知识库导入速度（URL） | < 30s / 页面 |
| 邮件发送延迟 | < 1min |
| 并发访客支持 | 单实例 ≥ 5000 |

### 4.2 可观测性增强

| 需求编号 | 需求描述 |
|---------|---------|
| OBS-001 | AI Pipeline 完整链路追踪（Intake → Decision → Generation 各阶段耗时） |
| OBS-002 | Token 消耗按模型、按网站细粒度计量 |
| OBS-003 | Redis Streams 消费延迟监控 |
| OBS-004 | BullMQ 队列积压监控告警 |
| OBS-005 | Tinybird 摄入延迟和查询性能监控 |

### 4.3 安全增强

| 需求编号 | 需求描述 |
|---------|---------|
| SEC-V15-001 | Webhook 签名验证（Polar、邮件服务商） |
| SEC-V15-002 | 敏感数据加密存储（API Keys、支付信息） |
| SEC-V15-003 | 管理员操作审计日志 |
| SEC-V15-004 | 会话超时策略（可配置） |

---

## 5. 上线标准与验收标准

### 5.1 功能验收标准

- ✅ 所有 P0 需求开发完成，通过测试
- ✅ AI 双管道端到端验证：Primary 实时回复 + Background 分析完成
- ✅ 知识库导入验证：URL 爬虫和 PDF 导入功能正常
- ✅ 计费流程验证：创建订阅 → 支付 → 配额生效完整闭环
- ✅ 报表数据准确性验证：与实际业务数据误差 < 1%

### 5.2 性能验收标准

- ✅ Background Pipeline 处理时间 < 10s（P95）
- ✅ 报表查询响应 < 500ms
- ✅ 知识库导入 < 30s/页面
- ✅ 邮件发送 < 1min 延迟

### 5.3 迁移与灰度发布

| 阶段 | 内容 | 时间 |
|-----|------|------|
| **Stage 1** | 数据迁移脚本验证，灰度 10% 用户 | 第 1 天 |
| **Stage 2** | 计费系统灰度，仅新用户可用付费计划 | 第 2-3 天 |
| **Stage 3** | 全量开放 v1.5 功能 | 第 4 天 |
| **Stage 4** | 观察期，监控性能和错误率 | 第 5-7 天 |

---

## 6. v2.0 版本预告

| 功能领域 | 核心特性 |
|---------|---------|
| **AI 能力** | MCP Server 工具调用、多轮推理、自定义工具、智能路由 |
| **API 生态** | REST v1 完整、tRPC 公共、Webhook 系统、OAuth 认证 |
| **企业级特性** | SSO、RBAC 细粒度权限、审计日志、合规导出 |
| **集成生态** | Slack/Teams 集成、Zapier、Webhook、API |
| **高级分析** | 会话洞察、根因分析、AI 质量评估、A/B 测试 |

---

**文档结束**


---

## 附录：架构文档级详细技术规格

### Background Pipeline 完整工具集

#### 工具 1：标题自动生成（generate_title）

```typescript
type GenerateTitleTool = {
  name: "generate_title";
  description: "基于对话前 N 条消息自动生成简洁的对话标题";
  parameters: {
    conversationId: string;
    messages: Array<{
      role: "visitor" | "agent" | "ai";
      content: string;
    }>;
  };
  result: {
    title: string;            // 生成的标题（≤ 50 字符）
    confidence: number;       // 置信度 0-1
  };
};
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BP-TITLE-001 | 对话创建后 3 条消息时自动触发标题生成 | P0 |
| BP-TITLE-002 | 标题不超过 50 字符，简洁概括对话主题 | P0 |
| BP-TITLE-003 | 生成的标题自动更新到 conversation.title 字段 | P0 |
| BP-TITLE-004 | 客服可手动编辑修改自动生成的标题 | P0 |

#### 工具 2：情绪分析（analyze_sentiment）

```typescript
type AnalyzeSentimentTool = {
  name: "analyze_sentiment";
  description: "分析访客消息的情绪倾向，用于优先级和预警";
  parameters: {
    visitorMessages: string[];
  };
  result: {
    sentiment: "positive" | "neutral" | "negative" | "very_negative";
    score: number;                          // -1 到 1
    confidence: number;                     // 0-1
    suggestedPriority: "low" | "medium" | "high" | "urgent";
  };
};
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BP-SENT-001 | 每条访客消息触发实时情绪分析 | P0 |
| BP-SENT-002 | 检测到负面情绪时自动提高对话优先级 | P0 |
| BP-SENT-003 | 极度负面消息（威胁、辱骂）触发预警通知给主管 | P0 |
| BP-SENT-004 | 仪表板显示每个对话的情绪标签 | P0 |

#### 工具 3：对话分类（classify_conversation）

```typescript
type ClassifyConversationTool = {
  name: "classify_conversation";
  description: "将对话自动归类到预定义类别，便于统计和路由";
  parameters: {
    messages: string[];
    existingCategories: string[];
  };
  result: {
    category: string;
    confidence: number;
    subCategories: string[];
  };
};
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BP-CLASS-001 | 自动将对话分类到产品预设类别（技术问题、账单问题、功能建议等） | P0 |
| BP-CLASS-002 | 分类置信度 < 0.7 时标记为"待人工确认" | P0 |
| BP-CLASS-003 | 支持每个网站自定义分类体系 | P0 |

#### 工具 4：检测需要人工升级（detect_handoff）

```typescript
type DetectHandoffTool = {
  name: "detect_handoff";
  description: "检测 AI 是否在绕圈、是否需要升级人工";
  parameters: {
    conversationHistory: Array<{
      role: string;
      content: string;
    }>;
  };
  result: {
    shouldEscalate: boolean;
    reason: string;
    confidence: number;
    suggestedAgent: string | null;  // 建议分配的坐席
  };
};
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BP-HAND-001 | 检测 AI 连续 3 次无法给出有效回答时自动升级人工 | P0 |
| BP-HAND-002 | 访客明确要求人工客服时立即升级 | P0 |
| BP-HAND-003 | 升级时附带原因说明和建议坐席 | P0 |
| BP-HAND-004 | 升级后通知所有在线客服，高亮显示 | P0 |

#### 工具 5：提取实体（extract_entities）

```typescript
type ExtractEntitiesTool = {
  name: "extract_entities";
  description: "从对话中提取关键实体信息（订单号、邮箱、产品名等）";
  parameters: {
    messages: string[];
  };
  result: {
    entities: Array<{
      type: "email" | "order_id" | "product_name" | "phone" | "url";
      value: string;
      confidence: number;
    }>;
  };
};
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BP-ENT-001 | 自动提取访客消息中的订单号、邮箱、电话等关键信息 | P0 |
| BP-ENT-002 | 提取的实体显示在访客信息侧边栏，供客服快速查看 | P0 |
| BP-ENT-003 | 提取到订单号时自动关联订单系统（需集成） | P1 |

#### 工具 6：知识库 gap 检测（detect_knowledge_gap）

```typescript
type DetectKnowledgeGapTool = {
  name: "detect_knowledge_gap";
  description: "检测 AI 无法回答的问题，识别知识库缺失内容";
  parameters: {
    question: string;
    aiResponse: string;
    retrievedKnowledge: string[];
  };
  result: {
    isGap: boolean;
    gapType: "missing" | "outdated" | "unclear";
    suggestedArticle: {
      title: string;
      content: string;
    } | null;
  };
};
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BP-GAP-001 | AI 回答中明确表示"不知道/不清楚"时，标记为知识缺口 | P0 |
| BP-GAP-002 | 知识库建议队列：列出所有检测到的知识缺口，附带 AI 生成的建议文章 | P0 |
| BP-GAP-003 | 一键生成知识库草稿：点击将建议转为文章草稿 | P0 |

### 知识库 URL 爬虫详细规格（Firecrawl 集成）

```
管理员输入 URL 开始爬取
    │
    ▼
Firecrawl API 调用
    ├─ URL: https://api.firecrawl.dev/v1/scrape
    ├─ 参数: url, formats=["markdown"], onlyMainContent=true
    │
    ▼
获取爬取结果
    │
    ▼
内容清洗与预处理
    ├─ 移除重复内容
    ├─ 移除导航、页脚等无关内容
    ├─ 提取标题、正文、元数据
    │
    ▼
智能分块（Chunking）
    ├─ 按语义分块，避免打断段落
    ├─ 每块约 500-1000 tokens
    ├─ 块之间 10% 重叠，保证上下文连续
    │
    ▼
生成向量嵌入
    ├─ OpenAI text-embedding-3-small
    │
    ▼
存储到数据库
    ├─ knowledge_articles 表存文章元数据
    ├─ knowledge_chunks 表存分块 + 向量
    │
    ▼
实时推送爬取进度
    ├─ 已爬取 X 页
    ├─ 当前正在爬取的 URL
    └─ 预计剩余时间
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| KB-CRAWL-001 | Firecrawl 集成，支持单页爬取和整站爬取 | P0 |
| KB-CRAWL-002 | 爬取深度可配置：1 层（仅输入 URL）、全站（所有链接） | P0 |
| KB-CRAWL-003 | 爬取速率限制：每秒最多 2 个请求，避免被目标网站封禁 | P0 |
| KB-CRAWL-004 | 实时进度推送：WebSocket 实时通知前端爬取进度 | P0 |
| KB-CRAWL-005 | 语义分块：基于段落和标题智能分块，不是硬性截断 | P0 |
| KB-CRAWL-006 | 去重检测：相同 URL 再次爬取时检测内容是否变更 | P0 |

### Tinybird 实时数据报表详细规格

**核心 Pipeline**：
```
前端 Widget 触发事件
    │
    ▼
客户端 SDK 收集事件
    │
    ▼
发送到 Tinybird Events API
    ├─ 批量发送，本地聚合
    └─ 失败重试，保证投递
    │
    ▼
Tinybird Data Source 接收
    ├─ events 原始数据表
    ├─ 自动分区（按天）
    │
    ▼
Materialized View 预聚合
    ├─ mv_events_daily：按天聚合
    ├─ mv_events_by_country：按国家聚合
    └─ mv_top_pages：热门页面排行
    │
    ▼
API 端点提供查询
    ├─ /analytics/overview
    ├─ /analytics/traffic
    ├─ /analytics/countries
    └─ /analytics/pages
```

**事件数据模型（Event）**：
```typescript
type AnalyticsEvent = {
  timestamp: DateTime;
  websiteId: string;
  organizationId: string;
  
  sessionId: string;                    // 会话 ID
  visitorId: string;                    // 访客 ID
  eventType: "page_view" | "chat_started" | "message_sent" | "chat_ended";
  
  // 页面信息
  url: string;
  path: string;
  title: string | null;
  referrer: string | null;
  
  // 访客信息
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  deviceType: string | null;
  
  // UTM 参数
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  
  // 性能指标
  pageLoadTime: number | null;
  widgetLoadTime: number | null;
  
  metadata: Jsonb | null;
};
```

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| TB-001 | Tinybird 集成，所有事件通过 Events API 发送 | P0 |
| TB-002 | 客户端批量发送：最多 50 条或最多 2 秒延迟 | P0 |
| TB-003 | Materialized View 预聚合，保证查询 < 500ms | P0 |
| TB-004 | Token 权限最小化：仪表板 Token 只有查询权限，没有写入/删除 | P0 |
| TB-005 | 故障降级：Tinybird 不可用时事件暂存本地队列，恢复后补发 | P0 |
