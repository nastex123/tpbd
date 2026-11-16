# ADR 0011: Analytical Climate Projection Fallback and Provenance Transparency

## Status
**Accepted**

## Date
2026-11-15

## Context
Under the NASA Space Apps Challenge 2026 guidelines (*The Pale Blue Dot / Earth System Trend Detective*), applications must maintain strict scientific integrity:
1. **Zero Hallucination Policy:** Data presented to researchers or hackathon evaluators must never be arbitrary, synthetic mock numbers masquerading as genuine Earth observations.
2. **Offline & High-Latency Resilience:** During live judging and disconnected evaluation environments, upstream NASA POWER and NEX-GDDP-CMIP6 APIs may experience network timeouts, rate limiting, or fill-value omissions (`-999.0`).
3. **Continuous Trajectory Inspection:** Users exploring any of the 12 planetary biomes across the 6 supported variables (Temperature, Precipitation, Relative Humidity, Soil Moisture, Evapotranspiration, and Vegetation Index) must be able to project climate trajectories to 2100 under standardized IPCC AR6 Shared Socioeconomic Pathways (SSP1-2.6, SSP2-4.5, SSP3-7.0) without application crashes or hanging spinners.

Previously, when upstream NEX-GDDP downscaled data returned `-999` or was unreachable, the backend served an analytical physics model parameterized over local NASA MERRA-2 monthly climatology. However, the desktop UI lacked a visible, instant indicator differentiating direct NEX-GDDP model runs from the MERRA-2 parameterized AR6 scenario model.

---

## Decision

We establish a formal dual-mode projection architecture with **uncompromising provenance transparency**:

### 1. Dual-Engine Projection Pipeline
- **Primary Source (Online):** `NASA POWER Projection API / NEX-GDDP-CMIP6`. Retrieves high-resolution daily downscaled climate model ensembles (CESM2, EC-Earth3, MPI-ESM1-2-HR, etc.) across 2015–2100.
- **Analytical Fallback Engine:** `NASA POWER MERRA-2 Climatology / IPCC AR6 CMIP6 Scenario Model`. When upstream NEX-GDDP returns fill-values or is offline, the projection engine resolves the authentic 12-month baseline climatology from local MERRA-2 observations and modulates forward trajectories using documented IPCC AR6 radiative forcing pathways, polar amplification factors, and dipole precipitation regimes.

### 2. Explicit Provenance Contract
The API response schema (`ProjectionSeriesResponse`) strictly retains and populates the `source` attribute:
- Upstream: `"NASA POWER Projection API / NEX-GDDP-CMIP6"`
- Fallback: `"NASA POWER MERRA-2 Climatology / IPCC AR6 CMIP6 Scenario Model"`

### 3. Visual UI Provenance Badges
The Desktop Flight Deck (`CMIP6ProjectionsView`) renders a high-visibility, color-coded provenance pill badge immediately adjacent to the `PROJECTED` status badge in both standard and cinema lightbox views:
- **Official GCM Runs:** `<span className="badge-provenance provenance-official">NASA NEX-GDDP</span>` (Cyan styling, tooltip citing downscaled daily GCM ensemble).
- **Analytical Fallback Runs:** `<span className="badge-provenance provenance-analytical">IPCC AR6 (MERRA-2)</span>` (Purple styling, tooltip citing MERRA-2 parameterized AR6 pathways).
- **Mandatory Scientific Caveat:** A persistent, hoverable warning popover emphasizes that forward trajectories are conditional socioeconomic pathways, not deterministic weather forecasts.

---

## Consequences

### Positive
- **Guaranteed Demo Continuity:** Eliminates runtime errors and blank charts during offline presentations or NASA POWER downtime.
- **Scientific Rigor & Honesty:** Evaluators and climate scientists can immediately verify the provenance of any forward curve. No synthetic extrapolation is ever hidden.
- **Universal Multi-Variable Support:** Forward trajectories are fully available for all 6 core catalog variables across all 12 biomes.

### Trade-offs & Mitigations
- *Trade-off:* The analytical model provides smoothed pathway trajectories rather than dynamic annual synoptic storm events.
- *Mitigation:* The mandatory caveat tooltip explicitly states that interannual variability is filtered to highlight macro decadal forcing.
