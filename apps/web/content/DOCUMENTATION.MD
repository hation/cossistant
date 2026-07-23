---
title: "Documentation Playbook"
description: "Best practices inspired by Lee Robinson's docs guide to keep cossistant.com documentation Cossistant, helpful, and maintainable."
---

# Documentation Playbook for AI Agents

This guide helps AI agents write exceptional developer documentation based on [Lee Robinson's documentation principles](https://leerob.com/docs#readable).

## Write for Readability

**Be ruthlessly concise.** Make every sentence count. Avoid technical jargon and idioms that confuse non-native speakers. Optimize for skimming with **bold text**, _italics_, bullet lists, and clear headings.

**Show, don't just tell.** Include copy-paste ready code examples for every concept. Start simple for beginners, then gradually reveal complexity. Break long explanations into digestible sections.

## Make Content Helpful

**Document workarounds** even when addressing product gaps. Always include migration guides and codemods for breaking changes. Add "Was this helpful?" feedback mechanisms on every page.

**Cross-reference liberally.** Link related guides, APIs, and examples. Create structured learning paths with clear progressions. Check for broken links before committing.

## Optimize for AI Consumption

**Prefer code over clicks.** Use cURL examples instead of UI instructions. Structure tutorials as prompts that AI assistants can execute.

**Support markdown everywhere.** Ensure pages can be viewed as raw markdown (via `.md` URLs or `Accept: text/markdown` headers). Maintain stable heading anchors for reliable linking. Serve an `llms.txt` directory file.

## Polish Every Detail

**Add metadata properly.** Include dynamic OG images, canonical tags, and descriptive alt text for all images. Make every heading linkable with stable IDs.

**Structure matters.** Use semantic HTML with proper heading hierarchy. Add skip-nav links. Respect `prefers-reduced-motion` settings. Ensure generous tap targets for mobile.

## Ship Multiple Formats

Distribute documentation as code (JSDoc), in package `node_modules`, as MCP servers, and via `AGENTS.md` rule files for maximum discoverability.
