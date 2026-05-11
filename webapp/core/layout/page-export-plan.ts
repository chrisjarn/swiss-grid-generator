import type { GridResult } from "@/core/layout/grid-calculator"
import { normalizeHeightMetrics, resolveBlockHeight } from "@/core/layout/block-height"
import {
  DEFAULT_BASE_FONT,
  getStyleDefaultFontWeight,
  resolveFontFamily,
  resolveFontVariant,
  type FontFamily,
} from "@/core/config/fonts"
import {
  getDefaultTextSchemeColor,
  resolveImageSchemeColor,
  resolveTextSchemeColor,
  type ImageColorSchemeId,
} from "@/core/config/color-schemes"
import {
  BASE_BLOCK_IDS,
  DEFAULT_STYLE_ASSIGNMENTS,
  DEFAULT_TEXT_CONTENT,
  isBaseBlockId,
} from "@/core/document/defaults"
import { clampFxLeading, clampFxSize, clampRotation } from "@/core/layout/block-constraints"
import { parseHexColor } from "@/core/export/colors"
import {
  buildAxisStarts,
  findNearestAxisIndex,
  resolveAxisSizes,
} from "@/core/layout/grid-rhythm"
import {
  resolveGridColumnStarts,
  resolveGridFirstColumnStep,
  sumGridColumnSpan,
} from "@/core/layout/grid-column-layout"
import { resolvePreviewColumnX } from "@/core/layout/preview-column-snap"
import { clampFreePlacementRow, clampLayerColumn, resolveLayerColumnBounds } from "@/core/layout/layer-placement"
import { buildImagePlaceholderGeometryPlan } from "@/core/layout/image-placeholder-plan"
import {
  getDefaultColumnSpan,
  wrapTextDetailed,
} from "@/core/layout/text-layout"
import { mapTextBlockPositionsToAbsolute } from "@/core/layout/text-block-position"
import { normalizeImagePlaceholderOpacity } from "@/core/layout/image-placeholder-opacity"
import {
  buildTypographyLayoutPlan,
  getTypographyLineCapacityForHeight,
  getTypographyReflowLineCapacityForRowHeights,
  type TypographyLayoutPlan,
} from "@/core/layout/typography-layout-plan"
import {
  buildPositionedTextFormatTrackingGraphemes,
  buildPositionedTextFormatTrackingSegmentsDirect,
  buildPositionedTextFormatTrackingSegmentsFromGraphemes,
  getResolvedFormatIntervals,
  normalizeTextFormatRuns,
  withTextFormatProfilingAccumulator,
  type TextFormatRun,
} from "@/core/layout/text-format-runs"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
  normalizeOpticalKerning,
  normalizeTrackingScale,
} from "@/core/layout/text-rendering"
import {
  getResolvedTrackingIntervals,
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/core/layout/text-tracking-runs"
import { resolveSyllableDivisionEnabled, resolveTextReflowEnabled } from "@/core/layout/typography-behavior"
import { createTextMetricsService } from "@/core/layout/text-metrics-service"
import {
  createLoadedFontFileGlyphBoundsMeasureForCanvasFont,
  createResolvedFontFileGlyphBoundsMeasure,
  createResolvedFontFilePairAdvanceMeasure,
} from "@/core/layout/font-file-text-metrics-engine"
import type { TextMeasureContext } from "@/core/layout/text-metrics-engine"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  resolveLayoutTextMetricsEngineFactory,
  type LayoutEngineContract,
} from "@/core/layout/layout-engine-contract"
import {
  isLayoutProfilingEnabled,
  type LayoutPerformanceMetadata,
  measureLayoutPerformance,
  recordLayoutPerformanceMetric,
} from "@/core/layout/layout-performance"
import {
  resolveDocumentVariableContent,
  type DocumentVariableContext,
} from "@/core/document/variable-text"
import { resolveSpreadDocumentVariableContextForColumn } from "@/core/document/page-numbering"
import { fitLoremTextToLineCapacity } from "@/core/document/variable-lorem"
import type {
  BlockId,
  BuildPageExportPlanArgs,
  PageExportGuideGroup,
  PageExportImagePlan,
  PageExportLine,
  PageExportPlan,
  PageExportPlanTimingCollector,
  PageExportRect,
  PageExportTextPlan,
  PreviewLayoutState,
  TypographyStyleKey,
} from "@/core/layout/page-export-plan-types"
export type {
  BuildPageExportPlanArgs,
  PageExportGuideGroup,
  PageExportImagePlan,
  PageExportLine,
  PageExportPlan,
  PageExportPlanTimingCollector,
  PageExportRect,
  PageExportTextPlan,
  PageExportTextWrapTrace,
} from "@/core/layout/page-export-plan-types"

type ExportTextContext = {
  canvasFont: string
  opticalKerning: boolean
  trackingScale: number
  trackingRuns: TextTrackingRun[]
  baseFormat: {
    fontFamily: FontFamily
    fontWeight: number
    italic: boolean
    styleKey: TypographyStyleKey
    color: string
  }
  formatRuns: TextFormatRun<TypographyStyleKey, FontFamily>[]
  resolveFontSize: (styleKey: TypographyStyleKey) => number
  sourceText: string
  measureWidth: (text: string, range?: { start: number; end: number }) => number
}

type ResolvedBlockPlan = {
  key: BlockId
  styleKey: TypographyStyleKey
  span: number
  rowSpan: number
  heightBaselines: number
  snapToColumns: boolean
  startCol: number
  startRow: number
  blockHeight: number
  wrapWidth: number
  reflowEnabled: boolean
  hyphenate: boolean
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  opticalKerning: boolean
  trackingScale: number
  resolvedTextColor: string
  baseFormat: {
    fontFamily: FontFamily
    fontWeight: number
    italic: boolean
    styleKey: TypographyStyleKey
    color: string
  }
  defaultFontSize: number
  defaultBaselineMultiplier: number
  resolvedBaselineMultiplier: number
  lineStep: number
  baseFontSize: number
  baseCanvasFont: string
  rawText: string
  rawTrackingRuns: TextTrackingRun[]
  rawFormatRuns: TextFormatRun<TypographyStyleKey, FontFamily>[]
  maxLoremLines: number
  documentVariableContext: DocumentVariableContext | null
  isManualPosition: boolean
  manualRow: number | null
  resolveFontSize: (styleKey: TypographyStyleKey) => number
  rotation: number
}

type PageExportPlanPhaseAccumulator = {
  resolveBlocksMs: number
  documentVariablesMs: number
  wrapTextMs: number
  textMeasureWidthMs: number
  textAscentMs: number
  textDescentMs: number
  opticalOffsetsMs: number
  paragraphBoxesMs: number
  lineCommandsMs: number
  glyphGraphemesMs: number
  glyphSegmentsMs: number
  resolveFontTrackingGraphemesMs: number
  measureFormattedTextRangeWidthMs: number
  graphemeAdvanceMs: number
  graphemeMetricsMs: number
  layerOrderMs: number
}

function measurePageExportPlanDiagnostic<T>(
  label: string,
  run: () => T,
  profilePhases: boolean,
  timingCollector?: PageExportPlanTimingCollector,
  metadata?: LayoutPerformanceMetadata,
  extra = "",
): T {
  if (!profilePhases && !timingCollector) return run()
  const startedAt = timingCollector ? getNowMs() : 0
  try {
    return profilePhases ? measureLayoutPerformance(label, run, metadata) : run()
  } finally {
    if (timingCollector) {
      timingCollector(label, getNowMs() - startedAt, extra)
    }
  }
}

function recordAccumulatedPageExportPlanMetric(
  timingCollector: PageExportPlanTimingCollector | undefined,
  label: string,
  durationMs: number,
  metadata: LayoutPerformanceMetadata,
  extra: string,
): void {
  void metadata
  timingCollector?.(label, durationMs, extra)
}

const PAGE_EXPORT_TEXT_INPUT_CACHE_LIMIT = 5000
const PAGE_EXPORT_DOCUMENT_VARIABLE_CACHE_LIMIT = 2048
const PAGE_EXPORT_LOREM_LINE_COUNT_CACHE_LIMIT = 20000
const EMPTY_TRACKING_RUNS: TextTrackingRun[] = []
const EMPTY_FORMAT_RUNS: TextFormatRun<TypographyStyleKey, FontFamily>[] = []
const DOCUMENT_VARIABLE_TOKEN_RE = /<%([a-z_]+)(?::([\s\S]*?))?%>/gi

const normalizedPageExportTrackingRunsCache = new WeakMap<
  readonly TextTrackingRun[],
  Map<string, readonly TextTrackingRun[]>
>()
const exportFormatRunsBySchemeCache = new WeakMap<
  readonly TextFormatRun<TypographyStyleKey, FontFamily>[],
  Map<string, readonly TextFormatRun<TypographyStyleKey, FontFamily>[]>
>()
const normalizedPageExportFormatRunsCache = new WeakMap<
  readonly TextFormatRun<TypographyStyleKey, FontFamily>[],
  Map<string, readonly TextFormatRun<TypographyStyleKey, FontFamily>[]>
>()
const pageExportDocumentVariableCache = new Map<string, PageExportCachedDocumentVariableContent>()
const pageExportLoremLineCountCache = new Map<string, number>()

type PageExportCachedDocumentVariableContent = {
  text: string
  formatRuns: TextFormatRun<TypographyStyleKey, FontFamily>[]
  trackingRuns: TextTrackingRun[]
}

function rememberPageExportCachedValue<T>(
  cache: Map<string, T>,
  key: string,
  value: T,
): T {
  cache.set(key, value)
  if (cache.size > PAGE_EXPORT_TEXT_INPUT_CACHE_LIMIT) {
    cache.clear()
    cache.set(key, value)
  }
  return value
}

function getPageExportBaseFormatKey(
  baseFormat: ResolvedBlockPlan["baseFormat"],
): string {
  return `${baseFormat.fontFamily}:${baseFormat.fontWeight}:${baseFormat.italic ? 1 : 0}:${baseFormat.styleKey}:${baseFormat.color}`
}

function rememberPageExportLruValue<T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  limit: number,
): T {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, value)
  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value
    if (!oldestKey) break
    cache.delete(oldestKey)
  }
  return value
}

function readPageExportLruValue<T>(
  cache: Map<string, T>,
  key: string,
): T | null {
  const value = cache.get(key)
  if (value === undefined) return null
  cache.delete(key)
  cache.set(key, value)
  return value
}

function clonePageExportFormatRuns(
  runs: readonly TextFormatRun<TypographyStyleKey, FontFamily>[],
): TextFormatRun<TypographyStyleKey, FontFamily>[] {
  return runs.map((run) => ({ ...run }))
}

function clonePageExportTrackingRuns(
  runs: readonly TextTrackingRun[],
): TextTrackingRun[] {
  return runs.map((run) => ({ ...run }))
}

function clonePageExportDocumentVariableContent(
  content: PageExportCachedDocumentVariableContent,
): PageExportCachedDocumentVariableContent {
  return {
    text: content.text,
    formatRuns: clonePageExportFormatRuns(content.formatRuns),
    trackingRuns: clonePageExportTrackingRuns(content.trackingRuns),
  }
}

function stablePageExportCacheStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(stablePageExportCacheStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stablePageExportCacheStringify(entryValue)}`).join(",")}}`
}

function readDocumentVariableTokenNames(text: string): Set<string> {
  const names = new Set<string>()
  if (!text.includes("<%")) return names
  DOCUMENT_VARIABLE_TOKEN_RE.lastIndex = 0
  for (const match of text.matchAll(DOCUMENT_VARIABLE_TOKEN_RE)) {
    names.add((match[1] ?? "").trim().toLowerCase())
  }
  return names
}

function hasDocumentVariable(text: string): boolean {
  return readDocumentVariableTokenNames(text).size > 0
}

function getRelevantDocumentVariableContextKey(
  text: string,
  context: DocumentVariableContext,
): string {
  const names = readDocumentVariableTokenNames(text)
  const contextParts: Record<string, unknown> = {}

  if (names.has("project_title")) contextParts.projectTitle = context.projectTitle
  if (names.has("page_title") || names.has("title")) contextParts.pageTitle = context.pageTitle
  if (names.has("page")) contextParts.pageNumber = context.pageNumber
  if (names.has("pages")) contextParts.pageCount = context.pageCount
  if (names.has("date") || names.has("time")) contextParts.now = context.now.toISOString()

  return stablePageExportCacheStringify(contextParts)
}

function buildPageExportResolveFontSizeKey(blockPlan: ResolvedBlockPlan): string {
  const usedStyleKeys = new Set<TypographyStyleKey>([blockPlan.styleKey])
  for (const run of blockPlan.rawFormatRuns) {
    if (run.styleKey) usedStyleKeys.add(run.styleKey)
  }
  const entries = [...usedStyleKeys]
    .sort()
    .map((styleKey) => [styleKey, blockPlan.resolveFontSize(styleKey)])
  return stablePageExportCacheStringify(entries)
}

function buildPageExportLoremDocumentVariableCacheKey({
  blockPlan,
  context,
  layoutEngine,
  includeMaxLoremLines = true,
}: {
  blockPlan: ResolvedBlockPlan
  context: DocumentVariableContext
  layoutEngine: LayoutEngineContract
  includeMaxLoremLines?: boolean
}): string {
  return stablePageExportCacheStringify({
    rawText: blockPlan.rawText,
    context: getRelevantDocumentVariableContextKey(blockPlan.rawText, context),
    baseFormat: blockPlan.baseFormat,
    formatRuns: blockPlan.rawFormatRuns,
    trackingScale: blockPlan.trackingScale,
    trackingRuns: blockPlan.rawTrackingRuns,
    maxLoremLines: includeMaxLoremLines ? blockPlan.maxLoremLines : undefined,
    wrapWidth: blockPlan.wrapWidth,
    hyphenate: blockPlan.hyphenate,
    fontFamily: blockPlan.fontFamily,
    fontWeight: blockPlan.fontWeight,
    italic: blockPlan.italic,
    baseFontSize: blockPlan.baseFontSize,
    baseCanvasFont: blockPlan.baseCanvasFont,
    opticalKerning: blockPlan.opticalKerning,
    resolveFontSize: buildPageExportResolveFontSizeKey(blockPlan),
    layoutEngine,
  })
}

function getNormalizedPageExportTrackingRuns(
  sourceText: string,
  trackingRuns: readonly TextTrackingRun[] | null | undefined,
  trackingScale: number,
): TextTrackingRun[] {
  if (!trackingRuns || trackingRuns.length === 0) return EMPTY_TRACKING_RUNS
  let cacheBySource = normalizedPageExportTrackingRunsCache.get(trackingRuns)
  if (!cacheBySource) {
    cacheBySource = new Map<string, readonly TextTrackingRun[]>()
    normalizedPageExportTrackingRunsCache.set(trackingRuns, cacheBySource)
  }
  const key = `${trackingScale}::${sourceText}`
  const cached = cacheBySource.get(key)
  if (cached) return cached as TextTrackingRun[]
  return rememberPageExportCachedValue(
    cacheBySource,
    key,
    normalizeTextTrackingRuns(sourceText, trackingRuns, trackingScale),
  ) as TextTrackingRun[]
}

function getExportFormatRunsForScheme(
  formatRuns: readonly TextFormatRun<TypographyStyleKey, FontFamily>[] | null | undefined,
  imageColorScheme: ImageColorSchemeId,
  resolveExportTextColor: (value: unknown) => string,
  fallbackFontFamily: FontFamily,
): readonly TextFormatRun<TypographyStyleKey, FontFamily>[] {
  if (!formatRuns || formatRuns.length === 0) return EMPTY_FORMAT_RUNS
  let cacheByScheme = exportFormatRunsBySchemeCache.get(formatRuns)
  if (!cacheByScheme) {
    cacheByScheme = new Map<string, readonly TextFormatRun<TypographyStyleKey, FontFamily>[]>()
    exportFormatRunsBySchemeCache.set(formatRuns, cacheByScheme)
  }
  const cacheKey = `${imageColorScheme}::${fallbackFontFamily}`
  const cached = cacheByScheme.get(cacheKey)
  if (cached) return cached
  let changed = false
  const resolvedRuns = formatRuns.map((run) => {
    let nextRun = run
    if (run.fontFamily !== undefined) {
      const nextFontFamily = resolveFontFamily(run.fontFamily, fallbackFontFamily)
      if (nextFontFamily !== run.fontFamily) {
        changed = true
        nextRun = { ...nextRun, fontFamily: nextFontFamily }
      }
    }
    if (run.color === undefined) return nextRun
    const nextColor = resolveExportTextColor(run.color)
    if (nextColor === run.color) return nextRun
    changed = true
    return { ...nextRun, color: nextColor }
  })
  return rememberPageExportCachedValue(
    cacheByScheme,
    cacheKey,
    changed ? resolvedRuns : formatRuns,
  )
}

function getNormalizedPageExportFormatRuns(
  sourceText: string,
  formatRuns: readonly TextFormatRun<TypographyStyleKey, FontFamily>[] | null | undefined,
  baseFormat: ResolvedBlockPlan["baseFormat"],
): TextFormatRun<TypographyStyleKey, FontFamily>[] {
  if (!formatRuns || formatRuns.length === 0) return EMPTY_FORMAT_RUNS
  let cacheBySignature = normalizedPageExportFormatRunsCache.get(formatRuns)
  if (!cacheBySignature) {
    cacheBySignature = new Map<string, readonly TextFormatRun<TypographyStyleKey, FontFamily>[]>()
    normalizedPageExportFormatRunsCache.set(formatRuns, cacheBySignature)
  }
  const key = `${getPageExportBaseFormatKey(baseFormat)}::${sourceText}`
  const cached = cacheBySignature.get(key)
  if (cached) return cached as TextFormatRun<TypographyStyleKey, FontFamily>[]
  return rememberPageExportCachedValue(
    cacheBySignature,
    key,
    normalizeTextFormatRuns(sourceText, formatRuns, baseFormat),
  ) as TextFormatRun<TypographyStyleKey, FontFamily>[]
}

function getNowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now()
}

type PageExportGridGeometry = {
  moduleWidths: number[]
  moduleHeights: number[]
  colStarts: number[]
  rowStarts: number[]
  rowStartsInBaselines: number[]
  firstColumnStep: number
  firstRowStep: number
}

type HeightMetricsResolver = (
  rows: number | undefined,
  baselines: number | undefined,
) => ReturnType<typeof normalizeHeightMetrics>

type PageExportGuidePlan = {
  pageOutline: PageExportPlan["pageOutline"]
  guideGroups: PageExportGuideGroup[]
}

type BuildPageExportGuidePlanArgs = {
  result: GridResult
  geometry: PageExportGridGeometry
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
}

type BuildPageExportImagePlansArgs = {
  imageOrder: BlockId[]
  imageColorScheme: ImageColorSchemeId
  imageModulePositions: PreviewLayoutState["imageModulePositions"]
  imageColumnSpans: PreviewLayoutState["imageColumnSpans"]
  imageRowSpans: PreviewLayoutState["imageRowSpans"]
  imageHeightBaselines: PreviewLayoutState["imageHeightBaselines"]
  imageSnapToColumns: PreviewLayoutState["imageSnapToColumns"]
  imageSnapToBaseline: PreviewLayoutState["imageSnapToBaseline"]
  imageRotations: PreviewLayoutState["imageRotations"]
  imageColors: PreviewLayoutState["imageColors"]
  imageOpacities: PreviewLayoutState["imageOpacities"]
  geometry: PageExportGridGeometry
  contentLeft: number
  baselineOriginTop: number
  baselineStep: number
  maxBaselineRow: number
  gridCols: number
  gridRows: number
  gridUnit: number
  gutterX: number
  gutterY: number
  fallbackModuleHeight: number
  getHeightMetrics: HeightMetricsResolver
}

const PAGE_EXPORT_GRID_GEOMETRY_CACHE_LIMIT = 512
const pageExportGridGeometryCache = new Map<string, PageExportGridGeometry>()

function formatGeometryCacheNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6) : String(value)
}

function formatGeometryCacheArray(values: readonly number[] | undefined): string {
  return Array.isArray(values)
    ? values.map(formatGeometryCacheNumber).join(",")
    : ""
}

function rememberPageExportGridGeometry(
  key: string,
  geometry: PageExportGridGeometry,
): PageExportGridGeometry {
  pageExportGridGeometryCache.set(key, geometry)
  if (pageExportGridGeometryCache.size > PAGE_EXPORT_GRID_GEOMETRY_CACHE_LIMIT) {
    const oldestKey = pageExportGridGeometryCache.keys().next().value
    if (oldestKey) pageExportGridGeometryCache.delete(oldestKey)
  }
  return geometry
}

function buildPageExportGridGeometryCacheKey(result: GridResult): string {
  const { gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
  const { width: modW, height: modH, widths, heights } = result.module
  const { gridCols, gridRows } = result.settings
  return [
    gridCols,
    gridRows,
    formatGeometryCacheNumber(modW),
    formatGeometryCacheNumber(modH),
    formatGeometryCacheNumber(gridUnit),
    formatGeometryCacheNumber(gridMarginHorizontal),
    formatGeometryCacheNumber(gridMarginVertical),
    formatGeometryCacheArray(widths),
    formatGeometryCacheArray(heights),
    formatGeometryCacheArray(result.grid.columnStarts),
  ].join("|")
}

function resolvePageExportGridGeometry(result: GridResult): PageExportGridGeometry {
  const cacheKey = buildPageExportGridGeometryCacheKey(result)
  const cached = pageExportGridGeometryCache.get(cacheKey)
  if (cached) {
    pageExportGridGeometryCache.delete(cacheKey)
    pageExportGridGeometryCache.set(cacheKey, cached)
    return cached
  }

  const { gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
  const { width: modW, height: modH } = result.module
  const { gridCols, gridRows } = result.settings
  const moduleWidths = resolveAxisSizes(result.module.widths, gridCols, modW)
  const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, modH)
  const colStarts = resolveGridColumnStarts(result, moduleWidths)
  const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
  const rowStartsInBaselines = rowStarts.map((value) => value / Math.max(0.0001, gridUnit))
  const firstColumnStep = resolveGridFirstColumnStep(moduleWidths, colStarts, gridMarginHorizontal, modW)
  const firstRowStep = (moduleHeights[0] ?? modH) + gridMarginVertical

  return rememberPageExportGridGeometry(cacheKey, {
    moduleWidths,
    moduleHeights,
    colStarts,
    rowStarts,
    rowStartsInBaselines,
    firstColumnStep,
    firstRowStep,
  })
}

function buildPageExportGuidePlan({
  result,
  geometry,
  showBaselines,
  showModules,
  showMargins,
}: BuildPageExportGuidePlanArgs): PageExportGuidePlan {
  const sourceWidth = result.pageSizePt.width
  const sourceHeight = result.pageSizePt.height
  const { margins, gridUnit } = result.grid
  const { width: modW, height: modH } = result.module
  const { gridCols, gridRows } = result.settings
  const {
    moduleWidths,
    moduleHeights,
    colStarts,
    rowStarts,
    firstColumnStep,
    firstRowStep,
  } = geometry
  const showPageOutline = showMargins || showModules || showBaselines
  const guideContentTop = margins.top
  const guideBaselineSpacing = gridUnit
  const guideBaselineRows = Math.max(
    0,
    Math.round((sourceHeight - (margins.top + margins.bottom)) / guideBaselineSpacing),
  )
  const guideContentBottom = guideContentTop + guideBaselineRows * guideBaselineSpacing
  const pageOutline = showPageOutline
    ? {
      strokeColor: { r: 229, g: 229, b: 229 },
      strokeWidth: 0.4,
    }
    : null

  const guideGroups: PageExportGuideGroup[] = []
  if (showMargins) {
    guideGroups.push({
      id: "margins",
      strokeColor: { r: 59, g: 130, b: 246 },
      strokeWidth: 0.5,
      dashPattern: [4, 4],
      clipToPage: false,
      lines: [],
      rects: (result.grid.contentRects ?? [{
        x: margins.left,
        y: guideContentTop,
        width: sourceWidth - (margins.left + margins.right),
        height: guideContentBottom - guideContentTop,
      }]).map((rect) => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })),
    })
  }

  if (showModules) {
    const rects: PageExportRect[] = []
    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        rects.push({
          x: margins.left + (colStarts[col] ?? col * firstColumnStep),
          y: margins.top + (rowStarts[row] ?? row * firstRowStep),
          width: moduleWidths[col] ?? modW,
          height: moduleHeights[row] ?? modH,
        })
      }
    }
    guideGroups.push({
      id: "modules",
      strokeColor: { r: 6, g: 182, b: 212 },
      strokeWidth: 0.4,
      dashPattern: [],
      clipToPage: false,
      lines: [],
      rects,
    })
  }

  if (showBaselines) {
    const lines: PageExportLine[] = []
    const halfDiag = Math.sqrt(sourceWidth * sourceWidth + sourceHeight * sourceHeight) / 2
    const extStartY = guideContentTop - halfDiag
    const extEndY = sourceHeight + halfDiag
    const rowsAbove = Math.ceil((guideContentTop - extStartY) / guideBaselineSpacing)
    const startY = guideContentTop - rowsAbove * guideBaselineSpacing
    const totalRows = Math.ceil((extEndY - startY) / guideBaselineSpacing)
    for (let row = 0; row <= totalRows; row += 1) {
      const y = startY + row * guideBaselineSpacing
      if (y > extEndY) break
      lines.push({
        x1: -halfDiag,
        y1: y,
        x2: sourceWidth + halfDiag,
        y2: y,
      })
    }
    guideGroups.push({
      id: "baselines",
      strokeColor: { r: 236, g: 72, b: 153 },
      strokeWidth: 0.3,
      dashPattern: [],
      clipToPage: true,
      lines,
      rects: [],
    })
  }

  return {
    pageOutline,
    guideGroups,
  }
}

function buildPageExportImagePlans({
  imageOrder,
  imageColorScheme,
  imageModulePositions: storedImageModulePositions = {},
  imageColumnSpans = {},
  imageRowSpans = {},
  imageHeightBaselines = {},
  imageSnapToColumns = {},
  imageSnapToBaseline = {},
  imageRotations = {},
  imageColors = {},
  imageOpacities = {},
  geometry,
  contentLeft,
  baselineOriginTop,
  baselineStep,
  maxBaselineRow,
  gridCols,
  gridRows,
  gridUnit,
  gutterX,
  gutterY,
  fallbackModuleHeight,
  getHeightMetrics,
}: BuildPageExportImagePlansArgs): PageExportImagePlan[] {
  const imageModulePositions = mapTextBlockPositionsToAbsolute(
    storedImageModulePositions,
    geometry.rowStartsInBaselines,
  )
  const fallbackImageColor = parseHexColor(resolveImageSchemeColor(undefined, imageColorScheme)) ?? { r: 11, g: 53, b: 54 }
  const imagePlans: PageExportImagePlan[] = []

  for (const key of imageOrder) {
    const manual = imageModulePositions[key]
    if (!manual || typeof manual.col !== "number" || typeof manual.row !== "number") continue

    const height = getHeightMetrics(imageRowSpans[key], imageHeightBaselines[key])
    const geometryPlan = buildImagePlaceholderGeometryPlan({
      key,
      position: manual,
      getImageSpan: (imageKey) => imageColumnSpans[imageKey] ?? 1,
      getImageRows: () => height.rows,
      getImageHeightBaselines: () => height.baselines,
      getImageRotation: (imageKey) => imageRotations[imageKey] ?? 0,
      isImageSnapToColumnsEnabled: (imageKey) => imageSnapToColumns[imageKey] !== false,
      isImageSnapToBaselineEnabled: (imageKey) => imageSnapToBaseline[imageKey] !== false,
      toColumnX: (col) => contentLeft + resolvePreviewColumnX(col, geometry.colStarts, geometry.firstColumnStep),
      baselineOriginTop,
      baselineStep,
      baselineStepForHeight: gridUnit,
      maxBaselineRow,
      gridCols,
      rowStartsInBaselines: geometry.rowStartsInBaselines,
      gridRows,
      moduleWidths: geometry.moduleWidths,
      moduleHeights: geometry.moduleHeights,
      columnStarts: geometry.colStarts,
      gutterX,
      gutterY,
      fallbackModuleHeight,
    })
    imagePlans.push({
      key,
      x: geometryPlan.x,
      y: geometryPlan.y,
      width: geometryPlan.width,
      height: geometryPlan.height,
      fillColor: parseHexColor(resolveImageSchemeColor(imageColors[key], imageColorScheme)) ?? fallbackImageColor,
      opacity: normalizeImagePlaceholderOpacity(imageOpacities[key]),
      rotation: geometryPlan.rotation,
      rotationOriginX: geometryPlan.rotationOriginX,
      rotationOriginY: geometryPlan.rotationOriginY,
    })
  }

  return imagePlans
}

function createFallbackTextMetrics(text: string, font: string): TextMetrics {
  const match = font.match(/(\d+(?:\.\d+)?)px/)
  const fontSize = match ? Number(match[1]) : 16
  const safeFontSize = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16
  const width = text.length * safeFontSize * 0.56
  return {
    width,
    actualBoundingBoxAscent: safeFontSize * 0.8,
    actualBoundingBoxDescent: safeFontSize * 0.2,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: width,
    fontBoundingBoxAscent: safeFontSize * 0.8,
    fontBoundingBoxDescent: safeFontSize * 0.2,
    emHeightAscent: safeFontSize * 0.8,
    emHeightDescent: safeFontSize * 0.2,
    hangingBaseline: safeFontSize * 0.8,
    alphabeticBaseline: 0,
    ideographicBaseline: -safeFontSize * 0.2,
  } as TextMetrics
}

function createTextMeasureContext(): TextMeasureContext {
  if (typeof document === "undefined") {
    return {
      font: "",
      fontKerning: "none",
      measureText(text: string) {
        return createFallbackTextMetrics(text, this.font)
      },
    }
  }
  const canvas = document.createElement("canvas")
  return canvas.getContext("2d") ?? {
    font: "",
    fontKerning: "none",
    measureText(text: string) {
      return createFallbackTextMetrics(text, this.font)
    },
  }
}

function reconcileLayerOrder(
  current: readonly BlockId[],
  blockOrder: readonly BlockId[],
  imageOrder: readonly BlockId[],
): BlockId[] {
  const validKeys = new Set<BlockId>([...imageOrder, ...blockOrder])
  const next: BlockId[] = []
  const seen = new Set<BlockId>()

  for (const key of current) {
    if (!validKeys.has(key) || seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of imageOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of blockOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  return next
}

function buildPageExportPlanInternal({
  result,
  layout,
  documentVariableContext = null,
  baseFont = DEFAULT_BASE_FONT,
  imageColorScheme,
  canvasBackground = null,
  rotation,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders,
  showTypography,
  includeGraphemeLines = true,
  layoutEngine = CURRENT_LAYOUT_ENGINE_CONTRACT,
  rawDocumentVariableBlockKey = null,
  textMetricsEngineFactory,
  textMetricsService,
  textWrapTraceCollector,
  timingCollector,
}: BuildPageExportPlanArgs): PageExportPlan {
  const sourceWidth = result.pageSizePt.width
  const sourceHeight = result.pageSizePt.height
  const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
  const { width: modW, height: modH } = result.module
  const { gridCols, gridRows } = result.settings
  const profilePhases = isLayoutProfilingEnabled()
  const phaseAccumulator: PageExportPlanPhaseAccumulator | null = profilePhases || timingCollector
    ? {
        resolveBlocksMs: 0,
        documentVariablesMs: 0,
        wrapTextMs: 0,
        textMeasureWidthMs: 0,
        textAscentMs: 0,
        textDescentMs: 0,
        opticalOffsetsMs: 0,
        paragraphBoxesMs: 0,
        lineCommandsMs: 0,
        glyphGraphemesMs: 0,
        glyphSegmentsMs: 0,
        resolveFontTrackingGraphemesMs: 0,
        measureFormattedTextRangeWidthMs: 0,
        graphemeAdvanceMs: 0,
        graphemeMetricsMs: 0,
        layerOrderMs: 0,
      }
    : null
  const geometry = measurePageExportPlanDiagnostic(
    "buildPageExportPlan.geometry",
    () => resolvePageExportGridGeometry(result),
    profilePhases,
    timingCollector,
    {
      cols: gridCols,
      rows: gridRows,
    },
    `cols=${gridCols} rows=${gridRows}`,
  )
  const {
    moduleWidths,
    moduleHeights,
    colStarts,
    rowStartsInBaselines,
    firstColumnStep,
  } = geometry
  const contentTop = margins.top
  const contentLeft = margins.left
  const baselineStep = gridUnit
  const baselineOriginTop = contentTop - baselineStep
  const maxBaselineRow = Math.max(
    0,
    Math.floor((sourceHeight - margins.top - margins.bottom) / gridUnit),
  )

  const backgroundColor = canvasBackground
    ? parseHexColor(resolveImageSchemeColor(canvasBackground, imageColorScheme))
    : null

  const { pageOutline, guideGroups } = measurePageExportPlanDiagnostic(
    "buildPageExportPlan.guides",
    () => buildPageExportGuidePlan({
      result,
      geometry,
      showBaselines,
      showModules,
      showMargins,
    }),
    profilePhases,
    timingCollector,
    {
      baselines: showBaselines,
      modules: showModules,
      margins: showMargins,
    },
    `baselines=${showBaselines} modules=${showModules} margins=${showMargins}`,
  )

  const imageOrder = layout?.imageOrder?.filter(
    (key): key is BlockId => typeof key === "string" && key.length > 0,
  ) ?? []
  const storedImageModulePositions = layout?.imageModulePositions ?? {}
  const imageColumnSpans = layout?.imageColumnSpans ?? {}
  const imageRowSpans = layout?.imageRowSpans ?? {}
  const imageHeightBaselines = layout?.imageHeightBaselines ?? {}
  const imageSnapToColumns = layout?.imageSnapToColumns ?? {}
  const imageSnapToBaseline = layout?.imageSnapToBaseline ?? {}
  const imageRotations = layout?.imageRotations ?? {}
  const imageColors = layout?.imageColors ?? {}
  const imageOpacities = layout?.imageOpacities ?? {}
  const defaultTextColor = getDefaultTextSchemeColor(imageColorScheme)
  const heightMetricsByInput = new Map<string, ReturnType<typeof normalizeHeightMetrics>>()
  const getHeightMetrics = (rows: number | undefined, baselines: number | undefined) => {
    const key = `${rows ?? ""}|${baselines ?? ""}|${gridRows}`
    const cached = heightMetricsByInput.get(key)
    if (cached) return cached
    const resolved = normalizeHeightMetrics({
      rows,
      baselines,
      gridRows,
    })
    heightMetricsByInput.set(key, resolved)
    return resolved
  }
  const getReflowRowHeights = (
    rowStart: number,
    rowSpan: number,
    heightBaselines: number,
    lineStep: number,
  ): number[] => {
    if (rowSpan <= 0) {
      return [Math.max(heightBaselines * baselineStep, lineStep)]
    }

    return Array.from({ length: Math.max(1, rowSpan) }, (_, rowOffset) => {
      const rowIndex = rowStart + rowOffset
      const rowHeight = rowIndex < 0 || rowIndex >= gridRows
        ? modH
        : moduleHeights[rowIndex] ?? modH
      const extraHeight = rowOffset === rowSpan - 1 ? heightBaselines * baselineStep : 0
      return rowHeight + extraHeight
    })
  }

  const imagePlans = showImagePlaceholders
    ? measurePageExportPlanDiagnostic(
        "buildPageExportPlan.images",
        () => buildPageExportImagePlans({
          imageOrder,
          imageColorScheme,
          imageModulePositions: storedImageModulePositions,
          imageColumnSpans,
          imageRowSpans,
          imageHeightBaselines,
          imageSnapToColumns,
          imageSnapToBaseline,
          imageRotations,
          imageColors,
          imageOpacities,
          geometry,
          contentLeft,
          baselineOriginTop,
          baselineStep,
          maxBaselineRow,
          gridCols,
          gridRows,
          gridUnit,
          gutterX: gridMarginHorizontal,
          gutterY: gridMarginVertical,
          fallbackModuleHeight: modH,
          getHeightMetrics,
        }),
        profilePhases,
        timingCollector,
        {
          placeholders: imageOrder.length,
        },
        `placeholders=${imageOrder.length}`,
      )
    : []

  const styleDefinitions = result.typography.styles
  const blockOrder = layout?.blockOrder?.filter((key): key is BlockId => typeof key === "string" && key.length > 0) ?? [...BASE_BLOCK_IDS]
  const textContent: Record<BlockId, string> = layout?.textContent
    ? { ...layout.textContent }
    : { ...DEFAULT_TEXT_CONTENT } as Record<BlockId, string>
  const styleAssignments: Record<BlockId, TypographyStyleKey> = layout?.styleAssignments
    ? { ...layout.styleAssignments }
    : { ...DEFAULT_STYLE_ASSIGNMENTS } as Record<BlockId, TypographyStyleKey>
  const blockFontFamilies = layout?.blockFontFamilies ?? {}
  const blockColumnSpans = layout?.blockColumnSpans ?? {}
  const blockRowSpans = layout?.blockRowSpans ?? {}
  const blockHeightBaselines = layout?.blockHeightBaselines ?? {}
  const blockTextAlignments = layout?.blockTextAlignments ?? {}
  const blockVerticalAlignments = layout?.blockVerticalAlignments ?? {}
  const blockTextReflow = layout?.blockTextReflow ?? {}
  const blockSyllableDivision = layout?.blockSyllableDivision ?? {}
  const blockSnapToColumns = layout?.blockSnapToColumns ?? {}
  const blockFontWeights = layout?.blockFontWeights ?? {}
  const blockOpticalKerning = layout?.blockOpticalKerning ?? {}
  const blockTrackingScales = layout?.blockTrackingScales ?? {}
  const blockTrackingRuns = layout?.blockTrackingRuns ?? {}
  const blockTextFormatRuns = layout?.blockTextFormatRuns ?? {}
  const blockItalic = layout?.blockItalic ?? {}
  const blockRotations = layout?.blockRotations ?? {}
  const blockCustomSizes = layout?.blockCustomSizes ?? {}
  const blockCustomLeadings = layout?.blockCustomLeadings ?? {}
  const blockTextColors = layout?.blockTextColors ?? {}
  const storedBlockModulePositions = layout?.blockModulePositions ?? {}
  const blockModulePositions = mapTextBlockPositionsToAbsolute(storedBlockModulePositions, rowStartsInBaselines)
  const orderedLayerKeys = reconcileLayerOrder(
    layout?.layerOrder?.filter((key): key is BlockId => typeof key === "string" && key.length > 0) ?? [],
    blockOrder,
    imageOrder,
  )

  const textMeasureContext = createTextMeasureContext()
  const textMetrics = textMetricsService ?? createTextMetricsService<TypographyStyleKey, FontFamily>({
    metricsEngineFactory: textMetricsEngineFactory ?? resolveLayoutTextMetricsEngineFactory(layoutEngine),
  })

  const getStyleKeyForBlock = (key: BlockId): TypographyStyleKey => {
    const assigned = styleAssignments[key]
    if (assigned && Object.hasOwn(styleDefinitions, assigned)) return assigned
    if (isBaseBlockId(key)) return DEFAULT_STYLE_ASSIGNMENTS[key] as TypographyStyleKey
    return "body"
  }
  const getStyleDefaultItalic = (styleKey: TypographyStyleKey) => styleDefinitions[styleKey]?.blockItalic === true
  const getStyleDefaultWeight = (styleKey: TypographyStyleKey) => (
    getStyleDefaultFontWeight(styleDefinitions[styleKey]?.weight)
  )
  const resolveExportTextColor = (value: unknown) => resolveTextSchemeColor(value, imageColorScheme)

  const resolveBlockPlan = (key: BlockId): ResolvedBlockPlan => {
    const styleKey = getStyleKeyForBlock(key)
    const span = Math.max(1, Math.min(gridCols, blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)))
    const heightMetrics = getHeightMetrics(blockRowSpans[key], blockHeightBaselines[key])
    const rowSpan = heightMetrics.rows
    const heightBaselines = heightMetrics.baselines
    const snapToColumns = blockSnapToColumns[key] !== false
    const manualPosition = blockModulePositions[key]
    const isManualPosition = Boolean(
      manualPosition
      && typeof manualPosition.col === "number"
      && typeof manualPosition.row === "number",
    )
    const startCol = (() => {
      if (!manualPosition || typeof manualPosition.col !== "number") return 0
      const { minCol } = resolveLayerColumnBounds({
        span,
        gridCols,
        snapToColumns,
      })
      const rawCol = snapToColumns ? manualPosition.col : Math.round(manualPosition.col)
      return Math.max(minCol, Math.min(Math.max(0, gridCols - 1), rawCol))
    })()
    const startRow = (
      manualPosition && typeof manualPosition.row === "number"
        ? Math.max(
            0,
            Math.min(Math.max(0, gridRows - 1), findNearestAxisIndex(rowStartsInBaselines, manualPosition.row)),
          )
        : 0
    )
    const blockHeight = resolveBlockHeight({
      rowStart: startRow,
      rows: rowSpan,
      baselines: heightBaselines,
      gridRows,
      moduleHeights,
      fallbackModuleHeight: modH,
      gutterY: gridMarginVertical,
      baselineStep,
    })
    const spanWidth = sumGridColumnSpan(moduleWidths, colStarts, startCol, span, gridMarginHorizontal)
    let reflowColumnWidth = Number.POSITIVE_INFINITY
    for (let columnIndex = 0; columnIndex < Math.max(1, span); columnIndex += 1) {
      const width = moduleWidths[startCol + columnIndex] ?? modW
      if (width < reflowColumnWidth) reflowColumnWidth = width
    }
    const reflowEnabled = resolveTextReflowEnabled(key, styleKey, span, blockTextReflow) && span >= 2
    const wrapWidth = reflowEnabled
      ? (Number.isFinite(reflowColumnWidth) && reflowColumnWidth > 0 ? reflowColumnWidth : modW)
      : (Number.isFinite(spanWidth) && spanWidth > 0
          ? spanWidth
          : span * modW + Math.max(0, span - 1) * gridMarginHorizontal)
    const fontFamily = resolveFontFamily(blockFontFamilies[key], baseFont)
    const weightOverride = blockFontWeights[key]
    const requestedWeight = typeof weightOverride === "number" && Number.isFinite(weightOverride) && weightOverride > 0
      ? weightOverride
      : getStyleDefaultWeight(styleKey)
    const italicOverride = blockItalic[key]
    const requestedItalic = italicOverride === true || italicOverride === false
      ? italicOverride
      : getStyleDefaultItalic(styleKey)
    const variant = resolveFontVariant(fontFamily, requestedWeight, requestedItalic)
    const opticalKerning = normalizeOpticalKerning(blockOpticalKerning[key] ?? DEFAULT_OPTICAL_KERNING)
    const trackingScale = normalizeTrackingScale(blockTrackingScales[key] ?? DEFAULT_TRACKING_SCALE)
    const resolvedTextColor = resolveExportTextColor(blockTextColors[key] ?? defaultTextColor)
    const baseFormat = {
      fontFamily,
      fontWeight: variant.weight,
      italic: variant.italic,
      styleKey,
      color: resolvedTextColor,
    }
    const rawText = textContent[key] ?? ""
    const rawTrackingRuns = getNormalizedPageExportTrackingRuns(
      rawText,
      blockTrackingRuns[key],
      trackingScale,
    )
    const exportFormatRuns = getExportFormatRunsForScheme(
      blockTextFormatRuns[key],
      imageColorScheme,
      resolveExportTextColor,
      fontFamily,
    )
    const rawFormatRuns = getNormalizedPageExportFormatRuns(
      rawText,
      exportFormatRuns,
      baseFormat,
    )
    const defaultFontSize = styleDefinitions[styleKey]?.size ?? 12
    const defaultBaselineMultiplier = styleDefinitions[styleKey]?.baselineMultiplier ?? 1
    const resolveFontSize = (segmentStyleKey: TypographyStyleKey) => {
      const styleDefaultSize = styleDefinitions[segmentStyleKey]?.size ?? defaultFontSize
      if (segmentStyleKey !== "fx") return styleDefaultSize
      const raw = blockCustomSizes[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return styleDefaultSize
      return clampFxSize(raw)
    }
    const resolvedBaselineMultiplier = styleKey !== "fx"
      ? defaultBaselineMultiplier
      : (() => {
          const raw = blockCustomLeadings[key]
          if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultBaselineMultiplier
          return Math.max(0.01, clampFxLeading(raw) / gridUnit)
        })()
    const baseFontSize = resolveFontSize(styleKey)
    const baseCanvasFont = buildCanvasFont(
      baseFormat.fontFamily,
      baseFormat.fontWeight,
      baseFormat.italic,
      baseFontSize,
    )
    const firstLineHeight = textMeasureContext
      ? textMetrics.getTextAscent(textMeasureContext, baseCanvasFont, baseFontSize)
        + textMetrics.getTextDescent(textMeasureContext, baseCanvasFont, baseFontSize)
      : baseFontSize
    const lineStep = Math.max(0.01, resolvedBaselineMultiplier * baselineStep)
    const maxLinesPerColumn = Math.max(1, reflowEnabled
      ? getTypographyReflowLineCapacityForRowHeights(
          getReflowRowHeights(startRow, rowSpan, heightBaselines, lineStep),
          lineStep,
        )
      : getTypographyLineCapacityForHeight(blockHeight, lineStep, firstLineHeight))
    const documentVariableContextForBlock = resolveSpreadDocumentVariableContextForColumn(
      documentVariableContext,
      startCol,
      gridCols,
      (result.grid.contentRects?.length ?? 0) > 1,
    ) ?? null
    const rotationRaw = blockRotations[key]
    const rotation = typeof rotationRaw !== "number" || !Number.isFinite(rotationRaw)
      ? 0
      : clampRotation(rotationRaw)
    return {
      key,
      styleKey,
      span,
      rowSpan,
      heightBaselines,
      snapToColumns,
      startCol,
      startRow,
      blockHeight,
      wrapWidth,
      reflowEnabled,
      hyphenate: resolveSyllableDivisionEnabled(key, styleKey, blockSyllableDivision),
      fontFamily,
      fontWeight: variant.weight,
      italic: variant.italic,
      opticalKerning,
      trackingScale,
      resolvedTextColor,
      baseFormat,
      defaultFontSize,
      defaultBaselineMultiplier,
      resolvedBaselineMultiplier,
      lineStep,
      baseFontSize,
      baseCanvasFont,
      rawText,
      rawTrackingRuns,
      rawFormatRuns,
      maxLoremLines: reflowEnabled ? Math.max(1, maxLinesPerColumn * span) : maxLinesPerColumn,
      documentVariableContext: documentVariableContextForBlock,
      isManualPosition,
      manualRow: manualPosition && typeof manualPosition.row === "number" ? manualPosition.row : null,
      resolveFontSize,
      rotation,
    }
  }

  const resolvedBlockPlans = new Map<BlockId, ResolvedBlockPlan>()
  const resolvedTextContent = {} as Record<BlockId, string>
  const resolvedTrackingRunsByBlock = new Map<BlockId, TextTrackingRun[]>()
  const resolvedFormatRunsByBlock = new Map<BlockId, TextFormatRun<TypographyStyleKey, FontFamily>[]>()

  for (const key of blockOrder) {
    const resolveBlockStartedAt = phaseAccumulator ? getNowMs() : 0
    const blockPlan = resolveBlockPlan(key)
    if (phaseAccumulator) {
      phaseAccumulator.resolveBlocksMs += getNowMs() - resolveBlockStartedAt
    }
    resolvedBlockPlans.set(key, blockPlan)
    const blockDocumentVariableContext = blockPlan.documentVariableContext
    const documentVariablesStartedAt = phaseAccumulator ? getNowMs() : 0
    let resolved: PageExportCachedDocumentVariableContent
    if (blockDocumentVariableContext && key !== rawDocumentVariableBlockKey && hasDocumentVariable(blockPlan.rawText)) {
      const tokenNames = readDocumentVariableTokenNames(blockPlan.rawText)
      const loremCacheKey = tokenNames.has("lorem")
        ? buildPageExportLoremDocumentVariableCacheKey({
            blockPlan,
            context: blockDocumentVariableContext,
            layoutEngine,
          })
        : null
      const loremLineCountCacheBaseKey = loremCacheKey
        ? buildPageExportLoremDocumentVariableCacheKey({
            blockPlan,
            context: blockDocumentVariableContext,
            layoutEngine,
            includeMaxLoremLines: false,
          })
        : null
      const cachedResolved = loremCacheKey
        ? readPageExportLruValue(pageExportDocumentVariableCache, loremCacheKey)
        : null

      if (cachedResolved) {
        resolved = clonePageExportDocumentVariableContent(cachedResolved)
      } else {
        const computed = resolveDocumentVariableContent({
          text: blockPlan.rawText,
          context: blockDocumentVariableContext,
          baseFormat: blockPlan.baseFormat,
          formatRuns: blockPlan.rawFormatRuns,
          baseTrackingScale: blockPlan.trackingScale,
          trackingRuns: blockPlan.rawTrackingRuns,
          resolveVariable: ({ name, rawText, rawStart, rawEnd, context }) => {
            if (name !== "lorem") return null
            const rawPrefix = rawText.slice(0, rawStart)
            const rawSuffix = rawText.slice(rawEnd)
            const canUsePlainLoremCandidate = blockPlan.rawFormatRuns.length === 0
              && blockPlan.rawTrackingRuns.length === 0
              && !rawPrefix.includes("<%")
              && !rawSuffix.includes("<%")
            return fitLoremTextToLineCapacity({
              maxLines: blockPlan.maxLoremLines,
              countLinesForCandidate: (candidate) => {
                const lineCountCacheKey = `${loremLineCountCacheBaseKey ?? "uncached"}\u0001${rawStart}\u0001${rawEnd}\u0001${candidate}`
                const cachedLineCount = readPageExportLruValue(pageExportLoremLineCountCache, lineCountCacheKey)
                if (cachedLineCount !== null) return cachedLineCount
                const candidateRawText = `${rawPrefix}${candidate}${rawSuffix}`
                const candidateResolved = canUsePlainLoremCandidate
                  ? {
                      text: candidateRawText,
                      formatRuns: EMPTY_FORMAT_RUNS,
                      trackingRuns: EMPTY_TRACKING_RUNS,
                    }
                  : resolveDocumentVariableContent({
                      text: candidateRawText,
                      context,
                      baseFormat: blockPlan.baseFormat,
                      formatRuns: blockPlan.rawFormatRuns,
                      baseTrackingScale: blockPlan.trackingScale,
                      trackingRuns: blockPlan.rawTrackingRuns,
                    })
                if (!textMeasureContext) {
                  const lineCount = wrapTextDetailed(
                    candidateResolved.text,
                    blockPlan.wrapWidth,
                    blockPlan.hyphenate,
                    (sample) => sample.length * blockPlan.baseFontSize * 0.56,
                  ).length
                  return rememberPageExportLruValue(
                    pageExportLoremLineCountCache,
                    lineCountCacheKey,
                    lineCount,
                    PAGE_EXPORT_LOREM_LINE_COUNT_CACHE_LIMIT,
                  )
                }
                applyCanvasTextConfig(textMeasureContext, {
                  font: blockPlan.baseCanvasFont,
                  opticalKerning: blockPlan.opticalKerning,
                })
                const lineCount = textMetrics.getWrappedText(
                  textMeasureContext,
                  candidateResolved.text,
                  blockPlan.wrapWidth,
                  blockPlan.hyphenate,
                  blockPlan.trackingScale,
                  blockPlan.opticalKerning,
                  candidateResolved.trackingRuns,
                  blockPlan.baseFormat,
                  candidateResolved.formatRuns,
                  blockPlan.resolveFontSize,
                  undefined,
                  blockPlan.baseCanvasFont,
                ).length
                return rememberPageExportLruValue(
                  pageExportLoremLineCountCache,
                  lineCountCacheKey,
                  lineCount,
                  PAGE_EXPORT_LOREM_LINE_COUNT_CACHE_LIMIT,
                )
              },
            })
          },
        })
        resolved = {
          text: computed.text,
          formatRuns: computed.formatRuns,
          trackingRuns: computed.trackingRuns,
        }
        if (loremCacheKey) {
          rememberPageExportLruValue(
            pageExportDocumentVariableCache,
            loremCacheKey,
            clonePageExportDocumentVariableContent(resolved),
            PAGE_EXPORT_DOCUMENT_VARIABLE_CACHE_LIMIT,
          )
        }
      }
    } else {
      resolved = {
        text: blockPlan.rawText,
        formatRuns: blockPlan.rawFormatRuns,
        trackingRuns: blockPlan.rawTrackingRuns,
      }
    }
    if (phaseAccumulator) {
      phaseAccumulator.documentVariablesMs += getNowMs() - documentVariablesStartedAt
    }

    resolvedTextContent[key] = resolved.text
    resolvedTrackingRunsByBlock.set(key, resolved.trackingRuns)
    resolvedFormatRunsByBlock.set(key, resolved.formatRuns)
  }
  const getResolvedBlockPlan = (key: BlockId): ResolvedBlockPlan => (
    resolvedBlockPlans.get(key) ?? resolveBlockPlan(key)
  )
  const getOriginForBlock = (key: BlockId, fallbackX: number, fallbackY: number) => {
    const blockPlan = getResolvedBlockPlan(key)
    if (!blockPlan.isManualPosition) {
      return { x: fallbackX, y: fallbackY }
    }
    const manual = blockModulePositions[key]
    const col = clampLayerColumn(manual?.col ?? 0, {
      span: blockPlan.span,
      gridCols,
      snapToColumns: blockPlan.snapToColumns,
    })
    const row = clampFreePlacementRow(blockPlan.manualRow ?? 0, maxBaselineRow)
    return {
      x: contentLeft + resolvePreviewColumnX(col, colStarts, firstColumnStep),
      y: baselineOriginTop + row * baselineStep,
    }
  }

  const layoutOutput = showTypography
    ? measurePageExportPlanDiagnostic(
        "buildPageExportPlan.typographyLayout",
        () => buildTypographyLayoutPlan<BlockId, TypographyStyleKey, ExportTextContext>({
      blockOrder,
      textContent: resolvedTextContent,
      styleAssignments,
      styles: styleDefinitions,
      blockTextAlignments,
      blockVerticalAlignments,
      contentTop,
      contentLeft,
      pageHeight: sourceHeight,
      marginsBottom: margins.bottom,
      baselineStep,
    moduleWidth: modW,
    moduleHeight: modH,
    moduleWidths,
    columnStarts: colStarts,
    moduleHeights,
      gutterX: gridMarginHorizontal,
      gutterY: gridMarginVertical,
      gridRows,
      gridCols,
      fontScale: 1,
      bodyKey: "body",
      displayKey: "display",
      captionKey: "caption",
      defaultBodyStyleKey: "body",
      defaultCaptionStyleKey: "caption",
      getBlockSpan: (key) => getResolvedBlockPlan(key).span,
      getBlockRows: (key) => getResolvedBlockPlan(key).rowSpan,
      getBlockHeightBaselines: (key) => getResolvedBlockPlan(key).heightBaselines,
      getBlockFontSize: ({ key, styleKey }) => getResolvedBlockPlan(key).resolveFontSize(styleKey),
      getBlockBaselineMultiplier: ({ key }) => getResolvedBlockPlan(key).resolvedBaselineMultiplier,
      getBlockRotation: (key) => getResolvedBlockPlan(key).rotation,
      isTextReflowEnabled: (key) => getResolvedBlockPlan(key).reflowEnabled,
      isSyllableDivisionEnabled: (key) => getResolvedBlockPlan(key).hyphenate,
      isBlockPositionManual: (key) => getResolvedBlockPlan(key).isManualPosition,
      getBlockColumnStart: (key) => getResolvedBlockPlan(key).startCol,
      getBlockRowStart: (key) => getResolvedBlockPlan(key).startRow,
      getOriginForBlock,
      createTextContext: ({ key, fontSize }) => {
        const blockPlan = getResolvedBlockPlan(key)
        const opticalKerning = blockPlan.opticalKerning
        const trackingScale = blockPlan.trackingScale
        const trackingRuns = resolvedTrackingRunsByBlock.get(key) ?? []
        const sourceText = resolvedTextContent[key] ?? ""
        const baseFormat = blockPlan.baseFormat
        const formatRuns = resolvedFormatRunsByBlock.get(key) ?? []
        const resolveFontSize = blockPlan.resolveFontSize
        const canvasFont = buildCanvasFont(
          blockPlan.fontFamily,
          blockPlan.fontWeight,
          blockPlan.italic,
          fontSize,
        )
        const measureWidth = (text: string, range?: { start: number; end: number }) => {
          if (textMeasureContext) {
            applyCanvasTextConfig(textMeasureContext, {
              font: canvasFont,
              opticalKerning,
            })
            const measureWidthStartedAt = phaseAccumulator ? getNowMs() : 0
            const measuredWidth = textMetrics.getMeasuredTextWidth(
              textMeasureContext,
              text,
              trackingScale,
              opticalKerning,
              sourceText,
              trackingRuns,
              range,
              baseFormat,
              formatRuns,
              resolveFontSize,
              canvasFont,
            )
            if (phaseAccumulator) {
              phaseAccumulator.textMeasureWidthMs += getNowMs() - measureWidthStartedAt
            }
            return measuredWidth
          }
          return text.length * fontSize * 0.56
        }
        return {
          canvasFont,
          opticalKerning,
          trackingScale,
          trackingRuns,
          baseFormat,
          formatRuns,
          resolveFontSize,
          sourceText,
          measureWidth,
        }
      },
      wrapText: ({ context, key, styleKey, text, maxWidth, hyphenate }) => {
        const wrapTextStartedAt = phaseAccumulator ? getNowMs() : 0
        if (!textMeasureContext) {
          const wrapped = wrapTextDetailed(text, maxWidth, hyphenate, context.measureWidth)
          if (phaseAccumulator) {
            phaseAccumulator.wrapTextMs += getNowMs() - wrapTextStartedAt
          }
          return wrapped
        }
        applyCanvasTextConfig(textMeasureContext, {
          font: context.canvasFont,
          opticalKerning: context.opticalKerning,
        })
        const wrapped = textMetrics.getWrappedText(
          textMeasureContext,
          text,
          maxWidth,
          hyphenate,
          context.trackingScale,
          context.opticalKerning,
          context.trackingRuns,
          context.baseFormat,
          context.formatRuns,
          context.resolveFontSize,
          textWrapTraceCollector
            ? (trace) => textWrapTraceCollector({
                ...trace,
                key,
                styleKey,
                canvasFont: context.canvasFont,
                maxWidth,
              })
            : undefined,
          context.canvasFont,
        )
        if (phaseAccumulator) {
          phaseAccumulator.wrapTextMs += getNowMs() - wrapTextStartedAt
        }
        return wrapped
      },
      textAscent: ({ context, fontSize }) => {
        if (!textMeasureContext) return fontSize * 0.8
        const textAscentStartedAt = phaseAccumulator ? getNowMs() : 0
        const ascent = textMetrics.getTextAscent(textMeasureContext, context.canvasFont, fontSize)
        if (phaseAccumulator) {
          phaseAccumulator.textAscentMs += getNowMs() - textAscentStartedAt
        }
        return ascent
      },
      textDescent: ({ context, fontSize }) => {
        if (!textMeasureContext) return fontSize * 0.2
        const textDescentStartedAt = phaseAccumulator ? getNowMs() : 0
        const descent = textMetrics.getTextDescent(textMeasureContext, context.canvasFont, fontSize)
        if (phaseAccumulator) {
          phaseAccumulator.textDescentMs += getNowMs() - textDescentStartedAt
        }
        return descent
      },
      opticalOffset: ({ context, styleKey, line, align, fontSize }) => {
        if (!textMeasureContext) return 0
        const opticalOffsetStartedAt = phaseAccumulator ? getNowMs() : 0
        const offset = textMetrics.getOpticalOffset(
              textMeasureContext,
              styleKey,
              line,
              align,
              fontSize,
              context.opticalKerning,
              context.canvasFont,
            )
        if (phaseAccumulator) {
          phaseAccumulator.opticalOffsetsMs += getNowMs() - opticalOffsetStartedAt
        }
        return offset
      },
      phaseAccumulator: phaseAccumulator ?? undefined,
    }),
        profilePhases,
        timingCollector,
        {
          blocks: blockOrder.length,
        },
        `blocks=${blockOrder.length}`,
      )
    : { plans: [] as TypographyLayoutPlan<BlockId, TypographyStyleKey>[], rects: {} as Record<BlockId, PageExportRect>, overflowByBlock: {} }

  const textPlans: PageExportTextPlan[] = layoutOutput.plans.map((plan) => {
    const blockPlan = getResolvedBlockPlan(plan.key)
    return {
      ...plan,
      fontFamily: blockPlan.fontFamily,
      fontWeight: blockPlan.fontWeight,
      italic: blockPlan.italic,
      leading: blockPlan.resolvedBaselineMultiplier * baselineStep,
      trackingScale: blockPlan.trackingScale,
      trackingRuns: resolvedTrackingRunsByBlock.get(plan.key) ?? [],
      opticalKerning: blockPlan.opticalKerning,
      textColor: parseHexColor(blockPlan.resolvedTextColor) ?? { r: 31, g: 41, b: 55 },
      sourceText: resolvedTextContent[plan.key] ?? "",
      segmentLines: [],
      graphemeLines: [],
    }
  })

  const positionTextGlyphs = () => {
    const measureResolvedGlyphBounds = createResolvedFontFileGlyphBoundsMeasure<TypographyStyleKey>()
    const measureResolvedPairAdvance = createResolvedFontFilePairAdvanceMeasure<TypographyStyleKey>()
    const textFormatAccumulator = phaseAccumulator
      ? {
          resolveFontTrackingGraphemesMs: 0,
          measureFormattedTextRangeWidthMs: 0,
          graphemeAdvanceMs: 0,
          graphemeMetricsMs: 0,
        }
      : null
    withTextFormatProfilingAccumulator(
      textFormatAccumulator,
      () => {
        for (const textPlan of textPlans) {
          const blockPlan = getResolvedBlockPlan(textPlan.key)
          const canvasFont = buildCanvasFont(textPlan.fontFamily, textPlan.fontWeight, textPlan.italic, textPlan.fontSize)
          const formatRuns = resolvedFormatRunsByBlock.get(textPlan.key) ?? []
          const measureGlyphBounds = formatRuns.length === 0
            ? createLoadedFontFileGlyphBoundsMeasureForCanvasFont(canvasFont) ?? undefined
            : undefined
          applyCanvasTextConfig(textMeasureContext, {
            font: canvasFont,
            opticalKerning: textPlan.opticalKerning,
          })
          const glyphArgs = {
            sourceText: textPlan.sourceText,
            textAlign: textPlan.textAlign,
            baseFormat: {
              fontFamily: textPlan.fontFamily,
              fontWeight: textPlan.fontWeight,
              italic: textPlan.italic,
              styleKey: textPlan.styleKey,
              color: blockPlan.resolvedTextColor,
            },
            formatRuns,
            baseTrackingScale: textPlan.trackingScale,
            trackingRuns: textPlan.trackingRuns,
            resolveFontSize: blockPlan.resolveFontSize,
            opticalKerning: textPlan.opticalKerning,
            measureGlyphBounds,
            measureResolvedGlyphBounds,
            measureResolvedPairAdvance,
          }
          const resolvedFormatIntervals = getResolvedFormatIntervals(
            textPlan.sourceText,
            glyphArgs.baseFormat,
            formatRuns,
          )
          const resolvedTrackingIntervals = getResolvedTrackingIntervals(
            textPlan.sourceText,
            textPlan.trackingScale,
            textPlan.trackingRuns,
          )
          if (includeGraphemeLines) {
            const glyphGraphemesStartedAt = phaseAccumulator ? getNowMs() : 0
            textPlan.graphemeLines = textPlan.commands.map((command) => buildPositionedTextFormatTrackingGraphemes(textMeasureContext, {
              ...glyphArgs,
              command,
              resolvedFormatIntervals,
              resolvedTrackingIntervals,
            }))
            if (phaseAccumulator) {
              phaseAccumulator.glyphGraphemesMs += getNowMs() - glyphGraphemesStartedAt
            }
            const glyphSegmentsStartedAt = phaseAccumulator ? getNowMs() : 0
            textPlan.segmentLines = textPlan.graphemeLines.map((graphemes) => (
              buildPositionedTextFormatTrackingSegmentsFromGraphemes(graphemes)
            ))
            if (phaseAccumulator) {
              phaseAccumulator.glyphSegmentsMs += getNowMs() - glyphSegmentsStartedAt
            }
          } else {
            textPlan.graphemeLines = []
            const glyphSegmentsStartedAt = phaseAccumulator ? getNowMs() : 0
            textPlan.segmentLines = textPlan.commands.map((command) => (
              buildPositionedTextFormatTrackingSegmentsDirect(textMeasureContext, {
                ...glyphArgs,
                command,
                resolvedFormatIntervals,
                resolvedTrackingIntervals,
              })
            ))
            if (phaseAccumulator) {
              phaseAccumulator.glyphSegmentsMs += getNowMs() - glyphSegmentsStartedAt
            }
          }
        }
      },
    )
    if (phaseAccumulator && textFormatAccumulator) {
      phaseAccumulator.resolveFontTrackingGraphemesMs += textFormatAccumulator.resolveFontTrackingGraphemesMs
      phaseAccumulator.measureFormattedTextRangeWidthMs += textFormatAccumulator.measureFormattedTextRangeWidthMs
      phaseAccumulator.graphemeAdvanceMs += textFormatAccumulator.graphemeAdvanceMs
      phaseAccumulator.graphemeMetricsMs += textFormatAccumulator.graphemeMetricsMs
    }
  }
  measurePageExportPlanDiagnostic(
    "buildPageExportPlan.positionedGlyphs",
    positionTextGlyphs,
    profilePhases,
    timingCollector,
    {
      textPlans: textPlans.length,
    },
    `textPlans=${textPlans.length}`,
  )

  const layerOrderStartedAt = phaseAccumulator ? getNowMs() : 0
  const plannedImageKeys = new Set(imagePlans.map((plan) => plan.key))
  const plannedTextKeys = new Set(textPlans.map((plan) => plan.key))
  const resolvedOrderedLayerKeys = orderedLayerKeys.filter((key) => (
    plannedImageKeys.has(key) || plannedTextKeys.has(key)
  ))
  const resolvedLayerKeySet = new Set(resolvedOrderedLayerKeys)
  for (const key of imageOrder) {
    if ((plannedImageKeys.has(key) || plannedTextKeys.has(key)) && !resolvedLayerKeySet.has(key)) {
      resolvedOrderedLayerKeys.push(key)
      resolvedLayerKeySet.add(key)
    }
  }
  for (const key of blockOrder) {
    if ((plannedImageKeys.has(key) || plannedTextKeys.has(key)) && !resolvedLayerKeySet.has(key)) {
      resolvedOrderedLayerKeys.push(key)
      resolvedLayerKeySet.add(key)
    }
  }
  if (phaseAccumulator) {
    phaseAccumulator.layerOrderMs += getNowMs() - layerOrderStartedAt
    recordLayoutPerformanceMetric("buildPageExportPlan.resolveBlocks", phaseAccumulator.resolveBlocksMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.documentVariables", phaseAccumulator.documentVariablesMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.wrapText", phaseAccumulator.wrapTextMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.textMeasureWidth", phaseAccumulator.textMeasureWidthMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.textAscent", phaseAccumulator.textAscentMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.textDescent", phaseAccumulator.textDescentMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.opticalOffsets", phaseAccumulator.opticalOffsetsMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.paragraphBoxes", phaseAccumulator.paragraphBoxesMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.lineCommands", phaseAccumulator.lineCommandsMs, {
      blocks: blockOrder.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.glyphGraphemes", phaseAccumulator.glyphGraphemesMs, {
      textPlans: textPlans.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.glyphSegments", phaseAccumulator.glyphSegmentsMs, {
      textPlans: textPlans.length,
    })
    recordLayoutPerformanceMetric(
      "buildPageExportPlan.resolveFontTrackingGraphemes",
      phaseAccumulator.resolveFontTrackingGraphemesMs,
      {
        textPlans: textPlans.length,
      },
    )
    recordLayoutPerformanceMetric(
      "buildPageExportPlan.measureFormattedTextRangeWidth",
      phaseAccumulator.measureFormattedTextRangeWidthMs,
      {
        textPlans: textPlans.length,
      },
    )
    recordLayoutPerformanceMetric("buildPageExportPlan.graphemeAdvance", phaseAccumulator.graphemeAdvanceMs, {
      textPlans: textPlans.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.graphemeMetrics", phaseAccumulator.graphemeMetricsMs, {
      textPlans: textPlans.length,
    })
    recordLayoutPerformanceMetric("buildPageExportPlan.layerOrder", phaseAccumulator.layerOrderMs, {
      layers: resolvedOrderedLayerKeys.length,
    })
    if (timingCollector) {
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.resolveBlocks", phaseAccumulator.resolveBlocksMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.documentVariables", phaseAccumulator.documentVariablesMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.wrapText", phaseAccumulator.wrapTextMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.textMeasureWidth", phaseAccumulator.textMeasureWidthMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.textAscent", phaseAccumulator.textAscentMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.textDescent", phaseAccumulator.textDescentMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.opticalOffsets", phaseAccumulator.opticalOffsetsMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.paragraphBoxes", phaseAccumulator.paragraphBoxesMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.lineCommands", phaseAccumulator.lineCommandsMs, {
        blocks: blockOrder.length,
      }, `blocks=${blockOrder.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.glyphGraphemes", phaseAccumulator.glyphGraphemesMs, {
        textPlans: textPlans.length,
      }, `textPlans=${textPlans.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.glyphSegments", phaseAccumulator.glyphSegmentsMs, {
        textPlans: textPlans.length,
      }, `textPlans=${textPlans.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.resolveFontTrackingGraphemes", phaseAccumulator.resolveFontTrackingGraphemesMs, {
        textPlans: textPlans.length,
      }, `textPlans=${textPlans.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.measureFormattedTextRangeWidth", phaseAccumulator.measureFormattedTextRangeWidthMs, {
        textPlans: textPlans.length,
      }, `textPlans=${textPlans.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.graphemeAdvance", phaseAccumulator.graphemeAdvanceMs, {
        textPlans: textPlans.length,
      }, `textPlans=${textPlans.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.graphemeMetrics", phaseAccumulator.graphemeMetricsMs, {
        textPlans: textPlans.length,
      }, `textPlans=${textPlans.length}`)
      recordAccumulatedPageExportPlanMetric(timingCollector, "buildPageExportPlan.layerOrder", phaseAccumulator.layerOrderMs, {
        layers: resolvedOrderedLayerKeys.length,
      }, `layers=${resolvedOrderedLayerKeys.length}`)
    }
  }

  return {
    pageWidth: sourceWidth,
    pageHeight: sourceHeight,
    rotation,
    backgroundColor,
    pageOutline,
    guideGroups,
    orderedLayerKeys: resolvedOrderedLayerKeys,
    imagePlans,
    textPlans,
    overflowByBlock: layoutOutput.overflowByBlock,
  }
}

export function buildPageExportPlan(args: BuildPageExportPlanArgs): PageExportPlan {
  const profilePhases = isLayoutProfilingEnabled()
  if (!profilePhases && !args.timingCollector) return buildPageExportPlanInternal(args)

  return measurePageExportPlanDiagnostic(
    "buildPageExportPlan",
    () => buildPageExportPlanInternal(args),
    profilePhases,
    args.timingCollector,
    {
      width: args.result.pageSizePt.width,
      height: args.result.pageSizePt.height,
      typography: args.showTypography,
      placeholders: args.showImagePlaceholders,
    },
    `width=${args.result.pageSizePt.width} height=${args.result.pageSizePt.height}`,
  )
}
