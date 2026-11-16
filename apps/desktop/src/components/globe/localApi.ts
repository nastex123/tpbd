type LocalRequest = { path: string; method: 'GET' | 'POST'; body?: string };
type LocalResponse = { status: number; body: string };

declare global {
  interface Window {
    localApi?: { request: (request: LocalRequest) => Promise<LocalResponse> };
  }
}

export async function localApiFetch(path: string, options: { method?: 'GET' | 'POST'; body?: string; signal?: AbortSignal } = {}) {
  const localApi = typeof window !== 'undefined' ? window.localApi : undefined;
  if (!localApi) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
    return fetch(apiBaseUrl ? `${apiBaseUrl}${path}` : `/api/local${path}`, {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
      body: options.body,
      signal: options.signal,
    });
  }
  const signal = options.signal;
  if (signal?.aborted) throw signal.reason;
  const request = localApi.request({ path, method: options.method ?? 'GET', body: options.body });
  const result = await new Promise<LocalResponse>((resolve, reject) => {
    const abort = () => reject(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    request.then(resolve, reject).finally(() => signal?.removeEventListener('abort', abort));
    if (signal?.aborted) abort();
  });
  const body = [204, 205, 304].includes(result.status) ? null : result.body;
  return new Response(body, { status: result.status, headers: { 'Content-Type': 'application/json' } });
}
