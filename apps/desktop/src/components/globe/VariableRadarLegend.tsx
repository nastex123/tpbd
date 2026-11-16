import React, { useState } from 'react';
import { getVariableProfile } from './variableVisualization';
import './variable-radar-legend.css';

export interface VariableRadarLegendProps {
  variableId: string;
  currentValue: number | null;
  unit: string;
  date?: string;
  locationName?: string;
  isDeckOpen?: boolean;
}

export const VariableRadarLegend: React.FC<VariableRadarLegendProps> = ({
  variableId,
  currentValue,
  unit,
  date,
  locationName,
  isDeckOpen = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const profile = getVariableProfile(variableId);
  const categoryInfo = profile.getCategoryLabel(currentValue);

  return (
    <aside
      className={`variable-radar-hud shadow-bevel ${isDeckOpen ? 'deck-open' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
      aria-label="Atmospheric and Variable Radar Legend"
    >
      {isCollapsed ? (
        <button
          type="button"
          className="radar-hud-collapsed-pill btn-tactile"
          onClick={() => setIsCollapsed(false)}
          title="Expand meteorological radar legend"
          aria-label="Expand meteorological radar legend"
        >
          <span className="radar-status-dot" style={{ backgroundColor: categoryInfo.color }} />
          <span className="radar-hud-title">{profile.name}</span>
          {currentValue !== null && (
            <span className="radar-scale-tick">
              {currentValue.toFixed(1)} {unit}
            </span>
          )}
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      ) : (
        <>
          {/* Header */}
          <div className="radar-hud-header">
            <div className="radar-hud-titles">
              <span className="radar-hud-title">{profile.name}</span>
              <span className="radar-hud-sensor">{profile.sensor}</span>
            </div>
            <button
              type="button"
              className="radar-hud-toggle btn-tactile"
              onClick={() => setIsCollapsed(true)}
              title="Minimize legend"
              aria-label="Minimize legend"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="radar-hud-body">
            {/* Live Observation Reading Row */}
            <div className="radar-hud-reading-row">
              <div className="radar-hud-value-group">
                <span className="radar-hud-value">
                  {currentValue !== null ? currentValue.toFixed(2) : '--'}
                </span>
                <span className="radar-hud-unit">{unit}</span>
              </div>
              <span
                className="radar-hud-status-badge"
                style={{ color: categoryInfo.color }}
              >
                <span
                  className="radar-status-dot"
                  style={{ backgroundColor: categoryInfo.color }}
                />
                <span>{categoryInfo.label}</span>
              </span>
            </div>

            {/* Stepped Reflectivity Color Bar */}
            <div className="radar-scale-container">
              <div className="radar-color-bar" role="img" aria-label={`Reflectivity scale for ${profile.name}`}>
                {profile.colorRamp.map((stop, idx) => (
                  <div
                    key={`${stop.threshold}-${idx}`}
                    className="radar-scale-step"
                    style={{ backgroundColor: stop.color }}
                    title={`${stop.label} (${stop.threshold === Infinity ? '> ' + profile.colorRamp[idx - 1]?.threshold : stop.threshold} ${unit})`}
                  />
                ))}
              </div>
              <div className="radar-scale-ticks">
                {profile.category === 'radar' ? (
                  <>
                    <span className="radar-scale-tick">Trace</span>
                    <span className="radar-scale-tick">Mod</span>
                    <span className="radar-scale-tick">High</span>
                    <span className="radar-scale-tick">Severe</span>
                    <span className="radar-scale-tick">Torr</span>
                  </>
                ) : (
                  <>
                    <span className="radar-scale-tick">Min</span>
                    <span className="radar-scale-tick">Low</span>
                    <span className="radar-scale-tick">Med</span>
                    <span className="radar-scale-tick">Max</span>
                  </>
                )}
              </div>
            </div>

            {/* Temporal / Spatial Context Tag */}
            {(date || locationName) && (
              <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-0.5 border-t border-white/5">
                {locationName && <span className="truncate max-w-[140px]">{locationName}</span>}
                {date && <span className="text-slate-400/80">{date}</span>}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};
