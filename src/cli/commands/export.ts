import { fetchChangedRows } from "../../sync/notion.ts";
import { getItems } from "../../sync/edge-config.ts";
import { resolveEnvironment } from "../../utils/env.ts";
import { loadDotenv, getEnv } from "../utils.ts";

export async function cmdExport(argv: string[]): Promise<void> {
  loadDotenv();
  const envArgIndex = argv.indexOf("--env");
  const env = envArgIndex >= 0 && argv[envArgIndex + 1] ? (argv[envArgIndex + 1] as string) : resolveEnvironment(null);
  const edgeConfigConnection = getEnv("EDGE_CONFIG");
  const notion = { token: getEnv("NOTION_TOKEN"), databaseId: process.env.NOTION_FLAGS_DB ?? undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME ?? undefined };
  const rows = await fetchChangedRows(notion, null);
  const keys = rows.filter((r) => r.envs.includes(env)).map((r) => `flag__${env}__${r.key}`);
  if (keys.length === 0) {
    process.stdout.write("[]\n");
    return;
  }
  const map = await getItems(keys, { connectionString: edgeConfigConnection });
  const out = keys.map((k) => ({ key: k, value: map[k] ?? null }));
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}
