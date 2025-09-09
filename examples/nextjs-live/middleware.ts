import { NextResponse } from 'next/server';
import { createFlagsClient } from 'notion-edge-flags';

export async function middleware(req: Request) {
  const flags = createFlagsClient();
  const on = await flags.getBoolean('checkoutRedesign');
  if (on && new URL(req.url).pathname === '/old') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

