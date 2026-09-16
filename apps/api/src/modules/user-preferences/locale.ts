export const LOCALES = ['en', 'uk', 'ru', 'zh-CN', 'ar', 'fr', 'pt-BR', 'id', 'es-ES'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// Keep this matcher aligned with the Web copy so the first server render and
// an account without saved preferences resolve to the same language. `fallback` is
// the instance's own default language, which only decides the case where the browser
// asked for nothing this app ships.
export function localeFromAcceptLanguage(
  value: string | null,
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  const requested = (value ?? '')
    .split(',')
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(';');
      const qualityValue = parameters
        .map((parameter) => parameter.trim().toLowerCase())
        .find((parameter) => parameter.startsWith('q='))
        ?.slice(2);
      const quality = qualityValue === undefined ? 1 : Number(qualityValue);
      return { tag: tag.toLowerCase(), quality, index };
    })
    .filter(({ tag, quality }) => tag && quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { tag } of requested) {
    if (tag === '*') return fallback;

    const exact = LOCALES.find((locale) => locale.toLowerCase() === tag);
    if (exact) return exact;

    const language = tag.split('-')[0];
    const sameLanguage = LOCALES.find((locale) => locale.toLowerCase().split('-')[0] === language);
    if (sameLanguage) return sameLanguage;
  }

  return fallback;
}
