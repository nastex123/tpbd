import { Component, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { Mesh, MeshBasicMaterial, SphereGeometry, SRGBColorSpace, TextureLoader } from 'three';
import { parseCoordinate, type LocationSelection } from '../../stores/navigationStore';
import { deleteInvestigation, INVESTIGATIONS_KEY, readInvestigations, saveInvestigation, type Investigation } from '../../stores/investigations';
import { distanceKm, findCountryAt, gridOutline, initialView, type CountryCollection, type CountryFeature, type GeoPath, type GeoPoint, type Place, type WorldMap } from './globeGeography';
import { addNightLayer } from './nightLayer';
import { locationKey, pointValue, useLocationReport, useVariableAvailability, variableOptions } from './globeData';
import { HistoryChart } from './HistoryChart';
import { InvestigationReport } from './InvestigationReport';
import { prefetchExplanation, ScientificExplanation } from './ScientificExplanation';
import { DataDetectiveWorkbench } from '../detective/DataDetectiveWorkbench';
import { HolographicInspectorModal } from '../detective/HolographicInspectorModal';
import { FloatingCopilotTrigger } from '../copilot/FloatingCopilotTrigger';
import { localApiFetch } from './localApi';
import { trendLine } from './trendLine';
import { nextObservationDate, observationDates } from './historyTimeline';
import { comparisonIssues, trendComparisonIssue } from './seriesComparison';
import { computeArcAltitude, sphericalMidpoint } from './teleconnectionComparison';
import naturalEarth from './natural-earth-110m.json';
import './region-globe.css';

type Region = { id: string; name: string; lat: number; lng: number; cell?: string };

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
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
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
  const [sidebarDocked, setSidebarDocked] = useState(false);

  function updateScreenPosition(lat: number, lng: number) {
    if (globe.current) {
      const coords = globe.current.getScreenCoords(lat, lng, 0.05);
      if (coords && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
        setScreenCoords(coords);
      }
    }
  }
  const dataPanel = useRef<HTMLDivElement>(null);
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
  const paths = useMemo(() => {
    const path = (points: GeoPath, color: string, altitude: number) => ({
      points: points.map(([lat, lng]) => ({ lat, lng, altitude })),
      color,
    });
    return [
      ...(zoomed && boundaries ? worldMap.paths.map((points) => path(points, '#b7ccd5', 0.012)) : []),
      ...(area ? [path(area, '#ffcd70', 0.018)] : []),
      ...(cell ? [path(cell, '#90f5b1', 0.022)] : []),
    ];
  }, [zoomed, boundaries, worldMap, area, cell]);
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

  useEffect(() => {
    if (!playing || dates.length < 2) return;
    const timer = window.setInterval(() => setSelectedDate((current) => nextObservationDate(current, dates)), 500);
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
      setSize({ width: Math.floor(contentRect.width), height: Math.floor(contentRect.height) });
    });
    observer.observe(element);
    const onContextLost = () => setAvailable(false);
    element.addEventListener('webglcontextlost', onContextLost, true);
    return () => {
      observer.disconnect();
      element.removeEventListener('webglcontextlost', onContextLost, true);
    };
  }, []);

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
    if (next > 0) dataPanel.current?.scrollIntoView({ block: 'nearest' });
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
    const rings: { lat: number; lng: number; color: string }[] = [];
    if (selected) {
      rings.push({ lat: selected.lat, lng: selected.lng, color: '#38bdf8' });
    }
    if (targetB && keyA !== keyB) {
      rings.push({ lat: targetB.lat, lng: targetB.lng, color: '#f59e0b' });
    }
    return rings;
  }, [selected?.lat, selected?.lng, targetB?.lat, targetB?.lng, keyA, keyB, reduced]);

  // Continuously track 3D screen coordinate of active target during rotations / interactions
  useEffect(() => {
    if (!selected) return;
    updateScreenPosition(selected.lat, selected.lng);
    const interval = window.setInterval(() => {
      updateScreenPosition(selected.lat, selected.lng);
    }, 120);
    return () => window.clearInterval(interval);
  }, [selected?.lat, selected?.lng, isInspectorOpen]);

  return (
    <section className="region-picker" aria-labelledby="region-heading">
      <div className="region-panel" tabIndex={0} role="region" aria-labelledby="region-heading" data-presentation={step !== null || undefined}>
        {heading}
        <h2 id="region-heading">Study regions</h2>
        <div className="globe-actions">
          <button type="button" onClick={() => step === null ? showStep(0) : (setStep(null), setPlaying(false))}>
            {step === null ? 'Presentation' : 'Exit presentation'}
          </button>
          {step !== null && <>
            <p aria-live="polite">{presentation[step]}</p>
            <button type="button" disabled={step === 0} onClick={() => showStep(step - 1)}>Previous step</button>
            <button type="button" disabled={step === presentation.length - 1} onClick={() => showStep(step + 1)}>Next step</button>
          </>}
        </div>
        <p>Choose a study region, click a point on the globe, or enter coordinates.</p>
        <label className="globe-search">
          Find a country or study region
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {search.trim() && (searchItems.length ? <ul aria-label="Search results">
          {searchItems.map((place) => <li key={`${place.name}:${place.lat}`}>
            <button type="button" onClick={() => {
              setSearch('');
              visit('id' in place ? { kind: 'region', id: place.id } : { kind: 'coordinates', lat: place.lat, lng: place.lng }, place);
            }}>{place.name}</button>
          </li>)}
        </ul> : <p role="status">No matching place.</p>)}
        <ul>
          {regions.map((region) => (
            <li key={region.id}>
              <button type="button" aria-pressed={selectedId === region.id}
                data-highlighted={hovered === region.id || undefined}
                onPointerEnter={() => setHovered(region.id)} onPointerLeave={() => setHovered(null)}
                onClick={() => visit({ kind: 'region', id: region.id }, region)}>
                {region.name}
              </button>
            </li>
          ))}
        </ul>
        <form key={JSON.stringify(selected)} onFocus={() => setEditing(true)} onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setEditing(false);
        }} onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const lat = parseCoordinate(String(fields.get('latitude')), 90);
          const lng = parseCoordinate(String(fields.get('longitude')), 180);
          if (lat === null || lng === null) {
            setInputError('Enter a latitude from −90 to 90 and a longitude from −180 to 180. Use a decimal point.');
            return;
          }
          const country = findCountryAt(lat, lng, countries);
          visit({ kind: 'coordinates', lat, lng, label: country }, { lat, lng });
        }}>
          <label>Latitude <input name="latitude" inputMode="decimal" defaultValue={selected?.lat} /></label>
          <label>Longitude <input name="longitude" inputMode="decimal" defaultValue={selected?.lng} /></label>
          <button type="submit">Select coordinates</button>
          {inputError && <p role="alert">{inputError}</p>}
        </form>
        <p role="status">{selected ? `Selected: ${selected.name}` : 'No region selected.'}</p>
        {selected && (
          <p>
            Selected coordinates: {selected.lat}, {selected.lng}.<br />
            {gridCell || selected.cell ? `Representative grid cell: ${gridCell || selected.cell}. Grid values represent an area.` : 'Grid cell and resolution depend on the data source.'}
          </p>
        )}
        {available && <details className="exploration-tools" open={step === null ? undefined : false}>
          <summary>Globe controls and layers</summary>
          <div className="globe-actions">
            <button type="button" onClick={() => cameraTo(initialView)}>Global view</button>
            <button type="button" onClick={() => cameraTo({ lat: 89.9, lng: 0, altitude: 1.6 })}>North pole</button>
            <button type="button" onClick={() => cameraTo({ lat: -89.9, lng: 0, altitude: 1.6 })}>South pole</button>
            <button type="button" onClick={() => moveTour(tour === null ? 0 : tour - 1)}>Previous region</button>
            <button type="button" onClick={() => {
              if (tourPlaying) setTourPlaying(false);
              else {
                if (tour === null || tour + 1 >= regions.length) moveTour(0);
                setTourPlaying(true);
              }
            }}>{tourPlaying ? 'Pause tour' : 'Play tour'}</button>
            <button type="button" onClick={() => moveTour(tour === null ? 0 : tour + 1)}>Next region</button>
          </div>
          <label><input type="checkbox" checked={reduced} onChange={(event) => setReduced(event.target.checked)} /> Reduced graphics</label>
          <label><input type="checkbox" checked={cloudsEnabled} disabled={reduced} onChange={(event) => setCloudsEnabled(event.target.checked)} /> Clouds</label>
          <label><input type="checkbox" checked={reliefEnabled} disabled={reduced} onChange={(event) => setReliefEnabled(event.target.checked)} /> Surface relief</label>
          <label><input type="checkbox" checked={nightEnabled} disabled={reduced} onChange={(event) => setNightEnabled(event.target.checked)} /> Day and night (UTC)</label>
          <label><input type="checkbox" checked={boundaries} onChange={(event) => setBoundaries(event.target.checked)} /> Detailed coastlines when zoomed in</label>
          <label><input type="checkbox" checked={graticules} onChange={(event) => setGraticules(event.target.checked)} /> Latitude and longitude grid</label>
          <label><input type="checkbox" checked={idleRotation} disabled={reduced || !!location} onChange={(event) => setIdleRotation(event.target.checked)} /> Rotate before selecting a location</label>
          <label><input type="checkbox" checked={measure} onChange={(event) => {
            setMeasure(event.target.checked);
            setMeasurePoints([]);
          }} /> Measure distance</label>
          {measure && <p role="status">{measurePoints.length === 2
            ? `${Math.round(distanceKm(measurePoints[0], measurePoints[1])).toLocaleString()} km along the Earth's surface.`
            : 'Choose two points on the globe.'}</p>}
        </details>}
        {history.length > 0 && <details className="exploration-tools">
          <summary>Recently visited</summary>
          <ul>{history.map((item) => {
            const place = item.kind === 'region' ? regions.find(({ id }) => id === item.id) : item;
            return place && <li key={locationKey(item)}><button type="button" onClick={() => visit(item, place)}>
              {'name' in place ? place.name : `${place.lat}, ${place.lng}`}
            </button></li>;
          })}</ul>
        </details>}
        <details className="exploration-tools">
          <summary>Saved investigations</summary>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (!location) {
              setSaveMessage('Choose a location before saving.');
              return;
            }
            const form = event.currentTarget;
            const name = String(new FormData(form).get('investigationName') ?? '').trim();
            try {
              const updated = saveInvestigation(window.localStorage, {
                name, variable, location, comparison: compare, period,
              }, crypto.randomUUID(), new Date().toISOString());
              setInvestigations(updated);
              setSaveMessage('Investigation saved on this device.');
              form.reset();
            } catch (error) {
              setSaveMessage(error instanceof Error ? error.message : 'Could not save the investigation.');
            }
          }}>
            <label>Investigation name <input name="investigationName" maxLength={80} required /></label>
            <button type="submit">Save current investigation</button>
          </form>
          <p role="status">{saveMessage}</p>
          {investigations.length === 0 ? <p>No saved investigations.</p> : <ul>
            {investigations.map((item) => <li key={item.id} className="globe-report">
              <strong>{item.name}</strong>
              <p>{item.variable} · {item.period.start}–{item.period.end}</p>
              <p>{item.source.provider} · {item.source.reference}</p>
              <div className="globe-actions">
                <button type="button" onClick={() => {
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
                }}>Load</button>
                <button type="button" onClick={() => {
                  try {
                    setInvestigations(deleteInvestigation(window.localStorage, item.id));
                    setSaveMessage(`Deleted “${item.name}”.`);
                  } catch {
                    setSaveMessage('Could not delete the saved investigation.');
                  }
                }}>Delete</button>
              </div>
            </li>)}
          </ul>}
        </details>
        {selected && (
          <div className="inspector-dock-banner">
            <div className="inspector-dock-info">
              <span className="dock-badge">ACTIVE TARGET</span>
              <strong>{selected.name}</strong>
            </div>
            <div className="inspector-dock-actions">
              <button
                type="button"
                className="btn-open-inspector"
                onClick={() => {
                  setIsInspectorOpen(true);
                  updateScreenPosition(selected.lat, selected.lng);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                <span>Hologram HUD</span>
              </button>
              <button
                type="button"
                className={`btn-mode-toggle ${sidebarDocked ? 'active' : ''}`}
                onClick={() => setSidebarDocked(!sidebarDocked)}
              >
                {sidebarDocked ? 'Undock' : 'Dock Sidebar'}
              </button>
            </div>
          </div>
        )}
        <div ref={dataPanel}>
          {sidebarDocked ? (
            <DataDetectiveWorkbench
              location={location}
              selectedPlace={selected ?? null}
              targetB={targetB ?? null}
              compare={compare}
              onSetCompare={setCompare}
              variable={variable}
              onSetVariable={setVariable}
              variableRange={variableRange}
              variables={variables}
              period={period}
              onSetPeriod={setPeriod}
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
              hovered={hovered}
              onHover={setHovered}
              onGoToA={() => selected && cameraTo({ lat: selected.lat, lng: selected.lng, altitude: 0.85 }, true)}
              onGoToB={() => targetB && cameraTo({ lat: targetB.lat, lng: targetB.lng, altitude: 0.85 }, true)}
              onFrameBoth={() => selected && targetB && frameBothLocations(selected, targetB)}
            />
          ) : (
            selected && (
              <div className="inspector-floating-notice">
                <div className="notice-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <span>Interactive 3D Hologram Deployed</span>
                </div>
                <p>
                  Comprehensive analytics deck is anchored to <strong>{selected.name.split(' (')[0]}</strong> on the globe with 5 streamlined tabs.
                </p>
                {!isInspectorOpen && (
                  <button
                    type="button"
                    className="btn-reopen-hud"
                    onClick={() => {
                      setIsInspectorOpen(true);
                      updateScreenPosition(selected.lat, selected.lng);
                    }}
                  >
                    Re-open Holographic Inspector
                  </button>
                )}
              </div>
            )
          )}
        </div>
        {children}
      </div>
      {reportA?.series && selected && <InvestigationReport
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
      />}
      <div className="globe-viewport">
        <div className="globe-surface" ref={viewport} onPointerDown={() => {
          setIdleRotation(false);
          setTourPlaying(false);
          cancelFlight();
        }} onWheel={() => {
          setIdleRotation(false);
          cancelFlight();
        }}>
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
              polygonsData={countries}
              polygonCapColor={(feature) => countryColors[(feature as CountryFeature).properties.color % countryColors.length]}
              polygonSideColor={() => 'rgba(16, 37, 52, 0.58)'}
              polygonStrokeColor={() => '#c4e0e8'}
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
                return key === hovered || key === keyA || key === keyB ? 1.3 : 0.75;
              }}
              pointAltitude={(point) => (point as typeof markers[number]).id === null ? 0.004 : 0.003}
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
              ringColor={(d: unknown) => (d as { color?: string }).color || '#38bdf8'}
              ringMaxRadius={2.8}
              ringRepeatPeriod={1400}
            />
          </GlobeBoundary>
        )}
        {!available && <p role="status">The 3D globe is unavailable. Select a region from the list.</p>}
        {ready && available && <div className="globe-overlay">
          <div className="globe-zoom" aria-label="Globe zoom">
            <button type="button" aria-label="Zoom in" onClick={() => {
              setIdleRotation(false);
              cameraTo({ altitude: Math.max(0.32, (globe.current?.pointOfView().altitude ?? 2.4) / 1.4) });
            }}>+</button>
            <button type="button" aria-label="Zoom out" onClick={() => {
              setIdleRotation(false);
              cameraTo({ altitude: Math.min(5.4, (globe.current?.pointOfView().altitude ?? 2.4) * 1.4) });
            }}>−</button>
            <button type="button" onClick={() => cameraTo(initialView)}>Reset</button>
          </div>
          {hovered && (() => {
            const marker = markers.find(({ key }) => key === hovered);
            return marker && <p className="globe-hover">{marker.name} · {marker.lat.toFixed(2)}°, {marker.lng.toFixed(2)}°</p>;
          })()}
        </div>}
        </div>
        <small>
          {area && 'Gold: approximate study area. '}
          {cell && 'Green: representative grid cell. '}
          Earth: NASA Blue Marble, WebGL Earth and three-globe. Borders: Natural Earth.
        </small>
      </div>

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

      <HolographicInspectorModal
        isOpen={isInspectorOpen && !sidebarDocked && !!selected}
        onClose={() => setIsInspectorOpen(false)}
        screenCoords={screenCoords}
        place={selected ?? null}
        location={location}
        targetB={targetB ?? null}
        compare={compare}
        onSetCompare={setCompare}
        variable={variable}
        variableRange={variableRange}
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
    </section>
  );
}
