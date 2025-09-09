import { resolveEnvironment, formatNamespacedKey } from "../utils/env.js";
import { getItems, patchItems } from "./edge-config.js";
import { readCheckpoint, writeCheckpoint, writeSummary } from "./checkpoint.js";
import type { NotionClientOptions, NotionFlagRow } from "./notion.js";

export type DriftPolicy = "prefer-notion" | "prefer-edge-config" | "report-only";

export type SyncerOptions = {
  notion: NotionClientOptions;
  vercel: { apiToken: string; edgeConfigId: string };
  env?: string;
  namespace?: string;
  pollIntervalMs?: number;
  mode?: "poll" | "once";
  driftPolicy?: DriftPolicy;
  logger?: (e: unknown | string) => void;
};

export function createSyncer(options: SyncerOptions) {
  const namespace = options.namespace ?? "flag";
  const env = resolveEnvironment(options.env ?? null);
  const interval = Math.max(1000, options.pollIntervalMs ?? 30000);
  const mode = options.mode ?? "once";
  const drift: DriftPolicy = options.driftPolicy ?? "prefer-notion";
  const log = options.logger ?? ((e) => console.log(e));

  async function computeChecksum(values: Record<string, unknown>): Promise<string> {
    const keys = Object.keys(values).sort();
    const data = JSON.stringify(keys.map((k) => [k, values[k]]));
    let h = 0;
    for (let i = 0; i < data.length; i++) h = (h * 31 + data.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }

  function mapNotionToEdge(rows: NotionFlagRow[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      if (!r.envs.includes(env)) continue;
      const k = formatNamespacedKey(namespace, env, r.key);
      out[k] = r.value;
    }
    return out;
  }

  async function diffAndPatch(target: Record<string, unknown>) {
    const keys = Object.keys(target);
    if (keys.length === 0) return 0;
    const current = await getItems(keys, { edgeConfigId: options.vercel.edgeConfigId, token: options.vercel.apiToken, teamId: process.env.VERCEL_TEAM_ID });
    const items: Array<{ operation: "upsert"; key: string; value: unknown }> = [];
    for (const k of keys) {
      const desired = target[k];
      const existing = current[k];
      const equal = JSON.stringify(desired) === JSON.stringify(existing);
      if (!equal) {
        if (drift === "prefer-edge-config") continue;
        if (drift === "report-only") continue;
        items.push({ operation: "upsert", key: k, value: desired });
      }
    }
    if (items.length > 0) await patchItems(items, { edgeConfigId: options.vercel.edgeConfigId, token: options.vercel.apiToken, teamId: process.env.VERCEL_TEAM_ID });
    return items.length;
  }

  async function once(fetcher: (since: string | null) => Promise<NotionFlagRow[]>) {
    const t0 = Date.now();
    const since = await readCheckpoint(namespace, env, { edgeConfigId: options.vercel.edgeConfigId, token: options.vercel.apiToken, teamId: process.env.VERCEL_TEAM_ID });
    const rows = await fetcher(since);
    const mapped = mapNotionToEdge(rows);
    const updated = await diffAndPatch(mapped);
    const keys = Object.keys(mapped);
    const after = await getItems(keys, { edgeConfigId: options.vercel.edgeConfigId, token: options.vercel.apiToken, teamId: process.env.VERCEL_TEAM_ID });
    const checksum = await computeChecksum(after);
    const now = new Date().toISOString();
    await writeCheckpoint(namespace, env, now, { edgeConfigId: options.vercel.edgeConfigId, token: options.vercel.apiToken });
    await writeSummary(namespace, env, { updated, at: now, checksum }, { edgeConfigId: options.vercel.edgeConfigId, token: options.vercel.apiToken });
    log(`synced ${updated} flags for ${env}`);
  }

  async function run(fetcher: (since: string | null) => Promise<NotionFlagRow[]>) {
    if (mode === "once") {
      await once(fetcher);
      return;
    }
    while (true) {
      try {
        await once(fetcher);
      } catch (e) {
        log(e);
      }
      await new Promise((r) => setTimeout(r, interval));
    }
  }

  return { run };
}

