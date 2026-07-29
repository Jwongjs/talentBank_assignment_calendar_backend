import { NextResponse, type NextRequest } from 'next/server';

import { isAdminEmail } from '@/lib/admin-auth';
import { getUserForMiddleware } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next();
  }

  const { user, response } = await getUserForMiddleware(request);

  if (user && isAdminEmail(user.email)) {
    return response;
  }

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
