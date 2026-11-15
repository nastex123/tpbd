# HU-13 Integrated Data Detective Flow

- Epic: Desktop investigation
- Owner: Brandon
- Branch: feature/hu-13-integrated-flow
- Pull request: [#22](https://github.com/nastex123/tpbd/pull/22)
- Status: Merged; timed Electron-to-FastAPI demo pending

## Story and acceptance criteria

Evaluators can investigate a variable, location, historical series, trend, and regional comparison in one session.

- CA-01: Existing selectors update the shared investigation without reloading.
- CA-02: Series and trend cards expose provenance, coverage, method, interval, and caveat when returned by the backend.
- CA-03: Regional comparisons require matching variable, period, units, provider, and spatial resolution.
- CA-04: Local API failures leave the interface responsive and available snapshots remain visible.
- CA-05: The presentation flow has four steps. A timed manual demonstration remains pending.

## Implementation

Electron uses an isolated preload and a restricted local API bridge for the health, catalog, region, series, and trend routes. The development browser continues through Vite. Requests are timed out and abandoned renderer results are ignored. Presentation starts with the documented Amazon temperature snapshot and resets the investigation period.

## Verification

- `npm.cmd run test:local-api` passed route allowlist, response forwarding, and response size tests.
- `npm.cmd run test:globe` passed the five globe and comparison tests.
- `npm.cmd run build` passed TypeScript and Vite compilation.
- FastAPI TestClient retrieved 36 months of NASA POWER T2M data for both Amazon and Sahel, then obtained HTTP 200 trend responses.

## Pending work

Manual review of the Electron window and a timed demonstration remain pending. FastAPI is started separately; bundling and process lifecycle are outside this change. Precipitation remains unavailable pending correction of backend units.
