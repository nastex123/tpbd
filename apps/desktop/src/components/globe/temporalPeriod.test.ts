import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { periodCoverage, temporalIssues, validateRanges } from './temporalPeriod.ts';
import type { Series } from './globeData.ts';

const range = { start: 2000, end: 2000 };
const series: Series = {
  variable_id: 'T2M', unit: '°C', provider: 'NASA_POWER', representative_grid_cell: 'cell',
  spatial_resolution: '0.5°', query_coordinates: { latitude: 0, longitude: 0 },
  points: Array.from({ length: 12 }, (_, i) => ({ date: `2000-${String(i + 1).padStart(2, '0')}`, value: i, quality: 'observed' })),
};

test('validates range bounds, order, and distinct periods', () => {
  const available = { start: 1981, end: 2025 };
  assert.equal(validateRanges(range, { start: 2010, end: 2015 }, available), null);
  assert.ok(validateRanges(range, range, available));
  assert.ok(validateRanges(range, { start: 2015, end: 2010 }, available));
  assert.ok(validateRanges(range, { start: 1970, end: 1990 }, available));
});

test('requires at least 80 percent valid months and rejects duplicates', () => {
  assert.equal(periodCoverage(series, range).valid, 12);
  assert.equal(periodCoverage({ ...series, points: series.points.slice(0, 9) }, range).sufficient, false);
  assert.equal(periodCoverage({ ...series, points: [...series.points, series.points[0]] }, range).sufficient, false);
  assert.equal(periodCoverage({ ...series, points: [...series.points, { ...series.points[0], date: '2001-01' }] }, range).valid, 12);
  assert.equal(periodCoverage({ ...series, points: [...series.points, { ...series.points[0], date: 'invalid' }] }, range).sufficient, false);
});

test('rejects incompatible source, unit, resolution, and coordinates', () => {
  const other = { ...series, unit: '%', provider: 'other', spatial_resolution: '1°', representative_grid_cell: 'other cell', query_coordinates: { latitude: 1, longitude: 0 } };
  assert.equal(temporalIssues(series, other, range, range).length, 5);
  assert.deepEqual(temporalIssues(series, { ...series }, range, range), []);
});
