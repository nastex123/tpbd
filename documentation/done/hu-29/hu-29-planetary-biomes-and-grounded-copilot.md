# HU-29 Planetary Biomes, Opposing Teleconnections & Grounded AI Copilot

- **Epic:** Data Science & Planetary Analytics (NASA Space Apps Challenge 2026)
- **HU ID:** HU-29
- **Owner:** Daniel (Backend & Data Science) with Brandon (Desktop UI/UX)
- **Branch:** `feature/planetary-biomes-and-grounded-copilot`
- **Pull Request:** Pending user review
- **Status:** Completed / Ready for Review

---

## 1. User Story & Acceptance Criteria

**As a** student or citizen data detective investigating planetary climate change,  
**I want to** select diverse planetary biomes and explore opposing climate trends driven by identical planetary mechanisms (such as the Hadley cell expansion, Polar Amplification, and ENSO teleconnections),  
**So that** I can observe, analyze, and comprehend how Earth system variables diverge across interconnected regions with statistical significance and data-grounded AI explanations.

### Acceptance Criteria Checklist
- [x] **CA-01 (Planetary Biome Expansion):** Expand curated preset regions from 4 to 12 representative Earth system biomes across tropical rainforests, polar cryospheres, endorheic basins, marine ecosystems, and alpine zones.
- [x] **CA-02 (Opposing Teleconnection Pairs):** Define canonical teleconnection pairs with documented physical mechanisms (Hadley Cell, Polar Amplification, ENSO Asymmetry) where a single global driver causes opposite trend directions across biomes.
- [x] **CA-03 (Structured Domain Grounding):** Implement an in-memory knowledge base (`teleconnections.json` + `KnowledgeService`) that grounds Gemini 3.8 Flash copilot responses with zero latency, zero vector DB bloat, and zero hallucination.
- [x] **CA-04 (Frontend Dynamic Catalog & Region Ingestion):** Eliminate hardcoded 2-variable and 4-region limitations in desktop frontend (`globeData.ts` and `RegionGlobe.tsx`), supporting all validated NASA variables and 12 biomes dynamically.
- [x] **CA-05 (1-Click Teleconnection Presets):** Integrate one-click teleconnection exploration shortcuts into the desktop globe interface to allow students to immediately load opposing biome pairs into dual comparative time series.
- [x] **CA-06 (Zero-Hallucination & Robustness):** Enforce strict OpenAPI 3.1 contract compliance, zero synthetic fallbacks in production paths, and clean handling of insufficient observations (`not_evaluable`).

---

## 2. Technical Implementation Details

### Architecture & Modules
1. **Decision Records (ADRs):**
   - `docs/adr/0009-structured-domain-grounding-vs-rag.md`: Rationale for in-memory structured grounding vs heavy vector DBs (FAISS/Chroma).
   - `docs/adr/0010-planetary-biomes-and-opposing-teleconnection-pairs.md`: Selection and physical validation of 12 planetary biomes and 3 opposing teleconnection pairs.

2. **Backend Domain Layer (`apps/backend`):**
   - `app/schemas/regions.py`: Extended `Region` schema with `teleconnection_pair` and `biome_category` metadata.
   - `app/repositories/region_repository.py`: Registered 12 biomes and 3 opposing teleconnection pairs with representative grid cell metadata and coordinates.
   - `app/data/teleconnections.json`: Curated physical driver mechanisms, expected directional divergence, and scientific references.
   - `app/services/knowledge_service.py`: Domain grounding service providing constant-time lookup of physical mechanisms and teleconnection pairs.
   - `app/services/ai_service.py`: Enhanced Gemini prompt builder to inject physical grounding into the Copilot context before inference.

3. **Desktop Frontend (`apps/desktop`):**
   - `src/components/globe/globeData.ts`: Expanded `variableOptions` fallback to all 6 validated variables (`T2M`, `PRECTOTCORR`, `RH2M`, `GWETROOT`, `EVPTRNS`, `MOD13Q1_NDVI`) and made `useVariableAvailability` dynamically parse all variables from `/api/v1/catalog/variables`.
   - `src/components/globe/RegionGlobe.tsx`: Registered all 12 biomes with offline fallbacks and 3D globe bounding polygons (`studyAreas`), enabled dynamic region updates from backend (`setRegions(entries)`), and added 1-click Planetary Teleconnection presets.

---

## 3. Automated Verification & Tests

### Backend Unit & Integration Suite
```powershell
cd apps/backend
.\.venv\Scripts\python.exe -m pytest tests/unit tests/integration -v
```
**Result:** 79 passed, 0 failed in 10.13s (100% pass rate).
- `tests/unit/test_knowledge_service.py`: 3/3 passed.
- `tests/unit/test_region_repo.py`: 3/3 passed.
- `tests/integration/test_regions.py`: 2/2 passed.
- `tests/unit/test_gemini_client.py`: 7/7 passed.

### Desktop Test Suite
```powershell
npm run test:globe --prefix apps/desktop
npm run test:local-api --prefix apps/desktop
npm run test:investigations --prefix apps/desktop
```
**Result:** 19 passed, 0 failed.
- Globe tests: 12 passed.
- Local API tests: 3 passed.
- Investigation store tests: 4 passed.

### Comprehensive QA Audit Suite
```powershell
.\.venv\Scripts\python.exe tests/agent_audit/audit_orchestrator.py
```
**Result:**
- 22/22 Endpoints Contract Verified (100.0%).
- 6/6 NASA POWER Ground Truth Consistency Checks Passed.
- 7/7 Resilience & Error Scenarios Handled Cleanly (0 unhandled 500s).

---

## 4. Completed Deliverables

1. `docs/adr/0009-structured-domain-grounding-vs-rag.md`
2. `docs/adr/0010-planetary-biomes-and-opposing-teleconnection-pairs.md`
3. `apps/backend/app/schemas/regions.py`
4. `apps/backend/app/repositories/region_repository.py`
5. `apps/backend/app/data/teleconnections.json`
6. `apps/backend/app/services/knowledge_service.py`
7. `apps/backend/app/services/ai_service.py`
8. `apps/backend/app/api/deps.py`
9. `apps/backend/tests/unit/test_knowledge_service.py`
10. `apps/desktop/src/components/globe/globeData.ts`
11. `apps/desktop/src/components/globe/RegionGlobe.tsx`
12. `documentation/done/hu-29/hu-29-planetary-biomes-and-grounded-copilot.md`

---

## 5. Justified Pending Items

- **Live End-to-End Packaged Smoke Test:** Packaged Electron executable distribution smoke testing across multi-monitor setups is scheduled for the final release candidate sprint (HU-15).
