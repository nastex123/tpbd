import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { haversineDistanceKm, computeTeleconnectionDivergence, computeArcAltitude, sphericalMidpoint } from './teleconnectionComparison.ts';
import type { Trend } from './globeData.ts';

const trendIncreasing: Trend = {
  direction: 'increasing_significant',
  rate_per_decade: 1.52,
  rate_unit: '°C/decade',
  method: 'Seasonal Mann-Kendall',
  p_value: 0.001,
  alpha: 0.05,
  confidence_interval_95: [0.95, 2.1],
  plain_language_verdict: 'Statistically significant warming',
  scientific_caveat: 'Observed trend does not establish causality',
};

const trendDecreasing: Trend = {
  direction: 'decreasing_significant',
  rate_per_decade: -0.84,
  rate_unit: '°C/decade',
  method: 'Seasonal Mann-Kendall',
  p_value: 0.004,
  alpha: 0.05,
  confidence_interval_95: [-1.4, -0.2],
  plain_language_verdict: 'Statistically significant cooling',
  scientific_caveat: 'Observed trend does not establish causality',
};

const trendWeak: Trend = {
  direction: 'no_significant_trend',
  rate_per_decade: 0.15,
  rate_unit: '°C/decade',
  method: 'Seasonal Mann-Kendall',
  p_value: 0.42,
  alpha: 0.05,
  confidence_interval_95: [-0.3, 0.6],
  plain_language_verdict: 'No statistically significant trend',
  scientific_caveat: 'Sample size limits trend detection',
};

const trendNotEvaluable: Trend = {
  direction: 'not_evaluable',
  rate_per_decade: null,
  rate_unit: '°C/decade',
  method: 'Seasonal Mann-Kendall',
  p_value: null,
  alpha: 0.05,
  confidence_interval_95: null,
  plain_language_verdict: 'Not evaluable',
  scientific_caveat: 'Insufficient valid observations',
};

// Manaus (Amazon) and Svalbard (Arctic)
const coordAmazon = { lat: -3.1, lng: -60.0 };
const coordArctic = { lat: 78.2, lng: 15.6 };

test('calculates accurate Haversine distance between remote Earth coordinates', () => {
  const distance = haversineDistanceKm(coordAmazon, coordArctic);
  // Great circle distance between Manaus and Svalbard is approx 9,600 - 10,000 km
  assert.ok(distance > 9500 && distance < 10500, `Expected distance in range, got ${distance}`);
});

test('identifies opposing statistically significant trends and computes net divergence', () => {
  const divergence = computeTeleconnectionDivergence(trendIncreasing, trendDecreasing, coordAmazon, coordArctic);
  assert.equal(divergence.isOpposing, true);
  assert.equal(divergence.bothSignificant, true);
  assert.equal(divergence.divergenceType, 'opposing_significant');
  assert.equal(divergence.rateDiff, 2.36); // 1.52 - (-0.84) = 2.36
  assert.ok(divergence.distanceKm > 9000);
  assert.ok(divergence.divergenceSummary.includes('Opposing statistically significant trends'));
});

test('detects regional amplification when trends move in the same direction at distinct rates', () => {
  const divergence = computeTeleconnectionDivergence(
    trendIncreasing, // 1.52
    { ...trendIncreasing, rate_per_decade: 0.35 }, // 0.35
    coordArctic,
    coordAmazon
  );
  assert.equal(divergence.isOpposing, false);
  assert.equal(divergence.divergenceType, 'divergent_amplification');
  assert.ok(divergence.divergenceSummary.includes('Pronounced regional amplification'));
});

test('handles not evaluable or missing trends gracefully with inconclusive status', () => {
  const divergence = computeTeleconnectionDivergence(trendIncreasing, trendNotEvaluable, coordAmazon, coordArctic);
  assert.equal(divergence.divergenceType, 'inconclusive');
  assert.equal(divergence.rateDiff, null);
  assert.equal(divergence.isOpposing, false);
});

test('computes altitude that scales safely above globe curvature to prevent ground clipping', () => {
  const altShort = computeArcAltitude(coordAmazon, { lat: 11.5, lng: -72.9 }); // Manaus to Riohacha (~1,900 km)
  const altIntercontinental = computeArcAltitude(coordAmazon, coordArctic); // Manaus to Svalbard (~9,800 km)

  assert.ok(altShort >= 0.16, `Short distance altitude must clear terrain: ${altShort}`);
  assert.ok(altIntercontinental > altShort, `Long distance arc must have higher altitude: ${altIntercontinental}`);
  assert.ok(altIntercontinental <= 0.65, `Altitude should be clamped comfortably: ${altIntercontinental}`);
});

test('calculates accurate spherical midpoint for framing two remote Earth locations', () => {
  const mid = sphericalMidpoint({ lat: 0, lng: 0 }, { lat: 0, lng: 20 });
  assert.equal(mid.lat, 0);
  assert.equal(mid.lng, 10);
});
