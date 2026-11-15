import type { LocationSelection } from './navigationStore';

export const INVESTIGATIONS_KEY = 'tpbd.investigations.v1';
const SOURCE = 'NASA POWER Monthly Point';
const REFERENCE = 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/';

export type Investigation = {
  id: string;
  name: string;
  savedAt: string;
  variable: string;
  location: LocationSelection;
  comparison: LocationSelection | null;
  period: { start: number; end: number };
  source: { provider: 'NASA POWER Monthly Point'; reference: string };
};

function readLocation(value: unknown): LocationSelection | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.kind === 'region' && typeof data.id === 'string' && /^[a-z0-9_-]{1,64}$/i.test(data.id)) {
    return { kind: 'region', id: data.id };
  }
  if (data.kind === 'coordinates' && typeof data.lat === 'number' && Number.isFinite(data.lat)
    && Math.abs(data.lat) <= 90 && typeof data.lng === 'number' && Number.isFinite(data.lng) && Math.abs(data.lng) <= 180) {
    return { kind: 'coordinates', lat: data.lat, lng: data.lng };
  }
  return null;
}

function readInvestigation(value: unknown): Investigation {
  if (!value || typeof value !== 'object') throw new Error('Invalid saved investigation');
  const data = value as Record<string, unknown>;
  const location = readLocation(data.location);
  const comparison = data.comparison === null ? null : readLocation(data.comparison);
  const period = data.period as Record<string, unknown> | null;
  const source = data.source as Record<string, unknown> | null;
  if (typeof data.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.id)
    || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80
    || typeof data.savedAt !== 'string' || !Number.isFinite(Date.parse(data.savedAt))
    || typeof data.variable !== 'string' || !/^[A-Z0-9_]{1,64}$/.test(data.variable)
    || !location || (data.comparison !== null && !comparison)
    || !period || typeof period.start !== 'number' || typeof period.end !== 'number'
    || !Number.isInteger(period.start) || !Number.isInteger(period.end)
    || period.start < 1981 || period.end > 2026 || period.start > period.end
    || !source || source.provider !== SOURCE || source.reference !== REFERENCE) {
    throw new Error('Invalid saved investigation');
  }
  return {
    id: data.id, name: data.name, savedAt: data.savedAt, variable: data.variable,
    location, comparison, period: { start: period.start, end: period.end },
    source: { provider: SOURCE, reference: REFERENCE },
  };
}

export function readInvestigations(storage: Pick<Storage, 'getItem'>): Investigation[] {
  const raw = storage.getItem(INVESTIGATIONS_KEY);
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 50) throw new Error('Invalid saved investigations');
  return data.map(readInvestigation);
}

export function saveInvestigation(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  input: Omit<Investigation, 'id' | 'savedAt' | 'source'>,
  id: string,
  savedAt: string,
): Investigation[] {
  const current = readInvestigations(storage);
  if (current.length >= 50) throw new Error('The limit of 50 saved investigations has been reached.');
  const item = readInvestigation({
    ...input, id, savedAt, source: { provider: SOURCE, reference: REFERENCE },
  });
  const updated = [item, ...current];
  storage.setItem(INVESTIGATIONS_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteInvestigation(storage: Pick<Storage, 'getItem' | 'setItem'>, id: string): Investigation[] {
  const current = readInvestigations(storage);
  const updated = current.filter((item) => item.id !== id);
  storage.setItem(INVESTIGATIONS_KEY, JSON.stringify(updated));
  return updated;
}
