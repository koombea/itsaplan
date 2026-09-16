import { cache } from 'react';
import type { BrandingSettings } from '@/lib/api/endpoints/settings';
import { APP_NAME, APP_SITE_URL } from '@/utils/app';
import { serverRuntimeEnv } from '@/utils/runtimeEnv';
import { DEFAULT_LOCALE } from '@/i18n/locales';

// What the instance shows when it has never been branded, which is also what a
// field left empty falls back to.
export const DEFAULT_BRANDING: BrandingSettings = {
  appName: APP_NAME,
  siteUrl: APP_SITE_URL,
  logoUrl: '',
  accentColor: '',
  loginTagline: '',
  defaultLocale: DEFAULT_LOCALE,
  faviconUrl: '',
};

// The branding for a server render, read once per request. The api validated these
// values when they were stored, but a row can also be written by hand, so the two
// fields that reach an attribute or a stylesheet are re-checked at the point of use
// (safeHttpsUrl, safeAccentColor) rather than trusted here.
//
// A failure answers with the built-in identity: this read is on the path of every
// page, and an api that is slow to come up must not blank the app.
export const serverBranding = cache(async (): Promise<BrandingSettings> => {
  // The public origin is what the browser uses; inside a compose network the api is
  // reached by service name, which is what SERVICE_URL_API carries.
  const origin = process.env.SERVICE_URL_API || serverRuntimeEnv().apiUrl;
  try {
    const response = await fetch(`${origin}/auth-config`, { cache: 'no-store' });
    if (!response.ok) return DEFAULT_BRANDING;
    const config = (await response.json()) as { branding?: Partial<BrandingSettings> };
    return { ...DEFAULT_BRANDING, ...(config.branding ?? {}) };
  } catch {
    return DEFAULT_BRANDING;
  }
});

// An absolute https URL and nothing else — the shape the logo, the tab icon and the
// product site all have to have. A relative or protocol-relative value would resolve
// against the app's own origin, and `javascript:`/`data:` in an attribute the
// operator pastes is a way to run script on every page.
const HTTPS_URL = /^https:\/\/[^\s"'<>]+$/;

export function safeHttpsUrl(value: string): string | null {
  return HTTPS_URL.test(value) ? value : null;
}

// `#rrggbb`, or an oklch() of plain numbers. Anything else is refused before it is
// written into a declaration: a value carrying `;` or `}` closes the rule and the
// rest of the string becomes stylesheet the operator did not intend.
const COLOR_LITERAL =
  /^(#[0-9a-f]{6}|oklch\( *[0-9.]+%? +[0-9.]+%? +[0-9.]+( *\/ *[0-9.]+%?)? *\))$/i;

export function safeAccentColor(value: string): string | null {
  return COLOR_LITERAL.test(value) ? value : null;
}

// Lightness on the OKLab scale, where 0 is black and 1 is white, for either accepted
// literal. oklch states it directly; a hex has to be converted, and the sRGB channel
// average would call a saturated blue as light as a yellow.
function accentLightness(color: string): number {
  const oklch = /^oklch\( *([0-9.]+)(%?)/i.exec(color);
  if (oklch) return oklch[2] ? Number(oklch[1]) / 100 : Number(oklch[1]);

  const channel = (offset: number) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(1), channel(3), channel(5)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

// The text that sits on the accent, in both themes: the accent replaces --primary
// everywhere, so the pair the stylesheet ships no longer holds. The two values are
// the ones globals.css already uses for --primary-foreground.
export function accentForeground(color: string): string {
  return accentLightness(color) < 0.62 ? 'oklch(0.985 0 0)' : 'oklch(0.18 0 0)';
}
