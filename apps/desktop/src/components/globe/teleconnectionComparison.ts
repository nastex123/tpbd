import type { Trend } from './globeData';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TeleconnectionDivergence {
  rateA: number | null;
  rateB: number | null;
  rateDiff: number | null;
  unit: string;
  distanceKm: number;
  isOpposing: boolean;
  bothSignificant: boolean;
  divergenceType: 'opposing_significant' | 'divergent_amplification' | 'parallel' | 'inconclusive';
  divergenceSummary: string;
}

/**
 * Great-circle distance between two points on the Earth sphere using the Haversine formula.
 */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat2 = Math.sin(dLat / 2);
  const sinDLng2 = Math.sin(dLng / 2);

  const h = sinDLat2 * sinDLat2 + Math.cos(lat1) * Math.cos(lat2) * sinDLng2 * sinDLng2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.round(R * c);
}

/**
 * Computes an elevation altitude (in units of globe radius, where 1.0 = surface)
 * that ensures the 3D geodesic arc arches gracefully above the Earth's curvature,
 * clouds, and terrain without clipping into the globe or dropping below surface level.
 */
export function computeArcAltitude(a: Coordinates, b: Coordinates): number {
  const distKm = haversineDistanceKm(a, b);
  // Linear scaling from 0.16 (short distances) up to 0.62 (intercontinental distances)
  return Math.min(0.65, Math.max(0.16, 0.12 + (distKm / 20000) * 0.5));
}

/**
 * Computes the spherical midpoint between two coordinates on Earth.
 */
export function sphericalMidpoint(a: Coordinates, b: Coordinates): Coordinates {
  const rad = Math.PI / 180;
  const lat1 = a.lat * rad;
  const lng1 = a.lng * rad;
  const lat2 = b.lat * rad;
  const lng2 = b.lng * rad;

  const dLng = lng2 - lng1;

  const bx = Math.cos(lat2) * Math.cos(dLng);
  const by = Math.cos(lat2) * Math.sin(dLng);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by)
  );
  const lng3 = lng1 + Math.atan2(by, Math.cos(lat1) + bx);

  return {
    lat: Number(((lat3 * 180) / Math.PI).toFixed(4)),
    lng: Number(((((lng3 * 180) / Math.PI + 540) % 360) - 180).toFixed(4)),
  };
}

/**
 * Computes deterministic divergence between two trend analyses and their spatial distance.
 * Implements the NASA Space Apps core problem: opposing or diverging trends across Earth systems.
 */
export function computeTeleconnectionDivergence(
  trendA: Trend | undefined,
  trendB: Trend | undefined,
  coordA: Coordinates,
  coordB: Coordinates
): TeleconnectionDivergence {
  const distanceKm = haversineDistanceKm(coordA, coordB);

  const rateA = trendA?.rate_per_decade ?? null;
  const rateB = trendB?.rate_per_decade ?? null;
  const unit = trendA?.rate_unit || trendB?.rate_unit || 'units/decade';

  if (
    rateA === null ||
    rateB === null ||
    !trendA ||
    !trendB ||
    trendA.direction === 'not_evaluable' ||
    trendB.direction === 'not_evaluable'
  ) {
    return {
      rateA,
      rateB,
      rateDiff: null,
      unit,
      distanceKm,
      isOpposing: false,
      bothSignificant: false,
      divergenceType: 'inconclusive',
      divergenceSummary: 'Insufficient continuous observations to evaluate spatial trend divergence.',
    };
  }

  const rateDiff = Number((rateA - rateB).toFixed(4));
  const isOpposing = (rateA > 0 && rateB < 0) || (rateA < 0 && rateB > 0);
  const bothSignificant =
    (trendA.direction === 'increasing_significant' || trendA.direction === 'decreasing_significant') &&
    (trendB.direction === 'increasing_significant' || trendB.direction === 'decreasing_significant');

  let divergenceType: TeleconnectionDivergence['divergenceType'] = 'parallel';
  let divergenceSummary = '';

  if (isOpposing && bothSignificant) {
    divergenceType = 'opposing_significant';
    divergenceSummary = `Opposing statistically significant trends detected across ${distanceKm.toLocaleString()} km (Δ = ${
      rateDiff > 0 ? '+' : ''
    }${rateDiff} ${unit}).`;
  } else if (isOpposing) {
    divergenceType = 'opposing_significant';
    divergenceSummary = `Opposing trend directions detected across ${distanceKm.toLocaleString()} km, with partial statistical significance.`;
  } else if (
    (Math.abs(rateA) > 2 * Math.abs(rateB) && Math.abs(rateB) > 0.001) ||
    (Math.abs(rateB) > 2 * Math.abs(rateA) && Math.abs(rateA) > 0.001)
  ) {
    divergenceType = 'divergent_amplification';
    divergenceSummary = `Pronounced regional amplification observed: one region changes at more than double the rate (Δ = ${
      rateDiff > 0 ? '+' : ''
    }${rateDiff} ${unit}).`;
  } else {
    divergenceType = 'parallel';
    divergenceSummary = `Regions exhibit aligned trend trajectories with a rate difference of ${
      rateDiff > 0 ? '+' : ''
    }${rateDiff} ${unit}.`;
  }

  return {
    rateA,
    rateB,
    rateDiff,
    unit,
    distanceKm,
    isOpposing,
    bothSignificant,
    divergenceType,
    divergenceSummary,
  };
}
