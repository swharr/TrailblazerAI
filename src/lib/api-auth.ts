import { auth } from './auth';
import { NextResponse } from 'next/server';

/**
 * Get the current session for API routes.
 * Returns the session if authenticated, null otherwise.
 */
export async function getApiSession() {
  return await auth();
}

/**
 * Helper to create an unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Check if the request is authenticated and return the session.
 * Use this in API routes that require authentication.
 *
 * Example:
 * ```
 * const { session, errorResponse } = await requireAuth();
 * if (errorResponse) return errorResponse;
 * // session is guaranteed to be non-null here
 * ```
 */
export async function requireAuth() {
  const session = await getApiSession();

  if (!session?.user) {
    return { session: null, errorResponse: unauthorizedResponse() };
  }

  return { session, errorResponse: null };
}
