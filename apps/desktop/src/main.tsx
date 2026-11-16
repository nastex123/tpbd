import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './index.css';
import { MissionControlHeader } from './components/layout/MissionControlHeader';
import { RegionGlobe } from './components/globe/RegionGlobe';
import type { LocationSelection } from './stores/navigationStore';
import { localApiFetch } from './components/globe/localApi';

function App() {
  const [status, setStatus] = useState('');
  const [checking, setChecking] = useState(false);
  const [location, setLocation] = useState<LocationSelection | null>(null);

  async function checkBackend() {
    setChecking(true);
    setStatus('Checking backend connection…');
    try {
      const response = await localApiFetch('/health', {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) {
        setStatus(`Failed to probe local API (HTTP ${response.status}). Verify FastAPI is running at 127.0.0.1:8000 and serves GET /health.`);
        return;
      }
      const payload: unknown = await response.json().catch(() => null);
      const ready = typeof payload === 'object' && payload !== null && 'status' in payload;
      setStatus(ready ? 'Local API connected and operational.' : 'Local API did not respond with expected payload.');
    } catch {
      setStatus('Local API is unreachable.');
    } finally {
      setChecking(false);
    }
  }

  function checkGraphics() {
    const context = document.createElement('canvas').getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    setStatus(context ? 'WebGL 2 context active.' : 'WebGL 2 context unavailable.');
  }

  return (
    <div className="desktop-shell">
      <MissionControlHeader />
      <main id="inicio" className="desktop-workspace">
        <RegionGlobe
          location={location}
          onSelect={setLocation}
          heading={<>
            <h1>TPBD — Data Detective</h1>
            <p>Investigate planetary climate trends, regime shifts, and opposing teleconnections across Earth system biomes.</p>
          </>}
        >
          {import.meta.env.DEV && window.location.search.includes('debug=1') && (
            <section id="diagnostico" aria-labelledby="diagnostico-titulo">
              <h2 id="diagnostico-titulo">Mission Telemetry & Diagnostics</h2>
              <button onClick={checkBackend} disabled={checking}>Probe local API</button>{' '}
              <button onClick={checkGraphics} disabled={checking}>Probe WebGL 2</button>
              <p role="status">{status}</p>
            </section>
          )}
        </RegionGlobe>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
