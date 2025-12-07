import '@/app/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { LocaleProvider } from '@/i18n/context';
import { ErrorBoundary } from '@/components/error-boundary';
import type { Metadata } from 'next';
import type { Locale } from '@/i18n/request';
import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';

// English font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Arabic font
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Haady - Share Joy, Gift Happiness',
  description: 'Discover the perfect way to celebrate life\'s moments with thoughtful gifts that create lasting memories.',
  icons: {
    icon: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg',
    shortcut: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg',
    apple: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale() as Locale;
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? ibmPlexSansArabic.className : inter.className;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`h-full ${inter.variable} ${ibmPlexSansArabic.variable}`}>
      <body className={`h-full antialiased ${fontClass}`}>
        <ErrorBoundary>
          <NextIntlClientProvider messages={messages}>
            <LocaleProvider initialLocale={locale}>
              <ThemeProvider defaultTheme="light" storageKey="haady-app-theme">
                {children}
                <Toaster />
              </ThemeProvider>
            </LocaleProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
