import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { it } from 'node:test';

const messagesDir = new URL('../../../../messages/', import.meta.url);

// The tour's title names the product, which an instance renames with its branding.
it('names the product through the branded name in every language', () => {
  const locales = readdirSync(messagesDir);
  assert.ok(locales.length > 1);
  for (const locale of locales) {
    const { label } = JSON.parse(
      readFileSync(new URL(`${locale}/onboarding.json`, messagesDir), 'utf8'),
    ) as { label: string };
    assert.match(label, /\{appName\}/, locale);
    assert.doesNotMatch(label, /It's a Plan/, locale);
  }
});
