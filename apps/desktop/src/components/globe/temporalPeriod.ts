import type { Series } from './globeData';

export type YearRange = { start: number; end: number };

export function validateRanges(a: YearRange, b: YearRange, available: YearRange): string | null {
  for (const range of [a, b]) {
    if (!Number.isInteger(range.start) || !Number.isInteger(range.end)
      || range.start < available.start || range.end > available.end || range.start > range.end) {
      return `Each period must have a start and end within ${available.start}–${available.end}.`;
    }
  }
  if (a.start === b.start && a.end === b.end) return 'Choose two different periods.';
  return null;
}

export function periodCoverage(series: Series, range: YearRange) {
  const expected = (range.end - range.start + 1) * 12;
  const dates = new Set<string>();
  let valid = 0;
  let invalid = false;
  for (const point of series.points) {
    const year = Number(point.date.slice(0, 4));
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(point.date) || year < range.start || year > range.end || dates.has(point.date)) invalid = true;
    dates.add(point.date);
    if (year >= range.start && year <= range.end && point.value !== null && Number.isFinite(point.value)) valid += 1;
  }
  return { expected, valid, invalid, sufficient: !invalid && valid / expected >= 0.8 };
}

export function temporalIssues(a: Series, b: Series, rangeA: YearRange, rangeB: YearRange): string[] {
  const issues: string[] = [];
  if (a.variable_id !== b.variable_id) issues.push('Variables differ');
  if (!a.unit || a.unit !== b.unit) issues.push('Units differ or are missing');
  if (!a.provider || a.provider !== b.provider) issues.push('Sources differ or are missing');
  if (!a.spatial_resolution || a.spatial_resolution !== b.spatial_resolution) issues.push('Spatial resolutions differ or are missing');
  if (a.query_coordinates && b.query_coordinates
    && (a.query_coordinates.latitude !== b.query_coordinates.latitude || a.query_coordinates.longitude !== b.query_coordinates.longitude)) {
    issues.push('Requested locations differ');
  }
  if (a.representative_grid_cell && b.representative_grid_cell
    && a.representative_grid_cell !== b.representative_grid_cell) issues.push('Representative grid cells differ');
  if (!periodCoverage(a, rangeA).sufficient || !periodCoverage(b, rangeB).sufficient) {
    issues.push('At least one period has duplicate dates, dates outside the range, or less than 80% valid monthly coverage');
  }
  return issues;
}
