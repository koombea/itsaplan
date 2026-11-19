import assert from 'node:assert/strict';
import { afterEach, it } from 'node:test';
import manifest from './manifest';

const realFetch = globalThis.fetch;
const realApiUrl = process.env.SERVICE_URL_API;

afterEach(() => {
  globalThis.fetch = realFetch;
  if (realApiUrl === undefined) delete process.env.SERVICE_URL_API;
  else process.env.SERVICE_URL_API = realApiUrl;
});

it('installs the app under the name the instance is branded with', async () => {
  process.env.SERVICE_URL_API = 'https://api.example.test';
  globalThis.fetch = (async () =>
    Response.json({ branding: { appName: 'Acme Tracker' } })) as unknown as typeof fetch;

  const result = await manifest();

  assert.equal(result.name, 'Acme Tracker');
  assert.equal(result.short_name, 'Acme Tracker');
});
