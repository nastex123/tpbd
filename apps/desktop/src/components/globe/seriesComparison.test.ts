import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { comparisonIssues, trendComparisonIssue } from './seriesComparison.ts';
import type { Series, Trend } from './globeData.ts';

const series: Series = {
  variable_id: 'T2M', unit: '°C', provider: 'NASA_POWER', representative_grid_cell: 'cell',
  spatial_resolution: '0.5°', points: [
    { date: '2000-01', value: 5, quality: 'observed' },
    { date: '2000-02', value: null, quality: 'missing' },
    { date: '2000-03', value: 6, quality: 'observed' },
  ],
};
const trend: Trend = {
  direction: 'no_significant_trend', rate_per_decade: 1, rate_unit: '°C/decade',
  method: 'Seasonal', p_value: 0.2, confidence_interval_95: [-2, 4],
  alpha: 0.05,
  plain_language_verdict: 'No significant trend', scientific_caveat: 'No causation inferred',
};

test('accepts matching metadata and period, including missing monthly values', () => {
  assert.deepEqual(comparisonIssues(series, { ...series, points: [...series.points] }), []);
  assert.equal(trendComparisonIssue(trend, { ...trend }), null);
});

test('rejects different periods, variables, units, sources, and grids', () => {
  const issues = comparisonIssues(series, {
    ...series, variable_id: 'RH2M', unit: '%', provider: 'other',
    spatial_resolution: '1°', points: series.points.slice(1),
  });
  assert.equal(issues.length, 5);
});

test('rejects unavailable data and trend methods that differ', () => {
  assert.ok(comparisonIssues(series, { ...series, points: [] }).length);
  assert.ok(trendComparisonIssue(trend, { ...trend, method: 'different' }));
  assert.ok(trendComparisonIssue(trend, { ...trend, alpha: 0.01 }));
  assert.ok(trendComparisonIssue(trend, { ...trend, direction: 'not_evaluable', rate_per_decade: null }));
});
