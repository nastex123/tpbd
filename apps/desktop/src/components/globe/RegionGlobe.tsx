import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { Mesh, MeshBasicMaterial, SphereGeometry, SRGBColorSpace, TextureLoader } from 'three';
import './region-globe.css';

const regions = [
  { id: 'amazon', name: 'Amazonia', lat: -3.12, lng: -60.02 },
  { id: 'guajira', name: 'La Guajira', lat: 11.54, lng: -72.91 },
  { id: 'sahel', name: 'Sahel', lat: 13.51, lng: 2.11 },
  { id: 'australia_se', name: 'Southeast Australia', lat: -37.81, lng: 144.96 },
] as const;

const globeRegions = [...regions];

export type RegionId = typeof regions[number]['id'];

class GlobeBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGL() {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

export function RegionGlobe({ selectedId, onSelect }: {
  selectedId: RegionId | null;
  onSelect: (id: RegionId) => void;
}) {
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const viewport = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(supportsWebGL);
  const [width, setWidth] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const selected = regions.find(({ id }) => id === selectedId);

  useEffect(() => {
    globe.current?.renderer().setPixelRatio(reduced ? 1 : Math.min(window.devicePixelRatio, 2));
  }, [reduced, width, ready]);

  useEffect(() => {
    const world = globe.current;
    if (!world || !ready || reduced || !available) return;

    const scene = world.scene();
    const geometry = new SphereGeometry(world.getGlobeRadius() * 1.009, 64, 32);
    const material = new MeshBasicMaterial({ transparent: true, opacity: 0.72, depthWrite: false });
    const clouds = new Mesh(geometry, material);
    clouds.raycast = () => {};

    let disposed = false;
    let frame = 0;
    let previousTime: number | undefined;
    const texture = new TextureLoader().load(
      `${import.meta.env.BASE_URL}earth-clouds.png`,
      (image) => {
        if (disposed) return;
        image.colorSpace = SRGBColorSpace;
        material.map = image;
        material.needsUpdate = true;
        scene.add(clouds);

        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          function rotate(time: number) {
            if (previousTime !== undefined) {
              clouds.rotation.y -= Math.min(time - previousTime, 50) * 0.000012;
            }
            previousTime = time;
            frame = requestAnimationFrame(rotate);
          }
          frame = requestAnimationFrame(rotate);
        }
      },
      undefined,
      () => console.warn('The globe cloud texture could not be loaded.'),
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      scene.remove(clouds);
      texture.dispose();
      material.dispose();
      geometry.dispose();
    };
  }, [available, ready, reduced]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    const onContextLost = () => setAvailable(false);
    element.addEventListener('webglcontextlost', onContextLost, true);
    return () => {
      observer.disconnect();
      element.removeEventListener('webglcontextlost', onContextLost, true);
    };
  }, []);

  function selectMarker(marker: object) {
    const region = regions.find((item) => item === marker);
    if (region) onSelect(region.id);
  }

  function selectFromList(region: typeof regions[number]) {
    onSelect(region.id);
    if (available) {
      globe.current?.pointOfView({ lat: region.lat, lng: region.lng }, reduced ? 0 : 650);
    }
  }

  return (
    <section className="region-picker" aria-labelledby="region-heading">
      <div className="region-panel">
        <h2 id="region-heading">Study regions</h2>
        <p>Select a region from the list or the globe.</p>
        <ul>
          {regions.map((region) => (
            <li key={region.id}>
              <button type="button" aria-pressed={selectedId === region.id} onClick={() => selectFromList(region)}>
                {region.name}
              </button>
            </li>
          ))}
        </ul>
        <p role="status">{selected ? `Selected: ${selected.name}` : 'No region selected.'}</p>
        {available && (
          <label>
            <input type="checkbox" checked={reduced} onChange={(event) => setReduced(event.target.checked)} />
            Reduced graphics
          </label>
        )}
      </div>
      <div className="globe-viewport" ref={viewport}>
        {available && width > 0 && (
          <GlobeBoundary onFailure={() => setAvailable(false)}>
            <Globe
              ref={globe}
              width={width}
              height={Math.min(540, Math.max(300, width))}
              globeImageUrl={`${import.meta.env.BASE_URL}earth.jpg`}
              bumpImageUrl={reduced ? null : `${import.meta.env.BASE_URL}earth-topology.png`}
              backgroundColor="#080f1d"
              animateIn={false}
              showAtmosphere={!reduced}
              onGlobeReady={() => {
                setReady(true);
                const controls = globe.current?.controls();
                if (controls) {
                  controls.minDistance = 130;
                  controls.maxDistance = 650;
                }
              }}
              pointsData={globeRegions}
              pointColor={(point) => point === selected ? '#ffcd70' : '#79dcff'}
              pointRadius={(point) => point === selected ? 1.1 : 0.7}
              pointAltitude={0.025}
              pointLabel="name"
              pointsTransitionDuration={0}
              onPointClick={selectMarker}
              labelsData={globeRegions}
              labelText="name"
              labelColor={() => '#fff'}
              labelSize={1.3}
              labelDotRadius={0}
              labelsTransitionDuration={0}
              onLabelClick={selectMarker}
            />
          </GlobeBoundary>
        )}
        {!available && <p role="status">The 3D globe is unavailable. Select a region from the list.</p>}
        <small>Earth imagery: NASA Blue Marble. Cloud and relief textures: WebGL Earth and three-globe.</small>
      </div>
    </section>
  );
}
