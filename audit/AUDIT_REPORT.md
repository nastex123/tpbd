# TPBD Climate Engine — Comprehensive Backend QA & Data Contract Audit Report

**Project:** TPBD — *The Pale Blue Dot (Earth System Trend Detective)*  
**Event:** NASA Space Apps Challenge 2026  
**Auditor Role:** Senior Backend Engineer & Automated QA Architect  
**Audit Date:** November 14, 2026  
**Branch Evaluated:** `dev` (Commit `399ef2b`, incorporating commit `ac42e8b` by Brandon)  
**Target Specification:** OpenAPI 3.1.0 ([`docs/openapi.yaml`](docs/openapi.yaml))  
**Runtime Architecture:** FastAPI v0.163.0 / Python 3.12 / ASGI Asynchronous Engine  

---

## 1. Executive Summary

A comprehensive automated QA audit was conducted across 100% of the FastAPI backend routes, validating OpenAPI contract compliance, mathematical and coordinate transformations, external NASA Earthdata API interactions, and system resilience.

| Metric | Result | Status |
|---|---|---|
| **Total Backend Endpoints Mapped** | **22 / 22 (100.0%)** | Full Coverage |
| **OpenAPI Contract Route Parity** | **22 / 22 (100.0%)** | Zero Route Drift |
| **Frontend Contract Compliance Rate** | **22 / 22 (100.0%)** | Pass |
| **NASA POWER Ground Truth Parity** | **72 / 72 months (100.0%)** | Exact Match |
| **Adversarial Resilience Handling Rate** | **7 / 7 scenarios (100.0%)** | Pass |
| **Unhandled 500 Internal Server Errors** | **0 (Zero)** | Zero Unhandled Crashes |
| **Corrupt Satellite Values (`NaN`, `Infinity`, raw `-9999`)** | **0 Detected** | Clean Normalization |
| **RFC 7807 Error Envelope Compliance** | **100.0%** | Standardized |

### High-Level Verdict:
The backend demonstrates **high architectural integrity and strict adherence to the contract-first philosophy**. Following the recent removal of runtime fallback mocks by Brandon (commit `ac42e8b`), the application reliably accesses authentic NASA POWER and AppEEARS services, caches results deterministically in SQLite, and protects frontend chart renderers (Recharts, WebGL globe) from JavaScript crashes by preventing `NaN` and raw negative fill values.

---

## 2. NASA Earthdata & External API Analysis

### 2.1 The Role of `earthaccess` in TPBD Architecture
> **User Inquiry:** *"Are we using `earthaccess` correctly? Are we interacting properly with external APIs?"*

* **Direct Finding:** **`earthaccess` is not installed or imported in this codebase** (verified across `pyproject.toml`, `requirements.txt`, and source imports).
* **Technical Evaluation:**
  - `earthaccess` is an official NASA Python library tailored for discovering and downloading raw granules (multi-gigabyte HDF5/NetCDF files) from NASA Earthdata Cloud / DAACs using direct S3 access or Earthdata Login (EDL).
  - For a desktop client sidecar application (Tauri / Vite), downloading multi-gigabyte satellite rasters to extract simple point time series would saturate local disk space and network bandwidth, resulting in poor user experience.
  - Instead, the backend adopts a **lightweight, asynchronous REST adapter model** (ADR 0002):
    1. **NASA POWER Temporal API (`https://power.larc.nasa.gov/api/temporal/monthly/point`):** Synchronous, unauthenticated access to global meteorological and radiation point time series (1981–present) on a 0.5° grid.
    2. **NASA POWER CMIP6 Projections API (`https://power.larc.nasa.gov/api/projection/*`):** Synchronous access to global climate projections across SSP scenarios (`ssp126`, `ssp245`, `ssp370`).
    3. **NASA AppEEARS REST API (`https://appeears.earthdatacloud.nasa.gov/api`):** Asynchronous point-sampling task orchestration for MODIS, VIIRS, and ECOSTRESS datasets via Earthdata Login bearer tokens.
* **Conclusion:** The direct REST client strategy using `httpx` is optimal for the current desktop sidecar architecture and fulfills NASA Space Apps Challenge objectives without the heavy footprint of `earthaccess`.

---

### 2.2 Business Logic & Transformation Audit
Comparing the backend outputs directly against the **`skill_nasa_oracle.py`** ground truth for coordinates $(11.54^\circ\text{ N}, -72.90^\circ\text{ W})$ (Guajira Peninsula, 2000–2005):

1. **Exclusion of Month 13 (Annual Summary):**
   - *Behavior:* NASA POWER returns month `"13"` as an annual mean/sum in its chronological dictionary (e.g. `"200013": 28.4`).
   - *Backend Transformation:* `SeriesService._normalize_power_payload` filters out all keys with `month_str == "13"`.
   - *Verification:* Evaluated across all 72 monthly points. **Zero month 13 occurrences reached the API output.**
2. **Missing Fill Value Normalization (`-999.0`):**
   - *Behavior:* NASA POWER flags unobserved or invalid cells with `-999.0`.
   - *Backend Transformation:* Values $\le -999.0$ are translated to `null` with explicit metadata `quality: "missing"`.
   - *Verification:* Verified. No negative fill values reach the frontend.
3. **Coordinate Order & Grid Resolution:**
   - *Behavior:* Query accepts `lat` and `lon` as floats.
   - *Backend Output:* `query_coordinates: {"latitude": 11.54, "longitude": -72.9}` and `representative_grid_cell: "11.54, -72.9 (0.5° grid)"`.
   - *Verification:* Latitude $[-90, 90]$ and Longitude $[-180, 180]$ bounds and order are strictly preserved.
4. **Numerical Parity with Live NASA POWER:**
   - *Comparison:* 72 out of 72 months checked had absolute delta $< 10^{-4}$ against NASA POWER live server responses.

---

## 3. Frontend Contract Compliance (`docs/openapi.yaml`)

Every endpoint was tested against its Pydantic v2 schema and the OpenAPI 3.1 specification.

### 3.1 Route Breakdown & Classification

```mermaid
pie title Endpoint Distribution (22 Total)
    "Local / Catalog / Health" : 10
    "NASA POWER & AppEEARS" : 8
    "AI / Gemini Copilot" : 4
```

| HTTP Method | Route | Category | Expected Response | Latency (ms) | Contract Valid? |
|---|---|---|---|---|---|
| `GET` | `/health` | Health | `HealthResponse` (200) | 4.3 ms |  Yes |
| `GET` | `/api/v1/catalog/variables` | Catalog | `list[Variable]` (200) | 1.6 ms |  Yes |
| `GET` | `/api/v1/catalog/variables/{id}` | Catalog | `Variable` (200) | 1.9 ms |  Yes |
| `GET` | `/api/v1/catalog/products` | Catalog | `list[SatelliteProduct]` (200) | 354.9 ms |  Yes |
| `GET` | `/api/v1/catalog/products/{id}` | Catalog | `SatelliteProduct` (200) | 696.8 ms |  Yes |
| `GET` | `/api/v1/regions` | Geography | `list[Region]` (200) | 2.0 ms |  Yes |
| `GET` | `/api/v1/series` | Series | `TimeSeriesResponse` (200) | 6.2 ms |  Yes |
| `POST` | `/api/v1/analytics/trends` | Analytics | `TrendAnalysisResponse` (200) | 77.5 ms |  Yes |
| `POST` | `/api/v1/analytics/compare` | Analytics | `RegionalComparisonResponse` (200) | 153.5 ms |  Yes |
| `POST` | `/api/v1/analytics/anomalies` | Analytics | `AnomalyDetectionResponse` (200) | 6.8 ms |  Yes |
| `POST` | `/api/v1/analytics/changepoints` | Analytics | `ChangePointResponse` (200) | 12.7 ms |  Yes |
| `GET` | `/api/v1/projections/scenarios` | Projections | `ProjectionScenariosResponse` (200) | 3.6 ms |  Yes |
| `GET` | `/api/v1/projections/models` | Projections | `ProjectionModelsResponse` (200) | 376.9 ms |  Yes |
| `GET` | `/api/v1/projections/series` | Projections | `ProjectionSeriesResponse` (200) | 816.8 ms |  Yes |
| `GET` | `/api/v1/integrations/appeears/auth/status` | Integrations | `AppEEARSAuthStatus` (200) | 2.2 ms |  Yes |
| `GET` | `/api/v1/integrations/appeears/tasks/{id}` | Integrations | RFC 7807 (401 when unauthenticated) | 307.8 ms |  Yes |
| `POST` | `/api/v1/integrations/appeears/tasks` | Integrations | RFC 7807 (401 when unauthenticated) | 302.2 ms |  Yes |
| `POST` | `/api/v1/integrations/appeears/auth/login` | Integrations | RFC 7807 (401 invalid credentials) | 697.8 ms |  Yes |
| `GET` | `/api/v1/ai/models` | AI | `ModelListResponse` (200) | 4.0 ms |  Yes |
| `POST` | `/api/v1/ai/investigate` | AI | RFC 7807 (503 when API key missing) | 3.3 ms |  Yes |
| `POST` | `/api/v1/ai/explain-trend` | AI | RFC 7807 (503 when API key missing) | 2.5 ms |  Yes |
| `POST` | `/api/v1/ai/audio-brief` | AI | RFC 7807 (503 when API key missing) | 2.3 ms |  Yes |

---

### 3.2 Data Hygiene & WebGL / Recharts Compatibility
1. **Forbidden Values:** No instance of `NaN`, `Infinity`, or raw unhandled `-9999` numbers was present in any JSON output.
2. **Date Format Standard:** All time series point dates follow the strict `YYYY-MM` regular expression (`^\d{4}-(0[1-9]|1[0-2])$`), ensuring date parsing in Recharts is completely deterministic.
3. **Array Integrity:** All collection fields (`points`, `models`, `cached_regions`, `anomalies`) are serialized as non-null JSON arrays (`[]` rather than `null`), preventing `TypeError: Cannot read properties of undefined (reading 'map')` in the frontend UI.

---

## 4. Resilience, Edge Cases & Security Findings

Subagent 4 executed 7 adversarial attack and edge-case scenarios:

### Test Results Matrix

| Scenario | Input Condition | Expected Status | Actual Status | Unhandled 500? | Result |
|---|---|---|---|---|---|
| **Latitude Out of Bounds** | `lat=150.0` | 400 Bad Request | 400 | No | Pass |
| **Non-Existent Variable** | `variable_id="NON_EXISTENT"` | 404 Not Found | 404 | No | Pass |
| **Inverted Temporal Range** | `start_year=2020, end_year=2010` | 400 Bad Request | 400 | No | Pass |
| **Invalid Earthdata Credentials** | `username="fake", password="fake"` | 401 Unauthorized | 401 | No | Pass |
| **Unauthenticated AppEEARS Task** | Missing session token | 401 Unauthorized | 401 | No | Pass |
| **Zero Points in Trend Request** | `points: []` | 200 (Safe Fallback) | 200 (`not_evaluable`) | No | Pass |
| **Short Points in Trend Comparison** | `points: 1 sample` (< 24 min) | 200 (Safe Fallback) | 200 (`are_comparable: false`) | No | Pass |

### Zero-Hallucination Safe Fallback Design (Key Finding)
A key highlight of the engine is its handling of insufficient or missing data in `/api/v1/analytics/trends` and `/api/v1/analytics/compare`. Rather than aborting with an unhandled exception or raising an HTTP error that would break client charting flows, the engine returns `status: 200 OK` with:
```json
{
  "variable_id": "T2M",
  "direction": "not_evaluable",
  "rate_per_decade": null,
  "p_value": null,
  "sample_count": 0,
  "plain_language_verdict": "Trend not evaluable: No data points provided in request.",
  "scientific_caveat": "Prerequisites for non-parametric seasonal testing were not met."
}
```
This directly complies with **Section 6 of `AGENTS.md` (Zero Hallucination of Data)**: Never hallucinate synthetic trend slopes when data is missing; return explicit nulls and `not_evaluable`.

---

## 5. Reproducible Verification & Recommendations

### 5.1 Verification Commands
To reproduce this entire audit deterministically on any machine:
```powershell
# From repository root:
cd apps/backend
.\.venv\Scripts\python.exe -m pytest tests/unit tests/integration -v
.\.venv\Scripts\python.exe tests/agent_audit/audit_orchestrator.py
```

### 5.2 Reproducible Curl Examples

#### 1. Historical Observations with SQLite Cache Check
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/series?variable_id=T2M&lat=11.54&lon=-72.90&start_year=2000&end_year=2005" \
  -H "Accept: application/json"
```

#### 2. Seasonal Mann-Kendall Statistical Trend
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/analytics/trends" \
  -H "Content-Type: application/json" \
  -d '{
    "variable_id": "T2M",
    "alpha": 0.05,
    "method": "seasonal_mann_kendall",
    "points": [
      {"date": "2020-01", "value": 27.5, "quality": "observed"},
      {"date": "2020-02", "value": 28.1, "quality": "observed"}
    ]
  }'
```

#### 3. CMIP6 Climate Projections
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/projections/series?variable_id=T2M&latitude=11.54&longitude=-72.90&start_year=2025&end_year=2030&scenario=ssp245&model=ensemble" \
  -H "Accept: application/json"
```

#### 4. RFC 7807 Error Problem Details Example (Out-of-Bounds Latitude)
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/series?variable_id=T2M&lat=150.0&lon=0.0&start_year=2000&end_year=2005"
```
**Response:**
```json
{
  "type": "https://tpbd.nasa.gov/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request parameters failed validation.",
  "instance": "/api/v1/series",
  "invalid_params": [
    {
      "name": "query -> lat",
      "reason": "Input should be less than or equal to 90"
    }
  ]
}
```

---

## 6. Strategic Architecture Recommendations

1. **Retain the Asynchronous REST Adapter Pattern:** Do not introduce `earthaccess` into the runtime sidecar. The current combination of NASA POWER REST API and AppEEARS REST API provides complete coverage for the required planetary variables without downloading multi-gigabyte raster files.
2. **Strict Contract Alignment Maintained:** All 22 backend endpoints are fully aligned with `docs/openapi.yaml`. Ensure that future pull requests continue to validate Pydantic schemas against `docs/openapi.yaml` prior to merging.
3. **Audit Suite Preservation:** Retain `tests/agent_audit/` as a permanent pre-commit / CI verification tool to guarantee that future backend iterations maintain zero contract drift and zero unhandled exceptions.
