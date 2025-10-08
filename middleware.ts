// middleware.ts (in project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  // Verwijder XFO als die ergens wordt gezet
  res.headers.delete('X-Frame-Options');
  // Zet correcte CSP
  res.headers.set(
    'Content-Security-Policy',
    'frame-ancestors https://admin.shopify.com https://*.myshopify.com'
  );
  return res;
}

// Pas op alles toe
export const config = { matcher: '/:path*' };
