import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/signin'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // If accessing signin while logged in, redirect to dashboard
  if (pathname === '/signin' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If accessing protected route without session, redirect to signin
  if (!isPublicPath && !session) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Check admin routes
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    try {
      const sessionData = JSON.parse(
        Buffer.from(session.value, 'base64').toString()
      );
      
      if (sessionData.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
