# ADR 0001: Team Standards, API Governance, and Work Concurrency

## Status
**Accepted**

## Date
2026-11-14

## Context
The TPBD (*The Pale Blue Dot*) project is developed under a 30-hour hackathon environment for the **NASA Space Apps Challenge 2026: Be An Earth System Trend Detective!** 

With three developers working in parallel across backend/data engineering (Daniel), desktop platform/geospatial core (Brandon), and UX/UI/visual analytics (Dylan):
1. Lack of a strict API contract leads to integration bottlenecks, mismatched data types, and last-minute regressions.
2. Uncoordinated code changes in shared files lead to git merge conflicts and accidental overwrites.
3. Code written in mixed languages complicates collaboration, public open-source submission, and hackathon judging evaluation.

## Decision

We establish the following non-negotiable operational standards:

1. **English Language Standard:** All source code, identifiers, tests, documentation, commit messages, PRs, and architectural records are written 100% in English.
2. **Contract-First Architecture via OpenAPI 3.1:** 
   - `docs/openapi.yaml` is the single source of truth for all communication between the desktop application and the local FastAPI engine.
   - The contract cannot be bypassed or modified without an approved ADR and consensus.
   - Frontend and backend teams use code generation and typed fixtures directly derived from this specification.
3. **Git Concurrency & Branching Strategy:**
   - Active development integrates into the `dev` branch.
   - Every unit of work occurs on an isolated branch named `feature/<feature-name>`.
   - Merging into `dev` requires an approved Pull Request (PR) with passing contract validation and unit tests.
4. **Domain and Path Partitioning:**
   - `services/climate-engine/**` is owned exclusively by Backend/Data Science.
   - `apps/desktop/src-tauri/**` and `apps/desktop/src/components/globe/**` are owned by Desktop/Spatial Core.
   - `apps/desktop/src/components/{charts,catalog,layout}/**` is owned by UI/UX Visual Analytics.
   - Direct modifications outside an assigned domain require prior authorization.
5. **Architectural Decision Tracking:**
   - All significant technical, statistical, or infrastructure decisions are tracked as sequential ADRs in `docs/adr/NNNN-<title>.md`.

## Consequences

### Positive
- **Independent Velocity:** Frontend developers can build against typed mocks and fixtures without waiting for backend implementation.
- **Zero Collision Risk:** Team members work in decoupled directories on distinct git branches.
- **Scientific & Engineering Rigor:** Standardized API contracts enforce rigorous metadata, units, and missing value handling according to NASA guidelines.
- **International Readiness:** English documentation and clean OpenAPI contracts directly meet NASA Space Apps global judging criteria.

### Negative / Trade-offs
- Slight initial overhead required to author and review ADRs before making architectural pivots.
- Requirement to keep `docs/openapi.yaml` synchronized with implementation changes.
