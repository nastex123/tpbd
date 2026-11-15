import type { DataPoint, Trend } from './globeData';

function monthIndex(date: string) {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
}

export function trendLine(points: DataPoint[], trend?: Trend) {
  if (!trend || trend.direction === 'not_evaluable' || trend.rate_per_decade === null
    || !Number.isFinite(trend.rate_per_decade)) return null;
  const valid = points.filter((point): point is DataPoint & { value: number } =>
    point.value !== null && Number.isFinite(point.value)).sort((a, b) => a.date.localeCompare(b.date));
  if (valid.length < 2) return null;
  const start = monthIndex(valid[0].date);
  const end = monthIndex(valid[valid.length - 1].date);
  if (start === end) return null;
  const slope = trend.rate_per_decade / 120;
  const residuals = valid.map(({ date, value }) => value - slope * (monthIndex(date) - start))
    .sort((a, b) => a - b);
  const middle = Math.floor(residuals.length / 2);
  const intercept = residuals.length % 2 ? residuals[middle] : (residuals[middle - 1] + residuals[middle]) / 2;
  return { startDate: valid[0].date, endDate: valid[valid.length - 1].date, start: intercept, end: intercept + slope * (end - start) };
}
