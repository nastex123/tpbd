import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fetchProjectionScenarios, fetchProjectionModels, fetchProjectionSeries } from './projectionData.ts';

test('fetchProjectionScenarios parses valid scenario items and fills radiative forcing metrics', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), '/api/local/api/v1/projections/scenarios');
    return new Response(JSON.stringify({
      scenarios: [
        { scenario: 'ssp126', name: 'SSP1-2.6', description: 'Sustainable development' },
        { scenario: 'ssp245', name: 'SSP2-4.5', description: 'Middle of the road' },
        { scenario: 'ssp370', name: 'SSP3-7.0', description: 'Regional rivalry' },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const list = await fetchProjectionScenarios();
    assert.equal(list.length, 3);
    assert.equal(list[0].scenario, 'ssp126');
    assert.equal(list[0].radiative_forcing_w_m2, 2.6);
    assert.equal(list[0].target_year, 2100);
    assert.equal(list[1].scenario, 'ssp245');
    assert.equal(list[1].radiative_forcing_w_m2, 4.5);
    assert.equal(list[2].scenario, 'ssp370');
    assert.equal(list[2].radiative_forcing_w_m2, 7.0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchProjectionScenarios throws cleanly when endpoint responds with error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Internal Server Error', { status: 500 });

  try {
    await assert.rejects(
      async () => fetchProjectionScenarios(),
      /Failed to load projection scenarios \(500\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchProjectionModels parses model identifiers and applies known institution metadata', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), '/api/local/api/v1/projections/models');
    return new Response(JSON.stringify({
      models: ['ensemble', 'cesm2', 'ec_earth3'],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const models = await fetchProjectionModels();
    assert.equal(models.length, 3);
    assert.equal(models[0].model_id, 'ensemble');
    assert.equal(models[0].is_default, true);
    assert.equal(models[1].model_id, 'cesm2');
    assert.equal(models[1].institution, 'NCAR (USA)');
    assert.equal(models[1].is_default, false);
    assert.equal(models[2].model_id, 'ec_earth3');
    assert.equal(models[2].institution, 'EC-Earth Consortium (Europe)');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchProjectionModels throws cleanly on HTTP failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Bad Gateway', { status: 502 });

  try {
    await assert.rejects(
      async () => fetchProjectionModels(),
      /Failed to load projection models \(502\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchProjectionSeries sends GET query and parses points with years and months', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl: string | undefined;
  globalThis.fetch = async (url, options) => {
    requestedUrl = String(url);
    assert.equal(options?.method, 'GET');
    return new Response(JSON.stringify({
      variable_id: 'T2M',
      scenario: 'ssp245',
      model: 'ensemble',
      unit: '°C',
      source: 'NASA POWER Projection API / NEX-GDDP-CMIP6',
      location_name: 'Manaus, Brazil',
      points: [
        { date: '2050-01', value: 28.5 },
        { date: '2050-02', value: 29.1 },
        { date: '2050-03', value: null },
      ],
      caveat: 'Conditional scenario',
      uncertainty_note: 'Point estimate',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const result = await fetchProjectionSeries({
      variableId: 'T2M',
      lat: -3.1,
      lon: -60.0,
      scenario: 'ssp245',
      model: 'ensemble',
      startYear: 2050,
      endYear: 2055,
    });

    assert.ok(requestedUrl);
    const urlObj = new URL(requestedUrl!, 'http://localhost');
    assert.equal(urlObj.pathname, '/api/local/api/v1/projections/series');
    assert.equal(urlObj.searchParams.get('variable_id'), 'T2M');
    assert.equal(urlObj.searchParams.get('latitude'), '-3.1');
    assert.equal(urlObj.searchParams.get('longitude'), '-60');
    assert.equal(urlObj.searchParams.get('scenario'), 'ssp245');
    assert.equal(urlObj.searchParams.get('model'), 'ensemble');
    assert.equal(urlObj.searchParams.get('start_year'), '2050');
    assert.equal(urlObj.searchParams.get('end_year'), '2055');

    assert.equal(result.variable_id, 'T2M');
    assert.equal(result.scenario, 'ssp245');
    assert.equal(result.source, 'NASA POWER Projection API / NEX-GDDP-CMIP6');
    assert.equal(result.location_name, 'Manaus, Brazil');
    assert.equal(result.points.length, 3);
    assert.equal(result.points[0].year, 2050);
    assert.equal(result.points[0].month, 1);
    assert.equal(result.points[0].value, 28.5);
    assert.equal(result.points[0].unit, '°C');
    assert.equal(result.points[2].value, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchProjectionSeries throws cleanly on API error without generating synthetic points', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Unprocessable Entity', { status: 422 });

  try {
    await assert.rejects(
      async () => fetchProjectionSeries({
        variableId: 'T2M',
        lat: 0,
        lon: 0,
        scenario: 'ssp126',
      }),
      /Failed to load projection series \(422\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
