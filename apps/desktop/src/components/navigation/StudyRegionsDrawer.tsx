import { useState, type ReactNode, type FormEvent } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import type { Investigation } from '../../stores/investigations';
import type { Place } from '../globe/globeGeography';

export type Region = { id: string; name: string; lat: number; lng: number; cell?: string };

interface BiomeMeta {
  zone: string;
  tag: string;
  focus: string;
}

const BIOME_METADATA: Record<string, BiomeMeta> = {
  amazon: {
    zone: 'Equatorial Rainforest',
    tag: 'Tropical',
    focus: 'Deforestation & Precipitation Deficit',
  },
  guajira: {
    zone: 'Arid Coastal',
    tag: 'Semi-Arid',
    focus: 'ENSO Drought & Heat Extremes',
  },
  sahel: {
    zone: 'Semi-Arid Transition',
    tag: 'Sahelian',
    focus: 'Monsoon Dynamics & Desertification',
  },
  australia_se: {
    zone: 'Temperate Agricultural',
    tag: 'Continental',
    focus: 'Murray-Darling Basin Water Balance',
  },
  arctic_svalbard: {
    zone: 'Polar Marine Tundra',
    tag: 'Arctic',
    focus: 'Polar Amplification & Sea Ice Loss',
  },
  aral_sea: {
    zone: 'Desiccated Inland Basin',
    tag: 'Continental',
    focus: 'Salinization & Dust Regimes',
  },
  california_valley: {
    zone: 'Mediterranean Agricultural',
    tag: 'Subtropical',
    focus: 'Atmospheric River Hydroclimatic Whiplash',
  },
  tibetan_plateau: {
    zone: 'Alpine High Altitude',
    tag: 'Third Pole',
    focus: 'Glacial Mass Loss & Cryosphere Shift',
  },
  congo_basin: {
    zone: 'Equatorial Rainforest',
    tag: 'Tropical',
    focus: 'Hadley Cell Convective Stability',
  },
  greenland_nuuk: {
    zone: 'Subpolar Ice Margin',
    tag: 'Ice Sheet',
    focus: 'Meltwater Runoff & Albedo Decline',
  },
  coral_sea: {
    zone: 'Tropical Marine',
    tag: 'Reef Ecosystem',
    focus: 'Marine Heatwaves & Bleaching',
  },
  mediterranean_spain: {
    zone: 'Hot-Summer Mediterranean',
    tag: 'Subtropical',
    focus: 'Subtropical Ridge Expansion & Drought',
  },
};

export interface StudyRegionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  heading?: ReactNode;
  regions: Region[];
  selectedId: string | null;
  hoveredId: string | null;
  onHoverRegion: (id: string | null) => void;
  onSelectRegion: (region: Region) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchItems: (Region | Place)[];
  onSelectSearchItem: (place: Region | Place) => void;
  step: number | null;
  onShowStep: (step: number) => void;
  onExitStep: () => void;
  presentationSteps: string[];
  selected?: { name: string; lat: number; lng: number; cell?: string };
  gridCell?: string;
  onSelectCoordinates: (lat: number, lng: number) => void;
  inputError?: string;
  cameraTo: (point: { lat?: number; lng?: number; altitude?: number }) => void;
  initialView: { lat: number; lng: number; altitude: number };
  tour: number | null;
  tourPlaying: boolean;
  onMoveTour: (index: number) => void;
  onToggleTourPlaying: () => void;
  reduced: boolean;
  onToggleReduced: (v: boolean) => void;
  cloudsEnabled: boolean;
  onToggleClouds: (v: boolean) => void;
  reliefEnabled: boolean;
  onToggleRelief: (v: boolean) => void;
  nightEnabled: boolean;
  onToggleNight: (v: boolean) => void;
  boundaries: boolean;
  onToggleBoundaries: (v: boolean) => void;
  graticules: boolean;
  onToggleGraticules: (v: boolean) => void;
  idleRotation: boolean;
  onToggleIdleRotation: (v: boolean) => void;
  measure: boolean;
  onToggleMeasure: (v: boolean) => void;
  measureDistanceKm?: number | null;
  history: LocationSelection[];
  onSelectHistory: (item: LocationSelection) => void;
  investigations: Investigation[];
  saveMessage: string;
  onSaveInvestigation: (name: string) => void;
  onLoadInvestigation: (item: Investigation) => void;
  onDeleteInvestigation: (id: string) => void;
  location: LocationSelection | null;
  children?: ReactNode;
}

export function StudyRegionsDrawer({
  isOpen,
  onClose,
  heading,
  regions,
  selectedId,
  hoveredId,
  onHoverRegion,
  onSelectRegion,
  search,
  onSearchChange,
  searchItems,
  onSelectSearchItem,
  step,
  onShowStep,
  onExitStep,
  presentationSteps,
  selected,
  gridCell,
  onSelectCoordinates,
  inputError,
  cameraTo,
  initialView,
  tour,
  tourPlaying,
  onMoveTour,
  onToggleTourPlaying,
  reduced,
  onToggleReduced,
  cloudsEnabled,
  onToggleClouds,
  reliefEnabled,
  onToggleRelief,
  nightEnabled,
  onToggleNight,
  boundaries,
  onToggleBoundaries,
  graticules,
  onToggleGraticules,
  idleRotation,
  onToggleIdleRotation,
  measure,
  onToggleMeasure,
  measureDistanceKm,
  history,
  onSelectHistory,
  investigations,
  saveMessage,
  onSaveInvestigation,
  onLoadInvestigation,
  onDeleteInvestigation,
  location,
  children,
}: StudyRegionsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'tools' | 'saved'>('catalog');
  const [coordLat, setCoordLat] = useState<string>('');
  const [coordLng, setCoordLng] = useState<string>('');
  const [invName, setInvName] = useState<string>('');

  function handleCoordSubmit(e: FormEvent) {
    e.preventDefault();
    const lat = parseFloat(coordLat);
    const lng = parseFloat(coordLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    onSelectCoordinates(lat, lng);
  }

  function handleSaveSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invName.trim()) return;
    onSaveInvestigation(invName.trim());
    setInvName('');
  }

  return (
    <aside
      inert={!isOpen || undefined}
      aria-hidden={!isOpen}
      className={`absolute inset-y-0 left-0 w-84 sm:w-96 z-40 flex flex-col bg-slate-950/85 backdrop-blur-xl border-r border-sky-500/20 shadow-2xl transition-transform duration-300 ease-in-out select-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Study Regions and Variable Catalog"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/60 shadow-bevel-subtle">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-100 font-sans">
            Study Regions & Catalog
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 rounded">
            Esc
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Retract drawer"
            aria-label="Close study regions drawer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Presentation Mode Notification / Stepper */}
      {step !== null && (
        <div className="p-3 bg-sky-950/60 border-b border-sky-500/30 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-sky-400 uppercase tracking-wider">
              Presentation Step {step + 1} of {presentationSteps.length}
            </span>
            <button
              type="button"
              onClick={onExitStep}
              className="text-[11px] text-slate-400 hover:text-sky-300 underline cursor-pointer"
            >
              Exit Tour
            </button>
          </div>
          <p className="text-xs text-slate-200" aria-live="polite">
            {presentationSteps[step]}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => onShowStep(step - 1)}
              className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={step === presentationSteps.length - 1}
              onClick={() => onShowStep(step + 1)}
              className="px-2 py-1 text-xs rounded bg-sky-600 text-white disabled:opacity-40 hover:bg-sky-500 transition-colors"
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="p-3 border-b border-sky-500/15 bg-slate-950/50">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-2.5 text-slate-500 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search biomes, countries, coordinates..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {search.trim() && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded border border-sky-500/20 bg-slate-900/95 divide-y divide-slate-800">
            {searchItems.length > 0 ? (
              searchItems.map((item) => (
                <button
                  key={`${item.name}:${item.lat}:${item.lng}`}
                  type="button"
                  onClick={() => onSelectSearchItem(item)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-sky-950/60 text-slate-200 hover:text-sky-300 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                    {item.lat.toFixed(1)}°, {item.lng.toFixed(1)}°
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-slate-400 italic">No matching locations found.</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-sky-500/15 bg-slate-950/40 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'border-sky-400 text-sky-300 bg-sky-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Biomes ({regions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'tools'
              ? 'border-sky-400 text-sky-300 bg-sky-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Globe Layers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'saved'
              ? 'border-sky-400 text-sky-300 bg-sky-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Investigations ({investigations.length})
        </button>
      </div>

      {/* Main Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 overscroll-contain">
        {activeTab === 'catalog' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Curated Planetary Biomes</span>
              {step === null && (
                <button
                  type="button"
                  onClick={() => onShowStep(0)}
                  className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                >
                  Start Tour
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {regions.map((region) => {
                const isSelected = selectedId === region.id;
                const isHovered = hoveredId === region.id;
                const meta = BIOME_METADATA[region.id];

                return (
                  <button
                    key={region.id}
                    type="button"
                    aria-pressed={isSelected}
                    onPointerEnter={() => onHoverRegion(region.id)}
                    onPointerLeave={() => onHoverRegion(null)}
                    onClick={() => onSelectRegion(region)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all duration-150 cursor-pointer btn-tactile ${
                      isSelected
                        ? 'bg-sky-950/50 border-sky-400/60 shadow-bevel'
                        : isHovered
                        ? 'bg-slate-900/90 border-white/20'
                        : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isSelected ? 'bg-sky-400' : 'bg-slate-600'
                          }`}
                        />
                        <span className="truncate">{region.name}</span>
                      </div>
                      {meta && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-900 border border-white/10 text-sky-300 shadow-bevel-subtle shrink-0">
                          {meta.tag}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate">{meta ? meta.zone : 'Earth Observation Biome'}</span>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        {region.lat.toFixed(1)}°, {region.lng.toFixed(1)}°
                      </span>
                    </div>

                    {meta?.focus && (
                      <div className="mt-1 text-[10px] text-slate-400/90 truncate">
                        {meta.focus}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Manual Coordinate Form */}
            <details className="mt-4 pt-3 border-t border-slate-800 group">
              <summary className="text-xs font-semibold text-slate-300 cursor-pointer hover:text-sky-300 list-none flex items-center justify-between">
                <span>Manual Coordinate Entry</span>
                <span className="text-[10px] text-slate-500 font-mono group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <form onSubmit={handleCoordSubmit} className="mt-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Latitude (-90 to 90)</label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={coordLat}
                      onChange={(e) => setCoordLat(e.target.value)}
                      placeholder={selected ? String(selected.lat) : '0.0'}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Longitude (-180 to 180)</label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={coordLng}
                      onChange={(e) => setCoordLng(e.target.value)}
                      placeholder={selected ? String(selected.lng) : '0.0'}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Locate & Select Coordinates
                </button>
                {inputError && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-900/50">
                    {inputError}
                  </p>
                )}
              </form>
            </details>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4 text-xs">
            {/* Camera Quick-Snaps */}
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Camera Snaps
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => cameraTo(initialView)}
                  className="p-1.5 rounded bg-slate-900 border border-slate-700 hover:border-sky-400 hover:bg-slate-800 text-slate-200 text-xs text-center transition-colors"
                >
                  Global View
                </button>
                <button
                  type="button"
                  onClick={() => cameraTo({ lat: 89.9, lng: 0, altitude: 1.6 })}
                  className="p-1.5 rounded bg-slate-900 border border-slate-700 hover:border-sky-400 hover:bg-slate-800 text-slate-200 text-xs text-center transition-colors"
                >
                  North Pole
                </button>
                <button
                  type="button"
                  onClick={() => cameraTo({ lat: -89.9, lng: 0, altitude: 1.6 })}
                  className="p-1.5 rounded bg-slate-900 border border-slate-700 hover:border-sky-400 hover:bg-slate-800 text-slate-200 text-xs text-center transition-colors"
                >
                  South Pole
                </button>
              </div>
            </div>

            {/* Planetary Tour Controls */}
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Planetary Orbital Tour
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onMoveTour(tour === null ? 0 : tour - 1)}
                  className="flex-1 py-1.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
                >
                  Prev Biome
                </button>
                <button
                  type="button"
                  onClick={onToggleTourPlaying}
                  className={`flex-1 py-1.5 rounded border text-xs font-medium transition-colors ${
                    tourPlaying
                      ? 'bg-amber-600/80 border-amber-500 text-white'
                      : 'bg-sky-600/80 border-sky-500 text-white'
                  }`}
                >
                  {tourPlaying ? 'Pause Tour' : 'Play Tour'}
                </button>
                <button
                  type="button"
                  onClick={() => onMoveTour(tour === null ? 0 : tour + 1)}
                  className="flex-1 py-1.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
                >
                  Next Biome
                </button>
              </div>
            </div>

            {/* Visual Layers Toggles */}
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Visualization Layers
              </h3>
              <div className="space-y-1.5 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Reduced Graphics Mode</span>
                  <input
                    type="checkbox"
                    checked={reduced}
                    onChange={(e) => onToggleReduced(e.target.checked)}
                    className="accent-sky-400"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Atmospheric Clouds Layer</span>
                  <input
                    type="checkbox"
                    checked={cloudsEnabled}
                    disabled={reduced}
                    onChange={(e) => onToggleClouds(e.target.checked)}
                    className="accent-sky-400 disabled:opacity-40"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Surface Relief Topography</span>
                  <input
                    type="checkbox"
                    checked={reliefEnabled}
                    disabled={reduced}
                    onChange={(e) => onToggleRelief(e.target.checked)}
                    className="accent-sky-400 disabled:opacity-40"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Day & Night Shadow (UTC)</span>
                  <input
                    type="checkbox"
                    checked={nightEnabled}
                    disabled={reduced}
                    onChange={(e) => onToggleNight(e.target.checked)}
                    className="accent-sky-400 disabled:opacity-40"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>High-Res Coastline Paths</span>
                  <input
                    type="checkbox"
                    checked={boundaries}
                    onChange={(e) => onToggleBoundaries(e.target.checked)}
                    className="accent-sky-400"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Graticules (Coordinate Grid)</span>
                  <input
                    type="checkbox"
                    checked={graticules}
                    onChange={(e) => onToggleGraticules(e.target.checked)}
                    className="accent-sky-400"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Idle Planetary Rotation</span>
                  <input
                    type="checkbox"
                    checked={idleRotation}
                    disabled={reduced || !!location}
                    onChange={(e) => onToggleIdleRotation(e.target.checked)}
                    className="accent-sky-400 disabled:opacity-40"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Measure Surface Distance</span>
                  <input
                    type="checkbox"
                    checked={measure}
                    onChange={(e) => onToggleMeasure(e.target.checked)}
                    className="accent-sky-400"
                  />
                </label>
                {measure && (
                  <div className="pt-2 text-[11px] text-amber-300 font-mono bg-amber-950/30 p-2 rounded border border-amber-700/40">
                    {measureDistanceKm != null
                      ? `${Math.round(measureDistanceKm).toLocaleString()} km along Earth curvature.`
                      : 'Click two points on the 3D globe to measure geodesic distance.'}
                  </div>
                )}
              </div>
            </div>

            {/* Recently Visited */}
            {history.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  Recently Visited
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {history.map((item, idx) => {
                    const label = item.kind === 'region'
                      ? regions.find((r) => r.id === item.id)?.name || item.id
                      : `${item.lat.toFixed(1)}°, ${item.lng.toFixed(1)}°`;
                    return (
                      <button
                        key={`${idx}:${label}`}
                        type="button"
                        onClick={() => onSelectHistory(item)}
                        className="px-2 py-1 text-[11px] rounded bg-slate-900 border border-slate-700 hover:border-sky-400 text-slate-300 transition-colors"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-3 text-xs">
            {/* Save Investigation Form */}
            <form onSubmit={handleSaveSubmit} className="space-y-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
              <label className="block text-slate-300 font-medium text-xs">
                Save Current Investigation
              </label>
              <input
                type="text"
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                maxLength={80}
                placeholder="Investigation title (e.g. Amazon T2M Shift)"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={!location}
                className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Save Investigation
              </button>
              {saveMessage && (
                <p className="text-[11px] text-sky-300 italic pt-1">{saveMessage}</p>
              )}
            </form>

            {/* List of Saved Investigations */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Saved Studies ({investigations.length})
              </h3>
              {investigations.length === 0 ? (
                <p className="text-slate-500 italic text-xs py-2">No saved investigations on this device.</p>
              ) : (
                <div className="space-y-2">
                  {investigations.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5"
                    >
                      <div className="font-semibold text-slate-200 text-xs">{item.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.variable} · {item.period.start}–{item.period.end}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {item.source.provider}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onLoadInvestigation(item)}
                          className="px-2 py-0.5 rounded bg-sky-600/70 hover:bg-sky-600 text-white text-[11px] transition-colors"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteInvestigation(item.id)}
                          className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900 text-[11px] transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Children (Diagnostics or dev tools) */}
        {children && (
          <div className="pt-2 border-t border-slate-800/80">
            {children}
          </div>
        )}
      </div>

      {/* Drawer Footer Telemetry */}
      {selected && (
        <div className="p-3 border-t border-sky-500/20 bg-slate-900/80 flex items-center justify-between text-xs">
          <div className="truncate">
            <span className="text-sky-400 font-mono text-[10px] uppercase block">Selected</span>
            <span className="font-medium text-slate-200 truncate block">{selected.name}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
            {selected.lat.toFixed(2)}°, {selected.lng.toFixed(2)}°
          </span>
        </div>
      )}
    </aside>
  );
}
