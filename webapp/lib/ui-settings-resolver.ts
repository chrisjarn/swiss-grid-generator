import { clampRotation } from "@/lib/block-constraints"
import {
  BASELINE_MULTIPLE_RANGE,
  GUTTER_MULTIPLE_RANGE,
  defaultGridRhythmAxisSettings,
  isGridRhythm,
  isGridRhythmColsDirection,
  isGridRhythmRowsDirection,
  isTypographyScale,
} from "@/lib/config/defaults"
import {
  getImageSchemeColorToken,
  isImageColorInScheme,
  isImageSchemeColorToken,
  normalizeImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { DEFAULT_BASE_FONT, isFontFamily } from "@/lib/config/fonts"
import {
  DEFAULT_UI,
  PREVIEW_DEFAULT_FORMAT_BY_RATIO,
  isCanvasRatioKey,
  type MarginMethod,
  type Orientation,
} from "@/lib/config/ui-defaults"
import {
  FORMAT_BASELINES,
  CUSTOM_CANVAS_FORMAT,
  clampFibonacciSequenceStartIndex,
  clampCustomCanvasRatioUnit,
  generateSwissGrid,
  getCustomCanvasFormatDimensions,
  type GridResult,
} from "@/lib/grid-calculator"
import { buildAxisStarts, resolveAxisSizes } from "@/lib/grid-rhythm"
import {
  buildCollapsedSectionState,
  SESSION_UI_SETTING_KEYS,
  type SectionKey,
  type UiSettingsSnapshot,
} from "@/lib/workspace-ui-schema"

type UiSettingsSource = Record<string, unknown>

const CANVAS_RATIO_BY_FORMAT = Object.fromEntries(
  Object.entries(PREVIEW_DEFAULT_FORMAT_BY_RATIO).map(([canvasRatio, format]) => [format, canvasRatio]),
) as Partial<Record<string, keyof typeof PREVIEW_DEFAULT_FORMAT_BY_RATIO>>
const OBSOLETE_UI_SETTING_KEYS = ["gridFibonacciSequenceStartIndex"] as const

function clampPositive(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback
  return value
}

function clampPositiveInteger(value: unknown, fallback: number): number {
  const next = clampPositive(value, fallback)
  return Math.max(1, Math.round(next))
}

function clampRange(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function resolveCanvasRatio(source: UiSettingsSource): UiSettingsSnapshot["canvasRatio"] {
  if (isCanvasRatioKey(source.canvasRatio)) return source.canvasRatio

  if (typeof source.format === "string") {
    if (source.format === CUSTOM_CANVAS_FORMAT) return "custom"
    const fromFormat = CANVAS_RATIO_BY_FORMAT[source.format]
    if (fromFormat && isCanvasRatioKey(fromFormat)) return fromFormat
    if (/^[AB]/.test(source.format)) return "din_ab"
    if (source.format === "LETTER") return "letter_ansi_ab"
  }

  return DEFAULT_UI.canvasRatio
}

function resolveCustomRatioUnit(value: unknown, fallback: number): number {
  return clampCustomCanvasRatioUnit(value, fallback)
}

function resolveOrientation(value: unknown): Orientation {
  return value === "landscape" ? "landscape" : DEFAULT_UI.orientation
}

function resolveMarginMethod(value: unknown): MarginMethod {
  return value === 2 || value === 3 ? value : DEFAULT_UI.marginMethod
}

function resolvePreviewFormat(canvasRatio: UiSettingsSnapshot["canvasRatio"]): string {
  return PREVIEW_DEFAULT_FORMAT_BY_RATIO[canvasRatio] ?? PREVIEW_DEFAULT_FORMAT_BY_RATIO[DEFAULT_UI.canvasRatio]
}

function resolveCanvasBackground(
  value: unknown,
  imageColorScheme: UiSettingsSnapshot["imageColorScheme"],
): string | null {
  if (value === null) return null
  if (isImageSchemeColorToken(value) || isImageColorInScheme(value, imageColorScheme)) {
    return value
  }
  return DEFAULT_UI.canvasBackground
}

function resolveBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function resolveCustomMarginMultipliers(value: unknown): UiSettingsSnapshot["customMarginMultipliers"] {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_UI.customMarginMultipliers }
  }

  const source = value as Partial<Record<keyof UiSettingsSnapshot["customMarginMultipliers"], unknown>>
  return {
    top: clampPositive(source.top, DEFAULT_UI.customMarginMultipliers.top),
    left: clampPositive(source.left, DEFAULT_UI.customMarginMultipliers.left),
    right: clampPositive(source.right, DEFAULT_UI.customMarginMultipliers.right),
    bottom: clampPositive(source.bottom, DEFAULT_UI.customMarginMultipliers.bottom),
  }
}

export function resolveUiSettingsSnapshot(
  source: UiSettingsSource,
  options: {
    showBaselinesFallback?: boolean
    showModulesFallback?: boolean
    showMarginsFallback?: boolean
    showImagePlaceholdersFallback?: boolean
    showTypographyFallback?: boolean
    collapsedFallback?: Record<SectionKey, boolean>
    showLayersFallback?: boolean
  } = {},
): UiSettingsSnapshot {
  const canvasRatio = resolveCanvasRatio(source)
  const previewFormat = resolvePreviewFormat(canvasRatio)
  const defaultRhythmAxis = defaultGridRhythmAxisSettings()
  const imageColorScheme = normalizeImageColorSchemeId(source.imageColorScheme) ?? DEFAULT_UI.imageColorScheme
  const resolvedCollapsedSource = (
    typeof source.collapsed === "object" && source.collapsed !== null
      ? source.collapsed as Partial<Record<SectionKey, unknown>>
      : null
  )

  return {
    canvasRatio,
    customRatioWidth: resolveCustomRatioUnit(source.customRatioWidth, DEFAULT_UI.customRatioWidth),
    customRatioHeight: resolveCustomRatioUnit(source.customRatioHeight, DEFAULT_UI.customRatioHeight),
    orientation: resolveOrientation(source.orientation),
    rotation: typeof source.rotation === "number" && Number.isFinite(source.rotation)
      ? clampRotation(source.rotation)
      : DEFAULT_UI.rotation,
    marginMethod: resolveMarginMethod(source.marginMethod),
    gridCols: clampPositiveInteger(source.gridCols, DEFAULT_UI.gridCols),
    gridRows: clampPositiveInteger(source.gridRows, DEFAULT_UI.gridRows),
    baselineMultiple: clampRange(
      source.baselineMultiple,
      DEFAULT_UI.baselineMultiple,
      BASELINE_MULTIPLE_RANGE.min,
      BASELINE_MULTIPLE_RANGE.max,
    ),
    gutterMultiple: clampRange(
      source.gutterMultiple,
      DEFAULT_UI.gutterMultiple,
      GUTTER_MULTIPLE_RANGE.min,
      GUTTER_MULTIPLE_RANGE.max,
    ),
    rhythm: isGridRhythm(source.rhythm) ? source.rhythm : DEFAULT_UI.rhythm,
    rhythmRowsEnabled: resolveBoolean(
      source.rhythmRowsEnabled,
      defaultRhythmAxis.rhythmRowsEnabled,
    ),
    rhythmRowsDirection: isGridRhythmRowsDirection(source.rhythmRowsDirection)
      ? source.rhythmRowsDirection
      : defaultRhythmAxis.rhythmRowsDirection,
    rhythmColsEnabled: resolveBoolean(
      source.rhythmColsEnabled,
      defaultRhythmAxis.rhythmColsEnabled,
    ),
    rhythmColsDirection: isGridRhythmColsDirection(source.rhythmColsDirection)
      ? source.rhythmColsDirection
      : defaultRhythmAxis.rhythmColsDirection,
    typographyScale: isTypographyScale(source.typographyScale) ? source.typographyScale : DEFAULT_UI.typographyScale,
    fibonacciSequenceStartIndex: clampFibonacciSequenceStartIndex(source.fibonacciSequenceStartIndex),
    baseFont: isFontFamily(source.baseFont) ? source.baseFont : DEFAULT_BASE_FONT,
    imageColorScheme,
    canvasBackground: resolveCanvasBackground(source.canvasBackground, imageColorScheme),
    customBaseline: clampPositive(source.customBaseline, FORMAT_BASELINES[previewFormat] ?? DEFAULT_UI.customBaseline),
    useCustomMargins: resolveBoolean(source.useCustomMargins, DEFAULT_UI.useCustomMargins),
    customMarginMultipliers: resolveCustomMarginMultipliers(source.customMarginMultipliers),
    showBaselines: resolveBoolean(source.showBaselines, options.showBaselinesFallback ?? DEFAULT_UI.showBaselines),
    showModules: resolveBoolean(source.showModules, options.showModulesFallback ?? DEFAULT_UI.showModules),
    showMargins: resolveBoolean(source.showMargins, options.showMarginsFallback ?? DEFAULT_UI.showMargins),
    showImagePlaceholders: resolveBoolean(
      source.showImagePlaceholders,
      options.showImagePlaceholdersFallback ?? DEFAULT_UI.showImagePlaceholders,
    ),
    showTypography: resolveBoolean(source.showTypography, options.showTypographyFallback ?? DEFAULT_UI.showTypography),
    showLayers: resolveBoolean(source.showLayers, options.showLayersFallback ?? DEFAULT_UI.showLayers),
    collapsed: buildCollapsedSectionState(resolvedCollapsedSource, options.collapsedFallback ?? DEFAULT_UI.collapsed),
  }
}

export function stripSessionUiSettings(source: Record<string, unknown>): Record<string, unknown> {
  const serializableSnapshot = { ...source }

  SESSION_UI_SETTING_KEYS.forEach((key) => {
    delete serializableSnapshot[key]
  })
  OBSOLETE_UI_SETTING_KEYS.forEach((key) => {
    delete serializableSnapshot[key]
  })

  return serializableSnapshot
}

export function buildSerializableUiSettingsSnapshot(snapshot: UiSettingsSnapshot): Record<string, unknown> {
  const serializableSnapshot = stripSessionUiSettings(snapshot)

  return {
    ...serializableSnapshot,
    format: resolvePreviewFormat(snapshot.canvasRatio),
  }
}

function withResolvedGridGuides(result: GridResult): GridResult {
  const moduleWidths = resolveAxisSizes(result.module.widths, result.settings.gridCols, result.module.width)
  const columnStarts = buildAxisStarts(moduleWidths, result.grid.gridMarginHorizontal)
  const contentHeight = result.pageSizePt.height - (result.grid.margins.top + result.grid.margins.bottom)

  return {
    ...result,
    grid: {
      ...result.grid,
      columnStarts,
      contentRects: [{
        x: result.grid.margins.left,
        y: result.grid.margins.top,
        width: result.pageSizePt.width - (result.grid.margins.left + result.grid.margins.right),
        height: contentHeight,
      }],
    },
  }
}

function buildFacingSpreadGridResult(singlePage: GridResult): GridResult {
  const moduleWidths = resolveAxisSizes(singlePage.module.widths, singlePage.settings.gridCols, singlePage.module.width)
  const leftColumnStarts = buildAxisStarts(moduleWidths, singlePage.grid.gridMarginHorizontal)
  const outerMargin = singlePage.grid.margins.left
  const innerMargin = singlePage.grid.margins.right
  const pageWidth = singlePage.pageSizePt.width
  const pageHeight = singlePage.pageSizePt.height
  const contentHeight = pageHeight - (singlePage.grid.margins.top + singlePage.grid.margins.bottom)
  const rightPageStart = pageWidth + innerMargin - outerMargin
  const spreadColumnStarts = [
    ...leftColumnStarts,
    ...leftColumnStarts.map((value) => value + rightPageStart),
  ]
  const spreadModuleWidths = [...moduleWidths, ...moduleWidths]
  const spreadCols = singlePage.settings.gridCols * 2

  return {
    ...singlePage,
    settings: {
      ...singlePage.settings,
      gridCols: spreadCols,
    },
    pageSizePt: {
      width: pageWidth * 2,
      height: pageHeight,
    },
    grid: {
      ...singlePage.grid,
      margins: {
        ...singlePage.grid.margins,
        right: outerMargin,
      },
      columnStarts: spreadColumnStarts,
      contentRects: [
        {
          x: outerMargin,
          y: singlePage.grid.margins.top,
          width: singlePage.contentArea.width,
          height: contentHeight,
        },
        {
          x: pageWidth + innerMargin,
          y: singlePage.grid.margins.top,
          width: singlePage.contentArea.width,
          height: contentHeight,
        },
      ],
    },
    contentArea: {
      width: singlePage.contentArea.width * 2,
      height: singlePage.contentArea.height,
    },
    module: {
      ...singlePage.module,
      widths: spreadModuleWidths,
      aspectRatio: (pageWidth * 2) / Math.max(pageHeight, 0.0001),
    },
  }
}

export function buildGridResultFromUiSettings(
  snapshot: UiSettingsSnapshot,
  options?: { layoutMode?: "single" | "facing" },
): GridResult {
  const baseline = snapshot.customBaseline
  const customMargins = snapshot.useCustomMargins
    ? {
        top: snapshot.customMarginMultipliers.top * snapshot.baselineMultiple * baseline,
        left: snapshot.customMarginMultipliers.left * snapshot.baselineMultiple * baseline,
        right: snapshot.customMarginMultipliers.right * snapshot.baselineMultiple * baseline,
        bottom: snapshot.customMarginMultipliers.bottom * snapshot.baselineMultiple * baseline,
      }
    : undefined

  const baseResult = generateSwissGrid({
    format: resolvePreviewFormat(snapshot.canvasRatio),
    customFormatDimensions: snapshot.canvasRatio === "custom"
      ? getCustomCanvasFormatDimensions(snapshot.customRatioWidth, snapshot.customRatioHeight)
      : undefined,
    orientation: snapshot.orientation,
    marginMethod: snapshot.marginMethod,
    gridCols: snapshot.gridCols,
    gridRows: snapshot.gridRows,
    baseline,
    baselineMultiple: snapshot.baselineMultiple,
    gutterMultiple: snapshot.gutterMultiple,
    rhythm: snapshot.rhythm,
    rhythmRowsEnabled: snapshot.rhythmRowsEnabled,
    rhythmRowsDirection: snapshot.rhythmRowsDirection,
    rhythmColsEnabled: snapshot.rhythmColsEnabled,
    rhythmColsDirection: snapshot.rhythmColsDirection,
    customMargins,
    typographyScale: snapshot.typographyScale,
    fibonacciSequenceStartIndex: snapshot.fibonacciSequenceStartIndex,
  })

  const normalized = withResolvedGridGuides(baseResult)
  if (options?.layoutMode === "facing") {
    return buildFacingSpreadGridResult(normalized)
  }
  return normalized
}

export function resolvePreviewFormatForCanvasRatio(canvasRatio: UiSettingsSnapshot["canvasRatio"]): string {
  return resolvePreviewFormat(canvasRatio)
}

export function resolveDefaultCanvasBackgroundColor(): string {
  return getImageSchemeColorToken(0)
}
