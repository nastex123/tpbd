# ADR 0007: Gemini AI Synthetic Intelligence Engine and Smart Model Router (HU-27)

## Status
Accepted

## Context
The NASA Space Apps Challenge 2026 problem statement explicitly emphasizes:
*"The multitude of Earth science data variables makes it difficult to select variables that could indicate change, and to then perform an analysis on the selected variables... Users could potentially respond to a short series of questions about what or where they would like to investigate... While not required, SI [Synthetic Intelligence] could be useful here to identify data with the potential to show trends in particular areas, drawing on either news articles and research papers or the characteristics of a region..."*

To assist students, analysts, and researchers in becoming effective "data detectives," TPBD requires an intelligent, natural-language copilot. However, relying on a single large language model leads to suboptimal trade-offs between latency, reasoning depth, and task specialization. Furthermore, dependency bloat or heavy local neural network frameworks would impair desktop performance and cross-platform installation on Windows.

## Decision
We implement a lightweight, asynchronous **Google Gemini AI Client and Smart Model Router** using native `httpx`:

1. **Lightweight Native HTTPX Adapter:**
   Rather than introducing heavy external dependencies, `GeminiClient` connects directly to the Google AI Studio REST endpoints (`https://generativelanguage.googleapis.com/v1beta/models/...`) via Python's standard `httpx.AsyncClient` with a 15-second timeout and structured error handling.

2. **Supported Model Roster & Capability Registry:**
   The backend maintains an explicit registry of available Gemini models:
   - **Text & Quick Search:** `gemini-3.8-flash` (default for query translation), `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`.
   - **Deep Scientific Reasoning:** `gemini-3.8-live-extended-thinking`, `gemini-3.1-pro-preview`.
   - **Speech Synthesis (TTS):** `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-3.1-flash-tts-preview`.
   - **Multimodal & Vision:** `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-nano-banana-2.1`.
   - **Realtime / Live:** `gemini-3.8-live`, `gemini-3.1-flash-live-preview`, `gemini-3.5-live-translate-preview`.
   - **Transcription & Audio-In:** `gemini-3.5-transcribe`, `gemini-omni-1.2-flash`.

3. **Dynamic Intent Routing (`"auto"` mode):**
   When `model="auto"` is passed, `AIService` inspects the task intent:
   - Natural language investigation queries $\to$ routes to `gemini-3.8-flash` for $< 800\text{ms}$ latency.
   - Deep statistical explanation $\to$ routes to `gemini-3.8-live-extended-thinking`.
   - Voice briefing $\to$ routes to `gemini-3.8-flash-tts`.
   Clients can also explicitly specify any model string from `GET /api/v1/ai/models` to override automatic routing.

4. **Deterministic Offline Fallback:**
   If `GEMINI_API_KEY` is not present in `.env` or network requests fail, the service invokes a rule-based semantic matcher against the curated catalog (`CURATED_VARIABLES`, `CURATED_REGIONS`), returning structured recommendations with `"is_fallback": true`. The backend never crashes in offline mode.

5. **Prompt Governance & Zero Hallucination:**
   Prompts strictly ground hypotheses in real NASA parameters (`T2M`, `PRECTOTCORR`, `RH2M`, `GWETROOT`, `EVPTRNS`) and enforce clear disclaimers that statistical correlation is not proof of physical causation.

## Consequences
### Positive:
- Instant natural language querying for students and non-expert users.
- Zero local GPU or heavy C++ pip requirements.
- Full offline resilience with seamless deterministic fallback.
- Clear separation between UI selection and backend AI synthesis.

### Trade-offs:
- Online live AI capabilities require a valid `GEMINI_API_KEY` in `.env`.
