import { fetchChangedRows } from "../../sync/notion.ts";
import { resolveEnvironment } from "../../utils/env.ts";
import { loadDotenv, getEnv } from "../utils.ts";

export async function cmdValidate(argv: string[]): Promise<void> {
  loadDotenv();
  const envArgIndex = argv.indexOf("--env");
  const env = envArgIndex >= 0 && argv[envArgIndex + 1] ? (argv[envArgIndex + 1] as string) : resolveEnvironment(null);
  const notion = { token: getEnv("NOTION_TOKEN"), databaseId: process.env.NOTION_FLAGS_DB ?? undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME ?? undefined };
  const rows = await fetchChangedRows(notion, null);
  const count = rows.filter((r) => r.envs.includes(env)).length;
  process.stdout.write(`ok: ${count} rows for env=${env}\n`);
}
