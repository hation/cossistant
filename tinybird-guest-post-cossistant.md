# How Cossistant built real-time customer support analytics and a live visitor globe with Tinybird

Cossistant is an open-source, developer-first support platform built with React. If you want the fast path, it ships as a `<Support />` component you can drop into your app. If you want more control, you can style it with Tailwind, swap pieces out, or go fully headless and build your own support experience.

From the beginning, we wanted support data to feel alive inside the product, not like a report someone checks hours later in a separate tool.

That meant two things had to be true. The inbox needed real-time analytics that support teams would actually look at while working. And live visitor presence needed to feel immediate enough that you could react to it, not just admire a number in a corner.

Tinybird made both of those things feel much simpler than they had any right to be. Instead of building and maintaining a separate analytics stack, we got to focus on the parts users actually notice: faster insight in the inbox, live visitor presence, and a globe view that makes support feel human.

## About Cossistant

Cossistant is an open-source chat support platform built with React. The quickest way in is the default `<Support />` component. You can ship that version fast, style it with Tailwind, and change the parts users see first without rebuilding everything.

If that still is not enough, you can go deeper. Cossistant also has headless building blocks and APIs for teams that want the support experience to feel fully native to their product.

We are also part of the Vercel OSS program, which feels aligned with the kind of builder we care about: teams that want strong defaults, but also want to own the experience.

That thread runs through the whole product: developer-first, code-first, and built for people who want control.

## Problem

We did not want analytics as an afterthought.

If a conversation is resolved, if AI handled it, if response times are drifting, or if a visitor is active on the site right now, that should show up in the product while the team is already in the inbox. It should not require a trip to another dashboard that feels disconnected from the actual support work.

We also wanted live presence to be more than a count. Seeing that five people are online is useful. Seeing where they are, what page they are on, and how that activity is changing in real time is much more useful.

We could have stitched together our own pipeline for that. But the honest version is that this turns into a side project you never meant to start. You are suddenly thinking about ingestion, retries, buffering, query endpoints, frontend-safe access, and all the small details that sit between raw events and a product surface people trust.

That was never the goal. We wanted to build Cossistant, not a separate analytics company inside Cossistant.

> "We wanted support data to feel like part of the product, not a report someone checks later. Tinybird let us build that without disappearing into infrastructure work."
>
> Anthony Riera, draft quote for approval

## Why Tinybird

Tinybird fit the way we already like to build.

Cossistant is open source, dev-first, and code-first. Tinybird felt similar. It was easy to set up, easy to reason about, and it did not force us into a heavyweight workflow just to ship live product features.

At the code level, the shape of the integration matched what we needed:

- we track visitor activity, page views, presence heartbeats, and conversation lifecycle events
- those events are buffered and retried before ingestion
- Tinybird exposes small endpoints for the exact product surfaces we care about
- the frontend reads them with short-lived JWTs scoped to a single website

That last part mattered a lot. We wanted the product to query live analytics safely from the frontend without exposing raw credentials or opening things up more than necessary.

LLMs also turned out to be genuinely useful during the integration. Part of that is just timing. But part of it is that the setup was readable and local to the codebase. Once the datasources, events, and endpoints were defined, iterating on the product around them felt natural.

## Results

- Real-time inbox analytics directly inside the product
- Live visitor presence with a globe view, active visitor list, and current page context
- Short-lived, website-scoped frontend access to Tinybird endpoints
- A support backend that stays flexible enough for custom support experiences
- Enough confidence in the API-first model that Playus uses Cossistant's open API to power support inside its mobile app and a custom dashboard for a product serving 600K DAU

## We put analytics where support already happens

One of the simplest Tinybird-powered wins in Cossistant is also one of the most useful: the analytics live right in the inbox flow.

Support teams can see response time, time to resolution, AI-handled rate, unique visitors, and live visitor count without leaving the part of the product where they are already working. There is also date-range control built into the same surface, so the analytics stay close to the day-to-day workflow instead of turning into a separate reporting ritual.

That sounds like a small product decision, but it changes the way people use the data. When analytics live where the work happens, they get looked at. When they sit in a different tool, they usually turn into something a manager checks later.

We wanted the first version of support analytics to feel practical, not ceremonial. Tinybird helped us get there faster because we could focus on the product surface and the query shape instead of building the plumbing around it.

## The live globe made presence feel real

The part people tend to remember is the live visitors view.

In Cossistant, the live visitors overlay combines Tinybird-backed analytics with a visitor list and a globe that shows active presence geographically. You can see who is online, where they are, and what page they are on right now.

That changed the feel of the feature.

A raw "online now" number is useful, but abstract. A globe plus a live list makes presence feel immediate. It turns support from something reactive and delayed into something closer to situational awareness. You can feel that real people are moving through the product at this exact moment.

We did not add the globe because it looked good in a demo. We added it because presence is easier to understand when you can actually see it. It gives the support team something much closer to intuition.

And under the hood, the setup stays pretty clean: Tinybird gives us the live count, the visitor presence list, and the geo-aggregated location data we need for the visual layer.

## API-first mattered just as much as the widget

The default widget is important, but it is not the whole story.

One of the nice side effects of building Cossistant this way is that people are not locked into one UI. The widget is there if you want the fast path. But the backend and APIs can also power a completely custom support experience.

That is exactly why the Tinybird setup mattered beyond our own dashboard. We were not just building a fixed reporting surface. We were building support infrastructure that could stay flexible.

Playus is a good example. They use Cossistant's open API to power support inside their mobile app and to manage support through a custom dashboard. That is a different shape than a standard drop-in widget, and it is the kind of use case we care about supporting.

That flexibility matters to us because it matches how the product is built. Start with `<Support />` if that gets you live quickly. Style it with Tailwind if you want it to feel more like your app. Go headless if you want to own the full support flow.

It also makes the story more real. This is not just a neat internal build. The same API-first approach is trusted in a customer setup serving 600K DAU.

## Tinybird let us stay on our side of the line

When you are a small team, it is easy to confuse "we want control" with "we should build every layer ourselves."

We did want control. But we wanted control over the support experience. We wanted control over how the inbox feels, how live presence looks, and how flexible the product can be for teams that want to go custom.

We did not want to spend that energy owning every moving part of a real-time analytics stack.

Tinybird gave us a clean way to build the product surfaces we cared about:

- inbox analytics inside the workflow
- live visitor presence in real time
- geo-aware data for the globe
- frontend-safe query access with short-lived tokens

That let us stay focused on Cossistant itself.

## Closing

The bar for support products is higher now, especially for developer-first teams.

People want support that feels native to the product. They want live context. They want data they can trust while they are still in the flow of work. And more and more, they want enough flexibility to shape the experience around their own product instead of settling for the same black-box widget as everyone else.

That is what Tinybird unlocked for us.

It let us build real-time support analytics and live visitor presence in a way that feels close to the product, close to the team, and close to the user.

If that sounds like the direction support should be moving, that is exactly why we built Cossistant the way we did.

---

## Editorial Notes

### Status

- Drafted
- Awaiting Anthony approval

### Meta

- Meta title: `How Cossistant built live support analytics with Tinybird`
- Meta description: `How Cossistant used Tinybird to power real-time inbox analytics, live visitor presence, and a globe view for developer-first support.`

### Suggested screenshots

- Inbox analytics header with live visitor count and support metrics
- Live visitors overlay with globe, active visitor list, and current page paths
- Optional visitor detail panel if it clearly reinforces live presence
- Playus custom support surface if available and approved

### Draft quote awaiting Anthony approval

> "We wanted support data to feel like part of the product, not a report someone checks later. Tinybird let us build that without disappearing into infrastructure work."

### Suggested link targets if Tinybird allows them

- `https://cossistant.com`
- `https://cossistant.com/docs/support-component`
- `https://github.com/cossistantcom/cossistant`

### Soft CTA

- `See how Cossistant approaches developer-first support at cossistant.com.`

### Approval requested

- Confirm Playus naming and the `600K DAU` wording
- Confirm or replace the Anthony quote
- Confirm which screenshot mix should lead: analytics-first, globe-first, or Playus custom UI
