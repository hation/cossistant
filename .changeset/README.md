# Changesets

This folder contains changeset files that describe unreleased changes.

## How to Add a Changeset

Run `bun changeset` and follow the prompts.

## Writing Good Changeset Descriptions

**Do:**

- Describe what changed from a user's perspective
- Mention breaking changes explicitly
- Reference related issues/PRs when relevant

**Don't:**

- Use vague descriptions like "bug fixes" or "improvements"
- Include implementation details users don't care about

**Examples:**

Good: "Add `onMessageSent` callback to Support widget for analytics integration"
Bad: "Bug fixes and improvements"

Good: "Fix WebSocket reconnection failing after network interruption"
Bad: "Fix bug"
