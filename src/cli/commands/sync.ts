import { createSyncer } from "../../sync/syncer.ts";
import { fetchChangedRows } from "../../sync/notion.ts";
import { resolveEnvironment } from "../../utils/env.ts";
import { loadDotenv, getEnv, getDefaultTeamId } from "../utils.ts";

export async function cmdSync(argv: string[]): Promise<void> {
  loadDotenv();
  const once = argv.includes("--once");
  const envArgIndex = argv.indexOf("--env");
  const env = (envArgIndex >= 0 ? argv[envArgIndex + 1] : undefined) ?? resolveEnvironment(null);
  const edgeConfigConnection = getEnv("EDGE_CONFIG");
  const apiToken = getEnv("VERCEL_API_TOKEN");
  const teamId = process.env.VERCEL_TEAM_ID ?? await getDefaultTeamId(apiToken);
  if (!teamId) throw new Error("VERCEL_TEAM_ID not found");
  const notion = { token: getEnv("NOTION_TOKEN"), databaseId: process.env.NOTION_FLAGS_DB ?? undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME ?? undefined };
  const syncer = createSyncer({
    notion,
    edgeConfig: { connectionString: edgeConfigConnection, apiToken, teamId },
    env,
    mode: once ? "once" : "poll"
  });
  const fetcher = async (since: string | null) => fetchChangedRows(notion, since);
  await syncer.run(fetcher);
}
