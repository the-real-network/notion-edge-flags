import { NextResponse } from 'next/server';
import { createSyncer, fetchChangedRows } from 'notion-edge-flags';

export async function GET(req: Request) {
  const secret = process.env.SYNC_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) return new NextResponse('unauthorized', { status: 401 });
  const notion = { token: process.env.NOTION_TOKEN!, databaseId: process.env.NOTION_FLAGS_DB || undefined, databaseName: process.env.NOTION_FLAGS_DB_NAME || undefined };
  const edgeConfig = { connectionString: process.env.EDGE_CONFIG!, apiToken: process.env.VERCEL_API_TOKEN! };
  const syncer = createSyncer({ notion, edgeConfig, mode: 'once' });
  await syncer.run((since) => fetchChangedRows(notion, since));
  return NextResponse.json({ ok: true });
}

