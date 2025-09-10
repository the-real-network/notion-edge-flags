import { formatNamespacedKey, resolveEnvironment } from "../../utils/env.ts";
import { patchItems } from "../../sync/edge-config.ts";
import { parseEdgeConfigConnection } from "../../utils/edge-config-parser.ts";
import { loadDotenv, getEnv, getDefaultTeamId } from "../utils.ts";

export async function cmdFlip(argv: string[]): Promise<void> {
  loadDotenv();
  const envArgIndex = argv.indexOf("--env");
  const env = (envArgIndex >= 0 ? argv[envArgIndex + 1] : undefined) ?? resolveEnvironment(null);
  const keyIdx = argv.indexOf("--key");
  
  if (keyIdx < 0) throw new Error("Usage: flip --env <env> --key <key> [--enabled true|false] [--value <value>]");
  
  const keyArg = argv[keyIdx + 1];
  if (!keyArg) throw new Error("Usage: flip --env <env> --key <key> [--enabled true|false] [--value <value>]");
  
  const key = keyArg as string;
  const edgeConfigConnection = getEnv("EDGE_CONFIG");
  const apiToken = getEnv("VERCEL_API_TOKEN");
  const teamId = process.env.VERCEL_TEAM_ID ?? await getDefaultTeamId(apiToken);
  if (!teamId) throw new Error("VERCEL_TEAM_ID not found");
  const { edgeConfigId } = parseEdgeConfigConnection(edgeConfigConnection);
  const nsKey = formatNamespacedKey("flag", env, key);

  // Get current flag
  const { getItems } = await import("../../sync/edge-config.ts");
  const current = await getItems([nsKey], { edgeConfigId, token: apiToken, connectionString: edgeConfigConnection });
  const currentFlag = current[nsKey] as any;
  
  // Parse arguments
  const enabledIdx = argv.indexOf("--enabled");
  const valueIdx = argv.indexOf("--value");
  
  let newFlag: any;
  
  if (currentFlag && typeof currentFlag === 'object' && 'enabled' in currentFlag) {
    // Current flag has new structure
    newFlag = { ...currentFlag };
  } else {
    // Legacy flag or no existing flag - convert to new structure
    newFlag = {
      enabled: Boolean(currentFlag),
      value: currentFlag,
      type: typeof currentFlag === "string" ? "string" : typeof currentFlag === "number" ? "number" : undefined
    };
  }
  
  // Update enabled state if specified
  if (enabledIdx >= 0) {
    const enabledArg = argv[enabledIdx + 1];
    if (enabledArg === "true") newFlag.enabled = true;
    else if (enabledArg === "false") newFlag.enabled = false;
    else throw new Error("--enabled must be 'true' or 'false'");
  }
  
  // Update value if specified
  if (valueIdx >= 0) {
    const rawArg = argv[valueIdx + 1];
    if (!rawArg) throw new Error("--value requires an argument");
    
    let value: unknown = rawArg;
    if (rawArg === "true") value = true;
    else if (rawArg === "false") value = false;
    else if (!Number.isNaN(Number(rawArg))) value = Number(rawArg);
    else {
      try {
        value = JSON.parse(rawArg);
      } catch {}
    }
    
    newFlag.value = value;
    if (!newFlag.type) {
      newFlag.type = typeof value === "string" ? "string" : typeof value === "number" ? "number" : undefined;
    }
  }
  
  // If neither enabled nor value specified, just toggle enabled
  if (enabledIdx < 0 && valueIdx < 0) {
    newFlag.enabled = !newFlag.enabled;
  }

  await patchItems([{ operation: "upsert", key: nsKey, value: newFlag }], { edgeConfigId, token: apiToken, teamId });
  
  process.stdout.write(`✅ Updated ${key}:\n`);
  process.stdout.write(`   enabled: ${newFlag.enabled}\n`);
  if (newFlag.value !== undefined) {
    process.stdout.write(`   value: ${JSON.stringify(newFlag.value)}\n`);
  }
  if (newFlag.type) {
    process.stdout.write(`   type: ${newFlag.type}\n`);
  }
}
