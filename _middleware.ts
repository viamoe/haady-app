import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isAuthCallback = req.nextUrl.pathname.startsWith('/auth/callback');
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  const isLockPage = req.nextUrl.pathname.startsWith('/lock');

  // Allow auth callback to pass through without checking session
  if (isAuthCallback) {
    return NextResponse.next();
  }

  // Protect dashboard and lock routes - require valid session
  if (isDashboard || isLockPage) {
    // Create Supabase client to check session properly
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll(cookiesToSet) {
            // Cookies are set in route handlers, not middleware
            // This is a no-op in middleware
          },
        },
      }
    );

    // Check for valid session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/auth', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/lock/:path*']
};