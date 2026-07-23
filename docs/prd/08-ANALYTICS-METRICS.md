# 数据分析与埋点需求文档

**所属模块**: 数据分析
**优先级**: P1
**版本**: v1.0

---

## 1. 用户故事

| ID | 用户故事 | 优先级 |
|----|---------|--------|
| **US-A01** | 作为管理员，我希望看到团队整体服务质量指标，持续优化客户体验 | P0 |
| **US-A02** | 作为客服主管，我希望看到每个客服的绩效数据，公平评估与指导 | P0 |
| **US-A03** | 作为产品团队，我希望了解访客的行为路径与转化漏斗，迭代产品 | P1 |
| **US-A04** | 作为客服，我希望看到自己的绩效数据与团队平均对比，自我提升 | P1 |

---

## 2. 核心指标体系

### 2.1 业务指标 (Business Metrics)

| 指标 | 定义 | 计算方式 | 目标值 |
|------|------|---------|--------|
| **每月对话数** | 当月总对话量 | count(conversations) where created_at in month | 增长趋势 |
| **活跃客户数** | 当月有使用的付费组织 | count(organizations) where plan > free and has_activity | 增长趋势 |
| **净收入留存率 (NRR)** | 本月收入 / 上月同批客户上月收入 | 按组织群计算 | > 100% (优秀) |
| **AI 解决率** | AI 自动回复后不需要人工介入的对话比例 | (conversations resolved by AI) / total conversations | > 60% |
| **平均首次响应时间** | 从访客发第一条消息到客服首次回复的时间 | avg(first_response_time) | < 5 分钟 |
| **平均解决时间** | 对话从开始到结束的总时长 | avg(resolution_time) | < 30 分钟 |
| **客户满意度 (CSAT)** | 对话结束后访客评分 | avg(rating) / 5 | > 4.2 |

### 2.2 产品指标 (Product Metrics)

| 指标 | 定义 | 计算方式 |
|------|------|---------|
| **Widget 打开率** | 看到 Widget 的访客中点击打开的比例 | opened / displayed |
| **消息发送率** | 打开 Widget 的访客中发送消息的比例 | sent_message / opened |
| **回复率** | 发送消息的访客中收到回复的比例 | received_reply / sent_message |
| **平均对话轮数** | 每个对话的消息总数 | total_messages / total_conversations |
| **离线留言数** | 客服离线时访客留言的数量 | count(offline_messages) |

### 2.3 客服绩效指标 (Agent Performance)

| 指标 | 定义 | 说明 |
|------|------|------|
| **接待对话数** | 个人周期内处理的对话总数 | 绝对值 |
| **首次响应时间** | 个人平均首次响应时长 | 越短越好 |
| **平均解决时长** | 个人处理对话的平均时长 | 越短越好 |
| **CSAT 评分** | 个人对话获得的平均访客评分 | 越高越好 |
| **转接率** | 对话中需要转给同事的比例 | 越低越好 |
| **AI 辅助使用率** | 回复中使用 AI 建议的比例 | 适度即可 |

---

## 3. 数据看板设计

### 3.1 概览看板 (Dashboard)

**布局 - 左上核心指标卡片**：
```
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ 今日对话  │ │ AI 解决率 │ │ 平均响应  │ │ CSAT 评分 │
│  128 ↑5%  │ │  68.2%   │ │  3.2 min  │ │  4.4 / 5  │
└───────────┘ └───────────┘ └───────────┘ └───────────┘
```

**布局 - 中间时间趋势图**：
- 对话量趋势（按日 / 周 / 月切换）
- AI 解决率趋势
- 平均响应时间趋势
- 支持按网站过滤

**布局 - 底部渠道来源**：
- 访客所在页面 Top 10
- 访客来源地区分布
- 浏览器 / 设备分布

### 3.2 团队绩效看板

**客服排行榜（可按各指标排序）**：
| 客服 | 接待数 | 首次响应 | 解决时长 | CSAT |
|------|-------|---------|---------|------|
| 张三 | 86 | 2.1min | 18min | 4.6 |
| 李四 | 72 | 2.8min | 25min | 4.3 |
| ... | ... | ... | ... | ... |

**团队对比基准线**：
- 每个客服数据与团队平均值对比
- 用颜色标识：优于平均（绿）/ 接近平均（黄）/ 低于平均（红）

### 3.3 单对话详情分析

**可查看对话的深度指标**：
- 对话的完整时间线（每条消息的时间戳）
- AI 匹配到的知识库条目与相似度分数
- AI 建议的采纳情况
- 客服的实际输入内容
- 访客满意度评分（如有）

---

## 4. 转化漏斗分析

### 4.1 访客对话漏斗

```
阶段 0：Widget 展示
  ↓ 打开率 (目标: 5-10%)
阶段 1：Widget 打开
  ↓ 发消息率 (目标: 30%)
阶段 2：发送第一条消息
  ↓ 回复率 (目标: > 95%)
阶段 3：收到客服/AI 回复
  ↓ 解决率 (目标: > 80%)
阶段 4：对话标记为已解决
```

### 4.2 流失分析

**关键流失点诊断**：
- 打开但不发消息 → 欢迎语优化？引导话术？
- 发了消息但无回复 → 响应速度问题？客服离线？
- 有回复但访客不满意 → 回答质量？转接机制？

---

## 5. 实时数据需求

### 5.1 实时监控面板

**实时指标（刷新间隔: 10秒）**：
- 当前在线客服数 / 忙碌数 / 空闲数
- 等待中的对话数（按等待时间分颜色）
- 今日已接待对话数
- 最近 5 分钟消息速率

**预警规则**：
- 排队对话 > 5 → 黄色预警
- 排队对话 > 10 → 红色预警 + 通知
- 平均等待时间 > 10 分钟 → 通知主管

---

## 6. 埋点事件规范

### 6.1 前端埋点 (访客端 Widget)

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `widget_displayed` | Widget 脚本加载完成，按钮显示 | `website_id`, `url`, `referrer` |
| `widget_opened` | 访客点击打开聊天窗口 | `website_id`, `visitor_id`, `source` |
| `widget_closed` | 访客关闭聊天窗口 | `website_id`, `visitor_id`, `duration_sec` |
| `message_sent` | 访客发送消息 | `website_id`, `visitor_id`, `conversation_id`, `message_type` (text/file), `has_attachment` |
| `message_received` | 访客收到回复 | `website_id`, `visitor_id`, `conversation_id`, `sender_type` (ai/human), `response_time_ms` |
| `rating_submitted` | 访客提交满意度评分 | `website_id`, `visitor_id`, `conversation_id`, `rating` (1-5), `comment` |
| `offline_message_submitted` | 客服离线时访客留言 | `website_id`, `visitor_id`, `has_email`, `has_phone` |
| `hand_off_triggered` | 对话转接人工客服 | `website_id`, `visitor_id`, `conversation_id`, `reason` |

### 6.2 前端埋点 (客服工作台)

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `agent_logged_in` | 客服登录 | `user_id`, `organization_id` |
| `agent_status_changed` | 在线/忙碌/离开状态变更 | `user_id`, `from_status`, `to_status` |
| `conversation_assigned` | 对话分配给客服 | `user_id`, `conversation_id`, `assignment_type` (auto/manual) |
| `ai_suggestion_clicked` | 点击使用 AI 建议回复 | `user_id`, `conversation_id`, `suggestion_index`, `edited_before_send` |
| `shortcut_reply_used` | 使用快捷回复 | `user_id`, `conversation_id`, `shortcut_id` |
| `conversation_transferred` | 转出对话 | `user_id`, `conversation_id`, `to_user_id`, `reason` |
| `conversation_closed` | 结束对话 | `user_id`, `conversation_id`, `total_messages`, `duration_sec` |

### 6.3 后端事件

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `ai_response_generated` | AI 完成回复生成 | `conversation_id`, `model_used`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `kb_items_matched`, `confidence_score` |
| `kb_item_matched` | 知识库条目被命中 | `kb_item_id`, `conversation_id`, `similarity_score`, `used_in_response` |
| `quota_exceeded` | 组织用量超过配额 | `organization_id`, `quota_type`, `current_usage`, `quota_limit` |

---

## 7. 数据导出与 API

### 7.1 报表导出

**支持格式**：CSV, Excel, PDF

**预定义报表**：
- 日报：昨日核心指标摘要（自动邮件发送）
- 周报：上周趋势与对比（自动邮件发送）
- 月报：完整月度分析报告
- 客服个人绩效报表（每月）

### 7.2 Analytics API

**开放接口（Pro 计划可用）**：
```
GET /v1/analytics/conversations?start_date=&end_date=&website_id=
  → 对话明细列表

GET /v1/analytics/metrics?start_date=&end_date=&granularity=day
  → 核心指标时间序列

GET /v1/analytics/agents?start_date=&end_date=
  → 客服个人绩效数据

GET /v1/analytics/funnel?start_date=&end_date=
  → 转化漏斗各阶段数据
```

---

## 8. 验收标准

### P0 必须满足
- [ ] 核心业务指标正常统计（对话数、AI 解决率、响应时间、CSAT）
- [ ] 概览看板正常展示核心指标与趋势图
- [ ] 客服个人绩效统计与排行榜
- [ ] 前端核心事件埋点（Widget 展示、打开、发消息）

### P1 应该满足
- [ ] 转化漏斗分析
- [ ] 实时监控面板与预警
- [ ] 自动邮件报表（日报 / 周报）
- [ ] Analytics API 接口

### P2 可以考虑
- [ ] 对话深度分析（AI 匹配、采纳情况）
- [ ] 访客行为路径分析
- [ ] 自定义报表与导出
