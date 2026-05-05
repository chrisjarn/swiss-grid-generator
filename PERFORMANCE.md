# Performance Measurement

Swiss Grid Generator 2.0 keeps layout planning deterministic: `PageExportPlan` is the canonical source of truth, and canvas/PDF/SVG/IDML only consume that plan. Performance work must preserve that contract.

## Live Profiling

Enable dev-only timing logs with:

```bash
NEXT_PUBLIC_LAYOUT_PROFILING=1 npm run dev
```

The profiler records diagnostic timings for:

- `buildPageExportPlan`
- canvas render-plan conversion
- canvas layer-stack drawing
- PDF render pass
- SVG render pass
- IDML render pass

Profiling is disabled unless `NEXT_PUBLIC_LAYOUT_PROFILING` is set to `1` or `true`.

## Layout Benchmark

Run the deterministic layout stress benchmark from `webapp/`:

```bash
npm run benchmark:layout
```

The benchmark builds canonical page export plans for 10, 100, 500, and 1000 stress pages with dense typography and image placeholders. It reports total planning time, average planning time per page, plan counts, and Node heap usage.

These numbers are diagnostic, not a hard pass/fail gate. The contract gate is:

```bash
npm run test:page-export-plan
```

That test snapshots a normalized canonical stress plan hash so performance changes cannot silently alter grid geometry, line breaks, placeholder rectangles, layer order, or export plan structure.

## Safe Optimization Rules

- Optimize around the canonical plan, not around canvas.
- Keep planner inputs and returned `PageExportPlan` semantics stable.
- Keep export output paths on the shared project export runner and `ExportEngine`; UI entry points should pass project snapshots, ranges, metadata, visibility, and print settings rather than rebuilding exporter-specific page data.
- Cache only pure deterministic calculations with explicit keys.
- Do not cache or reuse returned plan objects across calls unless mutation safety is proven.
- Run `npm run test:page-export-plan`, `npm run lint`, `npx tsc --noEmit`, and `npm run benchmark:layout` after planner changes.

## 2026-05-03 Optimization Summary

Today's work stayed within the planner-first contract and focused on the preview warm path plus the cold wrap-heavy typography path.

### Kept Changes

- Reused resolved text format/tracking intervals during glyph planning in `webapp/lib/text-format-runs.ts` and `webapp/lib/page-export-plan.ts`.
- Added an exact boundary-correction width fast path in `webapp/lib/font-file-text-metrics-engine.ts` so punctuation-boundary probes do not always fall back to the heavier width path.
- Added wrap-phase profiling in `webapp/lib/text-layout.ts` for:
  - `wrapTextDetailed`
  - `wrapTextDetailed.tokenize`
  - `wrapTextDetailed.measureTokens`
  - `wrapTextDetailed.hyphenation`
  - `wrapTextDetailed.punctuationRebalance`
  - `wrapTextDetailed.oversizeWhitespace`
- Kept lightweight hyphenation caching:
  - syllable cache in `webapp/lib/english-hyphenation.ts`
  - shared plain-wrap hyphenation result caches in `webapp/lib/text-layout.ts` keyed through `webapp/lib/text-metrics-service.ts`

### Measured Improvements

- Warm `buildPageExportPlan`: from about `39-42ms` to about `33-35ms`
- Warm `buildPageExportPlan.positionedGlyphs`: from about `35-36ms` to about `28-31ms`
- Warm `buildPageExportPlan.glyphSegments`: from about `35-36ms` to about `28-31ms`
- Warm `buildPageExportPlan.resolveFontTrackingGraphemes`: from about `9-15ms` to about `2-6ms`
- `canvas.buildRenderPlansFromPageExportPlan`: stayed about `2-3ms`
- `canvas.drawLayerStack`: stayed about `10-12ms`

- Cold `fontFile.wrapText`: from about `114-117ms` to about `87-100ms`
- Cold `fontFile.wrapText.measureFormattedRangeWidth`: from about `89-92ms` to about `53-64ms`
- Repeated identical hyphenated wraps: about `11.78ms` down to about `4.48ms` over `500` identical wraps in the targeted cache microbench

### What Profiling Revealed

After the font-width improvements landed, the remaining cold bottleneck was no longer tokenization or fit testing. The added `wrapTextDetailed.*` profiling showed:

- `wrapTextDetailed.hyphenation`: about `65-79ms`
- `wrapTextDetailed.measureTokens`: about `6-16ms`
- `wrapTextDetailed.tokenize`: about `1ms`
- `wrapTextDetailed.punctuationRebalance`: about `0ms`

That means cold-wrap cost is still dominated by hyphenation control flow, not by planner geometry or canvas rendering.

### Cold First-Pass Status

The very first cold top-level typography pass improved less than the submetrics suggested and remained noisy:

- Cold `buildPageExportPlan.wrapText` often remained around `269-303ms`
- Cold first `buildPageExportPlan` total often remained around `333-372ms`

The cold width engine got faster, but the full first-pass cost is still largely driven by wrap/hyphenation behavior.

### Rejected Regression

A search-based rewrite of the English hyphenator was tested and reverted. It regressed:

- `wrapTextDetailed.hyphenation` to about `111-113ms`
- `fontFile.wrapText` to about `129-131ms`
- cold `buildPageExportPlan.wrapText` to about `322ms`
- cold first `buildPageExportPlan` total to about `394ms`

That experiment is not part of the kept state.

### Validation

The kept checkpoints were validated with:

- `npm run lint`
- `npx tsc --noEmit`

Relevant commits from this pass:

- `526127a` `Optimize hyphenated wrap width measurement`
- `a9012f8` `Reuse text format intervals in glyph planning`
- `91cf59f` `Optimize wrap profiling and boundary correction`

## 2026-05-04 Optimization Summary

Today's work stayed outside layout math and removed repeated preview/editor bookkeeping.

### Kept Changes

- Replaced full-snapshot `JSON.stringify(...)` change detection with a cheap revision key in the preview emission path.
- Collapsed snapshot resolution and normalization builders into single-pass loops in `webapp/lib/preview-layout-snapshot.ts`.
- Gated full-document `projectInfoStats` and `totalLayerCount` work behind the actual `showProjectInfo` state.
- Cached `activeParagraphCount` instead of rescanning `blockOrder` on paragraph-limit checks.
- Reused planner maps more directly and reduced render-plan allocation churn in `webapp/hooks/useTypographyRenderer.ts`.
- Collapsed text-override and image-snapshot builders into single passes in:
  - `webapp/hooks/usePreviewTextBlockOverrides.ts`
  - `webapp/hooks/useImagePlaceholderState.ts`
- Made preview history revision-aware in `webapp/hooks/usePreviewHistory.ts` so unchanged revisions do not rebuild and re-record identical snapshots.
- Removed readonly-array `Array.from(...)` copies from interactive geometry helpers and keyboard nudge paths.
- Added input-sensitive normalized tracking/format-run caches in `webapp/hooks/usePreviewTextBlockState.ts`.
- Removed duplicate text-run normalization on editor-open and duplicate-layer snapshot paths in:
  - `webapp/lib/preview-block-editor-state.ts`
  - `webapp/lib/preview-text-layer-state.ts`
- Replaced phased page-load hydration with one atomic preview snapshot apply in `webapp/hooks/usePreviewDocumentLifecycle.ts`.
- Gated preview reveal on the first committed final plan for the loaded page in `webapp/components/grid-preview.tsx`, so fast paging never shows provisional geometry during hydration.

### What This Improves

- Large multi-page documents spend less time on project-shell bookkeeping while the visible page stays the same.
- Undo/history boundaries avoid rebuilding full preview snapshots when the logical document revision has not changed.
- Keyboard nudging and image/text placement helpers stop allocating throwaway arrays around row/column axis lookups.
- Opening, re-targeting, duplicating, and reusing large text paragraphs avoids some repeated tracking/format-run normalization work.
- Page changes stop exposing intermediate image/layer state while the new page snapshot is still settling.

### Validation

The kept checkpoints from this pass were validated with:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:snapshot`
- `npm run test:preview-interactions`
- `npm run test:editor-interactions`

## 2026-05-05 Export Pipeline Summary

Today's work kept the `PageExportPlan` contract and moved PDF/SVG/IDML export onto one shared project export path.

### Kept Changes

- Added `webapp/lib/export-engine.ts` as the shared PDF/SVG/IDML engine. It consumes already resolved project page sources, builds one `PageExportPlan` per page, and then dispatches format-specific vector renderers.
- Added `webapp/lib/project-export-runner.ts` so both browser export and `npm run export` enter export with the same project snapshot, page range, metadata, visibility state, print config, and layout engine.
- Added `webapp/lib/planned-page-export-source.ts` to make planned pages explicit and prevent PDF/SVG/IDML from rebuilding page layout independently.
- Added `webapp/lib/vector-text-outline.ts` so SVG and IDML share glyph-outline conversion.
- Added CLI export:
  ```bash
  cd webapp
  npm run export -- --layout tests/fixtures/performance-1000-pages.json --range 1,5-10 --format pdf,svg,idml --out ../tmp/export-debug
  ```
- Added phase timing for:
  - `resolve export sources`
  - `font metrics preload`
  - `planning`
  - `pdf init`
  - `pdf font register`
  - `pdf output intent`
  - `pdf render pages`
  - `pdf finalize`
  - `svg render pages`
  - `svg zip`
  - `idml package`
- Browser export progress now reports the same high-level phases as the CLI and includes elapsed time. UI progress publishing is fire-and-forget so React status updates do not throttle export work.
- PDF font registration now uses verified local font assets only. Runtime Google Fonts repository discovery was removed from export.
- Added `npm run fonts:verify` and wired it into `assets:generate`, so build/dev/lint fail if configured local font assets are missing.
- Added document-used font warmup in `webapp/lib/export-font-warmup.ts`. The app warms only required metric/PDF font faces after project changes and when the export dialog opens, keyed by a font-face signature.

### Measured Improvements

On the 1000-page performance fixture via CLI PDF export:

- Before the shared export/font cleanup: total about `2.60s`
- After local-only used-face registration and warmup support: total about `2.01s`
- `pdf font register`: about `0.88s` down to about `0.38-0.42s`

Browser measurements varied by engine:

- Firefox reached about `5s` for the 1000-page PDF export after the shared path and handoff optimizations.
- Safari stayed higher, around `18-19s`, indicating remaining browser/jsPDF/Blob serialization cost rather than layout math.

### Current Boundaries

- PDF remains main-thread browser work for now; no browser-specific worker path is introduced.
- Bleed/print framing is still PDF-only. A future shared `ExportPrintFrame` should make bleed, crop marks, and media/trim geometry available consistently to PDF, SVG, and IDML.

### Validation

The kept checkpoints from this pass were validated with:

- `npm run fonts:verify`
- `npm run test:pdf`
- `npm run test:svg`
- `npm run test:idml`
- `npm run lint`
- `npx tsc --noEmit`
