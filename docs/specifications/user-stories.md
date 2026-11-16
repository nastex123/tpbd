# TPBD — User Stories & Backlog Specifications
## Data Detective | Functional Requirements & Acceptance Criteria | NASA Space Apps Challenge 2026

**Event:** NASA Space Apps Challenge 2026  
**Challenge Track:** [Be An Earth System Trend Detective!](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/)  
**Status:** 100% Delivered and Verified  
**Priority Legend:** P0 = Core MVP; P1 = Analytical Enhancements; P2 = Long-term Projections & AI Copilot.

---

## Shared Definition of Done (DoD)

Each user story inherits this non-negotiable definition of done:
1. **Verifiable Acceptance Criteria:** Every criterion (CA-01, CA-02, ...) must be validated by automated tests and documented.
2. **Explicit Missing & Error Handling:** Missing sensor data (`-999`) must normalize to `null` with `"quality": "missing"`. Insufficient data must return `"status": "not_evaluable"` with human-readable rationale.
3. **Data Provenance:** No metric may appear in isolation; it must display its physical unit, sensor platform, and source agency.
4. **Contract Inviolability:** All frontend queries and backend schemas derive strictly from [`docs/openapi.yaml`](../openapi.yaml).
5. **Zero Hallucination:** No synthetic data is generated or imputed as real NASA observations.

---

## Epic 1 — Application, Geography & 3D Visualization

### HU-00 — Data Detective Visual System [P0]
**As a** student or scientific researcher,  
**I want** a clear visual hierarchy to investigate Earth observation parameters, locations, and trends,  
**So that** I can interpret evidence without losing spatial or temporal context.

* **Domain:** Frontend & Visual Analytics Engineering
* **Status:** Delivered
* **CA-01:** Location identity, parameter, period, time series chart, and trend summary are clearly distinguishable without overlap.
* **CA-02:** Every numerical figure displays its standard physical unit; severity and significance are never conveyed solely through color.
* **CA-03:** Textual scientific explanations accompany significant, non-significant, and non-evaluable results.
* **CA-04:** Core controls are fully accessible with mouse and keyboard with visible focus states.

### HU-01 — Desktop Application Shell [P0]
**As a** user,  
**I want** to launch TPBD as a standalone desktop application,  
**So that** I can conduct investigations in an isolated, high-performance environment.

* **Domain:** Desktop Core & Geospatial Engineering
* **Status:** Delivered
* **CA-01:** Development and production scripts launch the Electron application seamlessly.
* **CA-02:** Frontend compiles cleanly and connects to the local backend Climate Engine over loopback IPC.
* **CA-03:** Independent execution of FastAPI and Electron is documented for development and demonstrations.
* **CA-04:** Initial configuration and repository contain zero plain-text secrets or sensitive tokens.

### HU-05 — Interactive 3D WebGL Globe [P0]
**As a** researcher,  
**I want** to explore an interactive 3D digital twin of Earth,  
**So that** I can understand the planetary and geographic context of environmental time series.

* **Domain:** Desktop Core & Geospatial Engineering
* **Status:** Delivered
* **CA-01:** The globe rotates smoothly at 60fps, supports controlled zoom/orbit, and displays benchmark location markers.
* **CA-02:** Selecting a location updates the shared application geographic state bidirectionally.
* **CA-03:** Variable or date changes do not trigger WebGL context disposal or memory leaks.
* **CA-04:** If WebGL acceleration is unavailable, an accessible 2D spatial fallback preserves full analytical access.

### HU-06 — Curated Locations & Custom Coordinates [P0]
**As a** user,  
**I want** to select from curated planetary biomes or input custom coordinates,  
**So that** I can investigate any compatible terrestrial or marine location on Earth.

* **Domain:** Desktop Core & Geospatial Engineering
* **Status:** Delivered
* **CA-01:** Coordinates are validated within latitude $[-90, 90]$ and longitude $[-180, 180]$.
* **CA-02:** Location list, 3D globe clicks, and coordinate inputs synchronize to the same state.
* **CA-03:** Displays both the requested point coordinates and the representative assimilation grid cell ($0.5^\circ \times 0.625^\circ$).
* **CA-04:** Switching locations cleanly aborts or ignores stale inflight HTTP requests.

### HU-07 — Historical Range Selector [P0]
**As a** researcher,  
**I want** to adjust the historical investigation window,  
**So that** I can evaluate decadal changes over distinct temporal baselines.

* **Domain:** Frontend & Visual Analytics Engineering
* **Status:** Delivered
* **CA-01:** The range slider permits selection strictly within valid observation years for the active variable (up to 1981–2025).
* **CA-02:** Missing months remain visible as authentic observation gaps, never misrepresented as zero.
* **CA-03:** Dragging the slider applies debouncing to eliminate request flooding.
* **CA-04:** Range adjustments update charts, statistics, and metadata coherently.

### HU-08 — Climate Variable Catalog & Selector [P0]
**As a** user,  
**I want** to browse and select validated NASA Earth observation variables,  
**So that** I can choose parameters tailored to my scientific investigation.

* **Domain:** Frontend & Visual Analytics Engineering
* **Status:** Delivered
* **CA-01:** Each visible option displays source agency, parameter code, readable name, physical unit, and scientific definition.
* **CA-02:** The catalog respects temporal and community availability across NASA POWER and AppEEARS.
* **CA-03:** Unvalidated parameters do not appear in the catalog.
* **CA-04:** `GWETROOT` (root-zone soil wetness fraction) and `EVPTRNS` (evapotranspiration flux) are clearly distinguished from volumetric soil moisture.
* **CA-05:** Switching variables preserves location and temporal range when compatible.

---

## Epic 2 — Backend, Ingestion & Data Quality

### HU-02 — API Catalog & Service Architecture [P0]
**As a** client application,  
**I want** a standardized RESTful API and OpenAPI 3.1 contract,  
**So that** all data exchanges are strictly governed, typed, and predictable.

* **Domain:** Backend & Scientific Data Engineering
* **Status:** Delivered
* **CA-01:** Endpoints conform 100% to [`docs/openapi.yaml`](../openapi.yaml).
* **CA-02:** `GET /health` reports service status, database connectivity, and offline mode availability.
* **CA-03:** `GET /api/v1/catalog/variables` returns curated climate variables with complete metadata.
* **CA-04:** Non-2xx responses return RFC 7807 problem details (`application/problem+json`).

### HU-03 — NASA POWER Time Series Ingestion [P0]
**As an** analytical service,  
**I want** to ingest monthly meteorological and energy flux data from NASA POWER,  
**So that** researchers access verified continuous decadal observations.

* **Domain:** Backend & Scientific Data Engineering
* **Status:** Delivered
* **CA-01:** `GET /api/v1/series` fetches monthly points for supported variables across custom coordinate locations.
* **CA-02:** Upstream missing values (`-999`) are normalized strictly to `null` with `"quality": "missing"`.
* **CA-03:** Responses include dataset metadata, spatial grid resolution, and temporal coverage bounds.
* **CA-04:** Upstream timeouts or HTTP errors return sanitized 502 Bad Gateway responses.

### HU-04 — Quality Caching & Offline Persistence [P0]
**As a** system,  
**I want** to cache queried time series in an embedded SQLite database,  
**So that** repeat queries execute in sub-milliseconds and offline presentations are guaranteed.

* **Domain:** Backend & Scientific Data Engineering
* **Status:** Delivered
* **CA-01:** Queries are cached with compound keys `(variable_id, rounded_lat, rounded_lon, start_year, end_year)`.
* **CA-02:** Cache hits return identical data structures to live upstream responses.
* **CA-03:** Write-Ahead Logging (WAL) ensures concurrent read safety.
* **CA-04:** Offline fallback serves cached data seamlessly when external network connections fail.

### HU-14 — Pre-Seeded Offline Biome Fixtures [P0]
**As a** conference presenter or judge,  
**I want** instant access to pre-seeded planetary biomes without internet connectivity,  
**So that** TPBD demonstrates complete functionality in zero-network environments.

* **Domain:** Backend & Scientific Data Engineering
* **Status:** Delivered
* **CA-01:** 12 curated benchmark biomes (Amazon, Sahel, Mediterranean Seville, Arctic Svalbard, Aral Sea, California, etc.) are pre-seeded in `tpbd_cache.db`.
* **CA-02:** Pre-seeded records contain authentic NASA POWER and AppEEARS satellite observations.
* **CA-03:** The application boots, renders, and calculates trend statistics without external network calls.

---

## Epic 3 — Scientific Analytics & Investigation

### HU-09 — Scientific Telemetry Deck & Time Series Charts [P0]
**As a** researcher,  
**I want** an interactive panoramic time series chart with trend overlays,  
**So that** I can inspect seasonal oscillations and secular trajectory simultaneously.

* **Domain:** Frontend & Visual Analytics Engineering
* **Status:** Delivered
* **CA-01:** Recharts SVG renders 40-year monthly observations with clean scaling and hover tooltips.
* **CA-02:** Missing observations appear as gaps in the line chart, never connecting through zero.
* **CA-03:** Sen's slope median trend line is overlaid on the historical series.

### HU-10 — WMO Climatological Anomaly Z-Scores [P1]
**As a** climate detective,  
**I want** to inspect standardized monthly departures against 1991–2020 normal baselines,  
**So that** I can identify extreme climate anomalies independent of annual seasonality.

* **Domain:** Backend & Scientific Data Engineering
* **Status:** Delivered
* **CA-01:** `POST /api/v1/analytics/anomalies` computes monthly means ($\mu_m$) and sample standard deviations ($\sigma_m$).
* **CA-02:** Z-scores ($z = (x - \mu_m) / \sigma_m$) categorize anomalies into standard WMO classifications.
* **CA-03:** Insufficient baseline observations return explicit non-evaluable status.

### HU-11/12 — CMIP6 Climate Engine & Forward Projections [P2]
**As a** forward-looking researcher,  
**I want** to project climate parameters forward from 2026 to 2100 across IPCC AR6 SSP scenarios,  
**So that** I can assess potential future climate trajectories under differing emission policies.

* **Domain:** Backend & Scientific Data Engineering
* **Status:** Delivered
* **CA-01:** Forward extrapolations cover all 6 catalog variables across SSP1-2.6, SSP2-4.5, and SSP3-7.0.
* **CA-02:** Extrapolations incorporate historical climatology baselines, polar amplification ($A(\phi) = 1 + 1.25 \sin^2 \phi$), and seasonal harmonics.
* **CA-03:** Cinema Lightbox Modal renders full-screen comparative charts with baseline, end-of-century, and net change ($\Delta$) telemetry.

### HU-18 — Teleconnections & Dual-Region Comparison [P0]
**As an** Earth system detective,  
**I want** to compare the same variable between two planetary regions simultaneously,  
**So that** I can investigate paired teleconnections (e.g., Hadley cell expansion, Polar amplification).

* **Domain:** Desktop Core & Geospatial Engineering
* **Status:** Delivered
* **CA-01:** Elevated 3D parabolic tubes connect Region A and Region B on the WebGL globe.
* **CA-02:** Both regions render side-by-side or overlaid time series with harmonized scales.
* **CA-03:** Incompatible periods, units, or variables are blocked with clear explanations.

### HU-25 — Non-Parametric Trend Analysis (Seasonal Mann-Kendall & Sen's Slope) [P0]
**As a** scientist,  
**I want** rigorous non-parametric statistical evaluation of monotonic trends,  
**So that** conclusions are robust against outliers, missing points, and non-normal distributions.

* **Domain:** Backend & Scientific Data Engineering
* **Status:** Delivered
* **CA-01:** `POST /api/v1/analytics/trends` executes Hirsch-Slack Seasonal Mann-Kendall test.
* **CA-02:** Hamed-Rao variance correction adjusts for lag-1 serial autocorrelation.
* **CA-03:** Sen's slope ($Q_{med}$) is expressed in physical units per decade with exact 95% confidence intervals.
* **CA-04:** Output includes direction classification, p-value, test statistic, and non-causality disclosure.

### HU-26 — Pettitt Changepoint & Structural Shift Detection [P1]
**As an** investigator,  
**I want** to detect abrupt structural shifts in historical climate time series,  
**So that** I can identify the exact year an ecosystem underwent a regime shift.

* **Domain:** Backend & Scientific Data Engineering
* **Status:** Delivered
* **CA-01:** `POST /api/v1/analytics/changepoints` executes Pettitt's non-parametric rank test.
* **CA-02:** Returns changepoint date, test statistic $K$, significance level, pre-shift mean, and post-shift mean.

---

## Epic 4 — Multimodal Scientific AI Copilot

### HU-27/28/29 — Grounded AI Explainer & Mission Control TTS Audio [P1/P2]
**As a** student or researcher,  
**I want** natural language scientific explanations and audio debriefs,  
**So that** I can understand the real-world implications of detected trends and teleconnections.

* **Domain:** Backend & Scientific Data Engineering / UI
* **Status:** Delivered
* **CA-01:** Scientific explanations are strictly grounded in computed observational metrics to eliminate hallucinations.
* **CA-02:** Mission Control audio synthesizer generates low-latency speech telemetry via Google Gemini API.
* **CA-03:** Prefetching and caching prevent redundant API token consumption.
