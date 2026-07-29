import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_PASSWORD, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next();
  }

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (session === ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
