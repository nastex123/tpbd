# Project Rules & Team Concurrency Guidelines (AGENTS.md)

**Project:** TPBD — *The Pale Blue Dot* (Earth System Trend Detective)  
**Event:** NASA Space Apps Challenge 2026  
**Status:** Active  

This document defines the mandatory project rules, team boundaries, and behavioral standards for all developers and AI agents working on the TPBD repository.

---

## 1. Language Policy

- **Strictly English:** All source code, identifiers, comments, documentation, commit messages, Pull Request descriptions, Architecture Decision Records (ADRs), and API contracts **must be written 100% in English**.
- User communication in conversation/chat may be conducted in Spanish or English according to user preference, but all written repository assets must remain in English.

---

## 2. API Contract Inviolability (Contract-First)

- The OpenAPI 3.1 specification located at [`docs/openapi.yaml`](file:///c:/Users/LENOVO/Documents/DANI%20DOCS/tpbd/docs/openapi.yaml) is the **single, immutable source of truth** for all data exchanges between the desktop frontend and the Python backend.
- **No silent mutations:** Neither frontend nor backend developers/agents may unilaterally alter endpoint routes, query parameters, request bodies, or response schemas.
- **Contract modifications:** Any modification to the API specification requires an explicit discussion, an accepted Architecture Decision Record (ADR), and team consensus before code changes are made.
- **Typed client & server:** Frontend models and backend Pydantic schemas must be derived directly from `docs/openapi.yaml`.

---

## 3. Team Concurrency & Work Division

To maximize velocity during the hackathon and prevent code collisions, responsibilities and file paths are strictly partitioned:

| Role / Owner | Domain Ownership | Allowed File Scopes | Forbidden Scopes |
|---|---|---|---|
| **Daniel (Backend & Data Science)** | FastAPI backend, NASA POWER/AppEEARS adapters, caching, Seasonal Mann-Kendall & Sen's slope engine | `services/climate-engine/**`, `tests/**`, `data/fixtures/**` | `apps/desktop/**` |
| **Brandon (Desktop Core & Spatial)** | Tauri 2 runtime, window management, WebGL 3D Globe, geolocation state | `apps/desktop/src-tauri/**`, `apps/desktop/src/components/globe/**`, `apps/desktop/src/stores/navigationStore.ts` | `services/climate-engine/**`, `apps/desktop/src/components/charts/**` |
| **Dylan (UI/UX & Visual Analytics)** | Data Detective design system, Recharts series, variable catalog, comparison UI, demo presets | `apps/desktop/src/components/{charts,catalog,layout}/**`, `apps/desktop/src/styles/**` | `services/climate-engine/**`, `apps/desktop/src-tauri/**` |
| **Shared / Architecture** | Global documentation, API contracts, ADRs | `docs/**`, `README.md`, `ROADMAP_TPBD.md`, `HISTORIAS_USUARIO_TPBD.md` | — |

### Code Collision Rule:
- **Never overwrite another team member's code** without prior consultation and explicit authorization.
- If a feature requires cross-boundary adjustments, communicate via the API contract or create an interface mock before touching shared paths.

---

## 4. Git Flow & Branching Strategy

1. **Base Integration Branch:** `dev`. Direct pushes to `main` or `dev` are strictly forbidden.
2. **Branch Naming Convention:** All branches must branch from `dev` and follow the convention:
   ```text
   feature/<feature-name>   # e.g., feature/HU-02-openapi-contract, feature/HU-25-trend-analysis
   fix/<bug-description>   # e.g., fix/null-handling-in-series
   ```
3. **Pull Requests (PR):**
   - Every feature must be merged into `dev` through a Pull Request.
   - PR requirements: passing automated tests, no contract violations, and peer review approval.
4. **Commit Messages:** Follow Conventional Commits in English:
   - `feat: add seasonal mann-kendall statistical test`
   - `fix: treat -999 as null in NASA POWER adapter`
   - `docs: update openapi specification with appeears schemas`

---

## 5. Architectural Decision Records (ADRs)

- Every significant architectural, data modeling, statistical, or infrastructure decision must be documented in `docs/adr/`.
- File naming: `docs/adr/NNNN-<kebab-case-title>.md` (e.g., `0001-team-standards-api-governance-and-concurrency.md`).
- Standard format:
  - **Status:** Proposed / Accepted / Deprecated / Superseded
  - **Context:** Problem statement and constraints
  - **Decision:** Chosen architecture and rationale
  - **Consequences:** Positive outcomes and trade-offs

---

## 6. Agentic Behavior Guidelines

When an AI agent operates autonomously on the repository:
1. **Scope Confinement:** Agents must strictly operate within the allowed directory paths of the persona they are currently embodying (Daniel, Brandon, or Dylan).
2. **Contract Compliance Verification:** Before generating backend endpoints or frontend query hooks, verify against `docs/openapi.yaml`.
3. **Test-Driven Delivery:** An agent's task is only complete when corresponding unit/contract tests pass cleanly and edge cases (missing data, non-evaluable states, network timeouts) are handled.
4. **Zero Hallucination of Data:** Never generate synthetic or mock numbers as real NASA observations. If data is unavailable, return explicit nulls with `"quality": "missing"` or `"status": "not_evaluable"`.
