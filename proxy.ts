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
  
  // For root route and login, bypass next-intl middleware to avoid any interference
  // Locale is handled via cookies in the layout
  if (pathname === '/' || pathname === '/login') {
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

