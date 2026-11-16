# Completion Report: HU-26 Non-Parametric Change-Point Detection & Regime Shifts

## 1. Header & Metadata
- **Epic:** E4 — Analytical Enhancements & Statistical Detective
- **User Story ID:** HU-26
- **Title:** Non-Parametric Change-Point Detection and Regime Shifts (Pettitt Test)
- **Owner:** Daniel (Backend & Data Science Specialist)
- **Branch:** `feature/HU-26-changepoint-detection`
- **Pull Request:** [#23](https://github.com/nastex123/tpbd/pull/23)
- **Target Branch:** `dev`
- **Status:** Merged

---

## 2. User Story & Acceptance Criteria Checklist

**User Story:**  
*As an Earth science researcher or climate analyst, I want to identify critical change points, regime shifts, or trend accelerations in observational time series using non-parametric statistical methods, so that I can determine not just if a trend exists, but exactly when it shifted, reversed, or accelerated.*

- [x] **CA-01: Pettitt's Test Calculation:** Evaluates Mann-Whitney rank cumulative sums $U_t$ and identifies the maximum absolute statistic $K_T$ and the critical breakpoint date $t^*$.
- [x] **CA-02: Significance Assessment:** Computes approximate two-tailed probability $p \approx 2 \exp(-6 K_T^2 / (N^3 + N^2))$ tested against nominal $\alpha$ (default 0.05).
- [x] **CA-03: Segmented Slope Estimation:** Evaluates non-parametric Sen's slopes independently for the pre-break period ($t \le t^*$) and post-break period ($t > t^*$), expressed in standard physical units per decade.
- [x] **CA-04: Regime Shift Classification:** Categorizes the physical change into discrete classifications (`accelerating_increase`, `decelerating_increase`, `reversal_to_cooling`, `reversal_to_warming`, `abrupt_step_increase`, `no_significant_break`).
- [x] **CA-05: Robust Edge-Case Handling:** Short time series ($N < 24$ points) or zero-variance observations produce explicit `not_evaluable` states without crashing or leaking `NaN`/`Infinity`.
- [x] **CA-06: OpenAPI 3.1 Contract & ADR Governance:** Formally documented in `docs/openapi.yaml` under `POST /api/v1/analytics/changepoints` with ADR-0004 architectural record.

---

## 3. Technical Implementation Details

### Architecture & Modularity
- **ADR-0004:** Documented in `docs/adr/0004-non-parametric-changepoint-detection.md` detailing Pettitt's rank test formulation, approximate $p$-value derivation, and segmented slope computation.
- **Contract Specification (`docs/openapi.yaml`):** Added `POST /api/v1/analytics/changepoints`, `ChangePointRequest`, `ChangePointResponse`, and `RegimeShiftType`.
- **Pydantic Schemas (`apps/backend/app/schemas/analytics.py`):** Added strongly typed models enforcing bounded input arrays ($\le 2,400$ points) per Cloudflare security guidelines.
- **Core Domain Service (`apps/backend/app/services/changepoint_service.py`):**
  - Optimized Pettitt's test using ranked cumulative sums (`scipy.stats.rankdata` + `np.cumsum`), achieving $O(N \log N)$ execution time ($< 1$ ms for 2,400 points).
  - Segmented Sen's slope calculation using `pymannkendall.sens_slope` scaled to physical units per decade ($\times 120$).
- **API Routing & DI (`apps/backend/app/api/v1/analytics.py`, `apps/backend/app/api/deps.py`):** Mounted route handler with singleton dependency injection.

---

## 4. Automated Verification & Tests

Executed command:
```powershell
uv run --directory apps/backend python -m pytest -v
```

**Results:**
- `tests/unit/test_changepoint_service.py`: 5 passing unit tests covering abrupt step shifts, accelerating warming trends, sample size thresholds, zero-variance handling, and stationary series without structural breaks.
- `tests/integration/test_analytics.py`: 5 passing integration tests, including `test_post_analytics_changepoints_success`.
- **Total Test Suite:** 55 passed in 4.95s.

```text
tests/integration/test_analytics.py::test_post_analytics_changepoints_success PASSED
tests/unit/test_changepoint_service.py::test_changepoint_detection_abrupt_step PASSED
tests/unit/test_changepoint_service.py::test_changepoint_detection_accelerating_trend PASSED
tests/unit/test_changepoint_service.py::test_changepoint_detection_insufficient_samples PASSED
tests/unit/test_changepoint_service.py::test_changepoint_detection_zero_variance PASSED
tests/unit/test_changepoint_service.py::test_changepoint_detection_stationary_no_break PASSED
======================== 55 passed, 1 warning in 4.95s ========================
```

---

## 5. Justified Pending Items

1. **Gemini AI Investigation Copilot & Model Router (`HU-27`):**  
   *Deferred to:* **HU-27** (*Copiloto IA de investigación y enrutador dinámico Gemini*).  
   *Technical Justification:* Natural language question routing and variable recommendations belong to the AI Copilot story HU-27.
2. **Gemini AI Scientific Explainer & Mission Control TTS Voice (`HU-28`):**  
   *Deferred to:* **HU-28** (*Explicador científico y síntesis de voz Mission Control TTS*).  
   *Technical Justification:* Deep reasoning synthesis using thinking models and spoken audio briefing generation belong to HU-28.
3. **Frontend Recharts Visual Breakpoint Rendering:**  
   *Deferred to:* Brandon / Dylan (Desktop Frontend).  
   *Technical Justification:* Visual rendering of change-point dashed vertical lines on Recharts series belongs to `apps/desktop/**`.
