import React, { useMemo } from 'react';
import type { Report } from '../globe/globeData';
import { computeTeleconnectionDivergence } from '../globe/teleconnectionComparison';
import type { TeleconnectionPreset } from './DataDetectiveWorkbench';
import './teleconnection-radar.css';

export interface TeleconnectionRadarProps {
  preset: TeleconnectionPreset | null;
  placeA: { id?: string | null; name: string; lat: number; lng: number } | null;
  placeB: { id?: string | null; name: string; lat: number; lng: number } | null;
  reportA: Report | undefined;
  reportB: Report | undefined;
  onFocusA?: () => void;
  onFocusB?: () => void;
  onFrameBoth?: () => void;
}

export const TeleconnectionRadar: React.FC<TeleconnectionRadarProps> = ({
  preset,
  placeA,
  placeB,
  reportA,
  reportB,
  onFocusA,
  onFocusB,
  onFrameBoth,
}) => {
  const divergence = useMemo(() => {
    if (!placeA || !placeB) return null;
    return computeTeleconnectionDivergence(
      reportA?.trend,
      reportB?.trend,
      { lat: placeA.lat, lng: placeA.lng },
      { lat: placeB.lat, lng: placeB.lng }
    );
  }, [reportA?.trend, reportB?.trend, placeA, placeB]);

  if (!placeA || !placeB || !divergence) return null;

  const trendA = reportA?.trend;
  const trendB = reportB?.trend;

  const rateAStr = trendA?.rate_per_decade !== null && trendA?.rate_per_decade !== undefined
    ? `${trendA.rate_per_decade > 0 ? '+' : ''}${trendA.rate_per_decade} ${trendA.rate_unit}`
    : 'Not evaluable';

  const rateBStr = trendB?.rate_per_decade !== null && trendB?.rate_per_decade !== undefined
    ? `${trendB.rate_per_decade > 0 ? '+' : ''}${trendB.rate_per_decade} ${trendB.rate_unit}`
    : 'Not evaluable';

  const rateAClass = trendA?.rate_per_decade ? (trendA.rate_per_decade > 0 ? 'positive' : 'negative') : 'neutral';
  const rateBClass = trendB?.rate_per_decade ? (trendB.rate_per_decade > 0 ? 'positive' : 'negative') : 'neutral';

  const badgeLabels: Record<string, string> = {
    opposing_significant: 'Opposing Significant Trends',
    divergent_amplification: 'Amplified Divergence',
    parallel: 'Parallel Trajectory',
    inconclusive: 'Calculating Rates…',
  };

  return (
    <section className="teleconnection-radar" aria-labelledby="teleconnection-radar-heading">
      <div className="radar-header">
        <div className="radar-title-group">
          <h4 id="teleconnection-radar-heading">Planetary Teleconnection Radar</h4>
          <span className="radar-subtitle">Dual Spatial Comparison · {divergence.distanceKm.toLocaleString()} km Geodesic Arc</span>
        </div>
        <span className="divergence-badge" data-type={divergence.divergenceType}>
          <span className="pulse-dot" />
          {badgeLabels[divergence.divergenceType] || 'Comparative Node'}
        </span>
      </div>

      {preset && (
        <div className="preset-scientific-context">
          <strong>Biophysical Driver ({preset.name}):</strong>
          {preset.note}
        </div>
      )}

      <div className="divergence-metrics-grid">
        <div className="location-metric-card" data-node="A">
          <span className="node-label">Location A</span>
          <div className="node-name" title={placeA.name}>{placeA.name}</div>
          <div className={`node-rate ${rateAClass}`}>{rateAStr}</div>
          {trendA?.confidence_interval_95 && (
            <div className="node-ci">95% CI: [{trendA.confidence_interval_95.join(', ')}]</div>
          )}
          {trendA?.p_value !== null && trendA?.p_value !== undefined && (
            <div className="node-ci">Significance: p = {trendA.p_value}</div>
          )}
        </div>

        <div className="location-metric-card" data-node="B">
          <span className="node-label">Location B</span>
          <div className="node-name" title={placeB.name}>{placeB.name}</div>
          <div className={`node-rate ${rateBClass}`}>{rateBStr}</div>
          {trendB?.confidence_interval_95 && (
            <div className="node-ci">95% CI: [{trendB.confidence_interval_95.join(', ')}]</div>
          )}
          {trendB?.p_value !== null && trendB?.p_value !== undefined && (
            <div className="node-ci">Significance: p = {trendB.p_value}</div>
          )}
        </div>
      </div>

      <div className="divergence-synthesis-bar">
        <div className="synthesis-stat">
          <span>Net Rate Difference (ΔQ = Q_A − Q_B):</span>
          <strong>
            {divergence.rateDiff !== null
              ? `${divergence.rateDiff > 0 ? '+' : ''}${divergence.rateDiff} ${divergence.unit}`
              : 'Calculating…'}
          </strong>
        </div>
        <div className="synthesis-summary">{divergence.divergenceSummary}</div>
      </div>

      <div className="radar-actions">
        {onFrameBoth && (
          <button type="button" className="radar-btn highlight" onClick={onFrameBoth}>
            Frame Arc (View Both)
          </button>
        )}
        {onFocusA && (
          <button type="button" className="radar-btn" onClick={onFocusA}>
            Orbit to Node A ({placeA.name.split(' ')[0]})
          </button>
        )}
        {onFocusB && (
          <button type="button" className="radar-btn" onClick={onFocusB}>
            Orbit to Node B ({placeB.name.split(' ')[0]})
          </button>
        )}
      </div>
    </section>
  );
};
