# User Story Completion Report: HU-04 — Normalización, faltantes y caché

## 1. Header & Metadata
- **Epic:** E2 — Datos y análisis científico
- **User Story ID:** HU-04
- **Title:** Normalización, faltantes y caché
- **Owner / Developer:** Daniel (Backend & Data Science)
- **Branch:** `feature/HU-04-quality-and-cache`
- **Pull Request:** [#8](https://github.com/nastex123/tpbd/pull/8)
- **Target Integration Branch:** `dev`
- **Status:** Completed
- **Date:** 2026-11-14

---

## 2. User Story & Acceptance Criteria Verification

> **User Story:** Como usuario, quiero consultar datos con rapidez y conocer su calidad, para explorar incluso con conectividad intermitente.

- [x] **CA-01: Equivalent queries served from cache:**  
  Verified. When an exact query (`variable_id`, `lat`, `lon`, `start_year`, `end_year`) was previously executed, `SeriesService` retrieves the payload directly from SQLite (`time_series_cache`) without contacting NASA POWER, and sets `"is_cached": true`.
- [x] **CA-02: Missing code replacement (-999 -> null):**  
  Verified. The normalization pipeline in `SeriesService._normalize_power_payload` maps `-999.0` fill values to `null` and assigns `quality: "missing"` before returning data points. Month 13 is strictly filtered out.
- [x] **CA-03: Fixtures provenance manifest:**  
  Verified. `data/fixtures/manifest.json` catalogs all local test fixtures (`power_t2m_manaus.json`, `power_prectotcorr_guajira.json`), specifying variable ID, provider, spatial/temporal resolution, bounding coordinates, query date, and fill values.
- [x] **CA-04: Offline mode resilience:**  
  Verified. Added `offline=true` parameter in `GET /api/v1/series`. When active, only cached observations are returned; if exact years are missing, `find_any_series` retrieves available observations for the location. If NASA POWER times out or fails during online queries, the service gracefully degrades to fallback cached records rather than throwing a 500 error.
- [x] **CA-05: Incompatible products guard:**  
  Verified. Implemented `SeriesService.validate_series_compatibility(series_a, series_b)`. Enforces strict unit matching and raises RFC 7807 `AppException` (HTTP 400) if contrasting disparate variables (e.g. temperature °C vs. precipitation mm/month).

---

## 3. Technical Implementation Details

1. **Cache Layer Enhancements (`apps/backend/app/repositories/cache_repository.py`):**
   - Implemented `find_any_series(variable_id, lat, lon)` using prefix wildcard matching on deterministic keys (`VAR:lat:lon:%`).
   - Added `count_cached_entries()` for cache diagnostics and health reporting.
   - Enforced SQLite connection cleanup in `finally` blocks to prevent Windows lock conflicts.

2. **Series Resilience & Offline Delivery (`apps/backend/app/services/series_service.py`):**
   - Added `offline_only` query path to guarantee zero network traffic when offline.
   - Wrapped `power_client.fetch_monthly_point` in an exception boundary catching `NASAUpstreamTimeoutError` and `UpstreamServiceError`, serving cached fallback observations if available.
   - Added `validate_series_compatibility` static validator.

3. **API Layer (`apps/backend/app/api/v1/series.py`):**
   - Exposed `offline: bool = Query(False)`.

4. **Fixtures Manifest (`data/fixtures/manifest.json`):**
   - Structured JSON manifest documenting source metadata, citation, download timestamps, and data parameters for all authentic NASA fixtures.

---

## 4. Completed Deliverables and Test Verification

Executed complete backend test suite:
```powershell
uv run python -m pytest -v
```

**Results:**
- `tests/integration/test_series.py::test_get_series_offline_mode_and_fallback`: PASSED
- `tests/unit/test_series_service.py::test_validate_series_compatibility`: PASSED
- All 24 tests passed in 1.36s with zero regressions.

**Deliverables:**
- `apps/backend/app/repositories/cache_repository.py`: fallback cache querying and counter methods.
- `apps/backend/app/services/series_service.py`: offline mode, exception fallback, compatibility validator.
- `apps/backend/app/api/v1/series.py`: `offline` query parameter.
- `data/fixtures/manifest.json`: scientific data provenance manifest for fixtures.
- `apps/backend/tests/integration/test_series.py`: offline mode integration tests.
- `apps/backend/tests/unit/test_series_service.py`: compatibility check unit tests.

---

## 5. Justified Pending Items

The following items are intentionally deferred to preserve strict user story boundaries:
1. **Seasonal Mann-Kendall and Sen's Slope Engine:**  
   *Rationale:* Statistical trend detection and autocorrelation handling are formally scoped under **HU-25** (*Tendencia histórica y significancia*).
2. **Comprehensive Curated Benchmark Pre-seeding:**  
   *Rationale:* Pre-loading the 4 benchmark locations (Amazon, La Guajira, Sahel, Australia) during application bootstrap is formally scoped under **HU-14** (*Modo demostración y caché precargado*).
