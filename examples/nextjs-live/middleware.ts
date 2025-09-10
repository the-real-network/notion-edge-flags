import { NextResponse } from 'next/server';
import { createFlagsClient } from 'notion-edge-flags';

export async function middleware(req: Request) {
  const flags = createFlagsClient();
  
  if (await flags.isEnabled('checkoutRedesign')) {
    if (new URL(req.url).pathname === '/old') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
  
  if (await flags.isEnabled('maintenanceMode')) {
    const config = await flags.getValue('maintenanceMode');
    if (config && typeof config === 'object' && 'message' in config) {
      return new NextResponse(config.message as string, { status: 503 });
    }
    return new NextResponse('Site under maintenance', { status: 503 });
  }
  
  return NextResponse.next();
}

