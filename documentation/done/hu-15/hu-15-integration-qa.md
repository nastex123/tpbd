# HU-15 Integration, QA, and Delivery

- Epic: Demo, integration, and quality
- HU ID: HU-15
- Owner: Brandon and Daniel
- Branch: `feature/hu-15-integration-qa`
- Pull request: See associated pull request
- Status: Ready for review; full Electron-to-FastAPI demonstration pending

## User story and acceptance criteria

The team delivers a stable application and a reproducible investigation.

- [x] CA-01: The desktop starts and allows selecting an investigation location and variable without reloading. Offline NASA POWER series and metadata render.
- [x] CA-02: The interface presents source, units, period, and coverage; each trend report includes its method and caveat when the backend returns it. The offline snapshot clearly identifies its source and period.
- [x] CA-03: NASA POWER returned a non-significant T2M trend for Amazonia in 1990–2007 and a significant trend in 2008–2025 through the series/trend APIs used by the desktop. Backend tests cover non-evaluable series and insufficient samples.
- [x] CA-04: With the API unavailable, Electron remains responsive and displays its stored temperature snapshot. A successful live-API/WebGL failure-path run remains pending.
- [x] CA-05: README setup instructions, endpoint inventory, architecture, methodology, limitations, source links, and ADR index have been reviewed and corrected.

## Implementation and review findings

The existing Electron preload keeps Node integration disabled and exposes a restricted loopback API bridge. The existing UI uses the NASA POWER snapshot when the API is unavailable. This change reconciles the README with the current Electron runtime and API routes, and resolves duplicate ADR numbers introduced when the AI ADRs were added: Gemini routing is now ADR-0007 and scientific audio synthesis is ADR-0008. Existing reports now reference those corrected paths.

## Automated verification

Executed from `apps/desktop`:

- `node --test electron/local-api.test.mjs` — 3 passed.
- `node --experimental-strip-types --test src/stores/investigations.test.ts` — 4 passed.
- `node --experimental-strip-types --test src/components/globe/trendLine.test.ts src/components/globe/seriesComparison.test.ts src/components/globe/temporalPeriod.test.ts` — 8 passed.
- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- `node node_modules/vite/bin/vite.js build` — passed; Vite reports its existing large-bundle advisory.
- `uv run python -m pytest -v` from `apps/backend` — 65 passed, 1 Starlette/httpx deprecation warning.
- `uv run python -` with FastAPI `TestClient`: requested NASA POWER T2M for Amazonia in 1990–2007 and 2008–2025, then posted each series to `/api/v1/analytics/trends` — both series returned 216 months; the first trend was `no_significant_trend`, the second `increasing_significant`.

## Manual verification

The compiled Electron application opened successfully. Selecting Amazonia updated the shared location without reloading, displayed coordinates and source metadata, and loaded 432 months from the stored NASA POWER snapshot. The guided presentation advanced from location selection to historical playback and trend interpretation. With FastAPI stopped, the snapshot remained visible; the application reported that trend analysis was unavailable, as expected for this snapshot fallback.

## Pending verification

- The backend suite and real NASA data-to-trend API flow passed, but the Electron renderer was not run against a live FastAPI process in this session.
- The offline snapshot does not include precomputed trend results, so trend cards correctly report that analysis is unavailable while offline.
- A timed end-to-end demo covering variable, location, series, trend, and comparison remains to be run against FastAPI.
