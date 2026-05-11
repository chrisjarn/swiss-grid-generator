import { useCallback } from "react"
import type { Dispatch, RefObject, SetStateAction } from "react"

import type { BlockEditorState } from "@/gui/editors/block-editor-types"
import { normalizeHeightMetrics } from "@/core/layout/block-height"
import { getBlockEditorLiveSignature } from "@/gui/editors/lib/block-editor-signature"
import type { FontFamily } from "@/core/config/fonts"
import { clampFxLeading } from "@/core/layout/block-constraints"
import { removeTextLayerFromCollections } from "@/gui/preview/lib/preview-layer-state"
import { buildExistingBlockEditorState } from "@/gui/preview/lib/preview-block-editor-state"
import {
  applyEditorDraftLeadingOverride,
  applyEditorDraftSizeOverride,
  applyEditorDraftTextColorOverride,
  removeEditorOverrideKey,
} from "@/gui/preview/lib/preview-block-editor-overrides"
import {
  applyBlockEditorDraftToCollections,
  type PreviewTextLayerCollectionsState,
} from "@/gui/preview/lib/preview-text-layer-state"
import type { NoticeRequest, PagePoint } from "@/gui/preview/lib/preview-types"
import type { TextFormatRun } from "@/core/layout/text-format-runs"
import type { ModulePosition, TextAlignMode, TextVerticalAlignMode } from "@/core/types/layout-primitives"
import { useBlockEditorCanvasDoubleClick } from "@/gui/editors/hooks/useBlockEditorCanvasDoubleClick"
import type { Updater } from "@/gui/editors/hooks/useStateCommands"
import type { TextTrackingRun } from "@/core/layout/text-tracking-runs"

type EditorState = BlockEditorState<string>

type AutoFitResult = { span: number; position: ModulePosition | null } | null

function resolveSpanAnchoredPosition({
  position,
  previousSpan,
  nextSpan,
  align,
}: {
  position: ModulePosition | undefined
  previousSpan: number
  nextSpan: number
  align: TextAlignMode
}): ModulePosition | undefined {
  if (!position) return position
  if (previousSpan === nextSpan) return position
  if (align !== "right") return position
  return {
    ...position,
    col: position.col + previousSpan - nextSpan,
  }
}

type Args = {
  showTypography: boolean
  dragEndedAtRef: RefObject<number | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  editorState: EditorState | null
  editorStateRef: RefObject<EditorState | null>
  setEditorState: Dispatch<SetStateAction<EditorState | null>>
  baseFont: FontFamily
  resultGridCols: number
  resultGridRows: number
  resultTypographyStyles: Record<string, { weight?: string; blockItalic?: boolean }>
  textContent: Record<string, string>
  activeParagraphCount: number
  blockTextEdited: Record<string, boolean>
  styleAssignments: Record<string, string>
  blockCustomSizes: Partial<Record<string, number>>
  blockCustomLeadings: Partial<Record<string, number>>
  blockTextAlignments: Partial<Record<string, TextAlignMode>>
  blockVerticalAlignments: Partial<Record<string, TextVerticalAlignMode>>
  blockModulePositions: Partial<Record<string, ModulePosition>>
  recordHistoryBeforeChange: () => void
  setBlockCollections: (
    updater: (prev: PreviewTextLayerCollectionsState) => PreviewTextLayerCollectionsState,
  ) => void
  setBlockCustomSizes: (next: Updater<Partial<Record<string, number>>>) => void
  setBlockCustomLeadings: (next: Updater<Partial<Record<string, number>>>) => void
  setBlockTextColors: (next: Updater<Partial<Record<string, string>>>) => void
  getAutoFitForPlacement: (args: {
    key: string
    text: string
    styleKey: string
    rowSpan: number
    heightBaselines: number
    reflow: boolean
    syllableDivision: boolean
    fontFamily?: FontFamily
    fontWeight?: number
    italic?: boolean
    opticalKerning?: boolean
    trackingScale?: number
    trackingRuns?: readonly TextTrackingRun[]
    baselineMultiplierOverride?: number
    position?: ModulePosition
  }) => AutoFitResult
  getGridMetrics: () => { maxBaselineRow: number; rowStartBaselines: number[] }
  isBaseBlockId: (key: string) => boolean
  getNextCustomBlockId: () => string
  getDummyTextForStyle: (style: string) => string
  getStyleSize: (style: string) => number
  getStyleLeading: (style: string) => number
  getBlockTextColor: (key: string) => string
  defaultTextColor: string
  resultGridUnit: number
  toPagePoint: (canvasX: number, canvasY: number) => PagePoint | null
  findTopmostBlockAtPoint: (pageX: number, pageY: number) => string | null
  resolveModulePositionAtPagePoint: (pageX: number, pageY: number) => ModulePosition | null
  snapToModule: (pageX: number, pageY: number, key: string) => ModulePosition
  getBlockFont: (key: string) => FontFamily
  getBlockFontWeight: (key: string) => number
  getBlockTrackingScale: (key: string) => number
  getBlockTrackingRuns: (key: string) => TextTrackingRun[]
  getBlockTextFormatRuns: (key: string, color: string) => TextFormatRun<string, FontFamily>[]
  getBlockSpan: (key: string) => number
  getBlockRows: (key: string) => number
  getBlockHeightBaselines: (key: string) => number
  isTextReflowEnabled: (key: string) => boolean
  isSyllableDivisionEnabled: (key: string) => boolean
  isSnapToColumnsEnabled: (key: string) => boolean
  isSnapToBaselineEnabled: (key: string) => boolean
  isBlockItalic: (key: string) => boolean
  isBlockOpticalKerningEnabled: (key: string) => boolean
  getBlockRotation: (key: string) => number
  promoteLayerToTop: (key: string) => void
  onRequestNotice?: (notice: NoticeRequest) => void
  onParagraphCreated?: (key: string, point: PagePoint) => void
}

export function useBlockEditorActions({
  showTypography,
  dragEndedAtRef,
  canvasRef,
  editorState,
  editorStateRef,
  setEditorState,
  baseFont,
  resultGridCols,
  resultGridRows,
  resultTypographyStyles,
  textContent,
  activeParagraphCount,
  blockTextEdited,
  styleAssignments,
  blockCustomSizes,
  blockCustomLeadings,
  blockTextAlignments,
  blockVerticalAlignments,
  blockModulePositions,
  recordHistoryBeforeChange,
  setBlockCollections,
  setBlockCustomSizes,
  setBlockCustomLeadings,
  setBlockTextColors,
  getAutoFitForPlacement,
  getGridMetrics,
  isBaseBlockId,
  getNextCustomBlockId,
  getDummyTextForStyle,
  getStyleSize,
  getStyleLeading,
  getBlockTextColor,
  defaultTextColor,
  resultGridUnit,
  toPagePoint,
  findTopmostBlockAtPoint,
  resolveModulePositionAtPagePoint,
  snapToModule,
  getBlockFont,
  getBlockFontWeight,
  getBlockTrackingScale,
  getBlockTrackingRuns,
  getBlockTextFormatRuns,
  getBlockSpan,
  getBlockRows,
  getBlockHeightBaselines,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isSnapToColumnsEnabled,
  isSnapToBaselineEnabled,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  getBlockRotation,
  promoteLayerToTop,
  onRequestNotice,
  onParagraphCreated,
}: Args) {
  const applyEditorDraftLive = useCallback((draft: EditorState) => {
    const height = normalizeHeightMetrics({
      rows: draft.draftRows,
      baselines: draft.draftHeightBaselines,
      gridRows: resultGridRows,
    })
    const effectiveReflow = draft.draftReflow && draft.draftColumns > 1
    const persistedSpan = getBlockSpan(draft.target)
    const existingPosition = resolveSpanAnchoredPosition({
      position: blockModulePositions[draft.target],
      previousSpan: persistedSpan,
      nextSpan: draft.draftColumns,
      align: draft.draftAlign,
    })
    const autoFit = getAutoFitForPlacement({
      key: draft.target,
      text: draft.draftText,
      styleKey: draft.draftStyle,
      rowSpan: height.rows,
      heightBaselines: height.baselines,
      reflow: effectiveReflow,
      syllableDivision: draft.draftSyllableDivision,
      fontFamily: draft.draftFont,
      fontWeight: draft.draftFontWeight,
      italic: draft.draftItalic,
      opticalKerning: draft.draftOpticalKerning,
      trackingScale: draft.draftTrackingScale,
      trackingRuns: draft.draftTrackingRuns,
      baselineMultiplierOverride: draft.draftStyle === "fx"
        ? clampFxLeading(draft.draftFxLeading) / resultGridUnit
        : undefined,
      position: existingPosition,
    })
    const metrics = getGridMetrics()
    setBlockCollections((prev) => {
      return applyBlockEditorDraftToCollections(prev, {
        draft: {
          ...draft,
          draftReflow: effectiveReflow,
        },
        baseFont,
        gridCols: resultGridCols,
        gridRows: resultGridRows,
        rowStartBaselines: metrics.rowStartBaselines,
        desiredPosition: autoFit?.position ?? existingPosition ?? null,
        typographyStyles: resultTypographyStyles,
      })
    })
    setBlockCustomSizes((prev) => {
      return applyEditorDraftSizeOverride(prev, draft, "fx")
    })
    setBlockCustomLeadings((prev) => {
      return applyEditorDraftLeadingOverride(prev, draft, "fx")
    })
    setBlockTextColors((prev) => {
      return applyEditorDraftTextColorOverride(prev, draft, defaultTextColor)
    })
  }, [
    baseFont,
    blockModulePositions,
    defaultTextColor,
    getBlockSpan,
    getAutoFitForPlacement,
    getGridMetrics,
    resultGridCols,
    resultGridRows,
    resultGridUnit,
    resultTypographyStyles,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockTextColors,
    setBlockCustomSizes,
  ])

  const commitLiveEditorDraft = useCallback(() => {
    const draft = editorStateRef.current
    if (!draft) return
    const persistedState = buildExistingBlockEditorState({
      key: draft.target,
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
    })
    if (getBlockEditorLiveSignature(persistedState) === getBlockEditorLiveSignature(draft)) return
    applyEditorDraftLive(draft)
  }, [
    applyEditorDraftLive,
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockTextEdited,
    blockVerticalAlignments,
    editorStateRef,
    getBlockFont,
    getBlockFontWeight,
    getBlockHeightBaselines,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getBlockTextColor,
    getBlockTextFormatRuns,
    getBlockTrackingRuns,
    getBlockTrackingScale,
    getStyleLeading,
    getStyleSize,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSnapToBaselineEnabled,
    isSnapToColumnsEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    styleAssignments,
    textContent,
  ])

  const removeCustomEditorTarget = useCallback((target: string) => {
    setBlockCollections((prev) => removeTextLayerFromCollections(prev, target))
    setBlockCustomSizes((prev) => removeEditorOverrideKey(prev, target))
    setBlockCustomLeadings((prev) => removeEditorOverrideKey(prev, target))
    setBlockTextColors((prev) => removeEditorOverrideKey(prev, target))
  }, [setBlockCollections, setBlockCustomLeadings, setBlockCustomSizes, setBlockTextColors])

  const finalizeEditorExit = useCallback(() => {
    const draft = editorStateRef.current
    if (!draft) {
      setEditorState(null)
      return
    }

    if (!isBaseBlockId(draft.target) && draft.draftText.trim().length === 0) {
      removeCustomEditorTarget(draft.target)
      setEditorState(null)
      return
    }

    commitLiveEditorDraft()
    setEditorState(null)
  }, [commitLiveEditorDraft, editorStateRef, isBaseBlockId, removeCustomEditorTarget, setEditorState])

  const closeEditor = useCallback(() => {
    finalizeEditorExit()
  }, [finalizeEditorExit])

  const saveEditor = useCallback(() => {
    finalizeEditorExit()
  }, [finalizeEditorExit])

  const deleteEditorBlock = useCallback(() => {
    if (!editorState) return
    recordHistoryBeforeChange()

    const target = editorState.target
    setBlockCollections((prev) => {
      if (isBaseBlockId(target)) {
        return {
          ...prev,
          textContent: {
            ...prev.textContent,
            [target]: "",
          },
          blockModulePositions: (() => {
            const next = { ...prev.blockModulePositions }
            delete next[target]
            return next
          })(),
        }
      }
      return prev
    })
    if (!isBaseBlockId(target)) {
      removeCustomEditorTarget(target)
    }
    setEditorState(null)
  }, [editorState, isBaseBlockId, recordHistoryBeforeChange, removeCustomEditorTarget, setBlockCollections, setEditorState])

  const handleCanvasDoubleClick = useBlockEditorCanvasDoubleClick({
    showTypography,
    dragEndedAtRef,
    canvasRef,
    setEditorState,
    resultGridCols,
    resultGridRows,
    textContent,
    activeParagraphCount,
    blockTextEdited,
    styleAssignments,
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockVerticalAlignments,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getBlockRotation,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getBlockTextColor,
    recordHistoryBeforeChange,
    setBlockCollections,
    getNextCustomBlockId,
    getDummyTextForStyle,
    getStyleLeading,
    getStyleSize,
    getGridMetrics,
    toPagePoint,
    findTopmostBlockAtPoint,
    resolveModulePositionAtPagePoint,
    snapToModule,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    promoteLayerToTop,
    onRequestNotice,
    onParagraphCreated,
  })

  return {
    closeEditor,
    saveEditor,
    applyEditorDraftLive,
    deleteEditorBlock,
    handleCanvasDoubleClick,
  }
}
