# Next.js Live Example

Complete demonstration of notion-edge-flags with real Notion and Vercel Edge Config.

## Setup

### 1. Environment
```bash
cp .env.example .env.local
# Fill all values (see main README for how to get them)
```

### 2. Create Test Database
```bash
# Get parent page ID from any Notion page URL (32-char hex)
NOTION_PARENT_PAGE_ID=your_page_id bun run scripts/seed-notion.ts
```

### 3. Install and Sync
```bash
bun install
npx notion-edge-flags validate --env development
npx notion-edge-flags sync --env development --once
```

### 4. Start App
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

