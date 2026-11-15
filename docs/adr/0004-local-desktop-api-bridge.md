# ADR 0004: Local Desktop API Bridge

**Status:** Accepted

## Context

The development renderer uses a Vite proxy to reach the FastAPI service. The compiled Electron renderer loads from a local file and cannot use that proxy.

## Decision

Expose a narrow request bridge through an isolated Electron preload. The main process accepts requests only from the main window's main frame, uses a fixed loopback origin, restricts paths and methods to the investigation endpoints, rejects redirects and unexpected query parameters, and limits request and response sizes. Requests have a timeout. The browser development entry point continues using the Vite proxy.

The backend remains a separately started process. The bridge does not change the OpenAPI contract or start a Python process.

## Consequences

The compiled Electron renderer can use the local backend without enabling Node integration or disabling web security. A request already sent to the main process can continue until its timeout if the renderer abandons it; the renderer ignores its result. Offline snapshots remain available if the service is unreachable. Any new API route must be explicitly reviewed and added to the allowlist.
