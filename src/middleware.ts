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
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
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
