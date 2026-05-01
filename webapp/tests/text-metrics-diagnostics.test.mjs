import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const FONT_FILE_ENGINE_PATH = path.join(ROOT, "lib", "font-file-text-metrics-engine.ts")
const PACKAGE_PATH = path.join(ROOT, "package.json")
const PAGE_EXPORT_PLAN_PATH = path.join(ROOT, "lib", "page-export-plan.ts")
const PRESET_SAMPLES_PATH = path.join(ROOT, "lib", "text-metrics-preset-samples.ts")
const SERVICE_PATH = path.join(ROOT, "lib", "text-metrics-service.ts")
const DIAGNOSTIC_BROWSER_ENGINE_PATH = path.join(ROOT, "lib", "diagnostic-browser-canvas-text-metrics-engine.ts")
const PARITY_PATH = path.join(ROOT, "lib", "text-metrics-parity.ts")
const PREVIEW_METRICS_HOOK_PATH = path.join(ROOT, "hooks", "usePreviewTypographyMetrics.ts")
const PDF_EXPORT_PATH = path.join(ROOT, "lib", "pdf-vector-export.ts")
const SVG_EXPORT_PATH = path.join(ROOT, "lib", "svg-vector-export.ts")
const IDML_EXPORT_PATH = path.join(ROOT, "lib", "idml-export.ts")
const CANVAS_PAGE_RENDERER_PATH = path.join(ROOT, "lib", "canvas-page-renderer.ts")
const SAFARI_CAPTURE_PAGE_PATH = path.join(ROOT, "app", "dev", "text-metrics", "page.tsx")
const THRESHOLDS_PATH = path.join(ROOT, "lib", "text-metrics-parity-thresholds.ts")
const BROWSER_DIAGNOSTICS_PATH = path.join(ROOT, "lib", "text-metrics-browser-diagnostics.ts")
const DEV_REPORT_PATH = path.join(ROOT, "lib", "text-metrics-dev-report.ts")
const BROWSER_PARITY_SCRIPT_PATH = path.join(ROOT, "scripts", "run-text-metrics-parity.mjs")
const TEXT_FORMAT_RUNS_PATH = path.join(ROOT, "lib", "text-format-runs.ts")
const TEXT_RENDERING_PATH = path.join(ROOT, "lib", "text-rendering.ts")
const TEXT_TRACKING_RUNS_PATH = path.join(ROOT, "lib", "text-tracking-runs.ts")
const INLINE_EDITOR_PATH = path.join(ROOT, "components", "editor", "InlineBlockTextarea.tsx")
const TYPOGRAPHY_RENDERER_HOOK_PATH = path.join(ROOT, "hooks", "useTypographyRenderer.ts")
const PREVIEW_AUTOFIT_PLACEMENT_PATH = path.join(ROOT, "hooks", "usePreviewAutoFitPlacement.ts")
const PREVIEW_REFLOW_CONTROLLER_PATH = path.join(ROOT, "hooks", "usePreviewLayoutReflowController.ts")
const AUTOFIT_WORKER_PATH = path.join(ROOT, "workers", "autoFit.worker.ts")
const PRESET_THUMBNAIL_RENDER_PATH = path.join(ROOT, "lib", "preset-thumbnail-render.ts")
const PRESET_PAGE_THUMBNAIL_PATH = path.join(ROOT, "components", "sidebar", "PresetPageThumbnail.tsx")

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function collectSourceFiles(dirPath) {
  const files = []
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath))
      continue
    }
    if (/\.(ts|tsx)$/.test(entry.name)) files.push(entryPath)
  }
  return files
}

test("text metrics service passes the authored canvas font into engine requests", () => {
  const source = readText(SERVICE_PATH)

  assert.match(
    source,
    /metricsEngineFactory:\s*TextMetricsEngineFactory/,
    "text metrics service callers must select a metrics engine explicitly",
  )
  assert.doesNotMatch(
    source,
    /createDiagnosticBrowserCanvasTextMetricsEngine|\.measureText\(/,
    "text metrics service must stay a neutral cache facade, not a browser canvas metrics implementation",
  )
  assert.match(
    source,
    /canvasFont\s*=\s*context\.font[\s\S]*?engine\.measureWidth\(\{[\s\S]*?canvasFont,[\s\S]*?\}\)/,
    "measureWidth requests must carry the authored canvas font string",
  )
  assert.match(
    source,
    /canvasFont\s*=\s*context\.font[\s\S]*?engine\.wrapText\(\{[\s\S]*?canvasFont,[\s\S]*?\}\)/,
    "wrapText requests must carry the authored canvas font string",
  )
  assert.match(
    source,
    /engine\.opticalOffset\(\{[\s\S]*?canvasFont,[\s\S]*?\}\)/,
    "optical margin requests must carry the authored canvas font string",
  )
})

test("direct browser canvas text metrics usage is classified", () => {
  const sourceRoots = ["lib", "hooks", "components", "workers"].map((dir) => path.join(ROOT, dir))
  const metricFiles = sourceRoots
    .flatMap((dir) => collectSourceFiles(dir))
    .filter((filePath) => readText(filePath).includes(".measureText("))
    .map((filePath) => path.relative(ROOT, filePath))
    .sort()

  assert.deepEqual(metricFiles, [
    "lib/diagnostic-browser-canvas-text-metrics-engine.ts",
    "lib/optical-margin.ts",
    "lib/text-format-runs.ts",
    "lib/text-metrics-browser-diagnostics.ts",
    "lib/text-metrics-dev-report.ts",
    "lib/text-rendering.ts",
    "lib/text-tracking-runs.ts",
  ])
  assert.doesNotMatch(
    readText(CANVAS_PAGE_RENDERER_PATH),
    /\.measureText\(/,
    "canvas preview renderer must consume planned geometry, not browser TextMetrics",
  )
  assert.doesNotMatch(
    readText(CANVAS_PAGE_RENDERER_PATH),
    /const\s+planFont\s*=\s*ctx\.font/,
    "canvas preview plans must retain authored font strings instead of browser-normalized ctx.font readback",
  )
  assert.match(
    readText(DIAGNOSTIC_BROWSER_ENGINE_PATH),
    /createDiagnosticBrowserCanvasTextMetricsEngine<[\s\S]*?measureDiagnosticCanvasTextAscent[\s\S]*?measureDiagnosticCanvasTextDescent/,
    "raw canvas ascent/descent must stay isolated inside the browser diagnostic engine",
  )
  assert.match(
    readText(TEXT_RENDERING_PATH),
    /measurePairAdvance\?\.\(previous,\s*current,\s*opticalKerning\)[\s\S]*?context\.measureText/,
    "plain text rendering may only reach canvas pair metrics after the deterministic pair adapter declines",
  )
  assert.match(
    readText(TEXT_FORMAT_RUNS_PATH),
    /measureResolvedPairAdvance\?\.\(previous,\s*current,\s*opticalKerning\)[\s\S]*?measureTextPairAdvance/,
    "formatted text may only reach canvas pair metrics after the deterministic resolved pair adapter declines",
  )
})

test("font-file candidate prefers explicit canvasFont over mutable context.font", () => {
  const source = readText(FONT_FILE_ENGINE_PATH)

  assert.match(
    source,
    /parseFontFileCanvasFontDescriptor\(request\.canvasFont\)/,
    "font-file metrics must use the authored request font instead of browser-normalized context.font",
  )
  assert.match(
    source,
    /\(\^\|\\s\)bold\(\?=\\s\|\$\)/,
    "font-file canvas font parsing must handle browser-normalized CSS keyword weights",
  )
})

test("parity comparisons use the same explicit font string for both engines", () => {
  const source = readText(PARITY_PATH)
  const explicitFontRequests = source.match(/canvasFont:\s*sample\.canvasFont/g) ?? []

  assert.ok(
    explicitFontRequests.length >= 4,
    "parity must pass sample.canvasFont through width and wrap requests for both engines",
  )
})

test("preset metric samples default to all pages, not only browser thumbnails", () => {
  const source = readText(PRESET_SAMPLES_PATH)

  assert.match(source, /includeAllPages\s*=\s*true/, "all-page preset sampling should be the default")
  assert.match(source, /includeStressSamples\s*=\s*true/, "stress metric sampling should be enabled by default")
  assert.match(source, /parseLoadedProject/, "all-page sampling should read the canonical preset project")
  assert.match(source, /project\.pages\.map/, "all-page sampling should iterate every page in the project")
  assert.match(source, /Donaudampfschifffahrtsgesellschaft/, "stress samples should include long German compounds")
  assert.match(source, /Terminal punctuation/, "stress samples should include punctuation-sensitive wrap boundaries")
  assert.match(source, /BASELINE GRID RHYTHM 12 PT/, "stress samples should include tracked editorial captions")
})

test("export-plan parity can inject a diagnostic metrics engine without changing defaults", () => {
  const source = readText(PAGE_EXPORT_PLAN_PATH)

  assert.match(
    source,
    /textMetricsEngineFactory\?:\s*TextMetricsEngineFactory/,
    "export-plan diagnostics need an optional metrics engine factory",
  )
  assert.match(
    source,
    /createTextMetricsService<[\s\S]*?\(\{[\s\S]*?metricsEngineFactory:\s*textMetricsEngineFactory/,
    "export-plan text metrics service should receive the optional diagnostic factory",
  )
})

test("preview and vector exports use deterministic font-file metrics for planning", () => {
  const hookSource = readText(PREVIEW_METRICS_HOOK_PATH)
  const pdfSource = readText(PDF_EXPORT_PATH)
  const svgSource = readText(SVG_EXPORT_PATH)
  const idmlSource = readText(IDML_EXPORT_PATH)
  const pageExportSource = readText(PAGE_EXPORT_PLAN_PATH)
  const canvasRendererSource = readText(CANVAS_PAGE_RENDERER_PATH)
  const typographyRendererHookSource = readText(TYPOGRAPHY_RENDERER_HOOK_PATH)
  const fontFileEngineSource = readText(FONT_FILE_ENGINE_PATH)
  const textFormatRunsSource = readText(TEXT_FORMAT_RUNS_PATH)
  const textRenderingSource = readText(TEXT_RENDERING_PATH)
  const textTrackingRunsSource = readText(TEXT_TRACKING_RUNS_PATH)
  const presetThumbnailSource = readText(PRESET_THUMBNAIL_RENDER_PATH)
  const layoutEngineContractSource = readText(path.join(ROOT, "lib", "layout-engine-contract.ts"))

  assert.match(
    hookSource,
    /metricsEngineFactory:\s*resolveLayoutTextMetricsEngineFactory\(layoutEngine\)/,
    "live preview planning should select deterministic font-file metrics from the layout contract",
  )
  assert.match(
    layoutEngineContractSource,
    /LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT[\s\S]*?textMetricsEngine:\s*"font-file-deterministic-v1"[\s\S]*?opticalMarginModel:\s*"browser-canvas-compat-v1"/,
    "the legacy layout contract should preserve the existing deterministic engine and compatibility optical margin",
  )
  assert.match(
    layoutEngineContractSource,
    /CURRENT_LAYOUT_ENGINE_CONTRACT:\s*LayoutEngineContract\s*=\s*[\s\S]*?DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT/,
    "the current layout contract should promote deterministic optical margin as the default contract",
  )
  assert.match(
    layoutEngineContractSource,
    /parseLayoutEngineContract\(source:[\s\S]*?return CURRENT_LAYOUT_ENGINE_CONTRACT[\s\S]*?isLegacyBrowserCompatLayoutEngineContract/,
    "missing saved layout contracts should resolve to the current deterministic optical-margin contract",
  )
  assert.match(
    layoutEngineContractSource,
    /DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT[\s\S]*?font-file-deterministic-optical-margin-v1[\s\S]*?font-file-contour-optical-margin-v1[\s\S]*?createDeterministicFontFileOpticalMarginTextMetricsEngine/,
    "the promoted layout contract should expose deterministic optical margin as an explicit versioned contract",
  )
  assert.match(
    hookSource,
    /preloadFontFileMetricFaces/,
    "live preview should preload outline metrics before refreshing text layout",
  )
  assert.match(
    hookSource,
    /areFontFileMetricFacesLoaded/,
    "live preview should synchronously gate deterministic rendering while a newly selected font face is still loading",
  )
  assert.match(
    typographyRendererHookSource,
    /typographyMetricsReady/,
    "live preview renderer should wait for deterministic font-file metrics instead of rendering with unloaded font faces",
  )
  for (const source of [pdfSource, svgSource, idmlSource]) {
    assert.match(
      source,
      /layoutEngine/,
      "vector export planning should receive the saved layout metrics contract",
    )
  }
  assert.match(
    pageExportSource,
    /textMetricsEngineFactory\s*\?\?\s*resolveLayoutTextMetricsEngineFactory\(layoutEngine\)/,
    "page export planning should default through the saved layout metrics contract",
  )
  assert.match(
    presetThumbnailSource,
    /metricsEngineFactory:\s*resolveLayoutTextMetricsEngineFactory\(page\.layoutEngine\)/,
    "preset thumbnail planning should use the same saved layout metrics contract",
  )
  assert.match(
    pageExportSource,
    /createLoadedFontFileGlyphBoundsMeasureForCanvasFont/,
    "export glyph positioning should prefer loaded outline bounds",
  )
  assert.match(
    canvasRendererSource,
    /buildPositionedTextFormatTrackingGraphemes\([\s\S]*?measureGlyphBounds/,
    "canvas glyph positioning should receive deterministic outline glyph bounds when available",
  )
  assert.match(
    textFormatRunsSource,
    /const measured = measureResolvedGlyphBounds\?\.\(grapheme\) \?\? measureGlyphBounds\?\.\(grapheme\.text\)[\s\S]*?measured\.advanceWidth/,
    "glyph positioning should prefer deterministic font-file advance widths before canvas measurement",
  )
  assert.match(
    textFormatRunsSource,
    /const measuredPairAdvance = measureResolvedPairAdvance\?\.\(previous,\s*current,\s*opticalKerning\)/,
    "formatted text pair advances should prefer deterministic font-file pair metrics before canvas measurement",
  )
  assert.match(
    textRenderingSource,
    /function measureGlyphAdvance[\s\S]*?measureGlyphBounds\?\.\(glyph\)[\s\S]*?measured\.advanceWidth/,
    "plain text measurement should prefer deterministic font-file advance widths for single and terminal glyphs",
  )
  assert.match(
    textRenderingSource,
    /measurePairAdvance\?\.\(previous,\s*current,\s*opticalKerning\)/,
    "plain text pair advances should accept deterministic font-file pair metrics before canvas pair measurement",
  )
  assert.match(
    textTrackingRunsSource,
    /function measureTrackedGlyphWidth[\s\S]*?measureGlyphBounds\?\.\(glyph\)[\s\S]*?measured\.advanceWidth/,
    "tracking-run measurement should prefer deterministic font-file advance widths for single and initial glyphs",
  )
  assert.match(
    canvasRendererSource,
    /measureResolvedGlyphBounds/,
    "live preview should provide per-grapheme deterministic font-file bounds for formatted text",
  )
  assert.match(
    canvasRendererSource,
    /measureResolvedPairAdvance/,
    "live preview should provide per-grapheme deterministic font-file pair advances for formatted text",
  )
  assert.match(
    pageExportSource,
    /measureResolvedGlyphBounds/,
    "export planning should provide per-grapheme deterministic font-file bounds for formatted text",
  )
  assert.match(
    pageExportSource,
    /measureResolvedPairAdvance/,
    "export planning should provide per-grapheme deterministic font-file pair advances for formatted text",
  )
  assert.match(
    pageExportSource,
    /textMetrics\.getTextAscent/,
    "export planning should use the metrics engine for ascent instead of raw canvas TextMetrics",
  )
  assert.match(
    canvasRendererSource,
    /getTextAscent\(ctx,\s*baseCanvasFont/,
    "live preview planning should use the metrics engine for first-line ascent",
  )
  assert.doesNotMatch(
    pageExportSource,
    /measureCanvasTextAscent|measureCanvasTextDescent/,
    "export planning must not depend on browser canvas ascent/descent",
  )
  assert.match(
    fontFileEngineSource,
    /measureLoadedFontFileCapAscent/,
    "deterministic font-file metrics should top-align text from loaded font cap-height metrics",
  )
  assert.match(
    fontFileEngineSource,
    /measureDeterministicTextTopAscent/,
    "deterministic font-file metrics should expose one browser-independent top-alignment ascent",
  )
  assert.match(
    fontFileEngineSource,
    /measureDeterministicLayoutDescent/,
    "deterministic font-file metrics should keep legacy-compatible descent for authored layouts",
  )
  assert.match(
    fontFileEngineSource,
    /createFontFileRangeCalibrationTextMetricsEngine/,
    "font-file metrics should expose an opt-in range calibration engine",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /rangeCalibration/,
    "browser captures should report range-calibration export-plan deltas separately",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /rangeCalibrationClassCorrection/,
    "browser captures should report the class-correction calibration candidate separately",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /changedCommands/,
    "range-calibration deltas should expose line-level command evidence",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /boundaryProbe/,
    "range-calibration deltas should expose wrap-boundary decision evidence",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /wrapTrace/,
    "range-calibration deltas should expose source wrapper trace evidence",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /sameCandidate/,
    "range-calibration wrap traces should compare the identical candidate range across engines",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /opticalPairDiagnostics/,
    "range-calibration wrap traces should expose pair-level optical drift for changed decisions",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /opticalPairSummary/,
    "range-calibration reports should aggregate pair-level optical drift across changed decisions",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /largestClassAggregates/,
    "range-calibration reports should aggregate optical drift by pair class before calibration",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /wrapDecisionSummary/,
    "range-calibration reports should summarize wrap-decision drift by typography group",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /boundaryVetoSummary/,
    "range-calibration reports should expose boundary vetoes separately from changed command text",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /styleKey:\s*active\.styleKey/,
    "export-plan deltas should retain the typographic style key for grouped calibration diagnostics",
  )
  assert.match(
    fontFileEngineSource,
    /measureFontFileFormattedRangeWidth/,
    "font-file metrics should keep the outline formatted-range implementation available for calibration",
  )
  assert.match(
    fontFileEngineSource,
    /measureFontFileTrackedRangeWidth/,
    "font-file metrics should keep the outline tracking-range implementation available for calibration",
  )
  assert.match(
    fontFileEngineSource,
    /createFontFileRangeCalibrationClassCorrectionTextMetricsEngine/,
    "font-file metrics should expose class correction only as an opt-in calibration engine",
  )
  assert.match(
    fontFileEngineSource,
    /id:\s*"font-file-deterministic-v1"/,
    "promoted deterministic metrics should have a stable production engine id",
  )
  assert.match(
    fontFileEngineSource,
    /allowDiagnosticBrowserFallback:\s*false/,
    "promoted deterministic metrics must fail closed instead of silently using browser canvas fallback",
  )
  assert.match(
    fontFileEngineSource,
    /function requireFontFileWidth[\s\S]*?throw buildRequiredFontFileMetricsError/,
    "missing deterministic font-file widths should be explicit failures, not browser fallback",
  )
  assert.match(
    fontFileEngineSource,
    /function createLegacyBrowserOpticalOffsetForCompatibility[\s\S]*?createDiagnosticBrowserCanvasTextMetricsEngine[\s\S]*?return fallbackEngine\.opticalOffset/,
    "legacy browser-backed optical margin must stay explicit until it can be migrated without changing saved layout signatures",
  )
  assert.match(
    fontFileEngineSource,
    /opticalOffset:\s*createLegacyBrowserOpticalOffsetForCompatibility\(context\)/,
    "font-file engines should expose optical margin as the named compatibility bridge, not an implicit fallback-engine property",
  )
  assert.match(
    fontFileEngineSource,
    /function createDeterministicFontFileOpticalMarginTextMetricsEngine/,
    "font-file metrics should expose an opt-in deterministic optical-margin candidate",
  )
  assert.match(
    fontFileEngineSource,
    /canvasFont[\s\S]*?createLoadedFontFileOpticalMarginGlyphBoundsMeasureForCanvasFont\(canvasFont\)[\s\S]*?getOpticalMarginAnchorOffset/,
    "deterministic optical-margin candidate should use the authored request font for outline contour glyph bounds",
  )
  assert.match(
    fontFileEngineSource,
    /function getGlyphContourOpticalBounds[\s\S]*?getContourOpticalBoundaryProfile\(char,\s*fontSize\)[\s\S]*?getValueQuantile\(leftRows,\s*boundaryProfile\.leftQuantile\)[\s\S]*?getValueQuantile\(rightRows,\s*boundaryProfile\.rightQuantile\)/,
    "deterministic optical-margin candidate should sample outline contours instead of using raw glyph bounding boxes",
  )
  assert.match(
    fontFileEngineSource,
    /function getContourOpticalBoundaryProfile[\s\S]*?char === "7"[\s\S]*?blend:\s*0\.86[\s\S]*?\^\[ag\]\$[\s\S]*?fontSize >= 200[\s\S]*?blend:\s*0\.24[\s\S]*?char === "S"[\s\S]*?blend:\s*0\.75[\s\S]*?char === "D"[\s\S]*?fontSize >= 48[\s\S]*?fontSize <= 96[\s\S]*?leftAdjustmentEm:\s*-0\.01465[\s\S]*?char === "F"[\s\S]*?fontSize >= 180[\s\S]*?leftAdjustmentEm:\s*-0\.0045[\s\S]*?\^\[A-ZÄÖÜ\][\s\S]*?blend:\s*0\.25[\s\S]*?blend:\s*0\.82/,
    "outline contour optical margins should keep uppercase correction restrained while allowing stronger lowercase display correction",
  )
  assert.match(
    fontFileEngineSource,
    /measureWidth:\s*\(sample\)\s*=>\s*engine\.measureWidth\(\{[\s\S]*?canvasFont/,
    "deterministic optical-margin candidate should keep edge glyph width measurement on the font-file engine",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /deterministicOpticalMargin/,
    "browser captures should report deterministic optical-margin export-plan deltas separately",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /deterministicOpticalMarginExportPlanSignatures/,
    "browser captures should snapshot deterministic optical-margin output signatures before promotion",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /const commonArgs = \{[\s\S]*?layoutEngine:\s*page\.layoutEngine/,
    "export-plan parity diagnostics should compare against the saved page layout contract, not the global current default",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /buildPageExportPlan\(\{[\s\S]*?layoutEngine:\s*page\.layoutEngine,[\s\S]*?textMetricsEngineFactory,/,
    "production signature snapshots should include the saved page layout contract before optional candidate injection",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /const signaturePageLimit = Math\.max\(0,\s*exportPageLimit\)/,
    "signature snapshots should cover the full requested export-plan surface, not an arbitrary small cap",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /function buildPreviewPlanParityReport[\s\S]*?buildCurrentPreviewTextPlans[\s\S]*?buildPageExportPlan/,
    "preview-plan parity should compare current canvas preview planning against the canonical export plan without changing rendering",
  )
  assert.match(
    readText(DEV_REPORT_PATH),
    /changedGraphemeCount[\s\S]*?maxAbsGraphemeXDelta[\s\S]*?maxAbsGraphemeWidthDelta/,
    "preview-plan parity should expose grapheme-level geometry drift before live preview is switched",
  )
  assert.match(
    readText(CANVAS_PAGE_RENDERER_PATH),
    /function buildCanvasTextPlanSignature[\s\S]*?export function buildCanvasTextRenderPlanFromPageExportPlan[\s\S]*?buildRenderedTextLines/,
    "canvas preview should have a canonical PageExportPlan-to-render-plan adapter before runtime switching",
  )
  assert.match(
    readText(CANVAS_PAGE_RENDERER_PATH),
    /export function buildCanvasRenderPlansFromPageExportPlan[\s\S]*?orderedLayerKeys[\s\S]*?imagePlans[\s\S]*?textPlans/,
    "canonical export plans should be convertible to the same preview layer stack shape",
  )
  assert.match(
    fontFileEngineSource,
    /isTerminalPunctuationBoundaryCandidate/,
    "boundary class correction should stay scoped to measured terminal punctuation fit-tests",
  )
})

test("package exposes the browser text-metrics parity gate", () => {
  const pkg = JSON.parse(readText(PACKAGE_PATH))
  const scriptSource = readText(BROWSER_PARITY_SCRIPT_PATH)

  assert.equal(
    pkg.scripts["test:text-metrics:browser"],
    "node scripts/run-text-metrics-parity.mjs",
  )
  assert.match(
    scriptSource,
    /assertProductionThresholds/,
    "browser parity command should hard-gate the deterministic production plan",
  )
  assert.match(
    scriptSource,
    /browserDiagnosticStatus/,
    "browser parity command should report browser-canvas diagnostics separately",
  )
  assert.match(
    scriptSource,
    /deterministicOpticalMarginStatus/,
    "browser parity command should hard-gate the deterministic optical-margin candidate separately",
  )
  assert.match(
    scriptSource,
    /assertDeterministicOpticalMarginThresholds/,
    "browser parity command should pin deterministic optical-margin drift before promotion",
  )
  assert.match(
    scriptSource,
    /SGG_PARITY_DETERMINISTIC_OPTICAL_MARGIN_MAX_COMMAND_X_DELTA/,
    "browser parity command should expose an explicit deterministic optical-margin X-drift threshold override",
  )
  assert.match(
    scriptSource,
    /SGG_PARITY_FAIL_ON_BROWSER_DIAGNOSTIC/,
    "browser parity command should optionally fail on browser-canvas diagnostics",
  )
  assert.match(
    scriptSource,
    /function summarizeDiagnosticExportPlan/,
    "browser parity summary should expose compact candidate export-plan evidence for migration diagnostics",
  )
  assert.match(
    scriptSource,
    /deterministicOpticalMargin:\s*summarizeDiagnosticExportPlan/,
    "deterministic optical-margin candidate should stay diagnostic and compact in CLI summaries",
  )
  assert.match(
    scriptSource,
    /previewPlan:\s*\{[\s\S]*?\.\.\.report\.previewPlan[\s\S]*?largestDeltas:\s*report\.previewPlan\.largestDeltas\.slice\(0,\s*8\)/,
    "browser parity command should preserve preview-plan diagnostics from the in-browser report",
  )
  assert.match(
    scriptSource,
    /previewPlan:\s*summarizePreviewPlan\(report\.previewPlan\)/,
    "browser parity summary output should include preview-plan parity before live preview is switched",
  )
  assert.match(
    scriptSource,
    /deterministicOpticalMarginExportPlanSignatures/,
    "browser parity summaries should include deterministic optical-margin candidate signatures",
  )
  assert.match(
    scriptSource,
    /EXPECTED_DETERMINISTIC_OPTICAL_MARGIN_EXPORT_PLAN_SIGNATURES/,
    "browser parity command should hard-pin deterministic optical-margin candidate signatures",
  )
  assert.match(
    scriptSource,
    /06ef2722/,
    "browser parity command should pin the current Classic deterministic optical-margin candidate signature",
  )
  assert.match(
    scriptSource,
    /Swiss Style Poster Example 002 \/ Swiss Style Poster[\s\S]*?8c27f777[\s\S]*?Classic Book Cover Lookalike \/ Blank Start Page[\s\S]*?06ef2722/,
    "browser parity command should pin promoted v2 poster-scale and Classic signatures",
  )
})

test("inline editor caret metrics follow deterministic preview geometry", () => {
  const source = readText(INLINE_EDITOR_PATH)

  assert.match(
    source,
    /createResolvedFontFileGlyphBoundsMeasure/,
    "inline editor should use per-grapheme deterministic font-file bounds for formatted text",
  )
  assert.match(
    source,
    /measureFormattedTextRangeWidth\([\s\S]*?measureResolvedGlyphBounds/,
    "inline editor formatted caret widths should receive deterministic resolved glyph bounds",
  )
  assert.match(
    source,
    /measureFormattedTextRangeWidth\([\s\S]*?measureResolvedPairAdvance/,
    "inline editor formatted caret widths should receive deterministic resolved pair advances",
  )
  assert.doesNotMatch(
    source,
    /measureText\("Hgyp"\)/,
    "inline editor caret height should not depend on browser canvas ascent/descent",
  )
  assert.match(
    source,
    /createLoadedFontFilePairAdvanceMeasureForCanvasFont/,
    "inline editor plain caret widths should receive deterministic pair advances",
  )
})

test("autofit reflow widths prefer deterministic font-file glyph bounds", () => {
  const placementSource = readText(PREVIEW_AUTOFIT_PLACEMENT_PATH)
  const hookSource = readText(PREVIEW_REFLOW_CONTROLLER_PATH)
  const workerSource = readText(AUTOFIT_WORKER_PATH)

  assert.match(
    placementSource,
    /typographyMetricsReady[\s\S]*?if \(!typographyMetricsReady\) return null/,
    "inline autofit placement should wait for deterministic font-file metrics before measuring new font cuts",
  )
  for (const source of [hookSource, workerSource]) {
    assert.match(
      source,
      /createLoadedFontFileGlyphBoundsMeasureForCanvasFont/,
      "autofit width measurement should derive glyph bounds from the planned canvas font",
    )
    assert.match(
      source,
      /createLoadedFontFilePairAdvanceMeasureForCanvasFont/,
      "autofit width measurement should derive pair advances from the planned canvas font",
    )
    assert.match(
      source,
      /const measureGlyphBounds = createLoadedFontFileGlyphBoundsMeasureForCanvasFont\(.*?\) \?\? undefined/,
      "autofit should pass a deterministic glyph-bounds measurer when the font file is loaded",
    )
    assert.match(
      source,
      /const measurePairAdvance = createLoadedFontFilePairAdvanceMeasureForCanvasFont\(.*?\) \?\? undefined/,
      "autofit should pass a deterministic pair-advance measurer when the font file is loaded",
    )
    assert.match(
      source,
      /measureTrackedTextRangeWidth\([\s\S]*?measureGlyphBounds,[\s\S]*?measurePairAdvance/,
      "tracked autofit widths should receive deterministic glyph bounds and pair advances",
    )
    assert.match(
      source,
      /measureCanvasTextWidth\([\s\S]*?measureGlyphBounds/,
      "plain autofit widths should receive deterministic glyph bounds",
    )
    assert.match(
      source,
      /measureCanvasTextWidth\([\s\S]*?measurePairAdvance/,
      "plain autofit widths should receive deterministic pair advances",
    )
  }
  assert.match(
    workerSource,
    /preloadFontFileMetricFaces/,
    "the autofit worker must preload font-file metrics in worker memory before measuring",
  )
})

test("preset thumbnails preload deterministic metric faces before first draw", () => {
  const renderSource = readText(PRESET_THUMBNAIL_RENDER_PATH)
  const componentSource = readText(PRESET_PAGE_THUMBNAIL_PATH)

  assert.match(
    renderSource,
    /collectPresetThumbnailFontMetricFaces/,
    "preset thumbnails should expose the font-file metric faces required by their text blocks",
  )
  assert.match(
    renderSource,
    /collectFontFileMetricFacesFromBlocks/,
    "preset thumbnail metric-face collection should use the shared font-file face collector",
  )
  assert.match(
    renderSource,
    /resolveLayoutTextMetricsEngineFactory\(page\.layoutEngine\)/,
    "preset thumbnails should select text metrics through the saved layout contract",
  )
  assert.match(
    componentSource,
    /preloadFontFileMetricFaces\(metricFaces\)/,
    "preset thumbnails should preload outline metrics before deterministic thumbnail drawing",
  )
  assert.match(
    componentSource,
    /cancelled\s*\|\|\s*!readyToDraw/,
    "preset thumbnails must not draw with strict deterministic metrics before preload completion",
  )
})

test("Safari capture page runs the same browser report with threshold metadata", () => {
  const pageSource = readText(SAFARI_CAPTURE_PAGE_PATH)
  const thresholdSource = readText(THRESHOLDS_PATH)
  const browserDiagnosticsSource = readText(BROWSER_DIAGNOSTICS_PATH)
  const devReportSource = readText(DEV_REPORT_PATH)
  const scriptSource = readText(BROWSER_PARITY_SCRIPT_PATH)

  assert.match(
    pageSource,
    /runPresetTextMetricsParityReport/,
    "Safari capture page should run the browser text-metrics parity report",
  )
  assert.match(
    pageSource,
    /evaluateTextMetricsParityThresholds/,
    "Safari capture page should evaluate the same threshold contract",
  )
  assert.match(
    pageSource,
    /evaluateTextMetricsProductionParityThresholds/,
    "Safari capture page should separate production parity from browser-canvas diagnostics",
  )
  assert.match(
    pageSource,
    /evaluateDeterministicOpticalMarginThresholds/,
    "Safari capture page should expose the deterministic optical-margin promotion gate",
  )
  assert.match(
    pageSource,
    /evaluatePreviewPlanThresholds/,
    "Safari capture page should expose the preview/export canonical-plan parity gate",
  )
  assert.match(
    pageSource,
    /deterministicOpticalMarginThresholdReport/,
    "Safari capture JSON should include deterministic optical-margin threshold status",
  )
  assert.match(
    pageSource,
    /deterministicOpticalMarginExportPlanSignatures/,
    "Safari capture JSON should include deterministic optical-margin candidate signatures",
  )
  assert.match(
    thresholdSource,
    /deterministicOpticalMarginMaxAbsCommandXDelta:\s*0\.16/,
    "deterministic optical-margin replacement should be pinned to the current tight X-drift tolerance",
  )
  assert.match(
    thresholdSource,
    /previewPlanChangedCommandCount:\s*0[\s\S]*?previewPlanChangedGraphemeCount:\s*0[\s\S]*?previewPlanMaxAbsGraphemeDelta:\s*0\.01/,
    "preview-plan parity should be a hard guardrail for command and grapheme geometry drift",
  )
  assert.match(
    scriptSource,
    /assertPreviewPlanThresholds[\s\S]*?previewPlan\.changedCommandCount[\s\S]*?previewPlan\.maxAbsGraphemeWidthDelta[\s\S]*?previewPlanFailures/,
    "browser parity command should fail on live-preview/export plan drift",
  )
  assert.match(
    pageSource,
    /navigator\.userAgent/,
    "Safari capture JSON should include browser attribution metadata",
  )
  assert.match(
    thresholdSource,
    /export const DEFAULT_TEXT_METRICS_PARITY_THRESHOLDS/,
    "browser and manual capture checks need named default thresholds",
  )
  assert.match(
    thresholdSource,
    /EXPECTED_TEXT_METRICS_PRODUCTION_EXPORT_PLAN_SIGNATURES/,
    "production thresholds should pin compact deterministic export-plan signatures",
  )
  assert.match(
    thresholdSource,
    /EXPECTED_TEXT_METRICS_DETERMINISTIC_OPTICAL_MARGIN_EXPORT_PLAN_SIGNATURES/,
    "production thresholds should also pin deterministic optical-margin candidate signatures before promotion",
  )
  assert.match(
    thresholdSource,
    /06ef2722/,
    "threshold metadata should pin the current Classic deterministic optical-margin candidate signature",
  )
  assert.match(
    thresholdSource,
    /Swiss Style Poster Example 002 \/ Swiss Style Poster[\s\S]*?8c27f777[\s\S]*?Classic Book Cover Lookalike \/ Blank Start Page[\s\S]*?06ef2722/,
    "threshold metadata should pin a wider promoted v2 multi-preset export-plan surface",
  )
  assert.match(
    thresholdSource,
    /Classic Book Cover Lookalike \/ Blank Start Page/,
    "production thresholds should pin the Classic cover text, image, and layer-order geometry",
  )
  assert.match(
    devReportSource,
    /REQUIRED_PRODUCTION_EXPORT_PLAN_SIGNATURE_LABELS/,
    "browser captures should always include explicitly required production layout snapshots",
  )
  assert.match(
    devReportSource,
    /productionExportPlanSignatures/,
    "browser captures should include compact deterministic export-plan signatures",
  )
  assert.match(
    pageSource,
    /browserDiagnostics/,
    "Safari capture JSON should include raw browser diagnostics",
  )
  assert.match(
    browserDiagnosticsSource,
    /canvasFontKerning/,
    "raw browser diagnostics should capture canvas fontKerning support",
  )
  assert.match(
    browserDiagnosticsSource,
    /normalizedCanvasFont/,
    "raw browser diagnostics should capture canvas font normalization",
  )
  assert.match(
    browserDiagnosticsSource,
    /actualBoundingBoxAscent/,
    "raw browser diagnostics should capture TextMetrics field support",
  )
  assert.match(
    devReportSource,
    /TextMetricsPresetParityDiagnosis/,
    "browser captures should include an explicit compatibility diagnosis",
  )
  assert.match(
    pageSource,
    /diagnosis:\s*report\.diagnosis/,
    "Safari capture JSON should include the report diagnosis",
  )
})
