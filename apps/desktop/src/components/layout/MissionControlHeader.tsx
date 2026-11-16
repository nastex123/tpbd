import { useEffect, useState } from 'react';
import { localApiFetch } from '../globe/localApi';
import { DataDetectiveGuideModal } from './DataDetectiveGuideModal';
import './mission-control-header.css';

interface BackendTelemetry {
  online: boolean;
  latencyMs: number | null;
  version?: string;
}

export function MissionControlHeader() {
  const [utcTime, setUtcTime] = useState<string>('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<BackendTelemetry>({
    online: false,
    latencyMs: null,
  });

  // Real-time UTC Mission Clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setUtcTime(now.toISOString().slice(11, 19) + ' UTC');
    }
    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Live Backend Telemetry Probe (Zero Mocks - Real Health Ping)
  useEffect(() => {
    let active = true;

    async function probeBackend() {
      const startTime = performance.now();
      try {
        const response = await localApiFetch('/health', {
          signal: AbortSignal.timeout(3500),
        });
        const duration = Math.round(performance.now() - startTime);
        if (response.ok && active) {
          const data: unknown = await response.json().catch(() => null);
          const version = (data && typeof data === 'object' && 'version' in data)
            ? String((data as { version: unknown }).version)
            : undefined;
          setTelemetry({ online: true, latencyMs: duration, version });
        } else if (active) {
          setTelemetry({ online: false, latencyMs: null });
        }
      } catch {
        if (active) {
          setTelemetry({ online: false, latencyMs: null });
        }
      }
    }

    void probeBackend();
    const interval = window.setInterval(probeBackend, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <header className="mission-control-header" role="banner">
      <div className="header-brand-section">
        <img
          src="./logo-tpbd.png"
          alt="The Pale Blue Dot Logo"
          className="header-mission-logo"
        />
        <div className="header-brand-titles">
          <div className="brand-logotype">
            <span className="brand-tpbd">TPBD</span>
            <span className="pale-blue-beacon" title="Voyager 1 Pale Blue Dot Indicator" />
          </div>
          <span className="brand-subtitle">The Pale Blue Dot · Earth System Trend Detective</span>
        </div>
      </div>

      <div className="header-telemetry-section">
        {/* Live Satellite Mission Telemetry */}
        <div className="telemetry-badge" title="Active Earth Observing System Sensors">
          <span className="telemetry-label">SENSORS:</span>
          <span className="telemetry-value telemetry-mono">MERRA-2 · MODIS · GPM</span>
        </div>

        {/* Live Backend Connection Status */}
        <div
          className={`telemetry-badge status-badge ${telemetry.online ? 'status-online' : 'status-offline'}`}
          title={telemetry.online ? `FastAPI backend connected at 127.0.0.1:8000 (${telemetry.latencyMs}ms)` : 'Backend disconnected'}
        >
          <span className="status-indicator-dot" />
          <span className="telemetry-mono">
            {telemetry.online
              ? `API LIVE · ${telemetry.latencyMs}ms`
              : 'API OFFLINE'}
          </span>
        </div>

        {/* Live UTC Mission Clock */}
        <div className="telemetry-badge clock-badge" title="Coordinated Universal Time">
          <span className="telemetry-mono">{utcTime || '--:--:-- UTC'}</span>
        </div>

        {/* NASA Data Detective Student Guide Trigger */}
        <button
          type="button"
          className="telemetry-badge header-guide-trigger btn-tactile"
          onClick={() => setGuideOpen(true)}
          title="Open NASA Data Detective Student Guide"
          aria-label="Open NASA Data Detective Student Guide"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="telemetry-mono">GUIDE</span>
        </button>

        {/* NASA AI Mission Control Copilot Trigger */}
        <button
          type="button"
          className="telemetry-badge header-copilot-trigger btn-tactile"
          onClick={() => window.dispatchEvent(new CustomEvent('tpbd:open-copilot'))}
          title="Open NASA AI Copilot Terminal (Cmd+K / Ctrl+K)"
          aria-label="Open NASA AI Copilot Terminal"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <span className="telemetry-mono">COPILOT</span>
          <kbd className="header-kbd">Cmd+K</kbd>
        </button>
      </div>

      <DataDetectiveGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </header>
  );
}
