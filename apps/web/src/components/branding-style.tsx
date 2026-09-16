import { connection } from 'next/server';
import { accentForeground, safeAccentColor, serverBranding } from '@/utils/branding';

// The instance accent color, as a rule that wins over globals.css by coming after
// it: both selectors carry the same specificity, so document order decides. Written
// inline rather than through a class, because the value is per instance and the
// stylesheet is frozen into the build.
// `connection()` keeps the value out of a prerender: a page rendered at build time
// would carry the building machine's instance into the HTML.
// The literal is re-checked here rather than trusted from the api: it is
// interpolated straight into a declaration, where a value carrying `;` or `}` would
// close the rule and make the rest of the string into stylesheet of its own.
export default async function BrandingStyle() {
  await connection();
  const accent = safeAccentColor((await serverBranding()).accentColor);
  if (!accent) return null;

  const foreground = accentForeground(accent);
  const css =
    `:root, .dark { --primary: ${accent}; --primary-foreground: ${foreground}; ` +
    `--sidebar-primary: ${accent}; --sidebar-primary-foreground: ${foreground}; }`;
  return <style>{css}</style>;
}
