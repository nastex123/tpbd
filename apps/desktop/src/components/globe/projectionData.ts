import { localApiFetch } from './localApi.ts';

export type SSPScenario = 'ssp126' | 'ssp245' | 'ssp370';

export interface ProjectionScenarioInfo {
  scenario: SSPScenario;
  name: string;
  description: string;
  radiative_forcing_w_m2: number;
  target_year: number;
  caveat: string;
}

export interface ProjectionModelInfo {
  model_id: string;
  name: string;
  institution: string;
  resolution: string;
  is_default: boolean;
}

export interface ProjectionPoint {
  year: number;
  month: number;
  date: string;
  value: number | null;
  unit: string;
}

export interface ProjectionSeriesResponse {
  variable_id: string;
  scenario: SSPScenario;
  model: string;
  unit?: string;
  lat: number;
  lon: number;
  location_name: string;
  points: ProjectionPoint[];
  caveat: string;
  uncertainty_note: string;
}

const SCENARIO_METADATA: Record<SSPScenario, { radiative_forcing_w_m2: number; target_year: number }> = {
  ssp126: { radiative_forcing_w_m2: 2.6, target_year: 2100 },
  ssp245: { radiative_forcing_w_m2: 4.5, target_year: 2100 },
  ssp370: { radiative_forcing_w_m2: 7.0, target_year: 2100 },
};

const KNOWN_MODELS: Record<string, { name: string; institution: string; resolution: string; is_default: boolean }> = {
  ensemble: {
    name: 'Multi-Model Ensemble',
    institution: 'NASA POWER / NEX-GDDP-CMIP6',
    resolution: '0.25° × 0.25°',
    is_default: true,
  },
  cesm2: {
    name: 'CESM2',
    institution: 'NCAR (National Center for Atmospheric Research)',
    resolution: '0.25° × 0.25°',
    is_default: false,
  },
  'cnrm-cm6-1': {
    name: 'CNRM-CM6-1',
    institution: 'CNRM-CERFACS (France)',
    resolution: '0.25° × 0.25°',
    is_default: false,
  },
  canesm5: {
    name: 'CanESM5',
    institution: 'CCCma (Canada)',
    resolution: '0.25° × 0.25°',
    is_default: false,
  },
  miroc6: {
    name: 'MIROC6',
    institution: 'MIROC (Japan)',
    resolution: '0.25° × 0.25°',
    is_default: false,
  },
  'mri-esm2-0': {
    name: 'MRI-ESM2-0',
    institution: 'MRI (Japan)',
    resolution: '0.25° × 0.25°',
    is_default: false,
  },
  'gfdl-esm4': {
    name: 'GFDL-ESM4',
    institution: 'NOAA GFDL (USA)',
    resolution: '0.25° × 0.25°',
    is_default: false,
  },
  'ipsl-cm6a-lr': {
    name: 'IPSL-CM6A-LR',
    institution: 'IPSL (France)',
    resolution: '0.25° × 0.25°',
    is_default: false,
  },
  'ukesm1-0-ll': {
    name: 'UKESM1-0-LL',
    institution: 'Met Office Hadley Centre (UK)',
    resolution: '0.25° × 0.25°',
    is_default: false,
  },
};

function formatCoordinateLabel(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

export async function fetchProjectionScenarios(signal?: AbortSignal): Promise<ProjectionScenarioInfo[]> {
  const response = await localApiFetch('/api/v1/projections/scenarios', { method: 'GET', signal });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to load projection scenarios (${response.status}): ${errorText || response.statusText}`);
  }

  const data: unknown = await response.json();
  const rawList: unknown[] = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' && Array.isArray((data as { scenarios?: unknown[] }).scenarios)
      ? (data as { scenarios: unknown[] }).scenarios
      : []);

  return rawList
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item): ProjectionScenarioInfo | null => {
      const scenario = item.scenario as SSPScenario;
      if (scenario !== 'ssp126' && scenario !== 'ssp245' && scenario !== 'ssp370') {
        return null;
      }
      const metric = SCENARIO_METADATA[scenario] ?? { radiative_forcing_w_m2: 0, target_year: 2100 };
      return {
        scenario,
        name: typeof item.name === 'string' && item.name ? item.name : scenario.toUpperCase(),
        description: typeof item.description === 'string' ? item.description : '',
        radiative_forcing_w_m2: typeof item.radiative_forcing_w_m2 === 'number'
          ? item.radiative_forcing_w_m2
          : metric.radiative_forcing_w_m2,
        target_year: typeof item.target_year === 'number'
          ? item.target_year
          : metric.target_year,
        caveat: typeof item.caveat === 'string'
          ? item.caveat
          : 'Conditional model scenario, not an exact prediction.',
      };
    })
    .filter((item): item is ProjectionScenarioInfo => item !== null);
}

export async function fetchProjectionModels(signal?: AbortSignal): Promise<ProjectionModelInfo[]> {
  const response = await localApiFetch('/api/v1/projections/models', { method: 'GET', signal });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to load projection models (${response.status}): ${errorText || response.statusText}`);
  }

  const data: unknown = await response.json();
  const rawModels: unknown[] = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' && Array.isArray((data as { models?: unknown[] }).models)
      ? (data as { models: unknown[] }).models
      : []);

  return rawModels
    .map((item): ProjectionModelInfo | null => {
      if (typeof item === 'string') {
        const key = item.toLowerCase();
        const known = KNOWN_MODELS[key];
        return {
          model_id: item,
          name: known?.name ?? item.toUpperCase(),
          institution: known?.institution ?? 'CMIP6 Participating Institution',
          resolution: known?.resolution ?? '0.25° × 0.25°',
          is_default: known?.is_default ?? (key === 'ensemble'),
        };
      }
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        const modelId = typeof record.model_id === 'string'
          ? record.model_id
          : (typeof record.id === 'string' ? record.id : '');
        if (!modelId) return null;
        const key = modelId.toLowerCase();
        const known = KNOWN_MODELS[key];
        return {
          model_id: modelId,
          name: typeof record.name === 'string' ? record.name : (known?.name ?? modelId.toUpperCase()),
          institution: typeof record.institution === 'string'
            ? record.institution
            : (known?.institution ?? 'CMIP6 Participating Institution'),
          resolution: typeof record.resolution === 'string'
            ? record.resolution
            : (known?.resolution ?? '0.25° × 0.25°'),
          is_default: typeof record.is_default === 'boolean'
            ? record.is_default
            : (known?.is_default ?? (key === 'ensemble')),
        };
      }
      return null;
    })
    .filter((item): item is ProjectionModelInfo => item !== null);
}

export async function fetchProjectionSeries(params: {
  variableId: string;
  lat: number;
  lon: number;
  scenario: SSPScenario;
  model?: string;
  startYear?: number;
  endYear?: number;
  signal?: AbortSignal;
}): Promise<ProjectionSeriesResponse> {
  const model = params.model ?? 'ensemble';
  const startYear = params.startYear ?? 2015;
  const endYear = params.endYear ?? 2100;

  const query = new URLSearchParams({
    variable_id: params.variableId,
    latitude: String(params.lat),
    longitude: String(params.lon),
    scenario: params.scenario,
    model,
    start_year: String(startYear),
    end_year: String(endYear),
  });

  const response = await localApiFetch(`/api/v1/projections/series?${query}`, {
    method: 'GET',
    signal: params.signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to load projection series (${response.status}): ${errorText || response.statusText}`);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid projection series response payload');
  }

  const record = data as Record<string, unknown>;
  const rawPoints = Array.isArray(record.points) ? record.points : [];
  const unit = typeof record.unit === 'string' ? record.unit : '';

  const points: ProjectionPoint[] = rawPoints
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => {
      const dateStr = typeof p.date === 'string' ? p.date : '';
      const parts = dateStr.split('-');
      const year = typeof p.year === 'number'
        ? p.year
        : (parts.length > 0 && !isNaN(Number(parts[0])) ? Number(parts[0]) : 0);
      const month = typeof p.month === 'number'
        ? p.month
        : (parts.length > 1 && !isNaN(Number(parts[1])) ? Number(parts[1]) : 1);
      const val = typeof p.value === 'number' && Number.isFinite(p.value) ? p.value : null;
      const pointUnit = typeof p.unit === 'string' ? p.unit : unit;
      return {
        year,
        month,
        date: dateStr,
        value: val,
        unit: pointUnit,
      };
    });

  const locationName = typeof record.location_name === 'string' && record.location_name
    ? record.location_name
    : formatCoordinateLabel(params.lat, params.lon);

  return {
    variable_id: typeof record.variable_id === 'string' ? record.variable_id : params.variableId,
    scenario: (record.scenario as SSPScenario) ?? params.scenario,
    model: typeof record.model === 'string' ? record.model : model,
    unit: unit || undefined,
    lat: typeof record.lat === 'number' ? record.lat : params.lat,
    lon: typeof record.lon === 'number' ? record.lon : params.lon,
    location_name: locationName,
    points,
    caveat: typeof record.caveat === 'string'
      ? record.caveat
      : 'Conditional climate-model scenario, not an exact prediction or observation.',
    uncertainty_note: typeof record.uncertainty_note === 'string'
      ? record.uncertainty_note
      : 'The monthly point response does not provide an uncertainty interval; model and scenario are retained for interpretation.',
  };
}
