import { Component, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { Mesh, MeshBasicMaterial, SphereGeometry, SRGBColorSpace, TextureLoader } from 'three';
import { parseCoordinate, type LocationSelection } from '../../stores/navigationStore';
import { deleteInvestigation, INVESTIGATIONS_KEY, readInvestigations, saveInvestigation, type Investigation } from '../../stores/investigations';
import { distanceKm, gridOutline, initialView, type GeoPath, type GeoPoint, type Place, type WorldMap } from './globeGeography';
import { addNightLayer } from './nightLayer';
import { locationKey, pointValue, useLocationReport, useVariableAvailability, variableOptions } from './globeData';
import { HistoryChart } from './HistoryChart';
import { localApiFetch } from './localApi';
import { trendLine } from './trendLine';
import { comparisonIssues, trendComparisonIssue } from './seriesComparison';
import naturalEarth from './natural-earth-110m.json';
import './region-globe.css';

type Region = { id: string; name: string; lat: number; lng: number; cell?: string };

const offlineRegions: Region[] = [
  { id: 'amazon', name: 'Amazonia', lat: -3.1, lng: -60 },
  { id: 'guajira', name: 'La Guajira', lat: 11.5, lng: -72.9 },
  { id: 'sahel', name: 'Sahel', lat: 13.5, lng: 2.1 },
  { id: 'australia_se', name: 'Southeast Australia', lat: -35, lng: 145 },
];

const studyAreas: Record<string, GeoPath> = {
  amazon: [[-7, -68], [3, -68], [3, -54], [-7, -54], [-7, -68]],
  guajira: [[10.3, -73.8], [12.5, -73.8], [12.5, -71], [10.3, -71], [10.3, -73.8]],
  sahel: [[11, -3], [17, -3], [17, 7.5], [11, 7.5], [11, -3]],
  australia_se: [[-39, 139], [-29, 139], [-29, 151], [-39, 151], [-39, 139]],
};

const presentation = [
  'Choose a location and inspect its coordinates.',
  'Play the historical series and follow the active month.',
  'Review the trend estimate and its interpretation.',
  'Compare two study regions for the same variable.',
];

function motionAllowed() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function monthlyDates(points: { date: string }[]) {
  const dates = points.map(({ date }) => date).sort();
  if (!dates.length) return [];
  const toMonth = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5)) - 1;
  const first = toMonth(dates[0]);
  const last = toMonth(dates[dates.length - 1]);
  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const index = first + offset;
    return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
  });
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
  const dataPanel = useRef<HTMLDivElement>(null);
  const flightTimers = useRef<number[]>([]);
  const selectedId = location?.kind === 'region' ? location.id : null;
  const selected = useMemo(() => location?.kind === 'coordinates'
    ? { ...location, id: null, name: 'Custom location', cell: undefined }
    : regions.find(({ id }) => id === selectedId), [location, regions, selectedId]);
  const targetB = useMemo(() => compare?.kind === 'coordinates'
    ? { ...compare, id: null, name: 'Custom location B', cell: undefined }
    : regions.find(({ id }) => id === compare?.id), [compare, regions]);
  const keyA = locationKey(location);
  const keyB = locationKey(compare);
  const markers = useMemo(() => [
    ...regions.map((region) => ({ ...region, key: region.id })),
    ...(selected?.id === null ? [{ ...selected, key: keyA }] : []),
    ...(targetB?.id === null && keyB !== keyA ? [{ ...targetB, key: keyB }] : []),
  ], [regions, selected, targetB, keyA, keyB]);
  function updateLabelSpacing() {
    const world = globe.current;
    if (!world || !ready) return;
    const view = world.pointOfView();
    const camera = world.getCoords(view.lat, view.lng);
    const preferred = [...markers].sort((a, b) => Number(b.key === keyA || b.key === keyB)
      - Number(a.key === keyA || a.key === keyB));
    const used: { x: number; y: number; width: number }[] = [];
    const hidden: string[] = [];
    for (const marker of preferred) {
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
  useEffect(() => refreshLabelSpacing(), [ready, markers, width, height]);
  const worldMap = naturalEarth as WorldMap;
  const reportA = useLocationReport(location, variable, step !== null, period.start, period.end);
  const reportB = useLocationReport(keyA === keyB ? null : compare, variable, step !== null, period.start, period.end);
  const issues = reportA?.series && reportB?.series ? comparisonIssues(reportA.series, reportB.series) : [];
  const comparable = issues.length === 0;
  const trendIssue = trendComparisonIssue(reportA?.trend, reportB?.trend);
  const reports = [
    { key: keyA, place: selected, report: reportA, color: '#197caa' },
    { key: keyB, place: targetB, report: reportB, color: '#a04194' },
  ];
  const pointsA = reportA?.series?.points;
  const pointsB = reportB?.series?.points;
  const dates = useMemo(() => monthlyDates([...(pointsA ?? []), ...(comparable ? pointsB ?? [] : [])]), [pointsA, pointsB, comparable]);
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
  const searchItems: (Region | Place)[] = search.trim() ? [...regions, ...worldMap.places]
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
    const timer = window.setInterval(() => setSelectedDate((current) => {
      const index = dates.indexOf(current);
      return dates[(index + 1) % dates.length];
    }), 500);
    return () => window.clearInterval(timer);
  }, [playing, dates]);

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
          setRegions(offlineRegions.map((region) => entries.find(({ id }) => id === region.id) ?? region));
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
      if (other) setCompare({ kind: 'region', id: other.id });
    }
    if (next > 0) dataPanel.current?.scrollIntoView({ block: 'nearest' });
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

  const arc = measurePoints.length === 2 ? [{ start: measurePoints[0], end: measurePoints[1] }] : [];

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
          visit({ kind: 'coordinates', lat, lng }, { lat, lng });
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
          <label><input type="checkbox" checked={boundaries} onChange={(event) => setBoundaries(event.target.checked)} /> Borders and coastlines when zoomed in</label>
          <label><input type="checkbox" checked={graticules} onChange={(event) => setGraticules(event.target.checked)} /> Latitude and longitude grid</label>
          <label><input type="checkbox" checked={idleRotation} disabled={reduced || !!location} onChange={(event) => setIdleRotation(event.target.checked)} /> Rotate before selecting a location</label>
          <label><input type="checkbox" checked={measure} onChange={(event) => {
            setMeasure(event.target.checked);
            setMeasurePoints([]);
          }} /> Measure distance</label>
          {measure && <p role="status">{arc.length
            ? `${Math.round(distanceKm(arc[0].start, arc[0].end)).toLocaleString()} km along the Earth's surface.`
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
        <div ref={dataPanel} className="globe-data">
          <h2>Historical data</h2>
          <details>
            <summary>Understanding the results</summary>
            <p>A trend describes change over the selected period. A significant result indicates statistical evidence under the stated method and does not establish a cause.</p>
            <p>A non-significant result means the evidence is insufficient to establish a trend. A result may also be non-evaluable when data or method requirements are not met.</p>
          </details>
          <form key={`${variable}:${variableRange.start}:${variableRange.end}:${period.start}:${period.end}`} onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const start = Number(values.get('startYear'));
            const end = Number(values.get('endYear'));
            if (!Number.isInteger(start) || !Number.isInteger(end) || start < variableRange.start || end > variableRange.end || start > end) {
              setPeriodError(`Choose a valid period from ${variableRange.start} through ${variableRange.end}.`);
              return;
            }
            setPeriodError('');
            setPlaying(false);
            setSelectedDate('');
            setPeriod({ start, end });
          }}>
            <p>Available years for this variable: {variableRange.start}–{variableRange.end}.</p>
            <label>Start year <input name="startYear" type="number" min={variableRange.start} max={variableRange.end} defaultValue={period.start} required /></label>
            <label>End year <input name="endYear" type="number" min={variableRange.start} max={variableRange.end} defaultValue={period.end} required /></label>
            <button type="submit">Apply period</button>
            {periodError && <p role="alert">{periodError}</p>}
          </form>
          <label>Find a variable <input type="search" value={variableSearch} onChange={(event) => setVariableSearch(event.target.value)} placeholder="Search name or ID" /></label>
          <label>Variable <select value={variable} onChange={(event) => {
            setPlaying(false);
            setSelectedDate('');
            const nextRange = variables.find(({ id }) => id === event.target.value);
            if (nextRange) setPeriodNotice(period.start < nextRange.start || period.end > nextRange.end
              ? `Period adjusted to the available years ${nextRange.start}–${nextRange.end}.` : '');
            if (nextRange) setPeriod((current) => {
              const start = Math.min(nextRange.end, Math.max(nextRange.start, current.start));
              return { start, end: Math.max(start, Math.min(nextRange.end, current.end)) };
            });
            setPeriodError('');
            setVariable(event.target.value);
          }}>{variables.filter(({ id, name }) => id === variable || `${id} ${name}`.toLowerCase().includes(variableSearch.trim().toLowerCase()))
            .map(({ id, name }) => <option key={id} value={id}>{name} · {id}</option>)}</select></label>
          {variableSearch && !variables.some(({ id, name }) => `${id} ${name}`.toLowerCase().includes(variableSearch.trim().toLowerCase())) && <p role="status">No matching variable.</p>}
          <p role="status">{periodNotice}</p>
          <section className="globe-report" aria-label="Variable information">
            <strong>{variableRange.name} · {variableRange.id}</strong>
            <p>{variableRange.description}</p>
            <p>{variableRange.category} · {variableRange.unit} · Monthly · {variableRange.start}–{variableRange.end}</p>
            <p>Source: {variableRange.source}. Community: {variableRange.community}. Grid: {variableRange.resolution}.</p>
            <p>Precipitation is temporarily unavailable while its unit is verified. Soil wetness and transpiration require validation before they can be added.</p>
          </section>
          <label>Compare with <select value={compare?.kind === 'region' ? compare.id : compare ? 'custom' : ''} onChange={(event) => {
            if (event.target.value === 'custom') return;
            setCompare(event.target.value ? { kind: 'region', id: event.target.value } : null);
          }}>
            <option value="">No comparison</option>
            {regions.map(({ id, name }) => <option key={id} value={id} disabled={keyA === id}>{name}</option>)}
            {compare?.kind === 'coordinates' && <option value="custom">Pinned coordinates</option>}
          </select></label>
          {location?.kind === 'coordinates' && <button type="button" onClick={() => setCompare(location)}>Pin coordinates as B</button>}
          {selected && targetB && keyA !== keyB && <div className="globe-actions">
            <button type="button" onClick={() => cameraTo({ lat: selected.lat, lng: selected.lng, altitude: 0.85 }, true)}>Go to A</button>
            <button type="button" onClick={() => cameraTo({ lat: targetB.lat, lng: targetB.lng, altitude: 0.85 }, true)}>Go to B</button>
          </div>}
          {!selected && <p>Select a location to load its history.</p>}
          {keyA && keyA === keyB && <p>Choose a different location for A to compare with B.</p>}
          {!comparable && <p role="status">The series cannot share a comparison: {issues.join('; ')}. Each series is shown independently.</p>}
          {reportA?.series && reportB?.series && comparable && <p>
            Both series use {reportA.series.variable_id}, {reportA.series.unit}, monthly frequency, {reportA.series.provider}, and {reportA.series.spatial_resolution} resolution for the same available period.
            {' '}{trendIssue ?? `Sen slopes: A ${reportA.trend?.rate_per_decade} and B ${reportB.trend?.rate_per_decade} ${reportA.trend?.rate_unit}. Different estimates alone do not establish a statistically significant difference or a common cause.`}
          </p>}
          {dates.length > 0 && <>
            <label>Month <output>{visibleDate}</output>
              <input type="range" min={0} max={dates.length - 1} value={dates.indexOf(visibleDate)}
                onChange={(event) => setSelectedDate(dates[Number(event.target.value)])} />
            </label>
            <button type="button" disabled={dates.length < 2}
              onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause history' : 'Play history'}</button>
            <p className="globe-scale">
              <span>{bounds[0].toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span aria-label="Low to high values" />
              <span>{bounds[1].toLocaleString(undefined, { maximumFractionDigits: 2 })} {reportA?.series?.unit ?? reportB?.series?.unit}</span>
            </p>
          </>}
          {reports.map(({ key, place, report, color }, index) => {
            if (!place || !report || (index === 1 && key === keyA)) return null;
            const series = report.series;
            const valid = series?.points.filter((point) => point.value !== null).length ?? 0;
            const independent = index === 1 && !comparable;
            const chartDates = independent ? monthlyDates(series?.points ?? []) : dates;
            const chartDate = independent
              ? chartDates.includes(selectedDateB) ? selectedDateB : chartDates.at(-1) ?? ''
              : visibleDate;
            const chartValue = pointValue(series?.points, chartDate);
            const chartBounds: readonly [number, number] = independent && series
              ? (() => {
                const values = series.points.flatMap(({ value: point }) => point === null ? [] : [point]);
                const line = trendLine(series.points, report.trend);
                if (line) values.push(line.start, line.end);
                return values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
              })() : bounds;
            return <section key={key} className="globe-report" data-highlighted={hovered === key || undefined}>
              <h3>{targetB ? `${index === 0 ? 'A' : 'B'} · ` : ''}{place.name}</h3>
              {series ? <>
                <p>{valid} of {series.points.length} months with data · {series.provider}</p>
                <p>{variableRange.name} ({series.variable_id}) · {series.unit} · {series.is_cached ? 'Cached data' : series.provider.includes('offline') ? 'Offline snapshot' : 'Source data'}</p>
                {series.query_coordinates && <p>Requested location: {series.query_coordinates.latitude}, {series.query_coordinates.longitude}</p>}
                {series.representative_grid_cell && <p>Grid cell: {series.representative_grid_cell} · {series.spatial_resolution}</p>}
                <p>{series.points.length ? `Available period: ${series.points[0].date} to ${series.points[series.points.length - 1].date}.` : 'No data is available for this period.'}</p>
                {chartDate && <p>{place.name} · {variableRange.name} · {chartDate}: {chartValue === null ? 'No data' : `${chartValue} ${series.unit}`} · {series.provider}</p>}
                {independent && chartDates.length > 0 && <label>Month for B <output>{chartDate}</output>
                  <input type="range" min={0} max={chartDates.length - 1} value={chartDates.indexOf(chartDate)}
                    onChange={(event) => setSelectedDateB(chartDates[Number(event.target.value)])} />
                </label>}
                {valid > 0 && <HistoryChart points={series.points} dates={chartDates} date={chartDate}
                  bounds={chartBounds} name={place.name} color={color} highlighted={hovered === key} trend={report.trend}
                  onHover={(active) => setHovered(active ? key : null)} onDate={(date) => {
                    setPlaying(false);
                    if (independent) setSelectedDateB(date);
                    else setSelectedDate(date);
                  }} />}
                {trendLine(series.points, report.trend) && <p>Dashed line: Sen slope, anchored to the median residual of the displayed data.</p>}
                <p>{report.trend?.plain_language_verdict ?? 'Trend analysis unavailable.'}</p>
                {report.trend && <p>
                  Method: {report.trend.method}. {report.trend.p_value !== null ? `p = ${report.trend.p_value}.` : 'p-value unavailable.'}
                  {report.trend.confidence_interval_95 && ` 95% interval: ${report.trend.confidence_interval_95.join(' to ')} ${report.trend.rate_unit}.`}
                  {' '}{report.trend.scientific_caveat}
                </p>}
              </> : <p role="status">{report.message}</p>}
            </section>;
          })}
        </div>
        {children}
      </div>
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
              }}
              onGlobeClick={({ lat, lng }) => {
                const point = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
                if (measure) addMeasurement(point);
                else visit({ kind: 'coordinates', ...point }, point, false);
              }}
              pointsData={markers}
              pointColor={(point) => markerColor(point as typeof markers[number])}
              pointRadius={(point) => {
                const { key } = point as typeof markers[number];
                return key === hovered || key === keyA || key === keyB ? 1.25 : 0.7;
              }}
              pointAltitude={(point) => (point as typeof markers[number]).id === null ? 0.055 : 0.025}
              pointLabel={(point) => {
                const label = document.createElement('span');
                label.textContent = markers.find((marker) => marker === point)?.name ?? '';
                return label.innerHTML;
              }}
              pointsTransitionDuration={0}
              onPointHover={(point) => setHovered((point as typeof markers[number] | null)?.key ?? null)}
              onPointClick={selectMarker}
              labelsData={hiddenLabels ? markers.filter(({ key }) => !hiddenLabels.split('|').includes(key)) : markers}
              labelText={(point) => {
                const marker = point as typeof markers[number];
                const prefix = keyB && keyA !== keyB ? marker.key === keyA ? 'A · ' : marker.key === keyB ? 'B · ' : '' : '';
                const trend = marker.key === keyA ? reportA?.trend : marker.key === keyB ? reportB?.trend : undefined;
                const rate = trend?.rate_per_decade;
                const brief = marker.name.split(' (')[0];
                return `${prefix}${zoomed ? marker.name : brief}${rate != null && trend
                  ? ` · ${rate === 0 ? '→' : rate > 0 ? '↑' : '↓'} ${Math.abs(rate).toFixed(2)} ${trend.rate_unit}`
                  : ''}`;
              }}
              labelColor={() => '#fff'}
              labelSize={1.3}
              labelDotRadius={0}
              labelsTransitionDuration={0}
              onLabelClick={selectMarker}
              pathsData={paths}
              pathPoints="points"
              pathPointLat="lat"
              pathPointLng="lng"
              pathPointAlt="altitude"
              pathColor="color"
              pathTransitionDuration={0}
              arcsData={arc}
              arcStartLat={(entry) => (entry as typeof arc[number]).start.lat}
              arcStartLng={(entry) => (entry as typeof arc[number]).start.lng}
              arcEndLat={(entry) => (entry as typeof arc[number]).end.lat}
              arcEndLng={(entry) => (entry as typeof arc[number]).end.lng}
              arcAltitude={0.034}
              arcColor={() => '#ffcd70'}
              arcsTransitionDuration={0}
              ringsData={selected?.id === null && !reduced && motionAllowed() ? [selected] : []}
              ringColor={() => '#90f5b1'}
              ringMaxRadius={3.2}
              ringRepeatPeriod={1250}
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
    </section>
  );
}
