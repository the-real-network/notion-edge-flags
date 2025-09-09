Worker sync example (Bun/Node)

```ts
import { createSyncer } from 'notion-edge-flags';
import { fetchChangedRows } from 'notion-edge-flags/dist/sync/notion.js';

const notion = { token: process.env.NOTION_TOKEN!, databaseId: process.env.NOTION_FLAGS_DB! };
const vercel = { apiToken: process.env.VERCEL_API_TOKEN!, edgeConfigId: process.env.EDGE_CONFIG_ID! };
const syncer = createSyncer({ notion, vercel, mode: 'poll', pollIntervalMs: 30000 });
syncer.run((since) => fetchChangedRows(notion, since));
```

