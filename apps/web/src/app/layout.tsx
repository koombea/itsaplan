import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { startupScreens } from '@/cloud';
import BrandingStyle from '@/components/branding-style';
import StartupFirstProject from '@/components/layout/StartupFirstProject';
import StartupScreens from '@/components/layout/StartupScreens';
import { Providers } from '@/components/providers';
import RuntimeEnvScript from '@/components/runtime-env-script';
import { BrandingProvider } from '@/context/brandingContext';
import Onboarding from '@/features/onboarding/Onboarding';
import OnboardingReplay from '@/features/onboarding/OnboardingReplay';
import WhatsNew from '@/features/whats-new/WhatsNew';
import { localeDirection, type Locale } from '@/i18n/locales';
import { safeHttpsUrl, serverBranding } from '@/utils/branding';
import { COLOR_THEME_COOKIE, parseColorThemeCookie } from '@/utils/colorThemes';
import { customThemeVars } from '@/utils/customTheme';
import './globals.css';

// The start goes first: the release notes and the tour are about work the person can
// already see.
const STARTUP_SCREENS = startupScreens([
  { id: 'start', Component: StartupFirstProject },
  { id: 'whats-new', Component: WhatsNew },
  { id: 'tour', Component: Onboarding },
]);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  const { appName, faviconUrl } = await serverBranding();
  const icon = safeHttpsUrl(faviconUrl);
  // Next drops the app/icon.svg file convention as soon as `icons` is set, and keeps
  // it when it is absent — so naming the icon only for an instance that set one is
  // what makes the built-in file the fallback.
  return {
    title: appName,
    description: t('description'),
    appleWebApp: { title: appName, capable: true, statusBarStyle: 'default' },
    ...(icon && { icons: { icon } }),
  };
}

// The `--background` of each theme in globals.css, so the browser chrome of an
// installed app matches the page.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#131313' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const branding = await serverBranding();
  const { palette, custom } = parseColorThemeCookie(
    (await cookies()).get(COLOR_THEME_COOKIE)?.value,
  );

  return (
    <html
      lang={locale}
      dir={localeDirection(locale as Locale)}
      data-palette={palette === 'default' ? undefined : palette}
      style={custom ? (customThemeVars(custom) as CSSProperties) : undefined}
      suppressHydrationWarning
    >
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
                <StartupScreens screens={STARTUP_SCREENS} />
                <OnboardingReplay />
              </Providers>
            </BrandingProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
