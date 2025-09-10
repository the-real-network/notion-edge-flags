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
  process.stdout.write("2. Copy the URL (contains page ID at the end)\n");
  process.stdout.write("3. Example: https://notion.so/workspace/Page-abc123de-f456-7890-abcd-ef1234567890\n\n");
  
  const rawPageId = await promptInput("Paste the page ID (32 or 36 chars):");
  if (!rawPageId) throw new Error("Page ID required");
  const parentPageId = rawPageId.replace(/-/g, "");
  if (parentPageId.length !== 32) throw new Error("Invalid page ID (must be 32 hex characters, with or without dashes)");
  
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
        enabled: { checkbox: {} },
        type: { select: { options: [
          { name: "string" }, { name: "number" }, { name: "json" }, 
          { name: "percent" }, { name: "rules" }
        ] } },
        value: { rich_text: {} },
        value_number: { number: {} },
        value_json: { rich_text: {} },
        value_percent: { number: {} },
        value_ruleset: { rich_text: {} },
        env: { multi_select: { options: [{ name: "development" }, { name: "preview" }, { name: "production" }] } },
        description: { rich_text: {} },
        created_by: { created_by: {} },
        last_edited_time: { last_edited_time: {} }
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
    key: { title: [{ text: { content: "newCheckoutFlow" } }] },
    enabled: { checkbox: true },
    value: { rich_text: [{ text: { content: "v2" } }] },
    env: envDev,
    description: { rich_text: [{ text: { content: "Enable redesigned checkout experience" } }] }
  });

  await createRow({
    key: { title: [{ text: { content: "maxCartItems" } }] },
    enabled: { checkbox: true },
    type: { select: { name: "number" } },
    value_number: { number: 10 },
    env: envDev,
    description: { rich_text: [{ text: { content: "Maximum items allowed in shopping cart" } }] }
  });

  await createRow({
    key: { title: [{ text: { content: "welcomeMessage" } }] },
    enabled: { checkbox: true },
    type: { select: { name: "string" } },
    value: { rich_text: [{ text: { content: "Welcome to our store!" } }] },
    env: envDev,
    description: { rich_text: [{ text: { content: "Homepage hero message" } }] }
  });

  await createRow({
    key: { title: [{ text: { content: "paymentConfig" } }] },
    enabled: { checkbox: true },
    type: { select: { name: "json" } },
    value: { rich_text: [{ text: { content: JSON.stringify({ provider: "stripe", currency: "USD", methods: ["card", "paypal"] }) } }] },
    env: envDev,
    description: { rich_text: [{ text: { content: "Payment system configuration" } }] }
  });

  await createRow({
    key: { title: [{ text: { content: "premiumFeatureRollout" } }] },
    enabled: { checkbox: true },
    type: { select: { name: "percent" } },
    value_percent: { number: 15 },
    env: envDev,
    description: { rich_text: [{ text: { content: "Gradual rollout of premium features to 15% of users" } }] }
  });

  await createRow({
    key: { title: [{ text: { content: "regionBasedPricing" } }] },
    enabled: { checkbox: true },
    type: { select: { name: "rules" } },
    value: { rich_text: [{ text: { content: JSON.stringify({ 
      rules: [
        { if: { country: "US", plan: "enterprise" }, then: true },
        { if: { country: "EU" }, then: true },
        { else: false }
      ] 
    }) } }] },
    env: envDev,
    description: { rich_text: [{ text: { content: "Enable region-specific pricing for US enterprise and EU users" } }] }
  });

  await createRow({
    key: { title: [{ text: { content: "maintenanceMode" } }] },
    enabled: { checkbox: false },
    type: { select: { name: "json" } },
    value: { rich_text: [{ text: { content: JSON.stringify({ message: "We'll be back soon!", estimatedTime: "30 minutes" }) } }] },
    env: envDev,
    description: { rich_text: [{ text: { content: "Emergency maintenance mode with custom message" } }] }
  });

  process.stdout.write(`\n✅ Created database "${dbName}" with 7 sample flags\n`);
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
  process.stdout.write(`VERCEL_TEAM_ID=team_xxx  # Required if not using personal account\n`);
  process.stdout.write(`SYNC_SECRET=any_random_string\n`);
  
  process.stdout.write(`\n💡 Feature Flag Structure:\n`);
  process.stdout.write(`   • enabled (Checkbox) - Universal on/off toggle ✅\n`);
  process.stdout.write(`   • value (Rich Text/Number/etc.) - Optional configuration\n`);
  process.stdout.write(`   • type (Select) - Optional type hint for evaluation\n`);
  process.stdout.write(`   • Every flag can be instantly disabled via 'enabled' checkbox!\n`);
  
  process.stdout.write(`\n💡 Next steps:\n`);
  process.stdout.write(`   1. Share the database with your Notion integration\n`);
  process.stdout.write(`   2. Get Vercel credentials (see README)\n`);
  process.stdout.write(`   3. npx notion-edge-flags validate --env development\n`);
  process.stdout.write(`   4. npx notion-edge-flags sync --env development --once\n`);
  process.stdout.write(`   5. Try: npx notion-edge-flags flip --env development --key newCheckoutFlow\n`);
}
