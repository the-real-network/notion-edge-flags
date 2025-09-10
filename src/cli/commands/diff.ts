import { fetchChangedRows } from "../../sync/notion.ts";
import { getItems } from "../../sync/edge-config.ts";
import { resolveEnvironment } from "../../utils/env.ts";
import { loadDotenv, getEnv } from "../utils.ts";

export async function cmdDiff(argv: string[]): Promise<void> {
  loadDotenv();
  const envArgIndex = argv.indexOf("--env");
  const env = envArgIndex >= 0 && argv[envArgIndex + 1] ? (argv[envArgIndex + 1] as string) : resolveEnvironment(null);
  const edgeConfigConnection = getEnv("EDGE_CONFIG");
  const notion = { token: getEnv("NOTION_TOKEN"), databaseId: process.env.NOTION_FLAGS_DB ?? undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME ?? undefined };
  const rows = await fetchChangedRows(notion, null);
  const desired: Record<string, unknown> = {};
  const keys: string[] = [];
  for (const r of rows) if (r.envs.includes(env)) {
    const k = `flag__${env}__${r.key}`;
    desired[k] = {
      enabled: r.enabled,
      value: r.value,
      type: r.type
    };
    keys.push(k);
  }
  const current = await getItems(keys, { connectionString: edgeConfigConnection });
  const diffs: Array<{ key: string; notion?: unknown; edge?: unknown }> = [];
  const allKeys = new Set([...Object.keys(desired), ...Object.keys(current)]);
  for (const k of allKeys) {
    const a = desired[k];
    const b = current[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ key: k, notion: a, edge: b });
  }
  process.stdout.write(JSON.stringify(diffs, null, 2) + "\n");
}
