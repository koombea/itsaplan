import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSDOM } from 'jsdom';
import { BrandingProvider } from '@/context/brandingContext';
import { DEFAULT_BRANDING } from '@/utils/branding';
import { qk } from '@/services/queryKeys';
import type { UpdateStatus } from '@/lib/api/endpoints/updates';
import SidebarBrandFooter from './SidebarBrandFooter';

const replacedGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'IS_REACT_ACT_ENVIRONMENT',
  'fetch',
] as const;
let dom: JSDOM;
let root: Root;
let client: QueryClient;
let originalGlobalDescriptors: Map<string, PropertyDescriptor | undefined>;

const status: UpdateStatus = {
  currentVersion: '1.2.3',
  latestVersion: '1.2.3',
  updateAvailable: false,
  checkedAt: '2026-01-01T00:00:00Z',
  releases: [],
};

function render(releaseHistoryEnabled: boolean) {
  // A disabled query still reads what is already in the cache, so seeding it gives
  // the component the owner's release data without a session behind it.
  client.setQueryData(qk.updateStatus, status);
  act(() =>
    root.render(
      <QueryClientProvider client={client}>
        <BrandingProvider branding={{ ...DEFAULT_BRANDING, releaseHistoryEnabled }}>
          <SidebarBrandFooter />
        </BrandingProvider>
      </QueryClientProvider>,
    ),
  );
}

beforeEach(async () => {
  originalGlobalDescriptors = new Map(
    replacedGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://example.test/' });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window },
    document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator },
    HTMLElement: { configurable: true, value: dom.window.HTMLElement },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
    fetch: { configurable: true, value: async () => Response.json({}) },
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { createRoot } = await import('react-dom/client');
  const element = document.querySelector('#root');
  assert.ok(element);
  root = createRoot(element);
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  dom.window.close();
  for (const [name, descriptor] of originalGlobalDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

describe('SidebarBrandFooter', () => {
  it('opens the release history from the footer while the instance allows it', () => {
    render(true);
    assert.ok(document.querySelector('button'));
  });

  // An operator who turns the panel off wants the footer inert, and the release data
  // is already in hand by then — so the flag has to win over having a status, or the
  // owner keeps the click everyone else never had.
  it('is not a button once the instance turns the release history off', () => {
    render(false);
    assert.equal(document.querySelector('button'), null);
  });

  it('keeps the identity and the running version with the release history off', () => {
    render(false);
    assert.match(document.body.textContent ?? '', /It's a Plan/);
    assert.match(document.body.textContent ?? '', /v1\.2\.3/);
  });
});
