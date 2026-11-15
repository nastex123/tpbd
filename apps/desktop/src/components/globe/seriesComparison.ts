import type { Series, Trend } from './globeData';

export function comparisonIssues(a: Series, b: Series): string[] {
  const issues: string[] = [];
  if (a.variable_id !== b.variable_id) issues.push('Different variables');
  if (!a.unit || !b.unit || a.unit !== b.unit) issues.push('Different or unspecified units');
  if (!a.provider || !b.provider || a.provider !== b.provider) issues.push('Different or unspecified sources');
  if (!a.spatial_resolution || !b.spatial_resolution || a.spatial_resolution !== b.spatial_resolution) {
    issues.push('Different or unspecified spatial resolutions');
  }
  const datesA = a.points.map(({ date }) => date).sort();
  const datesB = b.points.map(({ date }) => date).sort();
  if (!datesA.length || !datesB.length || datesA[0] !== datesB[0] || datesA.at(-1) !== datesB.at(-1)) {
    issues.push('Different or unavailable time periods');
  }
  if (new Set(datesA).size !== datesA.length || new Set(datesB).size !== datesB.length) {
    issues.push('Duplicate monthly dates');
  }
  if (!a.points.some(({ value }) => value !== null) || !b.points.some(({ value }) => value !== null)) {
    issues.push('One or both series have no valid values');
  }
  return issues;
}

export function trendComparisonIssue(a?: Trend, b?: Trend): string | null {
  if (!a || !b) return 'Both trend analyses are needed for a comparison.';
  if (a.direction === 'not_evaluable' || b.direction === 'not_evaluable'
    || a.rate_per_decade === null || b.rate_per_decade === null) {
    return 'At least one trend is not evaluable.';
  }
  if (a.method !== b.method || a.rate_unit !== b.rate_unit || a.alpha !== b.alpha) {
    return 'The trend methods, significance thresholds, or rate units differ.';
  }
  return null;
}
