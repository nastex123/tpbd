# HU-06 Coordinates and Globe Exploration

**Epic:** Desktop geography
**Owner:** Brandon
**Branch:** feature/hu-06-coordinates
**Pull request:** See the associated pull request
**Status:** Implemented; backend integration and manual review pending.

## User story and acceptance criteria

As a user, I want to choose a preset location or geographic coordinates to investigate an available location.

- [x] CA-01: Coordinate input validates latitude and longitude ranges.
- [x] CA-02: The globe, preset list, and coordinate form update the shared selection.
- [ ] CA-03: Actual grid-cell metadata requires verification against the updated backend.
- [x] CA-04: Requests are aborted or ignored when their location changes.
- [x] CA-05: The interface describes grid values as representing an area.

## Implementation

The Electron view adds coordinate selection, globe navigation, layers, local geographic search, distance measurement, historical playback, comparison, and a presentation flow. Natural Earth boundaries and two NASA POWER temperature snapshots are bundled for offline use. The desktop queries the existing API contract in development mode.

## Verification

- `npm.cmd run build` passed TypeScript and Vite compilation.
- Coordinate boundary and geographic calculation checks passed.
- Electron smoke checks passed for the globe, independent scrolling, offline playback, comparison, and night layer.

## Deliverables and pending work

The globe, location selector, navigation controls, offline snapshots, and comparison interface are included. Live series, trends, and grid outlines require integration verification against the newly updated backend. Packaged Electron currently displays bundled snapshots and does not query the local API. A full manual review of globe interactions and WebGL fallback remains pending before closing HU-06.
