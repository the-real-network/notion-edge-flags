export function installNotionFetchMock(rows: Array<{ id: string; last_edited_time: string; properties: any }>) {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const u = new URL(url);
    if (u.hostname === "api.notion.com" && u.pathname.includes("/v1/databases/") && (init?.method ?? "GET").toUpperCase() === "POST") {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      const since: string | undefined = body?.filter?.last_edited_time?.on_or_after;
      const filtered = since ? rows.filter((r) => r.last_edited_time >= since) : rows;
      return new Response(
        JSON.stringify({ results: filtered, has_more: false, next_cursor: null }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return original(input as any, init);
  };
  return () => {
    globalThis.fetch = original;
  };
}

