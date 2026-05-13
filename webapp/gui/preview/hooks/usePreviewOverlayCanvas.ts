import { useEffect } from "react"
import type { MutableRefObject, RefObject } from "react"

import { resolveBlockHeight } from "@/core/layout/block-height"
import type { GridResult } from "@/core/layout/grid-calculator"
import { resolveLayerColumnBounds } from "@/core/layout/layer-placement"
import {
  getPreviewTextGuideBounds,
  getPreviewTextGuideGeometry,
  getPreviewTextGuideRects,
  type PreviewTextGuideGeometry,
} from "@/gui/preview/lib/preview-guide-rect"
import { findNearestAxisIndex } from "@/core/layout/grid-rhythm"
import { resolveGridFirstColumnStep, sumGridColumnSpan } from "@/core/layout/grid-column-layout"
import { resolvePreviewColumnX } from "@/core/layout/preview-column-snap"
import type { BlockRect } from "@/core/layout/typography-layout-plan"
import type { ModulePosition } from "@/core/types/preview-layout"
import { readUiColor, withColorAlpha } from "@/styles/resolve-color"

import type { PreviewGridMetrics } from "@/gui/preview/hooks/usePreviewGeometry"

const OVERFLOW_BADGE_RADIUS = 11
const OVERFLOW_BADGE_PADDING = 6
const GUIDE_STROKE_WIDTH = 1
const ACTIVE_GUIDE_STROKE_WIDTH = 2

type DragState<Key extends string> = {
  key: Key
  preview: ModulePosition
}

type OverlayPlan<Key extends string> = {
  key: Key
  rect: BlockRect
  guideRects: BlockRect[]
  rotationOriginX: number
  rotationOriginY: number
  textAlign: "left" | "center" | "right"
  commands: { x: number; y: number }[]
  renderedLines: {
    left: number
    top: number
    width: number
    height: number
    baselineY: number
  }[]
}

type Args<Key extends string, Plan extends OverlayPlan<Key>> = {
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: MutableRefObject<Record<Key, BlockRect>>
  imageRectsRef: MutableRefObject<Record<Key, BlockRect>>
  previousPlansRef: MutableRefObject<Map<Key, Plan>>
  result: GridResult
  scale: number
  pixelRatio: number
  rotation: number
  showTypography: boolean
  blockOrder: Key[]
  imageOrder: Key[]
  hoveredTextGuideRect: BlockRect | null
  hoveredTextGuideRects: BlockRect[]
  hoveredTextGuidePlan: Plan | null
  hoveredImageRect: BlockRect | null
  hideHoveredGuideFill?: boolean
  selectedLayerKey: Key | null
  overflowLinesByBlock: Partial<Record<Key, number>>
  dragState: DragState<Key> | null
  editorTarget: Key | null
  getPlacementRows: (key: Key) => number
  getPlacementHeightBaselines: (key: Key) => number
  getPlacementSpan: (key: Key) => number
  getGridMetrics: () => PreviewGridMetrics
  editorPlanVersion?: number
}

export function usePreviewOverlayCanvas<Key extends string, Plan extends OverlayPlan<Key>>({
  overlayCanvasRef,
  blockRectsRef,
  imageRectsRef,
  previousPlansRef,
  result,
  scale,
  pixelRatio,
  rotation,
  showTypography,
  blockOrder,
  imageOrder,
  hoveredTextGuideRect,
  hoveredTextGuideRects,
  hoveredTextGuidePlan,
  hoveredImageRect,
  hideHoveredGuideFill = false,
  selectedLayerKey,
  overflowLinesByBlock,
  dragState,
  editorTarget,
  getPlacementRows,
  getPlacementHeightBaselines,
  getPlacementSpan,
  getGridMetrics,
  editorPlanVersion = 0,
}: Args<Key, Plan>) {
  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const guideStrokeColor = readUiColor("--color-accent")
      const guideFill = withColorAlpha(guideStrokeColor, 0.18)
      const paragraphGuideStrokeColor = readUiColor("--color-paragraph-layer-accent")
      const paragraphGuideFill = withColorAlpha(paragraphGuideStrokeColor, 0.18)
      const overflowBadgeFill = withColorAlpha(readUiColor("--color-error"), 0.85)
      const overflowBadgeText = readUiColor("--color-page-default")
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, cssWidth, cssHeight)
      if (!showTypography) return

      const hasOverflow = blockOrder.some((key) => (overflowLinesByBlock[key] ?? 0) > 0)
      const activeEditorPlan = editorTarget ? previousPlansRef.current.get(editorTarget) ?? null : null
      const activeEditorImageRect = editorTarget && imageOrder.includes(editorTarget)
        ? imageRectsRef.current[editorTarget] ?? null
        : null
      const selectedImageRect = selectedLayerKey && imageOrder.includes(selectedLayerKey)
        ? imageRectsRef.current[selectedLayerKey]
        : null
      const selectedTextPlan = selectedLayerKey ? previousPlansRef.current.get(selectedLayerKey) ?? null : null
      const hasHoveredTextGuide = Boolean(hoveredTextGuideRect)
      const hasHoveredImageGuide = Boolean(hoveredImageRect)
      const hasSelectedLayer = Boolean(selectedImageRect || selectedTextPlan)
      if (!dragState && !hasOverflow && !activeEditorPlan && !hasHoveredTextGuide && !hasHoveredImageGuide && !hasSelectedLayer) return

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
      const pageWidth = width * scale
      const pageHeight = height * scale
      const baselineStep = gridUnit * scale
      const baselineOriginTop = margins.top * scale - baselineStep
      const contentLeft = margins.left * scale
      const metrics = getGridMetrics()
      const firstColumnStepPt = resolveGridFirstColumnStep(
        metrics.moduleWidths,
        metrics.colStarts,
        gridMarginHorizontal,
        result.module.width,
      )

      ctx.save()
      ctx.translate(cssWidth / 2, cssHeight / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-pageWidth / 2, -pageHeight / 2)

      const drawPlacementGuide = (
        horizontalX: number,
        verticalX: number,
        lineY: number,
        widthPx: number,
        heightPx: number,
        lineWidth: number = GUIDE_STROKE_WIDTH,
        strokeColor: string = guideStrokeColor,
      ) => {
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = lineWidth
        ctx.beginPath()
        ctx.moveTo(horizontalX, lineY)
        ctx.lineTo(horizontalX + widthPx, lineY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(verticalX, lineY)
        ctx.lineTo(verticalX, lineY + heightPx)
        ctx.stroke()
      }

      const drawPreviewGuideFill = (
        x: number,
        y: number,
        widthPx: number,
        heightPx: number,
        fillColor: string = guideFill,
      ) => {
        ctx.fillStyle = fillColor
        ctx.fillRect(x, y, widthPx, heightPx)
      }

      const drawPreviewGuideEdges = (
        x: number,
        y: number,
        widthPx: number,
        heightPx: number,
        strokeColor: string = guideStrokeColor,
      ) => {
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = GUIDE_STROKE_WIDTH
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + widthPx, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + heightPx)
        ctx.stroke()
      }

      const drawTextGuideRects = (
        plan: Plan,
        guideRects: readonly BlockRect[],
        drawGuide: (guide: PreviewTextGuideGeometry) => void,
      ) => {
        for (const guideRect of guideRects) {
          drawGuide(getPreviewTextGuideGeometry(plan, guideRect))
        }
      }

      const drawTextGuideFill = (plan: Plan, guideRects: readonly BlockRect[]) => {
        drawTextGuideRects(plan, guideRects, (guide) => {
          drawPreviewGuideFill(
            guide.horizontalX,
            guide.y,
            guide.width,
            guide.height,
            paragraphGuideFill,
          )
        })
      }

      const drawTextGuideEdges = (plan: Plan, guideRect: BlockRect) => {
        const guide = getPreviewTextGuideGeometry(plan, guideRect)
        drawPreviewGuideEdges(
          guide.horizontalX,
          guide.y,
          guide.width,
          guide.height,
          paragraphGuideStrokeColor,
        )
      }

      const drawTextPlacementGuide = (
        plan: Plan,
        guideRect: BlockRect,
        lineWidth: number = GUIDE_STROKE_WIDTH,
      ) => {
        const guide = getPreviewTextGuideGeometry(plan, guideRect)
        drawPlacementGuide(
          guide.horizontalX,
          guide.verticalX,
          guide.y,
          guide.width,
          guide.height,
          lineWidth,
          paragraphGuideStrokeColor,
        )
      }

      if (dragState) {
        const isDraggingTextLayer = blockOrder.includes(dragState.key)
        const dragSpan = getPlacementSpan(dragState.key)
        const dragRows = getPlacementRows(dragState.key)
        const dragHeightBaselines = getPlacementHeightBaselines(dragState.key)
        const { minCol } = resolveLayerColumnBounds({ span: dragSpan, gridCols: result.settings.gridCols })
        const snappedStartCol = Math.max(
          minCol,
          Math.min(Math.max(0, result.settings.gridCols - 1), Math.round(dragState.preview.col)),
        )
        const snapX = contentLeft + resolvePreviewColumnX(dragState.preview.col, metrics.colStarts, firstColumnStepPt) * scale
        const snapY = baselineOriginTop + dragState.preview.row * baselineStep
        const dragRowStart = Math.max(
          0,
          Math.min(result.settings.gridRows - 1, findNearestAxisIndex(metrics.rowStartBaselines, dragState.preview.row)),
        )
        const snapWidth = sumGridColumnSpan(
          metrics.moduleWidths,
          metrics.colStarts,
          snappedStartCol,
          dragSpan,
          gridMarginHorizontal,
        ) * scale
        const snapHeight = resolveBlockHeight({
          rowStart: dragRowStart,
          rows: dragRows,
          baselines: dragHeightBaselines,
          gridRows: result.settings.gridRows,
          moduleHeights: metrics.moduleHeights,
          fallbackModuleHeight: result.module.height,
          gutterY: gridMarginVertical,
          baselineStep: gridUnit,
        }) * scale
        drawPlacementGuide(
          snapX,
          snapX,
          snapY + baselineStep,
          snapWidth,
          snapHeight,
          GUIDE_STROKE_WIDTH,
          isDraggingTextLayer ? paragraphGuideStrokeColor : guideStrokeColor,
        )
      } else if (hoveredTextGuideRect && hoveredTextGuidePlan) {
        if (!hideHoveredGuideFill) {
          drawTextGuideFill(hoveredTextGuidePlan, hoveredTextGuideRects)
        }
        drawTextGuideEdges(hoveredTextGuidePlan, hoveredTextGuideRect)
      } else if (hoveredTextGuideRect) {
        if (!hideHoveredGuideFill) {
          for (const rect of hoveredTextGuideRects.length > 0 ? hoveredTextGuideRects : [hoveredTextGuideRect]) {
            drawPreviewGuideFill(rect.x, rect.y, rect.width, rect.height, paragraphGuideFill)
          }
        }
        drawPreviewGuideEdges(
          hoveredTextGuideRect.x,
          hoveredTextGuideRect.y,
          hoveredTextGuideRect.width,
          hoveredTextGuideRect.height,
          paragraphGuideStrokeColor,
        )
      } else if (hoveredImageRect) {
        if (!hideHoveredGuideFill) {
          drawPreviewGuideFill(
            hoveredImageRect.x,
            hoveredImageRect.y,
            hoveredImageRect.width,
            hoveredImageRect.height,
          )
        }
        drawPreviewGuideEdges(
          hoveredImageRect.x,
          hoveredImageRect.y,
          hoveredImageRect.width,
          hoveredImageRect.height,
        )
      } else if (selectedImageRect) {
        drawPreviewGuideFill(
          selectedImageRect.x,
          selectedImageRect.y,
          selectedImageRect.width,
          selectedImageRect.height,
        )
        drawPreviewGuideEdges(
          selectedImageRect.x,
          selectedImageRect.y,
          selectedImageRect.width,
          selectedImageRect.height,
        )
      } else if (selectedTextPlan) {
        drawTextGuideFill(selectedTextPlan, getPreviewTextGuideRects(selectedTextPlan))
        drawTextGuideEdges(selectedTextPlan, getPreviewTextGuideBounds(selectedTextPlan))
      }

      if (activeEditorPlan) {
        drawTextPlacementGuide(
          activeEditorPlan,
          getPreviewTextGuideBounds(activeEditorPlan),
          ACTIVE_GUIDE_STROKE_WIDTH,
        )
      } else if (activeEditorImageRect) {
        drawPlacementGuide(
          activeEditorImageRect.x,
          activeEditorImageRect.x,
          activeEditorImageRect.y,
          activeEditorImageRect.width,
          activeEditorImageRect.height,
          ACTIVE_GUIDE_STROKE_WIDTH,
        )
      }

      if (hasOverflow) {
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.font = `700 ${Math.max(10, OVERFLOW_BADGE_RADIUS * 1.2)}px Inter, system-ui, -apple-system, sans-serif`
        for (const key of blockOrder) {
          const overflowLines = overflowLinesByBlock[key] ?? 0
          if (overflowLines <= 0) continue
          const rect = blockRectsRef.current[key]
          if (!rect || rect.width <= 0 || rect.height <= 0) continue
          const cx = rect.x + rect.width - OVERFLOW_BADGE_RADIUS - OVERFLOW_BADGE_PADDING
          const cy = rect.y + rect.height - OVERFLOW_BADGE_RADIUS - OVERFLOW_BADGE_PADDING
          ctx.save()
          ctx.beginPath()
          ctx.fillStyle = overflowBadgeFill
          ctx.arc(cx, cy, OVERFLOW_BADGE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = overflowBadgeText
          ctx.fillText("…", cx, cy + 0.5)
          ctx.restore()
        }
      }

      ctx.restore()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    blockOrder,
    dragState,
    editorTarget,
    getGridMetrics,
    getPlacementHeightBaselines,
    getPlacementRows,
    getPlacementSpan,
    hoveredTextGuidePlan,
    hoveredTextGuideRect,
    hoveredTextGuideRects,
    hoveredImageRect,
    imageOrder,
    imageRectsRef,
    overflowLinesByBlock,
    overlayCanvasRef,
    pixelRatio,
    previousPlansRef,
    result,
    rotation,
    scale,
    selectedLayerKey,
    showTypography,
    blockRectsRef,
    editorPlanVersion,
    hideHoveredGuideFill,
  ])
}
