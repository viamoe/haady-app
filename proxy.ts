import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never', // Don't prefix URLs with locale
  // Always use default locale, don't redirect
  localeDetection: false
});

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // System routes that should bypass next-intl middleware
  const systemRoutes = [
    '/',
    '/login',
    '/create-account',
    '/auth',
    '/verify-email-otp',
    '/complete-profile',
    '/personality-traits',
    '/favorite-brands',
    '/favorite-colors',
    '/settings',
    '/my-gifts',
  ]
  
  // Check if it's a system route
  if (systemRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Handle dynamic username routes
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 1) {
    const segment = segments[0]
    
    // If it's a username without @, redirect to /@username
    if (!segment.startsWith('@')) {
      const url = request.nextUrl.clone()
      url.pathname = `/@${segment}`
      return NextResponse.redirect(url)
    }
    
    // Already has @ prefix, allow through
    return NextResponse.next();
  }
  
  // For all other routes, use next-intl middleware
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames including root (/)
  // Exclude: /api, /_next, /_vercel, and files with dots (e.g. favicon.ico)
  matcher: [
    '/',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};

