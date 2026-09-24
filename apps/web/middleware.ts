import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, favicon, internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('b_most_auth_token')?.value;

  // Public routes: /verify, /verify/:code, /login
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/verify');

  if (pathname === '/login' && token) {
    // Already authenticated -> redirect to dashboard
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isPublicRoute && !token) {
    // Protected route without token -> redirect to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
