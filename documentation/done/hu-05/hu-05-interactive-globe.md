# HU-05 Interactive Globe

| Field | Value |
|---|---|
| Epic | Desktop geography |
| Owner | Brandon |
| Branch | feature/hu-05-globe |
| Pull request | Pending creation |
| Status | Implemented. Manual interaction checks pending. |

## User story and acceptance criteria

As a researcher, I want to explore a globe and locate study regions so that environmental series have geographic context.

- [ ] CA-01: Confirm rotation, zoom limits, and all four markers and labels in Electron.
- [ ] CA-02: Confirm that selecting a marker or a list entry updates the same geographic selection.
- [x] CA-03: The globe is mounted independently of variable and time filters. Its selection updates do not change the renderer key.
- [ ] CA-04: Confirm the list remains usable when WebGL is disabled.

## Technical implementation

The desktop screen owns the selected region ID and passes it to the globe and accessible list. The globe uses local textures for the surface, relief, and clouds. Reduced graphics disables relief, clouds, and atmosphere. The cloud layer does not receive pointer events, and cleanup releases its geometry, material, texture, and animation frame. The list remains outside the WebGL error boundary.

## Verification

- `npm.cmd run build` passed TypeScript checking and the Vite production build. Vite reported a large bundle warning.
- `npm.cmd run desktop` opened the TPBD window on Windows. The map texture returned HTTP 200 from the local Vite server.

## Deliverables

- Four labeled study regions and synchronized selection.
- Local Earth textures and reduced graphics mode.
- Accessible list with a WebGL fallback.

## Pending items

Manual checks for CA-01, CA-02, and CA-04 remain part of HU-05 review. Free coordinate entry and validation belong to HU-06.
