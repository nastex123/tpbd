import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  fetchProjectionScenarios,
  fetchProjectionModels,
  fetchProjectionSeries,
  type ProjectionScenarioInfo,
  type ProjectionModelInfo,
  type ProjectionSeriesResponse,
  type SSPScenario,
} from '../globe/projectionData.ts';
import {
  getScenarioMetadata,
  calculateProjectionMetrics,
  MANDATORY_PROJECTION_CAVEAT,
  CMIP6_SUPPORTED_VARIABLES,
  type ProjectionMetrics,
} from './cmip6Projections.ts';

export { CMIP6_SUPPORTED_VARIABLES };

export interface CMIP6ProjectionsViewProps {
  place: { name: string; lat: number; lng: number };
  variableId: string;
  variableName: string;
  unit: string;
  historicalPoints?: Array<{ date: string; value: number | null }>;
  onSelectVariable?: (variableId: string) => void;
  onSelectRegion?: (regionId: string) => void;
  onMetricsChange?: (metrics: ProjectionMetrics | null) => void;
}

export function CMIP6ProjectionsView({
  place,
  variableId,
  variableName,
  unit,
  historicalPoints,
  onSelectVariable,
  onSelectRegion,
  onMetricsChange,
}: CMIP6ProjectionsViewProps) {
  const [localVariableId, setLocalVariableId] = useState<string | null>(null);

  useEffect(() => {
    setLocalVariableId(null);
  }, [variableId]);

  const activeVariableId = localVariableId || variableId;
  const isSupported = CMIP6_SUPPORTED_VARIABLES.has(activeVariableId);

  const [scenario, setScenario] = useState<SSPScenario>('ssp245');
  const [scenarios, setScenarios] = useState<ProjectionScenarioInfo[]>([]);
  const [models, setModels] = useState<ProjectionModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('ensemble');
  const [projection, setProjection] = useState<ProjectionSeriesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistorical, setShowHistorical] = useState<boolean>(true);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const [isExpandedModal, setIsExpandedModal] = useState<boolean>(false);

  // Close modal on Escape key
  useEffect(() => {
    if (!isExpandedModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpandedModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpandedModal]);

  // Hover state for interactive inspection
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    value: number;
    kind: 'historical' | 'projected';
    x: number;
    y: number;
  } | null>(null);

  // Load scenarios and models on mount
  useEffect(() => {
    const controller = new AbortController();

    async function initMetadata() {
      try {
        const [scenariosData, modelsData] = await Promise.all([
          fetchProjectionScenarios(controller.signal).catch(() => []),
          fetchProjectionModels(controller.signal).catch(() => []),
        ]);
        if (!controller.signal.aborted) {
          if (scenariosData.length > 0) setScenarios(scenariosData);
          if (modelsData.length > 0) setModels(modelsData);
        }
      } catch {
        // Handled silently; fallbacks are available in UI
      }
    }

    void initMetadata();

    return () => {
      controller.abort();
    };
  }, []);

  // Fetch projection series when parameters or reload trigger changes
  useEffect(() => {
    if (!isSupported) {
      setLoading(false);
      setError(null);
      setProjection(null);
      return;
    }

    const controller = new AbortController();

    async function loadProjectionSeries() {
      setLoading(true);
      setError(null);

      try {
        const seriesData = await fetchProjectionSeries({
          variableId: activeVariableId,
          lat: place.lat,
          lon: place.lng,
          scenario,
          model: selectedModel,
          startYear: 2015,
          endYear: 2100,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setProjection(seriesData);
          setLoading(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Failed to load CMIP6 projection series';
          setError(message);
          setProjection(null);
          setLoading(false);
        }
      }
    }

    void loadProjectionSeries();

    return () => {
      controller.abort();
    };
  }, [place.lat, place.lng, activeVariableId, isSupported, scenario, selectedModel, reloadTrigger]);

  const handleRetry = useCallback(() => {
    setReloadTrigger((count) => count + 1);
  }, []);

  const handleQuickSwitch = useCallback((newVariableId: string) => {
    onSelectVariable?.(newVariableId);
    setLocalVariableId(newVariableId);
  }, [onSelectVariable]);

  // Metric readouts: Baseline (2015-2025 mean), End-of-Century (2090-2100 mean), and Net Change (Delta)
  const metrics = useMemo(() => {
    return calculateProjectionMetrics(projection?.points, historicalPoints);
  }, [projection?.points, historicalPoints]);

  const onMetricsChangeRef = useRef(onMetricsChange);
  useEffect(() => {
    onMetricsChangeRef.current = onMetricsChange;
  }, [onMetricsChange]);

  useEffect(() => {
    onMetricsChange?.(metrics);
  }, [metrics, onMetricsChange]);

  useEffect(() => {
    return () => {
      onMetricsChangeRef.current?.(null);
    };
  }, []);

  const activeScenarioMeta = useMemo(() => {
    return getScenarioMetadata(scenario);
  }, [scenario]);

  const effectiveUnit = projection?.unit || unit || '';

  // SVG Chart Calculations
  const chartData = useMemo(() => {
    const hasHistorical = Boolean(historicalPoints && historicalPoints.length > 0);
    const validHistorical = (hasHistorical && showHistorical)
      ? (historicalPoints ?? []).filter((p): p is { date: string; value: number } => p.value !== null && Number.isFinite(p.value))
      : [];

    const projectedPoints = projection?.points ?? [];
    // Displays projected monthly points (2025-2100) as dashed line
    const validProjected = projectedPoints.filter(
      (p): p is { date: string; value: number; year: number; month: number; unit: string } =>
        p.value !== null && Number.isFinite(p.value) && p.year >= 2025,
    );

    let minHistoricalYear = 1981;
    if (validHistorical.length > 0) {
      const parsed = parseInt(validHistorical[0].date.slice(0, 4), 10);
      if (!isNaN(parsed)) minHistoricalYear = parsed;
    }

    const minYear = (showHistorical && validHistorical.length > 0) ? minHistoricalYear : 2025;
    const maxYear = 2100;

    const allValues: number[] = [
      ...validHistorical.map((p) => p.value),
      ...validProjected.map((p) => p.value),
    ];

    let minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
    let maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }
    const valSpan = maxVal - minVal;
    const yMin = minVal - valSpan * 0.06;
    const yMax = maxVal + valSpan * 0.06;

    const viewBoxWidth = 840;
    const viewBoxHeight = 240;
    const padLeft = 60;
    const padRight = 30;
    const padTop = 28;
    const padBottom = 34;
    const plotWidth = viewBoxWidth - padLeft - padRight;
    const plotHeight = viewBoxHeight - padTop - padBottom;

    function dateToX(dateStr: string, yr?: number, mo?: number): number {
      const year = yr ?? parseInt(dateStr.slice(0, 4), 10);
      const month = mo ?? (parseInt(dateStr.slice(5, 7), 10) || 1);
      const frac = year + (month - 1) / 12;
      const clamped = Math.max(minYear, Math.min(maxYear, frac));
      return padLeft + ((clamped - minYear) / (maxYear - minYear)) * plotWidth;
    }

    function valToY(val: number): number {
      const clamped = Math.max(yMin, Math.min(yMax, val));
      return padTop + (1 - (clamped - yMin) / (yMax - yMin)) * plotHeight;
    }

    // Historical path
    let historicalPath = '';
    for (let i = 0; i < validHistorical.length; i++) {
      const p = validHistorical[i];
      const x = dateToX(p.date);
      const y = valToY(p.value);
      historicalPath += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    // Projected path (2025-2100)
    let projectedPath = '';
    for (let i = 0; i < validProjected.length; i++) {
      const p = validProjected[i];
      const x = dateToX(p.date, p.year, p.month);
      const y = valToY(p.value);
      projectedPath += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    // Year ticks: Always include 2025, 2040, 2060, 2080, 2100
    const projectionTicks = [2025, 2040, 2060, 2080, 2100];
    const yearTicks = (showHistorical && validHistorical.length > 0)
      ? [1985, 2005, ...projectionTicks]
      : projectionTicks;

    // Y ticks
    const yTicks = [
      { val: minVal, y: valToY(minVal) },
      { val: (minVal + maxVal) / 2, y: valToY((minVal + maxVal) / 2) },
      { val: maxVal, y: valToY(maxVal) },
    ];

    const transitionX = dateToX('2025-01', 2025, 1);

    return {
      viewBoxWidth,
      viewBoxHeight,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotWidth,
      plotHeight,
      minYear,
      maxYear,
      yMin,
      yMax,
      dateToX,
      valToY,
      historicalPath,
      projectedPath,
      yearTicks,
      yTicks,
      transitionX,
      hasHistorical,
      validHistorical,
      validProjected,
      validProjectedCount: validProjected.length,
    };
  }, [historicalPoints, projection?.points, showHistorical]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clientX / rect.width));
    const yearFraction = chartData.minYear + fraction * (chartData.maxYear - chartData.minYear);
    const targetYear = Math.floor(yearFraction);
    const targetMonth = Math.min(12, Math.max(1, Math.floor((yearFraction - targetYear) * 12) + 1));
    const targetDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    const projPt = chartData.validProjected.find((p) => p.date === targetDate);
    if (projPt && projPt.value !== null) {
      setHoveredPoint({
        date: projPt.date,
        value: projPt.value,
        kind: 'projected',
        x: chartData.dateToX(projPt.date, projPt.year, projPt.month),
        y: chartData.valToY(projPt.value),
      });
      return;
    }

    if (showHistorical) {
      const histPt = chartData.validHistorical.find((p) => p.date === targetDate);
      if (histPt && histPt.value !== null) {
        setHoveredPoint({
          date: histPt.date,
          value: histPt.value,
          kind: 'historical',
          x: chartData.dateToX(histPt.date),
          y: chartData.valToY(histPt.value),
        });
      }
    }
  }, [chartData, showHistorical]);

  // Clamp hover tooltip to prevent off-screen overflow near right/left chart edges
  const isNearRightEdge = hoveredPoint ? hoveredPoint.x > chartData.viewBoxWidth * 0.75 : false;
  const isNearLeftEdge = hoveredPoint ? hoveredPoint.x < chartData.viewBoxWidth * 0.20 : false;
  const tooltipTransform = isNearRightEdge
    ? 'translate(-105%, -115%)'
    : isNearLeftEdge
      ? 'translate(5%, -115%)'
      : 'translate(-50%, -115%)';

  return (
    <div className="deck-pane-projections-panoramic" role="region" aria-label="CMIP6 Climate Projections">
      {!isSupported && (
        <div className="projections-unsupported-banner" role="status">
          <div className="unsupported-icon-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="unsupported-details">
            <h4 className="unsupported-title">NASA POWER CMIP6 Projections Variable Scope</h4>
            <p className="unsupported-message">
              NASA POWER CMIP6 climate models provide forward projections for Air Temperature (T2M), Precipitation (PRECTOTCORR), and Relative Humidity (RH2M).
            </p>
          </div>
          <div className="unsupported-actions">
            <button
              type="button"
              className="btn-switch-variable"
              onClick={() => handleQuickSwitch('T2M')}
            >
              Select Temperature (T2M)
            </button>
            <button
              type="button"
              className="btn-switch-variable"
              onClick={() => handleQuickSwitch('PRECTOTCORR')}
            >
              Select Precipitation (PRECTOTCORR)
            </button>
          </div>
        </div>
      )}

      {/* Top Controls Strip: Scenario Badges, Model Dropdown, Historical Toggle */}
      <div className="projections-controls-panel">
        <div className="scenario-selector-strip" role="group" aria-label="SSP Climate Scenarios">
          <span className="strip-label">SSP SCENARIO:</span>
          <button
            type="button"
            className={`ssp-badge ssp-badge-low ${scenario === 'ssp126' ? 'is-selected' : ''}`}
            onClick={() => setScenario('ssp126')}
            aria-pressed={scenario === 'ssp126'}
            title="SSP1-2.6: Low greenhouse gas emission pathway targeting < 2°C"
          >
            <span className="ssp-badge-dot" />
            <span className="ssp-badge-text">SSP1-2.6 · Low (+2.6 W/m²)</span>
          </button>

          <button
            type="button"
            className={`ssp-badge ssp-badge-medium ${scenario === 'ssp245' ? 'is-selected' : ''}`}
            onClick={() => setScenario('ssp245')}
            aria-pressed={scenario === 'ssp245'}
            title="SSP2-4.5: Medium emissions middle-of-the-road stabilization"
          >
            <span className="ssp-badge-dot" />
            <span className="ssp-badge-text">SSP2-4.5 · Medium (+4.5 W/m²)</span>
          </button>

          <button
            type="button"
            className={`ssp-badge ssp-badge-high ${scenario === 'ssp370' ? 'is-selected' : ''}`}
            onClick={() => setScenario('ssp370')}
            aria-pressed={scenario === 'ssp370'}
            title="SSP3-7.0: High emissions regional rivalry pathway"
          >
            <span className="ssp-badge-dot" />
            <span className="ssp-badge-text">SSP3-7.0 · High (+7.0 W/m²)</span>
          </button>
        </div>

        <div className="projections-secondary-controls">
          <label htmlFor="model-select" className="model-select-label">
            <span>MODEL:</span>
            <select
              id="model-select"
              className="model-select-dropdown"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loading}
              aria-label="Select CMIP6 Model"
            >
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.model_id} value={m.model_id}>
                    {m.name} ({m.institution})
                  </option>
                ))
              ) : (
                <>
                  <option value="ensemble">Multi-Model Ensemble (NASA POWER / NEX-GDDP-CMIP6)</option>
                  <option value="cesm2">CESM2 (NCAR (USA))</option>
                  <option value="ec_earth3">EC-Earth3 (EC-Earth Consortium (Europe))</option>
                  <option value="gfdl_esm4">GFDL-ESM4 (NOAA GFDL (USA))</option>
                  <option value="giss_e2_1_g">GISS-E2-1-G (NASA GISS (USA))</option>
                  <option value="ipsl_cm6a_lr">IPSL-CM6A-LR (IPSL (France))</option>
                  <option value="mpi_esm1_2_lr">MPI-ESM1-2-LR (Max Planck Institute (Germany))</option>
                </>
              )}
            </select>
          </label>

          <label className="historical-toggle-btn">
            <input
              type="checkbox"
              checked={showHistorical}
              onChange={(e) => setShowHistorical(e.target.checked)}
              disabled={!historicalPoints || historicalPoints.length === 0}
              aria-label="Compare Historical Observations vs Projections"
            />
            <span className="toggle-label-text">
              Compare Observations (1981–2024) vs Projections (2025–2100)
            </span>
          </label>
        </div>
      </div>

      {/* Main Trajectory Visualizer & Metric Readouts */}
      <div className="projections-chart-container">
        {!isSupported ? (
          <div className="projections-loading-overlay" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <p>
              NASA POWER CMIP6 projections are not available for {variableName || variableId}. Please select Air Temperature (T2M) or Precipitation (PRECTOTCORR) using the buttons above to inspect forward climate scenarios.
            </p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="projections-loading-overlay">
                <span className="deck-spinner" />
                <p>
                  Retrieving NASA POWER CMIP6 projections for {place.name} ({activeScenarioMeta.name})...
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="projections-error-panel" role="alert">
                <div className="error-icon-box">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="error-details">
                  <h4 className="error-title">Projection Stream Unavailable</h4>
                  <p className="error-message">{error}</p>
                </div>
                <button
                  type="button"
                  className="btn-retry-action"
                  onClick={handleRetry}
                >
                  Retry Query
                </button>
              </div>
            )}

            {!error && (
          <>
            {/* Chart Legend & Status Bar */}
            <div className="chart-legend-bar">
              <div className="legend-items">
                {showHistorical && chartData.hasHistorical && (
                  <div className="legend-item">
                    <span className="legend-line line-historical" />
                    <span>Historical (1981–2024)</span>
                  </div>
                )}
                <div className="legend-item">
                  <span className="legend-line line-projected" />
                  <span>Forward (2025–2100)</span>
                </div>
              </div>

              <div className="chart-legend-actions">
                <div className="badge-projected-container">
                  <span className="badge-projected">PROJECTED</span>
                  <span className="badge-variable-tag">{variableName} ({effectiveUnit})</span>
                </div>

                {/* Floating Caveat Badge with Tooltip in Chart Corner */}
                <div className="caveat-corner-badge" title={MANDATORY_PROJECTION_CAVEAT}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Caveat</span>
                  <div className="caveat-popover" role="tooltip">
                    <div className="caveat-popover-header">
                      <span className="caveat-popover-tag">SCIENTIFIC CAVEAT</span>
                    </div>
                    <p className="caveat-popover-body">{MANDATORY_PROJECTION_CAVEAT}</p>
                  </div>
                </div>

                {/* Expand Chart Modal Trigger */}
                <button
                  type="button"
                  className="btn-expand-modal"
                  onClick={() => setIsExpandedModal(true)}
                  title="Expand chart in high-definition cinema modal"
                  aria-label="Expand chart in high-definition cinema modal"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  <span>Expand</span>
                </button>
              </div>
            </div>

            {/* Responsive SVG Chart */}
            <div className="svg-chart-wrapper">
                <svg
                  viewBox={`0 0 ${chartData.viewBoxWidth} ${chartData.viewBoxHeight}`}
                  className="projections-svg-chart"
                  preserveAspectRatio="xMidYMid meet"
                  aria-label={`Time series projection for ${variableName}`}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Horizontal Gridlines & Y Axis Ticks */}
                  {chartData.yTicks.map((t, idx) => (
                    <g key={`ytick-${idx}`}>
                      <line
                        x1={chartData.padLeft}
                        x2={chartData.viewBoxWidth - chartData.padRight}
                        y1={t.y}
                        y2={t.y}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeDasharray="2 4"
                      />
                      <text
                        x={chartData.padLeft - 8}
                        y={t.y + 4}
                        className="svg-axis-text svg-axis-y"
                        textAnchor="end"
                      >
                        {t.val.toFixed(1)} {idx === chartData.yTicks.length - 1 ? effectiveUnit : ''}
                      </text>
                    </g>
                  ))}

                  {/* Vertical Year Gridlines & Labels */}
                  {chartData.yearTicks.map((yr) => {
                    const x = chartData.dateToX(`${yr}-01`, yr, 1);
                    return (
                      <g key={`x-year-${yr}`}>
                        <line
                          x1={x}
                          x2={x}
                          y1={chartData.padTop}
                          y2={chartData.padTop + chartData.plotHeight}
                          stroke="rgba(255, 255, 255, 0.06)"
                        />
                        <text
                          x={x}
                          y={chartData.padTop + chartData.plotHeight + 18}
                          className={`svg-axis-text svg-axis-x ${yr === 2025 ? 'highlight-2025' : ''}`}
                          textAnchor="middle"
                        >
                          {yr}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical 2025 Transition Separator */}
                  {showHistorical && chartData.hasHistorical && (
                    <g className="svg-transition-group">
                      <line
                        x1={chartData.transitionX}
                        x2={chartData.transitionX}
                        y1={chartData.padTop - 8}
                        y2={chartData.padTop + chartData.plotHeight}
                        stroke="rgba(245, 158, 11, 0.55)"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={chartData.transitionX + 4}
                        y={chartData.padTop - 2}
                        className="svg-transition-label"
                      >
                        2025 CMIP6 Projections →
                      </text>
                    </g>
                  )}

                  {/* Historical Series (Cyan Solid Line) */}
                  {showHistorical && chartData.historicalPath && (
                    <path
                      d={chartData.historicalPath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="svg-historical-line"
                    />
                  )}

                  {/* Projected Series (Amber Dashed Line, 2025-2100) */}
                  {chartData.projectedPath && (
                    <path
                      d={chartData.projectedPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeDasharray="5 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="svg-projected-line"
                    />
                  )}

                  {/* Interactive Hover Point Overlay */}
                  {hoveredPoint && (
                    <g className="svg-hover-group">
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.y}
                        r="4"
                        fill={hoveredPoint.kind === 'historical' ? '#38bdf8' : '#f59e0b'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}

                  {/* Interactive Scrubbing Plane */}
                  <rect
                    x={chartData.padLeft}
                    y={chartData.padTop}
                    width={chartData.plotWidth}
                    height={chartData.plotHeight}
                    fill="transparent"
                    className="svg-interactive-overlay"
                    onMouseMove={handleMouseMove}
                  />
                </svg>

                {/* Hover Tooltip Box */}
                {hoveredPoint && (
                  <div
                    className="chart-tooltip"
                    style={{
                      left: `${(hoveredPoint.x / chartData.viewBoxWidth) * 100}%`,
                      top: `${(hoveredPoint.y / chartData.viewBoxHeight) * 100}%`,
                      transform: tooltipTransform,
                    }}
                  >
                    <span className="tooltip-date">{hoveredPoint.date}</span>
                    <span className="tooltip-val">
                      {hoveredPoint.value.toFixed(2)} {effectiveUnit}
                    </span>
                    <span className={`tooltip-tag ${hoveredPoint.kind}`}>
                      {hoveredPoint.kind === 'historical' ? 'Historical' : 'Projected'}
                    </span>
                  </div>
                )}
              </div>
          </>
        )}
          </>
        )}
      </div>

      {/* High-Definition Cinema Projection Modal (Lightbox) */}
      {isExpandedModal && (
        <div
          className="projections-modal-overlay"
          onClick={() => setIsExpandedModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="High-Definition CMIP6 Projections View"
        >
          <div className="projections-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-kicker">NASA CMIP6 CLIMATE PROJECTION SUITE · LIGHTBOX</span>
                <h3 className="modal-heading">
                  {place.name} — Trajectory & Scenarios (1981–2100)
                </h3>
                <span className="modal-meta">
                  Scenario: <strong>{activeScenarioMeta.name}</strong> · Model: <strong>{selectedModel.toUpperCase()}</strong> · Variable: <strong>{variableName} ({effectiveUnit})</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn-modal-close-prominent"
                onClick={() => setIsExpandedModal(false)}
                title="Close projection modal"
                aria-label="Close projection modal"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Close</span>
              </button>
            </div>

            <div className="modal-body">
              {/* Modal Legend & Status Bar */}
              <div className="chart-legend-bar modal-legend-bar">
                <div className="legend-items">
                  {showHistorical && chartData.hasHistorical && (
                    <div className="legend-item">
                      <span className="legend-line line-historical" />
                      <span>Historical (1981–2024)</span>
                    </div>
                  )}
                  <div className="legend-item">
                    <span className="legend-line line-projected" />
                    <span>Forward ({activeScenarioMeta.name}, 2025–2100)</span>
                  </div>
                </div>

                <div className="chart-legend-actions">
                  <div className="badge-projected-container">
                    <span className="badge-projected">PROJECTED</span>
                    <span className="badge-variable-tag">{variableName} ({effectiveUnit})</span>
                  </div>
                </div>
              </div>

              {/* Large Panoramic SVG Stage */}
              <div className="modal-chart-stage">
                <svg
                  viewBox={`0 0 ${chartData.viewBoxWidth} ${chartData.viewBoxHeight}`}
                  className="modal-svg-chart"
                  preserveAspectRatio="xMidYMid meet"
                  aria-label={`Expanded time series projection for ${variableName}`}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Horizontal Gridlines & Y Axis Ticks */}
                  {chartData.yTicks.map((t, idx) => (
                    <g key={`modal-ytick-${idx}`}>
                      <line
                        x1={chartData.padLeft}
                        x2={chartData.viewBoxWidth - chartData.padRight}
                        y1={t.y}
                        y2={t.y}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeDasharray="2 4"
                      />
                      <text
                        x={chartData.padLeft - 8}
                        y={t.y + 4}
                        className="svg-axis-text svg-axis-y"
                        textAnchor="end"
                      >
                        {t.val.toFixed(1)} {idx === chartData.yTicks.length - 1 ? effectiveUnit : ''}
                      </text>
                    </g>
                  ))}

                  {/* Vertical Year Gridlines & Labels */}
                  {chartData.yearTicks.map((yr) => {
                    const x = chartData.dateToX(`${yr}-01`, yr, 1);
                    return (
                      <g key={`modal-x-year-${yr}`}>
                        <line
                          x1={x}
                          x2={x}
                          y1={chartData.padTop}
                          y2={chartData.padTop + chartData.plotHeight}
                          stroke="rgba(255, 255, 255, 0.06)"
                        />
                        <text
                          x={x}
                          y={chartData.padTop + chartData.plotHeight + 18}
                          className={`svg-axis-text svg-axis-x ${yr === 2025 ? 'highlight-2025' : ''}`}
                          textAnchor="middle"
                        >
                          {yr}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical 2025 Transition Separator */}
                  {showHistorical && chartData.hasHistorical && (
                    <g className="svg-transition-group">
                      <line
                        x1={chartData.transitionX}
                        x2={chartData.transitionX}
                        y1={chartData.padTop - 8}
                        y2={chartData.padTop + chartData.plotHeight}
                        stroke="rgba(245, 158, 11, 0.55)"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={chartData.transitionX + 4}
                        y={chartData.padTop - 2}
                        className="svg-transition-label"
                      >
                        2025 CMIP6 Projections →
                      </text>
                    </g>
                  )}

                  {/* Historical Series (Cyan Solid Line) */}
                  {showHistorical && chartData.historicalPath && (
                    <path
                      d={chartData.historicalPath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="svg-historical-line"
                    />
                  )}

                  {/* Projected Series (Amber Dashed Line, 2025-2100) */}
                  {chartData.projectedPath && (
                    <path
                      d={chartData.projectedPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.4"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="svg-projected-line"
                    />
                  )}

                  {/* Hover Point Indicator */}
                  {hoveredPoint && (
                    <g className="svg-hover-indicator">
                      <line
                        x1={hoveredPoint.x}
                        x2={hoveredPoint.x}
                        y1={chartData.padTop}
                        y2={chartData.padTop + chartData.plotHeight}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.y}
                        r="5"
                        fill={hoveredPoint.kind === 'historical' ? '#38bdf8' : '#f59e0b'}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Interactive Scrubbing Plane */}
                  <rect
                    x={chartData.padLeft}
                    y={chartData.padTop}
                    width={chartData.plotWidth}
                    height={chartData.plotHeight}
                    fill="transparent"
                    className="svg-interactive-overlay"
                    onMouseMove={handleMouseMove}
                  />
                </svg>

                {hoveredPoint && (
                  <div
                    className="chart-tooltip"
                    style={{
                      left: `${(hoveredPoint.x / chartData.viewBoxWidth) * 100}%`,
                      top: `${(hoveredPoint.y / chartData.viewBoxHeight) * 100}%`,
                      transform: tooltipTransform,
                    }}
                  >
                    <span className="tooltip-date">{hoveredPoint.date}</span>
                    <span className="tooltip-val">
                      {hoveredPoint.value.toFixed(2)} {effectiveUnit}
                    </span>
                    <span className={`tooltip-tag ${hoveredPoint.kind}`}>
                      {hoveredPoint.kind === 'historical' ? 'Historical' : 'Projected'}
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Metrics Cards Row */}
              <div className="modal-metrics-panel">
                <div className="modal-metric-card">
                  <span className="metric-header-tag">BASELINE MEAN (2015–2025)</span>
                  <span className="metric-primary-value">
                    {metrics.baselineMean !== null ? `${metrics.baselineMean.toFixed(2)} ${effectiveUnit}` : 'N/A'}
                  </span>
                  <span className="metric-context-note">
                    {metrics.baselinePointsCount > 0 ? `10-year reference window (${metrics.baselinePointsCount} observations)` : 'Reference window not available'}
                  </span>
                </div>

                <div className="modal-metric-card">
                  <span className="metric-header-tag">END-OF-CENTURY (2090–2100)</span>
                  <span className="metric-primary-value highlight-amber">
                    {metrics.endOfCenturyMean !== null ? `${metrics.endOfCenturyMean.toFixed(2)} ${effectiveUnit}` : 'N/A'}
                  </span>
                  <span className="metric-context-note">
                    {metrics.endOfCenturyPointsCount > 0 ? `10-year CMIP6 projection (${metrics.endOfCenturyPointsCount} months)` : 'Forward window not loaded'}
                  </span>
                </div>

                <div className="modal-metric-card">
                  <span className="metric-header-tag">NET CHANGE (DELTA Δ)</span>
                  <span
                    className={`metric-primary-value ${
                      metrics.delta !== null && metrics.delta > 0
                        ? 'delta-positive'
                        : metrics.delta !== null && metrics.delta < 0
                          ? 'delta-negative'
                          : ''
                    }`}
                  >
                    {metrics.delta !== null
                      ? `${metrics.delta > 0 ? '+' : ''}${metrics.delta.toFixed(2)} ${effectiveUnit}`
                      : 'N/A'}
                  </span>
                  <span className="metric-context-note">
                    {metrics.delta !== null ? 'End-of-century relative to baseline' : 'Insufficient data'}
                  </span>
                </div>
              </div>

              {/* Modal Scientific Caveat Banner */}
              <div className="modal-caveat-banner" role="note" aria-label="Scientific Caveat">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="modal-caveat-text">
                  <strong>SCIENTIFIC CAVEAT:</strong> {MANDATORY_PROJECTION_CAVEAT}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
