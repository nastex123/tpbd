import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { trendLine } from './trendLine.ts';
import type { Trend } from './globeData.ts';

const trend: Trend = {
  direction: 'increasing_significant',
  rate_per_decade: 12,
  rate_unit: '°C/decade',
  method: 'Sen slope',
  p_value: 0.01,
  confidence_interval_95: [5, 19],
  plain_language_verdict: 'Increasing',
  scientific_caveat: 'No causal inference',
};

test('uses calendar months and ignores missing points for the intercept', () => {
  const line = trendLine([
    { date: '2010-01', value: 10, quality: 'observed' },
    { date: '2010-06', value: null, quality: 'missing' },
    { date: '2011-01', value: 11.2, quality: 'observed' },
  ], trend);
  assert.ok(line);
  assert.equal(line.startDate, '2010-01');
  assert.equal(line.endDate, '2011-01');
  assert.ok(Math.abs(line.start - 10) < 1e-10);
  assert.ok(Math.abs(line.end - 11.2) < 1e-10);
});

test('does not draw an unevaluable result or a series with fewer than two observations', () => {
  const one = [{ date: '2010-01', value: 10, quality: 'observed' }];
  assert.equal(trendLine(one, trend), null);
  assert.equal(trendLine([...one, { date: '2011-01', value: 11, quality: 'observed' }], { ...trend, direction: 'not_evaluable' }), null);
});
