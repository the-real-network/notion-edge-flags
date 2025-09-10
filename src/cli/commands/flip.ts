import { formatNamespacedKey, resolveEnvironment } from "../../utils/env.ts";
import { patchItems } from "../../sync/edge-config.js";
import { parseEdgeConfigConnection } from "../../utils/edge-config-parser.js";
import { loadDotenv, getEnv } from "../utils.ts";

export async function cmdFlip(argv: string[]): Promise<void> {
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
  const edgeConfigConnection = getEnv("EDGE_CONFIG");
  const apiToken = getEnv("VERCEL_API_TOKEN");
  const { edgeConfigId } = parseEdgeConfigConnection(edgeConfigConnection);
  const nsKey = formatNamespacedKey("flag", env, key);
  await patchItems([{ operation: "upsert", key: nsKey, value }], { edgeConfigId, token: apiToken });
  process.stdout.write(`updated ${nsKey}\n`);
}
