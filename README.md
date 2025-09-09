# notion-edge-flags

[![npm version](https://badge.fury.io/js/notion-edge-flags.svg)](https://www.npmjs.com/package/notion-edge-flags)

Feature flags synced from Notion to Vercel Edge Config with ultra-fast runtime reads.

## Install

```bash
# using bun:
bun add notion-edge-flags
```

## Overview

- **Author**: Edit flags in Notion database (visual, collaborative)
- **Sync**: Automated sync to Vercel Edge Config (15-45s latency)
- **Runtime**: Read flags from Edge Config (millisecond latency, no redeploys)
- **Emergency**: Direct CLI flips bypass Notion for instant changes

## Quick Start

### 1. Create Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it (e.g., "Feature Flags"), select workspace
4. Copy the **Internal Integration Token** → this is your `NOTION_TOKEN`

### 2. Create Notion Database

**Option A: Use seed script (recommended)**
```bash
# Get parent page ID: open any Notion page, copy URL
# https://www.notion.so/workspace/Page-Name-abc123def456...
# The 32-char hex at the end is the page ID

cd examples/nextjs-live
cp .env.example .env.local
# Fill NOTION_TOKEN and NOTION_PARENT_PAGE_ID in .env.local
NOTION_PARENT_PAGE_ID=your_page_id bun run scripts/seed-notion.ts
```

**Option B: Manual setup**
Create a database with these columns:
- **key** (Title): Unique flag identifier
- **type** (Select): `boolean | number | string | json | percentRollout | ruleSet`
- **env** (Multi-select): `development`, `preview`, `production`
- **value_boolean** (Checkbox)
- **value_number** (Number)
- **value_string** (Rich text)
- **value_json** (Rich text with JSON)
- **value_percent** (Number 0-100)
- **value_ruleset** (Rich text with rule JSON)

Share the database with your integration.

### 3. Vercel Setup

1. **Create Edge Config**: Vercel Dashboard → Project → Storage → Edge Config → Create
2. **API Token**: Account Settings → Tokens → Create (scope to your project/team)
3. **Get IDs**: 
   - Edge Config ID: from the config page URL or settings
   - Team ID: from browser URL when in team context (team_xxx)

### 4. Environment Variables

```bash
# Required for sync
NOTION_TOKEN=ntn_xxx
NOTION_FLAGS_DB=db_id_or_use_name_below
NOTION_FLAGS_DB_NAME="Feature Flags"
VERCEL_API_TOKEN=vc_xxx
EDGE_CONFIG_ID=ecfg_xxx
VERCEL_TEAM_ID=team_xxx  # if Edge Config is in a team

# Optional for API route protection
SYNC_SECRET=your_secret
```

### 5. Test Locally

```bash
# Validate schema
npx notion-edge-flags validate --env development

# Sync once
npx notion-edge-flags sync --env development --once

# Start example app
cd examples/nextjs-live && bun run dev
# Visit http://localhost:3030
```

### 6. Sync Setup

**Option A: Vercel Cron (≤1 min latency)**
```ts
// app/api/flags/sync/route.ts
import { NextResponse } from 'next/server';
import { createSyncer, fetchChangedRows } from 'notion-edge-flags';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return new NextResponse('unauthorized', { status: 401 });
  }
  const notion = { 
    token: process.env.NOTION_TOKEN!, 
    databaseName: process.env.NOTION_FLAGS_DB_NAME 
  };
  const vercel = { 
    apiToken: process.env.VERCEL_API_TOKEN!, 
    edgeConfigId: process.env.EDGE_CONFIG_ID! 
  };
  const syncer = createSyncer({ notion, vercel, mode: 'once' });
  await syncer.run((since) => fetchChangedRows(notion, since));
  return NextResponse.json({ ok: true });
}
```

Add Vercel Cron: `* * * * *` (every minute) → `/api/flags/sync`

**Option B: Always-on Worker (~30s latency)**
```bash
# On small VM/container
npx notion-edge-flags sync --env production
```

**Option C: Local Cron (development)**
```bash
# Add to crontab for local development
* * * * * cd /path/to/your/project && npx notion-edge-flags sync --env development --once
```

### 4. Runtime Usage

**Basic reads:**
```ts
import { createFlagsClient } from 'notion-edge-flags';

const client = createFlagsClient();
const enabled = await client.getBoolean('checkoutRedesign');
const config = await client.getJSON('paymentConfig');
const flags = await client.getMany(['feature1', 'feature2']);
```

**Next.js App Router:**
```ts
export const dynamic = 'force-dynamic';
import { createFlagsClient } from 'notion-edge-flags';

export default async function Page() {
  const client = createFlagsClient();
  const enabled = await client.getBoolean('newFeature');
  return <div>{enabled ? <NewFeature /> : <OldFeature />}</div>;
}
```

**Rollout evaluation:**
```ts
import { evaluate } from 'notion-edge-flags';

const percent = await client.getNumber('rolloutPercent') ?? 0;
const userId = getCurrentUserId();
const inCohort = evaluate.rolloutPercent({ 
  key: 'newFeature', 
  percent, 
  unitId: userId 
});
```

**Rule-based targeting:**
```ts
const rules = await client.getJSON('targetingRules');
const context = { country: 'US', plan: 'premium' };
const enabled = evaluate.ruleSet({ 
  key: 'premiumFeature', 
  value: rules, 
  context 
});
```

## CLI Commands

```bash
# Validate Notion schema
npx notion-edge-flags validate --env production

# One-time sync
npx notion-edge-flags sync --env production --once

# Continuous sync (30s polling)
npx notion-edge-flags sync --env production

# Emergency flip (bypasses Notion)
npx notion-edge-flags flip --env production --key feature --value true

# Compare Notion vs Edge Config
npx notion-edge-flags diff --env production

# Export current Edge Config values
npx notion-edge-flags export --env production
```

## API Reference

### createFlagsClient(options?)

```ts
const client = createFlagsClient({
  env?: string,                // Auto-detected from VERCEL_ENV → NODE_ENV
  namespace?: string,          // Default: "flag"
  edgeConfigId?: string,       // Default: process.env.EDGE_CONFIG_ID
  edgeConfigToken?: string,    // Default: process.env.VERCEL_API_TOKEN
  teamId?: string,             // Default: process.env.VERCEL_TEAM_ID
  connection?: EdgeConfigConnection  // Custom adapter
});
```

**Methods:**
- `getBoolean(key)` → `boolean | null`
- `getString(key)` → `string | null`
- `getNumber(key)` → `number | null`
- `getJSON<T>(key)` → `T | null`
- `getMany(keys)` → `Record<string, unknown>`

### createSyncer(options)

```ts
const syncer = createSyncer({
  notion: { 
    token: string, 
    databaseId?: string,      // Use this OR databaseName
    databaseName?: string     // Search by name
  },
  vercel: { 
    apiToken: string, 
    edgeConfigId: string 
  },
  env?: string,               // Auto-detected
  namespace?: string,         // Default: "flag"
  mode?: 'once' | 'poll',     // Default: "once"
  pollIntervalMs?: number,    // Default: 30000
  driftPolicy?: 'prefer-notion' | 'prefer-edge-config' | 'report-only',
  logger?: (message) => void
});

await syncer.run((since) => fetchChangedRows(notion, since));
```

### evaluate helpers

```ts
import { evaluate } from 'notion-edge-flags';

// Percentage rollouts (0-100)
const inCohort = evaluate.rolloutPercent({
  key: 'feature',
  percent: 25,
  unitId: 'user123'  // Stable identifier
});

// Rule-based evaluation
const enabled = evaluate.ruleSet({
  key: 'feature',
  value: { rules: [{ if: { country: "US" }, then: true }] },
  context: { country: "US", plan: "pro" }
});
```

## Environment Resolution

The library auto-detects environment:
1. `VERCEL_ENV` (production/preview/development) on Vercel
2. `NODE_ENV` (production/development/test) elsewhere
3. Defaults to `production`

Override with `env` parameter in client/syncer options or CLI `--env`.

## Key Storage

Edge Config keys use format: `flag__<ENV>__<KEY>`

Examples:
- `flag__production__checkoutRedesign`
- `flag__development__testFeature`
- `flag__sync__production__checkpoint`

## Notion Schema Examples

**Row examples:**
- `checkoutRedesign` | `boolean` | ✅ | `production`
- `rolloutPercent` | `percentRollout` | `25` | `production,preview`
- `paymentConfig` | `json` | `{"provider":"stripe"}` | `production`

**Rule set example:**
```json
{
  "rules": [
    { "if": { "country": "US", "plan": "premium" }, "then": true },
    { "if": { "country": "CA" }, "then": false },
    { "else": true }
  ]
}
```

## Examples

- `examples/nextjs-live/` - Full Next.js integration with sync route
- `examples/notion-template/` - Database schema reference
- `examples/worker-sync/` - Standalone sync worker

## Development

```bash
bun install
bun run build
bun test
bun run example:runtime
bun run example:sync-once
```


## Why Edge Config?

**vs. Direct Notion reads:**
- **Latency**: 5-50ms (Edge Config) vs 200-500ms (Notion API)
- **Rate limits**: High/unlimited vs 3 requests/second
- **Reliability**: 99.9%+ uptime vs Notion API dependency
- **Geography**: Global edge nodes vs single Notion region
- **Scale**: Handles massive load vs limited concurrent requests

**vs. Database/Redis:**
- **No infrastructure**: Managed by Vercel vs self-hosted
- **Global distribution**: Built-in vs manual replication
- **Edge runtime**: Native integration vs network calls
- **Cost**: Included with Vercel vs separate service

**vs. Static generation:**
- **Dynamic updates**: No rebuilds vs redeploy required
- **Real-time**: Instant changes vs build pipeline
- **Flexibility**: Runtime evaluation vs compile-time only

Fast enough for real-time decisions, reliable enough for production

## Deployment

**Vercel:**
1. Set environment variables in project settings
2. Add the sync API route
3. Configure Cron job to call it every minute

**Other platforms:**
- Deploy sync worker calling `createSyncer({ mode: 'poll' })`
- Or run CLI sync in cron: `npx notion-edge-flags sync --once`

## Troubleshooting

**Sync not working?**
- Check `npx notion-edge-flags validate --env <env>`
- Verify Notion integration has database access
- Ensure Edge Config token has write permissions
- Run `npx notion-edge-flags diff --env <env>` to see drift

**Runtime reads returning null?**
- Verify environment variables are loaded
- Check `npx notion-edge-flags export --env <env>`
- Ensure `VERCEL_TEAM_ID` is set if Edge Config is in a team
- Confirm flag exists for the resolved environment

**Schema errors?**
- Errors include Notion page URLs and fix instructions
- Either use `type` Select OR typed `value_*` columns
- Ensure `env` multi-select includes target environment