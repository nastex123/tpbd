import { useState, useMemo, useEffect, useRef } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import type { Place } from '../globe/globeGeography';
import { pointValue, type DataPoint, type Report } from '../globe/globeData';
import { HistoryChart } from '../globe/HistoryChart';
import { ScientificExplanation } from '../globe/ScientificExplanation';
import { TemporalComparison } from '../globe/TemporalComparison';
import { TeleconnectionRadar } from './TeleconnectionRadar';
import { trendLine } from '../globe/trendLine';
import { observationDates } from '../globe/historyTimeline';
import { comparisonIssues, trendComparisonIssue } from '../globe/seriesComparison';
import type { RegionItem, TeleconnectionPreset, VariableItem } from './DataDetectiveWorkbench';
import './holographic-inspector.css';

export interface HolographicInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
  location: LocationSelection | null;
  reportA?: Report;
  reportB?: Report;
  targetB: Place | null;
  compare: LocationSelection | null;
  onSetCompare: (loc: LocationSelection | null) => void;
  variable: string;
  variableRange: VariableItem;
  period: { start: number; end: number };
  dates: string[];
  visibleDate: string;
  onSetVisibleDate: (d: string) => void;
  playing: boolean;
  onSetPlaying: (p: boolean | ((val: boolean) => boolean)) => void;
  bounds: readonly [number, number];
  screenCoords?: { x: number; y: number } | null;
  teleconnectionPresets: TeleconnectionPreset[];
  onLoadTeleconnectionPreset: (presetId: string) => void;
  onGoToA?: () => void;
  onGoToB?: () => void;
  onFrameBoth?: () => void;
  regions: RegionItem[];
}

type InspectorTab = 'series' | 'trend' | 'teleconnections' | 'epochs' | 'ai';

export function HolographicInspectorModal({
  isOpen,
  onClose,
  place,
  location,
  reportA,
  reportB,
  targetB,
  compare,
  onSetCompare,
  variable,
  variableRange,
  period,
  dates,
  visibleDate,
  onSetVisibleDate,
  playing,
  onSetPlaying,
  bounds,
  screenCoords,
  teleconnectionPresets,
  onLoadTeleconnectionPreset,
  onGoToA,
  onGoToB,
  onFrameBoth,
  regions,
}: HolographicInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('series');
  const [selectedDateB, setSelectedDateB] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Always reset to 'series' (Observations) on opening so the AI text never obstructs the modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab('series');
    }
  }, [place?.name, isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Viewport-aware screen positioning strictly to the side of the point
  const modalStyle = useMemo(() => {
    if (!screenCoords) {
      return { top: '80px', left: '24px', width: '510px' };
    }
    const width = 510;
    const height = 480;
    const padding = 16;
    const maxLeft = Math.max(padding, window.innerWidth - width - padding);
    const maxTop = Math.max(76, window.innerHeight - height - padding);

    // Anchor to the right if point is on left 55% of screen, else to the left
    let left: number;
    if (screenCoords.x < window.innerWidth * 0.55) {
      left = screenCoords.x + 36;
    } else {
      left = screenCoords.x - width - 36;
    }
    left = Math.min(maxLeft, Math.max(padding, left));

    let top = screenCoords.y - 120;
    top = Math.min(maxTop, Math.max(76, top));

    return {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${width}px`,
    };
  }, [screenCoords]);

  if (!isOpen || !place) return null;

  const seriesA = reportA?.series;
  const trendA = reportA?.trend;
  const validA = seriesA?.points.filter((point: DataPoint) => point.value !== null).length ?? 0;
  const chartValue = pointValue(seriesA?.points, visibleDate);

  const keyA = location ? (location.kind === 'region' ? location.id : `${location.lat},${location.lng}`) : '';
  const keyB = compare ? (compare.kind === 'region' ? compare.id : `${compare.lat},${compare.lng}`) : '';

  const issues = seriesA && reportB?.series ? comparisonIssues(seriesA, reportB.series) : [];
  const comparable = issues.length === 0;
  const trendIssue = trendComparisonIssue(trendA, reportB?.trend);

  return (
    <>
      {/* Focus Vignette: Cinematic atmospheric darkening around the active point */}
      <div
        className="inspector-focus-vignette"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Screen-Anchored Holographic Modal */}
      <div
        ref={modalRef}
        className="holographic-inspector-modal"
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-location-title"
      >
        {/* Holographic Header */}
        <header className="inspector-modal-header">
          <div className="inspector-header-meta">
            <div className="inspector-title-row">
              <span className="location-pin-indicator" />
              <h2 id="inspector-location-title" className="inspector-title">
                {place.name}
              </h2>
            </div>
            <div className="inspector-sub-badges">
              <span className="live-status-pill">
                {seriesA?.is_cached
                  ? 'Backend Cache (Verified NASA Observations)'
                  : seriesA?.provider.includes('offline')
                  ? 'Local Snapshot (Offline Fallback)'
                  : 'NASA Earthdata Live Query'}
              </span>
              <span className="coords-meta-pill">
                {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}° · {seriesA?.representative_grid_cell || '0.5° grid'}
              </span>
            </div>
          </div>

          <div className="inspector-header-actions">
            {location?.kind === 'coordinates' && compare?.kind !== 'coordinates' && (
              <button
                type="button"
                className="btn-header-pin"
                onClick={() => onSetCompare(location)}
                title="Pin these coordinates as comparative Location B"
              >
                Pin as B
              </button>
            )}
            <button
              type="button"
              className="inspector-btn-close"
              onClick={onClose}
              aria-label="Close Inspector"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Tabbed Navigation Deck (Strictly ZERO Emojis, Clean SVG Icons) */}
        <nav className="inspector-tab-strip" aria-label="Investigation Dimensions">
          <button
            type="button"
            className={`inspector-tab-btn ${activeTab === 'series' ? 'active' : ''}`}
            onClick={() => setActiveTab('series')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>Observations</span>
          </button>

          <button
            type="button"
            className={`inspector-tab-btn ${activeTab === 'trend' ? 'active' : ''}`}
            onClick={() => setActiveTab('trend')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Trend & Statistics</span>
          </button>

          <button
            type="button"
            className={`inspector-tab-btn ${activeTab === 'teleconnections' ? 'active' : ''}`}
            onClick={() => setActiveTab('teleconnections')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>Teleconnections</span>
          </button>

          <button
            type="button"
            className={`inspector-tab-btn ${activeTab === 'epochs' ? 'active' : ''}`}
            onClick={() => setActiveTab('epochs')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Temporal Eras</span>
          </button>

          <button
            type="button"
            className={`inspector-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
            </svg>
            <span>AI Synthesis</span>
          </button>
        </nav>

        {/* Content Deck Body */}
        <div className="inspector-modal-deck">
          {/* TAB 1: OBSERVATIONS */}
          {activeTab === 'series' && (
            <div className="deck-pane deck-pane-series">
              {seriesA ? (
                <>
                  <div className="telemetry-readout-strip">
                    <div className="readout-block">
                      <span className="readout-label">VARIABLE</span>
                      <span className="readout-value">{variableRange.name} ({variable})</span>
                    </div>
                    <div className="readout-block">
                      <span className="readout-label">OBSERVATIONS</span>
                      <span className="readout-value">{validA} / {seriesA.points.length} months valid</span>
                    </div>
                    {visibleDate && (
                      <div className="readout-block current-date-block">
                        <span className="readout-label">DATE {visibleDate}</span>
                        <span className="readout-value highlight-value">
                          {chartValue === null ? 'No Data' : `${chartValue} ${seriesA.unit}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {validA > 0 && (
                    <div className="inspector-chart-box">
                      <HistoryChart
                        points={seriesA.points}
                        dates={dates}
                        date={visibleDate}
                        bounds={bounds}
                        name={place.name}
                        color="#79dcff"
                        highlighted={true}
                        trend={trendA}
                        onHover={() => {}}
                        onDate={(date) => {
                          onSetPlaying(false);
                          onSetVisibleDate(date);
                        }}
                      />
                    </div>
                  )}

                  {/* Playback Controls & Thermal Scale Bar */}
                  <div className="inspector-timeline-controls">
                    <button
                      type="button"
                      className="btn-playback-toggle"
                      onClick={() => onSetPlaying((v) => !v)}
                    >
                      {playing ? 'Pause Stream' : 'Play Stream'}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={dates.length - 1}
                      value={dates.indexOf(visibleDate)}
                      onChange={(e) => onSetVisibleDate(dates[Number(e.target.value)])}
                      aria-label="Timeline month slider"
                    />
                    <div className="globe-scale" aria-label="Thermal observation spectrum">
                      <span>{bounds[0].toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span aria-label="Low to high spectrum" title="Thermal observation spectrum: Blue to Red" />
                      <span>{bounds[1].toLocaleString(undefined, { maximumFractionDigits: 2 })} {seriesA.unit}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="inspector-loading-state">
                  <span className="trigger-pulse-dot" />
                  <p>{reportA?.message || 'Connecting to NASA POWER and downloading live observations...'}</p>
                  <div className="loading-progress-bar">
                    <div className="loading-progress-indeterminate" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TREND & STATISTICS */}
          {activeTab === 'trend' && (
            <div className="deck-pane deck-pane-trend">
              {trendA ? (
                <div className="trend-statistics-card">
                  <div className="stat-verdict-box">
                    <span className="stat-verdict-tag">SEN SLOPE VERDICT</span>
                    <p className="verdict-lead">{trendA.plain_language_verdict}</p>
                  </div>

                  <div className="metrics-grid">
                    <div className="metric-cell">
                      <span className="metric-label">Decadal Rate (Sen)</span>
                      <span className="metric-val">
                        {trendA.rate_per_decade != null
                          ? `${trendA.rate_per_decade > 0 ? '+' : ''}${trendA.rate_per_decade.toFixed(4)} ${trendA.rate_unit}`
                          : 'Not evaluable'}
                      </span>
                    </div>

                    <div className="metric-cell">
                      <span className="metric-label">Mann-Kendall P-Value</span>
                      <span className="metric-val">
                        {trendA.p_value != null ? `p = ${trendA.p_value.toFixed(4)}` : 'Inconclusive'}
                      </span>
                    </div>

                    <div className="metric-cell">
                      <span className="metric-label">95% Confidence Interval</span>
                      <span className="metric-val">
                        {trendA.confidence_interval_95
                          ? `[${trendA.confidence_interval_95[0].toFixed(2)}, ${trendA.confidence_interval_95[1].toFixed(2)}]`
                          : 'None'}
                      </span>
                    </div>

                    <div className="metric-cell">
                      <span className="metric-label">Direction Class</span>
                      <span className="metric-val mono-badge">{trendA.direction}</span>
                    </div>
                  </div>

                  {trendA.scientific_caveat && (
                    <div className="scientific-caveat-box">
                      <strong>Scientific Caveat:</strong> {trendA.scientific_caveat}
                    </div>
                  )}
                </div>
              ) : (
                <div className="inspector-empty-state">
                  <p>Trend calculation in progress or series has fewer than 24 valid seasonal observations.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TELECONNECTIONS (A ⇄ B) */}
          {activeTab === 'teleconnections' && (
            <div className="deck-pane deck-pane-teleconnections">
              <div className="comparison-location-selector">
                <label>
                  <span>Select Comparative Location B</span>
                  <select
                    value={compare?.kind === 'region' ? compare.id : compare ? 'custom' : ''}
                    onChange={(event) => {
                      if (event.target.value === 'custom') return;
                      onSetCompare(event.target.value ? { kind: 'region', id: event.target.value } : null);
                    }}
                  >
                    <option value="">No comparative location selected</option>
                    {regions.map(({ id, name }) => (
                      <option key={id} value={id} disabled={keyA === id}>
                        {name}
                      </option>
                    ))}
                    {compare?.kind === 'coordinates' && <option value="custom">Pinned Coordinates B</option>}
                  </select>
                </label>
              </div>

              {/* Teleconnection Radar Component */}
              <TeleconnectionRadar
                preset={null}
                placeA={place}
                placeB={targetB}
                reportA={reportA}
                reportB={reportB}
                onFocusA={onGoToA}
                onFocusB={onGoToB}
                onFrameBoth={onFrameBoth}
              />

              {/* Teleconnection Opposing Trend Presets */}
              <div className="presets-compact-bar">
                <span className="presets-bar-title">Planetary Teleconnection Presets:</span>
                <div className="presets-pills-row">
                  {teleconnectionPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="preset-pill-btn"
                      onClick={() => onLoadTeleconnectionPreset(preset.id)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEMPORAL ERAS */}
          {activeTab === 'epochs' && (
            <div className="deck-pane deck-pane-epochs">
              {location ? (
                <TemporalComparison
                  key={`${keyA}:${variable}:${variableRange.start}:${variableRange.end}`}
                  location={location}
                  locationName={place.name}
                  variable={variable}
                  variableName={variableRange.name}
                  available={{ start: variableRange.start, end: variableRange.end }}
                />
              ) : (
                <p className="no-data-msg">Select a location to compare temporal periods.</p>
              )}
            </div>
          )}

          {/* TAB 5: AI SYNTHESIS */}
          {activeTab === 'ai' && (
            <div className="deck-pane deck-pane-ai">
              {seriesA ? (
                <ScientificExplanation
                  location={place.name}
                  series={seriesA}
                  trend={trendA}
                />
              ) : (
                <p className="no-data-msg">Loading historical series for scientific synthesis...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}