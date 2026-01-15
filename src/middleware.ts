import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that require authentication (pages only - API routes check auth internally)
const protectedPages = ['/dashboard', '/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected page
  const isProtectedPage = protectedPages.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedPage) {
    // Use getToken which is Edge-compatible (reads JWT from cookie)
    // NextAuth v5 uses AUTH_SECRET, fallback to NEXTAUTH_SECRET for compatibility
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

    // NextAuth v5 uses 'authjs' as the cookie prefix
    const token = await getToken({
      req: request,
      secret,
      cookieName: process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
    });

    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match pages that need protection (not API routes)
    '/dashboard/:path*',
    '/settings/:path*',
  ],
};
