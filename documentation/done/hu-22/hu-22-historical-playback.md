# HU-22 Animated Historical Playback

- Epic: Post-MVP exploration
- HU ID: HU-22
- Owner: Brandon
- Branch: `feature/hu-22-historical-playback`
- Pull request: See associated pull request
- Status: Ready for review

## User story and acceptance criteria

Users can play through a historical series using playback controls without inventing missing observations.

- [x] The month slider uses dates returned by the selected series (or the union of dates for a comparable pair).
- [x] Playback advances through those available dates, wraps at the end, and can be paused.
- [x] Explicit null-valued months remain selectable and are reported as missing.
- [x] Months absent from the series are not added to the timeline, and missing intervals remain visible as gaps in the chart.

## Implementation

`historyTimeline.ts` extracts unique valid `YYYY-MM` dates from the returned points and advances playback only through those dates. `HistoryChart.tsx` places points by calendar month and breaks the line at null observations and omitted months, so a missing interval is neither assigned a value nor visually bridged. Playback stops if the available timeline has fewer than two dates.

## Automated verification

Executed from `apps/desktop`:

- `node --experimental-strip-types --test src/components/globe/trendLine.test.ts src/components/globe/seriesComparison.test.ts src/components/globe/temporalPeriod.test.ts src/components/globe/historyTimeline.test.ts` — 11 passed.
- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- `node node_modules/vite/bin/vite.js build` — passed; Vite reports its existing large-bundle advisory.

## Pending verification

- A post-change visual review in Electron with a source series containing an omitted month remains pending. The pure timeline and calendar-position behavior is covered by unit tests.
