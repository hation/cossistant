# 实时消息系统架构详解

## 概述

Cossistant 的实时消息系统是一个基于 **WebSocket + Redis Streams** 的完整实时通信架构，采用双向事件驱动模型，支持访客与客服的实时对话、在线状态同步、以及AI处理进度的可视化。

**核心特性**：
- 基于Bun原生WebSocket的高性能通信
- Redis Streams分布式事件总线（跨服务器实例）
- 40+种实时事件类型（对话、在线、AI处理、爬虫等）
- 完整的多租户隔离机制
- 安全的双向认证（API Key + Session）
- Typing指示器和心跳保活
- 消息可见性控制（private/public）
- Audience机制（dashboard-only vs all）

---

## 目录

1. [系统架构总览](#1-系统架构总览)
2. [核心文件映射](#2-核心文件映射)
3. [数据模型与存储](#3-数据模型与存储)
4. [WebSocket通信层](#4-websocket通信层)
5. [事件路由与分发](#5-事件路由与分发)
6. [Redis Streams分布式事件总线](#6-redis-streams分布式事件总线)
7. [在线状态管理](#7-在线状态管理)
8. [安全与认证](#8-安全与认证)
9. [AI处理进度可视化](#9-ai处理进度可视化)
10. [错误处理与恢复](#10-错误处理与恢复)
11. [性能优化与监控](#11-性能优化与监控)
12. [附录：事件类型完整清单](#12-附录事件类型完整清单)

---

## 1. 系统架构总览

### 1.1 分层架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   前端客户端层                                              │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐                      │
│ │ 访客组件                       │ │ 仪表板（客服/管理员）          │                      │
│ │  - 对话窗口                   │ │  - 多对话管理                  │                      │
│ │  - Typing指示器                │ │  - 实时通知                    │                      │
│ │  - 在线状态显示               │ │  - Agent状态监控              │                      │
│ │  - 文件与表单                 │ │  - 统计与分析                 │                      │
│ └─────────────────────────────────┘ └─────────────────────────────────┘                      │
└─────────────────────────────┬─────────────────────────────┬───────────────────────────────────────┘
                              │                             │
                              │ (WebSocket)                 │ (WebSocket)
                              │                             │
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         API服务层                                            │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                             WebSocket握手与升级（Hono）                                      │ │
│ │  - 认证验证（API Key / Session）                                                           │ │
│ │  - 连接注册与管理                                                                           │ │
│ │  - 心跳处理（Ping/Pong）                                                                    │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                             Realtime Emitter（事件发射）                                     │ │
│ │  - emit()方法封装                                                                          │ │
│ │  - Delivery Target解析                                                                     │ │
│ │  - Content Hash计算                                                                       │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                             Event Router（事件路由）                                        │ │
│ │  - Dispatch Rules配置                                                                     │ │
│ │  - Event Handlers处理                                                                     │ │
│ │  - Audience Filtering                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                             Realtime PubSub（分布式事件总线）                               │ │
│ │  - Redis Streams：realtime:dispatch                                                        │ │
│ │  - 跨实例事件分发                                                                           │ │
│ │  - Cursor持久化与恢复                                                                       │ │
│ │  - 重试机制（指数退避）                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                             Connection Registry（本地连接注册表）                           │ │
│ │  - 连接→Visitor/User映射                                                                   │ │
│ │  - 连接→Website/Organization映射                                                           │ │
│ │  - 事件→本地连接匹配                                                                       │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                             与AI Pipeline集成                                               │ │
│ │  - Typing Indicator（输入指示器）                                                         │ │
│ │  - Processing Progress（处理进度）                                                         │ │
│ │  - Completed Events（完成事件）                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                              │
                              │
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        Redis集群                                                │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │  - realtime:dispatch (STREAM，事件总线)                                                    │ │
│ │  - realtime:cursor:$instanceId (STRING，消费游标)                                          │ │
│ │  - presence相关（可选）                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 关键设计原则

1. **分离关注点**：本地连接管理 vs 分布式事件分发
2. **多租户隔离**：Website/Organization双重边界验证
3. **高可用**：Redis Streams + 消费游标持久化 + 跨实例广播
4. **安全性**：Audience + Visibility + 租户ID三层过滤
5. **可观察性**：完整的事件日志与错误报告

---

## 2. 核心文件映射

### 2.1 文件目录树

```
apps/api/src/
├── realtime/
│   ├── emitter.ts              # Realtime Emitter类（事件发射入口）
│   └── support-state.ts        # 客服状态相关
├── ws/
│   ├── connection-registry.ts  # 本地连接注册表
│   ├── realtime-pubsub.ts     # Redis Streams集成
│   ├── router.ts              # 事件路由与分发规则
│   └── socket.ts              # WebSocket连接处理
├── ai-pipeline/
│   └── shared/
│       ├── events/
│       │   ├── progress.ts    # AI处理进度事件
│       │   ├── typing.ts      # Typing指示器事件
│       │   └── seen.ts        # 已读标记事件
│       └── telemetry/
└── utils/
    ├── conversation-realtime.ts  # 对话事件工具
    ├── websocket-connection.ts   # WebSocket连接管理
    └── websocket-message.ts      # 消息处理

packages/cossistant-types/src/
└── realtime-events.ts        # 事件类型定义与验证
```

### 2.2 核心文件功能清单

| 文件名 | 主要功能 | 关键类/函数 |
|--------|---------|-----------|
| **`realtime/emitter.ts`** | 统一的事件发射入口，目标解析，内容哈希计算 | `RealtimeEmitter`，`emit()`，`resolveVisitorDeliveryTargets()` |
| **`ws/router.ts`** | 事件路由，分发规则，可见性过滤 | `routeEvent()`，`dispatchEvent()`，`shouldSendToVisitor()` |
| **`ws/socket.ts`** | WebSocket连接生命周期，认证，消息处理 | `upgradedWebsocket`，`handleConnectionClose()`，`validateClientEvent()` |
| **`ws/realtime-pubsub.ts`** | Redis Streams集成，跨实例事件分发 | `initializeRealtimePubSub()`，`publishToVisitor()`，`runConsumerLoop()` |
| **`ws/connection-registry.ts`** | 本地连接映射表，连接ID→Socket，Visitor/User查找 | `localConnections`，`registerConnection()`，`dispatchEventToLocal*()` |
| **`ai-pipeline/shared/events/typing.ts`** | Typing指示器心跳管理 | `PipelineTypingHeartbeat`，`emitPipelineTypingStart/Stop()` |
| **`ai-pipeline/shared/events/progress.ts`** | AI处理进度事件发射 | `emitPipelineToolProgress()`，`emitPipelineGenerationProgress()`，`emitPipelineProcessingCompleted()` |

---

## 3. 数据模型与存储

### 3.1 事件模型

所有事件都通过 `RealtimeEvent` 类型定义：

```typescript
interface RealtimeEvent<T extends RealtimeEventType> {
  type: T;
  payload: RealtimeEventData<T>;
}
```

**通用事件 Payload 字段**：
```typescript
{
  organizationId?: string;  // 组织ID（租户隔离）
  websiteId?: string;        // 网站ID（租户隔离）
  visitorId?: string;        // 访客ID
  userId?: string;           // 用户ID
  conversationId?: string;   // 对话ID
  aiAgentId?: string;        // AI代理ID
  audience?: "all" | "dashboard";  // 受众过滤
}
```

### 3.2 事件验证

使用 `validateRealtimeEvent()` 进行严格的类型验证：

```typescript
// packages/cossistant-types/src/realtime-events.ts
function validateRealtimeEvent<T extends RealtimeEventType>(
  type: T,
  payload: unknown
): RealtimeEventData<T> {
  // 每个事件类型有其专属的Zod schema
  const schema = EVENT_DATA_SCHEMAS[type];
  return schema.parse(payload);
}
```

### 3.3 Redis Streams结构

**Stream名称**：`realtime:dispatch`

**Entry结构**（XADD格式）：
```
["payload", "{\"sourceId\": \"api_1234\", \"target\": {\"type\": \"visitor\", \"id\": \"vis_abc\"}, \"event\": {...}}"]
```

**Dispatch Envelope结构**：
```typescript
{
  sourceId: string;  // 来源实例ID（API服务器ID）
  target: {
    type: "connection" | "visitor" | "website";
    id: string;
    exclude?: string[];  // 要排除的连接ID
  };
  event: AnyRealtimeEvent;
}
```

### 3.4 游标持久化

**Key格式**：`realtime:cursor:$instanceId`

**存储内容**：最后一个成功消费的Redis Stream ID（`$`表示从最新开始）

---

## 4. WebSocket通信层

### 4.1 连接建立流程

```
客户端（浏览器）
    │
    │ 1. HTTP/HTTPS请求，Upgrade: websocket
    │    - Query参数: ?token=$privateKey&websiteId=$websiteId&visitorId=$visitorId
    │    - Headers: Authorization: Bearer
    │
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Hono.upgradeWebSocket() 中间件                                      │
│  - 提取认证凭据                                                       │
│  - performWebSocketAuth()                                            │
│  - 连接注册到registry                                                │
└──────────────────────────────────────────────────────────────────────┘
    │
    │ 2. WebSocket连接建立成功
    │
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  发送: {"type": "connection_established", "payload": {connectionId}} │
│  发送: userConnected / visitorConnected 事件                        │
└──────────────────────────────────────────────────────────────────────┘
    │
    │ 3. 进入消息循环
    │
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  onMessage()处理：                                                  │
│  - ping -> pong（4s心跳）                                          │
│  - presence:ping -> 更新lastSeenAt                                │
│  - conversationTyping -> 验证并转发                               │
│  - conversationSeen -> 验证并转发                               │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 认证流程详解

认证支持三种方式：

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| **Private API Key** | `Authorization: Bearer $key` 或 `?token=$key` | 服务器端集成 |
| **Public + Private Key** | 私钥来自服务器，公钥来自前端 | 嵌入式Widget |
| **Better Auth Session** | Cookie或Header Token | 仪表板用户 |

**认证代码流程**（`socket.ts`）：

```typescript
// 1. 从Header或Query提取凭据
{
  privateKey: req.header("Authorization")?.split(" ")[1] ?? req.query("token"),
  publicKey: req.header("X-Public-Key") ?? req.query("publicKey"),
  sessionToken: req.header("X-Session-Token") ?? req.query("sessionToken"),
  visitorId: req.header("X-Visitor-Id") ?? req.query("visitorId"),
  origin: req.header("Origin"),
}

// 2. 验证API Key或Session
performAuthentication(privateKey, publicKey, options);

// 3. 注册连接到registry
registerConnection(connectionId, {
  socket,
  organizationId,
  websiteId,
  userId,
  visitorId,
});
```

### 4.3 支持的客户端消息类型

客户端只能发送以下事件（安全限制）：

```typescript
const CLIENT_ALLOWED_EVENT_TYPES = new Set([
  "conversationTyping",
  "conversationSeen"
]);
```

其他事件类型只能由服务器发射。

---

## 5. 事件路由与分发

### 5.1 路由架构图

```
RealtimeEmitter.emit()
        │
        ├─────────────────────────────────────────────────────────┐
        │                                                        │
        │ resolveVisitorDeliveryTargets()                        │
        │  → 从db加载对话的访客列表（contact_scope）              │
        │                                                        │
        ├─────────────────────────────────────────────────────────┐
        │                                                        │
        ▼                                                        ▼
┌───────────────────────────────┐               ┌───────────────────────────────────┐
│  routeEvent()                │               │   RealtimePubSub.publishTo*()    │
│                              │               │                                   │
│  ┌─────────────────────────┐ │               │   ┌─────────────────────────────┐ │
│  │ 1. 执行EventHandler()  │ │               │   │ XADD to realtime:dispatch │ │
│  │                        │ │               │   └─────────────────────────────┘ │
│  │  - userConnected()    │ │               │                                   │
│  │  - visitorConnected() │ │               │   （跨所有服务器实例广播）         │
│  │  - ...              │ │               │                                   │
│  └─────────────────────────┘ │               └───────────────────────────────────┘
│                              │                              │
│  ┌─────────────────────────┐ │                              ▼
│  │ 2. 检查DispatchRules  │ │               ┌───────────────────────────────────┐
│  │                        │ │               │ runConsumerLoop()               │
│  │ dispatch_rules = {   │ │               │                                   │
│  │   website: boolean   │ │               │ XREAD BLOCK from $cursor        │
│  │   visitor: boolean   │ │               │ 解析envelope                    │
│  │ }                   │ │               │  → dispatchEventToLocal*()       │
│  └─────────────────────────┘ │               │  (当前实例的本地连接)          │
│                              │               └───────────────────────────────────┘
│  ┌─────────────────────────┐ │                              │
│  │ 3. 分发到目标         │ │                              ▼
│  │                        │ │               ┌───────────────────────────────────┐
│  │  → Website (所有)   │ │               │ 本地Connection Registry          │
│  │  → Visitor (特定)  │ │               │ 查找本地WebSocket连接并发送    │
│  │  → Connection (特定)│ │               └───────────────────────────────────┘
│  └─────────────────────────┘ │
│                              │
└───────────────────────────────┘
```

### 5.2 分发规则定义

`dispatchRules` 控制每个事件类型的分发目标：

```typescript
const dispatchRules = {
  // 连接/在线类（广播给website，不发送visitor）
  userConnected: { website: { excludeConnection: true }, visitor: false },
  userDisconnected: { website: { excludeConnection: true }, visitor: false },
  visitorConnected: { website: true, visitor: false },
  visitorDisconnected: { website: true, visitor: false },

  // 对话相关（双方都发送）
  conversationUpdated: { website: true, visitor: true },
  timelineItemCreated: { website: true, visitor: true },
  conversationTyping: { website: true, visitor: true },

  // 爬虫/训练类（仅dashboard）
  crawlStarted: { website: true, visitor: false },
  crawlProgress: { website: true, visitor: false },
  trainingStarted: { website: true, visitor: false },

  // AI处理类（依赖audience payload）
  aiAgentProcessingStarted: { website: true, visitor: true },
  aiAgentProcessingProgress: { website: true, visitor: true },
  aiAgentProcessingCompleted: { website: true, visitor: true }
}
```

### 5.3 Audience与Visibility双重过滤

除了 `dispatchRules` 外，还有两层动态过滤：

**第一层：Audience Filtering**
```typescript
// shouldSendToVisitor()
if (payload.audience === "dashboard") {
  return false;  // 不发送给visitor
}
```

**第二层：Visibility Filtering**
```typescript
if (payload.item?.visibility === "private") {
  return false;  // 私有条目不发送给visitor
}

// 特别规则：tool类型默认private，除非显式标记public
if (payload.item?.type === "tool" && payload.item?.visibility !== "public") {
  return false;
}
```

### 5.4 事件处理器

事件处理器在分发**前**执行，用于副作用处理（记录在线状态等）：

```typescript
const eventHandlers = {
  userConnected: async (ctx, event) => {
    const data = event.payload;
    await markUserPresence({
      websiteId: data.websiteId,
      userId: data.userId,
      lastSeenAt: new Date().toISOString()
    });
  },

  visitorConnected: async (ctx, event) => {
    // 类似用户连接处理
  },

  conversationSeen: (ctx, event) => {
    // 无操作，仅用于路由
  },

  conversationTyping: (ctx, event) => {
    // 无操作，仅用于路由
  },

  // ...其他40+事件...
}
```

---

## 6. Redis Streams分布式事件总线

### 6.1 架构设计

Redis Streams是整个系统的**分布式事件总线**，负责跨多个API服务器实例的事件广播：

```
Server A: emit()
    │
    ├─ Publish to Redis Stream (realtime:dispatch)
    │
    └─→ Redis
           │
           ├─→ Server A: consumer loop (接收)
           │      └─ dispatch to local connections
           │
           ├─→ Server B: consumer loop (接收)
           │      └─ dispatch to local connections
           │
           └─→ Server C: consumer loop (接收)
                  └─ dispatch to local connections
```

### 6.2 消费者循环

**`realtime-pubsub.ts`** 中的核心循环：

```typescript
async function runConsumerLoop(): Promise<void> {
  while (dispatchersRef) {
    try {
      const response = await client.xread(
        "BLOCK",
        STREAM_BLOCK_MS,      // 5000ms
        "COUNT",
        STREAM_BATCH_SIZE,    // 50
        "STREAMS",
        STREAM_KEY,
        lastSeenId
      );

      if (!response) continue;

      for (const [, entries] of response) {
        await processStreamEntries(entries);
      }
    } catch (error) {
      console.error("[RealtimeStreams] Consumer loop error", error);
      await new Promise(r => setTimeout(r, 1000)); // 回退1s
    }
  }
}
```

### 6.3 游标持久化与恢复

**`instanceId`** = `api_${pid}_${random(8)}`，唯一标识每个服务器实例。

```typescript
// 游标Key: realtime:cursor:$instanceId
const instanceCursorKey = `${CURSOR_KEY_PREFIX}${instanceId}`;

async function loadCursor(): Promise<void> {
  const storedCursor = await client.get(instanceCursorKey);
  if (storedCursor) {
    lastSeenId = storedCursor;  // 从崩溃点恢复
  } else {
    setInitialLastSeenId();     // 从最新事件开始
  }
}

// markProcessed（处理成功后1s间隔持久化）
let cursorPersistTimer = null;
function markProcessed(id: string): void {
  lastProcessedId = id;
  if (cursorPersistTimer) return;
  cursorPersistTimer = setTimeout(() => {
    cursorPersistTimer = null;
    if (lastProcessedId && lastProcessedId !== "$") {
      client.set(instanceCursorKey, lastProcessedId);
    }
  }, CURSOR_PERSIST_INTERVAL_MS); // 1000ms
}
```

### 6.4 发布重试机制

```typescript
async function publishEnvelope(envelope: DispatchEnvelope): Promise<void> {
  for (let attempt = 1; attempt <= MAX_PUBLISH_RETRIES; attempt++) {
    try {
      await client.xadd(
        STREAM_KEY,
        "MAXLEN", "~", STREAM_MAX_LEN, // 仅保留最近10k条
        "*",
        STREAM_FIELD, JSON.stringify(envelope)
      );
      return;
    } catch (error) {
      if (attempt === MAX_PUBLISH_RETRIES) {
        throw error;  // 最后一次失败抛出
      }
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt); // 100 → 200 → 400ms
      await sleep(delay);
    }
  }
}
```

### 6.5 Stream修剪策略

使用 `XADD ... MAXLEN ~ 10000` 实现自动修剪，仅保留最近10000个事件（足够覆盖短暂离线）。

---

## 7. 在线状态管理

### 7.1 心跳机制

两种心跳模式：

| 类型 | 触发 | 间隔 | 响应 | 效果 |
|------|------|------|------|------|
| **基础 Ping/Pong** | 客户端定时发送 `ping` | 可配置 | `pong` | 保持WebSocket连接活跃 |
| **Presence Ping** | 客户端定时发送 `presence:ping` | 可配置 | `pong` + 更新lastSeenAt | 刷新在线状态，触发在线人员列表更新 |

### 7.2 Typing Indicator心跳

当AI正在思考时，使用 `PipelineTypingHeartbeat` 保持typing指示器：

```typescript
// ai-pipeline/shared/events/typing.ts
const HEARTBEAT_INTERVAL_MS = 4000; // 每4秒刷新一次

class PipelineTypingHeartbeat {
  constructor(conversation, aiAgentId) {}

  start() {
    emitPipelineTypingStart(...);
    this.interval = setInterval(() => {
      emitPipelineTypingStart(...);  // 周期性重发
    }, HEARTBEAT_INTERVAL_MS);
  }

  stop() {
    emitPipelineTypingStop(...);
  }
}
```

### 7.3 在线人员广播

当用户/访客连接/断开时，自动更新并广播在线状态列表（TODO，目前仅存在presence函数框架）。

---

## 8. 安全与认证

### 8.1 三层认证检查

所有事件都需要通过三层检查：

| 层级 | 检查内容 | 代码位置 |
|------|---------|---------|
| 1 | 连接认证（API Key/Session） | `authenticateWebSocketConnection()` |
| 2 | 事件类型白名单（只有2个允许客户端发送） | `CLIENT_ALLOWED_EVENT_TYPES` |
| 3 | 业务授权（只能发送自己的conversationTyping） | `validateTypingEventAuthorization()` |

### 8.2 业务授权验证

**conversationTyping**：
```typescript
async function validateTypingEventAuthorization(
  payload: { conversationId, visitorId },
  metadata, ws
): Promise<boolean> {
  const conversation = await getConversationById(...);
  if (conversation.websiteId !== metadata.websiteId) {
    sendError(ws, "Unauthorized");
    return false;
  }

  // 访客只能发送自己的typing
  if (metadata.visitorId && !metadata.userId) {
    const canAccess = await canVisitorAccessConversation(...);
    if (!canAccess) {
      sendError(ws, "Unauthorized");
      return false;
    }
    // visitorId匹配检查
    if (payload.visitorId && payload.visitorId !== metadata.visitorId) {
      sendError(ws, "Invalid visitorId");
      return false;
    }
  }
  return true;
}
```

**conversationSeen**：
```typescript
async function validateSeenEventAuthorization(
  payload: { conversationId },
  metadata, ws
): Promise<boolean> {
  // 类似conversationTyping的逻辑
}
```

### 8.3 事件Payload Enrichment

客户端发送的事件payload会被**富集**（override）服务器端确定的值，防止伪造：

```typescript
function enrichClientEventPayload(
  eventType, payload, metadata
): unknown {
  switch (eventType) {
    case "conversationTyping":
      return {
        ...payload,
        organizationId: metadata.organizationId,
        websiteId: metadata.websiteId,
        userId: metadata.userId ?? null,
        visitorId: payload.visitorId ?? metadata.visitorId,
        aiAgentId: null  // 客户端不能冒充
      };
    case "conversationSeen":
      if (metadata.userId) {
        return {
          ...payload,
          actorType: "user",
          actorId: metadata.userId,
          ...
        };
      } else {
        return {
          ...payload,
          actorType: "visitor",
          actorId: metadata.visitorId,
          ...
        };
      }
  }
}
```

### 8.4 Origin验证

防止跨域WebSocket连接：

```typescript
const options = {
  origin,
  protocol,
  hostname,
};
// 在performAuthentication中验证
```

---

## 9. AI处理进度可视化

### 9.1 事件类型

| 事件类型 | 阶段 | 说明 |
|---------|------|------|
| `aiAgentProcessingStarted` | 开始处理 | 通知AI刚刚开始处理 |
| `aiAgentProcessingProgress` | 工具执行中 | 每个ToolCall都发射 |
| `aiAgentProcessingCompleted` | 结束处理 | 包含status(success/skipped/error/cancelled) |

### 9.2 进度事件payload

```typescript
{
  conversationId: string;
  aiAgentId: string;
  workflowRunId: string;
  phase: "tool" | "thinking" | "generating" | "finalizing";
  message?: string;
  tool?: {
    toolCallId: string;
    toolName: string;
    state: "partial" | "result" | "error";
  };
  audience: "all" | "dashboard";
}
```

### 9.3 Audience策略

| 内容 | Audience | 原因 |
|------|---------|------|
| AI内部思考（deterministic_rules/smart decision） | "dashboard" | 不让访客知道AI内部逻辑 |
| Tool执行（特别是knowledge_search） | "dashboard" | 内部工具运行细节 |
| 发送给访客的message | "all" | 访客需要看到AI在回复 |
| Conversation Updated事件 | "all" | 双方都知道对话元数据变化 |

### 9.4 Typing Indicator与心跳

```
访客发送消息
    │
    │ Primary Pipeline启动
    │
    │ AI Pipeline开始处理
    │
    ├─ emit aiAgentProcessingStarted (audience="all")
    │   └─→ 显示"AI正在思考..."
    │
    ├─ emit conversationTyping (isTyping=true)
    │   └─→ 显示Typing指示器
    │
    ├─ (4s后) emitPipelineTypingHeartbeat()
    │   └─→ 刷新Typing指示器（防超时）
    │
    ├─ (每4s一次心跳)
    │
    ├─ emit sendMessage
    │   └─→ 显示给访客
    │
    └─ emit conversationTyping (isTyping=false)
        └─→ 隐藏Typing指示器
```

---

## 10. 错误处理与恢复

### 10.1 连接关闭处理

```typescript
async function handleConnectionClose(connectionId): Promise<void> {
  const record = localConnections.get(connectionId);
  if (!record) return;

  const context = {
    connectionId,
    userId: record.userId,
    visitorId: record.visitorId,
    ...
  };

  // 发射disconnected事件
  if (record.userId) {
    await routeEvent({
      type: "userDisconnected",
      payload: { ... }
    }, context);
  } else if (record.visitorId) {
    await routeEvent({
      type: "visitorDisconnected",
      payload: { ... }
    }, context);
  }

  // 清理registry
  unregisterConnection(connectionId);
}
```

### 10.2 Redis连接失败恢复

```typescript
const client = new Redis(REDIS_URL, {
  lazyConnect: true,
  reconnectOnError: (error) => true, // 总是尝试重连
  retryStrategy: (attempt) => {
    const delay = Math.min(1000 * attempt, 5000); // 1s → 2s → 3s → 4s → 5s
    return delay;
  }
});
```

### 10.3 事件发射失败处理

```typescript
async function emitPipelineProcessingCompletedSafely(params): Promise<void> {
  try {
    await emitPipelineProcessingCompleted(params);
  } catch (error) {
    logAiPipeline({
      level: "warn",
      event: "processing_completed_emit_failed",
      error
    });
    // 不抛异常，继续
  }
}
```

---

## 11. 性能优化与监控

### 11.1 连接注册表设计

```typescript
// 使用Map，O(1)查找
const localConnections = new Map<
  string, // connectionId
  LocalConnectionRecord
>();

// 按Visitor/User/Website建立二级索引（TODO，当前全表扫描）
type LocalConnectionRecord = {
  socket: RawSocket,
  websiteId?: string,
  organizationId?: string,
  userId?: string,
  visitorId?: string,
};
```

### 11.2 批量处理

Stream消费使用 `COUNT` 50批量处理，减少Redis round-trips。

### 11.3 日志与监控

- **`[WebSocket] Connection opened: $connId`**：新连接
- **`[RealtimeRedis] $role error`**：Redis错误
- **`[RealtimePubSub] Ignoring invalid event type`**：事件验证失败
- **`[WebSocket Auth] ...`**：认证相关

---

## 12. 附录：事件类型完整清单

### 连接类（Connection Events）

| 事件类型 | 方向 | 说明 |
|---------|------|------|
| `userConnected` | S→C | 用户连接到仪表板 |
| `userDisconnected` | S→C | 用户断开连接 |
| `visitorConnected` | S→C | 访客连接到Widget |
| `visitorDisconnected` | S→C | 访客断开连接 |
| `userPresenceUpdate` | S→C | 在线状态更新 |
| `visitorPresenceUpdate` | S→C | 访客在线状态更新 |

### 对话类（Conversation Events）

| 事件类型 | 方向 | 说明 |
|---------|------|------|
| `conversationCreated` | S→C | 创建新对话 |
| `conversationUpdated` | S→C | 对话标题/优先级/情感/状态变更 |
| `conversationSeen` | C→S/S→C | 消息被阅读 |
| `conversationTyping` | C→S/S→C | 正在输入指示器 |
| `conversationEventCreated` | S→C | 对话事件（其他） |
| `timelineItemCreated` | S→C | 新时间线条目 |
| `timelineItemUpdated` | S→C | 条目更新 |
| `timelineItemPartUpdated` | S→C | 条目内容更新（流式） |

### 访客识别（Visitor Identification）

| 事件类型 | 方向 | 说明 |
|---------|------|------|
| `visitorIdentified` | S→C | 访客被识别（联系信息） |

### AI处理（AI Processing）

| 事件类型 | 方向 | 说明 |
|---------|------|------|
| `aiAgentProcessingStarted` | S→C | AI开始处理消息 |
| `aiAgentDecisionMade` | S→C | AI决策完成（deterministic/smart） |
| `aiAgentProcessingProgress` | S→C | 工具执行进度 |
| `aiAgentProcessingCompleted` | S→C | 处理完成 |

### 爬虫与知识库（Crawling & Knowledge Base）

| 事件类型 | 方向 | Audience | 说明 |
|---------|------|----------|------|
| `crawlStarted` | S→C | dashboard | 爬虫任务开始 |
| `crawlProgress` | S→C | dashboard | 爬取进度 |
| `crawlPagesDiscovered` | S→C | dashboard | 发现新页面 |
| `crawlPageCompleted` | S→C | dashboard | 页面爬取完成 |
| `crawlCompleted` | S→C | dashboard | 全部完成 |
| `crawlFailed` | S→C | dashboard | 失败 |
| `linkSourceUpdated` | S→C | dashboard | 链接源更新 |

### AI训练（AI Training）

| 事件类型 | 方向 | Audience | 说明 |
|---------|------|----------|------|
| `trainingStarted` | S→C | dashboard | 训练开始 |
| `trainingProgress` | S→C | dashboard | 训练进度 |
| `trainingCompleted` | S→C | dashboard | 训练完成 |
| `trainingFailed` | S→C | dashboard | 训练失败 |

### 其他（Others）

| 事件类型 | 方向 | 说明 |
|---------|------|------|
| `supportStateUpdated` | S→C | 客服状态更新 |

---

## 总结

这个实时消息系统具有：

✅ **高可用性**：Redis Streams + 游标持久化 + 重试机制
✅ **可观测性**：完整的日志和事件记录
✅ **安全性**：三层认证 + Audience/Visibility过滤
✅ **实时性**：WebSocket + 4s Typing心跳
✅ **可扩展性**：分布式事件总线，支持横向扩展

---

**文档版本**：1.0.0  
**最后更新**：2026-07-22  
**基于代码**：commit HEAD
