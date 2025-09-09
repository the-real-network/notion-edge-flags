type PatchItem = { operation: "upsert"; key: string; value: unknown };

export async function getItems(keys: string[], opts: { edgeConfigId?: string; token?: string; teamId?: string }) {
  const base = opts.edgeConfigId
    ? `https://api.vercel.com/v1/edge-config/${opts.edgeConfigId}`
    : `https://api.vercel.com/v1/edge-config`;
  const search = new URLSearchParams();
  search.set("keys", JSON.stringify(keys));
  if (opts.teamId) search.set("teamId", opts.teamId);
  const url = `${base}/items?${search.toString()}`;
  const res = await fetch(url, {
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
    cache: "no-store"
  });
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`EdgeConfigReadError: ${res.status} ${detail}`);
  }
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

export async function patchItems(items: PatchItem[], opts: { edgeConfigId: string; token: string; teamId?: string }) {
  const base = `https://api.vercel.com/v1/edge-config/${opts.edgeConfigId}/items`;
  const url = opts.teamId ? `${base}?teamId=${encodeURIComponent(opts.teamId)}` : base;
  const payload = { items };
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${opts.token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`EdgeConfigWriteError: ${res.status} ${detail}`);
  }
}

