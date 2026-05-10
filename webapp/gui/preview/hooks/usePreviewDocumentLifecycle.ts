import { useEffect } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import { areLayerOrdersEqual, reconcileLayerOrder } from "@/lib/preview-layer-order"
import type { FontFamily } from "@/lib/config/fonts"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"

type Args<StyleKey extends string, Key extends string, DragState, TextEditorState, ImageEditorState> = {
  historyResetToken: number
  initialLayout: PreviewLayoutState<StyleKey, FontFamily, Key> | null
  initialLayoutToken: number
  requestedLayerOrder: Key[] | null
  requestedLayerOrderToken: number
  lastHistoryResetTokenRef: MutableRefObject<number>
  lastAppliedLayoutKeyRef: MutableRefObject<number>
  lastAppliedImageLayoutKeyRef: MutableRefObject<number>
  lastAppliedCustomSizeLayoutKeyRef: MutableRefObject<number>
  lastAppliedLayerLayoutKeyRef: MutableRefObject<number>
  lastAppliedLockLayoutKeyRef: MutableRefObject<number>
  lastAppliedLayerRequestKeyRef: MutableRefObject<number>
  lastAppliedLayerDeleteRequestKeyRef: MutableRefObject<number>
  lastAppliedLayerLockRequestKeyRef: MutableRefObject<number>
  suppressReflowCheckRef: MutableRefObject<boolean>
  resetHistory: () => void
  resetImageTransientState: () => void
  clearHover: () => void
  setDragState: Dispatch<SetStateAction<DragState | null>>
  setEditorState: Dispatch<SetStateAction<TextEditorState | null>>
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  recordHistoryBeforeChange: () => void
  pushHistory: (snapshot: PreviewLayoutState<StyleKey, FontFamily, Key>) => void
  buildSnapshot: () => PreviewLayoutState<StyleKey, FontFamily, Key>
  applySnapshot: (snapshot: PreviewLayoutState<StyleKey, FontFamily, Key>) => void
  blockOrder: Key[]
  imageOrder: Key[]
  layerOrder: Key[]
  setLayerOrder: Dispatch<SetStateAction<Key[]>>
}

export function usePreviewDocumentLifecycle<
  StyleKey extends string,
  Key extends string,
  DragState,
  TextEditorState,
  ImageEditorState,
>({
  historyResetToken,
  initialLayout,
  initialLayoutToken,
  requestedLayerOrder,
  requestedLayerOrderToken,
  lastHistoryResetTokenRef,
  lastAppliedLayoutKeyRef,
  lastAppliedImageLayoutKeyRef,
  lastAppliedCustomSizeLayoutKeyRef,
  lastAppliedLayerLayoutKeyRef,
  lastAppliedLockLayoutKeyRef,
  lastAppliedLayerRequestKeyRef,
  lastAppliedLayerDeleteRequestKeyRef,
  lastAppliedLayerLockRequestKeyRef,
  suppressReflowCheckRef,
  resetHistory,
  resetImageTransientState,
  clearHover,
  setDragState,
  setEditorState,
  setImageEditorState,
  recordHistoryBeforeChange,
  pushHistory,
  buildSnapshot,
  applySnapshot,
  blockOrder,
  imageOrder,
  layerOrder,
  setLayerOrder,
}: Args<StyleKey, Key, DragState, TextEditorState, ImageEditorState>) {
  useEffect(() => {
    if (historyResetToken === lastHistoryResetTokenRef.current) return
    lastHistoryResetTokenRef.current = historyResetToken
    resetHistory()
    lastAppliedLayoutKeyRef.current = 0
    lastAppliedImageLayoutKeyRef.current = 0
    lastAppliedCustomSizeLayoutKeyRef.current = 0
    lastAppliedLayerLayoutKeyRef.current = 0
    lastAppliedLockLayoutKeyRef.current = 0
    lastAppliedLayerRequestKeyRef.current = 0
    lastAppliedLayerDeleteRequestKeyRef.current = 0
    lastAppliedLayerLockRequestKeyRef.current = 0
    suppressReflowCheckRef.current = true
    resetImageTransientState()
    setDragState(null)
    clearHover()
    setEditorState(null)
  }, [
    clearHover,
    historyResetToken,
    lastAppliedCustomSizeLayoutKeyRef,
    lastAppliedImageLayoutKeyRef,
    lastAppliedLayerDeleteRequestKeyRef,
    lastAppliedLayerLockRequestKeyRef,
    lastAppliedLayerLayoutKeyRef,
    lastAppliedLockLayoutKeyRef,
    lastAppliedLayerRequestKeyRef,
    lastAppliedLayoutKeyRef,
    lastHistoryResetTokenRef,
    resetHistory,
    resetImageTransientState,
    setDragState,
    setEditorState,
    suppressReflowCheckRef,
  ])

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedLayoutKeyRef.current === initialLayoutToken) return
    if (lastAppliedLayoutKeyRef.current !== 0) {
      pushHistory(buildSnapshot())
    }
    lastAppliedLayoutKeyRef.current = initialLayoutToken
    lastAppliedImageLayoutKeyRef.current = initialLayoutToken
    lastAppliedLayerLayoutKeyRef.current = initialLayoutToken
    lastAppliedCustomSizeLayoutKeyRef.current = initialLayoutToken
    lastAppliedLockLayoutKeyRef.current = initialLayoutToken
    suppressReflowCheckRef.current = true
    applySnapshot(initialLayout)
    setDragState(null)
    clearHover()
    setEditorState(null)
    setImageEditorState(null)
  }, [
    applySnapshot,
    buildSnapshot,
    clearHover,
    initialLayout,
    initialLayoutToken,
    lastAppliedCustomSizeLayoutKeyRef,
    lastAppliedImageLayoutKeyRef,
    lastAppliedLayerLayoutKeyRef,
    lastAppliedLayoutKeyRef,
    lastAppliedLockLayoutKeyRef,
    pushHistory,
    setDragState,
    setEditorState,
    setImageEditorState,
    suppressReflowCheckRef,
  ])

  useEffect(() => {
    if (!requestedLayerOrder || requestedLayerOrderToken === 0) return
    if (lastAppliedLayerRequestKeyRef.current === requestedLayerOrderToken) return
    lastAppliedLayerRequestKeyRef.current = requestedLayerOrderToken
    const nextLayerOrder = reconcileLayerOrder(requestedLayerOrder, blockOrder, imageOrder)
    if (areLayerOrdersEqual(layerOrder, nextLayerOrder)) return
    recordHistoryBeforeChange()
    setLayerOrder(nextLayerOrder)
  }, [
    blockOrder,
    imageOrder,
    lastAppliedLayerRequestKeyRef,
    layerOrder,
    recordHistoryBeforeChange,
    requestedLayerOrder,
    requestedLayerOrderToken,
    setLayerOrder,
  ])
}
