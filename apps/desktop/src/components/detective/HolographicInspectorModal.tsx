import { useState, useMemo, useEffect, useRef } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import type { Place } from '../globe/globeGeography';
import { pointValue, type DataPoint, type Report } from '../globe/globeData';
import { HistoryChart } from '../globe/HistoryChart';
import { ScientificExplanation } from '../globe/ScientificExplanation';
import { TemporalComparison } from '../globe/TemporalComparison';
import { TeleconnectionRadar } from './TeleconnectionRadar';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset to compact mode & 'series' whenever a new location is selected or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('series');
      setIsExpanded(false);
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

  // Spatial HUD Geometry: Dynamic Reticle, Angled Leader Line, and Off-Center Placement
  const layout = useMemo(() => {
    const cardWidth = isExpanded ? 490 : 340;
    const cardHeight = isExpanded ? 470 : 230;

    if (!screenCoords) {
      return {
        cardStyle: { top: '80px', left: '24px', width: `${cardWidth}px` },
        hasTether: false,
        reticle: { x: 0, y: 0 },
        reticleExit: { x: 0, y: 0 },
        elbow: { x: 0, y: 0 },
        cardAnchor: { x: 0, y: 0 },
      };
    }

    const padding = 16;
    const maxLeft = Math.max(padding, window.innerWidth - cardWidth - padding);
    const maxTop = Math.max(76, window.innerHeight - cardHeight - padding);

    // Is the target located on the left 52% of the screen?
    const isLeftHalf = screenCoords.x < window.innerWidth * 0.52;
    const lateralGap = 70; // Clear margin so the target point and its continent are NEVER covered

    let left = isLeftHalf
      ? screenCoords.x + lateralGap
      : screenCoords.x - cardWidth - lateralGap;

    left = Math.min(maxLeft, Math.max(padding, left));

    let top = screenCoords.y - (isExpanded ? 110 : 70);
    top = Math.min(maxTop, Math.max(76, top));

    // Leader Line Geometry
    const reticleRadius = 14;
    const cardIsToRight = left >= screenCoords.x;

    const reticleExit = cardIsToRight
      ? { x: screenCoords.x + reticleRadius, y: screenCoords.y }
      : { x: screenCoords.x - reticleRadius, y: screenCoords.y };

    const cardAnchor = cardIsToRight
      ? { x: left, y: Math.min(top + cardHeight - 20, Math.max(top + 28, screenCoords.y - 12)) }
      : { x: left + cardWidth, y: Math.min(top + cardHeight - 20, Math.max(top + 28, screenCoords.y - 12)) };

    const elbowX = cardIsToRight
      ? Math.min(cardAnchor.x - 14, reticleExit.x + Math.max(20, (cardAnchor.x - reticleExit.x) * 0.4))
      : Math.max(cardAnchor.x + 14, reticleExit.x - Math.max(20, (reticleExit.x - cardAnchor.x) * 0.4));

    const elbow = { x: elbowX, y: cardAnchor.y };

    return {
      cardStyle: {
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        width: `${cardWidth}px`,
      },
      hasTether: true,
      reticle: { x: screenCoords.x, y: screenCoords.y },
      reticleExit,
      elbow,
      cardAnchor,
    };
  }, [screenCoords, isExpanded]);

  if (!isOpen || !place) return null;

  const seriesA = reportA?.series;
  const trendA = reportA?.trend;
  const validA = seriesA?.points.filter((point: DataPoint) => point.value !== null).length ?? 0;
  const chartValue = pointValue(seriesA?.points, visibleDate);

  const keyA = location ? (location.kind === 'region' ? location.id : `${location.lat},${location.lng}`) : '';

  return (
    <>
      {/* Invisible Click-Catcher: Dismisses HUD on outside click without darkening Earth */}
      <div
        className="inspector-focus-vignette"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Spatial HUD Holographic Leader Line & Target Reticle */}
      {layout.hasTether && (
        <svg className="spatial-hud-canvas" aria-hidden="true">
          <defs>
            <linearGradient id="hud-leader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#79dcff" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Target Reticle on Earth Coordinate */}
          <g className="hud-target-reticle" transform={`translate(${layout.reticle.x}, ${layout.reticle.y})`}>
            <circle r="14" className="reticle-ring" />
            <circle r="4" className="reticle-core" />
            <line x1="-18" y1="0" x2="-8" y2="0" className="reticle-notch" />
            <line x1="8" y1="0" x2="18" y2="0" className="reticle-notch" />
            <line x1="0" y1="-18" x2="0" y2="-8" className="reticle-notch" />
            <line x1="0" y1="8" x2="0" y2="18" className="reticle-notch" />
          </g>

          {/* Angled Leader Line */}
          <polyline
            points={`${layout.reticleExit.x},${layout.reticleExit.y} ${layout.elbow.x},${layout.elbow.y} ${layout.cardAnchor.x},${layout.cardAnchor.y}`}
            className="hud-leader-line"
          />
          {/* Elbow Joint Node */}
          <circle cx={layout.elbow.x} cy={layout.elbow.y} r="3" className="hud-joint-node" />
          {/* Card Anchor Node */}
          <circle cx={layout.cardAnchor.x} cy={layout.cardAnchor.y} r="2.5" className="hud-anchor-node" />
        </svg>
      )}

      {/* Spatial HUD Floating Card */}
      <div
        ref={modalRef}
        className={`spatial-hud-callout ${isExpanded ? 'is-expanded' : 'is-compact'}`}
        style={layout.cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-location-title"
      >
        {/* COMPACT MODE: Ultralight HUD Callout */}
        {!isExpanded ? (
          <div className="hud-compact-body">
            {/* Header */}
            <div className="hud-callout-header">
              <div className="hud-callout-meta">
                <span className="hud-telemetry-tag">
                  TARGET // {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}°
                </span>
                <h3 id="hud-location-title" className="hud-callout-name">
                  {place.name}
                </h3>
                <span className="hud-data-source-pill">
                  {seriesA?.is_cached
                    ? 'Verified NASA Cache'
                    : seriesA?.provider.includes('offline')
                    ? 'Offline Snapshot'
                    : 'NASA POWER Live'}
                </span>
              </div>

              <button
                type="button"
                className="hud-btn-close"
                onClick={onClose}
                aria-label="Close HUD Callout"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Metric Row */}
            <div className="hud-compact-metric-row">
              <div className="hud-metric-primary">
                <span className="hud-metric-label">{variableRange.name}</span>
                <span className="hud-metric-value">
                  {chartValue === null ? 'No Data' : `${chartValue} ${seriesA?.unit || ''}`}
                </span>
              </div>
              <div className="hud-metric-secondary">
                <span className="hud-date-badge">{visibleDate || 'Observation'}</span>
                {trendA && trendA.rate_per_decade != null && (
                  <span className={`hud-trend-badge ${trendA.direction}`}>
                    {trendA.rate_per_decade > 0 ? '+' : ''}{trendA.rate_per_decade.toFixed(2)} {trendA.rate_unit}
                  </span>
                )}
              </div>
            </div>

            {/* Mini Sparkline Chart */}
            {validA > 0 && seriesA && (
              <div className="hud-compact-sparkline-box">
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

            {/* Mini Playback Scrub Strip */}
            <div className="hud-compact-timeline-strip">
              <button
                type="button"
                className="hud-btn-mini-play"
                onClick={() => onSetPlaying((v) => !v)}
                title={playing ? 'Pause timeline playback' : 'Stream timeline playback'}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
                <span>{playing ? 'Pause' : 'Stream'}</span>
              </button>

              <input
                type="range"
                min={0}
                max={dates.length - 1}
                value={dates.indexOf(visibleDate)}
                onChange={(e) => onSetVisibleDate(dates[Number(e.target.value)])}
                className="hud-mini-slider"
                aria-label="Timeline month slider"
              />

              <span className="hud-mini-count">{validA} mo</span>
            </div>

            {/* Expand Full Tools Trigger */}
            <button
              type="button"
              className="hud-btn-expand-tools"
              onClick={() => setIsExpanded(true)}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              <span>Expand Analytics Tools (Trend, Radar, Eras, AI)</span>
            </button>
          </div>
        ) : (
          /* EXPANDED MODE: Full Diagnostic Deck */
          <div className="hud-expanded-body">
            {/* Header with Collapse Action */}
            <header className="inspector-modal-header">
              <div className="inspector-header-meta">
                <div className="inspector-title-row">
                  <span className="location-pin-indicator" />
                  <h2 id="hud-location-title" className="inspector-title">
                    {place.name}
                  </h2>
                </div>
                <div className="inspector-sub-badges">
                  <span className="live-status-pill">
                    {seriesA?.is_cached
                      ? 'Verified NASA Cache'
                      : seriesA?.provider.includes('offline')
                      ? 'Offline Snapshot'
                      : 'NASA POWER Live Query'}
                  </span>
                  <span className="coords-meta-pill">
                    {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}° · {seriesA?.representative_grid_cell || '0.5° grid'}
                  </span>
                </div>
              </div>

              <div className="inspector-header-actions">
                <button
                  type="button"
                  className="hud-btn-collapse-toggle"
                  onClick={() => setIsExpanded(false)}
                  title="Collapse to compact HUD callout"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                  <span>Compact</span>
                </button>

                {location?.kind === 'coordinates' && compare?.kind !== 'coordinates' && (
                  <button
                    type="button"
                    className="btn-header-pin"
                    onClick={() => onSetCompare(location)}
                    title="Pin coordinates as comparative Location B"
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
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Tabbed Navigation Deck (Zero Emojis, Clean SVG Icons) */}
            <nav className="inspector-tab-strip" aria-label="Investigation Dimensions">
              <button
                type="button"
                className={`inspector-tab-btn ${activeTab === 'series' ? 'active' : ''}`}
                onClick={() => setActiveTab('series')}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span>Observations</span>
              </button>

              <button
                type="button"
                className={`inspector-tab-btn ${activeTab === 'trend' ? 'active' : ''}`}
                onClick={() => setActiveTab('trend')}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
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

            {/* Deck Content Body */}
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

                      {/* Playback Controls & Scale Bar */}
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
                      <p>{reportA?.message || 'Connecting to NASA POWER and downloading observations...'}</p>
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
        )}
      </div>
    </>
  );
}
