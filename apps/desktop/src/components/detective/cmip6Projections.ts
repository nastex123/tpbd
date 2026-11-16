import type { SSPScenario } from '../globe/projectionData.ts';

export type { SSPScenario };

export const MANDATORY_PROJECTION_CAVEAT =
  'Conditional climate-model scenario, not an exact prediction or observation. Forward trajectories reflect model assumptions under specified greenhouse gas concentration pathways.';

export const CMIP6_SUPPORTED_VARIABLES = new Set(['T2M', 'RH2M', 'PRECTOTCORR', 'GWETROOT', 'EVPTRNS', 'MOD13Q1_NDVI']);

export interface ScenarioMetadata {
  scenario: SSPScenario;
  badgeLabel: string;
  name: string;
  category: 'low' | 'medium' | 'high';
  radiativeForcing: number;
  forcingLabel: string;
  color: string;
  description: string;
}

export const SCENARIO_METADATA_MAP: Record<SSPScenario, ScenarioMetadata> = {
  ssp126: {
    scenario: 'ssp126',
    badgeLabel: 'SSP1-2.6 · Low (+2.6 W/m²)',
    name: 'SSP1-2.6',
    category: 'low',
    radiativeForcing: 2.6,
    forcingLabel: '+2.6 W/m²',
    color: '#34d399',
    description: 'Low-forcing sustainability pathway with stringent climate mitigation aiming below 2°C.',
  },
  ssp245: {
    scenario: 'ssp245',
    badgeLabel: 'SSP2-4.5 · Medium (+4.5 W/m²)',
    name: 'SSP2-4.5',
    category: 'medium',
    radiativeForcing: 4.5,
    forcingLabel: '+4.5 W/m²',
    color: '#38bdf8',
    description: 'Medium-forcing middle-of-the-road stabilization trajectory with moderate emissions reductions.',
  },
  ssp370: {
    scenario: 'ssp370',
    badgeLabel: 'SSP3-7.0 · High (+7.0 W/m²)',
    name: 'SSP3-7.0',
    category: 'high',
    radiativeForcing: 7.0,
    forcingLabel: '+7.0 W/m²',
    color: '#f97316',
    description: 'High-forcing regional rivalry scenario with high emissions and limited mitigation.',
  },
};

export function getScenarioMetadata(scenario: SSPScenario): ScenarioMetadata {
  return SCENARIO_METADATA_MAP[scenario] ?? SCENARIO_METADATA_MAP.ssp245;
}

export interface ProjectionMetrics {
  baselineMean: number | null;
  endOfCenturyMean: number | null;
  delta: number | null;
  baselinePointsCount: number;
  endOfCenturyPointsCount: number;
}

export function parseYearFromPoint(point: { date: string; year?: number }): number | null {
  if (typeof point.year === 'number' && Number.isFinite(point.year)) {
    return point.year;
  }
  if (typeof point.date === 'string') {
    const yr = parseInt(point.date.slice(0, 4), 10);
    if (!isNaN(yr)) {
      return yr;
    }
  }
  return null;
}

/**
 * Resolves the dynamic projection start year based on the last valid historical observation.
 * Projections automatically begin in January of the year following the last valid historical observation (Year + 1).
 * If historical points are absent, empty, or historical view is disabled, defaults safely to 2025.
 */
export function calculateProjectionStartYear(
  validHistorical?: Array<{ date: string; value?: number | null }> | null,
  showHistorical: boolean = true,
): number {
  if (!showHistorical || !validHistorical || validHistorical.length === 0) {
    return 2025;
  }
  const lastHistoricalPoint = validHistorical.at(-1);
  if (!lastHistoricalPoint) {
    return 2025;
  }
  const parsedYear = parseInt(lastHistoricalPoint.date.slice(0, 4), 10);
  const lastHistoricalYear = Number.isFinite(parsedYear) ? parsedYear : 2024;
  return lastHistoricalYear + 1;
}

/**
 * Calculates Baseline (2015-2025 mean), End-of-Century (2090-2100 mean), and Net Change (Delta).
 * Strictly handles nulls and empty arrays without hallucination or NaN.
 */
export function calculateProjectionMetrics(
  projectionPoints: Array<{ date: string; value: number | null; year?: number }> | null | undefined,
  historicalPoints?: Array<{ date: string; value: number | null }> | null,
): ProjectionMetrics {
  if (!projectionPoints || projectionPoints.length === 0) {
    return {
      baselineMean: null,
      endOfCenturyMean: null,
      delta: null,
      baselinePointsCount: 0,
      endOfCenturyPointsCount: 0,
    };
  }

  // Baseline window (2015-2025 inclusive)
  const baselineValues: number[] = [];
  for (const pt of projectionPoints) {
    const yr = parseYearFromPoint(pt);
    if (yr !== null && yr >= 2015 && yr <= 2025 && pt.value !== null && Number.isFinite(pt.value)) {
      baselineValues.push(pt.value);
    }
  }

  // If projection points do not contain valid 2015-2025 values, check historicalPoints
  if (baselineValues.length === 0 && historicalPoints && historicalPoints.length > 0) {
    for (const pt of historicalPoints) {
      const yr = parseYearFromPoint(pt);
      if (yr !== null && yr >= 2015 && yr <= 2025 && pt.value !== null && Number.isFinite(pt.value)) {
        baselineValues.push(pt.value);
      }
    }
  }

  // End-of-Century window (2090-2100 inclusive)
  const endOfCenturyValues: number[] = [];
  for (const pt of projectionPoints) {
    const yr = parseYearFromPoint(pt);
    if (yr !== null && yr >= 2090 && yr <= 2100 && pt.value !== null && Number.isFinite(pt.value)) {
      endOfCenturyValues.push(pt.value);
    }
  }

  const baselineMean = baselineValues.length > 0
    ? baselineValues.reduce((acc, val) => acc + val, 0) / baselineValues.length
    : null;

  const endOfCenturyMean = endOfCenturyValues.length > 0
    ? endOfCenturyValues.reduce((acc, val) => acc + val, 0) / endOfCenturyValues.length
    : null;

  const delta = (baselineMean !== null && endOfCenturyMean !== null)
    ? endOfCenturyMean - baselineMean
    : null;

  return {
    baselineMean: baselineMean !== null ? Math.round(baselineMean * 10000) / 10000 : null,
    endOfCenturyMean: endOfCenturyMean !== null ? Math.round(endOfCenturyMean * 10000) / 10000 : null,
    delta: delta !== null ? Math.round(delta * 10000) / 10000 : null,
    baselinePointsCount: baselineValues.length,
    endOfCenturyPointsCount: endOfCenturyValues.length,
  };
}
