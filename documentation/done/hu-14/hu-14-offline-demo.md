# User Story Completion Report: HU-14 — Modo demo sin internet

## 1. Header & Metadata
- **Epic:** E3 — Demo, integración y calidad
- **User Story ID:** HU-14
- **Title:** Modo demo sin internet
- **Owner / Developer:** Daniel (Backend & Data Science)
- **Branch:** `feature/HU-14-offline-demo`
- **Pull Request:** [#10](https://github.com/nastex123/tpbd/pull/10)
- **Target Integration Branch:** `dev`
- **Status:** Completed
- **Date:** 2026-11-14

---

## 2. User Story & Acceptance Criteria Verification

> **User Story:** Como presentador, quiero ejecutar una investigación precargada de dos ubicaciones, para demostrar la aplicación sin depender de la red.

- [x] **CA-01: Full provenance and parameter preservation in demo cases:**  
  Verified. Five authentic NASA POWER monthly fixtures archived in `data/fixtures/` and logged in `data/fixtures/manifest.json`. Every fixture specifies variable ID, physical display name, unit, provider, source model (MERRA-2 / GEOS-5.12.4), spatial resolution ($0.5^\circ \times 0.625^\circ$), bounding coordinates, download timestamp, and fill values ($-999.0$).
- [x] **CA-02: Cached / offline identification:**  
  Verified. When `offline=true` is requested, series are served exclusively from SQLite cache with `"is_cached": true`. Zero network traffic occurs to NASA POWER or external services.
- [x] **CA-03: Statistical reproducibility from fixtures:**  
  Verified. End-to-end integration tests verify that contrasting two offline benchmark locations (e.g. Amazon Basin vs. La Guajira or Sahel precipitation) through `POST /api/v1/analytics/compare` deterministically reproduces Seasonal Mann-Kendall statistics, Sen's slope rates per decade, 95% confidence intervals, and planetary mechanism explanations without requiring internet connectivity.
- [x] **CA-04: Robust non-evaluable state handling:**  
  Verified. In cases with insufficient data or zero variance, the system returns `direction: "not_evaluable"` with clear physical explanations instead of producing misleading significance verdicts or NaN values.

---

## 3. Technical Implementation Details

1. **Authentic Benchmark Datasets (`data/fixtures/`):**
   - `power_t2m_manaus.json`: Central Amazon Basin Surface Temperature ($1990\text{--}2024$).
   - `power_prectotcorr_amazon.json`: Amazon Basin Corrected Precipitation ($1990\text{--}2024$).
   - `power_prectotcorr_guajira.json`: Semi-arid Colombian Caribbean Precipitation ($1990\text{--}2024$).
   - `power_prectotcorr_sahel.json`: West African Sahel (Niamey) Monsoon Precipitation ($1990\text{--}2024$).
   - `power_t2m_australia.json`: Southeast Australia (Murray-Darling) Surface Temperature ($1990\text{--}2024$).
   - Documented in `manifest.json`.

2. **Cache Seeding Service (`apps/backend/app/services/seeder_service.py`):**
   - Automatically parses `manifest.json` on application startup.
   - Normalizes raw NASA POWER payloads (filtering annual summaries and converting missing fill values).
   - Populates SQLite cache `time_series_cache` idempotently.

3. **Application Lifespan & Diagnostics Integration (`apps/backend/app/main.py` & `health.py`):**
   - FastAPI lifespan hook executes cache pre-seeding on bootstrap.
   - `/health` dynamically assesses cache readiness: returns `offline_demo_ready: True` and lists cached benchmark regions.

---

## 4. Completed Deliverables and Test Verification

Executed full backend test suite:
```powershell
uv run python -m pytest -v
```

**Results:**
- `tests/unit/test_seeder_service.py::test_seeder_populates_curated_regions`: PASSED
- `tests/integration/test_offline_demo.py::test_offline_demo_health_check`: PASSED
- `tests/integration/test_offline_demo.py::test_offline_series_retrieval_without_network`: PASSED
- `tests/integration/test_offline_demo.py::test_end_to_end_offline_comparative_investigation`: PASSED
- Full suite: 38 passed in 4.37s with zero regressions.

**Deliverables:**
- `data/fixtures/power_prectotcorr_amazon.json`: authentic Amazon precipitation fixture.
- `data/fixtures/power_prectotcorr_sahel.json`: authentic Sahel precipitation fixture.
- `data/fixtures/power_t2m_australia.json`: authentic Southeast Australia temperature fixture.
- `data/fixtures/manifest.json`: expanded fixtures metadata manifest.
- `apps/backend/app/services/seeder_service.py`: automatic cache seeding domain service.
- `apps/backend/app/api/v1/health.py`: dynamic cache inspection and readiness reporting.
- `apps/backend/tests/unit/test_seeder_service.py`: seeder unit test suite.
- `apps/backend/tests/integration/test_offline_demo.py`: offline demo mode integration test suite.

---

## 5. Justified Pending Items

1. **Frontend Offline Demo UI Navigation (HU-13 & HU-15):**  
   *Deferred to:* **HU-13** (*Flujo integrado Mission Control*) and **HU-15** (*Integración, QA y entrega*).  
   *Technical Justification:* Brandon and Dylan own the desktop frontend and UI/UX layers (`apps/desktop/**`). The backend provides full offline capabilities, cached fixtures, and API endpoints; the desktop client integration connecting the 3D globe presets to these endpoints will be coordinated in HU-13/HU-15.
2. **NASA AppEEARS Point Extraction Tasks:**  
   *Deferred to:* Phase 3 (Advanced Satellite Products Extension).  
   *Technical Justification:* Advanced asynchronous satellite batch jobs are non-blocking extensions outside the core offline demo and synchronous reanalysis scope.
