import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, favicon, internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get('bmost_token')?.value ||
    request.cookies.get('b_most_auth_token')?.value;

  // The root route only selects the correct landing page; it renders no UI.
  if (pathname === '/') {
    return NextResponse.redirect(new URL(token ? '/dashboard' : '/login', request.url));
  }

  // Public routes: /verify, /verify/:code, /login
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/verify');

  if (pathname === '/login' && token) {
    // Already authenticated -> redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
