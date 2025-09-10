import { resolveEnvironment, formatNamespacedKey } from "../utils/env";
import type { EdgeConfigConnection, FlagsClientOptions } from "./types";
import { createClient } from "@vercel/edge-config";

function createFetchConnection(opts: { edgeConfigId?: string; edgeConfigToken?: string; teamId?: string }): EdgeConfigConnection {
  const base = opts.edgeConfigId
    ? `https://api.vercel.com/v1/edge-config/${opts.edgeConfigId}`
    : `https://api.vercel.com/v1/edge-config`;
  const token = opts.edgeConfigToken ?? process.env.VERCEL_API_TOKEN ?? "";
  async function getItem(key: string): Promise<unknown> {
    const search = new URLSearchParams();
    search.set("keys", JSON.stringify([key]));
    if (opts.teamId ?? process.env.VERCEL_TEAM_ID) search.set("teamId", (opts.teamId ?? process.env.VERCEL_TEAM_ID) as string);
    const url = `${base}/items?${search.toString()}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ key: string; value: unknown }>;
    const found = data?.find((i) => i.key === key)?.value;
    return found ?? null;
  }
  async function getMany(keys: string[]): Promise<Record<string, unknown>> {
    if (keys.length === 0) return {};
    const search = new URLSearchParams();
    search.set("keys", JSON.stringify(keys));
    if (opts.teamId ?? process.env.VERCEL_TEAM_ID) search.set("teamId", (opts.teamId ?? process.env.VERCEL_TEAM_ID) as string);
    const url = `${base}/items?${search.toString()}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store"
    });
    if (!res.ok) return {};
    const data = (await res.json()) as Array<{ key: string; value: unknown }>;
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = null;
    for (const it of data ?? []) {
      if (keys.includes(it.key)) {
        out[it.key] = it.value;
      }
    }
    return out;
  }
  return { getItem, getMany };
}

export function createFlagsClient(options: FlagsClientOptions = {}) {
  const namespace = options.namespace ?? "flag";
  const env = resolveEnvironment(options.env ?? null);
  const edgeConfigConnection = process.env.EDGE_CONFIG;
  
  const edgeConfig = options.connection ? null : (edgeConfigConnection ? createClient(edgeConfigConnection) : null);

  let cache: Record<string, unknown> | null = null;
  const cacheExpiry = 30000;
  let lastFetch = 0;

  async function ensureCache() {
    const now = Date.now();
    const cacheAge = cache ? now - lastFetch : -1;
    console.log(`cache check: age=${cacheAge}ms expiry=${cacheExpiry}ms hasCache=${!!cache} willFetch=${!cache || cacheAge >= cacheExpiry}`);
    if (cache && cacheAge < cacheExpiry) return;
    
    try {
      if (edgeConfig) {
        console.log(`fetching via SDK: env=${env}`);
        const prefix = `${namespace}__${env}__`;
        const allItems = await edgeConfig.getAll();
        console.log(`SDK success: total=${Object.keys(allItems ?? {}).length} items`);
        
        const newCache: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(allItems ?? {})) {
          if (key.startsWith(prefix)) {
            const shortKey = key.slice(prefix.length);
            newCache[shortKey] = value;
            console.log(`cached via SDK: ${shortKey} = ${JSON.stringify(value)}`);
          }
        }
        
        cache = newCache;
        lastFetch = now;
        console.log(`SDK cache updated: ${Object.keys(cache).length} flags`);
        return;
      }
      
      console.log(`no Edge Config connection available`);
      if (!cache) cache = {};
      return;
      
    } catch (error) {
      console.log(`fetch error:`, error);
      if (!cache) cache = {};
      if (cache) lastFetch = now;
    }
  }

  async function getBoolean(key: string): Promise<boolean | null> {
    await ensureCache();
    const v = cache?.[key];
    if (v === null || v === undefined) return null;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      if (v === "true") return true;
      if (v === "false") return false;
    }
    return null;
  }

  async function getString(key: string): Promise<string | null> {
    await ensureCache();
    const v = cache?.[key];
    if (v === null || v === undefined) return null;
    if (typeof v === "string") return v;
    return null;
  }

  async function getNumber(key: string): Promise<number | null> {
    await ensureCache();
    const v = cache?.[key];
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  async function getJSON<T = unknown>(key: string): Promise<T | null> {
    await ensureCache();
    const v = cache?.[key];
    if (v === null || v === undefined) return null;
    if (typeof v === "object") return v as T;
    if (typeof v === "string") {
      try {
        return JSON.parse(v) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  async function getMany(keys: string[]): Promise<Record<string, unknown>> {
    await ensureCache();
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      out[k] = cache?.[k] ?? null;
    }
    return out;
  }

  return { getBoolean, getString, getNumber, getJSON, getMany };
}

