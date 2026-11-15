# ADR 0009: Structured Domain Grounding vs. Heavy Vector RAG for AI Copilot

## Status
**Accepted**

## Date
2026-11-14

## Context
The AI Copilot (`apps/backend/app/services/ai_service.py`) provides natural language investigation assistance (`/api/v1/ai/investigate`), deep scientific trend explanations (`/api/v1/ai/explain-trend`), and Mission Control audio debriefs (`/api/v1/ai/audio-brief`).

As we optimize response precision, we evaluate two architectural approaches for domain knowledge retrieval:
1. **Full Vector RAG:** Integrating a vector database (e.g. ChromaDB, FAISS, Qdrant) with neural embedding models (e.g. `sentence-transformers`, `all-MiniLM-L6-v2`) and chunk-based semantic retrieval.
2. **Structured Domain Grounding (Hybrid RAG):** Using an in-memory, deterministic Earth science knowledge base coupled with direct mathematical injection of backend-computed metrics ($Z$-scores, Sen's slope, $p$-values, Pettitt structural breaks) and low-temperature Gemini prompt constraints.

The solution must operate within the constraints of a standalone desktop sidecar application distributed to students, researchers, and hackathon evaluators.

---

## Decision

We reject heavy external Vector Database RAG and adopt **Structured Domain Grounding with an In-Memory Earth Science Knowledge Base**.

### Technical Architecture:
1. **Mathematical Truth Boundary:** The LLM is never tasked with computing or approximating statistics. The backend calculates exact non-parametric metrics (Seasonal Mann-Kendall, Sen's slope per decade, 95% confidence intervals, Pettitt structural break date, lag-1 autocorrelation). These exact numbers are injected into the prompt payload.
2. **In-Memory Knowledge Index (`knowledge_service.py`):** A lightweight, zero-dependency JSON knowledge base (`data/knowledge/teleconnections.json`) catalogs peer-reviewed physical planetary mechanisms:
   - Hadley cell tropical overturning & subtropical widening.
   - El Niño–Southern Oscillation (ENSO) Walker circulation displacement.
   - Arctic polar amplification and sea-ice albedo feedbacks.
   - Regional land-atmosphere feedbacks and hydrological cycle lengthening.
3. **Deterministic Context Injection:** When a trend or regional comparison is analyzed, the service automatically resolves the relevant biophysical mechanism and provides it to Gemini 3.8 as an authoritative grounding context.
4. **Strict Generation Parameters:** Temperature is locked to $0.15$ with top-p $0.90$. Prompts strictly forbid fabricating causal claims without observational backing and require explicit uncertainty disclosures.

---

## Alternatives Considered & Reasons for Rejection

- **Heavy Vector Database RAG (ChromaDB / LangChain / SentenceTransformers):**
  - *Rejected:* Requires bundling `torch`, `transformers`, `onnxruntime`, or C++ compilation dependencies. This inflates the Tauri desktop sidecar binary by over 1.5 GB, causing unacceptable startup delays and cross-platform distribution issues on Windows/macOS.
  - *Chunking Noise:* Generic semantic chunking often splits numerical tables and scientific caveats across chunk boundaries, leading to degraded precision on exact figures like $p$-values or decadal slopes.
- **Unconstrained Zero-Shot LLM:**
  - *Rejected:* Raw prompts without structured statistical injection risk hallucinating non-existent physical drivers, inventing dates, or asserting unproven causal links.

---

## Consequences

### Positive
- **Zero Binary Bloat:** Pure Python standard library implementation with zero additional packages added to `pyproject.toml`.
- **Ultra-Fast Execution:** Sub-millisecond context retrieval from the in-memory knowledge index; generation latency is bounded only by Gemini API response time.
- **100% Mathematical Fidelity:** Numerical figures in explanations (rates, dates, probabilities) strictly mirror the underlying statistical test output.
- **Publication-Grade Reliability:** Scientific caveats and limitations are consistently enforced.

### Negative / Trade-offs
- The knowledge base must be curated and maintained explicitly in the repository rather than crawling external web corpora dynamically.
