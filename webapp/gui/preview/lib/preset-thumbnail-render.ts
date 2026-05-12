import { clampFxSize, clampRotation } from "@/core/layout/block-constraints"
import {
  buildCanvasRenderPlansFromPageExportPlan,
  drawCanvasLayerStack,
} from "@/gui/preview/lib/canvas-page-renderer"
import {
  getStyleDefaultFontWeight,
  isFontFamily,
  resolveFontVariant,
  type FontFamily,
} from "@/core/config/fonts"
import { DEFAULT_STYLE_ASSIGNMENTS, isBaseBlockId } from "@/core/document/defaults"
import { buildAxisStarts, resolveAxisSizes } from "@/core/layout/grid-rhythm"
import { resolveGridColumnStarts } from "@/core/layout/grid-column-layout"
import type { LayoutPresetBrowserPage } from "@/lib/presets/types"
import type { PreviewLayoutState } from "@/core/types/preview-layout"
import {
  collectFontFileMetricFacesFromBlocks,
  type FontFileMetricFace,
  type FontFileMetricFaceBlock,
} from "@/core/layout/font-file-text-metrics-engine"
import { buildPageExportPlan } from "@/core/layout/page-export-plan"
import { readUiColor } from "@/styles/resolve-color"

type BlockId = string
type TypographyStyleKey = string
type ThumbnailLayout = PreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>
type TypographyStyleDefinition = {
  size: number
  leading: number
  weight: string
  blockItalic: boolean
  baselineMultiplier: number
}

type ThumbnailGuideArgs = {
  ctx: CanvasRenderingContext2D
  margins: { top: number; left: number; right: number; bottom: number }
  gridUnit: number
  gridRows: number
  gridCols: number
  moduleWidths: readonly number[]
  moduleHeights: readonly number[]
  colStarts: readonly number[]
  rowStarts: readonly number[]
  fallbackModuleWidth: number
  fallbackModuleHeight: number
  pageWidth: number
  pageHeight: number
  scale: number
  showBaselines: boolean
  showMargins: boolean
  showModules: boolean
}

export type PresetThumbnailRenderOptions = {
  showBaselines?: boolean
  showMargins?: boolean
  showModules?: boolean
  showImagePlaceholders?: boolean
  showTypography?: boolean
}

function normalizeKeys(value: unknown): BlockId[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is BlockId => typeof entry === "string" && entry.trim().length > 0)
    .filter((key, index, source) => source.indexOf(key) === index)
}

function drawThumbnailConstructionGuides({
  ctx,
  margins,
  gridUnit,
  gridRows,
  gridCols,
  moduleWidths,
  moduleHeights,
  colStarts,
  rowStarts,
  fallbackModuleWidth,
  fallbackModuleHeight,
  pageWidth,
  pageHeight,
  scale,
  showBaselines,
  showMargins,
  showModules,
}: ThumbnailGuideArgs): void {
  const contentTop = margins.top * scale
  const baselineSpacing = gridUnit * scale
  const baselineRows = Math.max(
    0,
    Math.round((pageHeight - (margins.top + margins.bottom) * scale) / Math.max(0.0001, baselineSpacing)),
  )
  const contentBottom = contentTop + baselineRows * baselineSpacing

  ctx.save()
  ctx.globalAlpha = 0.48
  ctx.strokeStyle = "#06b6d4"
  ctx.lineWidth = 0.5

  if (showModules) {
    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        const x = margins.left * scale + (colStarts[col] ?? 0) * scale
        const y = contentTop + (rowStarts[row] ?? 0) * scale
        const width = (moduleWidths[col] ?? fallbackModuleWidth) * scale
        const height = (moduleHeights[row] ?? fallbackModuleHeight) * scale
        ctx.strokeRect(x, y, width, height)
      }
    }
  }

  if (showMargins) {
    ctx.globalAlpha = 0.42
    ctx.strokeStyle = "#06b6d4"
    ctx.lineWidth = 0.6
    ctx.strokeRect(
      margins.left * scale,
      margins.top * scale,
      Math.max(0, pageWidth - (margins.left + margins.right) * scale),
      Math.max(0, pageHeight - (margins.top + margins.bottom) * scale),
    )
  }

  ctx.globalAlpha = 0.3
  ctx.strokeStyle = "#ec4899"
  ctx.lineWidth = 0.3

  if (showBaselines) {
    for (let row = 0; row <= baselineRows; row += 1) {
      const y = contentTop + row * baselineSpacing
      if (y > contentBottom + 0.0001) break
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(pageWidth, y)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function getThumbnailLayout(page: LayoutPresetBrowserPage): ThumbnailLayout | null {
  const raw = page.previewLayout
  if (!raw || typeof raw !== "object") return null
  return raw as ThumbnailLayout
}

function getStyleDefinitions(page: LayoutPresetBrowserPage): Record<TypographyStyleKey, TypographyStyleDefinition> {
  return page.result.typography.styles as Record<TypographyStyleKey, TypographyStyleDefinition>
}

function getResolvedBlockOrder(layout: ThumbnailLayout | null): BlockId[] {
  return normalizeKeys(layout?.blockOrder)
}

function getStyleKeyForBlock(
  key: BlockId,
  styleAssignments: Partial<Record<BlockId, TypographyStyleKey>>,
  styleDefinitions: Record<TypographyStyleKey, TypographyStyleDefinition>,
): TypographyStyleKey {
  const assigned = styleAssignments[key]
  if (assigned && Object.hasOwn(styleDefinitions, assigned)) return assigned
  if (isBaseBlockId(key)) return DEFAULT_STYLE_ASSIGNMENTS[key]
  return "body"
}

function getResolvedFontVariantForBlock(
  key: BlockId,
  styleKey: TypographyStyleKey,
  styleDefinitions: Record<TypographyStyleKey, TypographyStyleDefinition>,
  baseFont: FontFamily,
  layout: ThumbnailLayout | null,
) {
  const blockFontFamilies = layout?.blockFontFamilies ?? {}
  const requestedFont = blockFontFamilies[key]
  const blockFont = isFontFamily(requestedFont) ? requestedFont : baseFont
  const weightOverride = layout?.blockFontWeights?.[key]
  const requestedWeight = typeof weightOverride === "number" && Number.isFinite(weightOverride) && weightOverride > 0
    ? weightOverride
    : getStyleDefaultFontWeight(styleDefinitions[styleKey]?.weight)
  const italicOverride = layout?.blockItalic?.[key]
  const requestedItalic = italicOverride === true || italicOverride === false
    ? italicOverride
    : styleDefinitions[styleKey]?.blockItalic === true

  return {
    font: blockFont,
    variant: resolveFontVariant(blockFont, requestedWeight, requestedItalic),
  }
}

export function collectPresetThumbnailFontLoadSpecs(page: LayoutPresetBrowserPage): string[] {
  const layout = getThumbnailLayout(page)
  const blockOrder = getResolvedBlockOrder(layout)
  if (!blockOrder.length || typeof document === "undefined" || !("fonts" in document)) return []

  const styleDefinitions = getStyleDefinitions(page)
  const styleAssignments = layout?.styleAssignments ?? {}
  const blockCustomSizes = layout?.blockCustomSizes ?? {}
  const specs = new Set<string>()

  for (const key of blockOrder) {
    const styleKey = getStyleKeyForBlock(key, styleAssignments, styleDefinitions)
    const style = styleDefinitions[styleKey]
    if (!style) continue
    const defaultSize = style.size
    const rawCustomSize = blockCustomSizes[key]
    const fontSize = styleKey === "fx" && typeof rawCustomSize === "number" && Number.isFinite(rawCustomSize) && rawCustomSize > 0
      ? clampFxSize(rawCustomSize)
      : defaultSize
    const { font, variant } = getResolvedFontVariantForBlock(key, styleKey, styleDefinitions, page.baseFont, layout)
    specs.add(`${variant.italic ? "italic" : "normal"} ${variant.weight} ${Math.max(12, Math.round(fontSize))}px "${font}"`)
  }

  return [...specs]
}

export function collectPresetThumbnailFontMetricFaces(page: LayoutPresetBrowserPage): FontFileMetricFace[] {
  const layout = getThumbnailLayout(page)
  const blockOrder = getResolvedBlockOrder(layout)
  if (!blockOrder.length) return []

  const styleDefinitions = getStyleDefinitions(page)
  const styleAssignments = layout?.styleAssignments ?? {}
  const blockTextFormatRuns = layout?.blockTextFormatRuns ?? {}
  const blocks: FontFileMetricFaceBlock<TypographyStyleKey>[] = []

  for (const key of blockOrder) {
    const styleKey = getStyleKeyForBlock(key, styleAssignments, styleDefinitions)
    const style = styleDefinitions[styleKey]
    if (!style) continue
    const { font, variant } = getResolvedFontVariantForBlock(key, styleKey, styleDefinitions, page.baseFont, layout)
    blocks.push({
      styleKey,
      fontFamily: font,
      fontWeight: variant.weight,
      italic: variant.italic,
      textFormatRuns: blockTextFormatRuns[key],
    })
  }

  return collectFontFileMetricFacesFromBlocks(blocks)
}

export function drawPresetThumbnailToCanvas(
  canvas: HTMLCanvasElement,
  page: LayoutPresetBrowserPage,
  cssWidth: number,
  cssHeight: number,
  pixelRatio = 1,
  options: PresetThumbnailRenderOptions = {},
): void {
  const safeWidth = Math.max(0, cssWidth)
  const safeHeight = Math.max(0, cssHeight)
  if (safeWidth <= 0 || safeHeight <= 0) return

  const targetWidth = Math.max(1, Math.round(safeWidth * pixelRatio))
  const targetHeight = Math.max(1, Math.round(safeHeight * pixelRatio))
  if (canvas.width !== targetWidth) canvas.width = targetWidth
  if (canvas.height !== targetHeight) canvas.height = targetHeight

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const result = page.result
  const layout = getThumbnailLayout(page)

  const { width, height } = result.pageSizePt
  const { margins, gridUnit, gridMarginVertical } = result.grid
  const { width: moduleWidthBase, height: moduleHeightBase } = result.module
  const { gridCols, gridRows } = result.settings
  const moduleWidths = resolveAxisSizes(result.module.widths, gridCols, moduleWidthBase)
  const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, moduleHeightBase)
  const colStarts = resolveGridColumnStarts(result, moduleWidths)
  const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
  const scale = Math.min(safeWidth / width, safeHeight / height)
  const pageWidth = width * scale
  const pageHeight = height * scale
  const offsetX = (safeWidth - pageWidth) / 2
  const offsetY = (safeHeight - pageHeight) / 2
  const pageRotation = typeof page.uiSettings.rotation === "number" && Number.isFinite(page.uiSettings.rotation)
    ? clampRotation(page.uiSettings.rotation)
    : 0
  const showBaselines = options.showBaselines ?? true
  const showMargins = options.showMargins ?? true
  const showModules = options.showModules ?? true
  const showImagePlaceholders = options.showImagePlaceholders ?? true
  const showTypography = options.showTypography ?? true

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.clearRect(0, 0, safeWidth, safeHeight)
  ctx.imageSmoothingEnabled = true
  ctx.save()
  ctx.translate(offsetX + pageWidth / 2, offsetY + pageHeight / 2)
  ctx.rotate((pageRotation * Math.PI) / 180)
  ctx.translate(-pageWidth / 2, -pageHeight / 2)
  ctx.fillStyle = page.resolvedCanvasBackground ?? readUiColor("--color-page-default")
  ctx.fillRect(0, 0, pageWidth, pageHeight)
  ctx.beginPath()
  ctx.rect(0, 0, pageWidth, pageHeight)
  ctx.clip()
  drawThumbnailConstructionGuides({
    ctx,
    margins,
    gridUnit,
    gridRows,
    gridCols,
    moduleWidths,
    moduleHeights,
    colStarts,
    rowStarts,
    fallbackModuleWidth: moduleWidthBase,
    fallbackModuleHeight: moduleHeightBase,
    pageWidth,
    pageHeight,
    scale,
    showBaselines,
    showMargins,
    showModules,
  })

  const exportPlan = buildPageExportPlan({
    result,
    layout,
    baseFont: page.baseFont,
    imageColorScheme: page.imageColorScheme,
    canvasBackground: null,
    rotation: pageRotation,
    showBaselines: false,
    showModules: false,
    showMargins,
    showImagePlaceholders,
    showTypography,
    layoutEngine: page.layoutEngine,
  })
  const canvasRenderPlans = buildCanvasRenderPlansFromPageExportPlan(exportPlan)
  ctx.save()
  ctx.scale(scale, scale)
  drawCanvasLayerStack(
    ctx,
    canvasRenderPlans.orderedKeys,
    canvasRenderPlans.imagePlans,
    canvasRenderPlans.textPlans,
  )
  ctx.restore()

  ctx.restore()
}
