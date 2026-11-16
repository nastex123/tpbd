import { useEffect, useState } from 'react';
import type { Series, Trend } from './globeData';
import { localApiFetch } from './localApi';

export type Explanation = {
  executive_summary: string;
  mechanisms_and_drivers: string;
  scientific_uncertainty: string;
  recommended_next_steps: string[];
  model_used: string;
};

// Global persistent in-memory cache to prevent duplicate Gemini API calls and token waste
export const explanationCache = new Map<string, Explanation>();
const explanationInFlight = new Map<string, Promise<Explanation>>();

export function getExplanationCacheKey(variableId: string, location: string, direction?: string, rate?: number | null, pVal?: number | null): string {
  return `${variableId}:${location}:${direction ?? ''}:${rate ?? ''}:${pVal ?? ''}`;
}

/**
 * Prefetches or retrieves from cache an AI explanation in the background.
 * Guarantees zero duplicate network requests when opening/closing modals.
 */
export async function prefetchExplanation(location: string, series: Series, trend: Trend): Promise<Explanation | null> {
  if (trend.direction === 'not_evaluable' || trend.rate_per_decade === null || trend.p_value === null) {
    return null;
  }
  const cacheKey = getExplanationCacheKey(series.variable_id, location, trend.direction, trend.rate_per_decade, trend.p_value);
  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey)!;
  }
  if (explanationInFlight.has(cacheKey)) {
    return explanationInFlight.get(cacheKey)!;
  }

  const payload = {
    variable_id: series.variable_id,
    location_name: location,
    direction: trend.direction,
    rate_per_decade: trend.rate_per_decade,
    rate_unit: trend.rate_unit,
    p_value: trend.p_value,
  };

  const promise = (async () => {
    try {
      const response = await localApiFetch('/api/v1/ai/explain-trend', {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error('Explanation service unavailable');
      const result: unknown = await response.json();
      if (!isExplanation(result)) throw new Error('Invalid explanation response');
      explanationCache.set(cacheKey, result);
      return result;
    } finally {
      explanationInFlight.delete(cacheKey);
    }
  })();

  explanationInFlight.set(cacheKey, promise);
  return promise;
}

function isExplanation(value: unknown): value is Explanation {
  const item = value as Partial<Explanation> | null;
  return !!item && typeof item.executive_summary === 'string'
    && typeof item.mechanisms_and_drivers === 'string'
    && typeof item.scientific_uncertainty === 'string'
    && Array.isArray(item.recommended_next_steps)
    && item.recommended_next_steps.every((step) => typeof step === 'string')
    && typeof item.model_used === 'string';
}

export function ScientificExplanation({ location, series, trend }: { location: string; series: Series; trend?: Trend }) {
  const isEvaluable = trend && trend.direction !== 'not_evaluable'
    && trend.rate_per_decade !== null && trend.p_value !== null;
  const cacheKey = isEvaluable && trend
    ? getExplanationCacheKey(series.variable_id, location, trend.direction, trend.rate_per_decade, trend.p_value)
    : '';

  const [explanation, setExplanation] = useState<Explanation | null>(() => {
    return cacheKey && explanationCache.has(cacheKey) ? explanationCache.get(cacheKey)! : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEvaluable || !trend || !cacheKey) {
      setExplanation(null);
      setError(null);
      setLoading(false);
      return;
    }

    // If already cached, restore immediately with zero network latency and zero tokens
    if (explanationCache.has(cacheKey)) {
      setExplanation(explanationCache.get(cacheKey)!);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    prefetchExplanation(location, series, trend)
      .then((res) => {
        if (active && res) {
          setExplanation(res);
        }
      })
      .catch(() => {
        if (active) {
          setExplanation(null);
          setError('Scientific explanation is unavailable. The trend results above remain available.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cacheKey, isEvaluable, location, series, trend]);

  if (!isEvaluable || !trend) return null;
  const first = series.points[0]?.date;
  const last = series.points.at(-1)?.date;
  const providerUrl = series.provider === 'NASA_POWER' ? 'https://power.larc.nasa.gov/' : null;
  return <section className="scientific-explanation" aria-label="Scientific explanation" aria-live="polite">
    <h4>Scientific interpretation</h4>
    {loading && <p role="status">Preparing a data-grounded explanation…</p>}
    {error && <p role="status">{error}</p>}
    {explanation && <>
      <p>{explanation.executive_summary}</p>
      <h5>Possible physical context</h5>
      <p>{explanation.mechanisms_and_drivers}</p>
      <h5>Uncertainty and limitations</h5>
      <p>{explanation.scientific_uncertainty}</p>
      <h5>Suggested next steps</h5>
      <ul>{explanation.recommended_next_steps.map((step) => <li key={step}>{step}</li>)}</ul>
      <p className="explanation-model">Generated with {explanation.model_used}</p>
    </>}
    <details>
      <summary>Data provenance and method</summary>
      <p>
        {providerUrl ? <a href={providerUrl} target="_blank" rel="noreferrer">{series.provider}</a> : series.provider}
        {' · '}{series.variable_id} · {series.unit}{first && last ? ` · ${first} to ${last}` : ''}
      </p>
      <p>{series.representative_grid_cell} · {series.spatial_resolution} · {trend.method} · {series.points.filter(({ value }) => value !== null).length} valid monthly observations.</p>
      <p>The trend and source metadata are observations/reanalysis context. Suggested mechanisms are hypotheses and do not establish causation.</p>
    </details>
  </section>;
}
