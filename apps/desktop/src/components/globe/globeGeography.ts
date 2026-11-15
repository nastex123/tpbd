export type GeoPoint = { lat: number; lng: number };
export type Place = GeoPoint & { name: string };
export type GeoPath = [number, number][];
export type WorldMap = { paths: GeoPath[]; places: Place[] };
export type CountryFeature = {
  type: 'Feature';
  properties: { name: string; nameEn: string; lat: number; lng: number; color: number };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
};
export type CountryCollection = { type: 'FeatureCollection'; features: CountryFeature[] };

export const initialView = { lat: 18, lng: -25, altitude: 2.4 };

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const lat = (b.lat - a.lat) * rad;
  const lng = (b.lng - a.lng) * rad;
  const haversine = Math.sin(lat / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(lng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, haversine))));
}

export function gridOutline(cell?: string, resolution?: string): GeoPath | null {
  if (!cell || !resolution) return null;
  const center = /^\s*Lat:\s*(-?\d+(?:\.\d+)?),\s*Lon:\s*(-?\d+(?:\.\d+)?)\s*$/i.exec(cell);
  const size = /^\s*(\d+(?:\.\d+)?)°?\s*[x×]\s*(\d+(?:\.\d+)?)°?\s*$/.exec(resolution);
  if (!center || !size) return null;
  const [, latText, lonText] = center;
  const [, heightText, widthText] = size;
  const [lat, lon, height, width] = [latText, lonText, heightText, widthText].map(Number);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || height <= 0 || height > 180 || width <= 0 || width > 360) return null;
  const north = Math.min(90, lat + height / 2);
  const south = Math.max(-90, lat - height / 2);
  const wrap = (lng: number) => ((lng + 540) % 360) - 180;
  const west = wrap(lon - width / 2);
  const east = wrap(lon + width / 2);
  return [[south, west], [north, west], [north, east], [south, east], [south, west]];
}

export function solarPosition(time: Date): GeoPoint {
  const epoch = Date.UTC(time.getUTCFullYear(), 0, 1);
  const days = (time.getTime() - epoch) / 86400000;
  const yearLength = (Date.UTC(time.getUTCFullYear() + 1, 0, 1) - epoch) / 86400000;
  const gamma = (2 * Math.PI / yearLength) * (days - 0.5);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const minutes = time.getUTCHours() * 60 + time.getUTCMinutes() + time.getUTCSeconds() / 60;
  return { lat: declination * 180 / Math.PI, lng: ((720 - (minutes + equation) / 4) % 360) - 180 };
}

function pointInRing(x: number, y: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findCountryAt(lat: number, lng: number, countries: CountryFeature[]): string | undefined {
  if (!countries || !countries.length) return undefined;
  for (const feature of countries) {
    const geom = feature.geometry;
    if (!geom || !geom.coordinates) continue;
    if (geom.type === 'Polygon') {
      const ring = (geom.coordinates as [number, number][][])[0];
      if (ring && pointInRing(lng, lat, ring)) {
        return feature.properties.name || feature.properties.nameEn;
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates as [number, number][][][]) {
        if (poly && poly[0] && pointInRing(lng, lat, poly[0])) {
          return feature.properties.name || feature.properties.nameEn;
        }
      }
    }
  }
  return undefined;
}
