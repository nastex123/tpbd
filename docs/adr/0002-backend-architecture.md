# ADR 0002: Backend Architecture — Layered Service-Repository Pattern

## Status
**Accepted**

## Date
2026-11-14

## Context
The backend service (`apps/backend/`) must serve historical Earth science observations, calculate non-parametric trend statistics (Seasonal Mann-Kendall test, Sen's slope, autocorrelation adjustments), manage local SQLite caching, and interface with NASA POWER and NASA AppEEARS APIs.

Under a 30-hour hackathon timeframe and a single backend developer (Daniel), the architecture must satisfy four critical constraints:
1. **Mathematical Isolation:** Statistical functions must be pure, testable with `pytest`, and completely decoupled from HTTP frameworks.
2. **Contract Compliance:** Data transfer objects must derive 100% from [`docs/openapi.yaml`](file:///c:/Users/LENOVO/Documents/DANI%20DOCS/tpbd/docs/openapi.yaml) using Pydantic v2.
3. **Offline Reliability:** Seamless caching using an embedded database (SQLite) without requiring external services like Redis or PostgreSQL.
4. **Minimalism (Ponytail YAGNI):** Eliminate unnecessary boilerplate, premature abstractions, or heavy dependency injection frameworks.

## Decision

We adopt the **Layered Service-Repository Pattern** structured into five distinct layers:

1. **API Layer (`app/api/`):** FastAPI route controllers handling HTTP routing, query parameter validation, and RFC 7807 error serialization.
2. **Service Layer (`app/services/`):** Business logic and scientific algorithms:
   - `trend_service.py`: Computes Seasonal Mann-Kendall, Sen's slope (per decade), lag-1 serial autocorrelation, and plain-language scientific explanations.
   - `series_service.py`: Handles data hygiene, missing value normalization (`-999` $\to$ `null`), and cache orchestration.
   - `catalog_service.py`: Aggregates variable definitions and metadata.
3. **Client Adapters Layer (`app/clients/`):** Asynchronous HTTP clients using `httpx` with timeout and retry policies for NASA POWER and AppEEARS.
4. **Repository Layer (`app/repositories/`):** Data access and caching using Python's standard `sqlite3` with indexed JSON storage.
5. **Schema Layer (`app/schemas/`):** Pydantic v2 data models matching the OpenAPI 3.1 contract.

## Alternatives Considered

- **Hexagonal Architecture (Ports & Adapters):** Rejected due to high abstraction overhead and boilerplate (defining duplicate `Protocol`/`ABC` interfaces for short-lived hackathon iterations).
- **Feature-Sliced Architecture:** Rejected because cross-cutting scientific models (`TimeSeriesResponse`, `DataPoint`) and shared SQLite caching created redundant boilerplate across slices.
- **Flat Single-Script Router:** Rejected because mixing raw NASA HTTP calls, SQLite SQL queries, and complex Seasonal Mann-Kendall statistics in route handlers impairs unit testability.

## Consequences

### Positive
- **High Testability:** Pure Python functions in `trend_service.py` can be verified against known test fixtures in milliseconds without starting a server.
- **Zero-Boilerplate Simplicity:** Idiomatic FastAPI structure recognized by any Python developer.
- **Sidecar Compatibility:** Standalone entry point `app/main.py` is straightforward to compile into a single binary using PyInstaller for Tauri 2 distribution.
- **Offline Demo Safety:** Clear separation allows the cache repository to serve pre-seeded datasets transparently when network access is unavailable.

### Negative / Trade-offs
- Multiple directory layers require navigation across `api/`, `services/`, and `clients/`.
