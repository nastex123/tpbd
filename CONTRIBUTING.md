# Contributing to TPBD — The Pale Blue Dot

Thank you for your interest in contributing to **TPBD (The Pale Blue Dot)**!  
TPBD was created during the **NASA Space Apps Challenge 2026** under the challenge track *"Be An Earth System Trend Detective!"*. Our mission is to make authoritative Earth observation data and non-parametric climate trend statistics accessible, transparent, and visually intuitive to researchers, educators, and citizens worldwide.

Before contributing, please review this guide to ensure alignment with our scientific standards, contract-first governance, and code architecture.

---

## Guiding Principles & Scientific Ethos

1. **Protecting Our Pale Blue Dot:** As Carl Sagan reminded humanity, planet Earth is our only home. Our work serves to understand and safeguard its living systems.
2. **Zero Hallucination of Data:** We never fabricate, impute, or mock numerical data as real NASA observations. If data is missing or incomplete, we return explicit `null` with `"quality": "missing"` or `"status": "not_evaluable"`.
3. **Rigorous Non-Parametric Statistics:** We treat Earth systems with statistical humility, accounting for annual seasonality, serial autocorrelation, and non-normal distributions.
4. **Strictly English Language Policy:** All code, identifiers, comments, documentation, commit messages, and Pull Requests must be authored 100% in English.

---

## Engineering Domains & Repository Partitioning

To maintain code velocity and prevent collisions, file ownership is divided into functional engineering domains:

| Engineering Domain | Domain Responsibilities | Allowed File Scopes | Forbidden Scopes |
|---|---|---|---|
| **Backend & Scientific Data Engineering** | FastAPI backend, NASA POWER/AppEEARS adapters, caching, Seasonal Mann-Kendall, Sen's slope, and CMIP6 climate engine | `apps/backend/**`, `tests/**`, `data/fixtures/**` | `apps/desktop/**` |
| **Desktop Core & Geospatial Engineering** | Electron runtime, window management, WebGL 3D Globe, geolocation state, volumetric thematic visors | `apps/desktop/electron/**`, `apps/desktop/src/components/globe/**`, `apps/desktop/src/stores/navigationStore.ts` | `apps/backend/**`, `apps/desktop/src/components/charts/**` |
| **Frontend & Visual Analytics Engineering** | Data Detective design system, Recharts series, variable catalog, comparison UI, demo presets, CMIP6 UI | `apps/desktop/src/components/{charts,catalog,layout,detective}/**`, `apps/desktop/src/styles/**` | `apps/backend/**`, `apps/desktop/electron/**` |
| **Shared Architecture & Documentation** | Global documentation, API contracts, ADRs, Done Reports, Docker assets | `docs/**`, `documentation/**`, `README.md`, `CONTRIBUTING.md`, `docker-compose.yml` | — |

---

## Contract-First Governance (OpenAPI 3.1)

The OpenAPI 3.1 specification located at [`docs/openapi.yaml`](docs/openapi.yaml) is the **single, immutable source of truth** for all data exchanges between the desktop frontend and the backend Climate Engine.

* **No Unilateral Mutations:** Neither frontend nor backend developers may alter routes, query parameters, request bodies, or response schemas without an approved Architecture Decision Record (ADR).
* **Derivation:** Backend Pydantic v2 schemas and frontend client models derive directly from `docs/openapi.yaml`.
* **Proposing API Changes:** If a new feature requires schema adjustments:
  1. Open a discussion or propose an ADR under `docs/adr/`.
  2. Update `docs/openapi.yaml`.
  3. Implement corresponding Pydantic models in `apps/backend/app/schemas/`.
  4. Implement corresponding TypeScript types in `apps/desktop/src/`.

---

## Git Flow & Branching Strategy

We follow a structured Git Flow model:

1. **Integration Branch:** `dev` is the primary integration branch. Direct pushes to `main` or `dev` are strictly forbidden.
2. **Production Branch:** `main` represents validated, tagged release states.
3. **Branch Naming Conventions:** All branches must branch from `dev` and follow:
   ```text
   feature/<feature-name>   # e.g., feature/radar-color-interpolation
   fix/<bug-description>   # e.g., fix/null-handling-in-series
   docs/<documentation>    # e.g., docs/contributing-guidelines
   ```
4. **Conventional Commits:** Commit messages must follow the Conventional Commits specification in English:
   ```text
   feat: add cardinal crosshairs to precipitation radar layer
   fix: clamp hover tooltip within viewport bounds
   docs: update API catalog with AppEEARS MOD13Q1 details
   test: add unit tests for Doppler range circles
   ```

---

## Local Development Setup

### Prerequisites
* **Python:** 3.12 or higher with [`uv`](https://docs.astral.sh/uv/) (recommended) or `pip`.
* **Node.js:** 20 or higher with `npm`.
* **Docker & Docker Compose:** Optional for containerized backend execution.

### Backend Setup
```bash
cd apps/backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Desktop Frontend Setup
```bash
cd apps/desktop
npm install
npm run desktop      # Launches Electron desktop app
# Or:
npm run dev          # Launches browser dev server at http://127.0.0.1:1420
```

### Running with Docker Compose
```bash
docker compose up --build -d
```

---

## Testing & Verification Standards

Every Pull Request must pass all automated test suites prior to merge approval.

### 1. Backend Pytest Suite
```bash
cd apps/backend
uv run python -m pytest -v
```
*Tests must pass with zero failures (covering Mann-Kendall statistics, Sen's slope, AppEEARS clients, cache persistence, and CMIP6 projections).*

### 2. Desktop Globe & Visual Tests
```bash
npm --prefix apps/desktop run test:globe
```
*Validates 3D math, geodesic radar circles, teleconnections, and CMIP6 scenario mappings.*

### 3. Investigation & Local API Tests
```bash
npm --prefix apps/desktop run test:investigations
npm --prefix apps/desktop run test:local-api
```

---

## Pull Request Checklist (Definition of Done)

Before submitting a Pull Request, ensure:
- [ ] Your branch is branched from and rebased against the latest `dev`.
- [ ] All code, identifiers, comments, and commits are 100% in English.
- [ ] All automated tests pass (`test:globe`, `pytest`, `test:investigations`).
- [ ] No hardcoded credentials, API keys, or absolute file paths (`C:\`, `file:///`) are committed.
- [ ] The OpenAPI 3.1 contract (`docs/openapi.yaml`) has not been altered unless accompanied by an accepted ADR.
- [ ] If implementing a complete User Story (HU), a completion report is created in `documentation/done/<hu-id>/<hu-id>-<title>.md`.

---

## Questions or Feedback?

Feel free to open an issue or start a discussion on our [GitHub Repository](https://github.com/nastex123/tpbd/issues). Thank you for helping us advance Earth system science!
