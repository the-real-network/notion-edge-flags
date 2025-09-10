# Next.js Live Example

Complete demonstration of notion-edge-flags with real Notion and Vercel Edge Config.

## Setup

### 1. Get Credentials

**Notion Integration:**
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration" → name it "Feature Flags"
3. Copy the **Internal Integration Token** → `NOTION_TOKEN`

**Parent Page ID:**
1. Open any Notion page in your workspace
2. Copy the URL: `https://www.notion.so/workspace/Page-Name-abc123def456...`
3. The 32-character hex at the end is your `NOTION_PARENT_PAGE_ID`

**Vercel Edge Config:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. **Important**: Select the correct team (note the team name)
3. Go to any project → **Storage** → **Edge Config** → **Create Config**
4. Name it "feature-flags"
5. Copy the **Connection String** → `EDGE_CONFIG`

**Vercel API Token:**
1. Go to **Account Settings** → **Tokens** → **Create Token**
2. **Critical**: Scope it to the **same team** where you created Edge Config
3. Name it "Edge Config Writer"
4. Copy the token → `VERCEL_API_TOKEN`

### 2. Environment Setup
```bash
cp .env.example .env.local
# Fill all values from above steps
```

### 3. Create Test Database
```bash
bun run scripts/seed-notion.ts
# This creates a database with sample flags under your parent page
```

### 4. Install and Sync
```bash
bun install
npx notion-edge-flags validate --env development
npx notion-edge-flags sync --env development --once
```

### 5. Start App
```bash
bun run dev
# Visit http://localhost:3030
```

## Features Demonstrated

- **All flag types**: boolean, number, string, JSON, percentRollout, ruleSet
- **Rollout evaluation**: Stable user bucketing with percentage
- **Rule evaluation**: Context-based targeting (country, plan, etc.)
- **Sync API route**: Protected endpoint for Vercel Cron
- **Middleware**: Flag-based redirects

## Local Development Sync

**Option 1: Manual**
```bash
npx notion-edge-flags sync --env development --once
```

**Option 2: Auto-sync via cron**
```bash
# Add to crontab (edit with: crontab -e)
* * * * * cd /path/to/your/project && npx notion-edge-flags sync --env development --once >/dev/null 2>&1
```

**Option 3: Polling worker**
```bash
npx notion-edge-flags sync --env development  # loops every 30s
```

## Testing

1. Edit flags in your Notion database
2. Run sync (or wait for cron)
3. Refresh http://localhost:3030 
4. Values should update instantly

**Emergency flip test:**
```bash
npx notion-edge-flags flip --env development --key checkoutRedesign --value false
# Refresh page - should show false immediately
# Next Notion edit will reconcile back to Notion value
```

