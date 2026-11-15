# ADR 0006: Multimodal Scientific Synthesis and Mission Control Audio Debrief (HU-28)

## Status
Accepted

## Context
In data-intensive Earth science applications, visualizing numbers and tables alone often fails to convey the multidisciplinary physical mechanisms driving climate change (e.g. ITCZ displacement, Atlantic Multi-decadal Oscillation, land-atmosphere feedback). Furthermore, student and non-expert audiences benefit immensely from accessible, multimodal debriefs that synthesize findings into spoken audio—evoking a NASA Mission Control debrief.

However, generative AI systems frequently suffer from hallucinations, overstating confidence or confusing statistical correlation with physical causation. To provide a competition-winning experience for NASA Space Apps 2026, TPBD requires:
1. Grounded scientific narrative synthesis powered by deep-reasoning thinking models (`gemini-3.8-live-extended-thinking` / `gemini-3.1-pro-preview`).
2. High-fidelity spoken audio briefing generation (`gemini-3.8-flash-tts` / `gemini-3.1-flash-tts-preview`) returning Base64 audio payloads for direct desktop browser rendering.

## Decision
We implement a grounded multimodal synthesis and audio briefing service:

1. **Deep Thinking Scientific Synthesis (`POST /api/v1/ai/explain-trend`):**
   - Inputs are grounded strictly in computed mathematical artifacts: Seasonal Mann-Kendall direction ($S$, $p$-value), Sen's slope rate, 95% confidence intervals, WMO 1991–2020 Z-score anomalies, and Pettitt structural change points.
   - Routes automatically to extended thinking models (`gemini-3.8-live-extended-thinking`) with an explicit reasoning budget to connect observational findings to established planetary mechanisms (Hadley cell circulation, ENSO, albedo feedback).
   - Generates structured JSON output: `executive_summary`, `mechanisms_and_drivers`, `scientific_uncertainty`, and `recommended_next_steps`.

2. **Mission Control Voice Audio Debrief (`POST /api/v1/ai/audio-brief`):**
   - Connects to Gemini Flash TTS (`gemini-3.8-flash-tts` / `gemini-3.1-flash-tts-preview`) to synthesize natural spoken speech.
   - Encodes audio as Base64 strings in the JSON response, enabling immediate zero-configuration playback in desktop React components via standard HTML5 `<audio src="data:audio/wav;base64,...">`.

3. **Deterministic Fallbacks for Offline & Unauthenticated Scenarios:**
   - If `GEMINI_API_KEY` is not present, `explain-trend` generates a structured, peer-reviewed template summary matching the variable, region, and trend direction.
   - `audio-brief` returns a valid structured payload indicating `"is_fallback": true`, enabling frontend client-side speech synthesis (`window.speechSynthesis`) when upstream TTS is unavailable.

## Consequences
### Positive:
- Publication-quality scientific explanations with transparent uncertainty bounds.
- Immersive NASA Mission Control audio experience for demonstrations.
- Effortless desktop frontend integration using Base64 audio strings.
- Zero crashes in offline environments.

### Trade-offs:
- Upstream Google AI Studio TTS generation adds ~1.5s network latency when live.
