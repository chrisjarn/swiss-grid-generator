import { resolveBlockHeight } from "@/lib/block-height"
import type { FontFamily } from "@/lib/config/fonts"
import { formatSvgColor } from "@/lib/export-colors"
import { buildImagePlaceholderGeometryPlan } from "@/lib/image-placeholder-plan"
import { getOpticalTerminalCaretAdvance } from "@/lib/optical-margin"
import type { PageExportImagePlan, PageExportPlan, PageExportTextPlan } from "@/lib/page-export-plan"
import { resolveTextDrawCommandRange } from "@/lib/text-draw-command"
import type {
  BlockRenderPlan,
  BlockRect,
  RenderedTextLine,
  TextAlignMode,
  TextVerticalAlignMode,
  TextDrawCommand,
} from "@/lib/preview-types"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  splitTextForTracking,
} from "@/lib/text-rendering"
import {
  buildPositionedTextFormatTrackingGraphemes,
  type BaseTextFormat,
  type TextFormatRun,
} from "@/lib/text-format-runs"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import {
  resolveDocumentVariableContent,
  type DocumentVariableContext,
} from "@/lib/document-variable-text"
import { resolveSpreadDocumentVariableContextForColumn } from "@/lib/document-page-numbering"
import { fitLoremTextToLineCapacity } from "@/lib/document-variable-lorem"
import {
  buildTypographyLayoutPlan,
  getTypographyLineCapacityForHeight,
  getTypographyReflowLineCapacityForHeight,
} from "@/lib/typography-layout-plan"
import {
  createLoadedFontFileGlyphBoundsMeasureForCanvasFont,
  createResolvedFontFileGlyphBoundsMeasure,
  createResolvedFontFilePairAdvanceMeasure,
} from "@/lib/font-file-text-metrics-engine"
import { sumGridColumnSpan } from "@/lib/grid-column-layout"
import { resolveLayerColumnBounds } from "@/lib/layer-placement"
import type { ModulePosition } from "@/lib/types/layout-primitives"
import { resolveScaledCanvasFontSize } from "./canvas-render-math.ts"
import type { TextWrapTraceCollector, WrappedTextLine } from "./text-layout.ts"

export type CanvasImageRenderPlan = {
  rect: BlockRect
  color: string
  opacity: number
  rotation: number
  rotationOriginX: number
  rotationOriginY: number
}

type ImageDragState<Key extends string> = {
  key: Key
  preview: ModulePosition
  copyOnDrop?: boolean
}

type TypographyStyleDefinition = {
  size: number
  baselineMultiplier: number
}

type BuildCanvasImagePlansArgs<Key extends string> = {
  imageOrder: Key[]
  imageModulePositions: Partial<Record<Key, ModulePosition>>
  dragState?: ImageDragState<Key> | null
  getImageSpan: (key: Key) => number
  getImageRows: (key: Key) => number
  getImageHeightBaselines: (key: Key) => number
  getImageColor: (key: Key) => string
  getImageOpacity: (key: Key) => number
  getImageRotation: (key: Key) => number
  isImageSnapToColumnsEnabled: (key: Key) => boolean
  isImageSnapToBaselineEnabled: (key: Key) => boolean
  toColumnX: (col: number) => number
  baselineOriginTop: number
  baselineStep: number
  maxBaselineRow: number
  gridCols: number
  rowStartsInBaselines: number[]
  gridRows: number
  moduleWidths: number[]
  moduleHeights: number[]
  columnStarts: number[]
  gridMarginHorizontal: number
  gridMarginVertical: number
  scale: number
}

type BuildCanvasTypographyRenderPlansArgs<BlockId extends string, StyleKey extends string> = {
  ctx: CanvasRenderingContext2D
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  documentVariableContext?: DocumentVariableContext | null
  isFacingSpread?: boolean
  rawDocumentVariableBlockKey?: BlockId | null
  styleAssignments: Record<BlockId, StyleKey>
  styles: Record<StyleKey, TypographyStyleDefinition>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  blockVerticalAlignments: Partial<Record<BlockId, TextVerticalAlignMode>>
  contentTop: number
  contentLeft: number
  pageHeight: number
  marginsBottom: number
  baselineStep: number
  moduleWidth: number
  moduleHeight: number
  moduleWidths: number[]
  moduleHeights: number[]
  columnStarts?: number[]
  gutterX: number
  gutterY: number
  gridRows: number
  gridCols: number
  fontScale: number
  bodyKey: BlockId
  displayKey: BlockId
  captionKey: BlockId
  defaultBodyStyleKey: StyleKey
  defaultCaptionStyleKey: StyleKey
  getBlockSpan: (key: BlockId) => number
  getBlockRows: (key: BlockId) => number
  getBlockHeightBaselines: (key: BlockId) => number
  getBlockFontSize: (key: BlockId, styleKey: StyleKey) => number
  getBlockBaselineMultiplier: (key: BlockId, styleKey: StyleKey) => number
  getBlockRotation: (key: BlockId) => number
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  isBlockPositionManual?: (key: BlockId) => boolean
  getBlockColumnStart?: (key: BlockId, span: number) => number
  getBlockRowStart?: (key: BlockId, rowSpan: number) => number
  getOriginForBlock: (key: BlockId, fallbackX: number, fallbackY: number) => { x: number; y: number }
  getBlockFont: (key: BlockId, styleKey: StyleKey) => FontFamily
  getBlockFontWeight: (key: BlockId, styleKey: StyleKey) => number
  isBlockItalic: (key: BlockId, styleKey: StyleKey) => boolean
  isBlockOpticalKerningEnabled: (key: BlockId) => boolean
  getBlockTrackingScale: (key: BlockId) => number
  getBlockTrackingRuns: (key: BlockId) => TextTrackingRun[]
  getBlockTextFormatRuns: (key: BlockId, color: string) => TextFormatRun<StyleKey, FontFamily>[]
  getBlockTextColor: (key: BlockId) => string
  getWrappedText: (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
    trackingRuns?: readonly TextTrackingRun[],
    baseFormat?: BaseTextFormat<StyleKey, FontFamily>,
    formatRuns?: readonly TextFormatRun<StyleKey, FontFamily>[],
    resolveFontSize?: (styleKey: StyleKey) => number,
    trace?: TextWrapTraceCollector,
    canvasFont?: string,
  ) => WrappedTextLine[]
  getOpticalOffset: (
    ctx: CanvasRenderingContext2D,
    key: BlockId,
    styleKey: StyleKey,
    line: string,
    align: TextAlignMode,
    fontSize: number,
    opticalKerning: boolean,
    trackingScale: number,
    canvasFont?: string,
  ) => number
  getTextAscent: (
    ctx: CanvasRenderingContext2D,
    canvasFont: string,
    fallbackFontSize: number,
  ) => number
  getTextDescent: (
    ctx: CanvasRenderingContext2D,
    canvasFont: string,
    fallbackFontSize: number,
  ) => number
}

type RenderedTextMetricSegment = BlockRenderPlan<string>["segmentLines"][number][number] & {
  width?: number
  ascent?: number
  descent?: number
}

function resolveFiniteMetric(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback
}

function parseCanvasFontSize(font: string, fallback: number): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/)
  if (!match) return fallback
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function buildRenderedTextLines(
  sourceText: string,
  commands: TextDrawCommand[],
  segmentLines: BlockRenderPlan<string>["segmentLines"],
  fallbackFont: string,
): RenderedTextLine[] {
  const fallbackFontSize = parseCanvasFontSize(fallbackFont, 16)

  const renderedLines: RenderedTextLine[] = commands.map((command, lineIndex) => {
    const segments = (segmentLines[lineIndex] ?? []) as RenderedTextMetricSegment[]
    const commandRange = resolveTextDrawCommandRange(command, sourceText.length)
    const lineSourceStart = commandRange.sourceStart
    const lineSourceEnd = commandRange.sourceEnd
    if (segments.length === 0) {
      const ascent = fallbackFontSize * 0.8
      const descent = fallbackFontSize * 0.2
      return {
        sourceStart: lineSourceStart,
        sourceEnd: lineSourceEnd,
        left: command.x,
        top: command.y - ascent,
        width: 0,
        height: ascent + descent,
        baselineY: command.y,
        caretStops: [],
      }
    }

    let lineTop = Number.POSITIVE_INFINITY
    let lineBottom = Number.NEGATIVE_INFINITY
    let visualLineLeft = Number.POSITIVE_INFINITY
    const lineLeft = segments[0]?.x ?? command.x
    let lineRight = lineLeft

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const segment = segments[segmentIndex]!
      const nextSegment = segments[segmentIndex + 1]
      const ascent = resolveFiniteMetric(segment.ascent, segment.fontSize * 0.8)
      const descent = resolveFiniteMetric(segment.descent, segment.fontSize * 0.2)
      const segmentWidth = resolveFiniteMetric(
        segment.width,
        Math.max(0, (nextSegment?.x ?? segment.x) - segment.x),
      )
      lineTop = Math.min(lineTop, segment.y - ascent)
      lineBottom = Math.max(lineBottom, segment.y + descent)
      visualLineLeft = Math.min(visualLineLeft, segment.x)

      let segmentRight = nextSegment?.start === segment.end
        ? nextSegment.x
        : segment.x + segmentWidth
      if (!nextSegment && segment.end === lineSourceEnd) {
        const renderedGraphemes = splitTextForTracking(segment.text)
        const terminalAdvance = getOpticalTerminalCaretAdvance({
          char: renderedGraphemes[renderedGraphemes.length - 1] ?? "",
          font: buildCanvasFont(segment.fontFamily, segment.fontWeight, segment.italic, segment.fontSize),
          fontSize: segment.fontSize,
          styleKey: segment.styleKey,
        })
        segmentRight = terminalAdvance !== null
          ? segment.x + terminalAdvance
          : segmentRight
      }
      lineRight = Math.max(lineRight, segmentRight)
    }

    const left = Number.isFinite(visualLineLeft) ? visualLineLeft : lineLeft
    const right = lineRight
    return {
      sourceStart: lineSourceStart,
      sourceEnd: lineSourceEnd,
      left,
      top: Number.isFinite(lineTop) ? lineTop : command.y - fallbackFontSize * 0.8,
      width: Math.max(0, right - left),
      height: Math.max(1, (Number.isFinite(lineBottom) ? lineBottom : command.y + fallbackFontSize * 0.2) - (Number.isFinite(lineTop) ? lineTop : command.y - fallbackFontSize * 0.8)),
      baselineY: command.y,
      caretStops: [],
    }
  })

  return renderedLines
}

function formatCanvasPlanSignatureNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "NaN"
}

function buildCanvasTextPlanSignature({
  key,
  font,
  textColor,
  commands,
  segmentLines,
}: {
  key: string
  font: string
  textColor: string
  commands: readonly TextDrawCommand[]
  segmentLines: BlockRenderPlan<string>["segmentLines"]
}): string {
  const commandSignature = commands.map((command) => [
    command.text,
    formatCanvasPlanSignatureNumber(command.x),
    formatCanvasPlanSignatureNumber(command.y),
    command.sourceStart ?? "",
    command.sourceEnd ?? "",
  ].join(",")).join(";")
  const segmentSignature = segmentLines.map((line) => line.map((segment) => [
    segment.text,
    segment.start,
    segment.end,
    segment.styleKey,
    segment.fontFamily,
    segment.fontWeight,
    segment.italic ? 1 : 0,
    formatCanvasPlanSignatureNumber(segment.fontSize),
    formatCanvasPlanSignatureNumber(segment.trackingScale),
    formatCanvasPlanSignatureNumber(segment.x),
    formatCanvasPlanSignatureNumber(segment.y),
    formatCanvasPlanSignatureNumber(segment.width ?? 0),
  ].join(",")).join("|")).join(";")
  return [key, font, textColor, commandSignature, segmentSignature].join("::")
}

export function buildCanvasImagePlans<Key extends string>({
  imageOrder,
  imageModulePositions,
  dragState,
  getImageSpan,
  getImageRows,
  getImageHeightBaselines,
  getImageColor,
  getImageOpacity,
  getImageRotation,
  isImageSnapToColumnsEnabled,
  isImageSnapToBaselineEnabled,
  toColumnX,
  baselineOriginTop,
  baselineStep,
  maxBaselineRow,
  gridCols,
  rowStartsInBaselines,
  gridRows,
  moduleWidths,
  moduleHeights,
  columnStarts,
  gridMarginHorizontal,
  gridMarginVertical,
  scale,
}: BuildCanvasImagePlansArgs<Key>): {
  imagePlans: Map<Key, CanvasImageRenderPlan>
  imageRects: Record<Key, BlockRect>
  dragPreviewImagePlan: CanvasImageRenderPlan | null
} {
  const imagePlans = new Map<Key, CanvasImageRenderPlan>()
  const imageRects = {} as Record<Key, BlockRect>
  const imageDuplicatePreviewKey = dragState?.copyOnDrop && imageOrder.includes(dragState.key)
    ? dragState.key
    : null

  const createImagePlan = (position: ModulePosition, key: Key): CanvasImageRenderPlan => {
    const geometry = buildImagePlaceholderGeometryPlan({
      key,
      position,
      getImageSpan,
      getImageRows,
      getImageHeightBaselines,
      getImageRotation,
      isImageSnapToColumnsEnabled,
      isImageSnapToBaselineEnabled,
      toColumnX,
      baselineOriginTop,
      baselineStep,
      baselineStepForHeight: baselineStep / Math.max(scale, 0.0001),
      maxBaselineRow,
      gridCols,
      rowStartsInBaselines,
      gridRows,
      moduleWidths,
      moduleHeights,
      columnStarts,
      gutterX: gridMarginHorizontal,
      gutterY: gridMarginVertical,
      fallbackModuleHeight: moduleHeights[0] ?? 0,
      outputScale: scale,
    })
    return {
      rect: {
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height,
      },
      color: getImageColor(key),
      opacity: getImageOpacity(key),
      rotation: geometry.rotation,
      rotationOriginX: geometry.rotationOriginX,
      rotationOriginY: geometry.rotationOriginY,
    }
  }

  for (const key of imageOrder) {
    const basePosition = imageModulePositions[key]
    const position = imageDuplicatePreviewKey === key
      ? basePosition
      : dragState?.key === key
        ? dragState.preview
        : basePosition
    if (!position) continue
    const imagePlan = createImagePlan(position, key)
    imageRects[key] = imagePlan.rect
    imagePlans.set(key, imagePlan)
  }

  const dragPreviewImagePlan = imageDuplicatePreviewKey && dragState
    ? createImagePlan(dragState.preview, imageDuplicatePreviewKey)
    : null

  return { imagePlans, imageRects, dragPreviewImagePlan }
}

export function buildCanvasTypographyRenderPlans<BlockId extends string, StyleKey extends string>({
  ctx,
  blockOrder,
  textContent,
  documentVariableContext = null,
  isFacingSpread = false,
  rawDocumentVariableBlockKey = null,
  styleAssignments,
  styles,
  blockTextAlignments,
  blockVerticalAlignments,
  contentTop,
  contentLeft,
  pageHeight,
  marginsBottom,
  baselineStep,
  moduleWidth,
  moduleHeight,
  moduleWidths,
  moduleHeights,
  columnStarts,
  gutterX,
  gutterY,
  gridRows,
  gridCols,
  fontScale,
  bodyKey,
  displayKey,
  captionKey,
  defaultBodyStyleKey,
  defaultCaptionStyleKey,
  getBlockSpan,
  getBlockRows,
  getBlockHeightBaselines,
  getBlockFontSize,
  getBlockBaselineMultiplier,
  getBlockRotation,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockPositionManual,
  getBlockColumnStart,
  getBlockRowStart,
  getOriginForBlock,
  getBlockFont,
  getBlockFontWeight,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  getBlockTrackingScale,
  getBlockTrackingRuns,
  getBlockTextFormatRuns,
  getBlockTextColor,
  getWrappedText,
  getOpticalOffset,
  getTextAscent,
  getTextDescent,
}: BuildCanvasTypographyRenderPlansArgs<BlockId, StyleKey>): {
  textPlans: Map<BlockId, BlockRenderPlan<BlockId>>
  blockRects: Record<BlockId, BlockRect>
  overflowByBlock: Partial<Record<BlockId, number>>
} {
  const resolvedTextContent = {} as Record<BlockId, string>
  const resolvedTrackingRunsByBlock = new Map<BlockId, TextTrackingRun[]>()
  const resolvedFormatRunsByBlock = new Map<BlockId, TextFormatRun<StyleKey, FontFamily>[]>()

  for (const key of blockOrder) {
    const styleKey = styleAssignments[key] ?? defaultBodyStyleKey
    const baseTrackingScale = getBlockTrackingScale(key)
    const baseColor = getBlockTextColor(key)
    const span = getBlockSpan(key)
    const rowSpan = getBlockRows(key)
    const heightBaselines = getBlockHeightBaselines(key)
    const startColRaw = getBlockColumnStart?.(key, span) ?? 0
    const { minCol } = resolveLayerColumnBounds({ span, gridCols })
    const startCol = Math.max(minCol, Math.min(Math.max(0, gridCols - 1), startColRaw))
    const startRowRaw = getBlockRowStart?.(key, rowSpan) ?? 0
    const startRow = Math.max(0, Math.min(Math.max(0, gridRows - 1), startRowRaw))
    const blockHeight = resolveBlockHeight({
      rowStart: startRow,
      rows: rowSpan,
      baselines: heightBaselines,
      gridRows,
      moduleHeights,
      fallbackModuleHeight: moduleHeight,
      gutterY,
      baselineStep,
    })
    const spanWidth = sumGridColumnSpan(moduleWidths, columnStarts ?? [], startCol, span, gutterX)
    const reflowEnabled = isTextReflowEnabled(key) && span >= 2
    const reflowColumnWidth = Array.from({ length: Math.max(1, span) }, (_, columnIndex) => (
      moduleWidths[startCol + columnIndex] ?? moduleWidth
    )).reduce((smallest, width) => Math.min(smallest, width), Number.POSITIVE_INFINITY)
    const wrapWidth = reflowEnabled
      ? (Number.isFinite(reflowColumnWidth) && reflowColumnWidth > 0 ? reflowColumnWidth : moduleWidth)
      : (Number.isFinite(spanWidth) && spanWidth > 0
          ? spanWidth
          : span * moduleWidth + Math.max(0, span - 1) * gutterX)
    const baseFormat = {
      fontFamily: getBlockFont(key, styleKey),
      fontWeight: getBlockFontWeight(key, styleKey),
      italic: isBlockItalic(key, styleKey),
      styleKey,
      color: baseColor,
    }
    const rawText = textContent[key] ?? ""
    const rawFormatRuns = getBlockTextFormatRuns(key, baseColor)
    const rawTrackingRuns = getBlockTrackingRuns(key)
    const opticalKerning = isBlockOpticalKerningEnabled(key)
    const lineStep = Math.max(0.01, getBlockBaselineMultiplier(key, styleKey) * baselineStep)
    const scaledBlockFontSize = resolveScaledCanvasFontSize(
      getBlockFontSize(key, styleKey),
      fontScale,
      getBlockFontSize(key, styleKey),
    )
    const baseCanvasFont = buildCanvasFont(
      baseFormat.fontFamily,
      baseFormat.fontWeight,
      baseFormat.italic,
      scaledBlockFontSize,
    )
    applyCanvasTextConfig(ctx, {
      font: baseCanvasFont,
      opticalKerning,
    })
    const firstLineHeight = getTextAscent(ctx, baseCanvasFont, scaledBlockFontSize)
      + getTextDescent(ctx, baseCanvasFont, scaledBlockFontSize)
    const reflowCapacityHeight = blockHeight
    const maxLinesPerColumn = Math.max(1, reflowEnabled
      ? getTypographyReflowLineCapacityForHeight(reflowCapacityHeight, lineStep)
      : getTypographyLineCapacityForHeight(blockHeight, lineStep, firstLineHeight))
    const maxLoremLines = reflowEnabled ? Math.max(1, maxLinesPerColumn * span) : maxLinesPerColumn
    const resolveFontSize = (segmentStyleKey: StyleKey) => getBlockFontSize(key, segmentStyleKey)
    const blockDocumentVariableContext = resolveSpreadDocumentVariableContextForColumn(
      documentVariableContext,
      startCol,
      gridCols,
      isFacingSpread,
    )
    const shouldResolveDocumentVariables = blockDocumentVariableContext && key !== rawDocumentVariableBlockKey
    const resolved = shouldResolveDocumentVariables
      ? resolveDocumentVariableContent({
          text: rawText,
          context: blockDocumentVariableContext,
          baseFormat,
          formatRuns: rawFormatRuns,
          baseTrackingScale,
          trackingRuns: rawTrackingRuns,
          resolveVariable: ({ name, rawText, rawStart, rawEnd, context }) => {
            if (name !== "lorem") return null
            const rawPrefix = rawText.slice(0, rawStart)
            const rawSuffix = rawText.slice(rawEnd)
            const candidateLineCountCache = new Map<string, number>()
            return fitLoremTextToLineCapacity({
              maxLines: maxLoremLines,
              countLinesForCandidate: (candidate) => {
                const cachedLineCount = candidateLineCountCache.get(candidate)
                if (cachedLineCount !== undefined) return cachedLineCount
                const candidateRawText = `${rawPrefix}${candidate}${rawSuffix}`
                const candidateResolved = resolveDocumentVariableContent({
                  text: candidateRawText,
                  context,
                  baseFormat,
                  formatRuns: rawFormatRuns,
                  baseTrackingScale,
                  trackingRuns: rawTrackingRuns,
                })
                const candidateCanvasFont = buildCanvasFont(
                  baseFormat.fontFamily,
                  baseFormat.fontWeight,
                  baseFormat.italic,
                  resolveFontSize(styleKey),
                )
                const lineCount = getWrappedText(
                  ctx,
                  candidateResolved.text,
                  wrapWidth,
                  isSyllableDivisionEnabled(key),
                  baseTrackingScale,
                  opticalKerning,
                  candidateResolved.trackingRuns,
                  baseFormat,
                  candidateResolved.formatRuns,
                  resolveFontSize,
                  undefined,
                  candidateCanvasFont,
                ).length
                candidateLineCountCache.set(candidate, lineCount)
                return lineCount
              },
            })
          },
        })
      : {
          text: rawText,
          formatRuns: rawFormatRuns,
          trackingRuns: rawTrackingRuns,
          segments: [{
            kind: "literal" as const,
            rawStart: 0,
            rawEnd: rawText.length,
            resolvedStart: 0,
            resolvedEnd: rawText.length,
          }],
        }

    resolvedTextContent[key] = resolved.text
    resolvedTrackingRunsByBlock.set(key, resolved.trackingRuns)
    resolvedFormatRunsByBlock.set(key, resolved.formatRuns)
  }

  const layoutOutput = buildTypographyLayoutPlan<BlockId, StyleKey, CanvasRenderingContext2D>({
    blockOrder,
    textContent: resolvedTextContent,
    styleAssignments,
    styles,
    blockTextAlignments,
    blockVerticalAlignments,
    contentTop,
    contentLeft,
    pageHeight,
    marginsBottom,
    baselineStep,
    moduleWidth,
    moduleHeight,
    moduleWidths,
    moduleHeights,
    columnStarts,
    gutterX,
    gutterY,
    gridRows,
    gridCols,
    fontScale,
    bodyKey,
    displayKey,
    captionKey,
    defaultBodyStyleKey,
    defaultCaptionStyleKey,
    getBlockSpan,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockFontSize: ({ key, styleKey, defaultSize }) => (
      resolveScaledCanvasFontSize(getBlockFontSize(key, styleKey), fontScale, defaultSize)
    ),
    getBlockBaselineMultiplier: ({ key, styleKey, defaultMultiplier }) => {
      const next = getBlockBaselineMultiplier(key, styleKey)
      return Number.isFinite(next) && next > 0 ? next : defaultMultiplier
    },
    getBlockRotation,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isBlockPositionManual,
    getBlockColumnStart,
    getBlockRowStart,
    getOriginForBlock,
    createTextContext: ({ key, styleKey, fontSize }) => {
      applyCanvasTextConfig(ctx, {
        font: buildCanvasFont(
          getBlockFont(key, styleKey),
          getBlockFontWeight(key, styleKey),
          isBlockItalic(key, styleKey),
          fontSize,
        ),
        opticalKerning: isBlockOpticalKerningEnabled(key),
      })
      return ctx
    },
    wrapText: ({ context, key, styleKey, text, maxWidth, hyphenate }) => {
      const canvasFont = buildCanvasFont(
        getBlockFont(key, styleKey),
        getBlockFontWeight(key, styleKey),
        isBlockItalic(key, styleKey),
        resolveScaledCanvasFontSize(
          getBlockFontSize(key, styleKey),
          fontScale,
          getBlockFontSize(key, styleKey),
        ),
      )
      return getWrappedText(
        context,
        text,
        maxWidth,
        hyphenate,
        getBlockTrackingScale(key),
        isBlockOpticalKerningEnabled(key),
        resolvedTrackingRunsByBlock.get(key) ?? [],
        {
          fontFamily: getBlockFont(key, styleKey),
          fontWeight: getBlockFontWeight(key, styleKey),
          italic: isBlockItalic(key, styleKey),
          styleKey,
          color: getBlockTextColor(key),
        },
        resolvedFormatRunsByBlock.get(key) ?? [],
        (segmentStyleKey) => resolveScaledCanvasFontSize(
          getBlockFontSize(key, segmentStyleKey),
          fontScale,
          getBlockFontSize(key, styleKey),
        ),
        undefined,
        canvasFont,
      )
    },
    textAscent: ({ context, key, styleKey, fontSize }) => getTextAscent(
      context,
      buildCanvasFont(getBlockFont(key, styleKey), getBlockFontWeight(key, styleKey), isBlockItalic(key, styleKey), fontSize),
      fontSize,
    ),
    textDescent: ({ context, key, styleKey, fontSize }) => getTextDescent(
      context,
      buildCanvasFont(getBlockFont(key, styleKey), getBlockFontWeight(key, styleKey), isBlockItalic(key, styleKey), fontSize),
      fontSize,
    ),
    opticalOffset: ({ context, key, styleKey, line, align, fontSize }) => {
      const canvasFont = buildCanvasFont(
        getBlockFont(key, styleKey),
        getBlockFontWeight(key, styleKey),
        isBlockItalic(key, styleKey),
        fontSize,
      )
      return getOpticalOffset(
        context,
        key,
        styleKey,
        line,
        align,
        fontSize,
        isBlockOpticalKerningEnabled(key),
        getBlockTrackingScale(key),
        canvasFont,
      )
    },
  })

  const textPlans = new Map<BlockId, BlockRenderPlan<BlockId>>()
  const measureResolvedGlyphBounds = createResolvedFontFileGlyphBoundsMeasure<StyleKey>()
  const measureResolvedPairAdvance = createResolvedFontFilePairAdvanceMeasure<StyleKey>()
  for (const plan of layoutOutput.plans) {
    const blockFont = getBlockFont(plan.key, plan.styleKey)
    const blockFontWeight = getBlockFontWeight(plan.key, plan.styleKey)
    const blockItalic = isBlockItalic(plan.key, plan.styleKey)
    const opticalKerning = isBlockOpticalKerningEnabled(plan.key)
    const trackingScale = getBlockTrackingScale(plan.key)
    const trackingRuns = resolvedTrackingRunsByBlock.get(plan.key) ?? []
    const sourceText = resolvedTextContent[plan.key] ?? ""
    const textColor = getBlockTextColor(plan.key)
    const formatRuns = resolvedFormatRunsByBlock.get(plan.key) ?? []
    const canvasFont = buildCanvasFont(blockFont, blockFontWeight, blockItalic, plan.fontSize)
    const measureGlyphBounds = formatRuns.length === 0
      ? createLoadedFontFileGlyphBoundsMeasureForCanvasFont(canvasFont) ?? undefined
      : undefined
    applyCanvasTextConfig(ctx, {
      font: canvasFont,
      opticalKerning,
    })
    const planFont = canvasFont
    const segmentLines = plan.commands.map((command) => buildPositionedTextFormatTrackingGraphemes(ctx, {
      sourceText,
      command,
      textAlign: plan.textAlign,
      baseFormat: {
        fontFamily: blockFont,
        fontWeight: blockFontWeight,
        italic: blockItalic,
        styleKey: plan.styleKey,
        color: textColor,
      },
      formatRuns,
      baseTrackingScale: trackingScale,
      trackingRuns,
      resolveFontSize: (styleKey) => resolveScaledCanvasFontSize(
        getBlockFontSize(plan.key, styleKey),
        fontScale,
        plan.fontSize,
      ),
      opticalKerning,
      measureGlyphBounds,
      measureResolvedGlyphBounds,
      measureResolvedPairAdvance,
    }))
    const renderedLines = buildRenderedTextLines(
      sourceText,
      plan.commands,
      segmentLines,
      planFont,
    )
    const signature = buildCanvasTextPlanSignature({
      key: plan.key,
      font: planFont,
      textColor,
      commands: plan.commands,
      segmentLines,
    })
    textPlans.set(plan.key, {
      key: plan.key,
      rect: plan.rect,
      guideRects: plan.guideRects,
      signature,
      font: planFont,
      textColor,
      textAlign: plan.textAlign,
      textVerticalAlign: plan.textVerticalAlign,
      blockRotation: plan.blockRotation,
      rotationOriginX: plan.rotationOriginX,
      rotationOriginY: plan.rotationOriginY,
      opticalKerning,
      trackingScale,
      trackingRuns,
      drawSegmentLines: segmentLines,
      segmentLines,
      renderedLines,
      commands: plan.commands,
    })
  }

  return {
    textPlans,
    blockRects: layoutOutput.rects,
    overflowByBlock: layoutOutput.overflowByBlock,
  }
}

export function buildOrderedCanvasLayerKeys<Key extends string>(
  layerOrder: Key[],
  imageOrder: Key[],
  blockOrder: Key[],
  imagePlans: Map<Key, CanvasImageRenderPlan>,
  textPlans: Map<Key, BlockRenderPlan<Key>>,
): Key[] {
  const orderedKeys = layerOrder.filter((key) => imagePlans.has(key) || textPlans.has(key))
  for (const key of imageOrder) {
    if ((imagePlans.has(key) || textPlans.has(key)) && !orderedKeys.includes(key)) orderedKeys.push(key)
  }
  for (const key of blockOrder) {
    if ((imagePlans.has(key) || textPlans.has(key)) && !orderedKeys.includes(key)) orderedKeys.push(key)
  }
  return orderedKeys
}

export function buildCanvasTextRenderPlanFromPageExportPlan(
  textPlan: PageExportTextPlan,
): BlockRenderPlan<string> {
  const textColor = formatSvgColor(textPlan.textColor)
  const font = buildCanvasFont(textPlan.fontFamily, textPlan.fontWeight, textPlan.italic, textPlan.fontSize)
  const renderedSegmentLines = textPlan.graphemeLines.length > 0
    ? textPlan.graphemeLines
    : textPlan.segmentLines
  const signature = buildCanvasTextPlanSignature({
    key: textPlan.key,
    font,
    textColor,
    commands: textPlan.commands,
    segmentLines: renderedSegmentLines,
  })
  return {
    key: textPlan.key,
    rect: textPlan.rect,
    guideRects: textPlan.guideRects,
    signature,
    font,
    textColor,
    textAlign: textPlan.textAlign,
    textVerticalAlign: textPlan.textVerticalAlign,
    blockRotation: textPlan.blockRotation,
    rotationOriginX: textPlan.rotationOriginX,
    rotationOriginY: textPlan.rotationOriginY,
    opticalKerning: textPlan.opticalKerning,
    trackingScale: textPlan.trackingScale,
    trackingRuns: textPlan.trackingRuns,
    drawSegmentLines: textPlan.segmentLines,
    segmentLines: renderedSegmentLines,
    renderedLines: buildRenderedTextLines(
      textPlan.sourceText,
      textPlan.commands,
      renderedSegmentLines,
      font,
    ),
    commands: textPlan.commands,
  }
}

export function buildCanvasImageRenderPlanFromPageExportPlan(
  imagePlan: PageExportImagePlan,
): CanvasImageRenderPlan {
  return {
    rect: {
      x: imagePlan.x,
      y: imagePlan.y,
      width: imagePlan.width,
      height: imagePlan.height,
    },
    color: formatSvgColor(imagePlan.fillColor),
    opacity: imagePlan.opacity,
    rotation: imagePlan.rotation,
    rotationOriginX: imagePlan.rotationOriginX,
    rotationOriginY: imagePlan.rotationOriginY,
  }
}

export function buildCanvasRenderPlansFromPageExportPlan(
  exportPlan: PageExportPlan,
): {
  orderedKeys: string[]
  imagePlans: Map<string, CanvasImageRenderPlan>
  textPlans: Map<string, BlockRenderPlan<string>>
} {
  return {
    orderedKeys: exportPlan.orderedLayerKeys,
    imagePlans: new Map(exportPlan.imagePlans.map((imagePlan) => [
      imagePlan.key,
      buildCanvasImageRenderPlanFromPageExportPlan(imagePlan),
    ])),
    textPlans: new Map(exportPlan.textPlans.map((textPlan) => [
      textPlan.key,
      buildCanvasTextRenderPlanFromPageExportPlan(textPlan),
    ])),
  }
}

export function drawCanvasLayerStack<Key extends string>(
  ctx: CanvasRenderingContext2D,
  orderedKeys: Key[],
  imagePlans: Map<Key, CanvasImageRenderPlan>,
  textPlans: Map<Key, BlockRenderPlan<Key>>,
): void {
  ctx.textBaseline = "alphabetic"
  for (const key of orderedKeys) {
    const imagePlan = imagePlans.get(key)
    if (imagePlan) {
      drawCanvasImagePlan(ctx, imagePlan)
      continue
    }

    const textPlan = textPlans.get(key)
    if (!textPlan) continue
    drawCanvasTextPlan(ctx, textPlan)
  }
}

export function drawCanvasImagePlan(
  ctx: CanvasRenderingContext2D,
  imagePlan: CanvasImageRenderPlan,
): void {
  ctx.fillStyle = imagePlan.color
  ctx.globalAlpha = imagePlan.opacity
  if (Math.abs(imagePlan.rotation) > 0.0001) {
    ctx.save()
    ctx.translate(imagePlan.rotationOriginX, imagePlan.rotationOriginY)
    ctx.rotate((imagePlan.rotation * Math.PI) / 180)
    ctx.translate(-imagePlan.rotationOriginX, -imagePlan.rotationOriginY)
    ctx.fillRect(imagePlan.rect.x, imagePlan.rect.y, imagePlan.rect.width, imagePlan.rect.height)
    ctx.restore()
  } else {
    ctx.fillRect(imagePlan.rect.x, imagePlan.rect.y, imagePlan.rect.width, imagePlan.rect.height)
  }
  ctx.globalAlpha = 1
}

export function drawCanvasTextPlan<Key extends string>(
  ctx: CanvasRenderingContext2D,
  textPlan: BlockRenderPlan<Key>,
): void {
  ctx.textAlign = "left"
  applyCanvasTextConfig(ctx, {
    font: textPlan.font,
    opticalKerning: textPlan.opticalKerning,
  })
  ctx.fillStyle = textPlan.textColor
  const angle = (textPlan.blockRotation * Math.PI) / 180
  const rotated = Math.abs(angle) > 0.0001
  if (rotated) {
    ctx.save()
    ctx.translate(textPlan.rotationOriginX, textPlan.rotationOriginY)
    ctx.rotate(angle)
  }
  let activeFillStyle = textPlan.textColor
  let activeFont = textPlan.font
  let lastFontFamily = ""
  let lastFontWeight = Number.NaN
  let lastItalic = false
  let lastFontSize = Number.NaN
  for (const lineSegments of textPlan.segmentLines) {
    for (const segment of lineSegments) {
      if (segment.color !== activeFillStyle) {
        activeFillStyle = segment.color
        ctx.fillStyle = activeFillStyle
      }
      if (
        segment.fontFamily !== lastFontFamily
        || segment.fontWeight !== lastFontWeight
        || segment.italic !== lastItalic
        || segment.fontSize !== lastFontSize
      ) {
        lastFontFamily = segment.fontFamily
        lastFontWeight = segment.fontWeight
        lastItalic = segment.italic
        lastFontSize = segment.fontSize
        activeFont = buildCanvasFont(
          segment.fontFamily,
          segment.fontWeight,
          segment.italic,
          segment.fontSize,
        )
        if (activeFont !== ctx.font) {
          ctx.font = activeFont
        }
      } else if (activeFont !== ctx.font) {
        ctx.font = activeFont
      }
      ctx.fillText(
        segment.text,
        rotated ? segment.x - textPlan.rotationOriginX : segment.x,
        rotated ? segment.y - textPlan.rotationOriginY : segment.y,
      )
    }
  }
  if (rotated) ctx.restore()
}
