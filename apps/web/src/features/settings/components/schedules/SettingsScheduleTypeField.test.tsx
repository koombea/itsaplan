import assert from 'node:assert/strict';
import { afterEach, beforeEach, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { NextIntlClientProvider } from 'next-intl';
import settings from '../../../../../messages/en/settings.json';

let dom: JSDOM;
let root: Root;
let originals: Map<string, PropertyDescriptor | undefined>;

beforeEach(async () => {
  dom = new JSDOM('<div id="root"></div>', {
    url: 'https://planner.test/',
    pretendToBeVisual: true,
  });
  const proto = dom.window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.scrollIntoView = () => {};
  proto.hasPointerCapture = () => false;
  proto.releasePointerCapture = () => {};
  // The Select reaches for DOM classes all over its portal and its native mirror.
  const domClasses = Object.fromEntries(
    Object.getOwnPropertyNames(dom.window)
      .filter((name) => /^(HTML|SVG|Document|Text)\w*$|Event$/.test(name))
      .map((name) => [name, (dom.window as unknown as Record<string, unknown>)[name]]),
  );
  const globals = {
    ...domClasses,
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    Element: dom.window.Element,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
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

// This instance is its own edition: the types offered are the ones it runs.
it('offers only the schedule types this instance runs', async () => {
  const { SettingsScheduleTypeField } = await import('./SettingsScheduleTypeField');
  await act(async () =>
    root.render(
      <NextIntlClientProvider locale="en" messages={{ settings }} timeZone="UTC">
        <SettingsScheduleTypeField value="cron" onChange={() => {}} />
      </NextIntlClientProvider>,
    ),
  );
  const trigger = document.querySelector<HTMLElement>('[role="combobox"]')!;
  await act(async () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });

  const options = [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent);
  assert.deepEqual(options, [settings.schedules.types.cron, settings.schedules.types.status]);
});
