import { formatNamespacedKey } from "../utils/env.js";
import { getItems, patchItems } from "./edge-config.js";

export type SyncSummary = { updated: number; at: string; checksum: string };

export async function readCheckpoint(namespace: string, env: string, opts: { edgeConfigId: string; token: string; connectionString?: string }) {
  const key = `${namespace}__sync__${env}__checkpoint`;
  const map = await getItems([key], opts);
  const v = map[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export async function writeCheckpoint(namespace: string, env: string, iso: string, opts: { edgeConfigId: string; token: string }) {
  const key = `${namespace}__sync__${env}__checkpoint`;
  await patchItems([{ operation: "upsert", key, value: iso }], opts);
}

export async function writeSummary(namespace: string, env: string, summary: SyncSummary, opts: { edgeConfigId: string; token: string }) {
  const key = `${namespace}__sync__${env}__summary`;
  await patchItems([{ operation: "upsert", key, value: summary }], opts);
}

