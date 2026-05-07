import { useEffect, useRef } from "react"
import type { MutableRefObject, RefObject } from "react"

import type { GridResult } from "@/lib/grid-calculator"
import type { FontFamily } from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { buildAxisStarts, resolveAxisSizes } from "@/lib/grid-rhythm"
import {
  buildCanvasRenderPlansFromPageExportPlan,
  drawCanvasImagePlan,
  drawCanvasTextPlan,
  drawCanvasLayerPlanStack,
  type CanvasLayerRenderPlan,
  type CanvasImageRenderPlan,
} from "@/lib/canvas-page-renderer"
import type { DocumentVariableContext } from "@/lib/document-variable-text"
import {
  resolveLayoutTextMetricsEngineFactory,
  type LayoutEngineContract,
} from "@/lib/layout-engine-contract"
import { measureLayoutPerformance } from "@/lib/layout-performance"
import { buildPageExportPlan } from "@/lib/page-export-plan"
import type { BlockRect, BlockRenderPlan } from "@/lib/preview-types"
import type { ModulePosition } from "@/lib/types/layout-primitives"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"
import { toTextBlockPosition } from "@/lib/text-block-position"
import { createTextMetricsService, type TextMetricsService } from "@/lib/text-metrics-service"

type DragState<BlockId extends string> = {
  key: BlockId
  preview: ModulePosition
  copyOnDrop: boolean
}

function scaleRect(rect: BlockRect, factor: number): BlockRect {
  return {
    x: rect.x * factor,
    y: rect.y * factor,
    width: rect.width * factor,
    height: rect.height * factor,
  }
}

function scaleTextRenderPlan<BlockId extends string>(
  plan: BlockRenderPlan<BlockId>,
  factor: number,
): BlockRenderPlan<BlockId> {
  type Segment = BlockRenderPlan<BlockId>["segmentLines"][number][number]
  const scaleSegment = (segment: Segment): Segment => {
    const metrics = segment as Segment & { width?: number; ascent?: number; descent?: number }
    return {
      ...segment,
      x: segment.x * factor,
      y: segment.y * factor,
      fontSize: segment.fontSize * factor,
      ...(typeof metrics.width === "number" ? { width: metrics.width * factor } : {}),
      ...(typeof metrics.ascent === "number" ? { ascent: metrics.ascent * factor } : {}),
      ...(typeof metrics.descent === "number" ? { descent: metrics.descent * factor } : {}),
    } as Segment
  }

  return {
    ...plan,
    rect: scaleRect(plan.rect, factor),
    guideRects: plan.guideRects.map((rect) => scaleRect(rect, factor)),
    rotationOriginX: plan.rotationOriginX * factor,
    rotationOriginY: plan.rotationOriginY * factor,
    drawSegmentLines: plan.drawSegmentLines.map((line) => line.map(scaleSegment)),
    segmentLines: plan.segmentLines.map((line) => line.map(scaleSegment)),
    renderedLines: plan.renderedLines.map((line) => ({
      ...line,
      left: line.left * factor,
      top: line.top * factor,
      width: line.width * factor,
      height: line.height * factor,
      baselineY: line.baselineY * factor,
      caretStops: line.caretStops.map((stop) => ({
        ...stop,
        x: stop.x * factor,
      })),
    })),
    commands: plan.commands.map((command) => ({
      ...command,
      x: command.x * factor,
      y: command.y * factor,
    })),
  }
}

function buildLayoutWithDragPreviewPosition<StyleKey extends string, BlockId extends string>(
  layout: PreviewLayoutState<StyleKey, FontFamily, BlockId>,
  dragState: DragState<BlockId>,
  rowStartBaselines: readonly number[],
  blockOrder: readonly BlockId[],
  imageOrder: readonly BlockId[],
): PreviewLayoutState<StyleKey, FontFamily, BlockId> {
  const position = toTextBlockPosition(dragState.preview, rowStartBaselines)
  if (blockOrder.includes(dragState.key)) {
    return {
      ...layout,
      blockModulePositions: {
        ...layout.blockModulePositions,
        [dragState.key]: position,
      },
    }
  }
  if (imageOrder.includes(dragState.key)) {
    return {
      ...layout,
      imageModulePositions: {
        ...(layout.imageModulePositions ?? {}),
        [dragState.key]: position,
      },
    }
  }
  return layout
}

type Args<BlockId extends string> = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: MutableRefObject<Record<BlockId, BlockRect>>
  imageRectsRef: MutableRefObject<Record<BlockId, BlockRect>>
  typographyBufferRef: MutableRefObject<HTMLCanvasElement | null>
  previousPlansRef: MutableRefObject<Map<BlockId, BlockRenderPlan<BlockId>>>
  typographyBufferTransformRef: MutableRefObject<string>
  result: GridResult
  scale: number
  pixelRatio: number
  fontRenderEpoch: number
  typographyMetricsReady: boolean
  rotation: number
  layoutEngine: LayoutEngineContract
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  showTypography: boolean
  showImagePlaceholders: boolean
  blockOrder: BlockId[]
  imageOrder: BlockId[]
  documentVariableContext?: DocumentVariableContext | null
  rawDocumentVariableBlockKey?: BlockId | null
  dragState: DragState<BlockId> | null
  buildLayoutSnapshot: () => PreviewLayoutState<keyof GridResult["typography"]["styles"], FontFamily, BlockId>
  onOverflowLinesChange?: (overflowByBlock: Partial<Record<BlockId, number>>) => void
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  onPlansCommit?: () => void
  recordPerfMetric: (metric: "drawMs", valueMs: number) => void
}

export function useTypographyRenderer<BlockId extends string>({
  canvasRef,
  blockRectsRef,
  imageRectsRef,
  typographyBufferRef,
  previousPlansRef,
  typographyBufferTransformRef,
  result,
  scale,
  pixelRatio,
  fontRenderEpoch,
  typographyMetricsReady,
  rotation,
  layoutEngine,
  baseFont,
  imageColorScheme,
  showTypography,
  showImagePlaceholders,
  blockOrder,
  imageOrder,
  documentVariableContext = null,
  rawDocumentVariableBlockKey = null,
  dragState,
  buildLayoutSnapshot,
  onOverflowLinesChange,
  onCanvasReady,
  onPlansCommit,
  recordPerfMetric,
}: Args<BlockId>) {
  const textMetricsServiceRef = useRef<{
    factory: ReturnType<typeof resolveLayoutTextMetricsEngineFactory>
    service: TextMetricsService<keyof GridResult["typography"]["styles"], FontFamily>
  } | null>(null)
  const textMetricsEngineFactory = resolveLayoutTextMetricsEngineFactory(layoutEngine)
  if (!textMetricsServiceRef.current || textMetricsServiceRef.current.factory !== textMetricsEngineFactory) {
    textMetricsServiceRef.current = {
      factory: textMetricsEngineFactory,
      service: createTextMetricsService({
        metricsEngineFactory: textMetricsEngineFactory,
      }),
    }
  }
  const textMetricsService = textMetricsServiceRef.current.service

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)
    if (!typographyMetricsReady) return

    const frame = window.requestAnimationFrame(() => {
      const drawStartedAt = performance.now()
      const drawMarkName = "sgg:draw"
      if (typeof performance.mark === "function") performance.mark(`${drawMarkName}:start`)
      const endDrawMark = () => {
        if (typeof performance.mark !== "function" || typeof performance.measure !== "function") return
        performance.mark(`${drawMarkName}:end`)
        try {
          performance.measure(drawMarkName, `${drawMarkName}:start`, `${drawMarkName}:end`)
        } catch {
          // Ignore missing/invalid marks.
        }
      }
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        endDrawMark()
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }
      const canvasCssWidth = canvas.width / pixelRatio
      const canvasCssHeight = canvas.height / pixelRatio

      const { width, height } = result.pageSizePt
      const { gridUnit, gridMarginVertical } = result.grid
      const { height: modH } = result.module
      const { gridRows } = result.settings
      const pageWidth = width * scale
      const pageHeight = height * scale

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, canvasCssWidth, canvasCssHeight)
      blockRectsRef.current = {} as Record<BlockId, BlockRect>
      imageRectsRef.current = {} as Record<BlockId, BlockRect>
      const overflowByBlock: Partial<Record<BlockId, number>> = {}

      const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, modH)
      const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
      const rowStartsInBaselines = rowStarts.map((value) => value / Math.max(0.0001, gridUnit))
      let draftPlans = new Map<BlockId, BlockRenderPlan<BlockId>>()
      let imagePlans = new Map<BlockId, CanvasImageRenderPlan>()
      let dragPreviewImagePlan: CanvasImageRenderPlan | null = null
      let dragPreviewTextPlan: BlockRenderPlan<BlockId> | null = null
      let committedTextPlans = draftPlans

      const baseLayout = buildLayoutSnapshot()
      const exportLayout = dragState && !dragState.copyOnDrop
        ? buildLayoutWithDragPreviewPosition(baseLayout, dragState, rowStartsInBaselines, blockOrder, imageOrder)
        : baseLayout
      const exportPlan = buildPageExportPlan({
        result,
        layout: exportLayout,
        documentVariableContext,
        baseFont,
        imageColorScheme,
        canvasBackground: null,
        rotation,
        showBaselines: false,
        showModules: false,
        showMargins: false,
        showImagePlaceholders,
        showTypography,
        includeGraphemeLines: true,
        layoutEngine,
        rawDocumentVariableBlockKey,
        textMetricsService,
      })
      const canvasRenderPlans = measureLayoutPerformance(
        "canvas.buildRenderPlansFromPageExportPlan",
        () => buildCanvasRenderPlansFromPageExportPlan(exportPlan, { signatureMode: "key" }),
        {
          textPlans: exportPlan.textPlans.length,
          imagePlans: exportPlan.imagePlans.length,
        },
      )
      imagePlans = canvasRenderPlans.imagePlans as Map<BlockId, CanvasImageRenderPlan>
      draftPlans = canvasRenderPlans.textPlans as Map<BlockId, BlockRenderPlan<BlockId>>
      const nextImageRects = {} as Record<BlockId, BlockRect>
      const nextBlockRects = {} as Record<BlockId, BlockRect>
      if (Math.abs(scale - 1) <= 0.000001) {
        committedTextPlans = draftPlans
        for (const [key, plan] of imagePlans) {
          nextImageRects[key] = plan.rect
        }
        for (const [key, plan] of committedTextPlans) {
          nextBlockRects[key] = plan.rect
        }
      } else {
        committedTextPlans = new Map<BlockId, BlockRenderPlan<BlockId>>()
        for (const [key, plan] of imagePlans) {
          nextImageRects[key] = scaleRect(plan.rect, scale)
        }
        for (const [key, plan] of draftPlans) {
          const scaledPlan = scaleTextRenderPlan(plan, scale)
          committedTextPlans.set(key, scaledPlan)
          nextBlockRects[key] = scaledPlan.rect
        }
      }
      imageRectsRef.current = nextImageRects
      blockRectsRef.current = nextBlockRects
      Object.assign(overflowByBlock, exportPlan.overflowByBlock)

      if (dragState?.copyOnDrop) {
        const duplicateLayout = buildLayoutWithDragPreviewPosition(baseLayout, dragState, rowStartsInBaselines, blockOrder, imageOrder)
        const duplicateExportPlan = buildPageExportPlan({
          result,
          layout: duplicateLayout,
          documentVariableContext,
          baseFont,
          imageColorScheme,
          canvasBackground: null,
          rotation,
          showBaselines: false,
          showModules: false,
          showMargins: false,
          showImagePlaceholders,
          showTypography,
          includeGraphemeLines: true,
          layoutEngine,
          rawDocumentVariableBlockKey,
          textMetricsService,
        })
        const duplicateCanvasPlans = measureLayoutPerformance(
          "canvas.buildDragPreviewRenderPlansFromPageExportPlan",
          () => buildCanvasRenderPlansFromPageExportPlan(duplicateExportPlan, { signatureMode: "key" }),
          {
            textPlans: duplicateExportPlan.textPlans.length,
            imagePlans: duplicateExportPlan.imagePlans.length,
          },
        )
        dragPreviewImagePlan = duplicateCanvasPlans.imagePlans.get(dragState.key) as CanvasImageRenderPlan | undefined ?? null
        dragPreviewTextPlan = duplicateCanvasPlans.textPlans.get(dragState.key) as BlockRenderPlan<BlockId> | undefined ?? null
      }

      onOverflowLinesChange?.(overflowByBlock)

      if (!showTypography && imagePlans.size === 0) {
        endDrawMark()
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }

      let typographyBuffer = typographyBufferRef.current
      if (!typographyBuffer) {
        typographyBuffer = document.createElement("canvas")
        typographyBufferRef.current = typographyBuffer
      }
      const resized = typographyBuffer.width !== canvas.width || typographyBuffer.height !== canvas.height
      if (resized) {
        typographyBuffer.width = canvas.width
        typographyBuffer.height = canvas.height
        previousPlansRef.current.clear()
      }
      const transformSignature = `${rotation}|${pageWidth.toFixed(4)}|${pageHeight.toFixed(4)}`
      const transformChanged = typographyBufferTransformRef.current !== transformSignature
      if (transformChanged) {
        typographyBufferTransformRef.current = transformSignature
        previousPlansRef.current.clear()
      }
      const bufferCtx = typographyBuffer.getContext("2d")
      if (!bufferCtx) {
        endDrawMark()
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }
      const bufferCssWidth = typographyBuffer.width / pixelRatio
      const bufferCssHeight = typographyBuffer.height / pixelRatio

      bufferCtx.setTransform(1, 0, 0, 1, 0, 0)
      bufferCtx.clearRect(0, 0, typographyBuffer.width, typographyBuffer.height)
      bufferCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      bufferCtx.save()
      bufferCtx.translate(bufferCssWidth / 2, bufferCssHeight / 2)
      bufferCtx.rotate((rotation * Math.PI) / 180)
      bufferCtx.translate(-pageWidth / 2, -pageHeight / 2)
      bufferCtx.scale(scale, scale)
      measureLayoutPerformance(
        "canvas.drawLayerStack",
        () => drawCanvasLayerPlanStack(bufferCtx, canvasRenderPlans.orderedLayerPlans as CanvasLayerRenderPlan<BlockId>[]),
        {
          layers: canvasRenderPlans.orderedKeys.length,
          textPlans: draftPlans.size,
          imagePlans: imagePlans.size,
        },
      )
      if (dragPreviewImagePlan) {
        drawCanvasImagePlan(bufferCtx, dragPreviewImagePlan)
      }
      if (dragPreviewTextPlan) {
        drawCanvasTextPlan(bufferCtx, dragPreviewTextPlan)
      }
      bufferCtx.scale(1 / Math.max(scale, 0.0001), 1 / Math.max(scale, 0.0001))
      bufferCtx.restore()

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(typographyBuffer, 0, 0)
      previousPlansRef.current = committedTextPlans
      onPlansCommit?.()
      endDrawMark()
      recordPerfMetric("drawMs", performance.now() - drawStartedAt)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    blockOrder,
    blockRectsRef,
    baseFont,
    buildLayoutSnapshot,
    canvasRef,
    dragState,
    documentVariableContext,
    rawDocumentVariableBlockKey,
    imageOrder,
    imageColorScheme,
    imageRectsRef,
    layoutEngine,
    onCanvasReady,
    onPlansCommit,
    onOverflowLinesChange,
    previousPlansRef,
    recordPerfMetric,
    result,
    fontRenderEpoch,
    typographyMetricsReady,
    rotation,
    scale,
    pixelRatio,
    showImagePlaceholders,
    showTypography,
    textMetricsService,
    typographyBufferRef,
    typographyBufferTransformRef,
  ])
}
