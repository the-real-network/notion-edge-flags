export function installEdgeConfigFetchMock(store: Map<string, unknown>, id = "local") {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const u = new URL(url);
    if ((u.hostname === "api.vercel.com" && u.pathname.startsWith(`/v1/edge-config/${id}/items`)) ||
        (u.hostname === "edge-config.vercel.com" && u.pathname.startsWith(`/${id}/items`))) {
      if ((init?.method ?? "GET").toUpperCase() === "PATCH") {
        const body = typeof init?.body === "string" ? init.body : await (init?.body as any)?.text?.();
        const parsed = typeof body === "string" ? JSON.parse(body) : body;
        const items = parsed?.items ?? [];
        for (const it of items) store.set(it.key, it.value);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
      }
      const keysParam = u.searchParams.get("keys");
      const prefix = u.searchParams.get("prefix");
      if (keysParam) {
        const keys = JSON.parse(keysParam) as string[];
        const items = keys
          .map((k) => ({ key: k, value: store.has(k) ? store.get(k) : undefined }))
          .filter((x) => x.value !== undefined);
        return new Response(JSON.stringify(items), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (prefix) {
        const items: Array<{ key: string; value: unknown }> = [];
        for (const [k, v] of store.entries()) if (k.startsWith(prefix)) items.push({ key: k, value: v });
        return new Response(JSON.stringify(items), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (u.pathname.endsWith('/items') && !keysParam && !prefix) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of store.entries()) obj[k] = v;
        return new Response(JSON.stringify(obj), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    return original(input as any, init);
  };
  return () => {
    globalThis.fetch = original;
  };
}

