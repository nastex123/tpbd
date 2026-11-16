import { Component, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { Mesh, MeshBasicMaterial, SphereGeometry, SRGBColorSpace, TextureLoader } from 'three';
import { parseCoordinate, type LocationSelection } from '../../stores/navigationStore';
import { deleteInvestigation, INVESTIGATIONS_KEY, readInvestigations, saveInvestigation, type Investigation } from '../../stores/investigations';
import { distanceKm, findCountryAt, gridOutline, initialView, type CountryCollection, type CountryFeature, type GeoPath, type GeoPoint, type Place, type WorldMap } from './globeGeography';
import { addNightLayer } from './nightLayer';
import { locationKey, pointValue, useLocationReport, useVariableAvailability, variableOptions } from './globeData';
import { InvestigationReport } from './InvestigationReport';
import { prefetchExplanation } from './ScientificExplanation';
import { HolographicInspectorModal } from '../detective/HolographicInspectorModal';
import { FloatingCopilotTrigger } from '../copilot/FloatingCopilotTrigger';
import { StudyRegionsDrawer, type Region } from '../navigation/StudyRegionsDrawer';
import { localApiFetch } from './localApi';
import { trendLine } from './trendLine';
import { nextObservationDate, observationDates } from './historyTimeline';
import { comparisonIssues, trendComparisonIssue } from './seriesComparison';
import { computeArcAltitude, sphericalMidpoint } from './teleconnectionComparison';
import { computeRadarRangeRings, getVariableProfile } from './variableVisualization';
import { VariableRadarLegend } from './VariableRadarLegend';
import naturalEarth from './natural-earth-110m.json';
import './region-globe.css';

const offlineRegions: Region[] = [
  { id: 'amazon', name: 'Amazon Basin (Manaus)', lat: -3.1, lng: -60.0 },
  { id: 'guajira', name: 'La Guajira (Riohacha)', lat: 11.5, lng: -72.9 },
  { id: 'sahel', name: 'Sahel (Niamey, Niger)', lat: 13.5, lng: 2.1 },
  { id: 'australia_se', name: 'Southeast Australia (Murray-Darling)', lat: -35.0, lng: 145.0 },
  { id: 'arctic_svalbard', name: 'Arctic Archipelago (Svalbard)', lat: 78.2, lng: 15.6 },
  { id: 'aral_sea', name: 'Aral Sea Basin (Central Asia)', lat: 45.0, lng: 59.0 },
  { id: 'california_valley', name: 'California Central Valley (Fresno)', lat: 36.7, lng: -119.8 },
  { id: 'tibetan_plateau', name: "Tibetan Plateau ('Third Pole')", lat: 32.0, lng: 88.0 },
  { id: 'congo_basin', name: 'Congo Basin (Kisangani, DRC)', lat: 0.5, lng: 25.2 },
  { id: 'greenland_nuuk', name: 'SW Greenland (Nuuk)', lat: 64.2, lng: -51.7 },
  { id: 'coral_sea', name: 'Great Barrier Reef (Coral Sea)', lat: -18.0, lng: 147.5 },
  { id: 'mediterranean_spain', name: 'Mediterranean Basin (Seville, Spain)', lat: 37.4, lng: -5.9 },
];

const studyAreas: Record<string, GeoPath> = {
  amazon: [[-7, -68], [3, -68], [3, -54], [-7, -54], [-7, -68]],
  guajira: [[10.3, -73.8], [12.5, -73.8], [12.5, -71], [10.3, -71], [10.3, -73.8]],
  sahel: [[11, -3], [17, -3], [17, 7.5], [11, 7.5], [11, -3]],
  australia_se: [[-39, 139], [-29, 139], [-29, 151], [-39, 151], [-39, 139]],
  arctic_svalbard: [[76.5, 10], [80.5, 10], [80.5, 26], [76.5, 26], [76.5, 10]],
  aral_sea: [[43.5, 57], [46.5, 57], [46.5, 61.5], [43.5, 61.5], [43.5, 57]],
  california_valley: [[35, -121.5], [38.5, -121.5], [38.5, -118], [35, -118], [35, -121.5]],
  tibetan_plateau: [[29, 80], [36, 80], [36, 96], [29, 96], [29, 80]],
  congo_basin: [[-3, 20], [4, 20], [4, 30], [-3, 30], [-3, 20]],
  greenland_nuuk: [[62, -54], [66, -54], [66, -48], [62, -48], [62, -54]],
  coral_sea: [[-21, 145], [-15, 145], [-15, 152], [-21, 152], [-21, 145]],
  mediterranean_spain: [[36, -8], [40, -8], [40, -3], [36, -3], [36, -8]],
};

const teleconnectionPresets = [
  { id: 'hadley', name: 'Hadley Cell: Congo Basin vs. Mediterranean', a: 'congo_basin', b: 'mediterranean_spain', variable: 'PRECTOTCORR', note: 'Poleward expansion of subtropical dry zones vs. equatorial intensification' },
  { id: 'polar', name: 'Polar Amplification: Arctic vs. Amazon', a: 'arctic_svalbard', b: 'amazon', variable: 'T2M', note: 'Arctic warming at triple global rate vs. tropical baseline' },
  { id: 'enso', name: 'ENSO Asymmetry: California vs. La Guajira', a: 'california_valley', b: 'guajira', variable: 'PRECTOTCORR', note: 'Pacific atmospheric river whiplash vs. Caribbean drought intensification' },
];

const presentation = [
  'Choose a location and inspect its coordinates.',
  'Play the historical series and follow the active month.',
  'Review the trend estimate and its interpretation.',
  'Compare two study regions for the same variable.',
];

/**
 * Strips accents and maps diacritics to clean standard glyphs
 * supported by three-globe's vector font, preventing '?' replacement characters.
 */
function sanitizeGlobeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');
}

const countryColors = [
  'rgba(54, 133, 159, 0.44)', 'rgba(71, 145, 132, 0.44)', 'rgba(85, 115, 171, 0.44)',
  'rgba(151, 115, 76, 0.44)', 'rgba(113, 105, 163, 0.44)', 'rgba(61, 139, 119, 0.44)',
  'rgba(152, 105, 126, 0.44)', 'rgba(102, 133, 91, 0.44)',
];

const emptyCountries: CountryFeature[] = [];
const polygonSideColorStatic = () => 'rgba(16, 37, 52, 0.58)';
const polygonStrokeColorStatic = () => '#c4e0e8';

function motionAllowed() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function readRegions(payload: unknown): Region[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((item) => {
    const lat = item?.center_coordinates?.latitude;
    const lng = item?.center_coordinates?.longitude;
    if (typeof item?.region_id !== 'string' || typeof item.name !== 'string'
      || typeof lat !== 'number' || typeof lng !== 'number'
      || !Number.isFinite(lat) || !Number.isFinite(lng)
      || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];

    return [{
      id: item.region_id, name: item.name, lat, lng,
      cell: typeof item.representative_cell === 'string' ? item.representative_cell : undefined,
    }];
  });
}

class GlobeBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGL() {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

export function RegionGlobe({ location, onSelect, heading, children }: {
  location: LocationSelection | null;
  onSelect: (location: LocationSelection) => void;
  heading: ReactNode;
  children?: ReactNode;
}) {
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const viewport = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(supportsWebGL);
  const [{ width, height }, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const [regions, setRegions] = useState(offlineRegions);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [inputError, setInputError] = useState('');
  const [cloudsEnabled, setCloudsEnabled] = useState(true);
  const [reliefEnabled, setReliefEnabled] = useState(true);
  const [nightEnabled, setNightEnabled] = useState(false);
  const [boundaries, setBoundaries] = useState(true);
  const [graticules, setGraticules] = useState(false);
  const [editing, setEditing] = useState(false);
  const [idleRotation, setIdleRotation] = useState(motionAllowed);
  const [zoomed, setZoomed] = useState(false);
  const [hiddenLabels, setHiddenLabels] = useState('');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<LocationSelection[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [compare, setCompare] = useState<LocationSelection | null>(null);
  const [measure, setMeasure] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<GeoPoint[]>([]);
  const [tour, setTour] = useState<number | null>(null);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [variable, setVariable] = useState(variableOptions[0].id);
  const variables = useVariableAvailability();
  const variableRange = variables.find(({ id }) => id === variable) ?? variableOptions[0];
  const [variableSearch, setVariableSearch] = useState('');
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [periodNotice, setPeriodNotice] = useState('');
  const [period, setPeriod] = useState({ start: 1990, end: 2025 });
  const [periodError, setPeriodError] = useState('');
  useEffect(() => {
    let active = true;
    void import('./countries-50m.json').then((module) => {
      if (active) setCountries((module.default as CountryCollection).features);
    }).catch((error: unknown) => console.error('Country boundaries could not be loaded:', error));
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const start = Math.min(variableRange.end, Math.max(variableRange.start, period.start));
    const end = Math.max(start, Math.min(variableRange.end, period.end));
    if (start !== period.start || end !== period.end) {
      setPeriodNotice(`Period adjusted to the available years ${variableRange.start}–${variableRange.end}.`);
      setPeriod({ start, end });
    }
  }, [variableRange.start, variableRange.end, period.start, period.end]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDateB, setSelectedDateB] = useState('');
  const [playing, setPlaying] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [screenCoords, setScreenCoords] = useState<{ x: number; y: number } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  function updateScreenPosition(lat: number, lng: number) {
    if (globe.current) {
      const coords = globe.current.getScreenCoords(lat, lng, 0.05);
      if (coords && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
        setScreenCoords((prev) => {
          if (!prev) return coords;
          if (Math.hypot(coords.x - prev.x, coords.y - prev.y) > 1.5) {
            return coords;
          }
          return prev;
        });
      }
    }
  }
  const flightTimers = useRef<number[]>([]);
  const selectedId = location?.kind === 'region' ? location.id : null;
  const selected = useMemo(() => {
    if (!location) return undefined;
    if (location.kind === 'region') return regions.find(({ id }) => id === selectedId);
    const country = location.label || findCountryAt(location.lat, location.lng, countries);
    const name = country
      ? `${country} (${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°)`
      : `Coordinates (${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°)`;
    return { ...location, id: null, name, cell: undefined };
  }, [location, regions, selectedId, countries]);
  const targetB = useMemo(() => {
    if (!compare) return undefined;
    if (compare.kind === 'region') return regions.find(({ id }) => id === compare.id);
    const country = compare.label || findCountryAt(compare.lat, compare.lng, countries);
    const name = country
      ? `${country} (${compare.lat.toFixed(2)}°, ${compare.lng.toFixed(2)}°)`
      : `Coordinates (${compare.lat.toFixed(2)}°, ${compare.lng.toFixed(2)}°)`;
    return { ...compare, id: null, name, cell: undefined };
  }, [compare, regions, countries]);
  const keyA = locationKey(location);
  const keyB = locationKey(compare);
  const markers = useMemo(() => [
    ...regions.map((region) => ({ ...region, key: region.id })),
    ...(selected?.id === null ? [{ ...selected, key: keyA }] : []),
    ...(targetB?.id === null && keyB !== keyA ? [{ ...targetB, key: keyB }] : []),
  ], [regions, selected, targetB, keyA, keyB]);
  const worldMap = naturalEarth as WorldMap;
  const countryLabels = useMemo(() => countries.map((country) => ({
    key: `country:${country.properties.name}`,
    name: sanitizeGlobeText(country.properties.name),
    lat: country.properties.lat,
    lng: country.properties.lng,
    country: true as const,
  })), [countries]);
  const labels = useMemo(() => [...markers, ...(zoomed ? countryLabels : [])], [markers, countryLabels, zoomed]);

  function updateLabelSpacing() {
    const world = globe.current;
    if (!world || !ready) return;
    const view = world.pointOfView();
    const camera = world.getCoords(view.lat, view.lng);
    const preferred = [...markers].sort((a, b) => Number(b.key === keyA || b.key === keyB)
      - Number(a.key === keyA || a.key === keyB));
    const used: { x: number; y: number; width: number }[] = [];
    const hidden: string[] = [];
    const candidates = [...preferred, ...(zoomed ? countryLabels : [])];
    for (const marker of candidates) {
      const point = world.getCoords(marker.lat, marker.lng);
      if (camera.x * point.x + camera.y * point.y + camera.z * point.z < 0) continue;
      const mapped = world.getScreenCoords(marker.lat, marker.lng, 0.02);
      const labelWidth = Math.min(150, 24 + marker.name.length * 4);
      if (used.some((label) => Math.abs(label.y - mapped.y) < 19
        && Math.abs(label.x - mapped.x) < (label.width + labelWidth) / 2)) {
        hidden.push(marker.key);
      } else {
        used.push({ ...mapped, width: labelWidth });
      }
    }
    setHiddenLabels(hidden.join('|'));
  }

  const refreshLabelSpacing = useEffectEvent(updateLabelSpacing);
  useEffect(() => refreshLabelSpacing(), [ready, labels, width, height]);
  const reportA = useLocationReport(location, variable, step !== null, period.start, period.end);
  const reportB = useLocationReport(keyA === keyB ? null : compare, variable, step !== null, period.start, period.end);
  const issues = reportA?.series && reportB?.series ? comparisonIssues(reportA.series, reportB.series) : [];
  const comparable = issues.length === 0;
  const trendIssue = trendComparisonIssue(reportA?.trend, reportB?.trend);

  // Background AI synthesis prefetch: caches Gemini 3 response once, preventing token waste on reopen
  useEffect(() => {
    if (selected && reportA?.series && reportA?.trend && reportA.trend.direction !== 'not_evaluable') {
      void prefetchExplanation(selected.name, reportA.series, reportA.trend);
    }
  }, [selected?.name, reportA?.series, reportA?.trend]);
  const reports = [
    { key: keyA, place: selected, report: reportA, color: '#197caa' },
    { key: keyB, place: targetB, report: reportB, color: '#a04194' },
  ];
  const pointsA = reportA?.series?.points;
  const pointsB = reportB?.series?.points;
  const dates = useMemo(() => observationDates([...(pointsA ?? []), ...(comparable ? pointsB ?? [] : [])]), [pointsA, pointsB, comparable]);
  const visibleDate = dates.includes(selectedDate) ? selectedDate : dates.at(-1) ?? '';
  const bounds = useMemo<readonly [number, number]>(() => {
    const values = [...(pointsA ?? []), ...(comparable ? pointsB ?? [] : [])].flatMap(({ value }) => value === null ? [] : [value]);
    for (const [points, trend] of [[pointsA, reportA?.trend], ...(comparable ? [[pointsB, reportB?.trend] as const] : [])] as const) {
      const line = trendLine(points ?? [], trend);
      if (line) values.push(line.start, line.end);
    }
    return values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
  }, [pointsA, pointsB, comparable, reportA?.trend, reportB?.trend]);
  const gridCell = reportA?.series?.representative_grid_cell;
  const gridResolution = reportA?.series?.spatial_resolution;
  const cell = useMemo(() => gridOutline(gridCell, gridResolution), [gridCell, gridResolution]);
  const area = selectedId ? studyAreas[selectedId] : null;

  // Active scientific profile defining variable-specific color ramps and kinematics
  const activeProfile = useMemo(() => getVariableProfile(variable), [variable]);

  const paths = useMemo(() => {
    const path = (points: GeoPath, color: string, altitude: number) => ({
      points: points.map(([lat, lng]) => ({ lat, lng, altitude })),
      color,
    });
    const result = [
      ...(zoomed && boundaries ? worldMap.paths.map((points) => path(points, '#b7ccd5', 0.012)) : []),
      ...(area ? [path(area, '#ffcd70', 0.018)] : []),
      ...(cell ? [path(cell, '#90f5b1', 0.022)] : []),
    ];

    // Geodesic Doppler weather radar range rings for precipitation
    if (variable === 'PRECTOTCORR' && selected) {
      result.push(...computeRadarRangeRings(selected.lat, selected.lng, [60, 160], 0.014));
    }
    if (variable === 'PRECTOTCORR' && targetB && keyA !== keyB) {
      result.push(...computeRadarRangeRings(targetB.lat, targetB.lng, [60, 160], 0.014));
    }

    return result;
  }, [zoomed, boundaries, worldMap, area, cell, variable, selected?.lat, selected?.lng, targetB?.lat, targetB?.lng, keyA, keyB]);
  const searchItems: (Region | Place)[] = search.trim() ? [...regions,
    ...countries.map(({ properties: { name, lat, lng } }) => ({ name, lat, lng }))]
    .filter(({ name }) => name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .includes(search.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''))).slice(0, 8) : [];

  useEffect(() => {
    function refresh() {
      try {
        setInvestigations(readInvestigations(window.localStorage));
      } catch {
        setSaveMessage('Saved investigations could not be read. Existing data has been preserved.');
      }
    }
    refresh();
    function onStorage(event: StorageEvent) {
      if (event.key === INVESTIGATIONS_KEY || event.key === null) refresh();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const visibleDateRef = useRef(visibleDate);
  visibleDateRef.current = visibleDate;

  useEffect(() => {
    if (!playing || dates.length < 2) return;
    const timer = window.setInterval(() => {
      setSelectedDate((current) => {
        const base = dates.includes(current) ? current : visibleDateRef.current;
        return nextObservationDate(base, dates);
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [playing, dates]);

  useEffect(() => {
    if (dates.length < 2) setPlaying(false);
  }, [dates.length]);

  useEffect(() => {
    if (ready && available && nightEnabled && !reduced && globe.current) {
      return addNightLayer(globe.current);
    }
  }, [available, nightEnabled, ready, reduced]);

  useEffect(() => {
    const controls = globe.current?.controls();
    if (!ready || !controls) return;
    controls.autoRotate = idleRotation && !location && !reduced;
    controls.autoRotateSpeed = 0.38;
  }, [idleRotation, location, ready, reduced]);

  useEffect(() => () => flightTimers.current.forEach(window.clearTimeout), []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]);
    void localApiFetch('/api/v1/regions', { signal })
      .then(async (response) => {
        if (!response.ok) return;
        const entries = readRegions(await response.json());
        if (!signal.aborted) {
          setRegions(entries.length > 0 ? entries : offlineRegions);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    globe.current?.renderer().setPixelRatio(reduced ? 1 : Math.min(window.devicePixelRatio, 2));
  }, [reduced, width, height, ready]);

  useEffect(() => {
    const world = globe.current;
    if (!world || !ready || reduced || !available || !cloudsEnabled) return;

    const scene = world.scene();
    const geometry = new SphereGeometry(world.getGlobeRadius() * 1.009, 64, 32);
    const material = new MeshBasicMaterial({ transparent: true, opacity: 0.72, depthWrite: false });
    const clouds = new Mesh(geometry, material);
    clouds.raycast = () => {};

    let disposed = false;
    let frame = 0;
    let previousTime: number | undefined;
    const texture = new TextureLoader().load(
      `${import.meta.env.BASE_URL}earth-clouds.png`,
      (image) => {
        if (disposed) return;
        image.colorSpace = SRGBColorSpace;
        material.map = image;
        material.needsUpdate = true;
        scene.add(clouds);

        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          function rotate(time: number) {
            if (previousTime !== undefined) {
              clouds.rotation.y -= Math.min(time - previousTime, 50) * 0.000012;
            }
            previousTime = time;
            frame = requestAnimationFrame(rotate);
          }
          frame = requestAnimationFrame(rotate);
        }
      },
      undefined,
      () => console.warn('The globe cloud texture could not be loaded.'),
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      scene.remove(clouds);
      texture.dispose();
      material.dispose();
      geometry.dispose();
    };
  }, [available, cloudsEnabled, ready, reduced]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([{ contentRect }]) => {
      const w = Math.floor(contentRect.width) || window.innerWidth;
      const h = Math.floor(contentRect.height) || window.innerHeight;
      setSize({ width: w, height: h });
    });
    observer.observe(element);
    const onContextLost = () => setAvailable(false);
    element.addEventListener('webglcontextlost', onContextLost, true);
    return () => {
      observer.disconnect();
      element.removeEventListener('webglcontextlost', onContextLost, true);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  function cancelFlight() {
    flightTimers.current.forEach(window.clearTimeout);
    flightTimers.current = [];
  }

  function cameraTo(view: Partial<typeof initialView>, flight = false) {
    cancelFlight();
    const world = globe.current;
    if (!available || !world) return;
    const animate = !reduced && motionAllowed();
    if (!flight || !animate) {
      world.pointOfView(view, animate ? 450 : 0);
      return;
    }
    const current = world.pointOfView();
    world.pointOfView({ altitude: Math.max(current.altitude, 2.2) }, 250);
    flightTimers.current = [
      window.setTimeout(() => world.pointOfView({ lat: view.lat, lng: view.lng }, 620), 250),
      window.setTimeout(() => world.pointOfView({ altitude: view.altitude ?? 0.85 }, 400), 870),
    ];
  }

  function visit(next: LocationSelection, point: GeoPoint, flight = true) {
    setInputError('');
    setEditing(false);
    setIdleRotation(false);
    onSelect(next);
    const key = locationKey(next);
    setHistory((previous) => [next, ...previous.filter((item) => locationKey(item) !== key)].slice(0, 8));
    cameraTo({ ...point, altitude: 0.85 }, flight);
    updateScreenPosition(point.lat, point.lng);
    setIsInspectorOpen(true);
    setIsDrawerOpen(false);
    if (flight) {
      window.setTimeout(() => updateScreenPosition(point.lat, point.lng), 700);
      window.setTimeout(() => updateScreenPosition(point.lat, point.lng), 1100);
    }
  }

  function selectMarker(marker: object) {
    const item = markers.find((candidate) => candidate === marker);
    if (!item) return;
    if (measure) {
      addMeasurement(item);
      return;
    }
    visit(item.id ? { kind: 'region', id: item.id } : { kind: 'coordinates', lat: item.lat, lng: item.lng }, item);
  }

  function addMeasurement(point: GeoPoint) {
    setMeasurePoints((previous) => previous.length === 1 ? [...previous, point] : [point]);
  }

  function moveTour(index: number) {
    if (!regions.length) return;
    const next = (index + regions.length) % regions.length;
    setTour(next);
    const region = regions[next];
    visit({ kind: 'region', id: region.id }, region);
  }

  const advanceTour = useEffectEvent(moveTour);

  useEffect(() => {
    if (!tourPlaying || tour === null) return;
    const timer = window.setTimeout(() => {
      if (tour + 1 >= regions.length) setTourPlaying(false);
      else advanceTour(tour + 1);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [tour, tourPlaying, regions]);

  function frameBothLocations(a: GeoPoint, b: GeoPoint) {
    const dist = distanceKm(a, b);
    const mid = sphericalMidpoint(a, b);
    const altitude = Math.min(3.4, Math.max(1.4, 0.9 + (dist / 10000) * 1.5));
    cameraTo({ lat: mid.lat, lng: mid.lng, altitude }, true);
  }

  function showStep(next: number) {
    setStep(next);
    setTourPlaying(false);
    setPlaying(next === 1 && dates.length > 1);
    if (next === 0) {
      const anchor = regions.find(({ id }) => id === 'amazon');
      if (anchor) visit({ kind: 'region', id: anchor.id }, anchor);
      setVariable('T2M');
      setPeriod({ start: 1990, end: 2025 });
      setPeriodNotice('');
      setSelectedDate('');
      setCompare(null);
    }
    if (next === 3 && regions[1]) {
      const other = regions.find(({ id }) => id === (selectedId === 'sahel' ? 'amazon' : 'sahel'));
      if (other) {
        setCompare({ kind: 'region', id: other.id });
        const anchor = regions.find(({ id }) => id === selectedId);
        if (anchor) {
          window.setTimeout(() => frameBothLocations(anchor, other), 450);
        }
      }
    }
    if (next > 0) setIsInspectorOpen(true);
  }

  function loadTeleconnectionPreset(presetId: string) {
    const preset = teleconnectionPresets.find((item) => item.id === presetId);
    if (!preset) return;
    const regA = regions.find((r) => r.id === preset.a);
    const regB = regions.find((r) => r.id === preset.b);
    if (regA) {
      visit({ kind: 'region', id: regA.id }, regA);
    }
    if (regB) {
      setCompare({ kind: 'region', id: regB.id });
    }
    setVariable(preset.variable);
    setPeriod({ start: 1990, end: 2025 });
    setPeriodNotice('');
    setSelectedDate('');
    if (regA && regB) {
      window.setTimeout(() => frameBothLocations(regA, regB), 450);
    }
  }

  function markerColor(marker: typeof markers[number]) {
    if (hovered === marker.key) return '#fff1a4';
    const report = marker.key === keyA ? reportA : marker.key === keyB ? reportB : undefined;
    if (visibleDate && report?.series && (marker.key === keyA || comparable)) {
      const value = pointValue(report.series.points, visibleDate);
      if (value === null) return '#8b99ab';
      const position = bounds[1] === bounds[0] ? 0.5
        : Math.min(1, Math.max(0, (value - bounds[0]) / (bounds[1] - bounds[0])));
      return `hsl(${210 - 185 * position}, 90%, 62%)`;
    }
    if (marker.key === keyA) return '#ffcd70';
    return marker.key === keyB ? '#f0a4e5' : '#79dcff';
  }

  interface GlobeArc {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    color: string | string[];
    altitude: number;
    stroke: number;
    dashLength?: number;
    dashGap?: number;
    dashAnimateTime?: number;
  }

  // Stable reference for the comparison arc so ThreeDigest does not thrash / flicker on re-renders
  const lastArcRef = useRef<GlobeArc | null>(null);
  const lastArcKey = useRef<string>('');

  const allArcs = useMemo<GlobeArc[]>(() => {
    const result: GlobeArc[] = [];
    // 1. Manual distance measurement arc (amber, solid) - 100% preserved
    if (measurePoints.length === 2) {
      result.push({
        start: measurePoints[0],
        end: measurePoints[1],
        color: '#ffcd70',
        altitude: computeArcAltitude(measurePoints[0], measurePoints[1]),
        stroke: 0.65,
        dashLength: 1,
        dashGap: 0,
        dashAnimateTime: 0,
      });
    }
    // 2. Planetary teleconnection / spatial comparison arc (luminous gradient tube, elevated above terrain, solid & crisp)
    if (selected && targetB && keyA !== keyB) {
      const currentKey = `${selected.lat.toFixed(4)},${selected.lng.toFixed(4)}->${targetB.lat.toFixed(4)},${targetB.lng.toFixed(4)}`;
      const alt = computeArcAltitude(
        { lat: selected.lat, lng: selected.lng },
        { lat: targetB.lat, lng: targetB.lng }
      );
      if (lastArcKey.current === currentKey && lastArcRef.current) {
        result.push(lastArcRef.current);
      } else {
        const newArc: GlobeArc = {
          start: { lat: selected.lat, lng: selected.lng },
          end: { lat: targetB.lat, lng: targetB.lng },
          color: ['#38bdf8', '#818cf8', '#c084fc', '#f59e0b'],
          altitude: alt,
          stroke: 0.75,
          dashLength: 1,
          dashGap: 0,
          dashAnimateTime: 0,
        };
        lastArcRef.current = newArc;
        lastArcKey.current = currentKey;
        result.push(newArc);
      }
    } else {
      lastArcRef.current = null;
      lastArcKey.current = '';
    }
    return result;
  }, [measurePoints, selected?.lat, selected?.lng, targetB?.lat, targetB?.lng, keyA, keyB]);

  const activeRings = useMemo(() => {
    if (reduced || !motionAllowed()) return [];
    interface RingItem {
      lat: number;
      lng: number;
      color: (t: number) => string;
      maxR: number;
      propagationSpeed: number;
      repeatPeriod: number;
    }
    const rings: RingItem[] = [];
    if (selected) {
      const valA = pointValue(reportA?.series?.points, visibleDate);
      rings.push({
        lat: selected.lat,
        lng: selected.lng,
        color: (t: number) => activeProfile.getRingColor(t, valA),
        maxR: activeProfile.ringMaxRadius,
        propagationSpeed: activeProfile.ringPropagationSpeed,
        repeatPeriod: activeProfile.ringRepeatPeriod,
      });
    }
    if (targetB && keyA !== keyB) {
      const valB = pointValue(reportB?.series?.points, visibleDate);
      rings.push({
        lat: targetB.lat,
        lng: targetB.lng,
        color: (t: number) => activeProfile.getRingColor(t, valB),
        maxR: activeProfile.ringMaxRadius,
        propagationSpeed: activeProfile.ringPropagationSpeed,
        repeatPeriod: activeProfile.ringRepeatPeriod,
      });
    }
    return rings;
  }, [
    selected?.lat,
    selected?.lng,
    targetB?.lat,
    targetB?.lng,
    keyA,
    keyB,
    reduced,
    activeProfile,
    reportA?.series?.points,
    reportB?.series?.points,
    visibleDate,
  ]);

  // Track 3D screen coordinate of active target during rotations / interactions without idle thrashing
  useEffect(() => {
    if (!selected) return;
    updateScreenPosition(selected.lat, selected.lng);
    if (!idleRotation) return;
    const interval = window.setInterval(() => {
      updateScreenPosition(selected.lat, selected.lng);
    }, 250);
    return () => window.clearInterval(interval);
  }, [selected?.lat, selected?.lng, isInspectorOpen, idleRotation]);

  function handleSelectCoordinates(lat: number, lng: number) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setInputError('Enter a latitude from −90 to 90 and a longitude from −180 to 180. Use a decimal point.');
      return;
    }
    setInputError('');
    const country = findCountryAt(lat, lng, countries);
    visit({ kind: 'coordinates', lat, lng, label: country }, { lat, lng });
  }

  function handleSelectSearchItem(place: Region | Place) {
    setSearch('');
    visit('id' in place ? { kind: 'region', id: place.id } : { kind: 'coordinates', lat: place.lat, lng: place.lng }, place);
  }

  function handleSelectHistory(item: LocationSelection) {
    const place = item.kind === 'region' ? regions.find(({ id }) => id === item.id) : item;
    if (place) visit(item, place);
  }

  function handleSaveInvestigation(name: string) {
    if (!location) {
      setSaveMessage('Choose a location before saving.');
      return;
    }
    try {
      const updated = saveInvestigation(window.localStorage, {
        name, variable, location, comparison: compare, period,
      }, crypto.randomUUID(), new Date().toISOString());
      setInvestigations(updated);
      setSaveMessage('Investigation saved on this device.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save the investigation.');
    }
  }

  function handleLoadInvestigation(item: Investigation) {
    const supported = variables.find(({ id }) => id === item.variable);
    const place = item.location.kind === 'region'
      ? regions.find(({ id }) => id === (item.location as { id: string }).id)
      : item.location;
    const other = item.comparison?.kind === 'region'
      ? regions.find(({ id }) => id === (item.comparison as { id: string }).id)
      : item.comparison;
    if (!supported || !place || (item.comparison && !other)
      || item.period.start < supported.start || item.period.end > supported.end) {
      setSaveMessage('This investigation uses a variable, location, or period that is currently unavailable.');
      return;
    }
    setPlaying(false);
    setStep(null);
    setVariableSearch('');
    setVariable(item.variable);
    setPeriod(item.period);
    setPeriodNotice('');
    setSelectedDate('');
    setCompare(item.comparison);
    visit(item.location, place);
    setSaveMessage(`Loaded “${item.name}”.`);
  }

  function handleDeleteInvestigation(id: string) {
    try {
      setInvestigations(deleteInvestigation(window.localStorage, id));
      setSaveMessage('Investigation deleted.');
    } catch {
      setSaveMessage('Could not delete the saved investigation.');
    }
  }

  return (
    <section className="relative w-full h-full overflow-hidden bg-slate-950 select-none" aria-labelledby="region-heading">
      {/* Base Layer: Persistent Fullscreen 3D Globe Viewport */}
      <div
        className="absolute inset-0 w-full h-full z-0 overflow-hidden"
        ref={viewport}
        onPointerDown={() => {
          setIdleRotation(false);
          setTourPlaying(false);
          cancelFlight();
        }}
        onWheel={() => {
          setIdleRotation(false);
          cancelFlight();
        }}
      >
        {available && width > 0 && height > 0 && (
          <GlobeBoundary onFailure={() => setAvailable(false)}>
            <Globe
              ref={globe}
              width={width}
              height={height}
              globeImageUrl={`${import.meta.env.BASE_URL}earth.jpg`}
              bumpImageUrl={reduced || !reliefEnabled ? null : `${import.meta.env.BASE_URL}earth-topology.png`}
              backgroundColor="#080f1d"
              animateIn={false}
              showAtmosphere={!reduced}
              showGraticules={graticules || editing}
              onGlobeReady={() => {
                setReady(true);
                const controls = globe.current?.controls();
                if (controls) {
                  controls.minDistance = 130;
                  controls.maxDistance = 650;
                }
                globe.current?.pointOfView(initialView, 0);
              }}
              onZoom={({ altitude }) => {
                setZoomed((current) => current ? altitude < 1.55 : altitude < 1.35);
                updateLabelSpacing();
                if (selected) {
                  updateScreenPosition(selected.lat, selected.lng);
                }
              }}
              onGlobeClick={({ lat, lng }) => {
                const point = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
                const country = findCountryAt(point.lat, point.lng, countries);
                if (measure) addMeasurement(point);
                else {
                  updateScreenPosition(point.lat, point.lng);
                  visit({ kind: 'coordinates', ...point, label: country }, point, false);
                }
              }}
              polygonsData={boundaries ? countries : emptyCountries}
              polygonCapColor={(feature) => countryColors[(feature as CountryFeature).properties.color % countryColors.length]}
              polygonSideColor={polygonSideColorStatic}
              polygonStrokeColor={polygonStrokeColorStatic}
              polygonAltitude={0.0015}
              polygonLabel={(feature) => (feature as CountryFeature).properties.name}
              onPolygonClick={(feature, _, coords) => {
                const point = { lat: Number(coords.lat.toFixed(5)), lng: Number(coords.lng.toFixed(5)) };
                const country = (feature as CountryFeature)?.properties?.name || (feature as CountryFeature)?.properties?.nameEn;
                if (measure) addMeasurement(point);
                else {
                  updateScreenPosition(point.lat, point.lng);
                  visit({ kind: 'coordinates', ...point, label: country }, point, false);
                }
              }}
              pointsData={markers}
              pointColor={(point) => markerColor(point as typeof markers[number])}
              pointRadius={(point) => {
                const { key } = point as typeof markers[number];
                const base = key === hovered || key === keyA || key === keyB ? 1.3 : 0.75;
                return (key === keyA || key === keyB) ? base * activeProfile.pointRadiusFactor : base;
              }}
              pointAltitude={(point) => {
                const isTarget = (point as typeof markers[number]).key === keyA || (point as typeof markers[number]).key === keyB;
                if (isTarget) return activeProfile.pointAltitude;
                return (point as typeof markers[number]).id === null ? 0.004 : 0.003;
              }}
              pointLabel={(point) => {
                const label = document.createElement('span');
                label.textContent = markers.find((marker) => marker === point)?.name ?? '';
                return label.innerHTML;
              }}
              pointsTransitionDuration={0}
              onPointHover={(point) => setHovered((point as typeof markers[number] | null)?.key ?? null)}
              onPointClick={selectMarker}
              labelsData={hiddenLabels ? labels.filter(({ key }) => !hiddenLabels.split('|').includes(key)) : labels}
              labelText={(point) => {
                const marker = point as (typeof markers[number] & { country?: true });
                if (marker.country) return sanitizeGlobeText(marker.name);
                const prefix = keyB && keyA !== keyB ? marker.key === keyA ? 'A · ' : marker.key === keyB ? 'B · ' : '' : '';
                const trend = marker.key === keyA ? reportA?.trend : marker.key === keyB ? reportB?.trend : undefined;
                const rate = trend?.rate_per_decade;
                const brief = sanitizeGlobeText(marker.name.split(' (')[0]);
                const sign = rate != null ? (rate > 0 ? '+' : rate < 0 ? '-' : '') : '';
                return `${prefix}${zoomed ? sanitizeGlobeText(marker.name) : brief}${rate != null && trend
                  ? ` · ${sign}${Math.abs(rate).toFixed(2)} ${sanitizeGlobeText(trend.rate_unit)}`
                  : ''}`;
              }}
              labelColor={(point) => (point as { country?: true }).country ? '#d8f1f4' : '#fff'}
              labelSize={(point) => (point as { country?: true }).country ? 0.85 : 1.3}
              labelDotRadius={0}
              labelsTransitionDuration={0}
              onLabelClick={(point) => {
                if (!(point as { country?: true }).country) selectMarker(point);
              }}
              pathsData={paths}
              pathPoints="points"
              pathPointLat="lat"
              pathPointLng="lng"
              pathPointAlt="altitude"
              pathColor="color"
              pathTransitionDuration={0}
              arcsData={allArcs}
              arcStartLat={(entry: unknown) => (entry as GlobeArc).start.lat}
              arcStartLng={(entry: unknown) => (entry as GlobeArc).start.lng}
              arcEndLat={(entry: unknown) => (entry as GlobeArc).end.lat}
              arcEndLng={(entry: unknown) => (entry as GlobeArc).end.lng}
              arcAltitude={(entry: unknown) => (entry as GlobeArc).altitude}
              arcColor={(entry: unknown) => (entry as GlobeArc).color}
              arcStroke={(entry: unknown) => (entry as GlobeArc).stroke}
              arcDashLength={(entry: unknown) => (entry as GlobeArc).dashLength ?? 1}
              arcDashGap={(entry: unknown) => (entry as GlobeArc).dashGap ?? 0}
              arcDashAnimateTime={(entry: unknown) => (entry as GlobeArc).dashAnimateTime ?? 0}
              arcsTransitionDuration={0}
              ringsData={activeRings}
              ringColor={(d: unknown) => (d as { color?: string | ((t: number) => string) }).color || '#38bdf8'}
              ringMaxRadius={(d: unknown) => (d as { maxR?: number })?.maxR ?? activeProfile.ringMaxRadius}
              ringPropagationSpeed={(d: unknown) => (d as { propagationSpeed?: number })?.propagationSpeed ?? activeProfile.ringPropagationSpeed}
              ringRepeatPeriod={(d: unknown) => (d as { repeatPeriod?: number })?.repeatPeriod ?? activeProfile.ringRepeatPeriod}
            />
          </GlobeBoundary>
        )}
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/90 z-20">
            <div
              className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-sky-400/40 shadow-2xl text-center flex flex-col items-center gap-4"
              role="status"
              aria-label="2D Accessible Mode Status"
            >
              <div className="w-14 h-14 rounded-full bg-sky-950/80 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-inner">
                <svg
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-sky-100 tracking-wide">
                  2D Accessible Mode Active
                </h3>
                <p className="text-xs text-sky-200/80 leading-relaxed">
                  WebGL hardware acceleration is offline or unsupported in this environment. All observational telemetry, empirical trend calculations, teleconnections, and climate projections remain fully accessible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="btn-tactile px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs tracking-wider uppercase transition-colors shadow-lg border border-sky-400/30 cursor-pointer flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                <span>Browse Planetary Biomes</span>
              </button>
            </div>
          </div>
        )}
        {ready && available && (
          <>
            <div className="globe-overlay pointer-events-none">
              <div className="globe-zoom pointer-events-auto" aria-label="Globe zoom">
                <button type="button" className="btn-tactile" aria-label="Zoom in" onClick={() => {
                  setIdleRotation(false);
                  cameraTo({ altitude: Math.max(0.32, (globe.current?.pointOfView().altitude ?? 2.4) / 1.4) });
                }}>+</button>
                <button type="button" className="btn-tactile" aria-label="Zoom out" onClick={() => {
                  setIdleRotation(false);
                  cameraTo({ altitude: Math.min(5.4, (globe.current?.pointOfView().altitude ?? 2.4) * 1.4) });
                }}>−</button>
                <button type="button" className="btn-tactile" onClick={() => cameraTo(initialView)}>Reset</button>
              </div>
              {hovered && (() => {
                const marker = markers.find(({ key }) => key === hovered);
                return marker && <p className="globe-hover pointer-events-auto">{marker.name} · {marker.lat.toFixed(2)}°, {marker.lng.toFixed(2)}°</p>;
              })()}
            </div>

            <VariableRadarLegend
              variableId={variable}
              currentValue={selected ? pointValue(reportA?.series?.points, visibleDate) : null}
              unit={variableRange.unit}
              date={visibleDate}
              locationName={selected?.name}
              isDeckOpen={isInspectorOpen}
            />
          </>
        )}
        <div className="absolute bottom-2 left-4 z-10 pointer-events-none text-[10px] text-sky-300/40 select-none">
          {area && 'Gold: approximate study area. '}
          {cell && 'Green: representative grid cell. '}
          Earth: NASA Blue Marble, WebGL Earth and three-globe. Borders: Natural Earth.
        </div>
      </div>

      {/* Floating Top-Left Pill to reopen Drawer */}
      {!isDrawerOpen && (
        <button
          type="button"
          className="btn-expand-sidebar-floating"
          onClick={() => setIsDrawerOpen(true)}
          title="Open study regions & variable catalog"
          aria-label="Open study regions & variable catalog"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span>Study Regions & Catalog</span>
        </button>
      )}

      {/* Layer 2: Slide-Over Aerospace Drawer */}
      <StudyRegionsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        heading={heading}
        regions={regions}
        selectedId={selectedId}
        hoveredId={hovered}
        onHoverRegion={setHovered}
        onSelectRegion={(reg) => visit({ kind: 'region', id: reg.id }, reg)}
        search={search}
        onSearchChange={setSearch}
        searchItems={searchItems}
        onSelectSearchItem={handleSelectSearchItem}
        step={step}
        onShowStep={showStep}
        onExitStep={() => { setStep(null); setPlaying(false); }}
        presentationSteps={presentation}
        selected={selected}
        gridCell={gridCell || selected?.cell}
        onSelectCoordinates={handleSelectCoordinates}
        inputError={inputError}
        cameraTo={cameraTo}
        initialView={initialView}
        tour={tour}
        tourPlaying={tourPlaying}
        onMoveTour={moveTour}
        onToggleTourPlaying={() => {
          if (tourPlaying) setTourPlaying(false);
          else {
            if (tour === null || tour + 1 >= regions.length) moveTour(0);
            setTourPlaying(true);
          }
        }}
        reduced={reduced}
        onToggleReduced={setReduced}
        cloudsEnabled={cloudsEnabled}
        onToggleClouds={setCloudsEnabled}
        reliefEnabled={reliefEnabled}
        onToggleRelief={setReliefEnabled}
        nightEnabled={nightEnabled}
        onToggleNight={setNightEnabled}
        boundaries={boundaries}
        onToggleBoundaries={setBoundaries}
        graticules={graticules}
        onToggleGraticules={setGraticules}
        idleRotation={idleRotation}
        onToggleIdleRotation={setIdleRotation}
        measure={measure}
        onToggleMeasure={(m) => {
          setMeasure(m);
          setMeasurePoints([]);
        }}
        measureDistanceKm={measurePoints.length === 2 ? distanceKm(measurePoints[0], measurePoints[1]) : null}
        history={history}
        onSelectHistory={handleSelectHistory}
        investigations={investigations}
        saveMessage={saveMessage}
        onSaveInvestigation={handleSaveInvestigation}
        onLoadInvestigation={handleLoadInvestigation}
        onDeleteInvestigation={handleDeleteInvestigation}
        location={location}
      >
        {children}
      </StudyRegionsDrawer>

      {/* Layer: Off-screen Investigation Report (Export / Print / Zero Layout Impact) */}
      {reportA?.series && selected && (
        <div className="hidden" aria-hidden="true">
          <InvestigationReport
            variableName={variableRange.name}
            variable={variable}
            period={period}
            comparisonIssues={reportB?.series && keyA !== keyB ? issues : undefined}
            trendComparisonNote={reportB?.series && keyA !== keyB ? trendIssue : undefined}
            locations={[
              { name: selected.name, series: reportA.series, trend: reportA.trend },
              ...(reportB?.series && targetB && keyA !== keyB
                ? [{ name: targetB.name, series: reportB.series, trend: reportB.trend }]
                : []),
            ]}
          />
        </div>
      )}

      {/* Active Target Banner when Bottom Telemetry Deck is closed */}
      {selected && !isInspectorOpen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-950/90 backdrop-blur-md border border-sky-500/30 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-200 font-medium">{selected.name}</span>
          <button
            type="button"
            onClick={() => {
              setIsInspectorOpen(true);
              updateScreenPosition(selected.lat, selected.lng);
            }}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer"
          >
            Open Telemetry Deck
          </button>
        </div>
      )}

      {/* Layer 3: Bottom Telemetry Deck */}
      <HolographicInspectorModal
        isOpen={isInspectorOpen && !!selected}
        onClose={() => setIsInspectorOpen(false)}
        screenCoords={screenCoords}
        place={selected ?? null}
        location={location}
        targetB={targetB ?? null}
        compare={compare}
        onSetCompare={setCompare}
        variable={variable}
        variableRange={variableRange}
        availableVariables={variableOptions}
        onSelectVariable={setVariable}
        onSelectRegion={(id) => {
          const reg = regions.find((r) => r.id === id);
          if (reg) {
            visit({ kind: 'region', id }, reg);
          } else {
            onSelect({ kind: 'region', id });
          }
        }}
        period={period}
        regions={regions}
        teleconnectionPresets={teleconnectionPresets}
        onLoadTeleconnectionPreset={loadTeleconnectionPreset}
        reportA={reportA}
        reportB={reportB}
        dates={dates}
        visibleDate={visibleDate}
        onSetVisibleDate={setSelectedDate}
        playing={playing}
        onSetPlaying={setPlaying}
        bounds={bounds}
        onGoToA={() => selected && cameraTo({ lat: selected.lat, lng: selected.lng, altitude: 0.85 }, true)}
        onGoToB={() => targetB && cameraTo({ lat: targetB.lat, lng: targetB.lng, altitude: 0.85 }, true)}
        onFrameBoth={() => selected && targetB && frameBothLocations(selected, targetB)}
      />

      {/* Layer 4: Floating Copilot Trigger */}
      <FloatingCopilotTrigger
        activeLocation={selected}
        activeVariable={variable}
        activeTrend={reportA?.trend}
        onSelectLocation={(loc) => {
          if (loc.kind === 'region') {
            const r = regions.find((cand) => cand.id === loc.id);
            if (r) visit(loc, r);
          } else {
            const country = loc.label || findCountryAt(loc.lat, loc.lng, countries);
            visit({ ...loc, label: country }, { lat: loc.lat, lng: loc.lng });
          }
        }}
        onSelectVariable={setVariable}
      />
    </section>
  );
}
