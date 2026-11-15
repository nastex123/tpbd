import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getScenarioMetadata,
  calculateProjectionMetrics,
  MANDATORY_PROJECTION_CAVEAT,
  CMIP6_SUPPORTED_VARIABLES,
  SCENARIO_METADATA_MAP,
  type SSPScenario,
} from './cmip6Projections.ts';

test('scenario metadata mapping for ssp126, ssp245, and ssp370', () => {
  const ssp126 = getScenarioMetadata('ssp126');
  assert.equal(ssp126.scenario, 'ssp126');
  assert.equal(ssp126.badgeLabel, 'SSP1-2.6 · Low (+2.6 W/m²)');
  assert.equal(ssp126.radiativeForcing, 2.6);
  assert.equal(ssp126.category, 'low');

  const ssp245 = getScenarioMetadata('ssp245');
  assert.equal(ssp245.scenario, 'ssp245');
  assert.equal(ssp245.badgeLabel, 'SSP2-4.5 · Medium (+4.5 W/m²)');
  assert.equal(ssp245.radiativeForcing, 4.5);
  assert.equal(ssp245.category, 'medium');

  const ssp370 = getScenarioMetadata('ssp370');
  assert.equal(ssp370.scenario, 'ssp370');
  assert.equal(ssp370.badgeLabel, 'SSP3-7.0 · High (+7.0 W/m²)');
  assert.equal(ssp370.radiativeForcing, 7.0);
  assert.equal(ssp370.category, 'high');

  // Verify all 3 keys are present in map
  const keys: SSPScenario[] = ['ssp126', 'ssp245', 'ssp370'];
  for (const k of keys) {
    assert.ok(SCENARIO_METADATA_MAP[k]);
  }
});

test('scenario metadata fallback defaults safely to ssp245', () => {
  // @ts-expect-error test invalid scenario
  const fallback = getScenarioMetadata('ssp999');
  assert.equal(fallback.scenario, 'ssp245');
  assert.equal(fallback.badgeLabel, 'SSP2-4.5 · Medium (+4.5 W/m²)');
});

test('calculateProjectionMetrics computes baseline, end-of-century, and delta correctly', () => {
  const projectionPoints = [
    // Baseline points (2015-2025)
    { date: '2015-01', value: 20.0, year: 2015 },
    { date: '2020-06', value: 22.0, year: 2020 },
    { date: '2025-12', value: 24.0, year: 2025 },
    // Intermediate point (outside baseline and end-of-century)
    { date: '2050-06', value: 25.0, year: 2050 },
    // End-of-Century points (2090-2100)
    { date: '2090-01', value: 26.0, year: 2090 },
    { date: '2095-06', value: 27.0, year: 2095 },
    { date: '2100-12', value: 28.0, year: 2100 },
  ];

  const metrics = calculateProjectionMetrics(projectionPoints);

  // Baseline mean: (20 + 22 + 24) / 3 = 22.0
  assert.equal(metrics.baselineMean, 22.0);
  assert.equal(metrics.baselinePointsCount, 3);

  // End-of-Century mean: (26 + 27 + 28) / 3 = 27.0
  assert.equal(metrics.endOfCenturyMean, 27.0);
  assert.equal(metrics.endOfCenturyPointsCount, 3);

  // Delta: 27.0 - 22.0 = +5.0
  assert.equal(metrics.delta, 5.0);
});

test('calculateProjectionMetrics uses historical fallback for baseline if projection has none', () => {
  // Projection points only in 2050-2100
  const projectionPoints = [
    { date: '2050-06', value: 25.0, year: 2050 },
    { date: '2095-06', value: 30.0, year: 2095 },
    { date: '2100-12', value: 32.0, year: 2100 },
  ];

  const historicalPoints = [
    { date: '2015-01', value: 20.0 },
    { date: '2020-01', value: 22.0 },
  ];

  const metrics = calculateProjectionMetrics(projectionPoints, historicalPoints);

  assert.equal(metrics.baselineMean, 21.0);
  assert.equal(metrics.endOfCenturyMean, 31.0);
  assert.equal(metrics.delta, 10.0);
});

test('calculateProjectionMetrics handles null points and empty inputs gracefully', () => {
  // Null and empty checks
  assert.deepEqual(calculateProjectionMetrics(null), {
    baselineMean: null,
    endOfCenturyMean: null,
    delta: null,
    baselinePointsCount: 0,
    endOfCenturyPointsCount: 0,
  });

  assert.deepEqual(calculateProjectionMetrics([]), {
    baselineMean: null,
    endOfCenturyMean: null,
    delta: null,
    baselinePointsCount: 0,
    endOfCenturyPointsCount: 0,
  });

  // Points with all null values
  const allNullPoints = [
    { date: '2015-01', value: null, year: 2015 },
    { date: '2090-01', value: null, year: 2090 },
  ];
  const nullMetrics = calculateProjectionMetrics(allNullPoints);
  assert.equal(nullMetrics.baselineMean, null);
  assert.equal(nullMetrics.endOfCenturyMean, null);
  assert.equal(nullMetrics.delta, null);

  // Only baseline exists, no end-of-century
  const onlyBaseline = [
    { date: '2018-01', value: 15.5, year: 2018 },
  ];
  const onlyBaseMetrics = calculateProjectionMetrics(onlyBaseline);
  assert.equal(onlyBaseMetrics.baselineMean, 15.5);
  assert.equal(onlyBaseMetrics.endOfCenturyMean, null);
  assert.equal(onlyBaseMetrics.delta, null);

  // Only end-of-century exists, no baseline
  const onlyEnd = [
    { date: '2095-01', value: 18.5, year: 2095 },
  ];
  const onlyEndMetrics = calculateProjectionMetrics(onlyEnd);
  assert.equal(onlyEndMetrics.baselineMean, null);
  assert.equal(onlyEndMetrics.endOfCenturyMean, 18.5);
  assert.equal(onlyEndMetrics.delta, null);
});

test('mandatory caveat verbatim string is preserved', () => {
  assert.equal(
    MANDATORY_PROJECTION_CAVEAT,
    'Conditional climate-model scenario, not an exact prediction or observation. Forward trajectories reflect model assumptions under specified greenhouse gas concentration pathways.',
  );
});

test('CMIP6_SUPPORTED_VARIABLES restricts forward projections to T2M, RH2M, and PRECTOTCORR', () => {
  assert.equal(CMIP6_SUPPORTED_VARIABLES.has('T2M'), true);
  assert.equal(CMIP6_SUPPORTED_VARIABLES.has('RH2M'), true);
  assert.equal(CMIP6_SUPPORTED_VARIABLES.has('PRECTOTCORR'), true);
  assert.equal(CMIP6_SUPPORTED_VARIABLES.has('GWETROOT'), false);
  assert.equal(CMIP6_SUPPORTED_VARIABLES.has('EVPTRNS'), false);
  assert.equal(CMIP6_SUPPORTED_VARIABLES.has('MOD13Q1_NDVI'), false);
});
