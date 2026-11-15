import { useState, useMemo, type ReactNode } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import type { GeoPoint, Place } from '../globe/globeGeography';
import { pointValue, type DataPoint, type Report, type Series, type Trend } from '../globe/globeData';
import { HistoryChart } from '../globe/HistoryChart';
import { ScientificExplanation } from '../globe/ScientificExplanation';
import { TemporalComparison } from '../globe/TemporalComparison';
import { TeleconnectionRadar } from './TeleconnectionRadar';
import { trendLine } from '../globe/trendLine';
import { observationDates } from '../globe/historyTimeline';
import { comparisonIssues, trendComparisonIssue } from '../globe/seriesComparison';
import './data-detective-workbench.css';

export interface TeleconnectionPreset {
  id: string;
  name: string;
  a: string;
  b: string;
  variable: string;
  note: string;
}

export interface RegionItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  cell?: string;
}

export interface VariableItem {
  id: string;
  name: string;
  start: number;
  end: number;
  unit: string;
  description: string;
  category: string;
  source: string;
  community: string;
  resolution: string;
}

interface DataDetectiveWorkbenchProps {
  location: LocationSelection | null;
  selectedPlace: Place | null;
  targetB: Place | null;
  compare: LocationSelection | null;
  onSetCompare: (loc: LocationSelection | null) => void;
  variable: string;
  onSetVariable: (v: string) => void;
  variableRange: VariableItem;
  variables: VariableItem[];
  period: { start: number; end: number };
  onSetPeriod: (p: { start: number; end: number }) => void;
  regions: RegionItem[];
  teleconnectionPresets: TeleconnectionPreset[];
  onLoadTeleconnectionPreset: (presetId: string) => void;
  reportA?: Report;
  reportB?: Report;
  dates: string[];
  visibleDate: string;
  onSetVisibleDate: (d: string) => void;
  playing: boolean;
  onSetPlaying: (p: boolean | ((val: boolean) => boolean)) => void;
  bounds: readonly [number, number];
  hovered?: string | null;
  onHover?: (key: string | null) => void;
  onGoToA?: () => void;
  onGoToB?: () => void;
  onFrameBoth?: () => void;
  children?: ReactNode;
}

export function DataDetectiveWorkbench({
  location,
  selectedPlace,
  targetB,
  compare,
  onSetCompare,
  variable,
  onSetVariable,
  variableRange,
  variables,
  period,
  onSetPeriod,
  regions,
  teleconnectionPresets,
  onLoadTeleconnectionPreset,
  reportA,
  reportB,
  dates,
  visibleDate,
  onSetVisibleDate,
  playing,
  onSetPlaying,
  bounds,
  hovered,
  onHover,
  onGoToA,
  onGoToB,
  onFrameBoth,
  children,
}: DataDetectiveWorkbenchProps) {
  const [variableSearch, setVariableSearch] = useState('');
  const [periodError, setPeriodError] = useState('');
  const [periodNotice, setPeriodNotice] = useState('');
  const [internalHoveredKey, setInternalHoveredKey] = useState<string | null>(null);
  const [selectedDateB, setSelectedDateB] = useState('');

  const activeHoveredKey = hovered !== undefined ? hovered : internalHoveredKey;
  const handleHover = onHover ?? setInternalHoveredKey;

  const keyA = location ? (location.kind === 'region' ? location.id : `${location.lat},${location.lng}`) : '';
  const keyB = compare ? (compare.kind === 'region' ? compare.id : `${compare.lat},${compare.lng}`) : '';

  const issues = reportA?.series && reportB?.series ? comparisonIssues(reportA.series, reportB.series) : [];
  const comparable = issues.length === 0;
  const trendIssue = trendComparisonIssue(reportA?.trend, reportB?.trend);

  const reports = [
    { key: keyA, place: selectedPlace, report: reportA, color: '#79dcff' },
    { key: keyB, place: targetB, report: reportB, color: '#ffcd70' },
  ];

  const idA = selectedPlace && 'id' in selectedPlace ? (selectedPlace as { id?: string | null }).id : null;
  const idB = targetB && 'id' in targetB ? (targetB as { id?: string | null }).id : null;

  const activePreset = useMemo(() => {
    if (!idA || !idB) return null;
    return (
      teleconnectionPresets.find(
        (p) =>
          ((p.a === idA && p.b === idB) || (p.b === idA && p.a === idB)) &&
          p.variable === variable
      ) ?? null
    );
  }, [idA, idB, variable, teleconnectionPresets]);

  return (
    <aside className="detective-workbench" aria-label="Earth System Data Detective Workbench">
      {/* Workbench Section: Controls & Variable Exploration */}
      <section className="workbench-section controls-section">
        <div className="section-header">
          <h2>Data Detective Workbench</h2>
          <button
            className="btn-print-report"
            type="button"
            disabled={!reportA?.series}
            onClick={() => window.print()}
            title="Export full scientific report"
          >
            Export Report (PDF)
          </button>
        </div>

        {/* Temporal Period Form */}
        <form
          className="period-form"
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const start = Number(values.get('startYear'));
            const end = Number(values.get('endYear'));
            if (
              !Number.isInteger(start) ||
              !Number.isInteger(end) ||
              start < variableRange.start ||
              end > variableRange.end ||
              start > end
            ) {
              setPeriodError(`Choose a valid period from ${variableRange.start} through ${variableRange.end}.`);
              return;
            }
            setPeriodError('');
            onSetPlaying(false);
            onSetVisibleDate('');
            onSetPeriod({ start, end });
          }}
        >
          <div className="period-inputs-row">
            <label>
              <span>Start Year</span>
              <input
                name="startYear"
                type="number"
                min={variableRange.start}
                max={variableRange.end}
                defaultValue={period.start}
                required
              />
            </label>
            <label>
              <span>End Year</span>
              <input
                name="endYear"
                type="number"
                min={variableRange.start}
                max={variableRange.end}
                defaultValue={period.end}
                required
              />
            </label>
            <button type="submit" className="btn-secondary">Apply Period</button>
          </div>
          {periodError && <p role="alert" className="error-text">{periodError}</p>}
        </form>

        {/* Variable Selection */}
        <div className="variable-picker">
          <label>
            <span>Variable Search</span>
            <input
              type="search"
              value={variableSearch}
              onChange={(e) => setVariableSearch(e.target.value)}
              placeholder="Search variable name or ID (e.g. T2M, PRECTOTCORR)"
            />
          </label>
          <label>
            <span>Target Observation Variable</span>
            <select
              value={variable}
              onChange={(event) => {
                onSetPlaying(false);
                onSetVisibleDate('');
                const nextRange = variables.find(({ id }) => id === event.target.value);
                if (nextRange) {
                  setPeriodNotice(
                    period.start < nextRange.start || period.end > nextRange.end
                      ? `Period adjusted to available range ${nextRange.start}–${nextRange.end}.`
                      : ''
                  );
                  const start = Math.min(nextRange.end, Math.max(nextRange.start, period.start));
                  onSetPeriod({ start, end: Math.max(start, Math.min(nextRange.end, period.end)) });
                }
                setPeriodError('');
                onSetVariable(event.target.value);
              }}
            >
              {variables
                .filter(
                  ({ id, name }) =>
                    id === variable ||
                    `${id} ${name}`.toLowerCase().includes(variableSearch.trim().toLowerCase())
                )
                .map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name} ({id})
                  </option>
                ))}
            </select>
          </label>
          {periodNotice && <p role="status" className="notice-text">{periodNotice}</p>}
        </div>

        {/* Active Variable Metadata Badge */}
        <div className="variable-meta-card">
          <div className="meta-card-header">
            <strong>{variableRange.name} · {variableRange.id}</strong>
            <span className="source-pill">{variableRange.source}</span>
          </div>
          <p className="meta-desc">{variableRange.description}</p>
          <div className="meta-specs">
            <span>Category: {variableRange.category}</span>
            <span>Unit: {variableRange.unit}</span>
            <span>Resolution: {variableRange.resolution}</span>
            <span>Temporal Range: {variableRange.start}–{variableRange.end}</span>
          </div>
        </div>

        {/* Teleconnection Presets (Opposing Trends) */}
        <details className="teleconnection-details" open>
          <summary>Planetary Teleconnections (Opposing Trends)</summary>
          <p className="teleconnection-help">
            Explore single planetary drivers causing opposing regional trends (NASA Space Apps Challenge 2026):
          </p>
          <div className="preset-buttons-grid">
            {teleconnectionPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="btn-preset"
                onClick={() => onLoadTeleconnectionPreset(preset.id)}
              >
                <div className="preset-title">{preset.name}</div>
                <div className="preset-meta">{preset.variable} · <em>{preset.note}</em></div>
              </button>
            ))}
          </div>
        </details>

        {/* Spatial Comparison Dropdown */}
        <div className="comparison-controls">
          <label>
            <span>Compare with Second Location (B)</span>
            <select
              value={compare?.kind === 'region' ? compare.id : compare ? 'custom' : ''}
              onChange={(event) => {
                if (event.target.value === 'custom') return;
                onSetCompare(event.target.value ? { kind: 'region', id: event.target.value } : null);
              }}
            >
              <option value="">No comparative location</option>
              {regions.map(({ id, name }) => (
                <option key={id} value={id} disabled={keyA === id}>
                  {name}
                </option>
              ))}
              {compare?.kind === 'coordinates' && <option value="custom">Pinned Coordinates</option>}
            </select>
          </label>
          {location?.kind === 'coordinates' && (
            <button type="button" className="btn-secondary" onClick={() => onSetCompare(location)}>
              Pin Current Coordinates as Location B
            </button>
          )}
          {selectedPlace && targetB && keyA !== keyB && (
            <div className="fly-actions">
              {onGoToA && <button type="button" onClick={onGoToA}>Orbit to A ({selectedPlace.name})</button>}
              {onGoToB && <button type="button" onClick={onGoToB}>Orbit to B ({targetB.name})</button>}
            </div>
          )}
        </div>
      </section>

      {/* Teleconnection Radar & Dual Spatial Divergence */}
      {selectedPlace && targetB && keyA !== keyB && (
        <TeleconnectionRadar
          preset={activePreset}
          placeA={selectedPlace}
          placeB={targetB}
          reportA={reportA}
          reportB={reportB}
          onFocusA={onGoToA}
          onFocusB={onGoToB}
          onFrameBoth={onFrameBoth}
        />
      )}

      {/* Observation Timeline Playback Slider */}
      {dates.length > 0 && (
        <section className="timeline-playback-card">
          <div className="timeline-header">
            <span className="telemetry-mono">OBSERVATION MONTH: <strong>{visibleDate}</strong></span>
            <button
              type="button"
              className="btn-playback"
              disabled={dates.length < 2}
              onClick={() => onSetPlaying((v) => !v)}
            >
              {playing ? 'Pause Observation Stream' : 'Play Historical Stream'}
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={dates.length - 1}
            value={dates.indexOf(visibleDate)}
            onChange={(event) => onSetVisibleDate(dates[Number(event.target.value)])}
            aria-label="Timeline month slider"
          />
          <div className="globe-scale" aria-label="Thermal observation spectrum">
            <span>{bounds[0].toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span aria-label="Low to high thermal values" title="Thermal observation scale: Blue (low/cold) to Red (high/warm)" />
            <span>{bounds[1].toLocaleString(undefined, { maximumFractionDigits: 2 })} {reportA?.series?.unit ?? reportB?.series?.unit ?? ''}</span>
          </div>
        </section>
      )}

      {/* Results & Statistical Analysis Section */}
      <section className="results-section">
        {reports.map(({ key, place, report, color }, index) => {
          if (!place || !report || (index === 1 && key === keyA)) return null;
          const series = report.series;
          const valid = series?.points.filter((point: DataPoint) => point.value !== null).length ?? 0;
          const independent = index === 1 && !comparable;
          const chartDates = independent ? observationDates(series?.points ?? []) : dates;
          const chartDate = independent
            ? chartDates.includes(selectedDateB)
              ? selectedDateB
              : chartDates.at(-1) ?? ''
            : visibleDate;
          const chartValue = pointValue(series?.points, chartDate);
          const chartBounds: readonly [number, number] =
            independent && series
              ? (() => {
                  const values = series.points.flatMap(({ value: point }: DataPoint) => (point === null ? [] : [point]));
                  const line = trendLine(series.points, report.trend);
                  if (line) values.push(line.start, line.end);
                  return values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
                })()
              : bounds;

          return (
            <article
              key={key}
              className="series-card"
              data-highlighted={activeHoveredKey === key || undefined}
            >
              <div className="series-card-header">
                <h3>
                  {targetB ? `${index === 0 ? 'Location A' : 'Location B'}: ` : ''}
                  {place.name}
                </h3>
                <span className="live-badge">
                  {series?.is_cached
                    ? 'Backend Cache (Verified NASA Observations)'
                    : series?.provider.includes('offline')
                    ? 'Local Snapshot (Offline Fallback)'
                    : 'NASA Earthdata Live Query'}
                </span>
              </div>

              {series ? (
                <>
                  <div className="series-data-meta">
                    <span>
                      {valid} of {series.points.length} monthly observations valid
                    </span>
                    <span>Source: {series.provider}</span>
                    <span>Grid Cell: {series.representative_grid_cell || '0.5° grid'}</span>
                  </div>

                  {chartDate && (
                    <div className="current-point-readout telemetry-mono">
                      <span>{chartDate}:</span>{' '}
                      <strong>{chartValue === null ? 'No Data' : `${chartValue} ${series.unit}`}</strong>
                    </div>
                  )}

                  {valid > 0 && (
                    <div className="chart-container">
                      <HistoryChart
                        points={series.points}
                        dates={chartDates}
                        date={chartDate}
                        bounds={chartBounds}
                        name={place.name}
                        color={color}
                        highlighted={activeHoveredKey === key}
                        trend={report.trend}
                        onHover={(active) => handleHover(active ? key : null)}
                        onDate={(date) => {
                          onSetPlaying(false);
                          if (independent) setSelectedDateB(date);
                          else onSetVisibleDate(date);
                        }}
                      />
                    </div>
                  )}

                  {/* Mathematical Statistics Output (Rigorous & Zero Hallucination) */}
                  <div className="trend-statistics-block">
                    <div className="verdict-banner">
                      <strong>Verdict:</strong> {report.trend?.plain_language_verdict ?? 'Trend calculation in progress…'}
                    </div>

                    {report.trend && (
                      <div className="statistics-details">
                        <div className="stat-row">
                          <span className="stat-label">Method:</span>
                          <span className="stat-val">{report.trend.method}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Sen's Slope:</span>
                          <span className="stat-val telemetry-mono">
                            {report.trend.rate_per_decade !== null
                              ? `${report.trend.rate_per_decade > 0 ? '+' : ''}${report.trend.rate_per_decade} ${report.trend.rate_unit}`
                              : 'Not evaluable'}
                          </span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Statistical Significance:</span>
                          <span className="stat-val telemetry-mono">
                            {report.trend.p_value !== null ? `p = ${report.trend.p_value}` : 'N/A'} (α = {report.trend.alpha})
                          </span>
                        </div>
                        {report.trend.confidence_interval_95 && (
                          <div className="stat-row">
                            <span className="stat-label">95% Confidence Interval:</span>
                            <span className="stat-val telemetry-mono">
                              [{report.trend.confidence_interval_95.join(', ')}] {report.trend.rate_unit}
                            </span>
                          </div>
                        )}
                        <p className="scientific-caveat">{report.trend.scientific_caveat}</p>
                      </div>
                    )}
                  </div>

                  {/* AI Grounded Scientific Explanation */}
                  {index === 0 && (
                    <ScientificExplanation location={place.name} series={series} trend={report.trend} />
                  )}
                </>
              ) : (
                <div className="series-loading-card">
                  <div className="loading-status-text">
                    <span className="trigger-pulse-dot" />
                    <span>{report.message || 'Connecting to NASA POWER live satellite observations...'}</span>
                  </div>
                  <div className="loading-progress-bar">
                    <div className="loading-progress-indeterminate" />
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {/* Temporal Range Comparison */}
        {location && selectedPlace && (
          <TemporalComparison
            key={`${keyA}:${variable}:${variableRange.start}:${variableRange.end}`}
            location={location}
            locationName={selectedPlace.name}
            variable={variable}
            variableName={variableRange.name}
            available={{ start: variableRange.start, end: variableRange.end }}
          />
        )}
      </section>

      {children}
    </aside>
  );
}
