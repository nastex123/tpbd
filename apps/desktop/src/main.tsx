import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RegionGlobe } from './components/globe/RegionGlobe';
import type { LocationSelection } from './stores/navigationStore';
import { localApiFetch } from './components/globe/localApi';

function App() {
  const [status, setStatus] = useState('');
  const [checking, setChecking] = useState(false);
  const [location, setLocation] = useState<LocationSelection | null>(null);

  async function checkBackend() {
    setChecking(true);
    setStatus('Comprobando la conexión…');
    try {
      const response = await localApiFetch('/health', {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) {
        setStatus(`No se pudo consultar la API local (HTTP ${response.status}). Comprueba que FastAPI esté en 127.0.0.1:8000 y sirva GET /health.`);
        return;
      }
      const payload: unknown = await response.json().catch(() => null);
      const ready = typeof payload === 'object' && payload !== null && 'status' in payload;
      setStatus(ready ? 'API local disponible.' : 'La API local no respondió como se esperaba.');
    } catch {
      setStatus('La API local no está disponible.');
    } finally {
      setChecking(false);
    }
  }

  function checkGraphics() {
    const context = document.createElement('canvas').getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    setStatus(context ? 'WebGL 2 disponible.' : 'WebGL 2 no está disponible.');
  }

  return (
    <div className="desktop-shell">
      <nav aria-label="Principal">
        <a href="#inicio">Inicio</a>{' · '}
        {import.meta.env.DEV && <a href="#diagnostico">Diagnóstico</a>}
      </nav>
      <main id="inicio" className="desktop-workspace">
        <RegionGlobe
          location={location}
          onSelect={setLocation}
          heading={<>
            <h1>TPBD — Data Detective</h1>
            <p>Explora tendencias históricas del sistema terrestre.</p>
          </>}
        >
          {import.meta.env.DEV && (
            <section id="diagnostico" aria-labelledby="diagnostico-titulo">
              <h2 id="diagnostico-titulo">Diagnóstico de desarrollo</h2>
              <button onClick={checkBackend} disabled={checking}>Comprobar API local</button>{' '}
              <button onClick={checkGraphics} disabled={checking}>Comprobar WebGL 2</button>
              <p role="status">{status}</p>
            </section>
          )}
        </RegionGlobe>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
