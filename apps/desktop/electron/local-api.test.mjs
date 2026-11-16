import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { requestLocalApi, validateRequest } from './local-api.mjs';

test('allows only expected local API requests', () => {
  assert.equal(validateRequest({ path: '/health', method: 'GET' }).href, 'http://127.0.0.1:8000/health');
  assert.equal(validateRequest({ path: '/api/v1/series?variable_id=T2M&lat=0&lon=0', method: 'GET' }).pathname, '/api/v1/series');
  assert.equal(validateRequest({ path: '/api/v1/analytics/trends', method: 'POST', body: '{}' }).pathname, '/api/v1/analytics/trends');
  for (const request of [
    { path: '//example.com/health', method: 'GET' },
    { path: 'http://127.0.0.1:8000/health', method: 'GET' },
    { path: '/api/v1/series?variable_id=T2M&variable_id=RH2M', method: 'GET' },
    { path: '/api/v1/series?url=http://example.com', method: 'GET' },
    { path: '/api/v1/analytics/trends', method: 'GET' },
    { path: '/api/v1/integrations/appeears/auth/login', method: 'POST', body: '{}' },
    { path: '/health', method: 'GET', body: '{}' },
  ]) assert.throws(() => validateRequest(request));
});

test('forwards status and JSON from the local API', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, 'http://127.0.0.1:8000/health');
    assert.equal(options.redirect, 'error');
    return new Response('{"status":"ok"}', { status: 200 });
  };
  try {
    assert.deepEqual(await requestLocalApi({ path: '/health', method: 'GET' }), {
      status: 200, body: '{"status":"ok"}',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects responses that exceed the size limit', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('x'.repeat(2 * 1024 * 1024 + 1));
  try {
    await assert.rejects(requestLocalApi({ path: '/health', method: 'GET' }), /too large/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
