import { useCallback, useMemo, useRef } from "react"
import type { RefObject } from "react"

import type { BlockRect, BlockRenderPlan, PagePoint } from "@/gui/preview/lib/preview-types"
import type { ModulePosition } from "@/core/types/preview-layout"
import {
  resolvePreviewHitTestTarget,
  type PreviewHitTestLayer,
  type PreviewHitTestTarget,
} from "@/core/preview/hitTest"

import type { PreviewGridMetrics } from "@/gui/preview/hooks/usePreviewGeometry"
import type { LayerDragYMode, LayerPlacementOptions } from "@/gui/preview/hooks/preview-canvas-interaction-types"
import { clampFreePlacementRow, clampLayerColumn } from "@/core/layout/layer-placement"

type Args<Key extends string> = {
  blockRectsRef: RefObject<Record<Key, BlockRect> | null>
  imageRectsRef: RefObject<Record<Key, BlockRect> | null>
  previousPlansRef: RefObject<Map<Key, BlockRenderPlan<Key>> | null>
  resolvedLayerOrder: readonly Key[]
  imageOrder: readonly Key[]
  selectedLayerKey?: Key | null
  showImagePlaceholders: boolean
  getGridMetrics: () => PreviewGridMetrics
  getPlacementSpan: (key: Key) => number
  isSnapToColumnsEnabled: (key: Key) => boolean
  isSnapToBaselineEnabled: (key: Key) => boolean
  isImageSnapToColumnsEnabled: (key: Key) => boolean
  isImageSnapToBaselineEnabled: (key: Key) => boolean
  isLayerLocked: (key: Key) => boolean
  toPagePointFromClient: (clientX: number, clientY: number) => PagePoint | null
}

export function usePreviewHitTesting<Key extends string>({
  blockRectsRef,
  imageRectsRef,
  previousPlansRef,
  resolvedLayerOrder,
  imageOrder,
  selectedLayerKey = null,
  showImagePlaceholders,
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
  const lastLoggedHoverTargetRef = useRef<string | null>(null)

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

  const getTextHitRects = useCallback((key: Key): readonly BlockRect[] => {
    const plan = previousPlansRef.current?.get(key)
    if (plan?.guideRects.length) return plan.guideRects
    const rect = blockRectsRef.current?.[key]
    return rect ? [rect] : []
  }, [blockRectsRef, previousPlansRef])

  const getImageHitRects = useCallback((key: Key): readonly BlockRect[] => {
    if (!showImagePlaceholders) return []
    const rect = imageRectsRef.current?.[key]
    return rect ? [rect] : []
  }, [imageRectsRef, showImagePlaceholders])

  const buildHitTestLayers = useCallback((): PreviewHitTestLayer<Key>[] => {
    const layers: PreviewHitTestLayer<Key>[] = []
    for (const key of resolvedLayerOrder) {
      const isImage = imageKeySet.has(key)
      layers.push({
        key,
        kind: isImage ? "image" : "text",
        locked: isLayerLocked(key),
        rects: isImage ? getImageHitRects(key) : getTextHitRects(key),
      })
    }
    return layers
  }, [getImageHitRects, getTextHitRects, imageKeySet, isLayerLocked, resolvedLayerOrder])

  const logHoverHitTestResult = useCallback((
    pageX: number,
    pageY: number,
    target: PreviewHitTestTarget<Key> | null,
  ) => {
    if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_PREVIEW_HITTEST_DEBUG !== "1") return
    const signature = target ? `${target.kind}:${target.key}` : "none"
    if (lastLoggedHoverTargetRef.current === signature) return
    lastLoggedHoverTargetRef.current = signature
    console.debug("[preview hitTest]", {
      target: signature,
      pageX: Number(pageX.toFixed(2)),
      pageY: Number(pageY.toFixed(2)),
    })
  }, [])

  const findTopmostLayerAtPoint = useCallback((
    pageX: number,
    pageY: number,
    { includeLocked = false }: { includeLocked?: boolean } = {},
  ): Key | null => {
    return resolvePreviewHitTestTarget({
      pageX,
      pageY,
      layers: buildHitTestLayers(),
      selectedKey: selectedLayerKey,
      includeLocked,
      imagePriority: "visual",
    })?.key ?? null
  }, [buildHitTestLayers, selectedLayerKey])

  const findTopmostHoverTargetAtPoint = useCallback((
    pageX: number,
    pageY: number,
    currentTextKey: Key | null = null,
    currentImageKey: Key | null = null,
  ): PreviewHitTestTarget<Key> | null => {
    const target = resolvePreviewHitTestTarget({
      pageX,
      pageY,
      layers: buildHitTestLayers(),
      selectedKey: selectedLayerKey,
      currentTextKey,
      currentImageKey,
      includeLocked: true,
      imagePriority: "afterText",
    })
    logHoverHitTestResult(pageX, pageY, target)
    return target
  }, [buildHitTestLayers, logHoverHitTestResult, selectedLayerKey])

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
    findTopmostHoverTargetAtPoint,
    findTopmostDraggableAtPoint,
    resolveSelectedLayerAtClientPoint,
  }
}
