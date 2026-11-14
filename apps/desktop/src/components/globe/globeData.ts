import { useEffect, useState } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import temperatureSnapshot from './demo-temperature.json';

export const variableOptions = [
  { id: 'T2M', name: 'Air temperature' },
  { id: 'PRECTOTCORR', name: 'Precipitation' },
  { id: 'RH2M', name: 'Relative humidity' },
];

export type DataPoint = { date: string; value: number | null; quality: string };
type Series = {
  variable_id: string;
  unit: string;
  provider: string;
  representative_grid_cell: string;
  spatial_resolution: string;
  points: DataPoint[];
};
type Trend = { rate_per_decade: number | null; rate_unit: string; plain_language_verdict: string };
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
        && ['measured', 'reanalysis', 'valid', 'missing'].includes(point.quality),
    );
}

function isTrend(value: unknown): value is Trend {
  const trend = value as Partial<Trend> | null;
  return !!trend && (trend.rate_per_decade === null || Number.isFinite(trend.rate_per_decade))
    && typeof trend.rate_unit === 'string' && typeof trend.plain_language_verdict === 'string';
}

export function useLocationReport(location: LocationSelection | null, variable: string, presentation: boolean) {
  const id = locationKey(location);
  const key = id ? `${variable}:${id}` : '';
  const [report, setReport] = useState<Report>();
  const archive = variable === 'T2M' ? (temperatureSnapshot as Partial<Record<string, Series & { source: string; retrieved_at: string }>>)[id] : undefined;
  useEffect(() => {
    if (!key || !import.meta.env.DEV) return;
    const controller = new AbortController();
    const signal = () => AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
    const query = new URLSearchParams({ variable_id: variable });
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
            series = { ...payload, points: payload.points.map((point) =>
              point.quality === 'missing' ? { ...point, value: null } : point).sort((a, b) => a.date.localeCompare(b.date)) };
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
  }, [archive, id, key, presentation, variable]);

  if (!key) return undefined;
  if (archive && (report?.key !== key || (presentation && report.series !== archive) || !import.meta.env.DEV)) {
    return { key, series: archive };
  }
  if (!import.meta.env.DEV) return { key, message: 'No offline snapshot for this location and variable. Live data is available in desktop development mode.' };
  return report?.key === key ? report : { key, message: 'Loading historical data…' };
}

export function pointValue(points: DataPoint[] | undefined, date: string): number | null {
  return points?.find((point) => point.date === date)?.value ?? null;
}
