import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { NextIntlClientProvider } from 'next-intl';
import { BrandingProvider } from '@/context/brandingContext';
import { DEFAULT_BRANDING } from '@/utils/branding';
import common from '../../../../messages/en/common.json';
import onboarding from '../../../../messages/en/onboarding.json';

let dom: JSDOM;
let root: Root;
let originals: Map<string, PropertyDescriptor | undefined>;

beforeEach(async () => {
  dom = new JSDOM('<div id="root"></div>', {
    url: 'https://planner.test/',
    pretendToBeVisual: true,
  });
  dom.window.__ITSAPLAN_ENV__ = { apiUrl: 'http://api.test', privacyUrl: '', termsUrl: '' };
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    CustomEvent: dom.window.CustomEvent,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  originals = new Map(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, value });
  const { createRoot } = await import('react-dom/client');
  root = createRoot(document.getElementById('root')!);
});

afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

it('welcomes a person to the product under its branded name', async () => {
  const { default: OnboardingDialog } = await import('./OnboardingDialog');
  await act(async () =>
    root.render(
      <NextIntlClientProvider locale="en" messages={{ common, onboarding }} timeZone="UTC">
        <BrandingProvider branding={{ ...DEFAULT_BRANDING, appName: 'Acme Tracker' }}>
          <OnboardingDialog onClose={() => {}} />
        </BrandingProvider>
      </NextIntlClientProvider>,
    ),
  );

  const title = document.querySelector('[role="dialog"] h2');
  assert.equal(title?.textContent, 'Welcome to Acme Tracker');
});

// The tour's title names the product, which an instance renames with its branding.
it('names the product through the branded name in every language', () => {
  const messagesDir = new URL('../../../../messages/', import.meta.url);
  const locales = readdirSync(messagesDir);
  assert.ok(locales.length > 1);
  for (const locale of locales) {
    const { label } = JSON.parse(
      readFileSync(new URL(`${locale}/onboarding.json`, messagesDir), 'utf8'),
    ) as { label: string };
    assert.match(label, /\{app\}/, locale);
    assert.doesNotMatch(label, /It's a Plan/, locale);
  }
});
