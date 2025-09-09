#!/usr/bin/env node
import { createSyncer } from "../sync/syncer.js";
import { formatNamespacedKey, resolveEnvironment } from "../utils/env.js";
import { patchItems, getItems } from "../sync/edge-config.js";
import { fetchChangedRows } from "../sync/notion.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function getEnv(name: string, required = true) {
  const v = process.env[name];
  if (!v && required) throw new Error(`Missing env ${name}`);
  return v ?? "";
}

function loadDotenv() {
  const cwd = process.cwd();
  const candidates = [
    ".env.local",
    ".env.development.local",
    ".env.development",
    ".env"
  ];
  for (const file of candidates) {
    const p = join(cwd, file);
    if (!existsSync(p)) continue;
    try {
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
    } catch {}
  }
}

async function cmdSync(argv: string[]) {
  loadDotenv();
  const once = argv.includes("--once");
  const envArgIndex = argv.indexOf("--env");
  const env = (envArgIndex >= 0 ? argv[envArgIndex + 1] : undefined) ?? resolveEnvironment(null);
  const edgeConfigId = getEnv("EDGE_CONFIG_ID");
  const token = getEnv("VERCEL_API_TOKEN");
  const teamId = process.env.VERCEL_TEAM_ID;
  const notion = { token: getEnv("NOTION_TOKEN"), databaseId: process.env.NOTION_FLAGS_DB ?? undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME ?? undefined };
  const syncer = createSyncer({
    notion,
    vercel: { apiToken: token, edgeConfigId },
    env,
    mode: once ? "once" : "poll"
  });
  const fetcher = async (since: string | null) => fetchChangedRows(notion, since);
  await syncer.run(fetcher);
}

async function cmdFlip(argv: string[]) {
  loadDotenv();
  const envArgIndex = argv.indexOf("--env");
  const env = (envArgIndex >= 0 ? argv[envArgIndex + 1] : undefined) ?? resolveEnvironment(null);
  const keyIdx = argv.indexOf("--key");
  const valIdx = argv.indexOf("--value");
  if (keyIdx < 0 || valIdx < 0) throw new Error("Usage: flip --env <env> --key <key> --value <value>");
  const keyArg = argv[keyIdx + 1];
  const rawArg = argv[valIdx + 1];
  if (!keyArg || !rawArg) throw new Error("Usage: flip --env <env> --key <key> --value <value>");
  const key = keyArg as string;
  const raw = rawArg as string;
  let value: unknown = raw;
  if (raw === "true") value = true;
  else if (raw === "false") value = false;
  else if (!Number.isNaN(Number(raw))) value = Number(raw);
  else {
    try {
      value = JSON.parse(raw);
    } catch {}
  }
  const edgeConfigId = getEnv("EDGE_CONFIG_ID");
  const token = getEnv("VERCEL_API_TOKEN");
  const nsKey = formatNamespacedKey("flag", env, key);
  await patchItems([{ operation: "upsert", key: nsKey, value }], { edgeConfigId, token, teamId: process.env.VERCEL_TEAM_ID });
  process.stdout.write(`updated ${nsKey}\n`);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  if (cmd === "sync") return cmdSync(rest);
  if (cmd === "flip") return cmdFlip(rest);
  if (cmd === "validate") {
    loadDotenv();
    const envArgIndex = rest.indexOf("--env");
    const env = envArgIndex >= 0 && rest[envArgIndex + 1] ? (rest[envArgIndex + 1] as string) : resolveEnvironment(null);
    const notion = { token: getEnv("NOTION_TOKEN"), databaseId: process.env.NOTION_FLAGS_DB ?? undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME ?? undefined };
    const rows = await fetchChangedRows(notion, null);
    const count = rows.filter((r) => r.envs.includes(env)).length;
    process.stdout.write(`ok: ${count} rows for env=${env}\n`);
    return;
  }
  if (cmd === "export") {
    loadDotenv();
    const envArgIndex = rest.indexOf("--env");
    const env = envArgIndex >= 0 && rest[envArgIndex + 1] ? (rest[envArgIndex + 1] as string) : resolveEnvironment(null);
    const edgeConfigId = getEnv("EDGE_CONFIG_ID");
    const token = getEnv("VERCEL_API_TOKEN");
    const notion = { token: getEnv("NOTION_TOKEN"), databaseId: process.env.NOTION_FLAGS_DB ?? undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME ?? undefined };
    const rows = await fetchChangedRows(notion, null);
    const keys = rows.filter((r) => r.envs.includes(env)).map((r) => `flag__${env}__${r.key}`);
    if (keys.length === 0) {
      process.stdout.write("[]\n");
      return;
    }
    const map = await getItems(keys, { edgeConfigId, token, teamId: process.env.VERCEL_TEAM_ID });
    const out = keys.map((k) => ({ key: k, value: map[k] ?? null }));
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }
  if (cmd === "diff") {
    loadDotenv();
    const envArgIndex = rest.indexOf("--env");
    const env = envArgIndex >= 0 && rest[envArgIndex + 1] ? (rest[envArgIndex + 1] as string) : resolveEnvironment(null);
    const edgeConfigId = getEnv("EDGE_CONFIG_ID");
    const token = getEnv("VERCEL_API_TOKEN");
    const notion = { token: getEnv("NOTION_TOKEN"), databaseId: process.env.NOTION_FLAGS_DB ?? undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME ?? undefined };
    const rows = await fetchChangedRows(notion, null);
    const desired: Record<string, unknown> = {};
    const keys: string[] = [];
    for (const r of rows) if (r.envs.includes(env)) {
      const k = `flag__${env}__${r.key}`;
      desired[k] = r.value;
      keys.push(k);
    }
    const current = await getItems(keys, { edgeConfigId, token, teamId: process.env.VERCEL_TEAM_ID });
    const diffs: Array<{ key: string; notion?: unknown; edge?: unknown }> = [];
    const allKeys = new Set([...Object.keys(desired), ...Object.keys(current)]);
    for (const k of allKeys) {
      const a = desired[k];
      const b = current[k];
      if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ key: k, notion: a, edge: b });
    }
    process.stdout.write(JSON.stringify(diffs, null, 2) + "\n");
    return;
  }
  process.stdout.write("notion-edge-flags <sync|flip|validate|diff|export>\n");
}

main().catch((e) => {
  process.stderr.write((e?.message ?? String(e)) + "\n");
  process.exit(1);
});

