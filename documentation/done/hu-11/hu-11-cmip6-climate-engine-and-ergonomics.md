# Completion Report: CMIP6 Realistic Climate Engine, Dynamic Horizon & UI Ergonomics

## 1. Header & Metadata
- **Epic:** E4 — Analytical Enhancements & Predictive Horizons
- **User Story IDs:** HU-11 & HU-12 (Climate Horizon & Engine Hardening)
- **Title:** CMIP6 Realistic Climate Engine, Dynamic Horizon (`lastHistoricalYear + 1`) & Lightbox Visual Ergonomics
- **Owner:** Daniel (Backend & Data Science) & Brandon (Desktop Core & Spatial)
- **Branch:** `dev`
- **Target Branch:** `dev`
- **Status:** Completed, Audited & Integrated

---

## 2. Problem Statement & User Story Goals
Following live user testing on the CMIP6 climate projections view, critical usability, layout, and scientific modeling deficiencies were identified:
1. **Vertical Overflow & Metric Cards Collision:** Metric cards underneath the center SVG chart caused severe vertical clipping, forced scrollbars, and obscured chart readouts.
2. **Expansion Modal Clutter & Tooltip Clipping:** The previous expansion modal duplicated control strips and lacked a clean close affordance; hovering near the 2100 right edge clipped tooltips off-screen.
3. **Hardcoded Projection Start Year:** Projections were statically pinned to 2025, conflicting with NASA POWER historical series ending at 2025-12.
4. **Static "Barcode / Comb" Projection Physics:** Fallback projections repeated identical monthly cycles with monotonic offsets, lacking real-world physical seasonal warming asymmetry and coupled interannual atmospheric modes.

---

## 3. Five-Phase Implementation Summary

### Phase 1: Deck Layout & Ergonomics Refactoring
- Relocated projection metric cards (`Baseline Mean`, `End-of-Century`, `Net Change Δ`) from the center column to the left identity column (`.deck-col-identity`) beneath *Sen's Slope Trend*.
- Allocated 100% of `.deck-col-center` to the projection SVG chart, expanding height to 200px (min-height 185px) with zero vertical cutoff.
- Maintained total deck height at ~340px, keeping the 3D Earth globe prominently visible (>65% viewport).

### Phase 2: Cinema Lightbox Modal & Edge-Clamped Tooltip
- Transformed the expand view into a dedicated **Cinema Lightbox Modal** displaying only the panoramic 450px high-resolution SVG chart, title, and a prominent `[ ✕ Close ]` button with backdrop dismiss and `ESC` key support.
- Implemented dynamic horizontal edge clamping on chart cursor tooltips: flips to `translate(-105%, -115%)` when $x > 75\%$, preventing off-screen clipping at year 2100.

### Phase 3: Dynamic Projection Start Year (`lastHistoricalYear + 1`)
- Implemented `calculateProjectionStartYear(validHistorical, showHistorical)`.
- Eliminates hardcoded 2025: dynamically detects last valid historical observation (e.g. `2025-12`) and initiates forward projections at `lastHistoricalYear + 1` (e.g. `2026-01`).
- Dynamically updates transition separator line (`transitionDate`), axis year ticks, toggle labels, and legend ranges.
- Comprehensive unit test suite covering ending 2024 -> 2025, 2025 -> 2026, 2026 -> 2027, and fallback cases.

### Phase 4: Realistic IPCC AR6 Climate Engine
- **Local Empirical Climatology & Variance:** `resolve_monthly_baseline` extracts both monthly mean $\mu_m$ and standard deviation $\sigma_m$ directly from cached NASA POWER observations.
- **Physical Seasonal Warming Asymmetry:** Formulated `seasonal_warming_modulation(month, latitude)` based on IPCC AR6 WG1 soil-moisture drying feedback. In mid-latitude continental climates (e.g., Seville, Spain), summer warming is amplified to ~1.27x while winter warming is moderated to ~0.73x, with 12-month mean strictly preserved at 1.000000.
- **Coupled Atmospheric Modes (Natural Variability):** Formulated `interannual_mode_oscillation(year, month, lat, lon)` modeling coupled atmospheric-oceanic modes (ENSO ~3.6 yr, NAO/PDO ~7.2 yr, decadal ~11 yr) deterministically anchored to coordinates without stochastic RNG, eliminating the synthetic "comb/barcode" pattern.

### Phase 5: Overflow Refinement & Final Quality Verification
- Cleaned up container overflow in `holographic-inspector.css` (`overflow: hidden` on `.deck-pane-projections-panoramic`) to eradicate phantom scrollbars.
- Verified 100% test pass rate across backend (84/84) and frontend (34/34 + 3/3).
- Verified live FastAPI backend running with WatchFiles auto-reload.

---

## 4. Automated Verification & Test Results

### Frontend Unit & Globe Test Suite
```text
> tpbd-desktop@0.1.0 test:globe
✔ 34 tests passed (0 failed, 496ms)

> tpbd-desktop@0.1.0 test:local-api
✔ 3 tests passed (0 failed, 260ms)

> tpbd-desktop@0.1.0 build
✔ tsc --noEmit && vite build: 196 modules transformed cleanly (0 errors)
```

### Backend Integration Test Suite
```text
> pytest tests/integration/test_projections.py -v
✔ 10 tests passed (0 failed, 1.74s)
  - test_list_projection_scenarios PASSED
  - test_list_projection_models_uses_live_monthly_catalog PASSED
  - test_get_projection_series_preserves_scenario_metadata_and_missing_values PASSED
  - test_projection_series_rejects_historical_years_and_invalid_ssp PASSED
  - test_projection_series_rejects_unavailable_model_and_unapproved_variable PASSED
  - test_projection_series_applies_ipcc_ar6_fallback_when_all_points_missing PASSED
  - test_projection_physical_seasonal_warming_asymmetry_in_mediterranean PASSED
  - test_projection_interannual_variability_not_static_barcode PASSED
  - test_projection_determinism_and_reproducibility PASSED
  - test_projection_long_term_warming_scenario_hierarchy PASSED

> pytest
✔ 84 tests passed across full backend test suite (0 failed, 10.79s)
```

---

## 5. Completed Deliverables
- `apps/desktop/src/components/detective/CMIP6ProjectionsView.tsx`: Dynamic year resolution, Lightbox modal, edge-clamped tooltip, 200px SVG chart.
- `apps/desktop/src/components/detective/cmip6Projections.ts`: `calculateProjectionStartYear` implementation.
- `apps/desktop/src/components/detective/cmip6Projections.test.ts`: Scenarios covering 2024->2025, 2025->2026, 2026->2027, and empty/disabled fallbacks.
- `apps/desktop/src/components/detective/HolographicInspectorModal.tsx`: Metric cards embedded in left identity column.
- `apps/desktop/src/components/detective/holographic-inspector.css`: Left column styling, Lightbox modal styling, clamped tooltip CSS, overflow cleanup.
- `apps/backend/app/services/projection_service.py`: Realistic IPCC AR6 seasonal asymmetry engine, deterministic coupled atmospheric modes, empirical variance calculation.
- `apps/backend/tests/integration/test_projections.py`: 4 new physics verification tests.
- `documentation/done/hu-11/hu-11-cmip6-climate-engine-and-ergonomics.md`: This completion report.
