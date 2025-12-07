import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never', // Don't prefix URLs with locale
  // Always use default locale, don't redirect
  localeDetection: false
});

export const config = {
  // Match all pathnames including root (/)
  // Exclude: /api, /_next, /_vercel, and files with dots (e.g. favicon.ico)
  matcher: [
    '/',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};

