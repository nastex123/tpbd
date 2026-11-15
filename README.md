# TPBD — The Pale Blue Dot
### *Earth System Trend Detective*
**NASA Space Apps Challenge 2026** | Challenge: *Be An Earth System Trend Detective!*

---

## 1. Overview

**TPBD (The Pale Blue Dot)** is a precision Earth system trend detective desktop application designed for scientific researchers, students, and climate analysts. Built for the NASA Space Apps Challenge 2026, TPBD provides an accessible, guided investigation workflow that answers four fundamental questions about environmental change:

1. **What is changing?** Curated catalog of climate, meteorological, and hydrological parameters with explicit units, sensor platforms, spatial resolutions, and temporal coverage.
2. **Where is it changing?** Interactive 3D WebGL Globe, curated benchmark regions, and custom latitude/longitude coordinate selection.
3. **By how much is it changing?** Robust non-parametric Sen's slope estimation expressed in standard physical units per decade with 95% confidence intervals.
4. **Is the trend statistically significant?** Seasonal Mann-Kendall trend tests accounting for 12-season annual cycles, lag-1 serial autocorrelation adjustment (Hirsch-Slack / Hamed-Rao), standardized climatological departures (Z-scores), and explicit non-evaluable state handling.

---

## 2. Architecture & System Design

```
+---------------------------------------------------------------------------------+
|                       Desktop Application (Electron)                            |
|                                                                                 |
|   [ 3D WebGL Globe ]     [ Recharts Series ]     [ Trend & Anomaly Inspector ]  |
|                                  |                                              |
|                                  v                                              |
|              Strict OpenAPI 3.1 Contract (docs/openapi.yaml)                    |
+---------------------------------------------------------------------------------+
                                   |
                         HTTP / JSON (RFC 7807)
                                   v
+---------------------------------------------------------------------------------+
|                     FastAPI Climate Engine (apps/backend/)                      |
|                           Bound to 127.0.0.1:8000                               |
|                                                                                 |
|   +-----------------------+  +-----------------------+  +-------------------+   |
|   |   Catalog & Regions   |  | Statistical Analytics |  |  NASA Adapters    |   |
|   |   - Variable Metadata |  | - Seasonal Mann-Kendall|  |  - NASA POWER API|   |
|   |   - Curated Regions   |  | - Sen's Slope Rate     |  |  - NASA AppEEARS |   |
|   |   - Satellite Products|  | - Climatology Z-scores |  |    Task Engine   |   |
|   +-----------------------+  +-----------------------+  +-------------------+   |
|                                       |                                         |
|                                       v                                         |
|                   +---------------------------------------+                     |
|                   | Parameterized SQLite Cache & Offline  |                     |
|                   | Pre-seeded Benchmark Fixtures (HU-14) |                     |
|                   +---------------------------------------+                     |
+---------------------------------------------------------------------------------+
```

### Key Technical Pillars:
- **Contract-First Governance:** The backend and frontend communicate strictly via the immutable OpenAPI 3.1 specification located at [`docs/openapi.yaml`](docs/openapi.yaml).
- **Strictly English Repository:** All source code, docstrings, tests, ADRs, and commits adhere to 100% English standards.
- **Offline Demo Readiness:** Pre-seeded real NASA POWER observations for benchmark regions (Amazon, Sahel, La Guajira, Western Australia) enable immediate, zero-network demonstrations.
- **Defense in Depth:** Audited under Cloudflare Security guidelines with loopback binding, bounded array allocations ($\le 2,400$ points), parameterized SQL, and RFC 7807 sanitized problem details.

---

## 3. API Catalog & Endpoint Summary

All backend endpoints are prefixed with `/api/v1` and document interactive Swagger UI documentation at `http://127.0.0.1:8000/docs`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health, cache connectivity, and offline demo status |
| `GET` | `/api/v1/catalog/variables` | Curated climate, meteorological, and hydrological parameters |
| `GET` | `/api/v1/catalog/variables/{id}` | Detailed variable metadata (units, community, temporal coverage) |
| `GET` | `/api/v1/catalog/products` | Satellite remote sensing products (e.g., MODIS MOD13A2) |
| `GET` | `/api/v1/regions` | Curated benchmark regions with coordinates and scientific context |
| `GET` | `/api/v1/series` | Historical monthly time series with automatic SQLite caching |
| `POST` | `/api/v1/analytics/trends` | Non-parametric Seasonal Mann-Kendall test & Sen's slope rate |
| `POST` | `/api/v1/analytics/compare` | Dual-region comparative trend analysis and driver diagnostics |
| `POST` | `/api/v1/analytics/anomalies` | Standardized monthly climatological departures (WMO 1991–2020 Z-scores) |
| `POST` | `/api/v1/analytics/changepoints` | Pettitt change-point and regime analysis |
| `GET` | `/api/v1/ai/models` | Available AI models and capabilities |
| `POST` | `/api/v1/ai/investigate` | Natural-language investigation routing with deterministic fallback |
| `POST` | `/api/v1/ai/explain-trend` | Evidence-grounded scientific trend explanation |
| `POST` | `/api/v1/ai/audio-brief` | Mission Control audio briefing synthesis |
| `POST` | `/api/v1/integrations/appeears/auth/login` | NASA Earthdata OAuth login and bearer token generation |
| `GET` | `/api/v1/integrations/appeears/auth/status`| AppEEARS session and token validity inspection |
| `POST` | `/api/v1/integrations/appeears/tasks` | Asynchronous point/area satellite extraction task submission |
| `GET` | `/api/v1/integrations/appeears/tasks/{id}` | Status check for submitted AppEEARS extraction tasks |

---

## 4. Getting Started

### Prerequisites
- **Python:** 3.12 or higher with [`uv`](https://docs.astral.sh/uv/) installed.
- **Node.js:** 22.12 or higher with `npm` (for the desktop frontend).

### 4.1 Running the Python Backend

```powershell
# Navigate to the backend directory
cd apps/backend

# Install dependencies using uv
uv sync

# Start the local development server (binds to 127.0.0.1:8000)
uv run uvicorn app.main:app --port 8000 --reload
```

Verify the backend is live by opening:
- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- OpenAPI Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 4.2 Running the Automated Test Suite

The backend includes a comprehensive test suite (46 unit and integration tests):

```powershell
cd apps/backend
uv run python -m pytest -v
```

### 4.3 Running the Desktop Frontend

```powershell
# Navigate to the desktop directory
cd apps/desktop

# Install frontend dependencies
npm install

# Run the desktop app in development mode
npm run desktop

# Or build the renderer and open the desktop app
npm run build
npm start
```

Run FastAPI separately as described above. Both desktop modes use the local backend when it is available. The presentation includes two stored NASA POWER temperature series if the backend is unavailable.

---

## 5. Scientific Methodology & Standards

- **WMO Climatological Normal Baseline (1991–2020):** Monthly climatological means ($\mu_m$) and standard deviations ($\sigma_m$) are computed per calendar month using sample-adjusted statistics ($ddof=1$). Standardized departures ($z = (x - \mu_m) / \sigma_m$) categorize climate departures without seasonal cycle distortion.
- **Seasonal Mann-Kendall (Hirsch-Slack Test):** Monthly data is divided into 12 distinct seasons. Kendall's $S$ statistics and tied ranks are calculated within seasons and summed, avoiding false trends caused by annual seasonality.
- **Robust Rate Estimation (Sen's Slope):** Trends are calculated as the median of all pairwise slopes within seasons and converted to standard units per decade with exact 95% confidence intervals.
- **Zero Synthetic Imputation:** Missing values (`-999`) are normalized strictly to `null` with `"quality": "missing"`. Missing or insufficient data produces explicit `"status": "not_evaluable"` with human-readable rationale rather than fabricated conclusions.
- **Non-Causality Principle:** Statistical significance ($p < \alpha$) is explicitly presented as evidence of monotonic direction, never as proof of physical causation, drought, or wildfire attribution.

---

## 6. Architecture Decision Records (ADRs)

Key architectural decisions are preserved in [`docs/adr/`](docs/adr/):
- **ADR-0001:** Team Standards, API Governance, and Concurrency Guidelines
- **ADR-0002:** Seasonal Mann-Kendall Trend Engine and Autocorrelation Correction
- **ADR-0003:** Standardized Monthly Climatology Z-Score Anomaly Engine
- **ADR-0004:** Non-parametric change-point detection
- **ADR-0005:** Electron local API bridge and renderer isolation
- **ADR-0006:** Local investigation storage
- **ADR-0007:** Gemini AI smart model router
- **ADR-0008:** Scientific explanation and Mission Control audio

---

## 7. Security & Compliance

The TPBD backend has undergone comprehensive security auditing under Cloudflare defensive security guidelines:
- **Loopback Isolation:** The server binds strictly to `127.0.0.1`, rejecting all external network interfaces.
- **CORS Restriction:** Only authorized desktop origin ports (`http://127.0.0.1:1420`, `http://localhost:1420`) are accepted.
- **Algorithmic Complexity Protection:** Array payload lengths are strictly capped at $\le 2,400$ points to guarantee sub-50ms execution times and eliminate Denial of Service (DoS) vectors.
- **Sanitized Errors:** Unhandled exceptions return sanitized RFC 7807 problem details without leaking internal tracebacks, stack traces, or environment variables.

For the full security audit report, consult [`documentation/security/cloudflare-security-audit-report.md`](documentation/security/cloudflare-security-audit-report.md).

---

## 8. License

Proprietary — Developed for the NASA Space Apps Challenge 2026. All rights reserved.
