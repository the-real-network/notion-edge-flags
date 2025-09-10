# Next.js Live Example

Complete demonstration of notion-edge-flags with real Notion and Vercel Edge Config.

## Setup

### 1. Interactive Setup
```bash
# Interactive CLI guides you through everything
npx notion-edge-flags init
```

This will:
1. **Guide you to get Notion credentials** (with exact URLs)
2. **Prompt for tokens/IDs** with validation
3. **Create the database** with proper schema + sample flags
4. **Output copy-paste env block** for your .env.local
5. **Show next steps** to complete setup

### 2. Get Vercel Credentials
After `init`, you still need:

**Edge Config:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → select your team
2. Project → **Storage** → **Edge Config** → **Create Config**  
3. Copy the **Connection String**

**API Token:**
1. **Account Settings** → **Tokens** → **Create Token**
2. **Important**: Scope to the same team as your Edge Config
3. Copy the token

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

