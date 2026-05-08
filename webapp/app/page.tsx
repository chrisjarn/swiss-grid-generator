"use client"

import { useReducer, useState, useMemo, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from "react"
import {
  getMaxBaseline,
} from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import { PreviewWorkspace } from "@/components/preview/PreviewWorkspace"
import { ControlSidebar } from "@/components/layout/ControlSidebar"
import { SettingsSidebarPanels } from "@/components/layout/SettingsSidebarPanels"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { SECTION_KEYS, type SectionKey, type UiSettingsSnapshot } from "@/lib/workspace-ui-schema"
import { useExportActions } from "@/hooks/useExportActions"
import { useHeaderActions } from "@/hooks/useHeaderActions"
import {
  HELP_SECTION_BY_HEADER_ACTION,
  HELP_SECTION_BY_SETTINGS_SECTION,
} from "@/lib/help-registry"
import { WorkspaceDialogs } from "@/components/dialogs/WorkspaceDialogs"
import { usePreviewDocumentState } from "@/hooks/usePreviewDocumentState"
import { useProjectController } from "@/hooks/useProjectController"
import { useShellKeyboardShortcuts } from "@/hooks/useShellKeyboardShortcuts"
import { useSidebarPanels } from "@/hooks/useSidebarPanels"
import { useWorkspaceChrome } from "@/hooks/useWorkspaceChrome"
import { useWorkspaceHistory } from "@/hooks/useWorkspaceHistory"
import { useWorkspaceUiActions } from "@/hooks/useWorkspaceUiActions"
import { useUiSettingsPreview } from "@/hooks/useUiSettingsPreview"
import { useProjectTourController } from "@/hooks/useProjectTourController"
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth"
import { useCloudProjectSync } from "@/hooks/useCloudProjectSync"
import { useSettledPageNavigation } from "@/hooks/useSettledPageNavigation"
import { parseLoadedProject, type LoadedProject, type ProjectMetadata, type ProjectPage, type ProjectVisibilitySettings } from "@/lib/document-session"
import { type FontFamily } from "@/lib/config/fonts"
import { BASELINE_OPTIONS } from "@/lib/config/defaults"
import { DEFAULT_UI } from "@/lib/config/ui-defaults"
import {
  resolveImageSchemeColor,
} from "@/lib/config/color-schemes"
import {
  DEFAULT_A4_BASELINE,
  INITIAL_GRID_UI_STATE,
  buildUiSnapshotFromLoadedSettings,
  gridUiReducer,
  type UiAction,
} from "@/lib/workspace-ui-state"
import {
  buildGridResultFromUiSettings,
  buildSerializableUiSettingsSnapshot,
  resolveUiSettingsSnapshot,
} from "@/lib/ui-settings-resolver"
import { useProjectState } from "@/hooks/useProjectState"
import { resolveCurrentPreviewLayout } from "@/lib/current-preview-layout"
import {
  findTextLayerGridReductionConflicts,
  getGridReductionWarningMessage,
} from "@/lib/grid-reduction-validation"
import { toProjectFilenameStem, toProjectJsonFilename } from "@/lib/project-file-naming"
import { getDefaultColumnSpan } from "@/lib/text-layout"
import {
  resolveAdjacentProjectPageId,
  resolveProjectPageBoundaryId,
} from "@/lib/project-page-navigation"
import { LAYOUT_OPEN_TOOLTIP_ITEMS, type LayoutOpenTooltipItem } from "@/lib/generated-tooltip-content"
import { omitOptionalRecordKey } from "@/lib/record-helpers"
import { resetEditorPanelPersistence } from "@/lib/editor-panel-persistence"
import type { LayoutPreset } from "@/lib/presets"
import {
  createUserProjectRecordQuery,
  getUserProjectRecord,
  saveProjectToUserLibrary,
  type UserProjectRecord,
} from "@/lib/user-layout-library"
import {
  getCloudSyncStatusIndicatorClassName,
  getSaveStatusIndicatorClassName,
  getSaveStatusIndicatorLabel,
  type SaveStatusIndicatorStatus,
} from "@/lib/cloud-status-indicator"

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"
const RELEASE_CHANNEL = (process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? "prod").toLowerCase()
const SHOW_BETA_BADGE = RELEASE_CHANNEL === "beta"
const LAYOUT_OPEN_TOOLTIP_CURSOR_STORAGE_KEY = "swiss-grid-generator.layout-open-tooltip-cursor"
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>
const DEFAULT_PAGE_PREVIEW_LAYOUT: PreviewLayoutState | null = null

type NoticeState = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
} | null

type TextMetricsParityRunner = (options?: {
  sampleLimit?: number
  maxTextLength?: number
}) => Promise<unknown>

declare global {
  interface Window {
    __sggTextMetricsParity?: TextMetricsParityRunner
  }
}

type GridReductionWarningToastState = {
  id: number
  message: string
} | null

type ProjectMetadataHistoryEntry = {
  type: "metadata"
  previousMetadata: ProjectMetadata
  nextMetadata: ProjectMetadata
}

type ProjectHistoryEntry = ProjectMetadataHistoryEntry

type EditableProjectMetadataField = "title" | "description" | "author"

const PROJECT_HISTORY_LIMIT = 100

type ProjectLoadTimingState = {
  elapsedMs: number | null
}

function readStoredNonNegativeInteger(key: string): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return 0
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

function applyLayerLockStateToKeys(
  source: Partial<Record<string, boolean>> | undefined,
  targets: readonly string[],
  locked: boolean,
): Partial<Record<string, boolean>> {
  if (locked) {
    return targets.reduce((acc, key) => {
      acc[key] = true
      return acc
    }, { ...(source ?? {}) } as Partial<Record<string, boolean>>)
  }

  return targets.reduce((acc, key) => omitOptionalRecordKey(acc, key), source ?? {})
}

function cloneCollapsedSectionState(source: Record<SectionKey, boolean>): Record<SectionKey, boolean> {
  return SECTION_KEYS.reduce(
    (acc, key) => {
      acc[key] = source[key]
      return acc
    },
    {} as Record<SectionKey, boolean>,
  )
}

function applySessionUiState(
  snapshot: UiSettingsSnapshot,
  sessionState: Pick<
    UiSettingsSnapshot,
    | "showBaselines"
    | "showModules"
    | "showMargins"
    | "showImagePlaceholders"
    | "showTypography"
    | "showLayers"
    | "collapsed"
  >,
): UiSettingsSnapshot {
  return {
    ...snapshot,
    showBaselines: sessionState.showBaselines,
    showModules: sessionState.showModules,
    showMargins: sessionState.showMargins,
    showImagePlaceholders: sessionState.showImagePlaceholders,
    showTypography: sessionState.showTypography,
    showLayers: sessionState.showLayers,
    collapsed: cloneCollapsedSectionState(sessionState.collapsed),
  }
}

export default function Home() {
  const loadFileInputRef = useRef<HTMLInputElement | null>(null)
  const livePreviewSnapshotGetterRef = useRef<(() => PreviewLayoutState) | null>(null)
  const preferCommittedPreviewLayoutRef = useRef(false)
  const previousEditorSidebarModeRef = useRef<"text" | "image" | null>(null)
  const headerClickTimeoutRef = useRef<number | null>(null)
  const pendingProjectLoadTimingRef = useRef<{ startedAt: number } | null>(null)
  const [editorSidebarMode, setEditorSidebarMode] = useState<"text" | "image" | null>(null)
  const [editorSidebarHost, setEditorSidebarHost] = useState<HTMLDivElement | null>(null)
  const [smartTextZoomEnabled, setSmartTextZoomEnabled] = useState(true)
  const [activeLayoutOpenTooltip, setActiveLayoutOpenTooltip] = useState<{
    displayToken: number
    index: number
    item: LayoutOpenTooltipItem
  } | null>(null)
  const [noticeState, setNoticeState] = useState<NoticeState>(null)
  const [gridReductionWarningToast, setGridReductionWarningToast] = useState<GridReductionWarningToastState>(null)
  const [activeUserProjectId, setActiveUserProjectId] = useState<string | null>(null)
  const [activeUserProjectRecord, setActiveUserProjectRecord] = useState<UserProjectRecord | null>(null)
  const [activeOriginPresetId, setActiveOriginPresetId] = useState<string | null>(null)
  const [projectLoadTiming, setProjectLoadTiming] = useState<ProjectLoadTimingState>({ elapsedMs: null })
  const [projectHistoryPast, setProjectHistoryPast] = useState<ProjectHistoryEntry[]>([])
  const [projectHistoryFuture, setProjectHistoryFuture] = useState<ProjectHistoryEntry[]>([])
  const projectUndoHandlerRef = useRef<() => void>(() => {})
  const projectRedoHandlerRef = useRef<() => void>(() => {})
  const layoutOpenTooltipDisplayTokenRef = useRef(0)
  const layoutOpenTooltipDismissedForSessionRef = useRef(false)
  const [gridUi, dispatchGrid] = useReducer(gridUiReducer, INITIAL_GRID_UI_STATE)

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return undefined
    let mounted = true
    void import("@/lib/text-metrics-dev-report").then(({ runPresetTextMetricsParityReport }) => {
      if (!mounted) return
      window.__sggTextMetricsParity = runPresetTextMetricsParityReport
    })
    return () => {
      mounted = false
      delete window.__sggTextMetricsParity
    }
  }, [])

  const dispatch = useCallback((action: UiAction) => {
    dispatchGrid(action)
  }, [dispatchGrid])
  const ui = gridUi
  const handleRequestNotice = useCallback((notice: NonNullable<NoticeState>) => {
    setNoticeState(notice)
  }, [])
  const handleCloseNotice = useCallback(() => {
    setNoticeState((current) => {
      current?.onCancel?.()
      return null
    })
  }, [])
  const handleConfirmNotice = useCallback(() => {
    setNoticeState((current) => {
      current?.onConfirm?.()
      return null
    })
  }, [])
  const {
    supabase,
    user,
    authError,
    authMessage,
    clearAuthFeedback,
    sendSignInCode,
    verifySignInCode,
    signOut,
  } = useSupabaseAuth()
  const {
    status: cloudSyncStatus,
    statusLabel: cloudStatusLabel,
    pendingQueueCount,
    conflictQueueCount,
    deleteProjectByLocalId,
    queueProjectSyncByLocalId,
    requestCloudSync,
    resolveConflictByLocalId,
    syncAllProjects,
    syncProjectByLocalId,
  } = useCloudProjectSync({
    supabase,
    user,
    onRequestNotice: handleRequestNotice,
  })
  const dismissLayoutOpenTooltip = useCallback((mode: "dismiss" | "session" = "dismiss") => {
    if (mode === "session") {
      layoutOpenTooltipDismissedForSessionRef.current = true
    }
    setActiveLayoutOpenTooltip(null)
  }, [])
  const setLayoutOpenTooltipByIndex = useCallback((index: number) => {
    const fallbackItem = LAYOUT_OPEN_TOOLTIP_ITEMS[0]
    if (!fallbackItem) return

    const totalCount = LAYOUT_OPEN_TOOLTIP_ITEMS.length
    const safeIndex = ((index % totalCount) + totalCount) % totalCount
    const item = LAYOUT_OPEN_TOOLTIP_ITEMS[safeIndex] ?? fallbackItem

    layoutOpenTooltipDisplayTokenRef.current += 1
    setActiveLayoutOpenTooltip({
      displayToken: layoutOpenTooltipDisplayTokenRef.current,
      index: safeIndex,
      item,
    })

    try {
      window.localStorage.setItem(
        LAYOUT_OPEN_TOOLTIP_CURSOR_STORAGE_KEY,
        String((safeIndex + 1) % totalCount),
      )
    } catch {
      // Ignore persistence failures and continue rotating in-memory for this session.
    }
  }, [])
  const showNextLayoutOpenTooltip = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    if (layoutOpenTooltipDismissedForSessionRef.current) return

    const cursor = readStoredNonNegativeInteger(LAYOUT_OPEN_TOOLTIP_CURSOR_STORAGE_KEY)
    setLayoutOpenTooltipByIndex(cursor)
  }, [setLayoutOpenTooltipByIndex])
  const handleNextLayoutOpenTooltip = useCallback(() => {
    if (typeof window === "undefined" || !LAYOUT_OPEN_TOOLTIP_ITEMS[0]) return
    const nextIndex = activeLayoutOpenTooltip
      ? (activeLayoutOpenTooltip.index + 1) % LAYOUT_OPEN_TOOLTIP_ITEMS.length
      : readStoredNonNegativeInteger(LAYOUT_OPEN_TOOLTIP_CURSOR_STORAGE_KEY)
    setLayoutOpenTooltipByIndex(nextIndex)
  }, [activeLayoutOpenTooltip, setLayoutOpenTooltipByIndex])
  const handleProjectPageLimitReached = useCallback((limit: number) => {
    handleRequestNotice({
      title: "Page Limit Reached",
      message: `This project already has ${limit} pages. Delete a page before adding another.`,
    })
  }, [handleRequestNotice])
  const handleRequestGridReductionWarning = useCallback((message: string) => {
    setGridReductionWarningToast({
      id: Date.now(),
      message,
    })
  }, [])
  const dismissGridReductionWarningToast = useCallback(() => {
    setGridReductionWarningToast(null)
  }, [])
  const requestProjectUndo = useCallback(() => {
    projectUndoHandlerRef.current()
  }, [])
  const requestProjectRedo = useCallback(() => {
    projectRedoHandlerRef.current()
  }, [])
  const {
    canvasRatio,
    customRatioWidth, customRatioHeight,
    orientation, rotation,
    marginMethod, gridCols, gridRows, baselineMultiple, gutterMultiple, rhythm,
    rhythmRowsEnabled, rhythmRowsDirection, rhythmColsEnabled, rhythmColsDirection,
    typographyScale, fibonacciSequenceStartIndex, baseFont, imageColorScheme, canvasBackground, customBaseline,
    useCustomMargins, customMarginMultipliers, showBaselines, showModules,
    showMargins, showImagePlaceholders, showTypography, showLayers, collapsed,
  } = ui
  const {
    setCanvasRatio,
    setCustomRatioWidth,
    setCustomRatioHeight,
    setOrientation,
    setRotation,
    setMarginMethod,
    setGridCols,
    setGridRows,
    setBaselineMultiple,
    setGutterMultiple,
    setRhythm,
    setRhythmRowsEnabled,
    setRhythmRowsDirection,
    setRhythmColsEnabled,
    setRhythmColsDirection,
    setTypographyScale,
    setFibonacciSequenceStartIndex,
    setBaseFont,
    setImageColorScheme,
    setCanvasBackground,
    setCustomBaseline,
    setUseCustomMargins,
    setCustomMarginMultipliers,
    setShowLayers,
    setShowImagePlaceholders,
    toggleShowBaselines,
    toggleShowMargins,
    toggleShowModules,
    toggleShowImagePlaceholders,
    toggleShowTypography,
  } = useWorkspaceUiActions({
    dispatch,
    canvasBackground,
  })
  const {
    isDarkUi,
    toggleDarkUi,
    isSmartphone,
    uiTheme,
  } = useWorkspaceChrome()

  const {
    activeSidebarPanel,
    activeHelpSectionId,
    showPresetsBrowser,
    showSectionHelpIcons,
    setActiveHelpSectionId,
    setShowPresetsBrowser,
    openSidebarPanel,
    closeSidebarPanel,
    openHelpSection,
    toggleHelpPanel,
    toggleLayersPanel,
    toggleAccountPanel,
  } = useSidebarPanels({
    showLayers,
    onShowLayersChange: setShowLayers,
  })

  useEffect(() => {
    if (noticeState?.title !== "Cloud Sync Conflict") return
    openSidebarPanel("account")
  }, [noticeState, openSidebarPanel])

  useEffect(() => {
    const handleFocus = () => {
      requestCloudSync("focus", { throttleMs: 60_000 })
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestCloudSync("visible", { throttleMs: 60_000 })
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [requestCloudSync])

  useEffect(() => {
    if (!showPresetsBrowser) return
    requestCloudSync("preset_browser", { throttleMs: 30_000 })
  }, [requestCloudSync, showPresetsBrowser])

  useEffect(() => {
    if (!activeUserProjectId) {
      setActiveUserProjectRecord(null)
      return
    }

    const subscription = createUserProjectRecordQuery(activeUserProjectId).subscribe({
      next: setActiveUserProjectRecord,
      error: (error) => {
        console.error(error)
        setActiveUserProjectRecord(null)
      },
    })

    return () => subscription.unsubscribe()
  }, [activeUserProjectId])

  const {
    previewLayout,
    loadedPreviewLayout,
    requestedLayerOrderState,
    requestedLayerDeleteState,
    requestedLayerEditorState,
    requestedLayerLockState,
    selectedLayerKey,
    setSelectedLayerKeyWithGrace,
    previewUndoNonce,
    previewRedoNonce,
    documentHistoryResetNonce,
    requestPreviewUndo,
    requestPreviewRedo,
    handlePreviewHistoryAvailabilityChange,
    applyLoadedPreviewLayout,
    handleLayerOrderChange,
    handleDeleteLayer,
    handlePreviewLayoutChange,
    handlePreviewLayerSelect,
    handleToggleLayerEditor,
    handleLayerLockChange,
    handleLayerLockBatchChange,
  } = usePreviewDocumentState<TypographyStyleKey, FontFamily>({
    activeSidebarPanel,
    defaultLayout: DEFAULT_PAGE_PREVIEW_LAYOUT,
  })

  // ─── Derived values ───────────────────────────────────────────────────────

  const gridUnit = customBaseline ?? DEFAULT_A4_BASELINE
  const result = useMemo(
    () => buildGridResultFromUiSettings(ui),
    [ui],
  )
  const controlSidebarTheme = useMemo(() => ({
    leftPanel: uiTheme.leftPanel,
    leftPanelEdit: uiTheme.leftPanelEdit,
    subtleBorder: uiTheme.subtleBorder,
    bodyText: uiTheme.bodyText,
    link: uiTheme.link,
  }), [uiTheme.bodyText, uiTheme.leftPanel, uiTheme.leftPanelEdit, uiTheme.link, uiTheme.subtleBorder])

  const baseFilename = useMemo(() => {
    const baselineStr = customBaseline
      ? customBaseline.toFixed(3)
      : result.grid.gridUnit.toFixed(3)
    const ratioKeyForFilename = canvasRatio === "custom"
      ? `custom_${customRatioWidth}x${customRatioHeight}`
      : canvasRatio
    return `${ratioKeyForFilename}_${orientation}_${gridCols}x${gridRows}_method${marginMethod}_${baselineStr}pt`
  }, [canvasRatio, customRatioWidth, customRatioHeight, orientation, gridCols, gridRows, marginMethod, customBaseline, result.grid.gridUnit])

  const defaultPdfFilename = useMemo(
    () => `${baseFilename}_grid.pdf`,
    [baseFilename],
  )
  const defaultSvgFilename = useMemo(
    () => `${baseFilename}_grid.svg`,
    [baseFilename],
  )
  const defaultIdmlFilename = useMemo(
    () => `${baseFilename}.idml`,
    [baseFilename],
  )

  // ─── Settings snapshot (for undo/redo) ───────────────────────────────────

  const sessionUiState = useMemo(
    () => ({
      showBaselines,
      showModules,
      showMargins,
      showImagePlaceholders,
      showTypography,
      showLayers,
      collapsed: cloneCollapsedSectionState(collapsed),
    }),
    [collapsed, showBaselines, showImagePlaceholders, showLayers, showMargins, showModules, showTypography],
  )
  const currentVisibilitySettings = useMemo<ProjectVisibilitySettings>(() => ({
    showBaselines,
    showModules,
    showMargins,
    showImagePlaceholders,
    showTypography,
  }), [showBaselines, showImagePlaceholders, showMargins, showModules, showTypography])
  const currentDocumentUiSnapshot = useMemo<UiSettingsSnapshot>(() => ({
    canvasRatio,
    customRatioWidth,
    customRatioHeight,
    orientation,
    rotation,
    marginMethod,
    gridCols,
    gridRows,
    baselineMultiple,
    gutterMultiple,
    rhythm,
    rhythmRowsEnabled,
    rhythmRowsDirection,
    rhythmColsEnabled,
    rhythmColsDirection,
    typographyScale,
    fibonacciSequenceStartIndex,
    baseFont,
    imageColorScheme,
    canvasBackground,
    customBaseline,
    useCustomMargins,
    customMarginMultipliers,
    showBaselines: DEFAULT_UI.showBaselines,
    showModules: DEFAULT_UI.showModules,
    showMargins: DEFAULT_UI.showMargins,
    showImagePlaceholders: DEFAULT_UI.showImagePlaceholders,
    showTypography: DEFAULT_UI.showTypography,
    showLayers: DEFAULT_UI.showLayers,
    collapsed: cloneCollapsedSectionState(DEFAULT_UI.collapsed),
  }), [
    canvasRatio,
    customRatioWidth,
    customRatioHeight,
    orientation,
    rotation,
    marginMethod,
    gridCols,
    gridRows,
    baselineMultiple,
    gutterMultiple,
    rhythm,
    rhythmRowsEnabled,
    rhythmRowsDirection,
    rhythmColsEnabled,
    rhythmColsDirection,
    typographyScale,
    fibonacciSequenceStartIndex,
    baseFont,
    imageColorScheme,
    canvasBackground,
    customBaseline,
    useCustomMargins,
    customMarginMultipliers,
  ])
  const buildUiSnapshot = useCallback((): UiSettingsSnapshot => currentDocumentUiSnapshot, [currentDocumentUiSnapshot])
  const hydrateUiSnapshot = useCallback(
    (snapshot: UiSettingsSnapshot): UiSettingsSnapshot => applySessionUiState(snapshot, sessionUiState),
    [sessionUiState],
  )
  const {
    suppressNextSettingsHistory,
    resetSettingsHistory,
    resetHistoryDomains,
    canUndo,
    canRedo,
    isDirty,
    undoAny,
    redoAny,
    handlePreviewHistoryRecord,
    handleProjectHistoryRecord,
    markClean,
  } = useWorkspaceHistory({
    buildUiSnapshot,
    onApplyUiSnapshot: (snapshot) => {
      dispatch({ type: "APPLY_SNAPSHOT", snapshot: hydrateUiSnapshot(snapshot) })
    },
    requestPreviewUndo,
    requestPreviewRedo,
    requestProjectUndo,
    requestProjectRedo,
  })

  const applyLoadedUiSnapshot = useCallback((snapshot: UiSettingsSnapshot) => {
    const hydratedSnapshot = hydrateUiSnapshot(snapshot)
    resetSettingsHistory(hydratedSnapshot)
    resetHistoryDomains()
    suppressNextSettingsHistory()
    dispatch({ type: "APPLY_SNAPSHOT", snapshot: hydratedSnapshot })
  }, [dispatch, hydrateUiSnapshot, resetHistoryDomains, resetSettingsHistory, suppressNextSettingsHistory])

  const currentUiSettingsPayload = useMemo(
    () => buildSerializableUiSettingsSnapshot(currentDocumentUiSnapshot),
    [currentDocumentUiSnapshot],
  )

  const getCurrentPreviewLayout = useCallback(
    () => resolveCurrentPreviewLayout({
      preferCommittedLayout: preferCommittedPreviewLayoutRef.current,
      committedLayout: previewLayout,
      getLivePreviewLayout: livePreviewSnapshotGetterRef.current,
    }),
    [previewLayout],
  )

  const handlePreviewSnapshotGetterChange = useCallback((getSnapshot: (() => PreviewLayoutState) | null) => {
    livePreviewSnapshotGetterRef.current = getSnapshot
  }, [])

  const handleApplyProjectPage = useCallback((
    page: ProjectPage<PreviewLayoutState>,
    visibilitySettings: ProjectVisibilitySettings = currentVisibilitySettings,
  ) => {
    const snapshot = buildUiSnapshotFromLoadedSettings(page.uiSettings, {
      ...sessionUiState,
      ...visibilitySettings,
    })
    applyLoadedUiSnapshot(snapshot)
    preferCommittedPreviewLayoutRef.current = true
    applyLoadedPreviewLayout(page.previewLayout)
    setShowPresetsBrowser(false)
  }, [applyLoadedPreviewLayout, applyLoadedUiSnapshot, currentVisibilitySettings, sessionUiState, setShowPresetsBrowser])

  const {
    project,
    activePage,
    pages: projectPages,
    activePageId,
    getCurrentProjectSnapshot,
    replaceProjectSnapshot,
    applyLoadedProject,
    selectPage,
    addPage,
    addPageWithContent,
    setFacingPageEnabled,
    renamePage,
    deletePage,
    reorderPages,
  } = useProjectState<PreviewLayoutState>({
    // NEW: Project/Pages/Layers architecture
    defaultUiSettings: currentUiSettingsPayload,
    defaultPreviewLayout: DEFAULT_PAGE_PREVIEW_LAYOUT,
    currentUiSettings: currentUiSettingsPayload,
    currentVisibilitySettings,
    currentPreviewLayout: previewLayout,
    getCurrentPreviewLayout,
    onApplyPage: handleApplyProjectPage,
    onPageLimitReached: handleProjectPageLimitReached,
  })
  const liveProjectPages = useMemo(() => {
    if (!activePage) return projectPages
    return projectPages.map((page) => (
      page.id === activePage.id ? activePage : page
    ))
  }, [activePage, projectPages])

  const {
    isGuiSettling: isPageGuiSettling,
    requestSettledPageFocus,
    settledPage: sidebarActivePage,
    settledPageId: sidebarActivePageId,
    settledPages: sidebarProjectPages,
  } = useSettledPageNavigation({
    activePageId,
    pages: liveProjectPages,
  })
  const sidebarProjectPageItems = useMemo(() => (
    sidebarProjectPages.map((page) => ({
      id: page.id,
      name: page.name,
      layoutMode: page.layoutMode,
    }))
  ), [sidebarProjectPages])
  const projectTour = project.tour ?? null
  const activePageLayoutMode = activePage?.layoutMode ?? "single"
  const sidebarControlsUseLivePage = sidebarActivePageId === activePageId && !isPageGuiSettling
  const sidebarControlLayoutMode = sidebarControlsUseLivePage
    ? activePageLayoutMode
    : sidebarActivePage?.layoutMode ?? activePageLayoutMode
  const sidebarControlUi = useMemo<UiSettingsSnapshot>(() => {
    if (sidebarControlsUseLivePage) return currentDocumentUiSnapshot
    if (!sidebarActivePage?.uiSettings) return currentDocumentUiSnapshot
    return resolveUiSettingsSnapshot(sidebarActivePage.uiSettings)
  }, [currentDocumentUiSnapshot, sidebarActivePage, sidebarControlsUseLivePage])
  const sidebarControlResult = useMemo(
    () => (
      sidebarControlsUseLivePage
        ? result
        : buildGridResultFromUiSettings(sidebarControlUi, { layoutMode: sidebarControlLayoutMode })
    ),
    [result, sidebarControlLayoutMode, sidebarControlUi, sidebarControlsUseLivePage],
  )
  const sidebarControlGridUnit = sidebarControlUi.customBaseline ?? DEFAULT_A4_BASELINE
  const sidebarControlEffectiveGridCols = sidebarControlLayoutMode === "facing"
    ? sidebarControlUi.gridCols * 2
    : sidebarControlUi.gridCols
  const sidebarControlMaxBaseline = useMemo(() => {
    const customMarginUnits = sidebarControlUi.useCustomMargins
      ? sidebarControlUi.baselineMultiple * (
        sidebarControlUi.customMarginMultipliers.top
        + sidebarControlUi.customMarginMultipliers.bottom
      )
      : undefined
    return getMaxBaseline(
      sidebarControlResult.pageSizePt.height,
      sidebarControlUi.marginMethod,
      sidebarControlUi.baselineMultiple,
      customMarginUnits,
    )
  }, [
    sidebarControlResult.pageSizePt.height,
    sidebarControlUi.baselineMultiple,
    sidebarControlUi.customMarginMultipliers,
    sidebarControlUi.marginMethod,
    sidebarControlUi.useCustomMargins,
  ])
  const sidebarAvailableBaselineOptions = useMemo(
    () => BASELINE_OPTIONS.filter((val) => val <= sidebarControlMaxBaseline),
    [sidebarControlMaxBaseline],
  )
  const {
    previewUi,
    previewResult,
    setPreviewPatch,
    clearPreviewKeys,
  } = useUiSettingsPreview(ui, activePageLayoutMode)
  const handleCanvasRatioPreviewChange = useCallback((value: UiSettingsSnapshot["canvasRatio"] | null) => {
    if (value === null) {
      clearPreviewKeys(["canvasRatio"])
      return
    }
    setPreviewPatch({ canvasRatio: value })
  }, [clearPreviewKeys, setPreviewPatch])
  const handleOrientationPreviewChange = useCallback((value: UiSettingsSnapshot["orientation"] | null) => {
    if (value === null) {
      clearPreviewKeys(["orientation"])
      return
    }
    setPreviewPatch({ orientation: value })
  }, [clearPreviewKeys, setPreviewPatch])
  const handleMarginMethodPreviewChange = useCallback((value: "1" | "2" | "3" | "custom" | null) => {
    if (value === null) {
      clearPreviewKeys(["marginMethod", "useCustomMargins", "customMarginMultipliers"])
      return
    }
    if (value === "custom") {
      const customMarginScale = gridUnit * baselineMultiple
      const clampCustomMarginMultiplier = (multiplier: number) => Math.max(1, Math.min(9, Math.round(multiplier)))
      setPreviewPatch({
        useCustomMargins: true,
        customMarginMultipliers: {
          top: clampCustomMarginMultiplier(result.grid.margins.top / customMarginScale),
          left: clampCustomMarginMultiplier(result.grid.margins.left / customMarginScale),
          right: clampCustomMarginMultiplier(result.grid.margins.right / customMarginScale),
          bottom: clampCustomMarginMultiplier(result.grid.margins.bottom / customMarginScale),
        },
      })
      return
    }
    setPreviewPatch({
      marginMethod: parseInt(value, 10) as 1 | 2 | 3,
      useCustomMargins: false,
    })
  }, [baselineMultiple, clearPreviewKeys, gridUnit, result.grid.margins, setPreviewPatch])
  const handleRhythmPreviewChange = useCallback((value: typeof rhythm | null) => {
    if (value === null) {
      clearPreviewKeys(["rhythm"])
      return
    }
    setPreviewPatch({ rhythm: value })
  }, [clearPreviewKeys, setPreviewPatch])
  const handleRhythmRowsDirectionPreviewChange = useCallback((value: typeof rhythmRowsDirection | null) => {
    if (value === null) {
      clearPreviewKeys(["rhythmRowsDirection"])
      return
    }
    setPreviewPatch({ rhythmRowsDirection: value })
  }, [clearPreviewKeys, setPreviewPatch])
  const handleRhythmColsDirectionPreviewChange = useCallback((value: typeof rhythmColsDirection | null) => {
    if (value === null) {
      clearPreviewKeys(["rhythmColsDirection"])
      return
    }
    setPreviewPatch({ rhythmColsDirection: value })
  }, [clearPreviewKeys, setPreviewPatch])
  const handleTypographyScalePreviewChange = useCallback((value: typeof typographyScale | null) => {
    if (value === null) {
      clearPreviewKeys(["typographyScale"])
      return
    }
    setPreviewPatch({ typographyScale: value })
  }, [clearPreviewKeys, setPreviewPatch])
  const handleBaseFontPreviewChange = useCallback((value: FontFamily | null) => {
    if (value === null) {
      clearPreviewKeys(["baseFont"])
      return
    }
    setPreviewPatch({ baseFont: value })
  }, [clearPreviewKeys, setPreviewPatch])
  const handleColorSchemePreviewChange = useCallback((value: typeof imageColorScheme | null) => {
    if (value === null) {
      clearPreviewKeys(["imageColorScheme"])
      return
    }
    setPreviewPatch({ imageColorScheme: value })
  }, [clearPreviewKeys, setPreviewPatch])
  const handleCanvasBackgroundPreviewChange = useCallback((value: string | null) => {
    if (value === null) {
      clearPreviewKeys(["canvasBackground"])
      return
    }
    setPreviewPatch({ canvasBackground: value === "__none__" ? null : value })
  }, [clearPreviewKeys, setPreviewPatch])

  const beginProjectLoadTiming = useCallback(() => {
    const startedAt = typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now()
    pendingProjectLoadTimingRef.current = { startedAt }
    setProjectLoadTiming({ elapsedMs: null })
  }, [])

  const completeProjectLoadTiming = useCallback(() => {
    const pending = pendingProjectLoadTimingRef.current
    if (!pending) return
    const finishedAt = typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now()
    pendingProjectLoadTimingRef.current = null
    setProjectLoadTiming({
      elapsedMs: Math.max(0, finishedAt - pending.startedAt),
    })
  }, [])

  const handleApplyLoadedProject = useCallback((project: LoadedProject<PreviewLayoutState>) => {
    beginProjectLoadTiming()
    resetEditorPanelPersistence()
    applyLoadedProject(project)
    setProjectHistoryPast([])
    setProjectHistoryFuture([])
    setShowPresetsBrowser(false)
    markClean()
  }, [applyLoadedProject, beginProjectLoadTiming, markClean, setShowPresetsBrowser])
  const handleToggleFeedbackPanel = useCallback(() => {
    openSidebarPanel(activeSidebarPanel === "feedback" ? null : "feedback")
  }, [activeSidebarPanel, openSidebarPanel])
  const handleToggleLegalNoticePanel = useCallback(() => {
    openSidebarPanel(activeSidebarPanel === "legal" ? null : "legal")
  }, [activeSidebarPanel, openSidebarPanel])

  const {
    projectMetadata,
    setProjectMetadata,
    loadProjectFromInput,
    loadPresetProject: handleLoadPresetProject,
  } = useProjectController<PreviewLayoutState>({
    onApplyProject: handleApplyLoadedProject,
    onLoadFailed: () => {
      handleRequestNotice({
        title: "Load Failed",
        message: "Could not load project file.",
      })
    },
    onProjectLoaded: (source) => {
      if (source === "file") {
        setActiveUserProjectId(null)
        setActiveOriginPresetId(null)
      }
      showNextLayoutOpenTooltip()
    },
  })

  const applyProjectHistoryEntry = useCallback((
    entry: ProjectHistoryEntry,
    mode: "undo" | "redo",
  ) => {
    const nextMetadata = mode === "undo" ? entry.previousMetadata : entry.nextMetadata
    const currentProject = getCurrentProjectSnapshot()
    replaceProjectSnapshot({
      ...currentProject,
      metadata: nextMetadata,
    })
    setProjectMetadata(nextMetadata)
  }, [getCurrentProjectSnapshot, replaceProjectSnapshot, setProjectMetadata])

  const handleProjectUndo = useCallback(() => {
    const entry = projectHistoryPast[projectHistoryPast.length - 1]
    if (!entry) return
    applyProjectHistoryEntry(entry, "undo")
    setProjectHistoryPast((past) => past.slice(0, -1))
    setProjectHistoryFuture((future) => {
      const next = [...future, entry]
      return next.length > PROJECT_HISTORY_LIMIT ? next.slice(next.length - PROJECT_HISTORY_LIMIT) : next
    })
  }, [applyProjectHistoryEntry, projectHistoryPast])

  const handleProjectRedo = useCallback(() => {
    const entry = projectHistoryFuture[projectHistoryFuture.length - 1]
    if (!entry) return
    applyProjectHistoryEntry(entry, "redo")
    setProjectHistoryFuture((future) => future.slice(0, -1))
    setProjectHistoryPast((past) => {
      const next = [...past, entry]
      return next.length > PROJECT_HISTORY_LIMIT ? next.slice(next.length - PROJECT_HISTORY_LIMIT) : next
    })
  }, [applyProjectHistoryEntry, projectHistoryFuture])

  projectUndoHandlerRef.current = handleProjectUndo
  projectRedoHandlerRef.current = handleProjectRedo

  const recordProjectHistory = useCallback((entry: ProjectHistoryEntry) => {
    setProjectHistoryPast((past) => {
      const next = [...past, entry]
      return next.length > PROJECT_HISTORY_LIMIT ? next.slice(next.length - PROJECT_HISTORY_LIMIT) : next
    })
    setProjectHistoryFuture([])
    handleProjectHistoryRecord()
  }, [handleProjectHistoryRecord])

  const handleHeaderVisibilityToggle = useCallback((
    key: "showBaselines" | "showModules" | "showMargins" | "showImagePlaceholders" | "showTypography",
    event?: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (event) {
      event.preventDefault()
    }
    dispatch({ type: "TOGGLE", key })
  }, [dispatch])

  const applyProjectMetadata = useCallback((nextMetadata: ProjectMetadata) => {
    if (
      projectMetadata.title === nextMetadata.title
      && projectMetadata.description === nextMetadata.description
      && projectMetadata.author === nextMetadata.author
      && projectMetadata.createdAt === nextMetadata.createdAt
    ) {
      return
    }

    recordProjectHistory({
      type: "metadata",
      previousMetadata: projectMetadata,
      nextMetadata,
    })
    replaceProjectSnapshot({
      ...getCurrentProjectSnapshot(),
      metadata: nextMetadata,
    })
    setProjectMetadata(nextMetadata)
  }, [getCurrentProjectSnapshot, projectMetadata, recordProjectHistory, replaceProjectSnapshot, setProjectMetadata])

  const handleLoadBrowserPreset = useCallback((preset: LayoutPreset) => {
    beginProjectLoadTiming()
    setActiveUserProjectId(preset.source === "user" ? (preset.userProjectId ?? preset.id) : null)
    setActiveOriginPresetId(
      preset.source === "user"
        ? (preset.originPresetId ?? null)
        : preset.id,
    )
    handleLoadPresetProject(preset)
  }, [beginProjectLoadTiming, handleLoadPresetProject])

  const handleDeleteBrowserPreset = useCallback(async (preset: LayoutPreset) => {
    const targetId = preset.userProjectId ?? preset.id
    if (!targetId) return

    if (activeUserProjectId === targetId) {
      setActiveUserProjectId(null)
      setActiveOriginPresetId(preset.originPresetId ?? null)
    }

    const deleteResult = await deleteProjectByLocalId(targetId)

    if (deleteResult === "deleted_cloud") {
      handleRequestNotice({
        title: "Deleted from Cloud",
        message: "The selected user layout was removed from the local library and soft-deleted in Supabase. Cloud status: deleted in cloud.",
      })
      return
    }

    if (deleteResult === "queued_cloud_delete") {
      handleRequestNotice({
        title: "Deleted Locally",
        message: "The selected user layout was removed from the local library and will be deleted from Supabase the next time cloud sync is available. Cloud status: delete queued.",
      })
      return
    }

    if (deleteResult === "purged_local") {
      handleRequestNotice({
        title: "Deleted from Users",
        message: "The selected user layout was removed from the local library. Cloud status: no cloud copy.",
      })
    }
  }, [activeUserProjectId, deleteProjectByLocalId, handleRequestNotice])

  const defaultJsonFilename = useMemo(() => {
    return toProjectJsonFilename(projectMetadata.title, baseFilename)
  }, [baseFilename, projectMetadata.title])

  const projectTourController = useProjectTourController({
    tour: projectTour,
    showPresetsBrowser,
    setShowPresetsBrowser,
    activePageId,
    selectedLayerKey,
    onSelectPage: selectPage,
    onSelectLayer: setSelectedLayerKeyWithGrace,
    onOpenSidebarPanel: openSidebarPanel,
    onOpenHelpSection: openHelpSection,
    onOpenLayerEditor: handleToggleLayerEditor,
  })

  const getGridReductionConflicts = useCallback((nextGridCols: number, nextGridRows: number) => {
    const layout = getCurrentPreviewLayout()
    if (!layout) {
      return {
        columnConflicts: [],
        rowConflicts: [],
      }
    }
    return findTextLayerGridReductionConflicts({
      blockOrder: layout.blockOrder,
      blockModulePositions: layout.blockModulePositions,
      resolveBlockSpan: (key) => {
        const raw = layout.blockColumnSpans[key]
        return typeof raw === "number" && Number.isFinite(raw)
          ? raw
          : getDefaultColumnSpan(key, gridCols)
      },
      resolveBlockRows: (key) => {
        const raw = layout.blockRowSpans?.[key]
        return typeof raw === "number" && Number.isFinite(raw) ? raw : 1
      },
      imageOrder: layout.imageOrder,
      imageModulePositions: layout.imageModulePositions,
      resolveImageSpan: (key) => {
        const raw = layout.imageColumnSpans?.[key]
        return typeof raw === "number" && Number.isFinite(raw) ? raw : 1
      },
      resolveImageRows: (key) => {
        const raw = layout.imageRowSpans?.[key]
        return typeof raw === "number" && Number.isFinite(raw) ? raw : 1
      },
      nextGridCols,
      nextGridRows,
    })
  }, [getCurrentPreviewLayout, gridCols])

  const handleGridColsChange = useCallback((nextGridCols: number) => {
    if (nextGridCols === gridCols) return
    if (nextGridCols < gridCols) {
      const { columnConflicts } = getGridReductionConflicts(nextGridCols, gridRows)
      if (columnConflicts.length > 0) {
        handleRequestGridReductionWarning(getGridReductionWarningMessage("columns"))
        return
      }
    }
    dismissGridReductionWarningToast()
    setGridCols(nextGridCols)
  }, [
    dismissGridReductionWarningToast,
    getGridReductionConflicts,
    gridCols,
    gridRows,
    handleRequestGridReductionWarning,
    setGridCols,
  ])

  const handleGridRowsChange = useCallback((nextGridRows: number) => {
    if (nextGridRows === gridRows) return
    if (nextGridRows < gridRows) {
      const { rowConflicts } = getGridReductionConflicts(gridCols, nextGridRows)
      if (rowConflicts.length > 0) {
        handleRequestGridReductionWarning(getGridReductionWarningMessage("rows"))
        return
      }
    }
    dismissGridReductionWarningToast()
    setGridRows(nextGridRows)
  }, [
    dismissGridReductionWarningToast,
    getGridReductionConflicts,
    gridCols,
    gridRows,
    handleRequestGridReductionWarning,
    setGridRows,
  ])
  const handleEffectiveGridColsChange = useCallback((value: number) => {
    handleGridColsChange(activePageLayoutMode === "facing" ? Math.max(1, Math.ceil(value / 2)) : value)
  }, [activePageLayoutMode, handleGridColsChange])

  const handleProjectTitleChange = useCallback((nextTitle: string) => {
    const trimmedTitle = nextTitle.trim()
    if (!trimmedTitle) return
    applyProjectMetadata({
      ...projectMetadata,
      title: trimmedTitle,
    })
  }, [applyProjectMetadata, projectMetadata])

  const handleProjectMetadataFieldChange = useCallback((
    field: Exclude<EditableProjectMetadataField, "title">,
    nextValue: string,
  ) => {
    const trimmedValue = nextValue.trim()
    applyProjectMetadata({
      ...projectMetadata,
      [field]: trimmedValue,
    })
  }, [applyProjectMetadata, projectMetadata])

  const handleProjectDescriptionChange = useCallback((nextDescription: string) => {
    handleProjectMetadataFieldChange("description", nextDescription)
  }, [handleProjectMetadataFieldChange])

  const handleProjectAuthorChange = useCallback((nextAuthor: string) => {
    handleProjectMetadataFieldChange("author", nextAuthor)
  }, [handleProjectMetadataFieldChange])

  const signedInAuthor = user?.email?.trim() ?? ""
  const effectiveProjectMetadata = useMemo<ProjectMetadata>(() => {
    if (projectMetadata.author.trim() || !signedInAuthor) return projectMetadata
    return {
      ...projectMetadata,
      author: signedInAuthor,
    }
  }, [projectMetadata, signedInAuthor])

  const handleSelectPreviousProjectPage = useCallback(() => {
    const nextPageId = resolveAdjacentProjectPageId(
      projectPages.map((page) => page.id),
      activePageId,
      "previous",
    )
    if (!nextPageId) return
    requestSettledPageFocus(nextPageId)
    selectPage(nextPageId)
  }, [activePageId, projectPages, requestSettledPageFocus, selectPage])

  const handleSelectNextProjectPage = useCallback(() => {
    const nextPageId = resolveAdjacentProjectPageId(
      projectPages.map((page) => page.id),
      activePageId,
      "next",
    )
    if (!nextPageId) return
    requestSettledPageFocus(nextPageId)
    selectPage(nextPageId)
  }, [activePageId, projectPages, requestSettledPageFocus, selectPage])

  const handleSelectPreviousProjectPageJump = useCallback(() => {
    const nextPageId = resolveAdjacentProjectPageId(
      projectPages.map((page) => page.id),
      activePageId,
      "previous",
      10,
    )
    if (!nextPageId) return
    requestSettledPageFocus(nextPageId)
    selectPage(nextPageId)
  }, [activePageId, projectPages, requestSettledPageFocus, selectPage])

  const handleSelectNextProjectPageJump = useCallback(() => {
    const nextPageId = resolveAdjacentProjectPageId(
      projectPages.map((page) => page.id),
      activePageId,
      "next",
      10,
    )
    if (!nextPageId) return
    requestSettledPageFocus(nextPageId)
    selectPage(nextPageId)
  }, [activePageId, projectPages, requestSettledPageFocus, selectPage])

  const handleSelectFirstProjectPage = useCallback(() => {
    const nextPageId = resolveProjectPageBoundaryId(
      projectPages.map((page) => page.id),
      activePageId,
      "first",
    )
    if (!nextPageId) return
    requestSettledPageFocus(nextPageId)
    selectPage(nextPageId)
  }, [activePageId, projectPages, requestSettledPageFocus, selectPage])

  const handleSelectLastProjectPage = useCallback(() => {
    const nextPageId = resolveProjectPageBoundaryId(
      projectPages.map((page) => page.id),
      activePageId,
      "last",
    )
    if (!nextPageId) return
    requestSettledPageFocus(nextPageId)
    selectPage(nextPageId)
  }, [activePageId, projectPages, requestSettledPageFocus, selectPage])

  const handleDirectProjectPageSelect = useCallback((pageId: string) => {
    if (pageId === activePageId) return
    requestSettledPageFocus(pageId)
    selectPage(pageId)
  }, [activePageId, requestSettledPageFocus, selectPage])

  const handleCommittedLayerOrderChange = useCallback((nextLayerOrder: string[]) => {
    preferCommittedPreviewLayoutRef.current = true
    handleLayerOrderChange(nextLayerOrder)
  }, [handleLayerOrderChange])

  const handleCommittedLayerDelete = useCallback((target: string, kind: "text" | "image") => {
    preferCommittedPreviewLayoutRef.current = true
    handleDeleteLayer(target, kind)
  }, [handleDeleteLayer])

  const handleCommittedLayerLockToggle = useCallback((target: string, locked: boolean) => {
    preferCommittedPreviewLayoutRef.current = true
    handleLayerLockChange(target, locked)
  }, [handleLayerLockChange])

  const handleCommittedPageLayerLockToggle = useCallback((pageId: string, locked: boolean) => {
    const currentProject = getCurrentProjectSnapshot()
    const targetPage = currentProject.pages.find((page) => page.id === pageId)
    const targetLayout = targetPage?.previewLayout
    if (!targetPage || !targetLayout) return

    const targetKeys = [...targetLayout.blockOrder, ...(targetLayout.imageOrder ?? [])]
    if (targetKeys.length === 0) return

    preferCommittedPreviewLayoutRef.current = true

    if (pageId === activePageId) {
      handleLayerLockBatchChange(targetKeys, locked)
      return
    }

    const nextProject: LoadedProject<PreviewLayoutState> = {
      ...currentProject,
      pages: currentProject.pages.map((page) => (
        page.id === pageId
          ? {
              ...page,
              previewLayout: {
                ...targetLayout,
                lockedLayers: applyLayerLockStateToKeys(targetLayout.lockedLayers, targetKeys, locked),
              },
            }
          : page
      )),
    }

    replaceProjectSnapshot(nextProject)
  }, [activePageId, getCurrentProjectSnapshot, handleLayerLockBatchChange, replaceProjectSnapshot])

  const handleCommittedPreviewLayoutChange = useCallback((layout: PreviewLayoutState) => {
    preferCommittedPreviewLayoutRef.current = false
    handlePreviewLayoutChange(layout)
  }, [handlePreviewLayoutChange])

  useEffect(() => {
    const previousMode = previousEditorSidebarModeRef.current
    previousEditorSidebarModeRef.current = editorSidebarMode
    if (previousMode === null || editorSidebarMode !== null) return

    replaceProjectSnapshot(getCurrentProjectSnapshot())
  }, [editorSidebarMode, getCurrentProjectSnapshot, replaceProjectSnapshot])

  const handlePreviewGridRestore = useCallback((cols: number, rows: number) => {
    suppressNextSettingsHistory()
    dispatch({ type: "BATCH", actions: [
      { type: "SET", key: "gridCols", value: cols },
      { type: "SET", key: "gridRows", value: rows },
    ] })
  }, [dispatch, suppressNextSettingsHistory])

  // ─── Section collapse helpers ─────────────────────────────────────────────

  const toggle = useCallback((key: SectionKey) =>
    dispatch({ type: "TOGGLE_SECTION", key }), [dispatch])

  const toggleAllSections = useCallback(() => {
    const allClosed = SECTION_KEYS.every((key) => collapsed[key])
    dispatch({ type: "SET_ALL_SECTIONS", value: !allClosed })
  }, [collapsed, dispatch])

  const handleSectionHeaderClick = useCallback((key: SectionKey) => (event: React.MouseEvent) => {
    if (event.detail > 1) return
    if (headerClickTimeoutRef.current !== null) window.clearTimeout(headerClickTimeoutRef.current)
    headerClickTimeoutRef.current = window.setTimeout(() => {
      toggle(key)
      headerClickTimeoutRef.current = null
    }, 180)
  }, [toggle])

  const handleSectionHeaderDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    if (headerClickTimeoutRef.current !== null) {
      window.clearTimeout(headerClickTimeoutRef.current)
      headerClickTimeoutRef.current = null
    }
    toggleAllSections()
  }, [toggleAllSections])

  const handleSectionHelpNavigate = useCallback((key: SectionKey) => {
    const targetSectionId = HELP_SECTION_BY_SETTINGS_SECTION[key]
    setActiveHelpSectionId(targetSectionId)
  }, [setActiveHelpSectionId])
  const handleHeaderHelpNavigate = useCallback((actionKey: string) => {
    const targetSectionId = HELP_SECTION_BY_HEADER_ACTION[actionKey]
    if (!targetSectionId) return
    setActiveHelpSectionId(targetSectionId)
  }, [setActiveHelpSectionId])

  useEffect(() => {
    return () => {
      if (headerClickTimeoutRef.current !== null) window.clearTimeout(headerClickTimeoutRef.current)
    }
  }, [])

  // ─── Export / Save actions ────────────────────────────────────────────────

  const previewResolvedCanvasBackground = useMemo(
    () => (
      previewUi.canvasBackground
        ? resolveImageSchemeColor(previewUi.canvasBackground, previewUi.imageColorScheme)
        : null
    ),
    [previewUi.canvasBackground, previewUi.imageColorScheme],
  )

  const exportActionsContext = useMemo(
    () => ({
      defaultPdfFilename,
      defaultSvgFilename,
      defaultIdmlFilename,
      defaultJsonFilename,
      projectMetadata: effectiveProjectMetadata,
      onProjectMetadataChange: applyProjectMetadata,
      onProjectVisibilityToggle: handleHeaderVisibilityToggle,
      getCurrentProjectSnapshot,
    }),
    [
      defaultPdfFilename,
      defaultSvgFilename,
      defaultIdmlFilename,
      defaultJsonFilename,
      effectiveProjectMetadata,
      applyProjectMetadata,
      handleHeaderVisibilityToggle,
      getCurrentProjectSnapshot,
    ],
  )

  const exportActions = useExportActions(exportActionsContext)
  const handleExportBrowserPreset = useCallback((preset: LayoutPreset) => {
    try {
      const parsedProject = parseLoadedProject<Record<string, unknown>>(
        JSON.parse(preset.projectSourceJson) as Record<string, unknown>,
      )
      exportActions.openExportDialogForProject(parsedProject)
    } catch (error) {
      console.error(error)
      handleRequestNotice({
        title: "Export Failed",
        message: "Could not open export for the selected preset.",
      })
    }
  }, [exportActions, handleRequestNotice])
  const hasPreviewLayout = previewLayout !== null
  const persistActiveUserProjectPromiseRef = useRef<Promise<void> | null>(null)

  const handleSaveToLibrary = useCallback(async () => {
    const fallbackStem = toProjectFilenameStem(defaultJsonFilename.replace(/\.json$/i, "")) || "Untitled Project"
    const trimmedTitle = effectiveProjectMetadata.title.trim()
    const trimmedDescription = effectiveProjectMetadata.description.trim()
    const trimmedAuthor = effectiveProjectMetadata.author.trim()
    const nextCreatedAt = effectiveProjectMetadata.createdAt && !Number.isNaN(Date.parse(effectiveProjectMetadata.createdAt))
      ? new Date(effectiveProjectMetadata.createdAt).toISOString()
      : new Date().toISOString()
    const normalizedMetadata = {
      title: trimmedTitle,
      description: trimmedDescription,
      author: trimmedAuthor,
      createdAt: nextCreatedAt,
    }
    const currentProject = getCurrentProjectSnapshot()

    try {
      const savedId = await saveProjectToUserLibrary({
        id: activeUserProjectId,
        label: trimmedTitle || fallbackStem,
        title: normalizedMetadata.title,
        description: normalizedMetadata.description,
        author: normalizedMetadata.author,
        createdAt: normalizedMetadata.createdAt,
        originPresetId: activeOriginPresetId,
        ownerUserId: user?.id ?? null,
        project: {
          activePageId: currentProject.activePageId,
          pages: currentProject.pages,
          layoutEngine: currentProject.layoutEngine,
          title: normalizedMetadata.title,
          description: normalizedMetadata.description,
          author: normalizedMetadata.author,
          createdAt: normalizedMetadata.createdAt,
          tour: currentProject.tour ?? undefined,
        },
      })

      setActiveUserProjectId(savedId)
      if (user) {
        await syncProjectByLocalId(savedId)
      }
      replaceProjectSnapshot({
        ...currentProject,
        metadata: normalizedMetadata,
      })
      setProjectMetadata(normalizedMetadata)
      exportActions.setIsSaveLibraryDialogOpen(false)
      markClean()
      handleRequestNotice({
        title: "Saved to Library",
        message: user
          ? "Project stored in the local Users library. Signed-in layouts sync to the cloud automatically."
          : "Project stored in the local Users library. Sign in to sync saved layouts to the cloud.",
      })
    } catch (error) {
      console.error(error)
      handleRequestNotice({
        title: "Library Save Failed",
        message: "Could not store the project in the local library.",
      })
    }
  }, [
    activeOriginPresetId,
    activeUserProjectId,
    defaultJsonFilename,
    exportActions,
    effectiveProjectMetadata.author,
    effectiveProjectMetadata.createdAt,
    effectiveProjectMetadata.description,
    effectiveProjectMetadata.title,
    getCurrentProjectSnapshot,
    handleRequestNotice,
    markClean,
    replaceProjectSnapshot,
    setProjectMetadata,
    syncProjectByLocalId,
    user,
  ])

  const persistActiveUserProject = useCallback(async (syncCloud = true) => {
    if (!activeUserProjectId || !isDirty) return
    if (persistActiveUserProjectPromiseRef.current) {
      await persistActiveUserProjectPromiseRef.current
      return
    }

    const persistPromise = (async () => {
      const currentProject = getCurrentProjectSnapshot()
      const nextCreatedAt = effectiveProjectMetadata.createdAt && !Number.isNaN(Date.parse(effectiveProjectMetadata.createdAt))
        ? new Date(effectiveProjectMetadata.createdAt).toISOString()
        : new Date().toISOString()
      const normalizedMetadata = {
        title: effectiveProjectMetadata.title.trim(),
        description: effectiveProjectMetadata.description.trim(),
        author: effectiveProjectMetadata.author.trim(),
        createdAt: nextCreatedAt,
      }

      try {
        const savedId = await saveProjectToUserLibrary({
          id: activeUserProjectId,
          label: normalizedMetadata.title || toProjectFilenameStem(defaultJsonFilename.replace(/\.json$/i, "")) || "Untitled Project",
          title: normalizedMetadata.title,
          description: normalizedMetadata.description,
          author: normalizedMetadata.author,
          createdAt: normalizedMetadata.createdAt,
          originPresetId: activeOriginPresetId,
          ownerUserId: user?.id ?? null,
          project: {
            activePageId: currentProject.activePageId,
            pages: currentProject.pages,
            layoutEngine: currentProject.layoutEngine,
            title: normalizedMetadata.title,
            description: normalizedMetadata.description,
            author: normalizedMetadata.author,
            createdAt: normalizedMetadata.createdAt,
            tour: currentProject.tour ?? undefined,
          },
        })
        setActiveUserProjectId(savedId)
        if (syncCloud && user) {
          await queueProjectSyncByLocalId(savedId, "save")
        }
        replaceProjectSnapshot({
          ...currentProject,
          metadata: normalizedMetadata,
        })
        setProjectMetadata(normalizedMetadata)
        markClean()
      } catch (error) {
        console.error(error)
      }
    })()

    persistActiveUserProjectPromiseRef.current = persistPromise
    try {
      await persistPromise
    } finally {
      if (persistActiveUserProjectPromiseRef.current === persistPromise) {
        persistActiveUserProjectPromiseRef.current = null
      }
    }
  }, [
    activeOriginPresetId,
    activeUserProjectId,
    defaultJsonFilename,
    effectiveProjectMetadata.author,
    effectiveProjectMetadata.createdAt,
    effectiveProjectMetadata.description,
    effectiveProjectMetadata.title,
    getCurrentProjectSnapshot,
    isDirty,
    markClean,
    replaceProjectSnapshot,
    setProjectMetadata,
    queueProjectSyncByLocalId,
    user,
  ])

  const handleKeepLocalCloudConflict = useCallback(async () => {
    if (!activeUserProjectId) return
    const resolved = await resolveConflictByLocalId(activeUserProjectId, "keep_local")
    handleRequestNotice({
      title: resolved ? "Conflict Resolved" : "Conflict Resolution Failed",
      message: resolved
        ? "The local project will overwrite the cloud copy on the next successful sync."
        : "Could not resolve the active project conflict. Check the cloud activity log and try again.",
    })
  }, [activeUserProjectId, handleRequestNotice, resolveConflictByLocalId])

  const handleUseCloudConflict = useCallback(async () => {
    if (!activeUserProjectId) return
    const resolved = await resolveConflictByLocalId(activeUserProjectId, "use_cloud")
    if (!resolved) {
      handleRequestNotice({
        title: "Conflict Resolution Failed",
        message: "Could not load the cloud copy for the active project.",
      })
      return
    }

    const record = await getUserProjectRecord(activeUserProjectId)
    if (record) {
      handleApplyLoadedProject(parseLoadedProject<PreviewLayoutState>(record.project))
      markClean()
    }
    handleRequestNotice({
      title: "Cloud Copy Restored",
      message: "The active project now uses the cloud copy and is marked synced locally.",
    })
  }, [activeUserProjectId, handleApplyLoadedProject, handleRequestNotice, markClean, resolveConflictByLocalId])

  const handleDeleteCloudConflict = useCallback(async () => {
    if (!activeUserProjectId) return
    const deleteResult = await deleteProjectByLocalId(activeUserProjectId)
    setActiveUserProjectId(null)
    setActiveOriginPresetId(activeUserProjectRecord?.originPresetId ?? null)

    if (deleteResult === "deleted_cloud") {
      handleRequestNotice({
        title: "Conflict Deleted",
        message: "The conflicted project was removed locally and soft-deleted in Supabase.",
      })
      return
    }

    if (deleteResult === "queued_cloud_delete") {
      handleRequestNotice({
        title: "Conflict Delete Queued",
        message: "The conflicted project was removed locally and will be soft-deleted in Supabase when cloud sync is available.",
      })
      return
    }

    handleRequestNotice({
      title: "Conflict Deleted Locally",
      message: "The conflicted local project was removed from the Users library.",
    })
  }, [
    activeUserProjectId,
    activeUserProjectRecord?.originPresetId,
    deleteProjectByLocalId,
    handleRequestNotice,
  ])

  const activeCloudConflictDetails = useMemo(() => (
    activeUserProjectRecord?.syncState === "conflict"
      ? {
          title: activeUserProjectRecord.title,
          localUpdatedAt: activeUserProjectRecord.updatedAt,
          lastSyncedAt: activeUserProjectRecord.lastSyncedAt ?? null,
          localRevision: activeUserProjectRecord.remoteRevision ?? null,
          remoteProjectId: activeUserProjectRecord.remoteProjectId ?? null,
        }
      : null
  ), [activeUserProjectRecord])

  useEffect(() => {
    if (!activeUserProjectId || !isDirty) return

    const timeoutId = window.setTimeout(() => {
      void persistActiveUserProject(true)
    }, 1500)

    return () => window.clearTimeout(timeoutId)
  }, [activeUserProjectId, isDirty, persistActiveUserProject])

  useEffect(() => {
    const flushIfNeeded = () => {
      if (!activeUserProjectId || !isDirty) return
      void persistActiveUserProject(true)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushIfNeeded()
      }
    }

    window.addEventListener("pagehide", flushIfNeeded)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", flushIfNeeded)
    return () => {
      window.removeEventListener("pagehide", flushIfNeeded)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", flushIfNeeded)
    }
  }, [activeUserProjectId, isDirty, persistActiveUserProject])

  useShellKeyboardShortcuts({
    canUndo,
    canRedo,
    showPresetsBrowser,
    hasPreviewLayout,
    hasMultipleProjectPages: projectPages.length > 1,
    onImportProject: () => loadFileInputRef.current?.click(),
    onOpenSaveLibraryDialog: exportActions.openSaveLibraryDialog,
    onOpenExportDialog: exportActions.openExportDialog,
    onUndo: undoAny,
    onRedo: redoAny,
    onToggleDarkMode: toggleDarkUi,
    onToggleBaselines: toggleShowBaselines,
    onToggleMargins: toggleShowMargins,
    onToggleModules: toggleShowModules,
    onToggleTypography: toggleShowTypography,
    onToggleImagePlaceholders: toggleShowImagePlaceholders,
    onToggleLayersPanel: toggleLayersPanel,
    onToggleHelpPanel: toggleHelpPanel,
    onToggleLegalNoticePanel: () => openSidebarPanel(activeSidebarPanel === "legal" ? null : "legal"),
    onOpenPresets: () => setShowPresetsBrowser(true),
    onClosePresets: () => setShowPresetsBrowser(false),
    onSelectFirstPage: handleSelectFirstProjectPage,
    onSelectLastPage: handleSelectLastProjectPage,
    onSelectPreviousPage: handleSelectPreviousProjectPage,
    onSelectNextPage: handleSelectNextProjectPage,
    onSelectPreviousPageJump: handleSelectPreviousProjectPageJump,
    onSelectNextPageJump: handleSelectNextProjectPageJump,
  })

  const cloudStatusIndicatorClassName = getCloudSyncStatusIndicatorClassName({
    status: cloudSyncStatus,
    isSignedIn: Boolean(user),
  })
  const saveStatus: SaveStatusIndicatorStatus = !hasPreviewLayout || isDirty || !activeUserProjectId
    ? "unsaved"
    : user && cloudSyncStatus === "synced" && activeUserProjectRecord?.syncState === "synced"
      ? "synced"
      : "local"
  const saveStatusDotClassName = getSaveStatusIndicatorClassName(saveStatus)
  const saveStatusLabel = getSaveStatusIndicatorLabel(saveStatus)

  const { fileGroup, displayGroup, sidebarGroup } = useHeaderActions({
    activeSidebarPanel,
    showPresetsBrowser,
    hasPreviewLayout,
    isDarkUi,
    showBaselines,
    showMargins,
    showModules,
    showImagePlaceholders,
    showTypography,
    showLayers,
    smartTextZoomEnabled,
    saveStatusDotClassName,
    saveStatusLabel,
    accountStatusDotClassName: cloudStatusIndicatorClassName,
    accountUserEmail: user?.email ?? null,
    accountCloudStatusLabel: cloudStatusLabel,
    canUndo,
    canRedo,
    onOpenPresets: () => setShowPresetsBrowser(true),
    onImportProject: () => loadFileInputRef.current?.click(),
    onOpenSaveLibraryDialog: exportActions.openSaveLibraryDialog,
    onOpenExportDialog: exportActions.openExportDialog,
    onUndo: undoAny,
    onRedo: redoAny,
    onToggleDarkMode: toggleDarkUi,
    onToggleSmartTextZoom: () => setSmartTextZoomEnabled((current) => !current),
    onToggleBaselines: (event) => handleHeaderVisibilityToggle("showBaselines", event),
    onToggleMargins: (event) => handleHeaderVisibilityToggle("showMargins", event),
    onToggleModules: (event) => handleHeaderVisibilityToggle("showModules", event),
    onToggleImagePlaceholders: (event) => handleHeaderVisibilityToggle("showImagePlaceholders", event),
    onToggleTypography: (event) => handleHeaderVisibilityToggle("showTypography", event),
    onToggleLayersPanel: toggleLayersPanel,
    onToggleHelpPanel: toggleHelpPanel,
    onToggleAccountPanel: toggleAccountPanel,
  })

  const renderLeftPanel = () => (
    <ControlSidebar
      showBetaBadge={SHOW_BETA_BADGE}
      uiTheme={controlSidebarTheme}
      editorMode={editorSidebarMode}
      onEditorHostChange={setEditorSidebarHost}
      settingsPanels={settingsPanels}
      onToggleFeedbackPanel={handleToggleFeedbackPanel}
      onToggleLegalNoticePanel={handleToggleLegalNoticePanel}
    />
  )

  const previewWorkspace = (
    <PreviewWorkspace
      renderLeftPanel={renderLeftPanel}
      fileGroup={fileGroup}
      displayGroup={displayGroup}
      sidebarGroup={sidebarGroup}
      activeSidebarPanel={activeSidebarPanel}
      activeHelpSectionId={activeHelpSectionId}
      showPresetsBrowser={showPresetsBrowser}
      isDarkUi={isDarkUi}
      showSectionHelpIcons={showSectionHelpIcons}
      smartTextZoomEnabled={smartTextZoomEnabled}
      showBaselines={showBaselines}
      showModules={showModules}
      showMargins={showMargins}
      showImagePlaceholders={showImagePlaceholders}
      showTypography={showTypography}
      baseFont={previewUi.baseFont}
      imageColorScheme={previewUi.imageColorScheme}
      resolvedCanvasBackground={previewResolvedCanvasBackground}
      rotation={rotation}
      previewUndoNonce={previewUndoNonce}
      previewRedoNonce={previewRedoNonce}
      documentHistoryResetNonce={documentHistoryResetNonce}
      selectedLayerKey={selectedLayerKey}
      projectTitle={projectMetadata.title}
      projectDescription={projectMetadata.description}
      projectAuthor={effectiveProjectMetadata.author}
      projectCreatedAt={projectMetadata.createdAt}
      projectLoadTimeMs={projectLoadTiming.elapsedMs}
      userId={user?.id ?? null}
      userEmail={user?.email ?? null}
      isCloudSignedIn={Boolean(user)}
      cloudStatusLabel={cloudStatusLabel}
      cloudStatusIndicatorClassName={cloudStatusIndicatorClassName}
      pendingCloudQueueCount={pendingQueueCount}
      cloudConflictCount={conflictQueueCount}
      hasActiveCloudConflict={activeUserProjectRecord?.syncState === "conflict"}
      activeCloudConflictDetails={activeCloudConflictDetails}
      authError={authError}
      authMessage={authMessage}
      projectPages={sidebarProjectPageItems}
      projectInfoPages={projectPages}
      activeProjectPage={activePage}
      activePageId={activePageId}
      sidebarActiveProjectPage={sidebarActivePage}
      sidebarActivePageId={sidebarActivePageId}
      sidebarControlsUseLivePage={sidebarControlsUseLivePage}
      loadedPreviewLayout={loadedPreviewLayout}
      layoutEngine={project.layoutEngine}
      requestedLayerOrderState={requestedLayerOrderState}
      requestedLayerDeleteState={requestedLayerDeleteState}
      requestedLayerEditorState={requestedLayerEditorState}
      requestedLayerLockState={requestedLayerLockState}
      appVersion={APP_VERSION}
      uiTheme={{
        divider: uiTheme.divider,
        bodyText: uiTheme.bodyText,
        previewHeader: uiTheme.previewHeader,
        previewShell: uiTheme.previewShell,
        previewContent: uiTheme.previewContent,
        previewContentEdit: uiTheme.previewContentEdit,
        sidebar: uiTheme.sidebar,
        sidebarBody: uiTheme.sidebarBody,
      }}
      result={previewResult}
      onLoadPreset={handleLoadBrowserPreset}
      onExportPreset={handleExportBrowserPreset}
      onDeleteUserPreset={handleDeleteBrowserPreset}
      onHeaderHelpNavigate={handleHeaderHelpNavigate}
      onOpenHelpSection={openHelpSection}
      onHistoryRecord={handlePreviewHistoryRecord}
      onUndoRequest={undoAny}
      onRedoRequest={redoAny}
      onHistoryAvailabilityChange={handlePreviewHistoryAvailabilityChange}
      onRequestGridRestore={handlePreviewGridRestore}
      gridReductionWarningToast={gridReductionWarningToast}
      onDismissGridReductionWarningToast={dismissGridReductionWarningToast}
      onRequestGridReductionWarning={handleRequestGridReductionWarning}
      onRequestNotice={handleRequestNotice}
      onLayoutChange={handleCommittedPreviewLayoutChange}
      onSnapshotGetterChange={handlePreviewSnapshotGetterChange}
      onProjectTitleChange={handleProjectTitleChange}
      onProjectDescriptionChange={handleProjectDescriptionChange}
      onProjectAuthorChange={handleProjectAuthorChange}
      onPreviewPlansCommit={completeProjectLoadTiming}
      onClearAuthFeedback={clearAuthFeedback}
      onSyncNow={() => syncAllProjects("manual")}
      onKeepLocalCloudConflict={handleKeepLocalCloudConflict}
      onUseCloudConflict={handleUseCloudConflict}
      onDeleteCloudConflict={handleDeleteCloudConflict}
      onSendSignInCode={sendSignInCode}
      onVerifySignInCode={verifySignInCode}
      onSignOut={signOut}
      onPageSelect={handleDirectProjectPageSelect}
      onPageAdd={addPage}
      onPageAddWithContent={addPageWithContent}
      onPageFacingToggle={setFacingPageEnabled}
      onPageRename={renamePage}
      onPageDelete={deletePage}
      onPageOrderChange={reorderPages}
      onLayerOrderChange={handleCommittedLayerOrderChange}
      onLayerSelect={handlePreviewLayerSelect}
      onLayerEditorToggle={handleToggleLayerEditor}
      onLayerLockToggle={handleCommittedLayerLockToggle}
      onPageLayerLockToggle={handleCommittedPageLayerLockToggle}
      onLayerDelete={handleCommittedLayerDelete}
      onSelectedLayerKeyChange={setSelectedLayerKeyWithGrace}
      onImageColorSchemeChange={setImageColorScheme}
      onShowImagePlaceholdersChange={setShowImagePlaceholders}
      editorSidebarHost={editorSidebarHost}
      editorMode={editorSidebarMode}
      onEditorModeChange={setEditorSidebarMode}
      closeSidebarPanel={closeSidebarPanel}
      layoutOpenTooltip={activeLayoutOpenTooltip}
      layoutOpenTooltipTotalCount={LAYOUT_OPEN_TOOLTIP_ITEMS.length}
      onDismissLayoutOpenTooltip={dismissLayoutOpenTooltip}
      onNextLayoutOpenTooltip={handleNextLayoutOpenTooltip}
      tourState={projectTour ? {
        title: projectTour.title,
        description: projectTour.description,
        isOpen: projectTourController.isOpen,
        stepTitle: projectTourController.currentStep?.title,
        stepCaption: projectTourController.currentStep?.caption,
        stepIndex: projectTourController.currentStepIndex,
        stepCount: projectTourController.stepCount,
        waitingForLayerClick: projectTourController.currentStep?.advanceOn?.type === "layerClick",
        canGoBack: projectTourController.canGoBack,
        canGoNext: projectTourController.canGoNext,
        onStart: projectTourController.startTour,
        onClose: () => {
          projectTourController.closeTour()
          setShowPresetsBrowser(true)
        },
        onBack: projectTourController.goToPreviousStep,
        onNext: projectTourController.canGoNext
          ? projectTourController.goToNextStep
          : projectTourController.closeTour,
      } : null}
    />
  )

  const settingsPanels = useMemo(() => (
    <SettingsSidebarPanels
      collapsed={collapsed}
      showSectionHelpIcons={showSectionHelpIcons}
      showRolloverInfo={false}
      interactionsDisabled={showPresetsBrowser || !sidebarControlsUseLivePage}
      onHelpNavigate={handleSectionHelpNavigate}
      onSectionHeaderClick={handleSectionHeaderClick}
      onSectionHeaderDoubleClick={handleSectionHeaderDoubleClick}
      canvasRatio={sidebarControlUi.canvasRatio}
      onCanvasRatioChange={setCanvasRatio}
      onCanvasRatioPreviewChange={handleCanvasRatioPreviewChange}
      customRatioWidth={sidebarControlUi.customRatioWidth}
      onCustomRatioWidthChange={setCustomRatioWidth}
      customRatioHeight={sidebarControlUi.customRatioHeight}
      onCustomRatioHeightChange={setCustomRatioHeight}
      orientation={sidebarControlUi.orientation}
      onOrientationChange={setOrientation}
      onOrientationPreviewChange={handleOrientationPreviewChange}
      rotation={sidebarControlUi.rotation}
      onRotationChange={setRotation}
      customBaseline={sidebarControlUi.customBaseline}
      availableBaselineOptions={sidebarAvailableBaselineOptions}
      onCustomBaselineChange={setCustomBaseline}
      marginMethod={sidebarControlUi.marginMethod}
      onMarginMethodChange={setMarginMethod}
      onMarginMethodPreviewChange={handleMarginMethodPreviewChange}
      baselineMultiple={sidebarControlUi.baselineMultiple}
      onBaselineMultipleChange={setBaselineMultiple}
      useCustomMargins={sidebarControlUi.useCustomMargins}
      onUseCustomMarginsChange={setUseCustomMargins}
      customMarginMultipliers={sidebarControlUi.customMarginMultipliers}
      onCustomMarginMultipliersChange={setCustomMarginMultipliers}
      currentMargins={sidebarControlResult.grid.margins}
      gridUnit={sidebarControlGridUnit}
      gridCols={sidebarControlEffectiveGridCols}
      onGridColsChange={handleEffectiveGridColsChange}
      gridRows={sidebarControlUi.gridRows}
      onGridRowsChange={handleGridRowsChange}
      gutterMultiple={sidebarControlUi.gutterMultiple}
      onGutterMultipleChange={setGutterMultiple}
      rhythm={sidebarControlUi.rhythm}
      onRhythmChange={setRhythm}
      onRhythmPreviewChange={handleRhythmPreviewChange}
      rhythmRowsEnabled={sidebarControlUi.rhythmRowsEnabled}
      onRhythmRowsEnabledChange={setRhythmRowsEnabled}
      rhythmRowsDirection={sidebarControlUi.rhythmRowsDirection}
      onRhythmRowsDirectionChange={setRhythmRowsDirection}
      onRhythmRowsDirectionPreviewChange={handleRhythmRowsDirectionPreviewChange}
      rhythmColsEnabled={sidebarControlUi.rhythmColsEnabled}
      onRhythmColsEnabledChange={setRhythmColsEnabled}
      rhythmColsDirection={sidebarControlUi.rhythmColsDirection}
      onRhythmColsDirectionChange={setRhythmColsDirection}
      onRhythmColsDirectionPreviewChange={handleRhythmColsDirectionPreviewChange}
      typographyScale={sidebarControlUi.typographyScale}
      onTypographyScaleChange={setTypographyScale}
      onTypographyScalePreviewChange={handleTypographyScalePreviewChange}
      fibonacciSequenceStartIndex={sidebarControlUi.fibonacciSequenceStartIndex}
      onFibonacciSequenceStartIndexChange={setFibonacciSequenceStartIndex}
      typographyStyles={sidebarControlResult.typography.styles}
      baseFont={sidebarControlUi.baseFont}
      onBaseFontChange={setBaseFont}
      onBaseFontPreviewChange={handleBaseFontPreviewChange}
      colorScheme={sidebarControlUi.imageColorScheme}
      onColorSchemeChange={setImageColorScheme}
      onColorSchemePreviewChange={handleColorSchemePreviewChange}
      canvasBackground={sidebarControlUi.canvasBackground}
      onCanvasBackgroundChange={setCanvasBackground}
      onCanvasBackgroundPreviewChange={handleCanvasBackgroundPreviewChange}
      isDarkMode={isDarkUi}
    />
  ), [
    collapsed,
    handleBaseFontPreviewChange,
    handleCanvasBackgroundPreviewChange,
    handleCanvasRatioPreviewChange,
    handleColorSchemePreviewChange,
    handleEffectiveGridColsChange,
    handleGridRowsChange,
    handleMarginMethodPreviewChange,
    handleOrientationPreviewChange,
    handleRhythmColsDirectionPreviewChange,
    handleRhythmPreviewChange,
    handleRhythmRowsDirectionPreviewChange,
    handleSectionHeaderClick,
    handleSectionHeaderDoubleClick,
    handleSectionHelpNavigate,
    handleTypographyScalePreviewChange,
    isDarkUi,
    setBaselineMultiple,
    setBaseFont,
    setCanvasBackground,
    setCanvasRatio,
    setCustomBaseline,
    setCustomMarginMultipliers,
    setCustomRatioHeight,
    setCustomRatioWidth,
    setGutterMultiple,
    setImageColorScheme,
    setMarginMethod,
    setOrientation,
    setRhythm,
    setRhythmColsDirection,
    setRhythmColsEnabled,
    setRhythmRowsDirection,
    setRhythmRowsEnabled,
    setRotation,
    setFibonacciSequenceStartIndex,
    setTypographyScale,
    setUseCustomMargins,
    showSectionHelpIcons,
    showPresetsBrowser,
    sidebarAvailableBaselineOptions,
    sidebarControlEffectiveGridCols,
    sidebarControlGridUnit,
    sidebarControlResult.grid.margins,
    sidebarControlResult.typography.styles,
    sidebarControlsUseLivePage,
    sidebarControlUi,
  ])

  if (isSmartphone) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6 text-white">
        <div className="w-full max-w-md rounded-lg border border-white/20 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Screen Too Small</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            Swiss Grid Generator requires a viewport width of at least 768 pixels.
            Open it on a tablet, laptop, or desktop screen, or enlarge this window to continue.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <input
        ref={loadFileInputRef}
        type="file"
        accept="application/json,application/gzip,.json,.swissgridgenerator"
        className="hidden"
        onChange={loadProjectFromInput}
      />
      <div className={`flex h-screen overflow-hidden flex-col ${uiTheme.root}`}>
        {previewWorkspace}

        <WorkspaceDialogs
          isDarkUi={isDarkUi}
          exportDialog={{
            isOpen: exportActions.isExportDialogOpen,
            onClose: exportActions.requestCloseExportDialog,
            showBaselines: exportActions.visibilitySettings.showBaselines,
            onToggleBaselines: () => exportActions.toggleExportVisibility("showBaselines"),
            showMargins: exportActions.visibilitySettings.showMargins,
            onToggleMargins: () => exportActions.toggleExportVisibility("showMargins"),
            showModules: exportActions.visibilitySettings.showModules,
            onToggleModules: () => exportActions.toggleExportVisibility("showModules"),
            showTypography: exportActions.visibilitySettings.showTypography,
            onToggleTypography: () => exportActions.toggleExportVisibility("showTypography"),
            showImagePlaceholders: exportActions.visibilitySettings.showImagePlaceholders,
            onToggleImagePlaceholders: () => exportActions.toggleExportVisibility("showImagePlaceholders"),
            rangeDraft: exportActions.exportRangeDraft,
            onRangeDraftChange: exportActions.setExportRangeDraft,
            onRangeDraftCommit: exportActions.commitExportRangeDraft,
            rangeStart: exportActions.exportRangeStartDraft,
            format: exportActions.exportFormatDraft,
            onFormatChange: exportActions.setExportFormatDraft,
            filename: exportActions.exportFilenameDraft,
            onFilenameChange: exportActions.setExportFilenameDraft,
            defaultFilename: exportActions.defaultExportFilename,
            jsonTitle: exportActions.saveTitleDraft,
            onJsonTitleChange: exportActions.setSaveTitleDraft,
            jsonDescription: exportActions.saveDescriptionDraft,
            onJsonDescriptionChange: exportActions.setSaveDescriptionDraft,
            jsonAuthor: exportActions.saveAuthorDraft,
            onJsonAuthorChange: exportActions.setSaveAuthorDraft,
            bleedEnabled: exportActions.bleedEnabledDraft,
            onBleedEnabledChange: exportActions.setBleedEnabledDraft,
            bleedMm: exportActions.bleedWidthMmDraft,
            onBleedMmChange: exportActions.setBleedWidthMmDraft,
            onConfirm: exportActions.confirmExport,
            progress: exportActions.exportProgress,
            previewProject: exportActions.previewProject,
          }}
          saveLibraryDialog={{
            isOpen: exportActions.isSaveLibraryDialogOpen,
            onClose: () => exportActions.setIsSaveLibraryDialogOpen(false),
            title: exportActions.saveTitleDraft,
            onTitleChange: exportActions.setSaveTitleDraft,
            description: exportActions.saveDescriptionDraft,
            onDescriptionChange: exportActions.setSaveDescriptionDraft,
            author: exportActions.saveAuthorDraft,
            onAuthorChange: exportActions.setSaveAuthorDraft,
            onConfirm: handleSaveToLibrary,
          }}
          noticeState={noticeState}
          onCloseNotice={handleCloseNotice}
          onConfirmNotice={handleConfirmNotice}
        />
      </div>
    </>
  )
}
