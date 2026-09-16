import { describe, expect, it } from 'bun:test';
import { BrandingSettingsSchema } from '../../model';

// The body schema is the only thing standing between a god-mode client and the stored
// branding: the form is one caller of this endpoint, not a gate in front of it. These
// pin the two shapes the web app cannot recover from — a blank identity, and a color
// the page would have to composite before it could pick text for it.

const siteUrl = new RegExp(BrandingSettingsSchema.properties.siteUrl.pattern!);
const accentColor = new RegExp(BrandingSettingsSchema.properties.accentColor.pattern!);

describe('BrandingSettingsSchema', () => {
  it('requires a name, because an empty one leaves the instance with no identity', () => {
    expect(BrandingSettingsSchema.properties.appName.minLength).toBe(1);
  });

  it('requires an https site, which is what the public share header links', () => {
    expect(siteUrl.test('https://plan.example.com/')).toBe(true);
    for (const value of [
      '',
      'http://plan.example.com/',
      'javascript:alert(1)',
      '//evil.example.com',
    ]) {
      expect(siteUrl.test(value)).toBe(false);
    }
  });

  it('accepts an opaque color literal and refuses a translucent one', () => {
    expect(accentColor.test('#1d4ed8')).toBe(true);
    expect(accentColor.test('oklch(0.62 0.19 260)')).toBe(true);
    expect(accentColor.test('oklch(62% 0.19 260)')).toBe(true);
    expect(accentColor.test('')).toBe(true);
    for (const value of [
      'oklch(0.62 0.19 260 / 0.8)',
      'oklch(0.1 0 0 / 0)',
      'OKLCH(0.62 0.19 260)',
    ]) {
      expect(accentColor.test(value)).toBe(false);
    }
  });
});
