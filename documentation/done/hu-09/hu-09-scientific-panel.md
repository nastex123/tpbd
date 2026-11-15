# HU-09 Scientific Series Panel

- Epic: Desktop visualization
- Owner: Brandon
- Branch: feature/hu-09-scientific-panel
- Pull request: [#20](https://github.com/nastex123/tpbd/pull/20)
- Status: Merged

## Story and acceptance criteria

Researchers can inspect monthly values and their provenance before interpreting a trend.

- CA-01: The selected month displays the original normalized value and unit.
- CA-02: Null or missing values break the observed series.
- CA-03: The selected month displays location, variable, date, unit, and provider. The panel includes the available period, coordinates, and grid metadata when returned.
- CA-04: A dashed reference line appears only for an evaluable result with at least two valid observations. It uses the backend Sen slope and an intercept anchored to the median residual of the displayed values. A legend identifies the construction.
- CA-05: The panel describes historical data and the backend's scientific caveat without presenting the line as a forecast or causal result.

## Implementation

The canvas draws the existing monthly series and, when available, a historical Sen-slope reference. The shared scale includes the reference endpoints. The result card shows the method, p-value, confidence interval, and caveat returned by the backend.

## Verification

- `npm.cmd run test:globe` covers calendar-month scaling, missing points, and non-evaluable results.
- `npm.cmd run build` passed TypeScript and Vite compilation.
- Manual Electron and chart review remain pending.

## Pending work

The packaged Electron application currently uses offline snapshots. Live results and trend analysis require the development proxy and local backend until the packaged backend integration is implemented. Precipitation remains unavailable because its backend unit requires correction.
