import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { requestLocalApi, validateRequest } from './local-api.mjs';

test('allows only expected local API requests', () => {
  assert.equal(validateRequest({ path: '/health', method: 'GET' }).href, 'http://127.0.0.1:8000/health');
  assert.equal(validateRequest({ path: '/api/v1/series?variable_id=T2M&lat=0&lon=0', method: 'GET' }).pathname, '/api/v1/series');
  assert.equal(validateRequest({ path: '/api/v1/analytics/trends', method: 'POST', body: '{}' }).pathname, '/api/v1/analytics/trends');
  assert.equal(validateRequest({ path: '/api/v1/analytics/anomalies', method: 'POST', body: '{"variable_id":"T2M"}' }).pathname, '/api/v1/analytics/anomalies');
  assert.equal(validateRequest({ path: '/api/v1/analytics/changepoints', method: 'POST', body: '{"variable_id":"T2M"}' }).pathname, '/api/v1/analytics/changepoints');
  assert.equal(validateRequest({ path: '/api/v1/projections/scenarios', method: 'GET' }).pathname, '/api/v1/projections/scenarios');
  assert.equal(validateRequest({ path: '/api/v1/projections/models', method: 'GET' }).pathname, '/api/v1/projections/models');
  assert.equal(validateRequest({ path: '/api/v1/projections/series?variable_id=T2M&latitude=0&longitude=0&scenario=ssp245', method: 'GET' }).pathname, '/api/v1/projections/series');
  assert.equal(validateRequest({ path: '/api/v1/projections/series?variable_id=T2M&latitude=0&longitude=0&scenario=ssp245&model=ec_earth3', method: 'GET' }).pathname, '/api/v1/projections/series');
  assert.equal(validateRequest({ path: '/api/v1/projections/series', method: 'POST', body: '{"variable_id":"T2M"}' }).pathname, '/api/v1/projections/series');
  for (const request of [
    { path: '//example.com/health', method: 'GET' },
    { path: 'http://127.0.0.1:8000/health', method: 'GET' },
    { path: '/api/v1/series?variable_id=T2M&variable_id=RH2M', method: 'GET' },
    { path: '/api/v1/series?url=http://example.com', method: 'GET' },
    { path: '/api/v1/analytics/trends', method: 'GET' },
    { path: '/api/v1/analytics/anomalies', method: 'GET' },
    { path: '/api/v1/analytics/anomalies?query=1', method: 'POST', body: '{}' },
    { path: '/api/v1/analytics/changepoints', method: 'GET' },
    { path: '/api/v1/analytics/changepoints?query=1', method: 'POST', body: '{}' },
    { path: '/api/v1/projections/scenarios?query=1', method: 'GET' },
    { path: '/api/v1/projections/scenarios', method: 'POST', body: '{}' },
    { path: '/api/v1/projections/models?query=1', method: 'GET' },
    { path: '/api/v1/projections/models', method: 'POST', body: '{}' },
    { path: '/api/v1/projections/series?invalid=1', method: 'GET' },
    { path: '/api/v1/projections/series?scenario=ssp245&scenario=ssp585', method: 'GET' },
    { path: '/api/v1/projections/series?scenario=ssp245&model=invalid%20model', method: 'GET' },
    { path: '/api/v1/projections/series?scenario=ssp245&model=../secret', method: 'GET' },
    { path: '/api/v1/projections/series?scenario=ssp245', method: 'POST', body: '{}' },
    { path: '/api/v1/projections/series', method: 'POST', body: 'invalid-json' },
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
