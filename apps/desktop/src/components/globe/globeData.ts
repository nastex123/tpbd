import { useEffect, useState } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import temperatureSnapshot from './demo-temperature.json';

export const variableOptions = [
  { id: 'T2M', name: 'Air temperature', start: 1981, end: 2025, unit: '°C', description: 'Monthly average air temperature at two meters above the surface.', category: 'Atmosphere', source: 'NASA POWER · MERRA-2', community: 'AG (Agroclimatology)', resolution: '0.5° × 0.625°' },
  { id: 'RH2M', name: 'Relative humidity', start: 1981, end: 2025, unit: '%', description: 'Monthly average relative humidity of air at two meters above the surface.', category: 'Atmosphere', source: 'NASA POWER · MERRA-2', community: 'AG (Agroclimatology)', resolution: '0.5° × 0.625°' },
];

export function useVariableAvailability() {
  const [options, setOptions] = useState(variableOptions);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const controller = new AbortController();
    void fetch('/api/local/api/v1/catalog/variables', {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]),
    }).then(async (response) => {
      if (!response.ok) return;
      const catalog: unknown = await response.json();
      if (!Array.isArray(catalog) || controller.signal.aborted) return;
      setOptions(variableOptions.map((option) => {
        const entry = catalog.find((item) => item?.variable_id === option.id);
        const range = typeof entry?.temporal_range === 'string'
          ? /^(\d{4})-\d{2}\s+to\s+(\d{4})-\d{2}$/.exec(entry.temporal_range) : null;
        if (!range || entry.provider !== 'NASA_POWER'
          || typeof entry.data_community !== 'string' || !entry.data_community.startsWith('AG')
          || typeof entry.spatial_resolution !== 'string') return option;
        const start = Number(range[1]);
        const end = Math.min(Number(range[2]), 2026);
        return start >= 1981 && start <= end ? { ...option, start, end, resolution: entry.spatial_resolution, community: entry.data_community } : option;
      }));
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  return options;
}

export type DataPoint = { date: string; value: number | null; quality: string };
export type Series = {
  variable_id: string;
  unit: string;
  provider: string;
  representative_grid_cell: string;
  spatial_resolution: string;
  points: DataPoint[];
  query_coordinates?: { latitude: number; longitude: number };
  is_cached?: boolean;
};
export type Trend = {
  direction: 'increasing_significant' | 'decreasing_significant' | 'no_significant_trend' | 'not_evaluable';
  rate_per_decade: number | null;
  rate_unit: string;
  method: string;
  p_value: number | null;
  confidence_interval_95: number[] | null;
  plain_language_verdict: string;
  scientific_caveat: string;
};
type Report = { key: string; series?: Series; trend?: Trend; message?: string };

export function locationKey(location: LocationSelection | null) {
  if (!location) return '';
  return location.kind === 'region' ? location.id : `${location.lat},${location.lng}`;
}

function isSeries(value: unknown): value is Series {
  const series = value as Partial<Series> | null;
  return !!series && typeof series.variable_id === 'string' && typeof series.unit === 'string'
    && typeof series.provider === 'string' && Array.isArray(series.points) && series.points.every(
      (point) => point && /^\d{4}-(0[1-9]|1[0-2])$/.test(point.date)
        && (point.value === null || Number.isFinite(point.value))
        && ['observed', 'measured', 'reanalysis', 'valid', 'missing'].includes(point.quality),
    );
}

function isTrend(value: unknown): value is Trend {
  const trend = value as Partial<Trend> | null;
  return !!trend && (trend.rate_per_decade === null || Number.isFinite(trend.rate_per_decade))
    && ['increasing_significant', 'decreasing_significant', 'no_significant_trend', 'not_evaluable'].includes(trend.direction ?? '')
    && typeof trend.rate_unit === 'string' && typeof trend.method === 'string'
    && (trend.p_value === null || Number.isFinite(trend.p_value))
    && (trend.confidence_interval_95 === null || (Array.isArray(trend.confidence_interval_95)
      && trend.confidence_interval_95.length === 2 && trend.confidence_interval_95.every(Number.isFinite)))
    && typeof trend.plain_language_verdict === 'string' && typeof trend.scientific_caveat === 'string';
}

export function useLocationReport(location: LocationSelection | null, variable: string, presentation: boolean, startYear: number, endYear: number) {
  const id = locationKey(location);
  const key = id ? `${variable}:${id}:${startYear}:${endYear}` : '';
  const [report, setReport] = useState<Report>();
  const snapshot = variable === 'T2M' ? (temperatureSnapshot as Partial<Record<string, Series & { source: string; retrieved_at: string }>>)[id] : undefined;
  const archive = snapshot && { ...snapshot, points: snapshot.points.filter(({ date }) => Number(date.slice(0, 4)) >= startYear && Number(date.slice(0, 4)) <= endYear) };
  useEffect(() => {
    if (!key || !import.meta.env.DEV) return;
    const controller = new AbortController();
    const signal = () => AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
    const query = new URLSearchParams({ variable_id: variable, start_year: String(startYear), end_year: String(endYear) });
    if (id.includes(',')) {
      const [lat, lng] = id.split(',');
      query.set('lat', lat);
      query.set('lon', lng);
    } else {
      query.set('region_id', id);
    }

    async function load() {
      let series: Series | undefined = archive;
      try {
        if (!presentation || !archive) {
          try {
            const response = await fetch(`/api/local/api/v1/series?${query}`, { signal: signal() });
            if (!response.ok) throw new Error('Series unavailable');
            const payload: unknown = await response.json();
            if (!isSeries(payload) || payload.variable_id !== variable) throw new Error('Invalid series');
            series = { ...payload, points: payload.points
              .filter(({ date }) => Number(date.slice(0, 4)) >= startYear && Number(date.slice(0, 4)) <= endYear)
              .map((point) => point.quality === 'missing' ? { ...point, value: null } : point)
              .sort((a, b) => a.date.localeCompare(b.date)) };
          } catch (error) {
            if (!archive) throw error;
          }
        }
        if (controller.signal.aborted) return;
        if (!series) throw new Error('Series unavailable');
        setReport({ key, series });
        if (!series.points.some(({ value }) => value !== null)) return;

        const trendResponse = await fetch('/api/local/api/v1/analytics/trends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variable_id: variable, points: series.points }),
          signal: signal(),
        });
        if (!trendResponse.ok) return;
        const trend: unknown = await trendResponse.json();
        if (isTrend(trend) && !controller.signal.aborted) setReport({ key, series, trend });
      } catch {
        if (!controller.signal.aborted) setReport((current) => current?.key === key && current.series
          ? current : { key, message: 'Historical data could not be loaded. Check the local API.' });
      }
    }
    void load();
    return () => controller.abort();
  }, [snapshot, id, key, presentation, variable, startYear, endYear]);

  if (!key) return undefined;
  if (archive && (report?.key !== key || !import.meta.env.DEV)) {
    return { key, series: archive };
  }
  if (!import.meta.env.DEV) return { key, message: 'No offline snapshot for this location and variable. Live data is available in desktop development mode.' };
  return report?.key === key ? report : { key, message: 'Loading historical data…' };
}

export function pointValue(points: DataPoint[] | undefined, date: string): number | null {
  return points?.find((point) => point.date === date)?.value ?? null;
}
