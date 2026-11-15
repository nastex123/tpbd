import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { orderedReportPoints, validReportPointCount } from './investigationReportData.ts';
import type { DataPoint } from './globeData.ts';

test('orders report rows and preserves zero and missing values', () => {
  const points: DataPoint[] = [
    { date: '2000-02', value: null, quality: 'missing' },
    { date: '2000-01', value: 0, quality: 'observed' },
  ];
  assert.deepEqual(orderedReportPoints(points), [points[1], points[0]]);
  assert.equal(validReportPointCount(points), 1);
  assert.equal(orderedReportPoints(points)[1].value, null);
  assert.equal(orderedReportPoints(points)[0].value, 0);
});
