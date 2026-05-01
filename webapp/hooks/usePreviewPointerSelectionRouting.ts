import { useCallback, useMemo } from "react"
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react"

import type {
  PreviewCanvasInteractionArgs,
  LayerPlacementOptions,
} from "@/hooks/preview-canvas-interaction-types"
import { usePreviewDrag, type DragState as PreviewDragState } from "@/hooks/usePreviewDrag"
import { PREVIEW_DRAG_CLICK_GUARD_MS } from "@/lib/preview-interaction-constants"
import type { ModulePosition } from "@/lib/types/layout-primitives"

type Args<Key extends string, StyleKey extends string> = Pick<
  PreviewCanvasInteractionArgs<Key, StyleKey>,
  | "showTypography"
  | "editorOpen"
  | "canvasRef"
  | "blockRectsRef"
  | "imageRectsRef"
  | "blockModulePositions"
  | "imageModulePositions"
  | "toPagePoint"
  | "toPagePointFromClient"
  | "resolveLayerPlacement"
  | "getDragAnchorPoint"
  | "findTopmostDraggableAtPoint"
  | "resolveSelectedLayerAtClientPoint"
  | "isImagePlaceholderKey"
  | "onSelectLayer"
  | "clearHover"
  | "dragEndedAtRef"
  | "touchLongPressMs"
  | "touchCancelDistancePx"
  | "openTextEditor"
  | "openImageEditor"
  | "isSnapToBaselineEnabled"
  | "isImageSnapToBaselineEnabled"
  | "tryApplyPendingTextStyleTransfer"
  | "tryApplyPendingLayerDuplicatePlacement"
  | "shouldApplyPendingLayerDuplicatePlacementBeforeDrag"
  | "onCopyPlacementCommitted"
> & {
  handleTextDrop: (drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => void
  handleImageDrop: (drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => void
  openTextEditorFromCanvas: (event: ReactMouseEvent<HTMLCanvasElement>) => void
  handleImageDoubleClick: (args: {
    event: ReactMouseEvent<HTMLCanvasElement>
    pagePoint: { x: number; y: number }
  }) => boolean
  activeEditorTarget: Key | null
}

export function usePreviewPointerSelectionRouting<Key extends string, StyleKey extends string>({
  showTypography,
  editorOpen,
  canvasRef,
  blockRectsRef,
  imageRectsRef,
  blockModulePositions,
  imageModulePositions,
  toPagePoint,
  toPagePointFromClient,
  resolveLayerPlacement,
  getDragAnchorPoint,
  findTopmostDraggableAtPoint,
  resolveSelectedLayerAtClientPoint,
  isImagePlaceholderKey,
  onSelectLayer,
  clearHover,
  isSnapToBaselineEnabled,
  isImageSnapToBaselineEnabled,
  dragEndedAtRef,
  touchLongPressMs,
  touchCancelDistancePx,
  openTextEditor,
  openImageEditor,
  tryApplyPendingTextStyleTransfer,
  tryApplyPendingLayerDuplicatePlacement,
  shouldApplyPendingLayerDuplicatePlacementBeforeDrag,
  onCopyPlacementCommitted,
  handleTextDrop,
  handleImageDrop,
  openTextEditorFromCanvas,
  handleImageDoubleClick,
  activeEditorTarget,
}: Args<Key, StyleKey>) {
  const draggableModulePositions = useMemo(
    () => ({
      ...blockModulePositions,
      ...imageModulePositions,
    }),
    [blockModulePositions, imageModulePositions],
  )

  const applyDragDrop = useCallback((drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    if (isImagePlaceholderKey(drag.key)) {
      handleImageDrop(drag, nextPreview, copyOnDrop)
      return
    }
    handleTextDrop(drag, nextPreview, copyOnDrop)
  }, [handleImageDrop, handleTextDrop, isImagePlaceholderKey])

  const {
    dragState,
    setDragState,
    beginDetachedCopyDrag: beginDetachedCopyDragInternal,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  } = usePreviewDrag<Key, LayerPlacementOptions | undefined>({
    showTypography,
    isEditorOpen: editorOpen,
    canvasRef,
    blockRectsRef,
    getBlockRect: (key) => blockRectsRef.current[key] ?? imageRectsRef.current[key] ?? null,
    blockModulePositions: draggableModulePositions,
    findTopmostBlockAtPoint: findTopmostDraggableAtPoint,
    toPagePoint,
    resolveDragPreviewPosition: (pageX, pageY, key, context) => resolveLayerPlacement(pageX, pageY, key, context),
    getDragAnchorPoint: (key, context) => getDragAnchorPoint?.(key, context) ?? null,
    getDragPreviewContext: (event, key) => {
      if (event.shiftKey || event.ctrlKey) {
        return { dragYMode: "baseline" }
      }
      return {
        dragYMode: isImagePlaceholderKey(key)
          ? (isImageSnapToBaselineEnabled(key) ? "moduleTop" : "free")
          : (isSnapToBaselineEnabled(key) ? "moduleTop" : "free"),
      }
    },
    onDrop: applyDragDrop,
    onClearHover: clearHover,
    touchLongPressMs,
    touchCancelDistancePx,
    dragEndedAtRef,
  })

  const beginDetachedCopyDrag = useCallback((key: Key, clientX: number, clientY: number) => {
    const dragPreviewContext: LayerPlacementOptions = {
      dragYMode: isImagePlaceholderKey(key)
        ? (isImageSnapToBaselineEnabled(key) ? "moduleTop" : "free")
        : (isSnapToBaselineEnabled(key) ? "moduleTop" : "free"),
    }
    beginDetachedCopyDragInternal(key, clientX, clientY, dragPreviewContext)
  }, [
    beginDetachedCopyDragInternal,
    isImagePlaceholderKey,
    isImageSnapToBaselineEnabled,
    isSnapToBaselineEnabled,
  ])

  const handlePreviewPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragState?.detached) {
      if (
        shouldApplyPendingLayerDuplicatePlacementBeforeDrag?.()
        && tryApplyPendingLayerDuplicatePlacement?.(event.clientX, event.clientY)
      ) {
        setDragState(null)
        return
      }
      handleCanvasPointerDown(event)
      onCopyPlacementCommitted?.()
      return
    }
    if (tryApplyPendingLayerDuplicatePlacement?.(event.clientX, event.clientY)) {
      return
    }
    const target = resolveSelectedLayerAtClientPoint(event.clientX, event.clientY)
    if (tryApplyPendingTextStyleTransfer?.(target ?? null)) {
      return
    }
    onSelectLayer?.(target)
    if (editorOpen && target && target !== activeEditorTarget) {
      clearHover()
      if (isImagePlaceholderKey(target)) {
        openImageEditor(target, { recordHistory: false })
      } else {
        openTextEditor(target, { recordHistory: false })
      }
    }
    handleCanvasPointerDown(event)
  }, [
    activeEditorTarget,
    clearHover,
    dragState,
    editorOpen,
    handleCanvasPointerDown,
    isImageSnapToBaselineEnabled,
    isImagePlaceholderKey,
    onSelectLayer,
    onCopyPlacementCommitted,
    openImageEditor,
    openTextEditor,
    resolveSelectedLayerAtClientPoint,
    shouldApplyPendingLayerDuplicatePlacementBeforeDrag,
    setDragState,
    tryApplyPendingLayerDuplicatePlacement,
    tryApplyPendingTextStyleTransfer,
  ])

  const handleCanvasDoubleClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < PREVIEW_DRAG_CLICK_GUARD_MS) return
    const pagePoint = toPagePointFromClient(event.clientX, event.clientY)
    if (!pagePoint) return

    if (handleImageDoubleClick({ event, pagePoint })) {
      return
    }

    openTextEditorFromCanvas(event)
  }, [
    dragEndedAtRef,
    handleImageDoubleClick,
    openTextEditorFromCanvas,
    resolveLayerPlacement,
    showTypography,
    toPagePointFromClient,
  ])

  return {
    dragState,
    setDragState,
    beginDetachedCopyDrag,
    handlePreviewPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
    handleCanvasDoubleClick,
  }
}
