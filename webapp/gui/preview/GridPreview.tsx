"use client"

import { GridPreviewCanvasStage } from "@/gui/preview/GridPreviewCanvasStage"
import { GridPreviewOverlays } from "@/gui/preview/GridPreviewOverlays"
import type { BlockEditorStyleOption } from "@/gui/editors/block-editor-types"
import { GridResult } from "@/core/layout/grid-calculator"
import type { DocumentationSectionId as HelpSectionId } from "@/core/document/documentation-sections"
import { usePreviewAutoFitPlacement } from "@/gui/preview/hooks/usePreviewAutoFitPlacement"
import { usePreviewCanvasInteractions } from "@/gui/preview/hooks/usePreviewCanvasInteractions"
import { usePreviewDocumentLifecycle } from "@/gui/preview/hooks/usePreviewDocumentLifecycle"
import { usePreviewGuideCanvases } from "@/gui/preview/hooks/usePreviewGuideCanvases"
import { useGridPreviewDocumentState } from "@/gui/preview/hooks/useGridPreviewDocumentState"
import { usePreviewGeometry } from "@/gui/preview/hooks/usePreviewGeometry"
import { usePreviewHoverState, type PreviewHoverState } from "@/gui/preview/hooks/usePreviewHoverState"
import { usePreviewHistory } from "@/gui/preview/hooks/usePreviewHistory"
import { usePreviewHitTesting } from "@/gui/preview/hooks/usePreviewHitTesting"
import { usePreviewInlineEditorLayout } from "@/gui/preview/hooks/usePreviewInlineEditorLayout"
import { usePreviewLayoutReflowController } from "@/gui/preview/hooks/usePreviewLayoutReflowController"
import { usePreviewOverlayControls } from "@/gui/preview/hooks/usePreviewOverlayControls"
import { usePreviewOverlayCanvas } from "@/gui/preview/hooks/usePreviewOverlayCanvas"
import { usePreviewTypographyMetrics } from "@/gui/preview/hooks/usePreviewTypographyMetrics"
import { usePreviewViewport } from "@/gui/preview/hooks/usePreviewViewport"
import { usePreviewLayerDelete } from "@/gui/preview/hooks/usePreviewLayerDelete"
import { usePreviewLayoutEmission } from "@/gui/preview/hooks/usePreviewLayoutEmission"
import { usePreviewPerf } from "@/gui/preview/hooks/usePreviewPerf"
import { usePreviewSmartTextZoomController } from "@/gui/preview/hooks/usePreviewSmartTextZoomController"
import { useTypographyRenderer } from "@/gui/preview/hooks/useTypographyRenderer"
import {
  PREVIEW_LAYOUT_CHANGE_DEBOUNCE_MS,
  PREVIEW_TOUCH_CANCEL_DISTANCE_PX,
  PREVIEW_TOUCH_LONG_PRESS_MS,
} from "@/gui/preview/lib/preview-interaction-constants"
import { clampRotation, hasSignificantRotation } from "@/core/layout/block-constraints"
import { buildSmartTextZoomGeometrySignature } from "@/gui/preview/lib/preview-smart-text-zoom"
import { getPreviewTextGuideBounds, getPreviewTextGuideRects } from "@/gui/preview/lib/preview-guide-rect"
import {
  isPointWithinRect,
  resolvePreviewResizeHandleHitRect,
} from "@/gui/preview/lib/preview-hover-affordance"
import { removeTextLayerFromCollections } from "@/gui/preview/lib/preview-layer-state"
import {
  clampTextBlockPosition,
  insertTextLayerDuplicateSnapshotInCollections,
  type TextLayerDuplicateSnapshot,
} from "@/gui/preview/lib/preview-text-layer-state"
import {
  applyOptionalTransferredValue,
  applyTextStyleTransferToCollections,
  type TextStyleTransferMode,
  type TextStyleTransferSnapshot,
} from "@/gui/preview/lib/preview-text-style-transfer"
import { resolveTextCopyAffordanceAction } from "@/gui/preview/lib/preview-copy-affordance"
import {
  resolveLayerResizeGeometry,
  resolveLayerResizePreviewGuideRects,
  resolveLayerResizeRect,
  type PreviewLayerResizeGeometry,
} from "@/gui/preview/lib/preview-text-resize"
import { omitOptionalRecordKey } from "@/lib/record-helpers"
import { clampFreePlacementRow, clampLayerColumn } from "@/core/layout/layer-placement"
import { findNearestAxisIndex } from "@/core/layout/grid-rhythm"
import {
  type BlockRect,
  type BlockRenderPlan,
  type NoticeRequest,
  type OverflowLinesByBlock,
  type PagePoint,
} from "@/gui/preview/lib/preview-types"
import { PREVIEW_STYLE_OPTIONS, formatPtSize, getDummyTextForStyle } from "@/gui/preview/lib/preview-text-config"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/core/types/preview-layout"
import type { TextAlignMode, TextVerticalAlignMode } from "@/core/types/layout-primitives"
import { getDefaultColumnSpan } from "@/core/layout/text-layout"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/core/layout/layout-engine-contract"
import { isBaseBlockId } from "@/core/document/defaults"
import {
  DEFAULT_BASE_FONT,
  getStyleDefaultFontWeight,
  type FontFamily,
} from "@/core/config/fonts"
import {
  DEFAULT_IMAGE_COLOR_SCHEME_ID,
  IMAGE_COLOR_SCHEMES,
  type ImageColorSchemeId,
} from "@/core/config/color-schemes"
import { usePreviewTextEditor } from "@/gui/preview/hooks/usePreviewTextEditor"
import type { DocumentVariableContext } from "@/core/document/variable-text"
import { translateMessage } from "@/core/i18n/messages"
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PendingTextStyleTransfer = TextStyleTransferSnapshot<BlockId, TypographyStyleKey>
type PendingLayerDuplicate =
  | {
      kind: "text"
      sourceKey: BlockId
      sourceLayoutToken: number
      snapshot: TextLayerDuplicateSnapshot<TypographyStyleKey>
      customSize?: number
      customLeading?: number
      textColor?: string
    }
  | {
      kind: "image"
      sourceKey: BlockId
      sourceLayoutToken: number
      columns: number
      rows: number
      heightBaselines: number
      color: string
      opacity: number
      snapToColumns: boolean
      snapToBaseline: boolean
      rotation: number
    }

type HeldPreviewFrame = {
  widthCss: number
  heightCss: number
  widthPx: number
  heightPx: number
  visible: boolean
}

type LayerResizeKind = "text" | "image"

type ParagraphRolloverControlPatch = Partial<{
  align: TextAlignMode
  verticalAlign: TextVerticalAlignMode
  rotation: number
  reflow: boolean
  hyphenation: boolean
  snapX: boolean
  snapY: boolean
}>

type ParagraphRolloverPreviewPatch = Pick<ParagraphRolloverControlPatch, "align" | "verticalAlign">

type ImageRolloverControlPatch = Partial<{
  rotation: number
  snapX: boolean
  snapY: boolean
}>

type LayerResizePreviewState = {
  kind: LayerResizeKind
  key: BlockId
  rect: BlockRect
  guideRects: BlockRect[]
  geometry: PreviewLayerResizeGeometry
}

function isSameLayerResizeGeometry(
  a: PreviewLayerResizeGeometry,
  b: PreviewLayerResizeGeometry,
): boolean {
  return a.columns === b.columns
    && a.rows === b.rows
    && a.heightBaselines === b.heightBaselines
}

function unionRects(rects: BlockRect[]): BlockRect | null {
  if (rects.length === 0) return null
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }
}

let runtimeIdCounter = 0
function createRuntimeId(prefix: "paragraph" | "image"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  runtimeIdCounter += 1
  return `${prefix}-${Date.now()}-${runtimeIdCounter}`
}
const getNextCustomBlockId = () => createRuntimeId("paragraph")
const getNextImagePlaceholderId = () => createRuntimeId("image")

function toPageSpaceRect(rect: BlockRect, scale: number): BlockRect {
  const safeScale = Math.max(scale, 0.0001)
  return {
    x: rect.x / safeScale,
    y: rect.y / safeScale,
    width: rect.width / safeScale,
    height: rect.height / safeScale,
  }
}

function roundLogicalStep(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 1_000_000) / 1_000_000
}

const FREE_AXIS_NUDGE_DIVISOR = 10

interface GridPreviewProps {
  result: GridResult
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders?: boolean
  showTypography: boolean
  showRolloverInfo?: boolean
  smartTextEditZoomEnabled?: boolean
  initialLayout?: PreviewLayoutState | null
  initialLayoutToken?: number
  focusToken?: number
  rotation?: number
  canvasBackground?: string | null
  undoNonce?: number
  redoNonce?: number
  historyResetToken?: number
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  onLayoutChange?: (layout: PreviewLayoutState) => void
  onSnapshotGetterChange?: (getSnapshot: (() => PreviewLayoutState) | null) => void
  onRequestGridRestore?: (cols: number, rows: number) => void
  onRequestGridReductionWarning?: (message: string) => void
  onHistoryAvailabilityChange?: (canUndo: boolean, canRedo: boolean) => void
  onHistoryRecord?: () => void
  externalHistory?: boolean
  onBeforePreviewMutation?: (layout: PreviewLayoutState) => void
  onUndoRequest?: () => void
  onRedoRequest?: () => void
  requestedLayerOrder?: BlockId[] | null
  requestedLayerOrderToken?: number
  requestedLayerDeleteTarget?: BlockId | null
  requestedLayerDeleteToken?: number
  requestedLayerEditorTarget?: BlockId | null
  requestedLayerEditorToken?: number
  requestedLayerLockTargets?: BlockId[] | null
  requestedLayerLockValue?: boolean
  requestedLayerLockToken?: number
  selectedLayerKey?: BlockId | null
  keyboardSelectedLayerKey?: BlockId | null
  hoveredLayerKey?: BlockId | null
  onHoverLayerChange?: (key: BlockId | null) => void
  onSelectLayer?: (key: BlockId | null) => void
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  onRequestNotice?: (notice: NoticeRequest) => void
  showEditorHelpIcon?: boolean
  showPreviewHelpIndicator?: boolean
  layoutEngine?: LayoutEngineContract
  baseFont?: FontFamily
  imageColorScheme?: ImageColorSchemeId
  documentVariableContext?: DocumentVariableContext | null
  onImageColorSchemeChange?: (value: ImageColorSchemeId) => void
  onShowImagePlaceholdersChange?: (value: boolean) => void
  editorSidebarHost?: HTMLDivElement | null
  onEditorModeChange?: (mode: "text" | "image" | null) => void
  onPreviewPlansCommit?: () => void
  onPreviewEditorOpen?: () => void
  onPreviewParagraphCreate?: (key?: BlockId, point?: PagePoint) => void
  onPreviewLayerCountsChange?: (counts: { text: number; images: number }) => void
  isDarkMode?: boolean
  presentationMode?: boolean
}

type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

export const GridPreview = memo(function GridPreview({
  result,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders = true,
  showTypography,
  showRolloverInfo = true,
  smartTextEditZoomEnabled = false,
  initialLayout = null,
  initialLayoutToken = 0,
  focusToken = 0,
  rotation = 0,
  canvasBackground = null,
  undoNonce = 0,
  redoNonce = 0,
  historyResetToken = 0,
  onCanvasReady,
  onLayoutChange,
  onSnapshotGetterChange,
  onRequestGridRestore,
  onRequestGridReductionWarning,
  onHistoryAvailabilityChange,
  onHistoryRecord,
  externalHistory = false,
  onBeforePreviewMutation,
  onUndoRequest,
  onRedoRequest,
  requestedLayerOrder = null,
  requestedLayerOrderToken = 0,
  requestedLayerDeleteTarget = null,
  requestedLayerDeleteToken = 0,
  requestedLayerEditorTarget = null,
  requestedLayerEditorToken = 0,
  requestedLayerLockTargets = null,
  requestedLayerLockValue = false,
  requestedLayerLockToken = 0,
  selectedLayerKey = null,
  keyboardSelectedLayerKey = null,
  hoveredLayerKey = null,
  onHoverLayerChange,
  onSelectLayer,
  onOpenHelpSection,
  onRequestNotice,
  showEditorHelpIcon = false,
  showPreviewHelpIndicator = false,
  layoutEngine = CURRENT_LAYOUT_ENGINE_CONTRACT,
  baseFont = DEFAULT_BASE_FONT,
  imageColorScheme = DEFAULT_IMAGE_COLOR_SCHEME_ID,
  documentVariableContext = null,
  onImageColorSchemeChange,
  onShowImagePlaceholdersChange,
  editorSidebarHost = null,
  onEditorModeChange,
  onPreviewPlansCommit,
  onPreviewEditorOpen,
  onPreviewParagraphCreate,
  onPreviewLayerCountsChange,
  isDarkMode = false,
  presentationMode = false,
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const previewScaleRef = useRef(1)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const heldFrameCanvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const imageRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const lastAppliedLayoutKeyRef = useRef(0)
  const lastAppliedImageLayoutKeyRef = useRef(0)
  const lastAppliedCustomSizeLayoutKeyRef = useRef(0)
  const lastAppliedLayerLayoutKeyRef = useRef(0)
  const lastAppliedLockLayoutKeyRef = useRef(0)
  const lastAppliedLayerRequestKeyRef = useRef(0)
  const lastAppliedLayerDeleteRequestKeyRef = useRef(0)
  const lastAppliedLayerEditorRequestKeyRef = useRef(0)
  const lastAppliedLayerLockRequestKeyRef = useRef(0)
  const suppressReflowCheckRef = useRef(false)
  const dragEndedAtRef = useRef(0)
  const rolloverControlHistoryKeyRef = useRef<BlockId | null>(null)
  const layoutEmissionFrameRef = useRef<number | null>(null)
  const typographyBufferRef = useRef<HTMLCanvasElement | null>(null)
  const previousPlansRef = useRef<Map<BlockId, BlockRenderPlan<BlockId>>>(new Map())
  const typographyBufferTransformRef = useRef("")
  const previewSurfaceSignatureRef = useRef<string | null>(null)
  const lastHistoryResetTokenRef = useRef(historyResetToken)
  const PERF_ENABLED = process.env.NODE_ENV !== "production"

  const [overflowLinesByBlock, setOverflowLinesByBlock] = useState<OverflowLinesByBlock<BlockId>>({})
  const [hoverState, setHoverState] = useState<PreviewHoverState<BlockId> | null>(null)
  const [hoverImageKey, setHoverImageKey] = useState<BlockId | null>(null)
  const [hoverCopyIntent, setHoverCopyIntent] = useState(false)
  const [layerResizePreview, setLayerResizePreview] = useState<LayerResizePreviewState | null>(null)
  const [pendingTextStyleTransfer, setPendingTextStyleTransfer] = useState<PendingTextStyleTransfer | null>(null)
  const [pendingLayerDuplicate, setPendingLayerDuplicate] = useState<PendingLayerDuplicate | null>(null)
  const [layoutEmissionEnabled, setLayoutEmissionEnabled] = useState(initialLayoutToken === 0)
  const [layoutDisplayReady, setLayoutDisplayReady] = useState(initialLayoutToken === 0)
  const [heldPreviewFrame, setHeldPreviewFrame] = useState<HeldPreviewFrame | null>(null)
  const [pendingLayerEditorMode, setPendingLayerEditorMode] = useState<"text" | "image" | null>(null)
  const [activeTextZoomTarget, setActiveTextZoomTarget] = useState<BlockId | null>(null)
  const [smartTextZoomTargetVersion, setSmartTextZoomTargetVersion] = useState(0)
  const [paragraphRolloverPreview, setParagraphRolloverPreview] = useState<{
    key: BlockId
    patch: ParagraphRolloverPreviewPatch
  } | null>(null)
  const HISTORY_LIMIT = 50
  const PERF_SAMPLE_LIMIT = 160
  const PERF_LOG_INTERVAL_MS = 10000

  const getSmartTextZoomTargetRect = useCallback(() => {
    if (!activeTextZoomTarget) return null
    const plan = previousPlansRef.current.get(activeTextZoomTarget)
    const currentScale = Math.max(previewScaleRef.current, 0.0001)
    const guideBoundsScaled = plan?.guideRects.length
      ? unionRects(plan.guideRects)
      : blockRectsRef.current[activeTextZoomTarget] ?? plan?.rect ?? null
    if (!guideBoundsScaled) return null

    const zoomBounds = toPageSpaceRect(guideBoundsScaled, currentScale)
    const renderedBoundsScaled = plan?.renderedLines.length
      ? unionRects(plan.renderedLines.map((line) => ({
          x: line.left,
          y: line.top,
          width: line.width,
          height: line.height,
        })))
      : null

    if (renderedBoundsScaled) {
      const guideRight = guideBoundsScaled.x + guideBoundsScaled.width
      const renderedRight = renderedBoundsScaled.x + renderedBoundsScaled.width
      const overflowLeft = guideBoundsScaled.x - renderedBoundsScaled.x
      const overflowRight = renderedRight - guideRight
      const overflowThreshold = Math.max(4, guideBoundsScaled.width * 0.01)
      const extraModuleWidth = result.module.width

      if (overflowLeft > overflowThreshold) {
        zoomBounds.x -= extraModuleWidth
        zoomBounds.width += extraModuleWidth
      }
      if (overflowRight > overflowThreshold) {
        zoomBounds.width += extraModuleWidth
      }
    }

    return zoomBounds
  }, [activeTextZoomTarget, result.module.width])

  const {
    scale,
    pixelRatio,
    isMobile,
    stageLeftCss,
    stageTopCss,
    pageWidthCss,
    pageHeightCss,
    pageWidthPx,
    pageHeightPx,
  } = usePreviewViewport({
    previewContainerRef,
    pageWidthPt: result.pageSizePt.width,
    pageHeightPt: result.pageSizePt.height,
    smartTextZoomEnabled: smartTextEditZoomEnabled && activeTextZoomTarget !== null,
    smartTextZoomTargetKey: activeTextZoomTarget,
    smartTextZoomTargetVersion,
    getSmartTextZoomTargetRect,
  })

  useEffect(() => {
    previewScaleRef.current = scale
  }, [scale])

  useEffect(() => {
    if (focusToken <= 0) return
    const frameId = window.requestAnimationFrame(() => {
      previewContainerRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [focusToken])

  const { recordPerfMetric } = usePreviewPerf({
    enabled: PERF_ENABLED,
    logIntervalMs: PERF_LOG_INTERVAL_MS,
    sampleLimit: PERF_SAMPLE_LIMIT,
  })

  const handleOverflowLinesChange = useCallback((next: OverflowLinesByBlock<BlockId>) => {
    setOverflowLinesByBlock((prev) => {
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length !== nextKeys.length) return next
      for (const key of nextKeys) {
        if ((prev[key] ?? 0) !== (next[key] ?? 0)) return next
      }
      return prev
    })
  }, [])

  const {
    getGridMetrics,
    toPagePoint,
    toPagePointFromClient,
    clampImageModulePosition,
    resolveModulePositionAtPagePoint,
  } = usePreviewGeometry({
    canvasRef,
    result,
    scale,
    pixelRatio,
    rotation,
  })

  const {
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockFontFamilies,
    blockFontWeights,
    blockOpticalKerning,
    blockTrackingScales,
    blockTrackingRuns,
    blockTextFormatRuns,
    blockGridPositions,
    blockModulePositions,
    blockColumnSpans,
    blockTextAlignments,
    blockVerticalAlignments,
    blockItalic,
    blockRotations,
    setBlockCollections,
    setBlockColumnSpans,
    setBlockModulePositions,
    layerOrder,
    setLayerOrder,
    resolvedLayerOrder,
    lockedLayers,
    setLockedLayers,
    isLayerLocked,
    blockCustomSizes,
    setBlockCustomSizes,
    blockCustomLeadings,
    setBlockCustomLeadings,
    blockTextColors,
    setBlockTextColors,
    imagePalette,
    defaultTextColor,
    imageOrder,
    setImageOrder,
    imageGridPositions,
    imageModulePositions,
    setImageModulePositions,
    setImageColumnSpans,
    setImageRowSpans,
    setImageHeightBaselines,
    setImageSnapToColumns,
    setImageSnapToBaseline,
    setImageRotations,
    setImageColors,
    setImageOpacities,
    imageEditorState,
    setImageEditorState,
    getImageSpan,
    getImageRows,
    getImageHeightBaselines,
    isImageSnapToColumnsEnabled,
    isImageSnapToBaselineEnabled,
    getImageRotation,
    getImageColorReference,
    getImageOpacity,
    isImagePlaceholderKey,
    openImageEditorState,
    closeImageEditorState,
    insertImagePlaceholder,
    resetImageTransientState,
    getBlockSpan,
    getBlockRows,
    getBlockHeightBaselines,
    getPlacementSpan,
    getPlacementRows,
    getPlacementHeightBaselines,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    getBlockFont,
    getStyleSize,
    getStyleLeading,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    getBlockRotation,
    buildSnapshot,
    activeParagraphCount,
    layoutRevisionKey,
    applySnapshot,
  } = useGridPreviewDocumentState({
    result,
    baseFont,
    imageColorScheme,
    getGridMetrics,
    onImageColorSchemeChange,
  })

  const buildPreviewRenderSnapshot = useCallback((): PreviewLayoutState => {
    const snapshot = buildSnapshot()
    if (!paragraphRolloverPreview || !blockOrder.includes(paragraphRolloverPreview.key)) return snapshot

    const { key, patch } = paragraphRolloverPreview
    return {
      ...snapshot,
      blockTextAlignments: patch.align === undefined
        ? snapshot.blockTextAlignments
        : {
            ...snapshot.blockTextAlignments,
            [key]: patch.align,
          },
      blockVerticalAlignments: patch.verticalAlign === undefined
        ? snapshot.blockVerticalAlignments
        : {
            ...snapshot.blockVerticalAlignments,
            [key]: patch.verticalAlign,
          },
    }
  }, [blockOrder, buildSnapshot, paragraphRolloverPreview])

  const {
    snapToModule,
    snapToBaseline,
    resolveLayerPlacement,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    findTopmostHoverTargetAtPoint,
    findTopmostDraggableAtPoint,
    resolveSelectedLayerAtClientPoint,
  } = usePreviewHitTesting({
    blockRectsRef,
    imageRectsRef,
    previousPlansRef,
    resolvedLayerOrder,
    imageOrder,
    selectedLayerKey,
    showImagePlaceholders,
    getGridMetrics,
    getPlacementSpan,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    isImageSnapToBaselineEnabled,
    isLayerLocked,
    toPagePointFromClient,
  })

  const {
    fontRenderEpoch,
    metricFacesReady,
    getWrappedText,
  } = usePreviewTypographyMetrics<BlockId, TypographyStyleKey>({
    showTypography,
    blockOrder,
    typographyStyles: result.typography.styles,
    getStyleKeyForBlock,
    getBlockFont,
    getBlockFontWeight,
    isBlockItalic,
    getBlockFontSize,
    getBlockTextColor,
    getBlockTextFormatRuns,
    layoutEngine,
    scale,
  })

  const previewSurfaceSignature = useMemo(() => JSON.stringify({
    initialLayoutToken,
    pageWidthPx,
    pageHeightPx,
    scale,
    pixelRatio,
    rotation,
    canvasBackground,
    showBaselines,
    showMargins,
    showModules,
    showTypography,
    showImagePlaceholders,
    fontRenderEpoch,
    pageSize: result.pageSizePt,
    grid: {
      margins: result.grid.margins,
      gridUnit: result.grid.gridUnit,
      gridMarginHorizontal: result.grid.gridMarginHorizontal,
      gridMarginVertical: result.grid.gridMarginVertical,
    },
    module: result.module,
    gridRows: result.settings.gridRows,
    gridCols: result.settings.gridCols,
  }), [
    canvasBackground,
    fontRenderEpoch,
    initialLayoutToken,
    pageHeightPx,
    pageWidthPx,
    pixelRatio,
    result.grid.gridMarginHorizontal,
    result.grid.gridMarginVertical,
    result.grid.gridUnit,
    result.grid.margins,
    result.module,
    result.pageSizePt,
    result.settings.gridCols,
    result.settings.gridRows,
    rotation,
    scale,
    showBaselines,
    showImagePlaceholders,
    showMargins,
    showModules,
    showTypography,
  ])

  const previewHistory = usePreviewHistory<PreviewLayoutState>({
    historyLimit: HISTORY_LIMIT,
    undoNonce,
    redoNonce,
    buildSnapshot,
    revisionKey: layoutRevisionKey,
    applySnapshot,
    onHistoryAvailabilityChange: externalHistory ? undefined : onHistoryAvailabilityChange,
    onRecordHistory: externalHistory ? undefined : onHistoryRecord,
  })

  const recordExternalHistoryBeforeChange = useCallback(() => {
    onBeforePreviewMutation?.(buildSnapshot())
  }, [buildSnapshot, onBeforePreviewMutation])

  const {
    pushHistory,
    recordHistoryBeforeChange,
    resetHistory,
    undo,
    redo,
  } = externalHistory
    ? {
        pushHistory: () => undefined,
        recordHistoryBeforeChange: recordExternalHistoryBeforeChange,
        resetHistory: () => undefined,
        undo: () => undefined,
        redo: () => undefined,
      }
    : previewHistory

  const getAutoFitForPlacement = usePreviewAutoFitPlacement<BlockId, TypographyStyleKey>({
    canvasRef,
    result,
    scale,
    typographyMetricsReady: metricFacesReady,
    getGridMetrics,
    getWrappedText,
    getBlockFontSize,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
  })

  const promoteLayerToTop = useCallback((key: BlockId) => {
    setLayerOrder((current) => [...current.filter((item) => item !== key), key])
  }, [setLayerOrder])

  const clearHover = useCallback(() => {
    setHoverState(null)
    setHoverImageKey(null)
    setHoverCopyIntent(false)
  }, [])

  const showImmediateTextHover = useCallback((key: BlockId, point: PagePoint) => {
    setHoverImageKey(null)
    setHoverCopyIntent(false)
    setHoverState({ key, point })
  }, [])

  const showImmediateImageHover = useCallback((key: BlockId) => {
    setHoverState(null)
    setHoverCopyIntent(false)
    setHoverImageKey(key)
  }, [])

  const buildTextStyleTransfer = (
    sourceKey: BlockId,
    mode: TextStyleTransferMode,
  ): PendingTextStyleTransfer | null => {
    if (isImagePlaceholderKey(sourceKey)) return null
    const includeParagraph = mode === "full" || mode === "paragraph" || mode === "both"
    const includeTypo = mode === "full" || mode === "typo" || mode === "both"

    return {
      sourceKey,
      mode,
      textContent: mode === "full" ? (textContent[sourceKey] ?? "") : undefined,
      textEdited: mode === "full" ? (blockTextEdited[sourceKey] ?? true) : undefined,
      paragraph: includeParagraph
        ? {
            columns: getBlockSpan(sourceKey),
            rows: getBlockRows(sourceKey),
            heightBaselines: getBlockHeightBaselines(sourceKey),
            align: blockTextAlignments[sourceKey] ?? "left",
            verticalAlign: blockVerticalAlignments[sourceKey] ?? "top",
            reflow: isTextReflowEnabled(sourceKey),
            syllableDivision: isSyllableDivisionEnabled(sourceKey),
            snapToColumns: isSnapToColumnsEnabled(sourceKey),
            snapToBaseline: isSnapToBaselineEnabled(sourceKey),
            rotation: blockRotations[sourceKey],
          }
        : undefined,
      typo: includeTypo
        ? {
            styleKey: getStyleKeyForBlock(sourceKey),
            fontFamily: blockFontFamilies[sourceKey],
            fontWeight: blockFontWeights[sourceKey],
            opticalKerning: blockOpticalKerning[sourceKey],
            trackingScale: blockTrackingScales[sourceKey],
            italic: blockItalic[sourceKey],
            customSize: blockCustomSizes[sourceKey],
            customLeading: blockCustomLeadings[sourceKey],
            textColor: blockTextColors[sourceKey],
            trackingRuns: mode === "full"
              ? getBlockTrackingRuns(sourceKey).map((run) => ({ ...run }))
              : undefined,
            textFormatRuns: mode === "full"
              ? getBlockTextFormatRuns(sourceKey, getBlockTextColor(sourceKey)).map((run) => ({ ...run }))
              : undefined,
          }
        : undefined,
    }
  }

  const buildTextDuplicateSnapshot = (sourceKey: BlockId): Extract<PendingLayerDuplicate, { kind: "text" }> | null => {
    if (isImagePlaceholderKey(sourceKey)) return null
    return {
      kind: "text",
      sourceKey,
      sourceLayoutToken: initialLayoutToken,
      snapshot: {
        text: textContent[sourceKey] ?? "",
        textEdited: blockTextEdited[sourceKey] ?? true,
        styleKey: getStyleKeyForBlock(sourceKey),
        sourceBaseFont: baseFont,
        fontFamily: blockFontFamilies[sourceKey],
        fontWeight: blockFontWeights[sourceKey],
        opticalKerning: blockOpticalKerning[sourceKey],
        trackingScale: blockTrackingScales[sourceKey],
        trackingRuns: blockTrackingRuns[sourceKey]?.map((run) => ({ ...run })),
        textFormatRuns: blockTextFormatRuns[sourceKey]?.map((run) => ({ ...run })),
        italic: blockItalic[sourceKey],
        rotation: blockRotations[sourceKey],
        columns: getBlockSpan(sourceKey),
        rows: getBlockRows(sourceKey),
        heightBaselines: getBlockHeightBaselines(sourceKey),
        align: blockTextAlignments[sourceKey] ?? "left",
        verticalAlign: blockVerticalAlignments[sourceKey] ?? "top",
        reflow: isTextReflowEnabled(sourceKey),
        syllableDivision: isSyllableDivisionEnabled(sourceKey),
        snapToColumns: isSnapToColumnsEnabled(sourceKey),
        snapToBaseline: isSnapToBaselineEnabled(sourceKey),
      },
      customSize: blockCustomSizes[sourceKey],
      customLeading: blockCustomLeadings[sourceKey],
      textColor: blockTextColors[sourceKey],
    }
  }

  const buildImageDuplicateSnapshot = (sourceKey: BlockId): Extract<PendingLayerDuplicate, { kind: "image" }> | null => {
    if (!isImagePlaceholderKey(sourceKey)) return null
    return {
      kind: "image",
      sourceKey,
      sourceLayoutToken: initialLayoutToken,
      columns: getImageSpan(sourceKey),
      rows: getImageRows(sourceKey),
      heightBaselines: getImageHeightBaselines(sourceKey),
      color: getImageColorReference(sourceKey),
      opacity: getImageOpacity(sourceKey),
      snapToColumns: isImageSnapToColumnsEnabled(sourceKey),
      snapToBaseline: isImageSnapToBaselineEnabled(sourceKey),
      rotation: getImageRotation(sourceKey),
    }
  }

  const announceTextStyleTransfer = useCallback((mode: TextStyleTransferMode) => {
    if (!onRequestNotice) return
    if (mode === "full") {
      onRequestNotice({
        title: translateMessage("ui.editor.overlayActions.paragraphCopiedTitle"),
        message: translateMessage("ui.editor.overlayActions.paragraphCopiedMessage"),
      })
      return
    }
    if (mode === "paragraph") {
      onRequestNotice({
        title: translateMessage("ui.editor.overlayActions.paragraphSettingsCopiedTitle"),
        message: translateMessage("ui.editor.overlayActions.paragraphSettingsCopiedMessage"),
      })
      return
    }
    if (mode === "typo") {
      onRequestNotice({
        title: translateMessage("ui.editor.overlayActions.typographyCopiedTitle"),
        message: translateMessage("ui.editor.overlayActions.typographyCopiedMessage"),
      })
      return
    }
    onRequestNotice({
      title: translateMessage("ui.editor.overlayActions.paragraphTypographyCopiedTitle"),
      message: translateMessage("ui.editor.overlayActions.paragraphTypographyCopiedMessage"),
    })
  }, [onRequestNotice])

  const baselinesPerGridModule = useMemo(
    () => Math.max(1, Math.round(result.module.height / Math.max(0.0001, result.grid.gridUnit))),
    [result.grid.gridUnit, result.module.height],
  )
  const overlayGridColumnRightEdgesCss = useMemo(() => {
    const metrics = getGridMetrics()
    const rightEdges: number[] = []
    metrics.moduleWidths.forEach((moduleWidth, index) => {
      const start = metrics.contentLeft + (metrics.colStarts[index] ?? 0) * scale
      const end = start + moduleWidth * scale
      if (Number.isFinite(end)) rightEdges.push(end)
    })
    return Array.from(new Set(rightEdges.map((edge) => Math.round(edge * 1000) / 1000)))
      .filter((edge) => edge >= 0 && edge <= result.pageSizePt.width * scale)
      .sort((a, b) => a - b)
  }, [getGridMetrics, result.pageSizePt.width, scale])
  const freeColumnNudgeStep = useMemo(
    () => 1 / (baselinesPerGridModule * FREE_AXIS_NUDGE_DIVISOR),
    [baselinesPerGridModule],
  )
  const freeRowNudgeStep = 1 / FREE_AXIS_NUDGE_DIVISOR

  const handleNudgeSelectedLayer = useCallback(({ direction, shiftKey }: { direction: "left" | "right" | "up" | "down"; shiftKey: boolean }) => {
    const key = keyboardSelectedLayerKey
    if (!key || isLayerLocked(key)) return false

    const isImage = isImagePlaceholderKey(key)
    const snapToColumns = isImage ? isImageSnapToColumnsEnabled(key) : isSnapToColumnsEnabled(key)
    const snapToBaseline = isImage ? isImageSnapToBaselineEnabled(key) : isSnapToBaselineEnabled(key)
    const delta = direction === "left" || direction === "up" ? -1 : 1
    const metrics = getGridMetrics()
    const fallbackRect = isImage ? imageRectsRef.current[key] : blockRectsRef.current[key]
    const fallbackPosition = fallbackRect
      ? resolveLayerPlacement(
          fallbackRect.x,
          fallbackRect.y,
          key,
          {
            dragYMode: snapToBaseline && shiftKey
              ? "baseline"
              : snapToBaseline
                ? "moduleTop"
                : "free",
          },
        )
      : null
    const currentPosition = (isImage ? imageModulePositions[key] : blockModulePositions[key]) ?? fallbackPosition
    if (!currentPosition) return false
    const freeAxisMultiplier = shiftKey ? FREE_AXIS_NUDGE_DIVISOR : 1

    let nextPosition = currentPosition
    if (direction === "left" || direction === "right") {
      nextPosition = {
        ...currentPosition,
        col: roundLogicalStep(currentPosition.col + delta * (snapToColumns ? 1 : freeColumnNudgeStep * freeAxisMultiplier)),
      }
    } else if (snapToBaseline && !shiftKey) {
      const rowStarts = metrics.rowStartBaselines
      const currentIndex = findNearestAxisIndex(rowStarts, currentPosition.row)
      const nextIndex = Math.max(0, Math.min(rowStarts.length - 1, currentIndex + delta))
      nextPosition = {
        ...currentPosition,
        row: rowStarts[nextIndex] ?? currentPosition.row,
      }
    } else {
      nextPosition = {
        ...currentPosition,
        row: roundLogicalStep(currentPosition.row + delta * freeRowNudgeStep * freeAxisMultiplier),
      }
    }

    if (isImage) {
      const span = getImageSpan(key)
      const clamped = {
        col: clampLayerColumn(nextPosition.col, { span, gridCols: result.settings.gridCols, snapToColumns }),
        row: clampFreePlacementRow(nextPosition.row, metrics.maxBaselineRow),
      }
      if (
        Math.abs(clamped.col - currentPosition.col) < 0.000001
        && Math.abs(clamped.row - currentPosition.row) < 0.000001
      ) {
        return false
      }
      recordHistoryBeforeChange()
      clearHover()
      setImageModulePositions((current) => ({
        ...current,
        [key]: clamped,
      }))
      return true
    }

    const span = getBlockSpan(key)
    const clamped = clampTextBlockPosition({
      position: nextPosition,
      span,
      gridCols: result.settings.gridCols,
      maxBaselineRow: metrics.maxBaselineRow,
      snapToColumns,
    })
    if (
      Math.abs(clamped.col - currentPosition.col) < 0.000001
      && Math.abs(clamped.row - currentPosition.row) < 0.000001
    ) {
      return false
    }
    recordHistoryBeforeChange()
    clearHover()
    setBlockModulePositions((current) => ({
      ...current,
      [key]: clamped,
    }))
    return true
  }, [
    blockModulePositions,
    clearHover,
    freeColumnNudgeStep,
    freeRowNudgeStep,
    getBlockSpan,
    getGridMetrics,
    getImageSpan,
    imageModulePositions,
    isImagePlaceholderKey,
    isImageSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    isLayerLocked,
    isSnapToBaselineEnabled,
    isSnapToColumnsEnabled,
    recordHistoryBeforeChange,
    resolveLayerPlacement,
    result.settings.gridCols,
    keyboardSelectedLayerKey,
    setBlockModulePositions,
    setImageModulePositions,
  ])

  const {
    editorState,
    setEditorState,
    closeEditor,
    closeImageEditor,
    openTextEditor,
    openImageEditor,
    saveEditor,
    deleteEditorBlock,
    handleTextCanvasDoubleClick,
  } = usePreviewTextEditor({
    blockEditorArgs: {
      showTypography,
      dragEndedAtRef,
      canvasRef,
      baseFont,
      resultGridCols: result.settings.gridCols,
      resultGridRows: result.settings.gridRows,
      resultTypographyStyles: result.typography.styles,
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
      resultGridUnit: result.grid.gridUnit,
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
      onParagraphCreated: (key, point) => {
        showImmediateTextHover(key, point)
        onPreviewParagraphCreate?.(key, point)
      },
    },
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
    shouldKeepEditorsOpenForPointerDown: (event: PointerEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest("[data-preview-header-action]")) {
        return true
      }
      if (target instanceof HTMLElement && target.closest("[data-preview-edit-affordance='true']")) {
        return true
      }
      if (!(target instanceof HTMLCanvasElement) && !(target instanceof HTMLElement && target.closest("canvas"))) {
        return false
      }
      return resolveSelectedLayerAtClientPoint(event.clientX, event.clientY) !== null
    },
    onUndoRequest,
    onRedoRequest,
    undo,
    redo,
    selectedLayerKey: keyboardSelectedLayerKey,
    onNudgeSelectedLayer: handleNudgeSelectedLayer,
  })
  const smartTextZoomGeometrySignature = useMemo(() => {
    if (!smartTextEditZoomEnabled || !editorState?.target) return null
    return buildSmartTextZoomGeometrySignature({
      target: editorState.target,
      columns: editorState.draftColumns,
      rows: editorState.draftRows,
      heightBaselines: editorState.draftHeightBaselines,
    })
  }, [
    editorState?.draftColumns,
    editorState?.draftHeightBaselines,
    editorState?.draftRows,
    editorState?.target,
    smartTextEditZoomEnabled,
  ])

  const tryApplyPendingTextStyleTransfer = useCallback((targetKey: BlockId | null): boolean => {
    if (!pendingTextStyleTransfer || !targetKey || isImagePlaceholderKey(targetKey) || isLayerLocked(targetKey)) {
      return false
    }

    closeEditor()
    closeImageEditor()
    recordHistoryBeforeChange()
    setBlockCollections((current) => (
      applyTextStyleTransferToCollections(current, targetKey, pendingTextStyleTransfer)
    ))
    if (pendingTextStyleTransfer.typo) {
      setBlockCustomSizes((current) => applyOptionalTransferredValue(
        current,
        targetKey,
        pendingTextStyleTransfer.typo?.customSize,
      ))
      setBlockCustomLeadings((current) => applyOptionalTransferredValue(
        current,
        targetKey,
        pendingTextStyleTransfer.typo?.customLeading,
      ))
      setBlockTextColors((current) => applyOptionalTransferredValue(
        current,
        targetKey,
        pendingTextStyleTransfer.typo?.textColor,
      ))
    }
    clearHover()
    onSelectLayer?.(targetKey)
    setPendingTextStyleTransfer(null)
    return true
  }, [
    clearHover,
    closeEditor,
    closeImageEditor,
    isImagePlaceholderKey,
    isLayerLocked,
    onSelectLayer,
    pendingTextStyleTransfer,
    recordHistoryBeforeChange,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockCustomSizes,
    setBlockTextColors,
  ])

  const resolvePendingDuplicatePosition = useCallback((clientX: number, clientY: number, {
    columns,
    snapToColumns,
    snapToBaseline,
  }: {
    columns: number
    snapToColumns: boolean
    snapToBaseline: boolean
  }) => {
    const pagePoint = toPagePointFromClient(clientX, clientY)
    if (!pagePoint) return null
    const modulePosition = resolveModulePositionAtPagePoint(pagePoint.x, pagePoint.y)
    if (!modulePosition) return null
    const metrics = getGridMetrics()
    const rawCol = snapToColumns
      ? modulePosition.col
      : metrics.getInterpolatedCol(pagePoint.x)
    const rawRow = snapToBaseline
      ? modulePosition.row
      : (pagePoint.y - metrics.baselineOriginTop) / Math.max(metrics.baselineStep, 0.0001)
    return {
      col: clampLayerColumn(rawCol, {
        span: columns,
        gridCols: metrics.gridCols,
        snapToColumns,
      }),
      row: clampFreePlacementRow(rawRow, metrics.maxBaselineRow),
    }
  }, [getGridMetrics, resolveModulePositionAtPagePoint, toPagePointFromClient])

  const clearPendingLayerDuplicate = useCallback(() => {
    setPendingLayerDuplicate(null)
  }, [])

  const shouldApplyPendingLayerDuplicatePlacementBeforeDrag = useCallback(() => (
    pendingLayerDuplicate !== null && pendingLayerDuplicate.sourceLayoutToken !== initialLayoutToken
  ), [initialLayoutToken, pendingLayerDuplicate])

  const tryApplyPendingLayerDuplicatePlacement = useCallback((clientX: number, clientY: number): boolean => {
    if (!pendingLayerDuplicate) return false

    if (pendingLayerDuplicate.kind === "text") {
      const position = resolvePendingDuplicatePosition(clientX, clientY, {
        columns: pendingLayerDuplicate.snapshot.columns,
        snapToColumns: pendingLayerDuplicate.snapshot.snapToColumns,
        snapToBaseline: pendingLayerDuplicate.snapshot.snapToBaseline,
      })
      if (!position) return false

      const sourceText = pendingLayerDuplicate.snapshot.text
      const maxParagraphCount = result.settings.gridCols * result.settings.gridRows
      if (sourceText.trim().length > 0 && activeParagraphCount >= maxParagraphCount) {
        onRequestNotice?.({
          title: translateMessage("ui.status.notices.paragraphLimitTitle"),
          message: translateMessage("ui.status.notices.paragraphLimitMessage", { count: maxParagraphCount }),
        })
        return true
      }

      const newKey = getNextCustomBlockId()
      const metrics = getGridMetrics()
      recordHistoryBeforeChange()
      setBlockCollections((current) => insertTextLayerDuplicateSnapshotInCollections(current, {
        newKey,
        snapshot: pendingLayerDuplicate.snapshot,
        gridCols: result.settings.gridCols,
        gridRows: result.settings.gridRows,
        position,
        rowStartBaselines: metrics.rowStartBaselines,
        baseFont,
        afterKey: blockOrder.includes(pendingLayerDuplicate.sourceKey)
          ? pendingLayerDuplicate.sourceKey
          : null,
      }))
      setBlockCustomSizes((current) => {
        const next = { ...current }
        const value = pendingLayerDuplicate.customSize
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          next[newKey] = value
        } else {
          delete next[newKey]
        }
        return next
      })
      setBlockCustomLeadings((current) => {
        const next = { ...current }
        const value = pendingLayerDuplicate.customLeading
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          next[newKey] = value
        } else {
          delete next[newKey]
        }
        return next
      })
      setBlockTextColors((current) => {
        const next = { ...current }
        if (pendingLayerDuplicate.textColor) next[newKey] = pendingLayerDuplicate.textColor
        else delete next[newKey]
        return next
      })
      promoteLayerToTop(newKey)
      onSelectLayer?.(newKey)
      setPendingLayerDuplicate(null)
      clearHover()
      return true
    }

    const position = resolvePendingDuplicatePosition(clientX, clientY, {
      columns: pendingLayerDuplicate.columns,
      snapToColumns: pendingLayerDuplicate.snapToColumns,
      snapToBaseline: pendingLayerDuplicate.snapToBaseline,
    })
    if (!position) return false

    const newKey = getNextImagePlaceholderId()
    onShowImagePlaceholdersChange?.(true)
    recordHistoryBeforeChange()
    insertImagePlaceholder(newKey, {
      position,
      columns: pendingLayerDuplicate.columns,
      rows: pendingLayerDuplicate.rows,
      heightBaselines: pendingLayerDuplicate.heightBaselines,
      color: pendingLayerDuplicate.color,
      opacity: pendingLayerDuplicate.opacity,
      snapToColumns: pendingLayerDuplicate.snapToColumns,
      snapToBaseline: pendingLayerDuplicate.snapToBaseline,
      rotation: pendingLayerDuplicate.rotation,
      afterKey: imageOrder.includes(pendingLayerDuplicate.sourceKey)
        ? pendingLayerDuplicate.sourceKey
        : null,
    })
    promoteLayerToTop(newKey)
    onSelectLayer?.(newKey)
    setPendingLayerDuplicate(null)
    clearHover()
    return true
  }, [
    activeParagraphCount,
    baseFont,
    blockOrder,
    clearHover,
    getGridMetrics,
    insertImagePlaceholder,
    onRequestNotice,
    onSelectLayer,
    onShowImagePlaceholdersChange,
    pendingLayerDuplicate,
    promoteLayerToTop,
    recordHistoryBeforeChange,
    resolvePendingDuplicatePosition,
    result.settings.gridCols,
    result.settings.gridRows,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockCustomSizes,
    setBlockTextColors,
    imageOrder,
  ])

  const handleCanvasMouseLeave = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof HTMLElement && nextTarget.closest("[data-preview-edit-affordance='true']")) {
      return
    }
    clearHover()
  }, [clearHover])

  const handlePreviewWorkspacePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (
      target.closest("[data-preview-document-root='true']")
      || target.closest("[data-preview-edit-affordance='true']")
    ) {
      return
    }
    clearHover()
    onSelectLayer?.(null)
  }, [clearHover, onSelectLayer])

  const {
    dragState,
    setDragState,
    beginDetachedCopyDrag,
    handlePreviewPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
    handleCanvasDoubleClick,
  } = usePreviewCanvasInteractions<BlockId, TypographyStyleKey>({
    showTypography,
    showImagePlaceholders,
    editorOpen: Boolean(editorState || imageEditorState),
    activeEditorTarget: editorState?.target ?? imageEditorState?.target ?? null,
    canvasRef,
    blockRectsRef,
    imageRectsRef,
    blockModulePositions,
    imageModulePositions,
    toPagePoint,
    toPagePointFromClient,
    snapToModule,
    snapToBaseline,
    resolveLayerPlacement,
    getDragAnchorPoint: (key, options) => {
      if (isImagePlaceholderKey(key)) {
        const rect = imageRectsRef.current[key]
        return rect ? { x: rect.x, y: rect.y } : null
      }

      const plan = previousPlansRef.current.get(key)
      const rect = blockRectsRef.current[key] ?? null
      if (!plan) {
        return rect ? { x: rect.x, y: rect.y } : null
      }

      const firstGuideRect = plan.guideRects[0] ?? null
      const baselineStep = getGridMetrics().baselineStep
      const anchorX = firstGuideRect?.x ?? plan.rect.x
      const anchorY = options?.dragYMode === "moduleTop"
        ? (firstGuideRect?.y ?? plan.rect.y)
        : (firstGuideRect ? firstGuideRect.y - baselineStep : plan.rect.y)

      return { x: anchorX, y: anchorY }
    },
    getGridMetrics,
    findTopmostDraggableAtPoint,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    resolveSelectedLayerAtClientPoint,
    resolveModulePositionAtPagePoint,
    clampImageModulePosition,
    isImagePlaceholderKey,
    getImageSpan,
    getImageRows,
    getImageHeightBaselines,
    getImageColorReference,
    getImageOpacity,
    getImageRotation,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    isImageSnapToBaselineEnabled,
    isLayerLocked,
    blockOrder,
    textContent,
    activeParagraphCount,
    blockCustomSizes,
    blockCustomLeadings,
    blockTextColors,
    baseFont,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    recordHistoryBeforeChange,
    insertImagePlaceholder,
    setImageModulePositions,
    setBlockCollections,
    setBlockCustomSizes,
    setBlockCustomLeadings,
    setBlockTextColors,
    setBlockModulePositions,
    onSelectLayer,
    onImagePlaceholderCreated: (key) => {
      showImmediateImageHover(key)
    },
    promoteLayerToTop,
    onRequestNotice,
    getNextCustomBlockId,
    getNextImagePlaceholderId,
    ensureImagePlaceholdersVisible: () => onShowImagePlaceholdersChange?.(true),
    handleTextCanvasDoubleClick,
    openTextEditor,
    openImageEditor,
    closeImageEditorPanel: closeImageEditorState,
    clearHover,
    dragEndedAtRef,
    touchLongPressMs: PREVIEW_TOUCH_LONG_PRESS_MS,
    touchCancelDistancePx: PREVIEW_TOUCH_CANCEL_DISTANCE_PX,
    tryApplyPendingTextStyleTransfer,
    tryApplyPendingLayerDuplicatePlacement,
    shouldApplyPendingLayerDuplicatePlacementBeforeDrag,
    onCopyPlacementCommitted: clearPendingLayerDuplicate,
  })

  useEffect(() => {
    const copyPathActive = pendingTextStyleTransfer !== null || pendingLayerDuplicate !== null || dragState?.detached === true
    if (!copyPathActive) return

    const handleCopyCancelKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      setPendingTextStyleTransfer(null)
      setPendingLayerDuplicate(null)
      setDragState(null)
      clearHover()
    }

    window.addEventListener("keydown", handleCopyCancelKeyDown, true)
    return () => window.removeEventListener("keydown", handleCopyCancelKeyDown, true)
  }, [
    clearHover,
    dragState?.detached,
    pendingLayerDuplicate,
    pendingTextStyleTransfer,
    setDragState,
  ])

  const handleCopyAffordanceActivate = ({
    key,
    kind,
    clientX,
    clientY,
    altKey,
    shiftKey,
  }: {
    key: BlockId
    kind: "text" | "image"
    clientX: number
    clientY: number
    altKey: boolean
    shiftKey: boolean
  }) => {
    if (kind === "text") {
      const action = resolveTextCopyAffordanceAction({ altKey, shiftKey })
      if (action.kind === "duplicate") {
        const duplicate = buildTextDuplicateSnapshot(key)
        if (!duplicate) return
        setPendingTextStyleTransfer(null)
        setPendingLayerDuplicate(duplicate)
        beginDetachedCopyDrag(key, clientX, clientY)
        return
      }

      const mode = action.mode
      const transfer = buildTextStyleTransfer(key, mode)
      if (!transfer) return
      closeEditor()
      closeImageEditor()
      clearHover()
      setPendingLayerDuplicate(null)
      setPendingTextStyleTransfer(transfer)
      onSelectLayer?.(key)
      announceTextStyleTransfer(mode)
      return
    }

    const duplicate = buildImageDuplicateSnapshot(key)
    if (!duplicate) return
    setPendingTextStyleTransfer(null)
    setPendingLayerDuplicate(duplicate)
    beginDetachedCopyDrag(key, clientX, clientY)
  }

  const handleHoveredLayerLockToggle = useCallback((key: BlockId, locked: boolean) => {
    if (!blockOrder.includes(key) && !imageOrder.includes(key)) return
    if (isLayerLocked(key) === locked) return
    recordHistoryBeforeChange()
    setLockedLayers((current) => (
      locked
        ? { ...current, [key]: true }
        : omitOptionalRecordKey(current, key)
    ))
    if (locked) {
      setDragState((current) => (current?.key === key ? null : current))
      setEditorState((current) => (current?.target === key ? null : current))
      setImageEditorState((current) => (current?.target === key ? null : current))
    }
  }, [
    blockOrder,
    imageOrder,
    isLayerLocked,
    recordHistoryBeforeChange,
    setDragState,
    setEditorState,
    setImageEditorState,
    setLockedLayers,
  ])

  const getResizeStartRow = useCallback((kind: LayerResizeKind, key: BlockId) => {
    const metrics = getGridMetrics()
    const position = kind === "image" ? imageModulePositions[key] : blockModulePositions[key]
    if (position) {
      return findNearestAxisIndex(metrics.rowStartBaselines, position.row)
    }
    const rect = kind === "image" ? imageRectsRef.current[key] : blockRectsRef.current[key]
    if (!rect) return 0
    return metrics.getNearestRowIndex(rect.y)
  }, [blockModulePositions, getGridMetrics, imageModulePositions])

  const getResizeStartColumn = useCallback((kind: LayerResizeKind, key: BlockId) => {
    const metrics = getGridMetrics()
    const position = kind === "image" ? imageModulePositions[key] : blockModulePositions[key]
    if (position) return Math.round(position.col)
    const rect = kind === "image" ? imageRectsRef.current[key] : blockRectsRef.current[key]
    if (!rect) return 0
    return metrics.getNearestCol(rect.x)
  }, [blockModulePositions, getGridMetrics, imageModulePositions])

  const getCurrentLayerResizeGeometry = useCallback((kind: LayerResizeKind, key: BlockId) => {
    if (kind === "image") {
      if (imageEditorState?.target === key) {
        return {
          columns: imageEditorState.draftColumns,
          rows: imageEditorState.draftRows,
          heightBaselines: imageEditorState.draftHeightBaselines,
        }
      }
      return {
        columns: getImageSpan(key),
        rows: getImageRows(key),
        heightBaselines: getImageHeightBaselines(key),
      }
    }

    if (editorState?.target === key) {
      return {
        columns: editorState.draftColumns,
        rows: editorState.draftRows,
        heightBaselines: editorState.draftHeightBaselines,
      }
    }
    return {
      columns: getBlockSpan(key),
      rows: getBlockRows(key),
      heightBaselines: getBlockHeightBaselines(key),
    }
  }, [
    editorState?.draftColumns,
    editorState?.draftHeightBaselines,
    editorState?.draftRows,
    editorState?.target,
    getBlockHeightBaselines,
    getBlockRows,
    getBlockSpan,
    getImageHeightBaselines,
    getImageRows,
    getImageSpan,
    imageEditorState?.draftColumns,
    imageEditorState?.draftHeightBaselines,
    imageEditorState?.draftRows,
    imageEditorState?.target,
  ])

  const resolveLayerResizePreviewState = useCallback((args: {
    kind: LayerResizeKind
    key: BlockId
    startColumn: number
    startRow: number
    pageX: number
    pageY: number
    baselineMode: boolean
  }): LayerResizePreviewState | null => {
    const pagePoint = { x: args.pageX, y: args.pageY }
    if (!Number.isFinite(pagePoint.x) || !Number.isFinite(pagePoint.y)) return null
    const metrics = getGridMetrics()
    const resizeMetrics = {
      contentLeft: metrics.contentLeft,
      contentTop: metrics.contentTop,
      gridCols: metrics.gridCols,
      gridRows: metrics.gridRows,
      moduleWidths: metrics.moduleWidths,
      moduleHeights: metrics.moduleHeights,
      colStarts: metrics.colStarts,
      rowStarts: metrics.rowStarts,
      scale,
      baselineStep: metrics.baselineStep,
    }
    const geometry = resolveLayerResizeGeometry({
      metrics: resizeMetrics,
      startColumn: args.startColumn,
      startRow: args.startRow,
      pageX: pagePoint.x,
      pageY: pagePoint.y,
      baselineMode: args.baselineMode,
      maxHeightBaselines: baselinesPerGridModule,
    })
    const rect = resolveLayerResizeRect({
      metrics: resizeMetrics,
      startColumn: args.startColumn,
      startRow: args.startRow,
      geometry,
    })
    const columnReflowActive = args.kind === "text" && geometry.columns > 1 && (
      editorState?.target === args.key
        ? editorState.draftReflow
        : isTextReflowEnabled(args.key)
    )
    return {
      kind: args.kind,
      key: args.key,
      rect,
      guideRects: resolveLayerResizePreviewGuideRects({
        metrics: resizeMetrics,
        startColumn: args.startColumn,
        rect,
        columns: geometry.columns,
        columnReflowActive,
      }),
      geometry,
    }
  }, [
    baselinesPerGridModule,
    editorState?.draftReflow,
    editorState?.target,
    getGridMetrics,
    isTextReflowEnabled,
    scale,
  ])

  const applyLayerResizeGeometry = useCallback((kind: LayerResizeKind, key: BlockId, geometry: {
    columns: number
    rows: number
    heightBaselines: number
  }) => {
    const nextColumns = Math.max(1, Math.min(result.settings.gridCols, Math.round(geometry.columns)))
    const nextRows = Math.max(0, Math.min(result.settings.gridRows, Math.round(geometry.rows)))
    const nextHeightBaselines = Math.max(0, Math.min(baselinesPerGridModule, Math.round(geometry.heightBaselines)))

    if (kind === "image") {
      if (imageEditorState?.target === key) {
        setImageEditorState((prev) => {
          if (!prev || prev.target !== key) return prev
          if (
            prev.draftColumns === nextColumns
            && prev.draftRows === nextRows
            && prev.draftHeightBaselines === nextHeightBaselines
          ) {
            return prev
          }
          return {
            ...prev,
            draftColumns: nextColumns,
            draftRows: nextRows,
            draftHeightBaselines: nextHeightBaselines,
          }
        })
        return
      }

      setImageColumnSpans((prev) => (
        prev[key] === nextColumns ? prev : { ...prev, [key]: nextColumns }
      ))
      setImageRowSpans((prev) => (
        prev[key] === nextRows ? prev : { ...prev, [key]: nextRows }
      ))
      setImageHeightBaselines((prev) => (
        prev[key] === nextHeightBaselines ? prev : { ...prev, [key]: nextHeightBaselines }
      ))
      return
    }

    if (editorState?.target === key) {
      setEditorState((prev) => {
        if (!prev || prev.target !== key) return prev
        if (
          prev.draftColumns === nextColumns
          && prev.draftRows === nextRows
          && prev.draftHeightBaselines === nextHeightBaselines
        ) {
          return prev
        }
        return {
          ...prev,
          draftColumns: nextColumns,
          draftRows: nextRows,
          draftHeightBaselines: nextHeightBaselines,
          draftReflow: nextColumns > 1 ? prev.draftReflow : false,
        }
      })
      return
    }

    setBlockCollections((current) => {
      const currentColumns = current.blockColumnSpans[key] ?? getDefaultColumnSpan(key, result.settings.gridCols)
      const currentRows = current.blockRowSpans[key] ?? getBlockRows(key)
      const currentHeightBaselines = current.blockHeightBaselines[key] ?? getBlockHeightBaselines(key)
      if (
        currentColumns === nextColumns
        && currentRows === nextRows
        && currentHeightBaselines === nextHeightBaselines
      ) {
        return current
      }

      return {
        ...current,
        blockColumnSpans: {
          ...current.blockColumnSpans,
          [key]: nextColumns,
        },
        blockRowSpans: {
          ...current.blockRowSpans,
          [key]: nextRows,
        },
        blockHeightBaselines: {
          ...current.blockHeightBaselines,
          [key]: nextHeightBaselines,
        },
        blockTextReflow: nextColumns > 1
          ? current.blockTextReflow
          : {
              ...current.blockTextReflow,
              [key]: false,
            },
      }
    })
  }, [
    baselinesPerGridModule,
    editorState?.target,
    getBlockHeightBaselines,
    getBlockRows,
    imageEditorState?.target,
    result.settings.gridCols,
    result.settings.gridRows,
    setBlockCollections,
    setEditorState,
    setImageColumnSpans,
    setImageEditorState,
    setImageHeightBaselines,
    setImageRowSpans,
  ])

  const handleLayerResizeHandlePointerDown = useCallback((
    kind: LayerResizeKind,
    key: BlockId,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (isLayerLocked(key)) return
    const startPoint = toPagePointFromClient(event.clientX, event.clientY)
    if (!startPoint) return
    event.preventDefault()
    event.stopPropagation()
    onSelectLayer?.(key)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Ignore unsupported pointer-capture failures.
    }

    const startColumn = getResizeStartColumn(kind, key)
    const startRow = getResizeStartRow(kind, key)
    const initialGeometry = getCurrentLayerResizeGeometry(kind, key)
    let lastGeometry = initialGeometry

    const updatePreviewFromPointer = (clientX: number, clientY: number, baselineMode: boolean) => {
      const pagePoint = toPagePointFromClient(clientX, clientY)
      if (!pagePoint) return null
      const nextPreview = resolveLayerResizePreviewState({
        kind,
        key,
        startColumn,
        startRow,
        pageX: pagePoint.x,
        pageY: pagePoint.y,
        baselineMode,
      })
      if (!nextPreview) return null
      lastGeometry = nextPreview.geometry
      setLayerResizePreview((current) => {
        if (
          current?.kind === nextPreview.kind
          && current.key === nextPreview.key
          && isSameLayerResizeGeometry(current.geometry, nextPreview.geometry)
        ) {
          return current
        }
        return nextPreview
      })
      return nextPreview.geometry
    }

    const cleanupResizeListeners = () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerCancel)
    }

    const commitResize = (geometry: PreviewLayerResizeGeometry) => {
      setLayerResizePreview((current) => (current?.kind === kind && current.key === key ? null : current))
      if (isSameLayerResizeGeometry(geometry, initialGeometry)) return
      recordHistoryBeforeChange()
      applyLayerResizeGeometry(kind, key, geometry)
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updatePreviewFromPointer(moveEvent.clientX, moveEvent.clientY, moveEvent.shiftKey)
    }
    const handlePointerUp = (upEvent: PointerEvent) => {
      const finalGeometry = updatePreviewFromPointer(upEvent.clientX, upEvent.clientY, upEvent.shiftKey) ?? lastGeometry
      cleanupResizeListeners()
      commitResize(finalGeometry)
    }
    const handlePointerCancel = () => {
      cleanupResizeListeners()
      setLayerResizePreview((current) => (current?.kind === kind && current.key === key ? null : current))
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerCancel)
  }, [
    applyLayerResizeGeometry,
    getCurrentLayerResizeGeometry,
    getResizeStartColumn,
    getResizeStartRow,
    isLayerLocked,
    onSelectLayer,
    recordHistoryBeforeChange,
    resolveLayerResizePreviewState,
    toPagePointFromClient,
  ])

  const activeHoveredLayerKey = hoverState?.key ?? hoverImageKey ?? null
  const activeHoveredLayerLocked = activeHoveredLayerKey ? isLayerLocked(activeHoveredLayerKey) : false

  const {
    handleCanvasMouseMove,
    canvasCursorClass,
    canvasCursorStyle,
  } = usePreviewHoverState<BlockId>({
    showTypography,
    editorOpen: Boolean(editorState || imageEditorState),
    dragState,
    hoverState,
    hoverImageKey,
    hoverTargetLocked: activeHoveredLayerLocked,
    hoverCopyIntent,
    persistentTextCopyIntent: pendingTextStyleTransfer !== null || pendingLayerDuplicate !== null,
    setHoverState,
    setHoverImageKey,
    setHoverCopyIntent,
    findTopmostHoverTargetAtPoint,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    isPointWithinHoverTarget: (key, pageX, pageY) => {
      if (isImagePlaceholderKey(key)) {
        return isPointWithinRect(pageX, pageY, imageRectsRef.current[key] ?? null)
      }
      const plan = previousPlansRef.current.get(key)
      if (plan?.guideRects.some((guideRect) => isPointWithinRect(pageX, pageY, guideRect))) {
        return true
      }
      return isPointWithinRect(pageX, pageY, blockRectsRef.current[key] ?? null)
    },
    isPointWithinHoverAffordanceTarget: (key, pageX, pageY) => {
      const targetRect = isImagePlaceholderKey(key)
        ? imageRectsRef.current[key] ?? null
        : (() => {
            const plan = previousPlansRef.current.get(key)
            return plan ? getPreviewTextGuideBounds(plan) : blockRectsRef.current[key] ?? null
          })()
      return targetRect
        ? isPointWithinRect(pageX, pageY, resolvePreviewResizeHandleHitRect({ targetRect }))
        : false
    },
    toPagePointFromClient,
  })

  useEffect(() => {
    onHoverLayerChange?.(hoverState?.key ?? hoverImageKey ?? null)
  }, [hoverImageKey, hoverState?.key, onHoverLayerChange])

  const captureCommittedPreviewFrame = useCallback((visible: boolean) => {
    const targetCanvas = heldFrameCanvasRef.current
    const staticCanvas = staticCanvasRef.current
    const layerCanvas = canvasRef.current
    if (!targetCanvas || !staticCanvas || !layerCanvas) return

    const widthPx = Math.max(staticCanvas.width, layerCanvas.width, 1)
    const heightPx = Math.max(staticCanvas.height, layerCanvas.height, 1)
    if (targetCanvas.width !== widthPx) targetCanvas.width = widthPx
    if (targetCanvas.height !== heightPx) targetCanvas.height = heightPx

    const ctx = targetCanvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, widthPx, heightPx)
    ctx.drawImage(staticCanvas, 0, 0, widthPx, heightPx)
    if (imageCanvasRef.current) {
      ctx.drawImage(imageCanvasRef.current, 0, 0, widthPx, heightPx)
    }
    ctx.drawImage(layerCanvas, 0, 0, widthPx, heightPx)

    setHeldPreviewFrame({
      widthCss: pageWidthCss,
      heightCss: pageHeightCss,
      widthPx,
      heightPx,
      visible,
    })
  }, [pageHeightCss, pageWidthCss])

  const showHeldPreviewFrame = useCallback(() => {
    setHeldPreviewFrame((current) => (current ? { ...current, visible: true } : current))
  }, [])

  useLayoutEffect(() => {
    if (previewSurfaceSignatureRef.current === previewSurfaceSignature) return
    previewSurfaceSignatureRef.current = previewSurfaceSignature
    setLayoutDisplayReady(false)
    showHeldPreviewFrame()
    blockRectsRef.current = {} as Record<BlockId, BlockRect>
    imageRectsRef.current = {} as Record<BlockId, BlockRect>
    previousPlansRef.current.clear()
    setOverflowLinesByBlock({})
    setLayerResizePreview(null)
  }, [blockRectsRef, imageRectsRef, previewSurfaceSignature, previousPlansRef, showHeldPreviewFrame])

  useLayoutEffect(() => {
    if (layoutEmissionFrameRef.current !== null) {
      window.cancelAnimationFrame(layoutEmissionFrameRef.current)
      layoutEmissionFrameRef.current = null
    }
    if (initialLayoutToken === 0) {
      setLayoutEmissionEnabled(true)
      return
    }
    setLayoutEmissionEnabled(false)
    clearHover()
  }, [clearHover, initialLayoutToken])

  useEffect(() => {
    if (initialLayoutToken === 0) return
    if (
      lastAppliedLayoutKeyRef.current !== initialLayoutToken
      || lastAppliedImageLayoutKeyRef.current !== initialLayoutToken
      || lastAppliedLayerLayoutKeyRef.current !== initialLayoutToken
      || lastAppliedCustomSizeLayoutKeyRef.current !== initialLayoutToken
      || lastAppliedLockLayoutKeyRef.current !== initialLayoutToken
    ) {
      return
    }
    if (layoutEmissionEnabled) return
    if (layoutEmissionFrameRef.current !== null) {
      window.cancelAnimationFrame(layoutEmissionFrameRef.current)
    }
    layoutEmissionFrameRef.current = window.requestAnimationFrame(() => {
      layoutEmissionFrameRef.current = null
      setLayoutEmissionEnabled(true)
    })
    return () => {
      if (layoutEmissionFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutEmissionFrameRef.current)
        layoutEmissionFrameRef.current = null
      }
    }
  }, [
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextColors,
    imageOrder,
    initialLayoutToken,
    layoutEmissionEnabled,
    layerOrder,
    lockedLayers,
  ])

  useEffect(() => (
    () => {
      if (layoutEmissionFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutEmissionFrameRef.current)
        layoutEmissionFrameRef.current = null
      }
    }
  ), [])

  usePreviewDocumentLifecycle<TypographyStyleKey, BlockId, typeof dragState, NonNullable<typeof editorState>, typeof imageEditorState>({
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
    imageOrder,
    recordHistoryBeforeChange,
    pushHistory,
    buildSnapshot,
    applySnapshot,
    blockOrder,
    layerOrder,
    setLayerOrder,
  })
  usePreviewLayerDelete({
    imageOrder,
    requestedLayerDeleteTarget,
    requestedLayerDeleteToken,
    lastAppliedLayerDeleteRequestKeyRef,
    recordHistoryBeforeChange,
    setImageOrder,
    setImageModulePositions,
    setImageColumnSpans,
    setImageRowSpans,
    setImageHeightBaselines,
    setImageColors,
    setLayerOrder,
    setImageEditorState,
    setBlockCollections,
    setBlockCustomSizes,
    setBlockCustomLeadings,
    setBlockTextColors,
    setLockedLayers,
    setEditorState,
  })

  useEffect(() => {
    if (!requestedLayerLockTargets?.length || requestedLayerLockToken === 0) return
    if (lastAppliedLayerLockRequestKeyRef.current === requestedLayerLockToken) return
    lastAppliedLayerLockRequestKeyRef.current = requestedLayerLockToken

    const nextTargets = [...new Set(requestedLayerLockTargets)].filter((key) => (
      (blockOrder.includes(key) || imageOrder.includes(key))
      && isLayerLocked(key) !== requestedLayerLockValue
    ))
    if (nextTargets.length === 0) return
    const nextTargetSet = new Set(nextTargets)

    recordHistoryBeforeChange()
    setLockedLayers((current) => (
      requestedLayerLockValue
        ? nextTargets.reduce((acc, key) => {
            acc[key] = true
            return acc
          }, { ...current })
        : nextTargets.reduce((acc, key) => omitOptionalRecordKey(acc, key), current)
    ))

    if (!requestedLayerLockValue) return
    setDragState((current) => (current && nextTargetSet.has(current.key) ? null : current))
    setEditorState((current) => (current && nextTargetSet.has(current.target) ? null : current))
    setImageEditorState((current) => (current && nextTargetSet.has(current.target) ? null : current))
  }, [
    blockOrder,
    imageOrder,
    isLayerLocked,
    recordHistoryBeforeChange,
    requestedLayerLockTargets,
    requestedLayerLockToken,
    requestedLayerLockValue,
    setDragState,
    setEditorState,
    setImageEditorState,
    setLockedLayers,
  ])

  usePreviewGuideCanvases({
    staticCanvasRef,
    imageCanvasRef,
    pixelRatio,
    result,
    scale,
    rotation,
    canvasBackground,
    showMargins,
    showModules,
    showBaselines,
    isMobile,
  })

  const [typographyPlanVersion, setTypographyPlanVersion] = useState(0)
  const handleTypographyPlanCommit = useCallback(() => {
    setTypographyPlanVersion((version) => version + 1)
    if (!dragState) captureCommittedPreviewFrame(false)
    setLayoutDisplayReady(true)
    onPreviewPlansCommit?.()
  }, [captureCommittedPreviewFrame, dragState, onPreviewPlansCommit])

  usePreviewSmartTextZoomController({
    enabled: smartTextEditZoomEnabled,
    editorTarget: editorState?.target,
    activeTarget: activeTextZoomTarget,
    geometrySignature: smartTextZoomGeometrySignature,
    typographyPlanVersion,
    setActiveTarget: setActiveTextZoomTarget,
    setTargetVersion: setSmartTextZoomTargetVersion,
  })

  useTypographyRenderer<BlockId>({
    canvasRef,
    blockRectsRef,
    imageRectsRef,
    typographyBufferRef,
    previousPlansRef,
    typographyBufferTransformRef,
    result,
    scale,
    fontRenderEpoch,
    typographyMetricsReady: metricFacesReady,
    rotation,
    layoutEngine,
    baseFont,
    imageColorScheme,
    showTypography,
    showImagePlaceholders,
    blockOrder,
    imageOrder,
    documentVariableContext,
    rawDocumentVariableBlockKey: editorState?.target ?? null,
    dragState,
    buildLayoutSnapshot: buildPreviewRenderSnapshot,
    onOverflowLinesChange: handleOverflowLinesChange,
    onCanvasReady,
    onPlansCommit: handleTypographyPlanCommit,
    recordPerfMetric,
    pixelRatio,
  })

  const activeTextResizePreview = layerResizePreview?.kind === "text"
    && (hoverState?.key === layerResizePreview.key || selectedLayerKey === layerResizePreview.key)
    ? layerResizePreview
    : null
  const activeImageResizePreview = layerResizePreview?.kind === "image"
    && (hoverImageKey === layerResizePreview.key || selectedLayerKey === layerResizePreview.key)
    ? layerResizePreview
    : null
  const hoveredTextPlan = !activeTextResizePreview && hoverState?.key
    ? previousPlansRef.current.get(hoverState.key) ?? null
    : null
  const hoveredTextRect = activeTextResizePreview?.rect
    ?? (hoverState?.key ? blockRectsRef.current[hoverState.key] ?? null : null)
  const linkedHoveredTextPlan = !hoverState?.key && hoveredLayerKey
    ? previousPlansRef.current.get(hoveredLayerKey) ?? null
    : null
  const linkedHoveredImageRect = !hoverState?.key && !hoverImageKey && hoveredLayerKey
    ? imageRectsRef.current[hoveredLayerKey] ?? null
    : null
  const hoveredTextGuideRects = useMemo(() => {
    if (activeTextResizePreview) return activeTextResizePreview.guideRects
    if (hoveredTextPlan) return getPreviewTextGuideRects(hoveredTextPlan)
    if (linkedHoveredTextPlan) return getPreviewTextGuideRects(linkedHoveredTextPlan)
    return hoveredTextRect ? [hoveredTextRect] : []
  }, [activeTextResizePreview, hoveredTextPlan, hoveredTextRect, linkedHoveredTextPlan])
  const hoveredTextGuideRect = activeTextResizePreview
    ? activeTextResizePreview.rect
    : hoveredTextPlan
    ? getPreviewTextGuideBounds(hoveredTextPlan)
    : linkedHoveredTextPlan
      ? getPreviewTextGuideBounds(linkedHoveredTextPlan)
      : hoveredTextRect
  const hoveredTextGuidePlan = activeTextResizePreview ? null : hoveredTextPlan ?? linkedHoveredTextPlan
  const hoveredTextControls = useMemo(() => {
    const key = hoverState?.key
    if (!key) return null
    const previewPatch = paragraphRolloverPreview?.key === key ? paragraphRolloverPreview.patch : null
    return {
      align: previewPatch?.align ?? blockTextAlignments[key] ?? "left",
      verticalAlign: previewPatch?.verticalAlign ?? blockVerticalAlignments[key] ?? "top",
      rotation: getBlockRotation(key),
      reflow: isTextReflowEnabled(key),
      reflowDisabled: getBlockSpan(key) <= 1,
      hyphenation: isSyllableDivisionEnabled(key),
      snapX: isSnapToColumnsEnabled(key),
      snapY: isSnapToBaselineEnabled(key),
    }
  }, [
    blockTextAlignments,
    blockVerticalAlignments,
    getBlockRotation,
    getBlockSpan,
    hoverState?.key,
    isSnapToBaselineEnabled,
    isSnapToColumnsEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    paragraphRolloverPreview,
  ])
  useEffect(() => {
    setParagraphRolloverPreview((current) => (
      current && current.key !== hoverState?.key ? null : current
    ))
  }, [hoverState?.key])
  const hoveredImageRect = activeImageResizePreview?.rect
    ?? (hoverImageKey
      ? imageRectsRef.current[hoverImageKey] ?? null
      : linkedHoveredImageRect)
  const hoveredImageControls = useMemo(() => {
    if (!hoverImageKey) return null
    return {
      rotation: getImageRotation(hoverImageKey),
      snapX: isImageSnapToColumnsEnabled(hoverImageKey),
      snapY: isImageSnapToBaselineEnabled(hoverImageKey),
    }
  }, [
    getImageRotation,
    hoverImageKey,
    isImageSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
  ])
  usePreviewOverlayCanvas({
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
    selectedLayerKey,
    overflowLinesByBlock,
    dragState,
    editorTarget: editorState?.target ?? imageEditorState?.target ?? null,
    getPlacementRows,
    getPlacementHeightBaselines,
    getPlacementSpan,
    getGridMetrics,
    editorPlanVersion: typographyPlanVersion,
  })

  usePreviewLayoutReflowController<BlockId>({
    suppressReflowCheckRef,
    blockOrder,
    blockColumnSpans,
    blockGridPositions,
    blockModulePositions,
    imageOrder,
    imageGridPositions,
    textContent,
    scale,
    result,
    getDefaultColumnSpan,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getImageRows,
    getImageSpan,
    getStyleKeyForBlock,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    onRequestGridRestore,
    onRequestGridReductionWarning,
    setBlockColumnSpans,
    canvasRef,
    recordPerfMetric,
  })

  const deletePreviewTarget = useCallback((key: BlockId) => {
    clearHover()
    onSelectLayer?.(null)
    recordHistoryBeforeChange()

    if (isImagePlaceholderKey(key)) {
      setImageOrder((prev) => prev.filter((item) => item !== key))
      setImageModulePositions((prev) => omitOptionalRecordKey(prev, key))
      setImageColumnSpans((prev) => omitOptionalRecordKey(prev, key))
      setImageRowSpans((prev) => omitOptionalRecordKey(prev, key))
      setImageHeightBaselines((prev) => omitOptionalRecordKey(prev, key))
      setImageSnapToColumns((prev) => omitOptionalRecordKey(prev, key))
      setImageSnapToBaseline((prev) => omitOptionalRecordKey(prev, key))
      setImageRotations((prev) => omitOptionalRecordKey(prev, key))
      setImageColors((prev) => omitOptionalRecordKey(prev, key))
      setImageOpacities((prev) => omitOptionalRecordKey(prev, key))
      setLayerOrder((prev) => prev.filter((item) => item !== key))
      setLockedLayers((prev) => omitOptionalRecordKey(prev, key))
      setImageEditorState((prev) => (prev?.target === key ? null : prev))
      return
    }

    setBlockCollections((prev) => {
      if (isBaseBlockId(key)) {
        return {
          ...prev,
          textContent: {
            ...prev.textContent,
            [key]: "",
          },
          blockModulePositions: omitOptionalRecordKey(prev.blockModulePositions, key),
        }
      }
      return removeTextLayerFromCollections(prev, key)
    })

    if (!isBaseBlockId(key)) {
      setBlockCustomSizes((prev) => omitOptionalRecordKey(prev, key))
      setBlockCustomLeadings((prev) => omitOptionalRecordKey(prev, key))
      setBlockTextColors((prev) => omitOptionalRecordKey(prev, key))
      setLayerOrder((prev) => prev.filter((item) => item !== key))
      setLockedLayers((prev) => omitOptionalRecordKey(prev, key))
    }

    setEditorState((prev) => (prev?.target === key ? null : prev))
  }, [
    clearHover,
    isImagePlaceholderKey,
    onSelectLayer,
    recordHistoryBeforeChange,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockCustomSizes,
    setBlockTextColors,
    setEditorState,
    setImageColors,
    setImageColumnSpans,
    setImageEditorState,
    setImageHeightBaselines,
    setImageModulePositions,
    setImageOpacities,
    setImageOrder,
    setImageRowSpans,
    setImageRotations,
    setImageSnapToBaseline,
    setImageSnapToColumns,
    setLockedLayers,
    setLayerOrder,
  ])

  const handleParagraphRolloverControlStart = useCallback((key: BlockId) => {
    if (isLayerLocked(key) || isImagePlaceholderKey(key)) return
    if (rolloverControlHistoryKeyRef.current === key) return
    recordHistoryBeforeChange()
    rolloverControlHistoryKeyRef.current = key
  }, [isImagePlaceholderKey, isLayerLocked, recordHistoryBeforeChange])

  const handleParagraphRolloverControlEnd = useCallback(() => {
    rolloverControlHistoryKeyRef.current = null
  }, [])

  const handleParagraphRolloverControlPreview = useCallback((
    key: BlockId,
    patch: ParagraphRolloverControlPatch | null,
  ) => {
    if (patch === null || (patch.align === undefined && patch.verticalAlign === undefined)) {
      setParagraphRolloverPreview((current) => (current?.key === key ? null : current))
      return
    }
    if (isLayerLocked(key) || isImagePlaceholderKey(key)) return
    setParagraphRolloverPreview({
      key,
      patch: {
        align: patch.align,
        verticalAlign: patch.verticalAlign,
      },
    })
  }, [isImagePlaceholderKey, isLayerLocked])

  const handleParagraphRolloverControlChange = useCallback((
    key: BlockId,
    patch: ParagraphRolloverControlPatch,
  ) => {
    if (isLayerLocked(key) || isImagePlaceholderKey(key)) return
    const nextRotation = patch.rotation === undefined
      ? undefined
      : clampRotation(patch.rotation)
    const nextReflow = patch.reflow === undefined
      ? undefined
      : patch.reflow && getBlockSpan(key) > 1
    const hasChange = (
      (patch.align !== undefined && patch.align !== (blockTextAlignments[key] ?? "left"))
      || (patch.verticalAlign !== undefined && patch.verticalAlign !== (blockVerticalAlignments[key] ?? "top"))
      || (nextRotation !== undefined && Math.abs(nextRotation - getBlockRotation(key)) >= 0.0001)
      || (nextReflow !== undefined && nextReflow !== isTextReflowEnabled(key))
      || (patch.hyphenation !== undefined && patch.hyphenation !== isSyllableDivisionEnabled(key))
      || (patch.snapX !== undefined && patch.snapX !== isSnapToColumnsEnabled(key))
      || (patch.snapY !== undefined && patch.snapY !== isSnapToBaselineEnabled(key))
    )
    if (!hasChange) return
    setParagraphRolloverPreview((current) => (current?.key === key ? null : current))

    if (rolloverControlHistoryKeyRef.current !== key) {
      recordHistoryBeforeChange()
      rolloverControlHistoryKeyRef.current = key
    }

    setBlockCollections((current) => {
      let next = current
      const ensureNext = () => {
        if (next === current) next = { ...current }
        return next
      }
      if (nextRotation !== undefined) {
        const blockRotationsNext = { ...current.blockRotations }
        if (hasSignificantRotation(nextRotation)) {
          if (Math.abs((current.blockRotations[key] ?? 0) - nextRotation) >= 0.0001) {
            blockRotationsNext[key] = nextRotation
            ensureNext().blockRotations = blockRotationsNext
          }
        } else {
          if (key in blockRotationsNext) {
            delete blockRotationsNext[key]
            ensureNext().blockRotations = blockRotationsNext
          }
        }
      }
      if (patch.align !== undefined) {
        if ((current.blockTextAlignments[key] ?? "left") !== patch.align) {
          ensureNext().blockTextAlignments = {
            ...current.blockTextAlignments,
            [key]: patch.align,
          }
        }
      }
      if (patch.verticalAlign !== undefined) {
        if ((current.blockVerticalAlignments[key] ?? "top") !== patch.verticalAlign) {
          ensureNext().blockVerticalAlignments = {
            ...current.blockVerticalAlignments,
            [key]: patch.verticalAlign,
          }
        }
      }
      if (nextReflow !== undefined) {
        if (current.blockTextReflow[key] !== nextReflow) {
          ensureNext().blockTextReflow = {
            ...current.blockTextReflow,
            [key]: nextReflow,
          }
        }
      }
      if (patch.hyphenation !== undefined) {
        if (current.blockSyllableDivision[key] !== patch.hyphenation) {
          ensureNext().blockSyllableDivision = {
            ...current.blockSyllableDivision,
            [key]: patch.hyphenation,
          }
        }
      }
      if (patch.snapX !== undefined) {
        if (current.blockSnapToColumns[key] !== patch.snapX) {
          ensureNext().blockSnapToColumns = {
            ...current.blockSnapToColumns,
            [key]: patch.snapX,
          }
        }
      }
      if (patch.snapY !== undefined) {
        if (current.blockSnapToBaseline[key] !== patch.snapY) {
          ensureNext().blockSnapToBaseline = {
            ...current.blockSnapToBaseline,
            [key]: patch.snapY,
          }
        }
      }
      return next
    })
  }, [
    getBlockRotation,
    getBlockSpan,
    blockTextAlignments,
    blockVerticalAlignments,
    isImagePlaceholderKey,
    isLayerLocked,
    isSnapToBaselineEnabled,
    isSnapToColumnsEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    recordHistoryBeforeChange,
    setBlockCollections,
  ])

  const handleImageRolloverControlStart = useCallback((key: BlockId) => {
    if (isLayerLocked(key) || !isImagePlaceholderKey(key)) return
    if (rolloverControlHistoryKeyRef.current === key) return
    recordHistoryBeforeChange()
    rolloverControlHistoryKeyRef.current = key
  }, [isImagePlaceholderKey, isLayerLocked, recordHistoryBeforeChange])

  const handleImageRolloverControlEnd = useCallback(() => {
    rolloverControlHistoryKeyRef.current = null
  }, [])

  const handleImageRolloverControlChange = useCallback((
    key: BlockId,
    patch: ImageRolloverControlPatch,
  ) => {
    if (isLayerLocked(key) || !isImagePlaceholderKey(key)) return
    const nextRotation = patch.rotation === undefined
      ? undefined
      : clampRotation(patch.rotation)
    const hasChange = (
      (nextRotation !== undefined && Math.abs(nextRotation - getImageRotation(key)) >= 0.0001)
      || (patch.snapX !== undefined && patch.snapX !== isImageSnapToColumnsEnabled(key))
      || (patch.snapY !== undefined && patch.snapY !== isImageSnapToBaselineEnabled(key))
    )
    if (!hasChange) return

    if (rolloverControlHistoryKeyRef.current !== key) {
      recordHistoryBeforeChange()
      rolloverControlHistoryKeyRef.current = key
    }

    if (nextRotation !== undefined) {
      setImageRotations((prev) => {
        const next = { ...prev }
        if (hasSignificantRotation(nextRotation)) {
          if (Math.abs((prev[key] ?? 0) - nextRotation) < 0.0001) return prev
          next[key] = nextRotation
          return next
        }
        if (next[key] === undefined) return prev
        delete next[key]
        return next
      })
    }
    if (patch.snapX !== undefined) {
      setImageSnapToColumns((prev) => (
        prev[key] === patch.snapX ? prev : { ...prev, [key]: patch.snapX }
      ))
    }
    if (patch.snapY !== undefined) {
      setImageSnapToBaseline((prev) => (
        prev[key] === patch.snapY ? prev : { ...prev, [key]: patch.snapY }
      ))
    }
    if (patch.snapX !== undefined || patch.snapY !== undefined) {
      setImageModulePositions((prev) => {
        const current = prev[key]
        if (!current) return prev
        const metrics = getGridMetrics()
        const snapToColumns = patch.snapX ?? isImageSnapToColumnsEnabled(key)
        const snapToBaseline = patch.snapY ?? isImageSnapToBaselineEnabled(key)
        const nextPosition = {
          col: clampLayerColumn(snapToColumns ? Math.round(current.col) : current.col, {
            span: getImageSpan(key),
            gridCols: metrics.gridCols,
            snapToColumns,
          }),
          row: clampFreePlacementRow(
            snapToBaseline ? Math.round(current.row) : current.row,
            metrics.maxBaselineRow,
          ),
        }
        if (current.col === nextPosition.col && current.row === nextPosition.row) return prev
        return { ...prev, [key]: nextPosition }
      })
    }
  }, [
    getGridMetrics,
    getImageRotation,
    getImageSpan,
    isImagePlaceholderKey,
    isImageSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    isLayerLocked,
    recordHistoryBeforeChange,
    setImageModulePositions,
    setImageRotations,
    setImageSnapToBaseline,
    setImageSnapToColumns,
  ])

  const isEditorOpen = Boolean(editorState || imageEditorState)

  useEffect(() => {
    onPreviewLayerCountsChange?.({
      text: blockOrder.length,
      images: imageOrder.length,
    })
  }, [blockOrder.length, imageOrder.length, onPreviewLayerCountsChange])

  usePreviewLayoutEmission({
    buildSnapshot,
    debounceMs: PREVIEW_LAYOUT_CHANGE_DEBOUNCE_MS,
    enabled: layoutEmissionEnabled,
    paused: isEditorOpen,
    flushOnResume: true,
    revisionKey: layoutRevisionKey,
    onLayoutChange,
  })

  useEffect(() => {
    onSnapshotGetterChange?.(buildSnapshot)
    return () => {
      onSnapshotGetterChange?.(null)
    }
  }, [buildSnapshot, onSnapshotGetterChange])

  const inlineEditorLayout = usePreviewInlineEditorLayout({
    editorState,
    blockRectsRef,
    previousPlansRef,
    gridUnit: result.grid.gridUnit,
    scale,
    planVersion: typographyPlanVersion,
  })
  const maxCharsPerLine = useMemo(() => {
    if (!inlineEditorLayout) return null
    if (inlineEditorLayout.commands.length === 0) return 0
    return inlineEditorLayout.commands.reduce((max, command) => {
      const characterCount = Array.from(command.text.replace(/\u00AD/g, "")).length
      return Math.max(max, characterCount)
    }, 0)
  }, [inlineEditorLayout])
  const textEditorControls = usePreviewOverlayControls({
    editorState,
    setEditorState,
    deleteEditorBlock,
    maxCharsPerLine,
    baselinesPerGridModule,
    gridRows: result.settings.gridRows,
    gridCols: result.settings.gridCols,
    styleOptions: PREVIEW_STYLE_OPTIONS as BlockEditorStyleOption<TypographyStyleKey>[],
    getStyleSizeLabel: (styleKey) => formatPtSize(getStyleSize(styleKey)),
    getStyleSizeValue: getStyleSize,
    getStyleLeadingValue: getStyleLeading,
    getStyleDefaultFontWeight: (styleKey) => getStyleDefaultFontWeight(result.typography.styles[styleKey]?.weight),
    getStyleDefaultItalic: (styleKey) => result.typography.styles[styleKey]?.blockItalic === true,
    isFxStyle: (styleKey) => styleKey === "fx",
    getDummyTextForStyle,
    colorSchemes: IMAGE_COLOR_SCHEMES,
    selectedColorScheme: imageColorScheme,
    palette: imagePalette,
  })

  useEffect(() => {
    if (!requestedLayerEditorTarget || requestedLayerEditorToken === 0) {
      setPendingLayerEditorMode(null)
      return
    }
    if (imageOrder.includes(requestedLayerEditorTarget)) {
      setPendingLayerEditorMode("image")
      return
    }
    if (blockOrder.includes(requestedLayerEditorTarget)) {
      setPendingLayerEditorMode("text")
      return
    }
    setPendingLayerEditorMode(null)
  }, [blockOrder, imageOrder, requestedLayerEditorTarget, requestedLayerEditorToken])

  useEffect(() => {
    if (!pendingLayerEditorMode || !requestedLayerEditorTarget) return
    const isRequestedTargetOpen = editorState?.target === requestedLayerEditorTarget
      || imageEditorState?.target === requestedLayerEditorTarget
    if (!isRequestedTargetOpen) return
    setPendingLayerEditorMode(null)
  }, [
    editorState?.target,
    imageEditorState?.target,
    pendingLayerEditorMode,
    requestedLayerEditorTarget,
  ])

  useEffect(() => {
    const resolvedEditorMode = editorState
      ? "text"
      : imageEditorState
        ? "image"
        : pendingLayerEditorMode
    onEditorModeChange?.(
      resolvedEditorMode,
    )
  }, [editorState, imageEditorState, onEditorModeChange, pendingLayerEditorMode])

  useEffect(() => (
    () => {
      onEditorModeChange?.(null)
    }
  ), [onEditorModeChange])

  useEffect(() => {
    if (!presentationMode) return
    closeEditor()
    closeImageEditor()
    clearHover()
    onSelectLayer?.(null)
    onEditorModeChange?.(null)
  }, [clearHover, closeEditor, closeImageEditor, onEditorModeChange, onSelectLayer, presentationMode])

  const heldFrameVisible = heldPreviewFrame?.visible === true
  const previewDisplayReady = layoutDisplayReady || heldFrameVisible

  return (
    <div
      ref={previewContainerRef}
      data-tooltip-boundary="preview-workspace"
      tabIndex={-1}
      className={`relative h-full w-full min-w-0 overflow-hidden bg-background focus:outline-none ${
        presentationMode ? "pointer-events-none rounded-none" : "rounded-lg"
      }`}
      style={{ opacity: previewDisplayReady ? 1 : 0 }}
      onPointerDown={handlePreviewWorkspacePointerDown}
    >
      <div
        className="absolute"
        style={{
          left: stageLeftCss,
          top: stageTopCss,
          width: pageWidthCss,
          height: pageHeightCss,
        }}
      >
        <GridPreviewCanvasStage
          staticCanvasRef={staticCanvasRef}
          imageCanvasRef={imageCanvasRef}
          canvasRef={canvasRef}
          overlayCanvasRef={overlayCanvasRef}
          heldFrameCanvasRef={heldFrameCanvasRef}
          textareaRef={textareaRef}
          pageWidthCss={pageWidthCss}
          pageHeightCss={pageHeightCss}
          pageWidthPx={pageWidthPx}
          pageHeightPx={pageHeightPx}
          heldFrameVisible={heldFrameVisible}
          heldFrameWidthCss={heldPreviewFrame?.widthCss ?? pageWidthCss}
          heldFrameHeightCss={heldPreviewFrame?.heightCss ?? pageHeightCss}
          heldFrameWidthPx={heldPreviewFrame?.widthPx ?? pageWidthPx}
          heldFrameHeightPx={heldPreviewFrame?.heightPx ?? pageHeightPx}
          interactionsPaused={!layoutDisplayReady}
          canvasCursorClass={canvasCursorClass}
          canvasCursorStyle={canvasCursorStyle}
          handlePreviewPointerDown={handlePreviewPointerDown}
          handleCanvasPointerMove={handleCanvasPointerMove}
          handleCanvasPointerUp={handleCanvasPointerUp}
          handleCanvasPointerCancel={handleCanvasPointerCancel}
          handleCanvasLostPointerCapture={handleCanvasLostPointerCapture}
          handleCanvasMouseMove={handleCanvasMouseMove}
          handleCanvasMouseLeave={handleCanvasMouseLeave}
          handleCanvasDoubleClick={handleCanvasDoubleClick}
          editorState={editorState}
          setEditorState={setEditorState}
          inlineEditorLayout={inlineEditorLayout}
          rotation={rotation}
          scale={scale}
          baselineStep={result.grid.gridUnit * scale}
          imageColorScheme={imageColorScheme}
          pageBackgroundColor={canvasBackground}
          closeEditor={closeEditor}
          saveEditor={saveEditor}
          getStyleSizeValue={getStyleSize}
          getStyleLeadingValue={getStyleLeading}
          isFxStyle={(styleKey) => styleKey === "fx"}
          showDocumentHelpIndicator={!presentationMode && showPreviewHelpIndicator}
          onDocumentHelpHover={!presentationMode && showPreviewHelpIndicator ? () => onOpenHelpSection?.("help-preview-workspace") : undefined}
        />
      </div>

      {!presentationMode ? (
      <GridPreviewOverlays
        showEditorHelpIcon={showEditorHelpIcon}
        showRolloverInfo={showRolloverInfo}
        editorSidebarHost={editorSidebarHost}
        stageLeftCss={stageLeftCss}
        stageTopCss={stageTopCss}
        pageWidthCss={pageWidthCss}
        pageHeightCss={pageHeightCss}
        pageRotation={rotation}
        baselineStepCss={result.grid.gridUnit * scale}
        gridColumnRightEdgesCss={overlayGridColumnRightEdgesCss}
        editorState={editorState}
        imageEditorState={imageEditorState}
        textEditorControls={textEditorControls}
        hoveredTextKey={hoverState?.key ?? null}
        hoveredTextRect={hoveredTextGuideRect}
        hoveredTextControls={hoveredTextControls}
        hoveredImageKey={hoverImageKey}
        hoveredImageRect={hoveredImageRect}
        hoveredImageControls={hoveredImageControls}
        hoveredLayerLocked={activeHoveredLayerLocked}
        onHoveredLayerLockToggle={handleHoveredLayerLockToggle}
        openTextEditor={openTextEditor}
        openImageEditor={openImageEditor}
        onCopyAffordanceActivate={handleCopyAffordanceActivate}
        onLayerResizeHandlePointerDown={handleLayerResizeHandlePointerDown}
        onParagraphRolloverControlStart={handleParagraphRolloverControlStart}
        onParagraphRolloverControlChange={handleParagraphRolloverControlChange}
        onParagraphRolloverControlEnd={handleParagraphRolloverControlEnd}
        onParagraphRolloverControlPreview={handleParagraphRolloverControlPreview}
        onImageRolloverControlStart={handleImageRolloverControlStart}
        onImageRolloverControlChange={handleImageRolloverControlChange}
        onImageRolloverControlEnd={handleImageRolloverControlEnd}
        deletePreviewTarget={deletePreviewTarget}
        clearHover={clearHover}
        setImageEditorState={setImageEditorState}
        baselinesPerGridModule={baselinesPerGridModule}
        gridRows={result.settings.gridRows}
        gridCols={result.settings.gridCols}
        imageColorScheme={imageColorScheme}
        imagePalette={imagePalette}
        imageColorSchemes={IMAGE_COLOR_SCHEMES}
        onPreviewEditorOpen={onPreviewEditorOpen}
        onOpenHelpSection={onOpenHelpSection}
        isDarkMode={isDarkMode}
      />
      ) : null}

    </div>
  )
})

GridPreview.displayName = "GridPreview"
