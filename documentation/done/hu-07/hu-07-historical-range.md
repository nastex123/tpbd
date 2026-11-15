# HU-07 Historical Range

- Epic: Desktop geography and visualization
- Owner: Brandon
- Branch: feature/hu-07-historical-range
- Pull request: See associated pull request
- Status: Ready for review

## Story and acceptance criteria

As a researcher, I want to choose a historical period so that I can study changes over time.

- CA-01: The start and end years are bounded by the selected variable's catalog range. Offline defaults cover the three existing NASA POWER variables.
- CA-02: Missing data stays null. Cache fallback data outside the requested range is excluded.
- CA-03: Changes are applied through a button, so editing fields does not send requests.
- CA-04: A selected range identifies requests for series and trends and refreshes the chart and coverage.

## Implementation

The desktop reads year bounds from the local catalog in development mode, sends them to the series API, filters returned points to the selected period, and recalculates the trend from those points. Offline snapshots are filtered in the same way. Requests from earlier selections are aborted and their results ignored.

## Verification

- `npm.cmd run build` checks TypeScript and builds the Electron renderer.
- A local FastAPI TestClient requested NASA POWER T2M for Amazonia from 2010 through 2012. It returned 36 monthly values with quality `observed`; the trend endpoint returned HTTP 200 for those points.
- Manual review of the period controls in Electron remains pending.

## Pending work

Production Electron currently uses bundled snapshots rather than live backend requests. Broader catalog and chart improvements belong to HU-08 and HU-09.
