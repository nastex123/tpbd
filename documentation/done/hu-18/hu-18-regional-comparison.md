# HU-18 Regional Comparison

- Epic: Desktop visualization
- Owner: Brandon
- Branch: feature/hu-18-regional-comparison
- Pull request: [#21](https://github.com/nastex123/tpbd/pull/21)
- Status: Merged

## Story and acceptance criteria

Users compare the historical trend of one variable across two locations.

- CA-01: A common variable is selected and matching units are required for a shared comparison.
- CA-02: Each card displays its source, grid resolution, available period, and coverage; monthly frequency is stated. Incompatible metadata is identified.
- CA-03: Each region retains its own slope, interval, method, p-value, and caveat from the backend.
- CA-04: Different variables, units, sources, resolutions, periods, duplicate dates, or unavailable data prevent a shared comparison. Independent charts and month controls remain available.
- CA-05: The paired description reports slopes without claiming causation or a statistically significant difference between regions. A combined description requires matching method, rate unit, significance threshold, and evaluable results.

## Implementation

The desktop validates series metadata and available period before computing a shared scale. Each series remains visible on its own scale if metadata differs. Trend outputs are retained per location.

## Verification

- `npm.cmd run test:globe` passed five tests covering trend lines and matching, incompatible, missing, and non-evaluable comparisons.
- `npm.cmd run build` passed TypeScript and Vite compilation.
- Manual Electron review and a live two-location end-to-end test remain pending.

## Pending work

Precipitation is disabled pending correction of backend units. The packaged application relies on bundled offline snapshots until backend integration is available. HU-13 and HU-15 cover the integrated flow and release verification.
