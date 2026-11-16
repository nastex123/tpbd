# HU-17 Temporal Comparison

- Epic: Desktop visualization
- HU ID: HU-17
- Owner: Brandon
- Branch: `feature/hu-17-temporal-comparison`
- Pull request: [#29](https://github.com/nastex123/tpbd/pull/29)
- Status: Merged

## User story and acceptance criteria

As an investigator, I want to compare two time ranges for the same location and variable, with explicit period and coverage rules.

- [x] Two distinct ranges are validated against the selected variable's available years.
- [x] Both ranges use the same selected location and variable.
- [x] Each range shows valid monthly coverage, source, units, spatial resolution, and its own trend result and statistical caveats.
- [x] Overlapping ranges and different period lengths are disclosed.
- [x] A shared comparison is blocked when the periods have insufficient coverage, duplicate or out-of-range dates, incompatible metadata, or different grid cells/coordinates.
- [x] The UI does not describe slope differences as statistically significant or causal. Each trend retains its backend method, p-value, interval, and caveat.

## Technical implementation

`TemporalComparison.tsx` requests each range through the existing location report hook and trend endpoint flow. `temporalPeriod.ts` validates period bounds, checks monthly coverage, and compares series metadata. The 80% minimum is an explicit user-interface rule for permitting a joint description; it is not presented as a universal scientific standard. No observations are generated or imputed.

## Automated verification

- `node --experimental-strip-types --test src/components/globe/trendLine.test.ts src/components/globe/seriesComparison.test.ts src/components/globe/temporalPeriod.test.ts` — passed, 8 tests.
- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- `node node_modules/vite/bin/vite.js build` — passed. Vite reports the existing large-bundle advisory.

## Deliverables

- A two-period comparison panel integrated into the selected-location workflow.
- Period validation and metadata/coverage checks with unit tests.
- No changes to the API contract or backend.

## Pending verification

- Manual review in the Electron window and a live two-period API run remain pending. The Node.js and desktop build tools were available, but the Python environment used in earlier backend verification is absent in this session.
- Backend trend behavior remains owned by the backend implementation; this change consumes its existing response.
