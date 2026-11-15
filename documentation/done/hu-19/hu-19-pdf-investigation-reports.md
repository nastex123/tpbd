# HU-19 PDF Investigation Reports

- Epic: Post-MVP reporting
- HU ID: HU-19
- Owner: Brandon
- Branch: `feature/hu-19-pdf-reports`
- Pull request: See associated pull request
- Status: Ready for review

## User story and acceptance criteria

Users can export a traceable PDF containing the selected investigation's series, method, results, sources, and limitations.

- [x] The report can be printed or saved as PDF from the desktop flow.
- [x] Each selected location includes the monthly series and per-point quality flags.
- [x] Source, unit, frequency, resolution, requested coordinates, grid cell, and returned period are included when available.
- [x] Trend direction, method, rate and unit, p-value, alpha, confidence interval, verdict, and scientific caveat are included when returned.
- [x] Paired report limitations identify incompatible series and explain that no significance test of slope differences or causal inference is made.
- [x] The report cites the NASA POWER Monthly Point API and explains missing values, grid-cell interpretation, and observational limits.

## Technical implementation

The report is rendered from the current validated series and backend trend responses. A print-only document and print stylesheet keep the desktop UI out of the output; the native print dialog can save the report as PDF. This uses the browser/Electron print path and adds no PDF dependency. Missing values print as “Missing,” never as zero. Each location retains its own trend result.

## Automated verification

Executed from `apps/desktop`:

- `node --experimental-strip-types --test src/components/globe/trendLine.test.ts src/components/globe/seriesComparison.test.ts src/components/globe/temporalPeriod.test.ts src/components/globe/historyTimeline.test.ts src/components/globe/investigationReportData.test.ts` — 12 passed.
- `node --test electron/local-api.test.mjs` — 3 passed.
- `node --experimental-strip-types --test src/stores/investigations.test.ts` — 4 passed.
- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- `node node_modules/vite/bin/vite.js build` — passed; Vite reports its existing large-bundle advisory.

## Deliverables

- A “Print or save report as PDF” action, enabled when a historical series is available.
- A print-ready report with one or two location series, scientific results, provenance, citations, and limitations.
- Tests ensuring report rows sort chronologically and preserve zero versus missing values.

## Pending verification

- A saved PDF's final page layout and the Electron native print dialog have not been visually verified in this session. The report content compiles, and value handling is covered by unit tests.
