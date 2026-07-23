# Tinybird Analytics

This directory contains Tinybird data sources and pipes for Cossistant analytics.

## Structure

- `datasources/` - Event schemas with TTL policies
- `endpoints/` - API endpoints (pipes) for querying analytics data

## Local Development

Tinybird Local runs automatically when you start the dev environment:

```bash
bun dev  # Starts Docker services + Tinybird Local
```

Tinybird Local runs on `http://localhost:7181` and is managed by the Tinybird CLI.
This repo keeps the Tinybird project files under `tinybird/` and points the root
`.tinyb` at that folder via `cwd`, so both `bun dev` and `cd tinybird && tb info`
resolve the same project.

### First-Time Setup

Install the Tinybird CLI if not already installed:

```bash
pip install tinybird-cli
# or
brew install tinybird-cli
```

The `bun dev` command automatically:
1. Starts Tinybird Local (`tb local start`)
2. Runs `tb dev` from the `tinybird/` workspace so local datasources and pipes are loaded

### Local Auth Source Of Truth

Tinybird Local rotates workspace tokens. For local app env, do not rely on stale
`.env` values or the `/tokens` endpoint. Use the active Tinybird Local workspace
from the CLI instead:

```bash
scripts/tinybird-local-env.sh
```

That prints ready-to-paste values for:
- `TINYBIRD_TOKEN`
- `TINYBIRD_SIGNING_KEY`
- `TINYBIRD_WORKSPACE`

The helper reads `workspace_id` and `token` from `tb local status`, which matches
the active Tinybird Local workspace used for event ingestion and direct API access.
For localhost frontend queries, the API now asks Tinybird CLI to mint JWTs instead
of self-signing them from env.

### Manual Control

```bash
cd tinybird

# Start Tinybird Local manually
tb local start

# Check CLI/project context
tb info

# Check status
tb local status

# Stop Tinybird Local
tb local stop

# Development mode (auto-reload on file changes)
tb dev
```

## Datasources

### `visitor_events`
High-volume operational events (seen, page views) with 90-day TTL.

### `conversation_metrics`
Low-volume business KPIs (conversation lifecycle) with no TTL (kept indefinitely for paid customers).

## Endpoints

- `inbox_analytics` - Dashboard metrics (response time, resolution time, AI rate)
- `unique_visitors` - Unique visitor counts by date range
- `online_now` - Real-time visitor count
- `visitor_presence` - Live visitor list with page path + attribution
- `presence_locations` - Geo aggregation for live map visualization

## Deployment

```bash
# Deploy to cloud (production)
tb --cloud deploy

# Or push specific resources
tb --cloud push datasources/*.datasource
tb --cloud push endpoints/*.pipe
```
