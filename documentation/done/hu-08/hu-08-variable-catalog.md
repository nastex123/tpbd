# HU-08 Variable Catalog

- Epic: Desktop experience
- Owner: Brandon
- Branch: feature/hu-08-variable-catalog
- Pull request: See associated pull request
- Status: Ready for review

## Story and acceptance criteria

Users can find and understand available environmental variables.

- CA-01: The selector shows name and identifier, with a detail card for units, definition, category, source, community, grid, and monthly coverage.
- CA-02: The supported NASA POWER AG monthly variables are curated locally. The catalog updates coverage and spatial metadata in development mode when compatible metadata is available.
- CA-03: Only temperature and relative humidity are selectable. Precipitation is disabled pending a backend unit correction.
- CA-04: GWETROOT and EVPTRNS remain unavailable until their metadata and endpoint behavior are validated.
- CA-05: Changing variables preserves the selected location and compatible range. A changed range is announced.

## Technical implementation

The selector filters by name or identifier while retaining the selected entry. The frontend accepts catalog coverage only for its curated NASA POWER AG variables and aborts requests on unmount.

## Verification

- `npm.cmd run build` passed TypeScript checking and the Vite production build.
- NASA POWER Monthly Point returned T2M in C, RH2M in %, and PRECTOTCORR in mm/day for AG community, 2020, near Manaus.
- Manual Electron review remains pending.

## Pending work

The backend currently describes PRECTOTCORR as mm/month and normalizes NASA's numeric values without unit conversion. Correct and validate the backend series, metadata, cached fixtures, and trend units before enabling precipitation. The Earthdata-dependent variables remain outside the curated selector. Production Electron currently uses offline snapshots; live catalog access requires a packaged backend integration.
