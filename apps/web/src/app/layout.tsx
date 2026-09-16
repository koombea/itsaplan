import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import BrandingStyle from '@/components/branding-style';
import { Providers } from '@/components/providers';
import RuntimeEnvScript from '@/components/runtime-env-script';
import { BrandingProvider } from '@/context/brandingContext';
import WhatsNew from '@/features/whats-new/WhatsNew';
import { localeDirection, type Locale } from '@/i18n/locales';
import { safeHttpsUrl, serverBranding } from '@/utils/branding';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  const { appName, faviconUrl } = await serverBranding();
  const icon = safeHttpsUrl(faviconUrl);
  // Next drops the app/icon.svg file convention as soon as `icons` is set, and keeps
  // it when it is absent — so naming the icon only for an instance that set one is
  // what makes the built-in file the fallback.
  return {
    title: t('title', { appName }),
    description: t('description'),
    ...(icon && { icons: { icon } }),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const branding = await serverBranding();

  return (
    <html lang={locale} dir={localeDirection(locale as Locale)} suppressHydrationWarning>
      <body className="antialiased">
        <RuntimeEnvScript />
        <BrandingStyle />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          // A distinct key: next-themes defaults to "theme", which collides with any
          // other app sharing the same localhost origin. A shared key makes two such
          // apps fight over the value through cross-tab storage events.
          storageKey="itsaplan-theme"
        >
          <NextIntlClientProvider>
            <BrandingProvider branding={branding}>
              <Providers>
                {children}
                <WhatsNew />
              </Providers>
            </BrandingProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
