import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accentForeground, safeAccentColor, safeHttpsUrl } from './branding';

describe('safeHttpsUrl', () => {
  it('accepts an absolute https url', () => {
    assert.equal(
      safeHttpsUrl('https://cdn.example.com/logo.svg'),
      'https://cdn.example.com/logo.svg',
    );
  });

  it('refuses every scheme other than https', () => {
    for (const value of [
      'http://cdn.example.com/logo.svg',
      'javascript:alert(1)',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      '//cdn.example.com/logo.svg',
      '/logo.svg',
      'cdn.example.com/logo.svg',
      '',
    ]) {
      assert.equal(safeHttpsUrl(value), null, value);
    }
  });
});

describe('safeAccentColor', () => {
  it('accepts a six-digit hex and an oklch literal', () => {
    assert.equal(safeAccentColor('#1d4ed8'), '#1d4ed8');
    assert.equal(safeAccentColor('#1D4ED8'), '#1D4ED8');
    assert.equal(safeAccentColor('oklch(0.62 0.19 260)'), 'oklch(0.62 0.19 260)');
    assert.equal(safeAccentColor('oklch(62% 0.19 260)'), 'oklch(62% 0.19 260)');
  });

  it('refuses a translucent accent, which has no foreground that holds', () => {
    for (const value of [
      'oklch(0.1 0 0 / 0)',
      'oklch(0.62 0.19 260 / 0.8)',
      'oklch(62% 0.19 260 / 50%)',
      'oklch(0.62 0.19 260 / 1)',
    ]) {
      assert.equal(safeAccentColor(value), null, value);
    }
  });

  it('refuses a function name the api would reject', () => {
    assert.equal(safeAccentColor('OKLCH(0.62 0.19 260)'), null);
    assert.equal(safeAccentColor('Oklch(0.62 0.19 260)'), null);
  });

  it('refuses anything that could close the declaration and start another', () => {
    for (const value of [
      'red',
      '#fff',
      '#12345g',
      'var(--background)',
      'url(https://evil.example.com/x)',
      'oklch(0.6 0 0); } body { display: none',
      'oklch(0.6 0 0) !important',
      '#1d4ed8;',
      'expression(alert(1))',
      '',
    ]) {
      assert.equal(safeAccentColor(value), null, value);
    }
  });
});

describe('accentForeground', () => {
  it('puts light text on a dark accent and dark text on a light one', () => {
    const light = accentForeground('#1d4ed8');
    const dark = accentForeground('#fbbf24');
    assert.notEqual(light, dark);
    assert.equal(light, accentForeground('oklch(0.45 0.19 260)'));
    assert.equal(dark, accentForeground('oklch(0.85 0.16 90)'));
  });

  it('reads the lightness of a percentage oklch the same as its fraction', () => {
    assert.equal(accentForeground('oklch(45% 0.19 260)'), accentForeground('oklch(0.45 0.19 260)'));
  });
});
