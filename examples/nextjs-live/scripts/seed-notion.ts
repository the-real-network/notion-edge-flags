/*
  Seed a Notion database for flags under a parent page.
  Requires envs in examples/nextjs-live/.env.local:
  - NOTION_TOKEN
  - NOTION_PARENT_PAGE_ID (the page to create the DB under)
  - OPTIONAL: NOTION_FLAGS_DB_NAME (defaults to "notion toggles")
*/

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function loadDotenv() {
  const cwd = process.cwd();
  const p = join(cwd, ".env.local");
  if (existsSync(p)) {
    const txt = readFileSync(p, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      const raw = line.slice(eq + 1).trim();
      const val = raw.replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function main() {
  loadDotenv();
  const token = process.env.NOTION_TOKEN;
  const parent = process.env.NOTION_PARENT_PAGE_ID;
  const name = process.env.NOTION_FLAGS_DB_NAME || "notion toggles";
  if (!token) throw new Error("NOTION_TOKEN missing");
  if (!parent) throw new Error("NOTION_PARENT_PAGE_ID missing");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "content-type": "application/json"
  } as const;

  const createRes = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parent },
      title: [{ type: "text", text: { content: name } }],
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

  process.stdout.write(`created database ${name} (${db.id})\n`);
}

main().catch((e) => {
  process.stderr.write((e?.message ?? String(e)) + "\n");
  process.exit(1);
});


