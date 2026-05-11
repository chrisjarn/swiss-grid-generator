import { useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import { type BlockEditorState } from "@/gui/editors/block-editor-types"
import { type ImageEditorState } from "@/gui/dialogs/ImageEditorDialog"
import { getBlockEditorLiveSignature } from "@/gui/editors/lib/block-editor-signature"
import {
  areFontFileMetricFacesLoaded,
  collectFontFileMetricFacesFromBlocks,
  preloadFontFileMetricFaces,
} from "@/core/layout/font-file-text-metrics-engine"
import { buildExistingBlockEditorState } from "@/gui/preview/lib/preview-block-editor-state"
import { useBlockEditorActions } from "@/gui/editors/hooks/useBlockEditorActions"
import { useCloseEditorsOnOutsidePointer } from "@/gui/editors/hooks/useCloseEditorsOnOutsidePointer"
import { usePreviewKeyboard, type PreviewNudgeRequest } from "@/gui/preview/hooks/usePreviewKeyboard"

type BlockEditorActionsArgs = Omit<
  Parameters<typeof useBlockEditorActions>[0],
  "editorState" | "editorStateRef" | "setEditorState"
>

type EditorState = BlockEditorState<string>
type OpenEditorOptions = { recordHistory?: boolean }

function collectEditorMetricFaces(editorState: EditorState) {
  return collectFontFileMetricFacesFromBlocks([{
    styleKey: editorState.draftStyle,
    fontFamily: editorState.draftFont,
    fontWeight: editorState.draftFontWeight,
    italic: editorState.draftItalic,
    textFormatRuns: editorState.draftTextFormatRuns,
  }])
}

type Args = {
  blockEditorArgs: BlockEditorActionsArgs
  blockOrder: string[]
  imageOrder: readonly string[]
  imageEditorState: ImageEditorState | null
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  openImageEditorState: (key: string) => void
  closeImageEditorState: () => void
  requestedLayerEditorTarget: string | null
  requestedLayerEditorToken: number
  lastAppliedLayerEditorRequestKeyRef: MutableRefObject<number>
  isLayerLocked: (key: string) => boolean
  editorSidebarHost: HTMLDivElement | null
  onSelectLayer?: (key: string | null) => void
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  shouldKeepEditorsOpenForPointerDown?: (event: PointerEvent) => boolean
  onUndoRequest?: () => void
  onRedoRequest?: () => void
  undo: () => void
  redo: () => void
  selectedLayerKey?: string | null
  onNudgeSelectedLayer?: (request: PreviewNudgeRequest) => boolean
}

export function usePreviewTextEditor({
  blockEditorArgs,
  blockOrder,
  imageOrder,
  imageEditorState,
  setImageEditorState,
  openImageEditorState,
  closeImageEditorState,
  requestedLayerEditorTarget,
  requestedLayerEditorToken,
  lastAppliedLayerEditorRequestKeyRef,
  isLayerLocked,
  editorSidebarHost,
  onSelectLayer,
  textareaRef,
  shouldKeepEditorsOpenForPointerDown,
  onUndoRequest,
  onRedoRequest,
  undo,
  redo,
  selectedLayerKey = null,
  onNudgeSelectedLayer,
}: Args) {
  const [editorState, setEditorStateState] = useState<EditorState | null>(null)
  const editorStateRef = useRef<EditorState | null>(null)
  const lastLiveEditorSignatureRef = useRef("")
  const lastLiveEditorTargetRef = useRef<string | null>(null)

  const setEditorState = useCallback((next: SetStateAction<EditorState | null>) => {
    const resolved = typeof next === "function"
      ? (next as (prev: EditorState | null) => EditorState | null)(editorStateRef.current)
      : next
    editorStateRef.current = resolved
    setEditorStateState(resolved)
  }, [])

  const {
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockVerticalAlignments,
    blockTextEdited,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getBlockTextColor,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getStyleLeading,
    getStyleSize,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    recordHistoryBeforeChange,
    styleAssignments,
    textContent,
  } = blockEditorArgs

  const {
    closeEditor,
    saveEditor,
    applyEditorDraftLive,
    deleteEditorBlock,
    handleCanvasDoubleClick: handleTextCanvasDoubleClick,
  } = useBlockEditorActions({
    ...blockEditorArgs,
    editorState,
    editorStateRef,
    setEditorState,
  })

  useEffect(() => {
    editorStateRef.current = editorState
  }, [editorState])

  useEffect(() => {
    if (!editorState) {
      lastLiveEditorSignatureRef.current = ""
      lastLiveEditorTargetRef.current = null
      return
    }
    const signature = getBlockEditorLiveSignature(editorState)
    if (lastLiveEditorTargetRef.current !== editorState.target) {
      lastLiveEditorTargetRef.current = editorState.target
      lastLiveEditorSignatureRef.current = signature
      return
    }
    if (lastLiveEditorSignatureRef.current === signature) return
    const metricFaces = collectEditorMetricFaces(editorState)
    if (areFontFileMetricFacesLoaded(metricFaces)) {
      lastLiveEditorSignatureRef.current = signature
      applyEditorDraftLive(editorState)
      return
    }

    let cancelled = false
    void preloadFontFileMetricFaces(metricFaces).then(() => {
      if (cancelled) return
      lastLiveEditorSignatureRef.current = signature
      applyEditorDraftLive(editorState)
    })
    return () => {
      cancelled = true
    }
  }, [applyEditorDraftLive, editorState])

  const openImageEditor = useCallback((key: string, options?: OpenEditorOptions) => {
    if (isLayerLocked(key)) return
    setEditorState(null)
    if (options?.recordHistory !== false) {
      recordHistoryBeforeChange()
    }
    openImageEditorState(key)
  }, [isLayerLocked, openImageEditorState, recordHistoryBeforeChange, setEditorState])

  const closeImageEditor = useCallback(() => {
    closeImageEditorState()
  }, [closeImageEditorState])

  const openTextEditor = useCallback((key: string, options?: OpenEditorOptions) => {
    if (isLayerLocked(key)) return
    setImageEditorState(null)
    if (options?.recordHistory !== false) {
      recordHistoryBeforeChange()
    }
    setEditorState(buildExistingBlockEditorState({
      key,
      styleAssignments,
      textContent,
      blockCustomSizes,
      blockCustomLeadings,
      blockTextAlignments,
      blockVerticalAlignments,
      blockTextEdited,
      getBlockFont,
      getBlockRotation,
      getBlockRows,
      getBlockHeightBaselines,
      getBlockSpan,
      getBlockTextColor,
      getBlockFontWeight,
      getBlockTrackingScale,
      getBlockTrackingRuns,
      getBlockTextFormatRuns,
      getStyleLeading,
      getStyleSize,
      isBlockItalic,
      isBlockOpticalKerningEnabled,
      isSnapToColumnsEnabled,
      isSnapToBaselineEnabled,
      isSyllableDivisionEnabled,
      isTextReflowEnabled,
      fallbackStyle: "body",
      fxStyle: "fx",
    }))
  }, [
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockVerticalAlignments,
    blockTextEdited,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getBlockTextColor,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getStyleLeading,
    getStyleSize,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSnapToBaselineEnabled,
    isSnapToColumnsEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    isLayerLocked,
    recordHistoryBeforeChange,
    setEditorState,
    setImageEditorState,
    styleAssignments,
    textContent,
  ])

  useEffect(() => {
    if (!requestedLayerEditorTarget || requestedLayerEditorToken === 0) return
    if (lastAppliedLayerEditorRequestKeyRef.current === requestedLayerEditorToken) return
    lastAppliedLayerEditorRequestKeyRef.current = requestedLayerEditorToken

    if (imageOrder.includes(requestedLayerEditorTarget)) {
      if (imageEditorState?.target === requestedLayerEditorTarget && !editorState) return
      openImageEditor(requestedLayerEditorTarget)
      return
    }

    if (!blockOrder.includes(requestedLayerEditorTarget)) return
    if (editorState?.target === requestedLayerEditorTarget && !imageEditorState) return
    openTextEditor(requestedLayerEditorTarget)
  }, [
    blockOrder,
    editorState,
    imageEditorState,
    editorState?.target,
    imageEditorState?.target,
    imageOrder,
    lastAppliedLayerEditorRequestKeyRef,
    openImageEditor,
    openTextEditor,
    requestedLayerEditorToken,
    requestedLayerEditorTarget,
  ])

  useEffect(() => {
    if (imageEditorState?.target) {
      onSelectLayer?.(imageEditorState.target)
      return
    }
    if (editorState?.target) {
      onSelectLayer?.(editorState.target)
    }
  }, [editorState?.target, imageEditorState?.target, onSelectLayer])

  const focusEditor = useCallback(() => {
    if (!editorStateRef.current) return
    const element = textareaRef.current
    if (!element || document.activeElement === element) return
    element.focus({ preventScroll: true })
  }, [textareaRef])

  const closeAnyEditor = useCallback(() => {
    closeEditor()
    closeImageEditor()
  }, [closeEditor, closeImageEditor])

  usePreviewKeyboard({
    editorTarget: editorState?.target ?? imageEditorState?.target ?? null,
    isEditorOpen: Boolean(editorState || imageEditorState),
    focusEditor,
    onCloseEditor: closeAnyEditor,
    undo: onUndoRequest ?? undo,
    redo: onRedoRequest ?? redo,
    selectedLayerKey,
    onNudgeSelectedLayer,
  })

  useCloseEditorsOnOutsidePointer({
    isEditorOpen: Boolean(editorState || imageEditorState),
    editorSidebarHost,
    textareaRef,
    onCloseEditors: closeAnyEditor,
    shouldKeepEditorsOpenForPointerDown,
  })

  return {
    editorState,
    setEditorState,
    closeEditor,
    closeImageEditor,
    openImageEditor,
    saveEditor,
    deleteEditorBlock,
    handleTextCanvasDoubleClick,
    openTextEditor,
  }
}
