import { useCallback, useMemo } from "react"
import type { RefObject } from "react"

import type { BlockRect, BlockRenderPlan, PagePoint } from "@/lib/preview-types"
import type { ModulePosition } from "@/lib/types/preview-layout"

import type { PreviewGridMetrics } from "@/gui/preview/hooks/usePreviewGeometry"
import type { LayerDragYMode, LayerPlacementOptions } from "@/gui/preview/hooks/preview-canvas-interaction-types"
import { clampFreePlacementRow, clampLayerColumn } from "@/lib/layer-placement"
import { isPointWithinRect, resolvePreviewHoverBandRect } from "@/lib/preview-hover-affordance"

type Args<Key extends string> = {
  blockRectsRef: RefObject<Record<Key, BlockRect> | null>
  imageRectsRef: RefObject<Record<Key, BlockRect> | null>
  previousPlansRef: RefObject<Map<Key, BlockRenderPlan<Key>> | null>
  resolvedLayerOrder: readonly Key[]
  imageOrder: readonly Key[]
  showImagePlaceholders: boolean
  pageWidth: number
  pageHeight: number
  getGridMetrics: () => PreviewGridMetrics
  getPlacementSpan: (key: Key) => number
  isSnapToColumnsEnabled: (key: Key) => boolean
  isSnapToBaselineEnabled: (key: Key) => boolean
  isImageSnapToColumnsEnabled: (key: Key) => boolean
  isImageSnapToBaselineEnabled: (key: Key) => boolean
  isLayerLocked: (key: Key) => boolean
  toPagePointFromClient: (clientX: number, clientY: number) => PagePoint | null
}

const TEXT_LINE_HIT_PADDING_X = 6
const TEXT_LINE_HIT_PADDING_Y = 4

function isPointWithinRenderedLine(
  pageX: number,
  pageY: number,
  line: { left: number; top: number; width: number; height: number },
): boolean {
  return (
    pageX >= line.left - TEXT_LINE_HIT_PADDING_X
    && pageX <= line.left + line.width + TEXT_LINE_HIT_PADDING_X
    && pageY >= line.top - TEXT_LINE_HIT_PADDING_Y
    && pageY <= line.top + line.height + TEXT_LINE_HIT_PADDING_Y
  )
}

export function usePreviewHitTesting<Key extends string>({
  blockRectsRef,
  imageRectsRef,
  previousPlansRef,
  resolvedLayerOrder,
  imageOrder,
  showImagePlaceholders,
  pageWidth,
  pageHeight,
  getGridMetrics,
  getPlacementSpan,
  isSnapToColumnsEnabled,
  isSnapToBaselineEnabled,
  isImageSnapToColumnsEnabled,
  isImageSnapToBaselineEnabled,
  isLayerLocked,
  toPagePointFromClient,
}: Args<Key>) {
  const imageKeySet = useMemo(() => new Set(imageOrder), [imageOrder])

  const clampModulePosition = useCallback((position: ModulePosition, key: Key): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getPlacementSpan(key)
    const maxCol = Math.max(0, metrics.gridCols - span)
    return {
      col: Math.max(0, Math.min(maxCol, position.col)),
      row: Math.max(0, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getGridMetrics, getPlacementSpan])

  const clampBaselinePosition = useCallback((position: ModulePosition, key: Key): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getPlacementSpan(key)
    return {
      col: clampLayerColumn(position.col, { span, gridCols: metrics.gridCols }),
      row: clampFreePlacementRow(position.row, metrics.maxBaselineRow),
    }
  }, [getGridMetrics, getPlacementSpan])

  const snapToModule = useCallback((pageX: number, pageY: number, key: Key): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = metrics.getNearestCol(pageX)
    const moduleIndex = metrics.getNearestRowIndex(pageY)
    const rawRow = metrics.getRowStartBaseline(moduleIndex)
    return clampModulePosition({ col: rawCol, row: rawRow }, key)
  }, [clampModulePosition, getGridMetrics])

  const snapToBaseline = useCallback((pageX: number, pageY: number, key: Key): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = metrics.getNearestCol(pageX)
    const rawRow = Math.round((pageY - metrics.baselineOriginTop) / metrics.baselineStep)
    return clampBaselinePosition({ col: rawCol, row: rawRow }, key)
  }, [clampBaselinePosition, getGridMetrics])

  const resolveLayerPlacement = useCallback((
    pageX: number,
    pageY: number,
    key: Key,
    options: LayerPlacementOptions = {},
  ): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getPlacementSpan(key)
    const isImage = imageKeySet.has(key)
    const snapToColumns = isImage ? isImageSnapToColumnsEnabled(key) : isSnapToColumnsEnabled(key)
    const snapToBaseline = isImage ? isImageSnapToBaselineEnabled(key) : isSnapToBaselineEnabled(key)
    const dragYMode: LayerDragYMode = options.dragYMode ?? (snapToBaseline ? "moduleTop" : "free")
    const rawCol = snapToColumns
      ? metrics.getNearestCol(pageX)
      : metrics.getInterpolatedCol(pageX)
    const rawRow = dragYMode === "baseline"
      ? Math.round((pageY - metrics.baselineOriginTop) / metrics.baselineStep)
      : dragYMode === "moduleTop"
        ? metrics.getRowStartBaseline(metrics.getNearestRowIndex(pageY))
        : (pageY - metrics.baselineOriginTop) / Math.max(metrics.baselineStep, 0.0001)
    return {
      col: clampLayerColumn(rawCol, { span, gridCols: metrics.gridCols, snapToColumns }),
      row: clampFreePlacementRow(rawRow, metrics.maxBaselineRow),
    }
  }, [
    getGridMetrics,
    getPlacementSpan,
    imageKeySet,
    isImageSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    isSnapToColumnsEnabled,
  ])

  const isPointWithinLayerHoverBand = useCallback((key: Key, pageX: number, pageY: number): boolean => {
    const isImage = imageKeySet.has(key)
    if (isImage && !showImagePlaceholders) return false
    const blockRects = blockRectsRef.current
    const imageRects = imageRectsRef.current
    const previousPlans = previousPlansRef.current
    const rect = isImage
      ? imageRects?.[key] ?? null
      : (previousPlans?.get(key)?.guideRects[0] ?? blockRects?.[key] ?? null)
    if (!rect) return false
    return isPointWithinRect(pageX, pageY, resolvePreviewHoverBandRect({
      targetRect: rect,
      pageWidth,
      pageHeight,
    }))
  }, [
    blockRectsRef,
    imageKeySet,
    imageRectsRef,
    pageHeight,
    pageWidth,
    previousPlansRef,
    showImagePlaceholders,
  ])

  const findTopmostLayerAtPoint = useCallback((
    pageX: number,
    pageY: number,
    { includeLocked = false }: { includeLocked?: boolean } = {},
  ): Key | null => {
    for (let index = resolvedLayerOrder.length - 1; index >= 0; index -= 1) {
      const key = resolvedLayerOrder[index]
      if (!includeLocked && isLayerLocked(key)) continue
      if (isPointWithinLayerHoverBand(key, pageX, pageY)) return key
    }

    for (let index = resolvedLayerOrder.length - 1; index >= 0; index -= 1) {
      const key = resolvedLayerOrder[index]
      if (!includeLocked && isLayerLocked(key)) continue
      const isImage = imageKeySet.has(key)
      if (isImage && !showImagePlaceholders) continue

      if (isImage) {
        const rect = imageRectsRef.current?.[key]
        if (!rect) continue
        if (isPointWithinRect(pageX, pageY, rect)) return key
        continue
      }

      const plan = previousPlansRef.current?.get(key)
      const lineHit = plan?.renderedLines.some((line) => isPointWithinRenderedLine(pageX, pageY, line)) ?? false
      if (lineHit) {
        return key
      }

      const guideHit = plan?.guideRects.some((guideRect) => isPointWithinRect(pageX, pageY, guideRect)) ?? false
      if (guideHit) {
        return key
      }

      const hasPlan = Boolean(plan)
      if (!hasPlan) {
        const rect = blockRectsRef.current?.[key]
        if (!rect) continue
        if (isPointWithinRect(pageX, pageY, rect)) {
          return key
        }
      }
    }
    return null
  }, [blockRectsRef, imageKeySet, imageRectsRef, isLayerLocked, isPointWithinLayerHoverBand, previousPlansRef, resolvedLayerOrder, showImagePlaceholders])

  const findTopmostBlockAtPoint = useCallback((pageX: number, pageY: number): Key | null => {
    const key = findTopmostLayerAtPoint(pageX, pageY)
    if (!key || imageKeySet.has(key)) return null
    return key
  }, [findTopmostLayerAtPoint, imageKeySet])

  const findTopmostImageAtPoint = useCallback((pageX: number, pageY: number): Key | null => {
    const key = findTopmostLayerAtPoint(pageX, pageY)
    if (!key || !imageKeySet.has(key)) return null
    return key
  }, [findTopmostLayerAtPoint, imageKeySet])

  const findTopmostHoverBlockAtPoint = useCallback((pageX: number, pageY: number): Key | null => {
    const key = findTopmostLayerAtPoint(pageX, pageY, { includeLocked: true })
    if (!key || imageKeySet.has(key)) return null
    return key
  }, [findTopmostLayerAtPoint, imageKeySet])

  const findTopmostHoverImageAtPoint = useCallback((pageX: number, pageY: number): Key | null => {
    const key = findTopmostLayerAtPoint(pageX, pageY, { includeLocked: true })
    if (!key || !imageKeySet.has(key)) return null
    return key
  }, [findTopmostLayerAtPoint, imageKeySet])

  const findTopmostDraggableAtPoint = useCallback((pageX: number, pageY: number): Key | null => (
    findTopmostLayerAtPoint(pageX, pageY)
  ), [findTopmostLayerAtPoint])

  const resolveSelectedLayerAtClientPoint = useCallback((clientX: number, clientY: number): Key | null => {
    const pagePoint = toPagePointFromClient(clientX, clientY)
    if (!pagePoint) return null
    return findTopmostDraggableAtPoint(pagePoint.x, pagePoint.y)
  }, [findTopmostDraggableAtPoint, toPagePointFromClient])

  return {
    clampModulePosition,
    clampBaselinePosition,
    snapToModule,
    snapToBaseline,
    resolveLayerPlacement,
    findTopmostLayerAtPoint,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    findTopmostHoverBlockAtPoint,
    findTopmostHoverImageAtPoint,
    findTopmostDraggableAtPoint,
    resolveSelectedLayerAtClientPoint,
  }
}
