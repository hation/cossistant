# Findings

## Requirements
- Write a Tinybird guest post draft in repo root as `tinybird-guest-post-cossistant.md`
- Match the feel of recent Tinybird customer stories without copying them
- Keep the story human, readable, and low-jargon
- Ground every Cossistant claim in repo truth or explicit user-approved facts
- Include screenshot recommendations and approval notes

## Tinybird Story Pattern Scan
- `Maple`
  - Leans into developer experience, TypeScript resources, local-first workflow, and AI agents helping with iteration
  - Good reference for the "LLMs were genuinely useful" angle
- `Order Editing`
  - Strong small-team framing: stop babysitting infrastructure and get back to building product
  - Good reference for keeping the problem concrete and relatable
- `Fever`
  - Emphasizes reliability under load and safer iteration
  - Useful for talking about trust and stability without overdoing performance claims
- `Marc Lou`
  - Strong "power without complexity" framing
  - Useful reference for plain-language positioning
- `Plain`
  - Closest support-space comparison
  - Their angle is real-time support insights embedded throughout the product
  - We should not center that angle
  - Cossistant's stronger differentiator is live visitor presence on a globe plus API-first flexibility for custom support builds

## Cossistant Product Facts Verified In Repo
- Cossistant describes itself as an open-source chat support widget for the React ecosystem with a code-first, API-driven philosophy in `/Users/anthonyriera/code/cossistant-monorepo/README.md`
- Cossistant offers headless primitives and reusable support components in:
  - `/Users/anthonyriera/code/cossistant-monorepo/README.md`
  - `/Users/anthonyriera/code/cossistant-monorepo/apps/web/content/docs/(root)/what.mdx`
  - `/Users/anthonyriera/code/cossistant-monorepo/apps/web/content/docs/support-component/index.mdx`
- Cossistant's default fast path is the `<Support />` component, and the widget can be styled through Tailwind-friendly support styles and stable styling hooks
  - Source:
    - `/Users/anthonyriera/code/cossistant-monorepo/apps/web/content/docs/support-component/index.mdx`
    - `/Users/anthonyriera/code/cossistant-monorepo/apps/web/content/docs/quickstart/react.mdx`
    - `/Users/anthonyriera/code/cossistant-monorepo/packages/react/README.md`
- Tinybird is explicitly used for:
  - inbox analytics
  - live visitor presence
  - live "last seen in app" enrichment
  - Source: `/Users/anthonyriera/code/cossistant-monorepo/apps/web/content/docs/self-host/analytics.mdx`
- Tinybird workspace contains dedicated endpoints for:
  - `inbox_analytics`
  - `unique_visitors`
  - `online_now`
  - `visitor_presence`
  - `presence_locations`
  - Source: `/Users/anthonyriera/code/cossistant-monorepo/tinybird/README.md`
- Cossistant ingests Tinybird events for:
  - presence
  - visitor activity
  - page views
  - conversation lifecycle metrics
  - Source: `/Users/anthonyriera/code/cossistant-monorepo/apps/api/src/lib/tinybird-sdk.ts`
- Tinybird ingestion has product-grade handling already in place:
  - batch buffering
  - retry logic
  - graceful flush on shutdown
  - Source: `/Users/anthonyriera/code/cossistant-monorepo/apps/api/src/lib/tinybird-sdk.ts`
- Frontend access is locked down with short-lived JWTs scoped to specific Tinybird pipes and fixed `website_id` params
  - Source: `/Users/anthonyriera/code/cossistant-monorepo/apps/api/src/lib/tinybird-jwt.ts`
- The inbox UI surfaces Tinybird-backed analytics directly in the conversation list header and opens a live visitors overlay from there
  - Source: `/Users/anthonyriera/code/cossistant-monorepo/apps/web/src/components/conversations-list/index.tsx`
- The live visitors overlay combines:
  - inbox analytics display
  - live visitor count
  - active visitor list
  - page paths
  - globe visualization with geo points
  - Source: `/Users/anthonyriera/code/cossistant-monorepo/apps/web/src/app/(dashboard)/[websiteSlug]/overlays/live-visitors-overlay.tsx`

## User-Provided Facts Approved For Use
- Tinybird setup felt easy
- Tinybird has been reliable
- LLMs were useful during integration
- Cossistant is dev-first, like Tinybird
- Playus may be named publicly
- Playus uses Cossistant's open API to power support inside its mobile app and a custom support dashboard
- Playus serves `600K DAU`

## Editorial Positioning
- The story should feel like:
  - "we wanted support data to feel live inside the product"
- The story should not feel like:
  - "we built a generic analytics dashboard"
- Best emotional hook:
  - the live globe makes presence feel immediate and human
- Best builder hook:
  - we wanted control over the support experience, not over a separate analytics stack
- Best trust signal:
  - a customer can use the API-first backend to run a custom support surface at meaningful scale

## Title And Packaging
- Final title:
  - `How Cossistant built real-time customer support analytics and a live visitor globe with Tinybird`
- Meta title:
  - `How Cossistant built live support analytics with Tinybird`
- Meta description:
  - `How Cossistant used Tinybird to power real-time inbox analytics, live visitor presence, and a globe view for developer-first support.`

## Screenshot Shortlist
- Inbox analytics strip in the inbox header with live visitors count and support metrics
- Live visitors overlay showing:
  - globe
  - active visitors list
  - page paths
- Optional visitor detail panel if it clearly reinforces presence and context
- Playus custom support UI if the team wants to show the API-first angle visually

## Fact Check Log
| Claim | Source | Verification Status |
|------|--------|---------------------|
| Cossistant is open source and code-first | `/README.md` and `/apps/web/content/blog/introducing-cossistant.mdx` | verified |
| Cossistant is API-driven and provides backend infrastructure | `/README.md` | verified |
| Cossistant offers headless support primitives and custom builds | `/apps/web/content/docs/(root)/what.mdx` and `/apps/web/content/docs/support-component/index.mdx` | verified |
| Cossistant ships with a `<Support />` component and can be styled with Tailwind or used in more headless ways | `/apps/web/content/docs/support-component/index.mdx`, `/apps/web/content/docs/quickstart/react.mdx`, and `/packages/react/README.md` | verified |
| Tinybird powers inbox analytics and live visitor presence | `/apps/web/content/docs/self-host/analytics.mdx` | verified |
| Tinybird endpoints include inbox analytics, online now, visitor presence, and geo presence locations | `/tinybird/README.md` | verified |
| Frontend Tinybird access uses short-lived JWTs scoped by website and pipe | `/apps/api/src/lib/tinybird-jwt.ts` | verified |
| Live visitors overlay includes a globe and visitor list | `/apps/web/src/app/(dashboard)/[websiteSlug]/overlays/live-visitors-overlay.tsx` | verified |
| Playus uses the open API and serves `600K DAU` | user instruction in this thread | approved user-provided fact |
| LLMs were useful during integration | user instruction in this thread | approved user-provided fact |
| Cossistant is part of the Vercel OSS program | `/Users/anthonyriera/code/cossistant-monorepo/README.md` | verified |

## Things To Avoid In The Draft
- No fabricated cost savings
- No fabricated latency numbers
- No claim that Playus DAU was verified from public sources
- No generic "data platform" filler
- No overexplaining Tinybird internals when the user-facing product benefit is enough

## Resources
- Tinybird example URLs:
  - `https://www.tinybird.co/customer-stories/maple`
  - `https://www.tinybird.co/customer-stories/orderediting`
  - `https://www.tinybird.co/customer-stories/fever`
  - `https://www.tinybird.co/customer-stories/marc-lou`
  - `https://www.tinybird.co/customer-stories/plain`
- Key local files:
  - `/Users/anthonyriera/code/cossistant-monorepo/README.md`
  - `/Users/anthonyriera/code/cossistant-monorepo/tinybird/README.md`
  - `/Users/anthonyriera/code/cossistant-monorepo/apps/web/content/docs/self-host/analytics.mdx`
  - `/Users/anthonyriera/code/cossistant-monorepo/apps/api/src/lib/tinybird-sdk.ts`
  - `/Users/anthonyriera/code/cossistant-monorepo/apps/api/src/lib/tinybird-jwt.ts`
  - `/Users/anthonyriera/code/cossistant-monorepo/apps/web/src/components/conversations-list/index.tsx`
  - `/Users/anthonyriera/code/cossistant-monorepo/apps/web/src/app/(dashboard)/[websiteSlug]/overlays/live-visitors-overlay.tsx`
