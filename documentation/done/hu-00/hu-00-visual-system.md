# HU-00 Data Detective Visual System

- Epic: Desktop experience
- Owner: Brandon
- Branch: feature/hu-00-visual-system
- Pull request: See associated pull request
- Status: Review

## Story and acceptance criteria

The interface gives researchers a readable view of locations, variables, series, and results.

- CA-01: The existing responsive workspace keeps the region panel and globe separate. Manual review at the demo resolution remains necessary.
- CA-02: The map value legend displays its unit and selected regions and values have text labels.
- CA-03: The results guide explains significant, non-significant, and non-evaluable results. Actual verdicts come from the backend.
- CA-04: Buttons, inputs, links, and other controls receive a visible keyboard focus outline.

## Implementation

The desktop uses a consistent dark palette, readable typography, shared control styles, and a visible alert treatment. The existing scrollable panel and responsive globe layout remain in place.

## Verification

`npm.cmd ci` and `npm.cmd run build` completed successfully on Windows. Vite reported a large bundle warning.

## Deliverables and pending work

The visual treatment, result explanations, unit legend, and keyboard focus styles are included. Manual review in Electron at the presentation and narrow window sizes remains pending. HU-09 owns further scientific chart and trend detail.
