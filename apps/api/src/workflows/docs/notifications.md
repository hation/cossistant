# Message Notification Workflow System

## Overview

The message notification system ensures that users receive email notifications about new messages in conversations, while preventing duplicate emails and ensuring only truly unseen messages are included. This document explains how the notification workflow operates, including its deduplication mechanisms and message filtering logic.

## Architecture Components

### 1. Workflow Deduplication Manager (`workflow-dedup-manager.ts`)

The deduplication manager uses Redis to ensure only one workflow runs per conversation and direction at a time:

```typescript
interface WorkflowState {
  workflowRunId: string; // Current active workflow run ID
  initialMessageId: string; // First message that triggered notifications
  initialMessageCreatedAt: string; // Timestamp of the initial message
  conversationId: string;
  direction: WorkflowDirection; // "member-to-visitor" | "visitor-to-member"
  createdAt: string;
  updatedAt: string;
}
```

**Key Functions:**

- `triggerDeduplicatedWorkflow()`: Cancels any existing workflow and starts a new one, preserving the initial message ID
- `isActiveWorkflow()`: Checks if a workflow run ID is still the active one
- `clearWorkflowState()`: Removes workflow state after successful completion

### 2. Message Trigger Logic (`send-message-with-notification.ts`)

When a new message is sent, the system:

1. Fetches the message metadata (ID and timestamp)
2. Determines the workflow direction based on sender type
3. Calls `triggerDeduplicatedWorkflow()` which:
   - Checks for existing workflows
   - Cancels old workflows if found
   - Creates a new workflow with a unique ID
   - Stores state in Redis with the initial message info

### 3. Workflow Execution (`message.tsx`)

The workflow handlers (`/member-sent-message` and `/visitor-sent-message`) follow this flow:

#### Step 1: Validate Workflow

```typescript
// Check if this workflow is still active
const isActive = await isActiveWorkflow(
  conversationId,
  direction,
  workflowRunId
);
if (!isActive) return; // Exit if cancelled
```

#### Step 2: Fetch Initial Message Info

```typescript
// Get the initial message that triggered this workflow
const workflowState = await getWorkflowState(conversationId, direction);
```

#### Step 3: Apply Delay

- A single global delay is applied for **all recipients** (members and visitors)
- This delay allows batching multiple messages into one notification email

#### Step 4: Fetch Unseen Messages

```typescript
const { messages, totalCount } = await getMessagesForEmail(db, {
  conversationId,
  organizationId,
  recipientUserId: participant.userId,
  maxMessages: MAX_MESSAGES_IN_EMAIL,
  earliestCreatedAt: workflowState.initialMessageCreatedAt, // Key filter
});
```

This ensures only messages AFTER the initial triggering message are included.

#### Step 5: Send Emails

- Uses idempotency keys to prevent duplicate sends
- Includes threading headers for email clients
- Shows up to 3 messages with sender info

#### Step 6: Cleanup

```typescript
await clearWorkflowState(conversationId, direction);
```

## Message Filtering Logic

The `getMessagesForEmail()` function applies multiple filters:

1. **Last Seen Filter**: Only messages created after the recipient's `lastSeenAt` timestamp
2. **Earliest Created Filter**: Only messages created after the initial triggering message
3. **Sender Filter**: Excludes messages sent by the recipient themselves
4. **Visibility Filter**: Only includes public messages
5. **Deletion Filter**: Excludes deleted messages

## Deduplication Guarantees

### Scenario: Multiple Messages Sent Quickly

```
Time 0: Message A sent -> Workflow 1 starts
Time 1: Message B sent -> Workflow 1 cancelled, Workflow 2 starts
Time 2: Message C sent -> Workflow 2 cancelled, Workflow 3 starts
Time 60s: Workflow 3 executes -> Sends email with messages A, B, C
```

**Result**: Only ONE email sent containing all messages since Message A

### Key Properties:

1. **Single Active Workflow**: Only one workflow per conversation/direction runs at a time
2. **Preserved Initial Message**: The earliest message ID is preserved across workflow replacements
3. **Atomic State Management**: Redis operations ensure consistent state
4. **TTL Protection**: Workflow states expire after 24 hours to prevent stale data

## Configuration

### Constants (`constants.ts`)

```typescript
export const MESSAGE_NOTIFICATION_DELAY_MINUTES = 1; // Global delay for all recipients
export const MAX_MESSAGES_IN_EMAIL = 3; // Maximum messages shown
```

## Error Handling

1. **Missing Workflow State**: Logs error and exits gracefully
2. **Failed Email Sends**: Logged but don't block workflow completion
3. **Cancelled Workflows**: Exit immediately without processing
4. **Bounced Emails**: Skipped with suppression logging

## Monitoring & Debugging

### Log Patterns

```
[dev] Triggering member-sent message workflow for conversation conv_123
[dev] Member-sent message workflow replaced successfully, workflowRunId: msg-notif-conv_123-member-to-visitor-1234567890
[workflow] Workflow wfr_old is no longer active for conv_123, exiting
```

### Redis Keys

```
workflow:message:{conversationId}:{direction}
```

Example: `workflow:message:conv_123abc:member-to-visitor`

## Testing Considerations

1. **Rapid Message Sending**: Send multiple messages quickly to verify deduplication
2. **Delay Testing**: Configure different delays and verify timing
3. **Seen State**: Mark messages as seen during delay period to verify filtering
4. **Email Content**: Verify only unseen messages appear in emails

## Future Improvements

1. **Batch Size Configuration**: Make MAX_MESSAGES_IN_EMAIL configurable per organization
2. **Smart Batching**: Group messages by time windows instead of fixed delays
3. **Priority Notifications**: Immediate notifications for VIP conversations
4. **Webhook Support**: Alternative notification channels beyond email
