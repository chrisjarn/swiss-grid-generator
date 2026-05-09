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
- Keep export output paths on the shared project export runner and `ExportEngine`; UI entry points should pass project snapshots, ranges, metadata, visibility, and shared vector bleed settings rather than rebuilding exporter-specific page data.
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
- Added `webapp/lib/project-export-runner.ts` so both browser export and `npm run export` enter export with the same project snapshot, page range, metadata, visibility state, shared vector bleed config, and layout engine.
- Added `webapp/lib/planned-page-export-source.ts` to make planned pages explicit and prevent PDF/SVG/IDML from rebuilding page layout independently.
- Added `webapp/lib/export-box.ts` as the shared trim/bleed/media/crop geometry model. PDF, SVG, and IDML now consume the same `ExportBox` instead of duplicating bleed conversion, crop-mark offsets, media-canvas math, and guide clipping per format.
- Added `webapp/lib/vector-text-outline.ts` so PDF, SVG, and IDML share glyph-outline conversion.
- IDML now serializes crop marks and guide lines as stroked `GraphicLine` items instead of thin filled rectangle approximations; rectangle guide outlines remain rectangle page items.
- Added export-engine page sets as the shared artifact boundary for long exports. IDML renders deterministic spread XML page sets in workers, SVG renders page-set files in workers, and browser archive/package assembly is worker-backed where the format allows it. SVG and IDML now share the same worker scheduler for dispatch, cancellation, progress, ordered result collection, and single-worker packaging handoff.
- IDML package compression uses the fast deflate level to reduce packaging time without changing XML geometry or rendering semantics.
- Added CLI export:
  ```bash
  cd webapp
  npm run export -- --layout tests/fixtures/performance-1000-pages-placeholder.json --range 1,5-10 --format pdf,svg,idml --bleed-mm 3 --out ../tmp/export-debug
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
  - `idml render page sets`
  - `idml package`
- Browser export progress now reports the same high-level phases as the CLI through compact popup button text and a thin progress rail. UI progress publishing is fire-and-forget so React status updates do not throttle export work.
- Added a real export parity fixture that runs PDF, SVG, and IDML from one project export call and verifies shared export-box coordinates, crop marks, page identity, metadata, and one-time planning timing against emitted output.
- Centralized browser vector export actions so PDF, SVG, and IDML share filename/base-name normalization, SVG ZIP packaging selection, progress forcing, and download handoff before entering the shared project export runner.
- Added bounded page-set artifact caches for SVG and IDML. Cache hits require an exact serialized request match; entries are LRU-capped, and IDML artifacts are cloned on store/read so worker transfer cannot detach cached buffers. This prepares warm repeated exports without changing planner math or emitted geometry.
- PDF no longer depends on live text positioning for normal typography; it renders the same shared outline geometry as SVG and IDML, while the narrow fallback font path uses verified local font assets only.
- Added `npm run fonts:verify` and wired it into `assets:generate`, so build/dev/lint fail if configured local font assets are missing.
- Added document-used font warmup in `webapp/lib/export-font-warmup.ts`. The app warms only required metric and fallback/export font faces after project changes and when the export dialog opens, keyed by a font-face signature.

### Measured Improvements

On the 1000-page performance fixture via CLI PDF export:

- Before the shared export/font cleanup: total about `2.60s`
- After local-only used-face registration and warmup support: total about `2.01s`
- `pdf font register`: about `0.88s` down to about `0.38-0.42s`

Browser measurements varied by engine:

- Firefox reached about `5s` for the 1000-page PDF export after the shared path and handoff optimizations.
- Safari stayed higher, around `18-19s`, indicating remaining browser/jsPDF/Blob serialization cost rather than layout math.

On the 1000-page performance fixture via CLI IDML export:

- Browser/CLI page-set generation now uses the same deterministic page-set boundary.
- CLI 1000-page IDML export measured about `30.62s`: `0.35s` font preload, `0.38s` planning, `17.85s` IDML page-set rendering, `11.83s` IDML package assembly, and `0.18s` write time.
- A 100-page IDML compression check measured level `1` at `3.06s` / `12.26MB` and level `6` at `3.96s` / `11.48MB`; the production default therefore stays at the fast level because geometry/rendering is identical and large-document export latency is the limiting factor.

Follow-up IDML export optimization kept the `PageExportPlan` contract and focused on XML/render/package cost:

- Shared outline resolution now batches font promise resolution once per text plan instead of awaiting font lookup per emitted glyph fragment. SVG and IDML consume the same resolved outline sequence, so this does not split format behavior.
- IDML text geometry now groups consecutive same-fill outline paths into bounded compound `Polygon` items. Geometry paths, coordinates, transforms, layers, bleed, crop marks, and document metadata remain driven by the same planned page data.
- IDML path XML uses a specialized deterministic serializer for `PathGeometry` / `PathPointType` instead of the generic XML element helper inside the hottest loop.
- IDML page-set artifacts and package assembly now report XML generation, UTF-8 encoding, resource XML, ZIP compression, and raw component sizes. This exposes the dominant raw spread payload and keeps file writing as a separate CLI timing.

Fresh single-format CLI IDML measurements on May 6, 2026, with `--bleed-mm 3`:

```text
500 pages before:
  planning                 0.50s
  idml render page sets   23.81s
  idml package            16.46s
  idml write               0.38s size=176.53MB
  total                   41.45s

500 pages after:
  planning                 0.47s
  idml render page sets   11.68s
  idml page xml           11.09s raw=1141.83MB
  idml page encode         0.25s
  idml package            16.17s
  idml package zip        16.11s raw=1142.94MB
  idml write               0.59s size=174.62MB
  total                   29.19s

1000 pages before:
  planning                 0.88s
  idml render page sets   45.10s
  idml package            33.43s
  idml write               0.58s size=353.76MB
  total                   80.25s

1000 pages after:
  planning                 0.88s
  idml render page sets   23.73s
  idml page xml           22.84s raw=2285.38MB
  idml page encode         0.46s
  idml package            32.11s
  idml package zip        32.02s raw=2286.57MB
  idml write               0.26s size=349.94MB
  total                   57.30s
```

Remaining IDML bottleneck: ZIP compression still has to deflate about `2.29GB` of raw spread XML for the 1000-page fixture. Resource XML is only about `1.19MB`, so further large wins need either precompressed page-set artifacts, a faster ZIP backend, or a safe reduction in `PathPointType` payload size.

Final confirmation run on May 6, 2026, after the IDML optimization commit:

```text
500 pages:
  planning                 0.48s
  idml render page sets   12.23s
  idml page xml           11.50s raw=1141.83MB
  idml page encode         0.34s
  idml package            16.16s
  idml package resources   0.06s raw=1.10MB
  idml package zip        16.10s raw=1142.94MB
  idml write               0.34s size=174.62MB
  total                   29.53s

1000 pages:
  planning                 1.00s
  idml render page sets   25.12s
  idml page xml           23.57s raw=2285.38MB
  idml page encode         0.92s
  idml package            32.89s
  idml package resources   0.08s raw=1.19MB
  idml package zip        32.81s raw=2286.57MB
  idml write               0.71s size=349.94MB
  total                   59.99s
```

Full 1000-page CLI run exporting PDF, SVG files, and IDML together after the shared export-path centralization:

```text
[+ 161.8s] performance summary:
[+ 161.8s]   resolve export sources    0.02s pages=1000
[+ 161.8s]   font metrics preload      0.26s
[+ 161.8s]   planning                  0.88s pages=1000
[+ 161.8s]   pdf init                  0.00s
[+ 161.8s]   pdf font register         0.34s faces=60
[+ 161.8s]   pdf output intent         0.00s srgb
[+ 161.8s]   pdf setup                 0.35s faces=60
[+ 161.8s]   pdf render pages          0.68s pages=1000
[+ 161.8s]   pdf finalize              0.69s
[+ 161.8s]   svg render pages         13.91s pages=1000
[+ 161.8s]   svg zip                   0.00s not used
[+ 161.8s]   idml render page sets    52.74s sets=40
[+ 161.8s]   idml package             83.04s pages=1000
[+ 161.8s]   idml finalize             0.00s
[+ 161.8s]   pdf write                 0.03s size=2.81MB
[+ 161.8s]   svg write files           7.74s files=1000
[+ 161.8s]   idml write                1.41s size=353.76MB
[+ 161.8s]   total                   161.76s
```

May 7 follow-up kept browser packaging on fflate and added a Node-only IDML ZIP writer for CLI exports. The ZIP entry set, XML bytes, page ordering, and compression level boundary stay the same; the CLI path uses Node's native `zlib.deflateRawSync` for compressed entries when available, while browser export falls back to fflate.

Measured on the 1000-page performance fixture:

```text
IDML only, CLI, production compression:
  planning                 16.12s
  idml render page sets    31.73s
  idml page xml            29.09s raw=2611.70MB
  idml page encode          0.54s
  idml package             18.13s
  idml package zip         17.99s raw=2612.88MB
  idml write                1.00s size=455.80MB
  total                    67.28s

Full PDF, SVG files, and IDML CLI run:
  planning                 16.09s
  pdf render pages         23.16s
  pdf finalize              8.28s
  svg render pages         18.70s
  idml render page sets    41.63s
  idml package             22.04s
  idml package zip         21.88s raw=2612.88MB
  pdf write                 0.30s size=27.15MB
  svg write files           1.47s files=1000
  idml write                2.20s size=455.80MB
  total                   134.51s
```

Tradeoff: Node zlib level `1` is much faster than fflate level `1` on the CLI but produced a larger compressed IDML in this fixture (`455.80MB` versus roughly `399MB` in recent fflate runs). Browser output and browser compression behavior remain unchanged.

May 7 browser-first pass kept canonical layout math and export serialization precision unchanged, reduced live-preview adapter churn, and moved outline reuse to a bounded exact relative glyph-path cache instead of retaining full page outline geometry. An attempted unbounded page-level outline cache was rejected after it OOMed during the 1000-page PDF phase; full page/vector outline artifacts are too large to retain across an entire 1000-page multi-format run.

Measured after the bounded glyph-path cache and preview adapter change:

```text
Full PDF, SVG files, and IDML CLI run:
  planning                 16.06s
  pdf render pages         18.45s
  pdf finalize              7.30s
  svg render pages         23.08s
  idml render page sets    41.63s
  idml package             21.47s
  idml package zip         21.27s raw=2612.88MB
  pdf write                 0.33s size=27.15MB
  svg write files           4.06s files=1000
  idml write                2.01s size=455.80MB
  total                   135.06s
```

May 7 allocation pass kept the same canonical plan, glyph-outline cache, export precision, and native Node ZIP path, then replaced hot-path `map`/`flatMap`/spread assembly with direct loops in outline translation, SVG path/string generation, IDML guide/crop XML, font preload collection, and ZIP buffer assembly. This is intentionally mechanical: fewer temporary arrays and objects, no changed layout inputs, no changed formatter, no changed export commands.

Measured after the allocation pass:

```text
Full PDF, SVG files, and IDML CLI run:
  planning                 16.64s
  pdf render pages         18.08s
  pdf finalize              7.63s
  svg render pages         16.43s
  idml render page sets    37.85s
  idml page xml            31.67s raw=2611.70MB
  idml page encode          1.56s
  idml package             21.74s
  idml package zip         21.52s engine=node-zlib raw=2612.88MB
  pdf write                 0.36s size=27.15MB
  svg write files           2.93s files=1000
  idml write                1.84s size=455.80MB
  total                   124.22s
```

## 2026-05-09 Planner Cache And Fixture Split

This pass kept `PageExportPlan` as the canonical planning artifact and did not move preview to SVG, WebGPU, WASM, or an export-only renderer. The goal was to remove duplicated deterministic planner work while preserving preview/PDF/SVG/IDML parity.

### Kept Changes

- Added bounded planner-side caches for document-variable resolution and lorem fitting. The cache stores resolved variable text and text runs, not returned `PageExportPlan` objects.
- Moved repeated lorem candidate line-count lookups into a shared deterministic LRU cache, so repeated placeholder fitting can reuse exact line-count results without retaining full page geometry.
- Reused one deterministic `TextMetricsService` across export planning for all pages in a run.
- Hardened removed-font handling. Legacy `Libre Franklin` references imported from old saved layouts resolve to `Inter` during project parsing and in planner/export font resolution, avoiding deterministic font-file metric failures without reintroducing the removed font.
- Split the 1000-page performance fixture:
  - `performance-1000-pages-placeholder.json` keeps `<%lorem%>` blocks and measures document-variable fitting.
  - `performance-1000-pages-static-text.json` replaces lorem tokens with static text and isolates ordinary wrapping/glyph planning/export cost. It is generated on demand by `npm run fixtures:performance` and intentionally ignored by git.
- Updated `npm run benchmark:layout` to preload deterministic metric faces, use a shared text metrics service, and report silent phase totals for planner substeps.

### Measured Results

On the stress-page planner benchmark, the 1000-page run improved from the earlier `21351.23ms` user-reported baseline to about `4808.80ms`:

```text
pages=1000 buildPageExportPlan=4808.80ms avg=4.81ms textPlans=17000 imagePlans=6000
```

The placeholder export fixture still spends about `14.4s` planning 1000 pages when many lorem frames have distinct geometry. That is expected: exact lorem fitting remains real layout work, and this pass only removes repeated deterministic work where keys match. Use the static-text fixture when comparing renderer/export cost without document-variable fitting.

### Boundaries

- Returned `PageExportPlan` objects are still built per page and are not cached.
- Browser text metrics remain diagnostic only.
- SVG export output is still a consumer of the canonical plan, not the live preview implementation.
- IDML XML generation and ZIP compression remain separate bottlenecks for all-format exports.

### Current Boundaries

- PDF export runs in a cancellable browser worker so `Esc`/Cancel can terminate the active export even when final PDF byte serialization is busy. SVG page-set rendering, SVG ZIP packaging, IDML page-set XML generation, and IDML package assembly can also run worker-backed in the browser; final artifact order remains deterministic.
- Shared bleed is centralized as `ExportBox` for PDF, SVG, and IDML. The GUI default is off and restores `3mm` as the standard activation width; enabled bleed extends visible production geometry through the bleed area and creates the same white crop-mark canvas and black trim crop marks around every vector format without exporting a dashed bleed guide. `webapp/tests/export-box-contract.test.mjs` locks the shared numeric box, crop-mark, and guide-clipping contract.
- Cross-format outline precision is locked by `webapp/tests/export-geometry-parity.test.mjs`, which parses PDF content streams, SVG path data, and IDML `PathPointType` geometry from the same exported specimen and compares them against the planned glyph outline coordinates.
- Live preview consumes `PageExportPlan` through the canvas adapter, draws from ordered layer render plans, and avoids export-only outline resolution on the interaction path.
- Export hot paths avoid high-volume temporary collection chains where a direct ordered loop preserves the same serialization and geometry.

### Validation

The kept checkpoints from this pass were validated with:

- `npm run fonts:verify`
- `npm run test:export-box`
- `npm run test:export-geometry`
- `npm run test:pdf`
- `npm run test:svg`
- `npm run test:idml`
- `npm run test:canvas-renderer`
- `npm run lint`
- `npx tsc --noEmit`

## 2026-05-09 Architecture Refactor Checkpoint

This pass did not change planner math, export geometry, text metrics, or benchmark numbers. It made the repository boundary and first frontend split explicit while preserving the existing runtime path.

### Kept Changes

- Removed stale root package entry points and obsolete public/layout artifacts; `webapp/` is the active frontend boundary.
- Kept screenshots and documentation assets.
- Moved shared UI primitives to `webapp/shared/ui/` and left compatibility re-export shims in `webapp/components/ui/` so existing imports keep working during the next cleanup pass.
- Added pure type staging under `webapp/core/types/` for `PageExportPlan`, document state, grid config, and workspace state.
- Added minimal GUI foundations under `webapp/gui/`: shell layout, plan-only Swiss canvas, one representative grid panel, and separate document/workspace Zustand stores.
- Moved the former large Next page orchestrator to `webapp/gui/legacy/LegacyWorkspace.tsx`; `webapp/app/page.tsx` is now a thin Next.js boundary.

### Boundaries

- `webapp/gui/preview/SwissCanvas.tsx` consumes `PageExportPlan` only and does not compute layout.
- The current production workspace still routes through `webapp/gui/legacy/LegacyWorkspace.tsx` and legacy `webapp/components/grid-preview.tsx` until the next decomposition pass.
- `webapp/core/` must stay React-free.
- The two new store files are staging boundaries; the legacy workspace has not yet been rewired to them.

### Validation

- `npm run lint`
- `npx tsc --noEmit`
- `node --test tests/sidebar-page-panel-contract.test.mjs`
- `node --test tests/svg-export-contract.test.mjs`
