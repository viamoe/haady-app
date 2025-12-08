import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  // Handle OAuth code at root path - redirect to appropriate callback
  // This catches cases where Supabase redirects to haady.app/?code=... 
  // instead of the intended subdomain callback
  if (pathname === '/' && code) {
    // Check if there's a state parameter that indicates the origin app
    // For now, we'll redirect to /auth/callback which handles the OAuth flow
    const callbackUrl = new URL('/auth/callback', req.url);
    callbackUrl.searchParams.set('code', code);
    
    // Copy over any other OAuth-related params
    const state = searchParams.get('state');
    if (state) callbackUrl.searchParams.set('state', state);
    
    return NextResponse.redirect(callbackUrl);
  }
  
  const isAuthPage = pathname.startsWith('/auth');
  const isAuthCallback = pathname.startsWith('/auth/callback');
  const isDashboard = pathname.startsWith('/dashboard');
  const isLockPage = pathname.startsWith('/lock');

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
  matcher: ['/', '/dashboard/:path*', '/lock/:path*']
};

