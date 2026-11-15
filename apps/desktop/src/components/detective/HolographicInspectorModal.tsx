import { useState, useEffect, useRef } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import type { Place } from '../globe/globeGeography';
import { pointValue, type DataPoint, type Report } from '../globe/globeData';
import { HistoryChart } from '../globe/HistoryChart';
import { ScientificExplanation } from '../globe/ScientificExplanation';
import { TemporalComparison } from '../globe/TemporalComparison';
import { TeleconnectionRadar } from './TeleconnectionRadar';
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
  availableVariables?: readonly VariableItem[];
  onSelectVariable?: (variableId: string) => void;
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
  availableVariables,
  onSelectVariable,
  dates,
  visibleDate,
  onSetVisibleDate,
  playing,
  onSetPlaying,
  bounds,
  teleconnectionPresets,
  onLoadTeleconnectionPreset,
  onGoToA,
  onGoToB,
  onFrameBoth,
  regions,
}: HolographicInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('series');
  const [isMinimized, setIsMinimized] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);

  // Reset to 'series' and expand deck whenever a new location is selected or opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab('series');
      setIsMinimized(false);
    }
  }, [place?.name, isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !place) return null;

  const seriesA = reportA?.series;
  const trendA = reportA?.trend;
  const validA = seriesA?.points.filter((point: DataPoint) => point.value !== null).length ?? 0;
  const chartValue = pointValue(seriesA?.points, visibleDate);
  const keyA = location ? (location.kind === 'region' ? location.id : `${location.lat},${location.lng}`) : '';

  return (
    <aside
      ref={deckRef}
      className={`bottom-telemetry-deck ${isMinimized ? 'is-minimized' : ''} tab-${activeTab}`}
      role="region"
      aria-label="Earth Observation Telemetry Deck"
    >
      {/* Top Telemetry Header Bar */}
      <div className="deck-header-bar">
        <div className="deck-header-left">
          <span className="deck-pulse-indicator" />
          <h2 className="deck-target-title">{place.name}</h2>
          <span className="deck-coords-tag">
            {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}° · {seriesA?.representative_grid_cell || '0.5° grid'}
          </span>
          <span className="deck-source-pill">
            {seriesA?.is_cached
              ? 'Verified NASA Cache'
              : seriesA?.provider.includes('offline')
              ? 'Offline Snapshot'
              : 'NASA POWER Live Query'}
          </span>
        </div>

        <div className="deck-header-actions">
          {location?.kind === 'coordinates' && compare?.kind !== 'coordinates' && (
            <button
              type="button"
              className="deck-btn-pin"
              onClick={() => onSetCompare(location)}
              title="Pin these coordinates as comparative Location B"
            >
              Pin as Location B
            </button>
          )}

          <button
            type="button"
            className="deck-btn-tool"
            onClick={() => setIsMinimized((v) => !v)}
            title={isMinimized ? 'Expand flight deck' : 'Minimize flight deck'}
            aria-label={isMinimized ? 'Expand flight deck' : 'Minimize flight deck'}
          >
            {isMinimized ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            <span>{isMinimized ? 'Restore Deck' : 'Minimize'}</span>
          </button>

          <button
            type="button"
            className="deck-btn-close"
            onClick={onClose}
            aria-label="Close Telemetry Deck"
            title="Close Telemetry Deck"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Deck Console Body */}
      {!isMinimized && (
        <div className="deck-console-body">
          {/* 1. LEFT COLUMN: Identity, Metric & Sen's Slope Verdict */}
          <div className="deck-col-identity">
            <div className="deck-metric-box">
              <label htmlFor="deck-variable-select" className="deck-col-label">
                OBSERVED VARIABLE
              </label>
              {onSelectVariable && availableVariables && availableVariables.length > 0 ? (
                <div className="deck-variable-select-wrapper">
                  <select
                    id="deck-variable-select"
                    className="deck-variable-dropdown"
                    value={variable}
                    onChange={(e) => onSelectVariable(e.target.value)}
                    aria-label="Select NASA Earth observation variable"
                  >
                    {availableVariables.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.id})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <span className="deck-variable-name">{variableRange.name}</span>
                  <span className="deck-variable-code">({variable})</span>
                </>
              )}
              <span className="deck-variable-unit">
                Unit: {seriesA?.unit || variableRange.unit || ''}
              </span>
            </div>

            <div className="deck-trend-box">
              <span className="deck-col-label">SEN'S SLOPE TREND</span>
              {trendA && trendA.rate_per_decade != null ? (
                <div className="deck-trend-content">
                  <span className={`deck-trend-rate ${trendA.direction}`}>
                    {trendA.rate_per_decade > 0 ? '+' : ''}
                    {trendA.rate_per_decade.toFixed(2)} {trendA.rate_unit}
                  </span>
                  <span className="deck-pvalue-tag">
                    {trendA.p_value != null ? `p = ${trendA.p_value.toFixed(4)}` : 'Inconclusive'}
                  </span>
                </div>
              ) : (
                <span className="deck-trend-pending">Calculating statistical trend...</span>
              )}
            </div>

            <div className="deck-quick-actions">
              {location?.kind === 'coordinates' && (
                <button
                  type="button"
                  className="deck-sub-action-btn"
                  onClick={() => onSetCompare(location)}
                >
                  Pin Comparative B
                </button>
              )}
            </div>
          </div>

          {/* 2. CENTER COLUMN: Dynamic Panoramas (Chart / Trend / Radar / Eras / AI) */}
          <div className="deck-col-center">
            {/* DIMENSION 1: PANORAMIC OBSERVATIONS CHART */}
            {activeTab === 'series' && (
              <div className="deck-pane-chart">
                {seriesA ? (
                  <>
                    <div className="chart-telemetry-strip">
                      <div className="chart-readout-item">
                        <span className="readout-tag">DATE</span>
                        <span className="readout-val highlight-cyan">{visibleDate || 'Select month'}</span>
                      </div>
                      <div className="chart-readout-item">
                        <span className="readout-tag">VALUE</span>
                        <span className="readout-val highlight-val">
                          {chartValue === null ? 'No Data' : `${chartValue} ${seriesA.unit}`}
                        </span>
                      </div>
                      <div className="chart-readout-item">
                        <span className="readout-tag">COMPLETENESS</span>
                        <span className="readout-val">{validA} / {seriesA.points.length} months valid</span>
                      </div>
                    </div>

                    {validA > 0 && (
                      <div className="deck-panoramic-chart-box">
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

                    {/* Timeline Controls & Scale */}
                    <div className="deck-timeline-controls">
                      <button
                        type="button"
                        className="deck-btn-play"
                        onClick={() => onSetPlaying((v) => !v)}
                        title={playing ? 'Pause stream' : 'Play stream'}
                      >
                        {playing ? (
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                        <span>{playing ? 'Pause' : 'Play Stream'}</span>
                      </button>

                      <input
                        type="range"
                        min={0}
                        max={dates.length - 1}
                        value={dates.indexOf(visibleDate)}
                        onPointerDown={() => onSetPlaying(false)}
                        onChange={(e) => {
                          onSetPlaying(false);
                          onSetVisibleDate(dates[Number(e.target.value)]);
                        }}
                        className="deck-slider"
                        aria-label="Timeline month slider"
                      />

                      <div className="deck-spectrum-scale">
                        <span>{bounds[0].toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                        <span className="spectrum-gradient" />
                        <span>{bounds[1].toLocaleString(undefined, { maximumFractionDigits: 1 })} {seriesA.unit}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="deck-loading-state">
                    <span className="deck-spinner" />
                    <p>{reportA?.message || 'Connecting to NASA POWER and downloading observations...'}</p>
                  </div>
                )}
              </div>
            )}

            {/* DIMENSION 2: TREND & STATISTICS */}
            {activeTab === 'trend' && (
              <div className="deck-pane-trend-panoramic">
                {trendA ? (
                  <div className="deck-trend-grid-layout">
                    <div className="stat-lead-box">
                      <span className="stat-label">SEN'S SLOPE VERDICT</span>
                      <p className="verdict-text">{trendA.plain_language_verdict}</p>
                      {trendA.scientific_caveat && (
                        <p className="caveat-text"><strong>Caveat:</strong> {trendA.scientific_caveat}</p>
                      )}
                    </div>

                    <div className="stat-cells-row">
                      <div className="stat-cell">
                        <span className="cell-label">Rate / Decade</span>
                        <span className="cell-val">
                          {trendA.rate_per_decade != null
                            ? `${trendA.rate_per_decade > 0 ? '+' : ''}${trendA.rate_per_decade.toFixed(4)} ${trendA.rate_unit}`
                            : 'Not evaluable'}
                        </span>
                      </div>
                      <div className="stat-cell">
                        <span className="cell-label">Mann-Kendall P-Value</span>
                        <span className="cell-val">
                          {trendA.p_value != null ? `p = ${trendA.p_value.toFixed(4)}` : 'Inconclusive'}
                        </span>
                      </div>
                      <div className="stat-cell">
                        <span className="cell-label">95% Confidence Interval</span>
                        <span className="cell-val">
                          {trendA.confidence_interval_95
                            ? `[${trendA.confidence_interval_95[0].toFixed(2)}, ${trendA.confidence_interval_95[1].toFixed(2)}]`
                            : 'None'}
                        </span>
                      </div>
                      <div className="stat-cell">
                        <span className="cell-label">Classification</span>
                        <span className="cell-val badge-cyan">{trendA.direction}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="deck-msg-empty">Trend calculation in progress or series has fewer than 24 observations.</p>
                )}
              </div>
            )}

            {/* DIMENSION 3: TELECONNECTIONS RADAR */}
            {activeTab === 'teleconnections' && (
              <div className="deck-pane-teleconnections-panoramic">
                <div className="teleconnection-deck-header">
                  <label className="teleconnection-selector">
                    <span>Comparative Target B:</span>
                    <select
                      value={compare?.kind === 'region' ? compare.id : compare ? 'custom' : ''}
                      onChange={(event) => {
                        if (event.target.value === 'custom') return;
                        onSetCompare(event.target.value ? { kind: 'region', id: event.target.value } : null);
                      }}
                    >
                      <option value="">Select a region to compare...</option>
                      {regions.map(({ id, name }) => (
                        <option key={id} value={id} disabled={keyA === id}>
                          {name}
                        </option>
                      ))}
                      {compare?.kind === 'coordinates' && <option value="custom">Pinned Coordinates B</option>}
                    </select>
                  </label>

                  <div className="presets-horizontal-row">
                    <span className="presets-label">Presets:</span>
                    {teleconnectionPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="deck-preset-chip"
                        onClick={() => onLoadTeleconnectionPreset(preset.id)}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="teleconnection-radar-wrapper">
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
                </div>
              </div>
            )}

            {/* DIMENSION 4: TEMPORAL ERAS */}
            {activeTab === 'epochs' && (
              <div className="deck-pane-epochs-panoramic">
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
                  <p className="deck-msg-empty">Select a location to compare temporal periods.</p>
                )}
              </div>
            )}

            {/* DIMENSION 5: AI SYNTHESIS */}
            {activeTab === 'ai' && (
              <div className="deck-pane-ai-panoramic">
                {seriesA ? (
                  <ScientificExplanation
                    location={place.name}
                    series={seriesA}
                    trend={trendA}
                  />
                ) : (
                  <p className="deck-msg-empty">Loading series for scientific synthesis...</p>
                )}
              </div>
            )}
          </div>

          {/* 3. RIGHT COLUMN: Multi-Dimension Tabs */}
          <div className="deck-col-tabs" role="tablist" aria-label="Investigation Dimensions">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'series'}
              className={`deck-tab-button ${activeTab === 'series' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('series')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Observations Chart</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'trend'}
              className={`deck-tab-button ${activeTab === 'trend' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('trend')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Trend & Statistics</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'teleconnections'}
              className={`deck-tab-button ${activeTab === 'teleconnections' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('teleconnections')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Teleconnections Radar</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'epochs'}
              className={`deck-tab-button ${activeTab === 'epochs' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('epochs')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Temporal Eras</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ai'}
              className={`deck-tab-button ${activeTab === 'ai' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
              </svg>
              <span>AI Synthesis</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
