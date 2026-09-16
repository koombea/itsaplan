import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { localeFromAcceptLanguage } from './accept-language';
import { serverBranding } from '@/utils/branding';
import { LOCALE_COOKIE, isLocale } from './locales';
import { loadMessages } from './messages';

// The app has no `[locale]` route segment, so every URL stays the same in every
// language. The account preference is the durable copy, the cookie selects later
// server renders, the browser preference selects the first render without one, and
// the instance's branding decides what a browser asking for an unsupported language
// gets. The branding read is shared with the layout's, so this costs no extra call.
export default getRequestConfig(async () => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const { defaultLocale } = await serverBranding();
  const locale = isLocale(cookie)
    ? cookie
    : localeFromAcceptLanguage(
        (await headers()).get('accept-language'),
        isLocale(defaultLocale) ? defaultLocale : undefined,
      );

  return {
    locale,
    messages: await loadMessages(locale),
    // The initial reference for relative times. Sharing it between the server and
    // client keeps hydration stable; RelativeTimeProvider advances it once mounted.
    now: new Date(),
  };
});
