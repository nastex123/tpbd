/**
 * Planetary Variable-Adaptive Visualization Engine
 * Translates NASA climate variables into deterministic scientific visual profiles,
 * Doppler radar reflectivity ramps, thermal infrared auroras, and geodesic range circles.
 * 100% English. Zero Emojis.
 */

export interface ColorRampStop {
  threshold: number;
  color: string;
  label: string;
}

export interface VariableVisualProfile {
  id: string;
  category: 'radar' | 'thermal' | 'hydro' | 'flux' | 'vegetation' | 'generic';
  name: string;
  sensor: string;
  unit: string;
  colorRamp: ColorRampStop[];
  ringMaxRadius: number;
  ringRepeatPeriod: number;
  ringPropagationSpeed: number;
  pointAltitude: number;
  pointRadiusFactor: number;
  getRingColor: (t: number, value: number | null) => string;
  getPointColor: (value: number | null, bounds?: [number, number]) => string;
  getCategoryLabel: (value: number | null) => { label: string; color: string };
}

/**
 * Helper to convert hex color (#rrggbb) to rgba string with custom alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return `rgba(56, 189, 248, ${alpha})`;
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/**
 * Precipitation (PRECTOTCORR)
 * International meteorological reflectivity Doppler scale.
 */
const PRECIPITATION_PROFILE: VariableVisualProfile = {
  id: 'PRECTOTCORR',
  category: 'radar',
  name: 'Precipitation',
  sensor: 'GPM Core Observatory / MERRA-2 · Doppler Reflectivity',
  unit: 'mm/month',
  colorRamp: [
    { threshold: 2, color: '#38bdf8', label: 'Light / Trace' },
    { threshold: 10, color: '#22c55e', label: 'Moderate' },
    { threshold: 25, color: '#eab308', label: 'High' },
    { threshold: 50, color: '#ef4444', label: 'Severe' },
    { threshold: Infinity, color: '#d946ef', label: 'Torrential' },
  ],
  ringMaxRadius: 3.8,
  ringRepeatPeriod: 1000,
  ringPropagationSpeed: 2.8,
  pointAltitude: 0.010,
  pointRadiusFactor: 1.35,
  getRingColor: (t: number, value: number | null) => {
    const baseColor = PRECIPITATION_PROFILE.getPointColor(value);
    const alpha = Math.max(0, (1 - t) * 0.85);
    return hexToRgba(baseColor, alpha);
  },
  getPointColor: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '#64748b';
    if (value < 2) return '#38bdf8';
    if (value < 10) return '#22c55e';
    if (value < 25) return '#eab308';
    if (value < 50) return '#ef4444';
    return '#d946ef';
  },
  getCategoryLabel: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return { label: 'No Data', color: '#64748b' };
    if (value < 2) return { label: 'Light / Trace', color: '#38bdf8' };
    if (value < 10) return { label: 'Moderate', color: '#22c55e' };
    if (value < 25) return { label: 'High', color: '#eab308' };
    if (value < 50) return { label: 'Severe', color: '#ef4444' };
    return { label: 'Torrential', color: '#d946ef' };
  },
};

/**
 * Air Temperature & Land Surface Temperature (T2M, MOD11A1_LST, NCEI_TAVG)
 * Infrared thermal scale with slow convection breathing.
 */
const TEMPERATURE_PROFILE: VariableVisualProfile = {
  id: 'T2M',
  category: 'thermal',
  name: 'Air Temperature',
  sensor: 'NASA MERRA-2 / MODIS · Thermal Infrared',
  unit: '°C',
  colorRamp: [
    { threshold: 0, color: '#3b82f6', label: 'Freezing (<0°C)' },
    { threshold: 15, color: '#06b6d4', label: 'Cool (0-15°C)' },
    { threshold: 28, color: '#f59e0b', label: 'Warm (15-28°C)' },
    { threshold: 36, color: '#ea580c', label: 'Hot (28-36°C)' },
    { threshold: Infinity, color: '#dc2626', label: 'Extreme Heat (>36°C)' },
  ],
  ringMaxRadius: 2.5,
  ringRepeatPeriod: 2200,
  ringPropagationSpeed: 1.2,
  pointAltitude: 0.005,
  pointRadiusFactor: 1.1,
  getRingColor: (t: number, value: number | null) => {
    const baseColor = TEMPERATURE_PROFILE.getPointColor(value);
    const alpha = Math.max(0, (1 - t) * 0.75);
    return hexToRgba(baseColor, alpha);
  },
  getPointColor: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '#64748b';
    if (value < 0) return '#3b82f6';
    if (value < 15) return '#06b6d4';
    if (value < 28) return '#f59e0b';
    if (value < 36) return '#ea580c';
    return '#dc2626';
  },
  getCategoryLabel: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return { label: 'No Data', color: '#64748b' };
    if (value < 0) return { label: 'Freezing', color: '#3b82f6' };
    if (value < 15) return { label: 'Cool', color: '#06b6d4' };
    if (value < 28) return { label: 'Warm', color: '#f59e0b' };
    if (value < 36) return { label: 'Hot', color: '#ea580c' };
    return { label: 'Extreme Heat', color: '#dc2626' };
  },
};

/**
 * Root-Zone Soil Wetness (GWETROOT) & Relative Humidity (RH2M)
 * Hydro-saturation dispersion scale.
 */
const HYDRO_PROFILE: VariableVisualProfile = {
  id: 'GWETROOT',
  category: 'hydro',
  name: 'Soil Moisture & Wetness',
  sensor: 'MERRA-2 · Hydro-Saturation Model',
  unit: 'fraction',
  colorRamp: [
    { threshold: 0.25, color: '#d97706', label: 'Drought Deficit (<0.25)' },
    { threshold: 0.60, color: '#06b6d4', label: 'Adequate Hydration (0.25-0.60)' },
    { threshold: Infinity, color: '#10b981', label: 'Saturated Soil (>0.60)' },
  ],
  ringMaxRadius: 2.2,
  ringRepeatPeriod: 1800,
  ringPropagationSpeed: 1.5,
  pointAltitude: 0.004,
  pointRadiusFactor: 1.0,
  getRingColor: (t: number, value: number | null) => {
    const baseColor = HYDRO_PROFILE.getPointColor(value);
    const alpha = Math.max(0, (1 - t) * 0.7);
    return hexToRgba(baseColor, alpha);
  },
  getPointColor: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '#64748b';
    if (value < 0.25) return '#d97706';
    if (value < 0.60) return '#06b6d4';
    return '#10b981';
  },
  getCategoryLabel: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return { label: 'No Data', color: '#64748b' };
    if (value < 0.25) return { label: 'Drought Deficit', color: '#d97706' };
    if (value < 0.60) return { label: 'Adequate Hydration', color: '#06b6d4' };
    return { label: 'Saturated Soil', color: '#10b981' };
  },
};

/**
 * Relative Humidity (RH2M)
 */
const HUMIDITY_PROFILE: VariableVisualProfile = {
  id: 'RH2M',
  category: 'hydro',
  name: 'Relative Humidity',
  sensor: 'NASA MERRA-2 · Atmospheric Moisture',
  unit: '%',
  colorRamp: [
    { threshold: 30, color: '#d97706', label: 'Arid (<30%)' },
    { threshold: 70, color: '#06b6d4', label: 'Comfortable (30-70%)' },
    { threshold: Infinity, color: '#10b981', label: 'Humid (>70%)' },
  ],
  ringMaxRadius: 2.2,
  ringRepeatPeriod: 1800,
  ringPropagationSpeed: 1.5,
  pointAltitude: 0.004,
  pointRadiusFactor: 1.0,
  getRingColor: (t: number, value: number | null) => {
    const baseColor = HUMIDITY_PROFILE.getPointColor(value);
    const alpha = Math.max(0, (1 - t) * 0.7);
    return hexToRgba(baseColor, alpha);
  },
  getPointColor: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '#64748b';
    if (value < 30) return '#d97706';
    if (value < 70) return '#06b6d4';
    return '#10b981';
  },
  getCategoryLabel: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return { label: 'No Data', color: '#64748b' };
    if (value < 30) return { label: 'Arid Air', color: '#d97706' };
    if (value < 70) return { label: 'Temperate Humidity', color: '#06b6d4' };
    return { label: 'High Moisture', color: '#10b981' };
  },
};

/**
 * Evapotranspiration Flux (EVPTRNS)
 * Ascending latent heat flux with golden solar rings.
 */
const EVAPOTRANSPIRATION_PROFILE: VariableVisualProfile = {
  id: 'EVPTRNS',
  category: 'flux',
  name: 'Evapotranspiration Flux',
  sensor: 'MERRA-2 · Latent Heat Flux',
  unit: 'W/m²',
  colorRamp: [
    { threshold: 20, color: '#b45309', label: 'Low Latent Flux (<20 W/m²)' },
    { threshold: 50, color: '#f59e0b', label: 'Moderate Flux (20-50 W/m²)' },
    { threshold: 90, color: '#38bdf8', label: 'High Flux (50-90 W/m²)' },
    { threshold: Infinity, color: '#a855f7', label: 'Intense Solar Flux (>90 W/m²)' },
  ],
  ringMaxRadius: 2.8,
  ringRepeatPeriod: 1600,
  ringPropagationSpeed: 1.8,
  pointAltitude: 0.016,
  pointRadiusFactor: 1.2,
  getRingColor: (t: number, value: number | null) => {
    const baseColor = EVAPOTRANSPIRATION_PROFILE.getPointColor(value);
    const alpha = Math.max(0, (1 - t) * 0.8);
    return hexToRgba(baseColor, alpha);
  },
  getPointColor: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '#64748b';
    if (value < 20) return '#b45309';
    if (value < 50) return '#f59e0b';
    if (value < 90) return '#38bdf8';
    return '#a855f7';
  },
  getCategoryLabel: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return { label: 'No Data', color: '#64748b' };
    if (value < 20) return { label: 'Low Latent Flux', color: '#b45309' };
    if (value < 50) return { label: 'Moderate Flux', color: '#f59e0b' };
    if (value < 90) return { label: 'High Flux', color: '#38bdf8' };
    return { label: 'Intense Solar Evaporation', color: '#a855f7' };
  },
};

/**
 * Vegetation Index (MOD13Q1_NDVI)
 * Photosynthetic chlorophyll density scale.
 */
const VEGETATION_PROFILE: VariableVisualProfile = {
  id: 'MOD13Q1_NDVI',
  category: 'vegetation',
  name: 'Vegetation Index (NDVI)',
  sensor: 'Terra MODIS · Canopy Chlorophyll Sensor',
  unit: 'index',
  colorRamp: [
    { threshold: 0.15, color: '#71717a', label: 'Barren / Non-vegetated (<0.15)' },
    { threshold: 0.40, color: '#84cc16', label: 'Sparse Canopy (0.15-0.40)' },
    { threshold: 0.70, color: '#16a34a', label: 'Dense Canopy (0.40-0.70)' },
    { threshold: Infinity, color: '#059669', label: 'Rainforest / Dense (>0.70)' },
  ],
  ringMaxRadius: 2.0,
  ringRepeatPeriod: 2400,
  ringPropagationSpeed: 1.0,
  pointAltitude: 0.004,
  pointRadiusFactor: 1.0,
  getRingColor: (t: number, value: number | null) => {
    const baseColor = VEGETATION_PROFILE.getPointColor(value);
    const alpha = Math.max(0, (1 - t) * 0.75);
    return hexToRgba(baseColor, alpha);
  },
  getPointColor: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '#64748b';
    if (value < 0.15) return '#71717a';
    if (value < 0.40) return '#84cc16';
    if (value < 0.70) return '#16a34a';
    return '#059669';
  },
  getCategoryLabel: (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return { label: 'No Data', color: '#64748b' };
    if (value < 0.15) return { label: 'Barren Ground', color: '#71717a' };
    if (value < 0.40) return { label: 'Sparse Canopy', color: '#84cc16' };
    if (value < 0.70) return { label: 'Dense Vegetated Canopy', color: '#16a34a' };
    return { label: 'Dense Saturated Canopy', color: '#059669' };
  },
};

/**
 * Generic Fallback Profile
 */
const GENERIC_PROFILE: VariableVisualProfile = {
  id: 'GENERIC',
  category: 'generic',
  name: 'Earth Observation Variable',
  sensor: 'NASA Earth Observing System',
  unit: '',
  colorRamp: [
    { threshold: Infinity, color: '#38bdf8', label: 'Standard Observation' },
  ],
  ringMaxRadius: 2.4,
  ringRepeatPeriod: 1600,
  ringPropagationSpeed: 1.4,
  pointAltitude: 0.004,
  pointRadiusFactor: 1.0,
  getRingColor: (t: number) => {
    const alpha = Math.max(0, (1 - t) * 0.75);
    return `rgba(56, 189, 248, ${alpha})`;
  },
  getPointColor: () => '#38bdf8',
  getCategoryLabel: () => ({ label: 'Normal Reading', color: '#38bdf8' }),
};

/**
 * Returns the matching scientific visual profile for any given variable ID.
 */
export function getVariableProfile(variableId: string): VariableVisualProfile {
  switch (variableId) {
    case 'PRECTOTCORR':
      return PRECIPITATION_PROFILE;
    case 'T2M':
    case 'MOD11A1_LST':
    case 'NCEI_TAVG':
      return TEMPERATURE_PROFILE;
    case 'GWETROOT':
      return HYDRO_PROFILE;
    case 'RH2M':
      return HUMIDITY_PROFILE;
    case 'EVPTRNS':
      return EVAPOTRANSPIRATION_PROFILE;
    case 'MOD13Q1_NDVI':
      return VEGETATION_PROFILE;
    default:
      return GENERIC_PROFILE;
  }
}

/**
 * Returns the observation color for a variable and value.
 */
export function getObservationColor(
  variableId: string,
  value: number | null,
  bounds?: [number, number]
): string {
  const profile = getVariableProfile(variableId);
  return profile.getPointColor(value, bounds);
}

/**
 * Returns the descriptive category label and theme color for a value.
 */
export function getCategoryLabel(
  variableId: string,
  value: number | null
): { label: string; color: string } {
  const profile = getVariableProfile(variableId);
  return profile.getCategoryLabel(value);
}

/**
 * Computes geodesic radar range circles around a target coordinate on Earth.
 * Used for meteorological Doppler radar footprint rendering on the 3D globe.
 */
export function computeRadarRangeRings(
  lat: number,
  lng: number,
  radiiKm: number[] = [60, 160],
  altitude = 0.003
): { points: { lat: number; lng: number; altitude: number }[]; color: string }[] {
  const earthRadiusKm = 6371;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const numPoints = 64;

  return radiiKm.map((radius, idx) => {
    const dRad = radius / earthRadiusKm;
    const ringColor = idx === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.22)';
    const points: { lat: number; lng: number; altitude: number }[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const bearing = (i * 2 * Math.PI) / numPoints;
      const pointLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(dRad) +
        Math.cos(latRad) * Math.sin(dRad) * Math.cos(bearing)
      );
      const pointLngRad = lngRad + Math.atan2(
        Math.sin(bearing) * Math.sin(dRad) * Math.cos(latRad),
        Math.cos(dRad) - Math.sin(latRad) * Math.sin(pointLatRad)
      );
      points.push({
        lat: (pointLatRad * 180) / Math.PI,
        lng: (((pointLngRad * 180) / Math.PI + 540) % 360) - 180,
        altitude,
      });
    }

    return {
      points,
      color: ringColor,
    };
  });
}
