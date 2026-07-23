# Cossistant 实时消息系统架构

| 文档版本 | 创建日期 | 基于代码版本 |
|---------|---------|-------------|
| v1.0 | 2026-07-22 | Git HEAD |

---

## 1. 系统概述

Cossistant 实时消息系统采用 **Bun 原生 WebSocket + Redis Streams 分布式事件总线** 架构，支持多 API 实例水平扩展、跨实例事件广播、40+ 种事件类型、访客/客服双向实时通信。

### 1.1 核心特性

| 特性 | 说明 | 实现 |
|-----|------|------|
| **高性能** | Bun 原生 WebSocket，比 Node.js 快 3-5 倍 | `ws/socket.ts` |
| **分布式** | Redis Streams 跨实例事件总线，支持水平扩展 | `ws/realtime-pubsub.ts` |
| **多租户隔离** | Organization + Website 双重边界验证 | `realtime/emitter.ts` |
| **双受众路由** | 事件分发给访客、客服、或全体 | `ws/router.ts` |
| **多维度索引** | 按 visitorId、websiteId、userId 反向索引 | `ws/connection-registry.ts` |
| **停电模式支持** | 计费平台故障时事件路由不受影响 | 全链路设计 |
| **类型安全** | Zod 验证所有事件载荷与类型 | `@cossistant/types/realtime-events.ts` |

---

## 2. 四层架构总览

```
┌───────────────────────────────────────────────────────────────────────┐
│                        第 4 层: 统一入口层                                │
│                   RealtimeEmitter (realtime/emitter.ts)                │
│          事件类型验证 → 受众解析 → 调用路由分发                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────┐
│                        第 3 层: 事件路由层                                │
│                   RouteEvent 路由函数 (ws/router.ts)                    │
│          eventType → 分发规则 → 目标连接匹配 → 发送事件                  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
┌─────────▼──────────┐  ┌────────▼───────────┐  ┌────────▼───────────┐
│ 本地连接广播        │  │ 访客连接广播        │  │ 网站连接广播        │
│ (当前进程内连接)   │  │ (特定访客)          │  │ (网站内所有客服)    │
└─────────┬──────────┘  └────────┬───────────┘  └────────┬───────────┘
          │                       │                       │
┌─────────▼────────────────────────▼───────────────────────▼───────────┐
│                        第 2 层: 跨实例总线层                                │
│                   Redis Streams XADD + XREADGROUP                       │
│              (ws/realtime-pubsub.ts)                                      │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ STREAM key: realtime:dispatch                                    │   │
│  │ { sourceId, target: {type,id,exclude}, event }                  │   │
│  │ MAXLEN ~ 10000，cursor 持久化，指数退避重试                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────────┐
│                        第 1 层: 本地连接注册表                              │
│                   ConnectionRegistry (ws/connection-registry.ts)         │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │ connections Map      │  │ connectionByWebsite │  │ connectionBy  │  │
│  │ connectionId → Record │  │ websiteId → Set     │  │Visitor Map   │  │
│  └──────────────────────┘  └──────────────────────┘  │ visitorId → Set│  │
│                                                         └───────────────┘  │
│                                                                             │
│  原子操作: registerConnection, unregisterConnection, dispatchTo*       │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │ 访客浏览器 / 客服仪表板   │
                    └─────────────────────────┘
```

---

## 3. 核心模块详解

### 3.1 连接注册表 (Connection Registry)

**代码位置**：`apps/api/src/ws/connection-registry.ts`

连接注册表维护当前 API 实例的所有活跃 WebSocket 连接，提供 O(1) 的多维度索引查询。

#### 3.1.1 数据结构

```typescript
// 连接记录结构
type LocalConnectionRecord = {
  socket: ServerWebSocket;         // Bun 原生 WebSocket 句柄
  websiteId?: string;              // 所属网站 (如有)
  organizationId?: string;         // 所属组织 (如有)
  userId?: string;                 // 客服用户 ID (如有)
  visitorId?: string;              // 访客 ID (如有)
};

// 三大索引
const localConnections = new Map<string, LocalConnectionRecord>();
const connectionsByWebsiteId = new Map<string, Set<string>>();
const connectionsByVisitorId = new Map<string, Set<string>>();
```

| 索引 | 用途 | 查询复杂度 |
|-----|------|-----------|
| `localConnections` | 主键，按 connectionId 查找连接详情 | O(1) |
| `connectionsByWebsiteId` | 查找某个网站的所有客服连接 | O(1) |
| `connectionsByVisitorId` | 查找某个访客的所有连接 (可能多端) | O(1) |

#### 3.1.2 核心操作

```typescript
// 注册连接
// 自动更新 WebsiteIndex + VisitorIndex
// 若 connectionId 已存在：先清理旧索引，再原子化更新
function registerConnection(connectionId: string, record: LocalConnectionRecord): void;

// 注销连接
// 同步从两个反向索引中移除
function unregisterConnection(connectionId: string): void;

// 向单个连接发送事件
function dispatchEventToLocalConnection(
  connectionId: string,
  event: AnyRealtimeEvent
): void;

// 向特定访客的所有连接发送事件
// (访客可能在多个浏览器标签，每个标签一个连接)
function dispatchEventToLocalVisitor(
  visitorId: string,
  event: AnyRealtimeEvent,
  options?: DispatchOptions  // 可排除特定 connectionId
): void;

// 向特定网站的所有客服连接发送事件
// (过滤掉非客服的访客连接，只发给已认证的 userId)
function dispatchEventToLocalWebsite(
  websiteId: string,
  event: AnyRealtimeEvent,
  options?: DispatchOptions
): void;

// 统计 (用于监控)
function getConnectionStats(): {
  totalConnections: number;
  uniqueWebsites: number;
  uniqueVisitors: number;
};
```

#### 3.1.3 索引更新机制

**注册时的索引更新**：
```
新连接 registerConnection(visitorId=V1, websiteId=W1)
    │
    ├─ ▶ localConnections.set(connId, record)
    │
    ├─ ▶ connectionsByWebsiteId:
    │   └─ 如果 W1 不存在则创建 Set
    │   └─ W1Set.add(connId)
    │
    └─ ▶ connectionsByVisitorId:
        └─ 如果 V1 不存在则创建 Set
        └─ V1Set.add(connId)
```

**注销时的索引清理**：
```
连接断开 unregisterConnection(connId)
    │
    └─ 从 localConnections 取出 record = { websiteId, visitorId }
        │
        ├─ 如果 websiteId 存在:
        │   └─ W1Set.delete(connId)
        │   └─ if W1Set.size === 0 → connectionsByWebsiteId.delete(W1)
        │
        └─ 如果 visitorId 存在:
            └─ V1Set.delete(connId)
            └─ if V1Set.size === 0 → connectionsByVisitorId.delete(V1)
```

---

### 3.2 Redis Streams 分布式事件总线

**代码位置**：`apps/api/src/ws/realtime-pubsub.ts`

实现跨多个 API 实例的事件广播，解决多实例部署下的连接 locality 问题。

#### 3.2.1 设计背景与问题

**问题**：
> 访客连接在实例 A，客服连接在实例 B，如何让实例 A 的事件发送到实例 B 的连接？

**解决方案**：
> 所有实例订阅同一个 Redis Stream，发送方将事件写入 Stream，所有实例消费后在本地分发给自己维护的连接。

#### 3.2.2 核心数据结构

```typescript
const STREAM_KEY = "realtime:dispatch";
const STREAM_MAX_LEN = 10000;      // 定长环，防止内存溢出
const STREAM_BLOCK_MS = 5000;       // XREAD 阻塞 5 秒后重试
const CURSOR_KEY_PREFIX = "realtime:cursor:";

// 信封结构（写入 Stream 的 JSON）
type DispatchEnvelope = {
  sourceId: string;                   // 源实例 ID，用于日志追踪
  target: {
    type: "connection" | "visitor" | "website";
    id: string;
    exclude?: string[];               // 不发送给这些连接 (发送方自己)
  };
  event: AnyRealtimeEvent;
};
```

#### 3.2.3 发布流程 (Publish)

```typescript
async function publishEnvelope(envelope: DispatchEnvelope): Promise<void> {
  // 支持最多 3 次重试，指数退避
  // Redis XADD: STREAM_KEY MAXLEN ~ STREAM_MAXLEN * payload
  for (let attempt = 0; attempt <= MAX_PUBLISH_RETRIES; attempt++) {
    try {
      await redis.xadd(STREAM_KEY, "MAXLEN", "~", STREAM_MAX_LEN,
                       "*", STREAM_FIELD, JSON.stringify(envelope));
      return;
    } catch {
      if (attempt === MAX_PUBLISH_RETRIES) throw;
      await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt);
    }
  }
}

// 对外暴露的三个发布入口
publishToConnection(connectionId, event);      // 发给单个连接
publishToVisitor(visitorId, event, options);   // 发给特定访客的所有连接
publishToWebsite(websiteId, event, options);    // 发给网站所有客服连接
```

#### 3.2.4 消费流程 (Consumer Loop)

```typescript
let consumerRunning = false;
let lastSeenId = "$";                         // "$" = 从最新开始消费
let cursorPersistTimer = null;

async function runConsumerLoop(): Promise<void> {
  await loadCursor();  // 从 Redis 恢复上次消费位置

  while (dispatchersRef) {  // 只要调度器注册了就一直跑
    try {
      // 阻塞式 XREAD，读到新条目或超时
      const response = await redis.xread(
        "BLOCK", STREAM_BLOCK_MS,
        "COUNT", STREAM_BATCH_SIZE,
        "STREAMS", STREAM_KEY, lastSeenId
      );

      if (!response) continue;  // 超时，继续循环

      for (const [id, fields] of entries) {
        // 1. 解析 JSON payload
        const envelope = parseStreamEntry(fields);
        if (!envelope) continue;

        // 2. 推进消费游标，下次从这里开始
        lastSeenId = id;
        markProcessed(id);  // 防抖写入 Redis，默认 1 秒后落盘

        // 3. 本地分发 (调用 connection-registry)
        handleEnvelope(envelope);
      }
    } catch (error) {
      console.error("[RealtimeStreams] 消费者循环错误", error);
      await sleep(1000);  // 出错后 1 秒重试，防止 Redis 故障打满 CPU
    }
  }
}
```

#### 3.2.5 Cursor 持久化策略

**问题**：进程重启后从哪里开始消费？

| 策略 | 优点 | 缺点 | 采用 |
|-----|------|------|------|
| `"$"` 从最新开始 | 简单，不重发旧消息 | 重启期间消息丢失 | ✅ 采用 |
| `0` 从历史开始 | 不丢消息 | 收到大量过期消息、重复发送 | ❌ |
| **持久化 Cursor** | 重启后断点续传 | 需额外存储 | ✅ (最佳) |

**实现**：
```
消费到 id = "1689900000000-0"
    │
    └─ markProcessed(id)
        │
        └─ 防抖 Timer 1 秒
        │
        └─ 1 秒内无新消息 → SET redis:cursor:instanceId = id
        │
        └─ 下次重启 → loadCursor() 读取该值
```

**注意**：当前实现从 `"$"` 开始，即重启期间 **可能丢失少数实时消息**。考虑到实时聊天场景，这是可接受的权衡（延迟发送 vs. 收到大量过期消息）。

#### 3.2.6 信封分发逻辑

```typescript
function handleEnvelope(envelope: DispatchEnvelope): void {
  // Step 1: 事件类型校验 - 必须是白名单内的类型
  if (!isValidEventType(envelope.event.type)) {
    console.error("忽略无效事件类型:", envelope.event.type);
    return;
  }

  // Step 2: Zod schema 验证 - 确保 payload 结构正确
  // 来自 @cossistant/types/realtime-events
  try {
    validateRealtimeEvent(envelope.event.type, envelope.event.payload);
  } catch (error) {
    console.error("payload 验证失败:", error);
    return;
  }

  // Step 3: 按目标类型分发到本地连接注册表
  switch (envelope.target.type) {
    case "connection":
      dispatchEventToLocalConnection(envelope.target.id, envelope.event);
      break;
    case "visitor":
      dispatchEventToLocalVisitor(
        envelope.target.id,
        envelope.event,
        envelope.target.exclude
      );
      break;
    case "website":
      dispatchEventToLocalWebsite(
        envelope.target.id,
        envelope.event,
        envelope.target.exclude
      );
      break;
  }
}
```

---

### 3.3 RealtimeEmitter: 统一事件发送入口

**代码位置**：`apps/api/src/realtime/emitter.ts`

系统所有模块发送实时事件的唯一入口，封装了目标解析和事件验证。

#### 3.3.1 核心使用方式

```typescript
// 任何地方只要引入这个单例即可发事件
import { realtime } from "@api/realtime/emitter";

// 示例 1: 通知某个网站有新对话
await realtime.emit("conversation:created", {
  organizationId: "org_xxx",
  websiteId: "ws_xxx",
  conversationId: "conv_xxx",
});

// 示例 2: 发送 AI 处理进度给某个访客
await realtime.emit("ai:processing:progress", {
  organizationId: "org_xxx",
  websiteId: "ws_xxx",
  visitorId: "v_xxx",
  step: 2,
  totalSteps: 5,
});

// 示例 3: 可选指定额外访客列表
await realtime.emit("conversation:updated", payload, {
  visitorIds: ["v_aaa", "v_bbb"],
});
```

#### 3.3.2 内部实现流程

```typescript
class RealtimeEmitter {
  async emit(type, payload, options = {}) {
    // 1. Zod 验证 event payload 结构
    const data = validateRealtimeEvent(type, payload);

    // 2. 解析组织和网站 ID (payload 中提取)
    const websiteId = payload.websiteId ?? extractWebsiteId(data);
    const organizationId = payload.organizationId ?? extractOrganizationId(data);

    // 3. 强制校验必须有这两个 ID（多租户隔离）
    if (!websiteId) throw new Error(`缺少 websiteId，事件类型: ${type}`);
    if (!organizationId) throw new Error(`缺少 organizationId`);

    const event = { type, payload: data };

    // 4. 解析访客目标:
    //    a) 若传了 visitorIds 直接用
    //    b) 若 payload.visitorId 存在且是 contact-scoped 事件类型，则查 DB 关联访客
    const visitorIds = await resolveVisitorDeliveryTargets({
      type,
      organizationId,
      websiteId,
      visitorId: payload.visitorId,
      visitorIds: options.visitorIds,
    });

    // 5. 构造路由上下文
    const ctx = {
      connectionId: "server",  // 标记为服务器发起
      websiteId,
      visitorId: payload.visitorId,
      visitorIds,
      userId: payload.userId,
      organizationId,
      sendToConnection,
      sendToVisitor,
      sendToWebsite,
    };

    // 6. 委托给 RouteEvent 函数做具体分发
    await routeEvent(event, ctx);
  }
}
```

#### 3.3.3 Contact-Scoped 访客目标解析

**场景**：一个对话可能有访客、客服、多方参与，哪些人应该收到这个事件？

```typescript
async function resolveVisitorDeliveryTargets(params) {
  if (params.visitorIds) return normalizeVisitorIds(params.visitorIds);

  // 仅特定类型的事件才需要自动查访客
  if (!CONTACT_SCOPED_VISITOR_EVENT_TYPES.has(params.type)) {
    return undefined;
  }

  // 需要联系范围事件 → 查数据库获取所有相关访客
  // e.g. AI 处理进度、消息新增、对话更新
  try {
    const visitorIds = await getConversationDeliveryVisitorIds(db, {
      organizationId: params.organizationId,
      websiteId: params.websiteId,
      conversationVisitorId: params.visitorId,
    });
    return normalizeVisitorIds(visitorIds);
  } catch (error) {
    // DB 查询失败降级：只发给 payload 中的 visitorId
    console.warn("resolve visitor targets 失败，降级到原始 ID:", error);
    return [params.visitorId];
  }
}

const CONTACT_SCOPED_VISITOR_EVENT_TYPES = new Set([
  "aiAgentProcessingStarted",
  "aiAgentProcessingProgress",
  "aiAgentProcessingCompleted",
  "conversationUpdated",
  "timelineItemCreated",
  "timelineItemUpdated",
  "timelineItemPartUpdated",
]);
```

---

### 3.4 事件路由 (RouteEvent)

**代码位置**：`apps/api/src/ws/router.ts`

根据事件类型确定要发送给哪些受众。

#### 3.4.1 RouteEvent 函数签名

```typescript
async function routeEvent(
  event: RealtimeEvent,
  ctx: EventContext
): Promise<void>;

type EventContext = {
  connectionId: string;
  websiteId: string;
  visitorId?: string;
  visitorIds?: string[];      // 多访客目标
  userId?: string;
  organizationId: string;
  sendToConnection: (connId, event) => void;
  sendToVisitor: (visitorId, event, options?) => void;
  sendToWebsite: (websiteId, event, options?) => void;
};
```

#### 3.4.2 路由策略矩阵

| 事件类型 | 发送给访客 | 发送给网站客服 | 排除发送者自己 |
|---------|-----------|--------------|--------------|
| **visitor:message:created** | ✅ 访客本人 | ✅ | ❌ |
| **agent:message:created** | ✅ 访客本人 | ✅ | ❌ |
| **user:message:created** | ✅ 访客本人 | ✅ | ✅ (不回显自己的消息) |
| **ai:* (所有 AI 事件)** | ✅ 相关访客 | ✅ | ❌ |
| **conversation:created** | ✅ | ✅ | ❌ |
| **conversation:assigned** | ✅ | ✅ | ❌ |
| **conversation:resolved** | ✅ | ✅ | ❌ |
| **presence:* (在线状态)** | ❌ | ✅ (仪表板显示) | ❌ |

---

### 3.5 WebSocket Socket 连接处理

**代码位置**：`apps/api/src/ws/socket.ts`

WebSocket 握手、消息处理、连接生命周期管理。

#### 3.5.1 Bun 原生 WebSocket 集成

```typescript
import { upgradeWebSocket } from "hono/bun";

const websocketHandler = upgradeWebSocket(
  (c, upgradeHeaders) => {
    // 握手阶段：从 URL 或 Cookie 解析身份
    const connectionId = crypto.randomUUID();
    const websiteId = c.req.query("websiteId");
    const visitorId = c.req.query("visitorId");
    const userId = c.get("user")?.id;  // 已登录客服

    return {
      onOpen(evt) {
        // 1. 注册到 ConnectionRegistry
        registerConnection(connectionId, {
          socket: evt.ws,
          websiteId,
          visitorId,
          userId,
        });
        // 2. 向仪表板广播此访客/客服上线
      },
      onMessage(evt) {
        // 收到消息（目前主要是 ping，消息走 REST API）
        // 未来可扩展支持发送消息等
      },
      onClose() {
        // 1. 从 ConnectionRegistry 注销
        unregisterConnection(connectionId);
        // 2. 广播离线事件
      },
      onError(evt) {
        console.error("[WebSocket] 连接错误:", evt.error);
        unregisterConnection(connectionId);
      },
    };
  }
);
```

#### 3.5.2 两种握手模式

| 连接模式 | 认证方式 | 能接收的事件 |
|---------|---------|------------|
| **访客连接** | URL query `visitorId` | 自身对话的所有事件 |
| **仪表板连接** | Session Cookie + CSRF 校验 | 所属 Website 的所有事件 |

---

## 4. 完整消息流时序图

```
访客 Widget (浏览器)                         API 实例 A                           Redis Stream                         API 实例 B                      客服仪表板
      │                                          │                                  │                                  │
      │ 1. 发送消息 (WebSocket Text)            │                                  │                                  │
      ├─────────────────────────────────────────>│                                  │                                  │
      │                                          │                                  │                                  │
      │                                          │ 2. 写入 DB, 创建 timeline item    │                                  │
      │                                          │                                  │                                  │
      │                                          │ 3. 触发 publishToVisitor          │                                  │
      │                                          │──────────────────────────────────>│ 4. XADD realtime:dispatch       │
      │                                          │                                  │                                  │
      │                                          │                                  │──────────────────────────────────>│ 5. XREADGROUP 消费到
      │                                          │                                  │                                  │
      │                                          │                                  │                                  │ 6. dispatchEventToLocalVisitor
      │                                          │                                  │                                  │──────── (发给访客本地连接)
      │                                          │                                  │                                  │
      │                                          │ 7. publishToWebsite               │                                  │
      │                                          │──────────────────────────────────>│ 8. XADD realtime:dispatch       │
      │                                          │                                  │                                  │
      │                                          │                                  │──────────────────────────────────>│ 9. XREADGROUP 消费到
      │                                          │                                  │                                  │
      │                                          │                                  │                                  │ 10. dispatchEventToLocalWebsite
      │                                          │                                  │                                  │──────── (发给客服本地连接)
      │                                          │                                  │                                  │
      │ 11. visitor 收到消息                     │                                  │                                  │ 12. 客服收到消息
      │<─────────────────────────────────────────┤                                  │                                  │<────────
      │                                          │                                  │                                  │
```

---

## 5. 类型安全事件系统

**代码位置**：`packages/types/src/realtime-events.ts`

### 5.1 事件类型定义

```typescript
// 40+ 种事件类型
type RealtimeEventType =
  | "visitor:message:created"
  | "agent:message:created"
  | "user:message:created"
  | "conversation:created"
  | "conversation:updated"
  | "conversation:assigned"
  | "conversation:resolved"
  | "conversation:locked"
  | "conversation:unlocked"
  | "conversation:delete"
  | "aiAgent:processing:started"
  | "aiAgent:processing:progress"
  | "aiAgent:processing:completed"
  | "timeline:item:created"
  | "timeline:item:updated"
  | "presence:visitor:online"
  | "presence:visitor:offline"
  | "presence:user:online"
  | "presence:user:offline"
  | "knowledge:clarification:requested"
  | "knowledge:sync:progress"
  | "notification:new"
  | "... 40+ types";

// 每个类型对应 Zod schema，运行时验证
const RealtimeEventSchemas = {
  "visitor:message:created": visitorMessageCreatedSchema,
  "agent:message:created": agentMessageCreatedSchema,
  // ...
};
```

### 5.2 验证函数

```typescript
function validateRealtimeEvent<T extends RealtimeEventType>(
  type: T,
  payload: unknown
): RealtimeEventData<T> {
  const schema = RealtimeEventSchemas[type];
  if (!schema) throw new Error(`Unknown event type: ${type}`);
  return schema.parse(payload);  // Zod 安全解析
}
```

---

## 6. 性能优化

| 优化点 | 说明 |
|-------|------|
| **O(1) 索引查询** | ConnectionRegistry 三个 Map，所有查找都是常数时间 |
| **Stream 批量消费** | `COUNT 50` 一次读多条，减少 Redis 往返 |
| **Cursor 防抖持久化** | 1 秒 Timer 聚合写 Redis，避免每条都写 |
| **发布指数退避重试** | Redis 临时故障自动重试，保证消息送达 |
| **Bun 原生 WebSocket** | 比 Node.js ws 库性能高数倍 |
| **Maxlen 环缓冲** | Redis Stream 固定长度，不会无限制增长内存 |

---

## 7. 故障与恢复

| 故障场景 | 影响 | 恢复机制 |
|---------|------|---------|
| **单个 API 实例重启** | 该实例连接断开，访客/客服自动重连到其他实例 | 客户端自动重连，心跳检测 |
| **Redis 短暂故障** | 发布失败（重试 3 次），消费暂停，恢复后自动续 | 指数退避重试，1 秒心跳保活 |
| **Redis 永久故障** | 跨实例广播失效，仅同实例内通信正常 | 降级模式，仪表板显示连接警告 |
| **瞬时网络抖动** | 少量连接断开，自动重连 | 客户端重连 + 会话恢复 |

---

## 相关文档

- [01 系统整体架构](./01-SYSTEM-OVERVIEW.md)
- [04 AI 对话管道](./04-AI-CONVERSATION.md)
- [06 访客追踪](./06-VISITOR-TRACKING.md)

---

*文档由代码分析自动生成，如有疑问请对照源代码核实。*
