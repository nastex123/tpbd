# Completion Report: HU-16 Scientific Explanation in Desktop

## Outcome

The selected, evaluable trend now requests the existing `POST /api/v1/ai/explain-trend` endpoint. The result displays an executive summary, possible physical context, uncertainty, recommended next steps, and whether it came from Gemini or the backend's deterministic fallback. If the local service is unavailable, the desktop builds a deterministic summary from the returned trend statistics and caveat.

## Provenance and scientific limits

An expandable provenance section identifies the data provider (with a NASA POWER source link when applicable), variable, unit, period, representative grid cell, spatial resolution, trend method, and valid observation count. The interface labels mechanisms as possible context and states that they do not establish causation. No explanation is requested for non-evaluable trends.

## Verification

- `npm run build`
- `npm run test:globe` — 12 tests passed.

The explanation API, Gemini configuration, and backend deterministic fallback are unchanged; the desktop consumes their existing contract and provides its own fallback if the local API cannot be reached.
