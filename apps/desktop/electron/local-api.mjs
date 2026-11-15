const routes = new Map([
  ['/health', 'GET'],
  ['/api/v1/regions', 'GET'],
  ['/api/v1/catalog/variables', 'GET'],
  ['/api/v1/series', 'GET'],
  ['/api/v1/analytics/trends', 'POST'],
  ['/api/v1/analytics/anomalies', 'POST'],
  ['/api/v1/analytics/changepoints', 'POST'],
  ['/api/v1/projections/scenarios', 'GET'],
  ['/api/v1/projections/models', 'GET'],
  ['/api/v1/projections/series', ['GET', 'POST']],
  ['/api/v1/ai/models', 'GET'],
  ['/api/v1/ai/investigate', 'POST'],
  ['/api/v1/ai/explain-trend', 'POST'],
  ['/api/v1/ai/audio-brief', 'POST'],
]);
const seriesParameters = new Set(['variable_id', 'region_id', 'lat', 'lon', 'start_year', 'end_year', 'offline', 'location_name']);
const projectionParameters = new Set(['variable_id', 'latitude', 'longitude', 'lat', 'lon', 'start_year', 'end_year', 'scenario', 'model']);
const limit = 2 * 1024 * 1024;

export function validateRequest(request) {
  if (!request || typeof request !== 'object' || typeof request.path !== 'string' || request.path.length > 2048) {
    throw new Error('Invalid local API request');
  }
  const url = new URL(request.path, 'http://127.0.0.1:8000');
  const allowed = routes.get(url.pathname);
  const methodMatch = Array.isArray(allowed) ? allowed.includes(request.method) : allowed === request.method;
  if (!request.path.startsWith('/') || request.path.startsWith('//')
    || url.origin !== 'http://127.0.0.1:8000' || url.hash
    || !routes.has(url.pathname) || !methodMatch) {
    throw new Error('Local API route not allowed');
  }
  if (url.pathname !== '/api/v1/series' && url.pathname !== '/api/v1/projections/series' && url.search) {
    throw new Error('Unexpected query');
  }
  if (url.pathname === '/api/v1/series') {
    const seen = new Set();
    for (const [key, value] of url.searchParams) {
      if (!seriesParameters.has(key) || seen.has(key) || value.length > 128) throw new Error('Invalid query');
      seen.add(key);
    }
  }
  if (url.pathname === '/api/v1/projections/series') {
    if (request.method === 'POST' && url.search) throw new Error('Unexpected query');
    const seen = new Set();
    for (const [key, value] of url.searchParams) {
      if (!projectionParameters.has(key) || seen.has(key) || value.length > 128) throw new Error('Invalid query');
      seen.add(key);
    }
  }
  if (request.method === 'POST') {
    if (typeof request.body !== 'string' || request.body.length > limit) throw new Error('Invalid request body');
    JSON.parse(request.body);
  } else if (request.body !== undefined) {
    throw new Error('Unexpected request body');
  }
  return url;
}

export async function requestLocalApi(request) {
  const url = validateRequest(request);
  const response = await fetch(url, {
    method: request.method,
    headers: request.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
    body: request.body,
    redirect: 'error',
    signal: AbortSignal.timeout(40000),
  });
  const reader = response.body?.getReader();
  const chunks = [];
  let size = 0;
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          throw new Error('Local API response too large');
        }
        chunks.push(value);
      }
    }
  } finally {
    reader?.releaseLock();
  }
  return { status: response.status, body: new TextDecoder().decode(Buffer.concat(chunks)) };
}
