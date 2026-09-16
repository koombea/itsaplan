import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { BrandingProvider } from '@/context/brandingContext';
import { DEFAULT_BRANDING } from '@/utils/branding';
import { APP_SITE_URL } from '@/utils/app';
import PublicShareHeader from './PublicShareHeader';

const replacedGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'IS_REACT_ACT_ENVIRONMENT',
] as const;
let dom: JSDOM;
let root: Root;
let originalGlobalDescriptors: Map<string, PropertyDescriptor | undefined>;

function render(siteUrl: string) {
  act(() =>
    root.render(
      <BrandingProvider branding={{ ...DEFAULT_BRANDING, siteUrl }}>
        <PublicShareHeader name="Website" ticker="WEB-1" />
      </BrandingProvider>,
    ),
  );
}

beforeEach(async () => {
  originalGlobalDescriptors = new Map(
    replacedGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: 'https://example.test/share/abc',
  });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window },
    document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator },
    HTMLElement: { configurable: true, value: dom.window.HTMLElement },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const { createRoot } = await import('react-dom/client');
  const element = document.querySelector('#root');
  assert.ok(element);
  root = createRoot(element);
});

afterEach(() => {
  act(() => root.unmount());
  dom.window.close();
  for (const [name, descriptor] of originalGlobalDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

describe('PublicShareHeader', () => {
  it('links the mark at the site the instance configured', () => {
    render('https://plan.example.com/');
    assert.equal(document.querySelector('a')?.getAttribute('href'), 'https://plan.example.com/');
  });

  // This page is served without a session, so the href is the one branding value a
  // visitor reaches with no account behind it. A row written straight into app_setting
  // never passed the api schema, and a `javascript:` href runs on click.
  it('falls back to the built-in site for a value the api would not have stored', () => {
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '//evil.example.com',
      '',
    ]) {
      render(value);
      assert.equal(document.querySelector('a')?.getAttribute('href'), APP_SITE_URL, value);
    }
  });
});
