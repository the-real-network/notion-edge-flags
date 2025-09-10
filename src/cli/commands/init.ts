import { loadDotenv, promptInput } from "../utils.ts";

export async function cmdInit(): Promise<void> {
  loadDotenv();
  
  process.stdout.write("🚩 notion-edge-flags setup\n\n");
  
  process.stdout.write("Step 1: Notion Integration\n");
  process.stdout.write("1. Go to https://www.notion.so/my-integrations\n");
  process.stdout.write("2. Click 'New integration' → name it 'Feature Flags'\n");
  process.stdout.write("3. Copy the Internal Integration Token\n\n");
  
  const token = await promptInput("Paste your NOTION_TOKEN:");
  if (!token) throw new Error("NOTION_TOKEN required");
  
  process.stdout.write("\nStep 2: Parent Page\n");
  process.stdout.write("1. Open any Notion page in your workspace\n");
  process.stdout.write("2. Copy the URL (contains 32-char hex at the end)\n");
  process.stdout.write("3. Example: https://notion.so/workspace/Page-abc123def456...\n\n");
  
  const parentPageId = await promptInput("Paste the 32-char page ID:");
  if (!parentPageId || parentPageId.length !== 32) throw new Error("Invalid page ID (must be 32 characters)");
  
  const dbName = process.env.NOTION_FLAGS_DB_NAME || await promptInput("Database name (default: Feature Flags):") || "Feature Flags";

  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "content-type": "application/json"
  } as const;

  const createRes = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: dbName } }],
      properties: {
        key: { title: {} },
        type: { select: { options: [
          { name: "boolean" }, { name: "number" }, { name: "string" }, 
          { name: "json" }, { name: "percentRollout" }, { name: "ruleSet" }
        ] } },
        env: { multi_select: { options: [{ name: "development" }, { name: "preview" }, { name: "production" }] } },
        value_boolean: { checkbox: {} },
        value_number: { number: {} },
        value_string: { rich_text: {} },
        value_json: { rich_text: {} },
        value_percent: { number: {} },
        value_ruleset: { rich_text: {} }
      }
    })
  });
  if (!createRes.ok) throw new Error(`NotionCreateDbError: ${createRes.status} ${await createRes.text()}`);
  const db = await createRes.json() as { id: string };

  async function createRow(props: any) {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers,
      body: JSON.stringify({ parent: { database_id: db.id }, properties: props })
    });
    if (!res.ok) throw new Error(`NotionCreateRowError: ${res.status} ${await res.text()}`);
  }

  const envDev = { multi_select: [{ name: "development" }] };

  await createRow({
    key: { title: [{ text: { content: "checkoutRedesign" } }] },
    type: { select: { name: "boolean" } },
    env: envDev,
    value_boolean: { checkbox: true }
  });

  await createRow({
    key: { title: [{ text: { content: "testNumber" } }] },
    type: { select: { name: "number" } },
    env: envDev,
    value_number: { number: 42 }
  });

  await createRow({
    key: { title: [{ text: { content: "testString" } }] },
    type: { select: { name: "string" } },
    env: envDev,
    value_string: { rich_text: [{ text: { content: "hello" } }] }
  });

  await createRow({
    key: { title: [{ text: { content: "testJSON" } }] },
    type: { select: { name: "json" } },
    env: envDev,
    value_json: { rich_text: [{ text: { content: JSON.stringify({ a: 1, b: "x" }) } }] }
  });

  await createRow({
    key: { title: [{ text: { content: "testPercent" } }] },
    type: { select: { name: "percentRollout" } },
    env: envDev,
    value_percent: { number: 25 }
  });

  await createRow({
    key: { title: [{ text: { content: "testRules" } }] },
    type: { select: { name: "ruleSet" } },
    env: envDev,
    value_ruleset: { rich_text: [{ text: { content: JSON.stringify({ rules: [{ if: { country: "PL" }, then: true }, { else: false }] }) } }] }
  });

  process.stdout.write(`\n✅ Created database "${dbName}" with 6 sample flags\n`);
  process.stdout.write(`📝 Database ID: ${db.id}\n`);
  process.stdout.write(`🔗 View: https://www.notion.so/${db.id.replace(/-/g, "")}\n`);
  
  process.stdout.write(`\n📋 Add these to your .env.local:\n`);
  process.stdout.write(`\n`);
  process.stdout.write(`NOTION_TOKEN=${token}\n`);
  process.stdout.write(`NOTION_FLAGS_DB=${db.id}\n`);
  process.stdout.write(`NOTION_FLAGS_DB_NAME="${dbName}"\n`);
  process.stdout.write(`NOTION_PARENT_PAGE_ID=${parentPageId}\n`);
  process.stdout.write(`\n`);
  
  process.stdout.write(`🔧 Still needed (get from Vercel):\n`);
  process.stdout.write(`EDGE_CONFIG=https://edge-config.vercel.com/ecfg_xxx?token=xxx\n`);
  process.stdout.write(`VERCEL_API_TOKEN=xxx\n`);
  process.stdout.write(`SYNC_SECRET=any_random_string\n`);
  
  process.stdout.write(`\n💡 Next steps:\n`);
  process.stdout.write(`   1. Share the database with your Notion integration\n`);
  process.stdout.write(`   2. Get Vercel credentials (see README)\n`);
  process.stdout.write(`   3. npx notion-edge-flags validate --env development\n`);
  process.stdout.write(`   4. npx notion-edge-flags sync --env development --once\n`);
}
