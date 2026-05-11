"use client"

import { useState, useMemo, useRef, useEffect, useCallback, type ChangeEvent, type MouseEvent as ReactMouseEvent } from "react"
import {
  getMaxBaseline,
} from "@/core/layout/grid-calculator"
import type { GridResult } from "@/core/layout/grid-calculator"
import { SettingsSidebarPanels } from "@/gui/panels/settings/SettingsSidebarPanels"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/core/types/preview-layout"
import { SECTION_KEYS, type SectionKey, type UiSettingsSnapshot } from "@/core/types/workspace-ui-schema"
import { useExportActions } from "@/gui/shell/hooks/useExportActions"
import { useHeaderActions } from "@/gui/shell/hooks/useHeaderActions"
import {
  HELP_SECTION_BY_HEADER_ACTION,
  HELP_SECTION_BY_SETTINGS_SECTION,
  type HelpSectionId,
} from "@/core/document/help-registry"
import { WorkspaceDialogs } from "@/gui/dialogs/WorkspaceDialogs"
import { useShellKeyboardShortcuts } from "@/gui/shell/hooks/useShellKeyboardShortcuts"
import { useWorkspaceUiActions } from "@/gui/shell/hooks/useWorkspaceUiActions"
import { useUiSettingsPreview } from "@/gui/shell/hooks/useUiSettingsPreview"
import { useProjectTourController } from "@/gui/shell/hooks/useProjectTourController"
import { useSupabaseAuth } from "@/gui/shell/hooks/useSupabaseAuth"
import { useCloudProjectSync } from "@/gui/shell/hooks/useCloudProjectSync"
import { useLayoutOpenTooltipController } from "@/gui/shell/hooks/useLayoutOpenTooltipController"
import { useSettledPageNavigation } from "@/gui/shell/hooks/useSettledPageNavigation"
import {
  documentToLoadedProject,
  useDocumentStore,
  type ActivePageDraft,
  type SwissLoadedProject,
} from "@/gui/state/documentStore"
import { useWorkspaceStore } from "@/gui/state/workspaceStore"
import { DARK_WORKSPACE_THEME, LIGHT_WORKSPACE_THEME } from "@/gui/shell/workspaceTheme"
import { parseLoadedProject, type LoadedProject, type ProjectMetadata, type ProjectPage, type ProjectVisibilitySettings } from "@/core/document/session"
import { type FontFamily } from "@/core/config/fonts"
import { BASELINE_OPTIONS } from "@/core/config/defaults"
import { DEFAULT_UI } from "@/core/config/ui-defaults"
import {
  resolveImageSchemeColor,
} from "@/core/config/color-schemes"
import {
  DEFAULT_A4_BASELINE,
  buildUiSnapshotFromLoadedSettings,
  gridUiReducer,
  type UiAction,
} from "@/lib/workspace-ui-state"
import {
  buildGridResultFromUiSettings,
  buildSerializableUiSettingsSnapshot,
  resolveUiSettingsSnapshot,
} from "@/core/document/ui-settings-resolver"
import { resolveCurrentPreviewLayout } from "@/gui/preview/lib/current-preview-layout"
import { findTextLayerGridReductionConflicts } from "@/core/layout/grid-reduction-validation"
import { getGridReductionWarningMessage } from "@/gui/lib/grid-reduction-warning"
import { toProjectFilenameStem, toProjectJsonFilename } from "@/gui/shell/lib/project-file-naming"
import { getDefaultColumnSpan } from "@/core/layout/text-layout"
import {
  resolveAdjacentProjectPageId,
  resolveProjectPageBoundaryId,
} from "@/gui/shell/lib/project-page-navigation"
import { omitOptionalRecordKey } from "@/lib/record-helpers"
import { resetEditorPanelPersistence } from "@/gui/editors/lib/editor-panel-persistence"
import { parseProjectTransferPayloadBytes } from "@/lib/project-transfer"
import { PREVIEW_LAYER_SELECTION_GRACE_MS } from "@/gui/preview/lib/preview-interaction-constants"
import { CanvasContainer } from "@/gui/shell/CanvasContainer"
import { LeftToolbar } from "@/gui/shell/LeftToolbar"
import type {
  ProjectPanelLayerCounts,
  ProjectPanelPageRow,
  ProjectPanelViewModel,
} from "@/gui/panels/sidebar/project-panel-view-model"
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
} from "@/gui/shell/lib/cloud-status-indicator"
import { translateMessage } from "@/lib/i18n"

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"
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

type GridReductionWarningToastState = {
  id: number
  message: string
} | null

type EditableProjectMetadataField = "title" | "description" | "author"

const MAX_PROJECT_PAGE_COUNT = 1000

type ProjectLoadTimingState = {
  elapsedMs: number | null
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

type ProjectPanelSourcePage = Pick<ProjectPage<PreviewLayoutState>, "id" | "layoutMode" | "name" | "previewLayout">

function getProjectPanelLayerCounts(page: ProjectPanelSourcePage): ProjectPanelLayerCounts {
  const layout = page.previewLayout
  return {
    images: layout?.imageOrder?.length ?? 0,
    text: layout?.blockOrder.length ?? 0,
  }
}

function createProjectPanelRow(page: ProjectPanelSourcePage): ProjectPanelPageRow {
  const counts = getProjectPanelLayerCounts(page)
  return {
    id: page.id,
    imageLayerCount: counts.images,
    layoutMode: page.layoutMode ?? "single",
    name: page.name,
    textLayerCount: counts.text,
  }
}

function createProjectPanelViewModelFromRows(rows: readonly ProjectPanelPageRow[]): ProjectPanelViewModel {
  const pageIndexById = new Map<string, number>()
  const layerCountsByPageId = new Map<string, ProjectPanelLayerCounts>()
  const physicalPageNumberById = new Map<string, number>()
  let physicalPageNumber = 1

  rows.forEach((row, index) => {
    pageIndexById.set(row.id, index)
    layerCountsByPageId.set(row.id, {
      images: row.imageLayerCount,
      text: row.textLayerCount,
    })
    physicalPageNumberById.set(row.id, physicalPageNumber)
    physicalPageNumber += row.layoutMode === "facing" ? 2 : 1
  })

  return {
    layerCountsByPageId,
    pageIndexById,
    pages: rows,
    physicalPageCount: Math.max(1, physicalPageNumber - 1),
    physicalPageNumberById,
  }
}

function createProjectPanelViewModel(pages: readonly ProjectPanelSourcePage[]): ProjectPanelViewModel {
  return createProjectPanelViewModelFromRows(pages.map(createProjectPanelRow))
}

function reconcileProjectPanelViewModel(
  previous: ProjectPanelViewModel,
  pages: readonly ProjectPanelSourcePage[],
): ProjectPanelViewModel {
  let changed = previous.pages.length !== pages.length
  const nextRows: ProjectPanelPageRow[] = new Array(pages.length)

  pages.forEach((page, index) => {
    const previousIndex = previous.pageIndexById.get(page.id)
    const previousRow = previousIndex === undefined ? undefined : previous.pages[previousIndex]
    const counts = getProjectPanelLayerCounts(page)
    const layoutMode = page.layoutMode ?? "single"

    if (
      previousRow
      && previousRow.name === page.name
      && previousRow.layoutMode === layoutMode
      && previousRow.textLayerCount === counts.text
      && previousRow.imageLayerCount === counts.images
    ) {
      nextRows[index] = previousRow
      changed = changed || previousIndex !== index
      return
    }

    nextRows[index] = {
      id: page.id,
      imageLayerCount: counts.images,
      layoutMode,
      name: page.name,
      textLayerCount: counts.text,
    }
    changed = true
  })

  return changed ? createProjectPanelViewModelFromRows(nextRows) : previous
}

function useProjectPanelViewModel(
  pages: readonly ProjectPanelSourcePage[],
  resetToken: number,
): ProjectPanelViewModel {
  const cachedRef = useRef<{
    resetToken: number
    sourcePages: readonly ProjectPanelSourcePage[]
    viewModel: ProjectPanelViewModel
  } | null>(null)
  const cached = cachedRef.current

  if (cached && cached.resetToken === resetToken) {
    if (cached.sourcePages === pages) return cached.viewModel
    const nextViewModel = reconcileProjectPanelViewModel(cached.viewModel, pages)
    cachedRef.current = {
      resetToken,
      sourcePages: pages,
      viewModel: nextViewModel,
    }
    return nextViewModel
  }

  const nextViewModel = createProjectPanelViewModel(pages)
  cachedRef.current = {
    resetToken,
    sourcePages: pages,
    viewModel: nextViewModel,
  }
  return nextViewModel
}

function areSerializableUiSettingsEqual(
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown>,
): boolean {
  return JSON.stringify(left ?? {}) === JSON.stringify(right)
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
  options: { resetCollapsed?: boolean } = {},
): UiSettingsSnapshot {
  return {
    ...snapshot,
    showBaselines: sessionState.showBaselines,
    showModules: sessionState.showModules,
    showMargins: sessionState.showMargins,
    showImagePlaceholders: sessionState.showImagePlaceholders,
    showTypography: sessionState.showTypography,
    showLayers: sessionState.showLayers,
    collapsed: cloneCollapsedSectionState(options.resetCollapsed ? DEFAULT_UI.collapsed : sessionState.collapsed),
  }
}

function resolveActivePageDraft(
  project: LoadedProject<PreviewLayoutState>,
  currentUiSettings: Record<string, unknown>,
  currentPreviewLayout: PreviewLayoutState | null,
): ProjectPage<PreviewLayoutState> | null {
  const activePage = project.pages.find((page) => page.id === project.activePageId) ?? null
  if (!activePage) return null
  if (
    activePage.uiSettings === currentUiSettings
    && activePage.previewLayout === currentPreviewLayout
  ) {
    return activePage
  }

  return {
    ...activePage,
    uiSettings: currentUiSettings,
    previewLayout: currentPreviewLayout,
  }
}

function persistActivePageSnapshot(
  project: LoadedProject<PreviewLayoutState>,
  activePageDraft: ProjectPage<PreviewLayoutState> | null,
  visibilitySettings: ProjectVisibilitySettings,
): LoadedProject<PreviewLayoutState> {
  const projectWithVisibility = project.visibilitySettings === visibilitySettings
    ? project
    : {
        ...project,
        visibilitySettings,
      }
  if (!activePageDraft) return projectWithVisibility
  const activePageIndex = project.pages.findIndex((page) => page.id === activePageDraft.id)
  if (activePageIndex === -1) return projectWithVisibility
  if (project.pages[activePageIndex] === activePageDraft) return projectWithVisibility

  const nextPages = project.pages.slice()
  nextPages[activePageIndex] = activePageDraft
  return {
    ...projectWithVisibility,
    pages: nextPages,
  }
}

export function ShellModelView() {
  const loadFileInputRef = useRef<HTMLInputElement | null>(null)
  const livePreviewSnapshotGetterRef = useRef<(() => PreviewLayoutState) | null>(null)
  const preferCommittedPreviewLayoutRef = useRef(false)
  const previousEditorSidebarModeRef = useRef<"text" | "image" | null>(null)
  const headerClickTimeoutRef = useRef<number | null>(null)
  const pendingProjectLoadTimingRef = useRef<{ startedAt: number } | null>(null)
  const [editorSidebarMode, setEditorSidebarMode] = useState<"text" | "image" | null>(null)
  const [editorSidebarHost, setEditorSidebarHost] = useState<HTMLDivElement | null>(null)
  const smartTextZoomEnabled = useWorkspaceStore((state) => state.smartTextZoom)
  const setSmartTextZoomEnabled = useWorkspaceStore((state) => state.setSmartTextZoom)
  const workspaceCollapsed = useWorkspaceStore((state) => state.collapsed)
  const workspaceActivePanel = useWorkspaceStore((state) => state.activePanel)
  const showPresetsBrowser = useWorkspaceStore((state) => state.showPresetsBrowser)
  const activeHelpSectionId = useWorkspaceStore((state) => state.activeHelpSectionId as HelpSectionId | null)
  const isDarkUi = useWorkspaceStore((state) => state.darkMode)
  const setWorkspaceCollapsed = useWorkspaceStore((state) => state.setCollapsed)
  const setWorkspaceActivePanel = useWorkspaceStore((state) => state.setActivePanel)
  const setShowPresetsBrowser = useWorkspaceStore((state) => state.setShowPresetsBrowser)
  const setActiveHelpSectionId = useWorkspaceStore((state) => state.setActiveHelpSectionId)
  const setDarkUi = useWorkspaceStore((state) => state.setDarkMode)
  const selectedLayerKey = useWorkspaceStore((state) => state.selection.layerId)
  const setSelectedLayer = useWorkspaceStore((state) => state.setSelectedLayer)
  const clearSelection = useWorkspaceStore((state) => state.clearSelection)
  const activeDocumentPage = useDocumentStore((state) => (
    state.present.pages.find((page) => page.id === state.present.activePageId) ?? null
  ))
  const documentPresent = useDocumentStore((state) => state.present)
  const documentVisibilitySettings = useDocumentStore((state) => state.present.visibilitySettings)
  const canUndo = useDocumentStore((state) => state.canUndo)
  const canRedo = useDocumentStore((state) => state.canRedo)
  const isDirty = useDocumentStore((state) => state.isDirty)
  const undoAny = useDocumentStore((state) => state.undo)
  const redoAny = useDocumentStore((state) => state.redo)
  const markClean = useDocumentStore((state) => state.markClean)
  const patchActivePageConfig = useDocumentStore((state) => state.patchActivePageConfig)
  const patchProjectMetadata = useDocumentStore((state) => state.patchMetadata)
  const setDocumentVisibilityOption = useDocumentStore((state) => state.setVisibilityOption)
  const recordPreviewHistoryBoundary = useDocumentStore((state) => state.recordPreviewHistoryBoundary)
  const loadProjectIntoStore = useDocumentStore((state) => state.loadProject)
  const replaceProjectSnapshotInStore = useDocumentStore((state) => state.replaceProjectSnapshot)
  const setActivePageInStore = useDocumentStore((state) => state.setActivePage)
  const addPageInStore = useDocumentStore((state) => state.addPage)
  const setFacingPageEnabledInStore = useDocumentStore((state) => state.setFacingPageEnabled)
  const renamePage = useDocumentStore((state) => state.renamePage)
  const deletePageInStore = useDocumentStore((state) => state.deletePage)
  const reorderPagesInStore = useDocumentStore((state) => state.reorderPages)
  const loadedPreviewLayout = useDocumentStore((state) => state.loadedPreviewLayout) as {
    token: number
    layout: PreviewLayoutState | null
  } | null
  const requestedLayerOrderState = useDocumentStore((state) => state.requestedLayerOrderState)
  const requestedLayerDeleteState = useDocumentStore((state) => state.requestedLayerDeleteState)
  const requestedLayerEditorState = useDocumentStore((state) => state.requestedLayerEditorState)
  const requestedLayerLockState = useDocumentStore((state) => state.requestedLayerLockState)
  const replaceActivePagePreviewLayout = useDocumentStore((state) => state.replaceActivePagePreviewLayout)
  const requestLayerOrder = useDocumentStore((state) => state.requestLayerOrder)
  const requestLayerDelete = useDocumentStore((state) => state.requestLayerDelete)
  const requestLayerEditor = useDocumentStore((state) => state.requestLayerEditor)
  const requestLayerLock = useDocumentStore((state) => state.requestLayerLock)
  const clearLayerRequests = useDocumentStore((state) => state.clearLayerRequests)
  const {
    activeLayoutOpenTooltip,
    dismissLayoutOpenTooltip,
    handleNextLayoutOpenTooltip,
    layoutOpenTooltipTotalCount,
    showNextLayoutOpenTooltip,
  } = useLayoutOpenTooltipController()
  const [noticeState, setNoticeState] = useState<NoticeState>(null)
  const [gridReductionWarningToast, setGridReductionWarningToast] = useState<GridReductionWarningToastState>(null)
  const [activeUserProjectId, setActiveUserProjectId] = useState<string | null>(null)
  const [activeUserProjectRecord, setActiveUserProjectRecord] = useState<UserProjectRecord | null>(null)
  const [activeOriginPresetId, setActiveOriginPresetId] = useState<string | null>(null)
  const [projectLoadTiming, setProjectLoadTiming] = useState<ProjectLoadTimingState>({ elapsedMs: null })
  const [projectPanelResetToken, setProjectPanelResetToken] = useState(0)

  const ui = useMemo(() => resolveUiSettingsSnapshot(activeDocumentPage?.uiSettings ?? {}, {
    showBaselinesFallback: documentVisibilitySettings.showBaselines,
    showModulesFallback: documentVisibilitySettings.showModules,
    showMarginsFallback: documentVisibilitySettings.showMargins,
    showImagePlaceholdersFallback: documentVisibilitySettings.showImagePlaceholders,
    showTypographyFallback: documentVisibilitySettings.showTypography,
    collapsedFallback: workspaceCollapsed,
    showLayersFallback: workspaceActivePanel === "layers",
  }), [activeDocumentPage?.uiSettings, documentVisibilitySettings, workspaceActivePanel, workspaceCollapsed])

  const commitUiSnapshot = useCallback((nextUi: UiSettingsSnapshot, options: { history: boolean; dirty: boolean }) => {
    const serializableSettings = buildSerializableUiSettingsSnapshot(nextUi)
    let historyAvailable = options.history
    if (!areSerializableUiSettingsEqual(activeDocumentPage?.uiSettings, serializableSettings)) {
      patchActivePageConfig(serializableSettings, { ...options, history: historyAvailable })
      historyAvailable = false
    }
    const setVisibility = (key: keyof ProjectVisibilitySettings, value: boolean) => {
      if (documentVisibilitySettings[key] === value) return
      setDocumentVisibilityOption(key, value, { ...options, history: historyAvailable })
      historyAvailable = false
    }
    setVisibility("showBaselines", nextUi.showBaselines)
    setVisibility("showModules", nextUi.showModules)
    setVisibility("showMargins", nextUi.showMargins)
    setVisibility("showImagePlaceholders", nextUi.showImagePlaceholders)
    setVisibility("showTypography", nextUi.showTypography)
    setWorkspaceCollapsed(cloneCollapsedSectionState(nextUi.collapsed))
    setWorkspaceActivePanel(nextUi.showLayers ? "layers" : null)
  }, [
    activeDocumentPage?.uiSettings,
    documentVisibilitySettings,
    patchActivePageConfig,
    setDocumentVisibilityOption,
    setWorkspaceActivePanel,
    setWorkspaceCollapsed,
  ])

  const dispatch = useCallback((action: UiAction) => {
    const nextUi = gridUiReducer(ui, action)
    if (nextUi === ui) return
    commitUiSnapshot(nextUi, {
      history: action.type !== "APPLY_SNAPSHOT",
      dirty: action.type !== "APPLY_SNAPSHOT",
    })
  }, [commitUiSnapshot, ui])
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
  const handleProjectPageLimitReached = useCallback((limit: number) => {
    handleRequestNotice({
      title: translateMessage("status.notices.pageLimitTitle"),
      message: translateMessage("status.notices.pageLimitMessage", { count: limit }),
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
  const {
    canvasRatio,
    customRatioWidth, customRatioHeight,
    orientation, rotation,
    marginMethod, gridCols, gridRows, gutterMultiple, rhythm,
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
  const [isSmartphone, setIsSmartphone] = useState(false)
  const activeSidebarPanel = workspaceActivePanel
  const showSectionHelpIcons = activeSidebarPanel === "help"
  const uiTheme = useMemo(() => (
    isDarkUi ? DARK_WORKSPACE_THEME : LIGHT_WORKSPACE_THEME
  ), [isDarkUi])

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const checkSmartphone = () => {
      setIsSmartphone(window.matchMedia("(max-width: 767px)").matches)
    }

    checkSmartphone()
    window.addEventListener("resize", checkSmartphone)
    return () => window.removeEventListener("resize", checkSmartphone)
  }, [])

  useEffect(() => {
    if (showPresetsBrowser && activeSidebarPanel === "layers") {
      setWorkspaceActivePanel(null)
      return
    }
    if (!showPresetsBrowser && showLayers && activeSidebarPanel !== "layers") {
      setWorkspaceActivePanel("layers")
      return
    }
    if (!showLayers && activeSidebarPanel === "layers") {
      setWorkspaceActivePanel(null)
    }
  }, [activeSidebarPanel, setWorkspaceActivePanel, showLayers, showPresetsBrowser])

  const toggleDarkUi = useCallback(() => {
    setDarkUi(!useWorkspaceStore.getState().darkMode)
  }, [setDarkUi])

  const openSidebarPanel = useCallback((panel: typeof activeSidebarPanel) => {
    if (showPresetsBrowser && panel === "layers") return
    setWorkspaceActivePanel(panel)
    setShowLayers(panel === "layers")
  }, [setShowLayers, setWorkspaceActivePanel, showPresetsBrowser])

  const closeSidebarPanel = useCallback(() => {
    openSidebarPanel(null)
  }, [openSidebarPanel])

  const openHelpSection = useCallback((sectionId: HelpSectionId) => {
    setActiveHelpSectionId(sectionId)
    openSidebarPanel("help")
  }, [openSidebarPanel, setActiveHelpSectionId])

  const toggleHelpPanel = useCallback(() => {
    setWorkspaceActivePanel(useWorkspaceStore.getState().activePanel === "help" ? null : "help")
    setShowLayers(false)
    setActiveHelpSectionId(null)
  }, [setActiveHelpSectionId, setShowLayers, setWorkspaceActivePanel])

  const toggleLayersPanel = useCallback(() => {
    if (useWorkspaceStore.getState().showPresetsBrowser) return
    const next = useWorkspaceStore.getState().activePanel === "layers" ? null : "layers"
    setWorkspaceActivePanel(next)
    setShowLayers(next === "layers")
  }, [setShowLayers, setWorkspaceActivePanel])

  const toggleAccountPanel = useCallback(() => {
    setWorkspaceActivePanel(useWorkspaceStore.getState().activePanel === "account" ? null : "account")
    setShowLayers(false)
  }, [setShowLayers, setWorkspaceActivePanel])

  useEffect(() => {
    if (noticeState?.title !== translateMessage("status.cloud.conflictTitle")) return
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

  const previewLayout = useMemo(
    () => (activeDocumentPage?.previewLayout ?? DEFAULT_PAGE_PREVIEW_LAYOUT) as PreviewLayoutState | null,
    [activeDocumentPage?.previewLayout],
  )
  const selectedLayerGraceRef = useRef<{ key: string | null; until: number }>({ key: null, until: 0 })

  useEffect(() => {
    if (!selectedLayerKey || !previewLayout) return
    const validKeys = new Set<string>([
      ...previewLayout.blockOrder,
      ...(previewLayout.imageOrder ?? []),
    ])
    if (!validKeys.has(selectedLayerKey)) {
      const grace = selectedLayerGraceRef.current
      if (grace.key === selectedLayerKey && grace.until > Date.now()) {
        return
      }
      setSelectedLayer(null)
    }
  }, [previewLayout, selectedLayerKey, setSelectedLayer])

  const setSelectedLayerKeyWithGrace = useCallback((key: string | null) => {
    if (key) {
      selectedLayerGraceRef.current = {
        key,
        until: Date.now() + PREVIEW_LAYER_SELECTION_GRACE_MS,
      }
    } else {
      selectedLayerGraceRef.current = { key: null, until: 0 }
    }
    setSelectedLayer(key)
  }, [setSelectedLayer])

  const applyLoadedPreviewLayout = useCallback((layout: PreviewLayoutState | null) => {
    replaceActivePagePreviewLayout(layout)
    clearLayerRequests()
    clearSelection()
  }, [clearLayerRequests, clearSelection, replaceActivePagePreviewLayout])

  const handleLayerOrderChange = useCallback((nextLayerOrder: string[]) => {
    requestLayerOrder(nextLayerOrder)
  }, [requestLayerOrder])

  const handleDeleteLayer = useCallback((target: string, kind: "text" | "image") => {
    requestLayerDelete(target, kind)
    if (selectedLayerKey === target) {
      setSelectedLayer(null)
    }
  }, [requestLayerDelete, selectedLayerKey, setSelectedLayer])

  const handlePreviewLayoutChange = useCallback((layout: PreviewLayoutState) => {
    replaceActivePagePreviewLayout(layout)
    clearLayerRequests()
  }, [clearLayerRequests, replaceActivePagePreviewLayout])

  const handlePreviewLayerSelect = useCallback((key: string | null) => {
    if (activeSidebarPanel !== "layers") return
    setSelectedLayerKeyWithGrace(key)
  }, [activeSidebarPanel, setSelectedLayerKeyWithGrace])

  const handleToggleLayerEditor = useCallback((target: string) => {
    requestLayerEditor(target)
    setSelectedLayerKeyWithGrace(target)
  }, [requestLayerEditor, setSelectedLayerKeyWithGrace])

  const handleLayerLockBatchChange = useCallback((targets: string[], locked: boolean) => {
    requestLayerLock(targets, locked)
  }, [requestLayerLock])

  const handleLayerLockChange = useCallback((target: string, locked: boolean) => {
    handleLayerLockBatchChange([target], locked)
  }, [handleLayerLockBatchChange])

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
  const isDirtyRef = useRef(isDirty)

  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  const applyLoadedUiSnapshot = useCallback((snapshot: UiSettingsSnapshot, options: { resetCollapsed?: boolean } = {}) => {
    const hydratedSnapshot = applySessionUiState(snapshot, sessionUiState, options)
    dispatch({ type: "APPLY_SNAPSHOT", snapshot: hydratedSnapshot })
  }, [dispatch, sessionUiState])

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
    options: { resetCollapsed?: boolean } = {},
  ) => {
    const snapshot = buildUiSnapshotFromLoadedSettings(page.uiSettings, {
      ...sessionUiState,
      ...visibilitySettings,
    })
    applyLoadedUiSnapshot(snapshot, options)
    preferCommittedPreviewLayoutRef.current = true
    applyLoadedPreviewLayout(page.previewLayout)
    setShowPresetsBrowser(false)
  }, [applyLoadedPreviewLayout, applyLoadedUiSnapshot, currentVisibilitySettings, sessionUiState, setShowPresetsBrowser])

  const project = useMemo(
    () => documentToLoadedProject(documentPresent) as LoadedProject<PreviewLayoutState>,
    [documentPresent],
  )
  const projectPages = project.pages
  const activePageId = project.activePageId

  const getLivePreviewLayout = useCallback(
    () => getCurrentPreviewLayout() ?? previewLayout,
    [getCurrentPreviewLayout, previewLayout],
  )

  const buildActivePageDraft = useCallback((): ActivePageDraft => ({
    uiSettings: currentUiSettingsPayload,
    previewLayout: getLivePreviewLayout(),
  }), [currentUiSettingsPayload, getLivePreviewLayout])

  const activePage = useMemo(
    () => (
      resolveActivePageDraft(project, currentUiSettingsPayload, previewLayout)
      ?? project.pages.find((page) => page.id === project.activePageId)
      ?? project.pages[0]
      ?? null
    ),
    [currentUiSettingsPayload, previewLayout, project],
  )

  const getCurrentProjectSnapshot = useCallback(() => (
    persistActivePageSnapshot(
      project,
      resolveActivePageDraft(project, currentUiSettingsPayload, getLivePreviewLayout()),
      currentVisibilitySettings,
    )
  ), [currentUiSettingsPayload, currentVisibilitySettings, getLivePreviewLayout, project])

  const replaceProjectSnapshot = useCallback((nextProject: LoadedProject<PreviewLayoutState>) => {
    replaceProjectSnapshotInStore(nextProject as SwissLoadedProject, {
      history: false,
      dirty: true,
      reloadPreview: true,
    })
  }, [replaceProjectSnapshotInStore])

  const applyLoadedProject = useCallback((loadedProject: LoadedProject<PreviewLayoutState>) => {
    const firstPage = loadedProject.pages[0] ?? null
    const normalizedProject = firstPage
      ? {
          ...loadedProject,
          activePageId: firstPage.id,
        }
      : loadedProject

    loadProjectIntoStore(normalizedProject as SwissLoadedProject)
    const nextActivePage = normalizedProject.pages[0] ?? null
    if (nextActivePage) {
      handleApplyProjectPage(nextActivePage, normalizedProject.visibilitySettings, { resetCollapsed: true })
    }
  }, [handleApplyProjectPage, loadProjectIntoStore])

  const selectPage = useCallback((pageId: string) => {
    if (pageId === project.activePageId) return
    const nextActivePage = project.pages.find((page) => page.id === pageId)
    if (!nextActivePage) return
    setActivePageInStore(pageId, buildActivePageDraft())
    handleApplyProjectPage(nextActivePage, currentVisibilitySettings)
  }, [buildActivePageDraft, currentVisibilitySettings, handleApplyProjectPage, project.activePageId, project.pages, setActivePageInStore])

  const addPage = useCallback(() => {
    if (project.pages.length >= MAX_PROJECT_PAGE_COUNT) {
      handleProjectPageLimitReached(MAX_PROJECT_PAGE_COUNT)
      return
    }
    addPageInStore(false, buildActivePageDraft())
  }, [addPageInStore, buildActivePageDraft, handleProjectPageLimitReached, project.pages.length])

  const addPageWithContent = useCallback(() => {
    if (project.pages.length >= MAX_PROJECT_PAGE_COUNT) {
      handleProjectPageLimitReached(MAX_PROJECT_PAGE_COUNT)
      return
    }
    addPageInStore(true, buildActivePageDraft())
  }, [addPageInStore, buildActivePageDraft, handleProjectPageLimitReached, project.pages.length])

  const setFacingPageEnabled = useCallback((pageId: string, enabled: boolean) => {
    setFacingPageEnabledInStore(pageId, enabled, buildActivePageDraft())
  }, [buildActivePageDraft, setFacingPageEnabledInStore])

  const deletePage = useCallback((pageId: string) => {
    deletePageInStore(pageId, buildActivePageDraft())
  }, [buildActivePageDraft, deletePageInStore])

  const reorderPages = useCallback((orderedIds: string[]) => {
    reorderPagesInStore(orderedIds, buildActivePageDraft())
  }, [buildActivePageDraft, reorderPagesInStore])

  const {
    isGuiSettling: isPageGuiSettling,
    requestSettledPageFocus,
    settledPage: sidebarActivePage,
    settledPageId: sidebarActivePageId,
    settledPages: sidebarProjectPages,
  } = useSettledPageNavigation({
    activePageId,
    pages: projectPages,
  })
  const projectPanelViewModel = useProjectPanelViewModel(sidebarProjectPages, projectPanelResetToken)
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
      ? (
        sidebarControlUi.customMarginMultipliers.top
        + sidebarControlUi.customMarginMultipliers.bottom
      )
      : undefined
    return getMaxBaseline(
      sidebarControlResult.pageSizePt.height,
      sidebarControlUi.marginMethod,
      customMarginUnits,
    )
  }, [
    sidebarControlResult.pageSizePt.height,
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
      const clampCustomMarginMultiplier = (multiplier: number) => Math.max(1, Math.min(9, Math.round(multiplier)))
      setPreviewPatch({
        useCustomMargins: true,
        customMarginMultipliers: {
          top: clampCustomMarginMultiplier(result.grid.margins.top / gridUnit),
          left: clampCustomMarginMultiplier(result.grid.margins.left / gridUnit),
          right: clampCustomMarginMultiplier(result.grid.margins.right / gridUnit),
          bottom: clampCustomMarginMultiplier(result.grid.margins.bottom / gridUnit),
        },
      })
      return
    }
    setPreviewPatch({
      marginMethod: parseInt(value, 10) as 1 | 2 | 3,
      useCustomMargins: false,
    })
  }, [clearPreviewKeys, gridUnit, result.grid.margins, setPreviewPatch])
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
    setProjectPanelResetToken((current) => current + 1)
    applyLoadedProject(project)
    setShowPresetsBrowser(false)
    markClean()
  }, [applyLoadedProject, beginProjectLoadTiming, markClean, setShowPresetsBrowser])
  const handleToggleFeedbackPanel = useCallback(() => {
    openSidebarPanel(activeSidebarPanel === "feedback" ? null : "feedback")
  }, [activeSidebarPanel, openSidebarPanel])
  const handleToggleLegalNoticePanel = useCallback(() => {
    openSidebarPanel(activeSidebarPanel === "legal" ? null : "legal")
  }, [activeSidebarPanel, openSidebarPanel])

  const projectMetadata = project.metadata
  const handleProjectLoadFailed = useCallback(() => {
    handleRequestNotice({
      title: translateMessage("status.notices.loadFailedTitle"),
      message: translateMessage("status.notices.loadFailedMessage"),
    })
  }, [handleRequestNotice])

  const handleProjectLoaded = useCallback((source: "file" | "preset") => {
    if (source === "file") {
      setActiveUserProjectId(null)
      setActiveOriginPresetId(null)
    }
    showNextLayoutOpenTooltip()
  }, [showNextLayoutOpenTooltip])

  const loadProjectFromInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    const finish = () => {
      event.target.value = ""
    }

    reader.onload = () => {
      try {
        const payload = parseProjectTransferPayloadBytes(reader.result as ArrayBuffer)
        handleApplyLoadedProject(parseLoadedProject<PreviewLayoutState>(payload))
        handleProjectLoaded("file")
      } catch (error) {
        console.error(error)
        handleProjectLoadFailed()
      } finally {
        finish()
      }
    }

    reader.onerror = () => {
      console.error(reader.error ?? new Error("Could not read project file."))
      handleProjectLoadFailed()
      finish()
    }

    reader.readAsArrayBuffer(file)
  }, [handleApplyLoadedProject, handleProjectLoadFailed, handleProjectLoaded])

  const handleLoadPresetProject = useCallback((preset: LayoutPreset) => {
    try {
      handleApplyLoadedProject(parseLoadedProject<PreviewLayoutState>(JSON.parse(preset.projectSourceJson)))
      handleProjectLoaded("preset")
    } catch (error) {
      console.error(error)
      handleProjectLoadFailed()
    }
  }, [handleApplyLoadedProject, handleProjectLoadFailed, handleProjectLoaded])

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

    patchProjectMetadata(nextMetadata)
  }, [patchProjectMetadata, projectMetadata])

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
        title: translateMessage("status.notices.deletedFromCloudTitle"),
        message: translateMessage("status.notices.deletedFromCloudMessage"),
      })
      return
    }

    if (deleteResult === "queued_cloud_delete") {
      handleRequestNotice({
        title: translateMessage("status.notices.deletedLocallyTitle"),
        message: translateMessage("status.notices.deletedLocallyQueuedMessage"),
      })
      return
    }

    if (deleteResult === "purged_local") {
      handleRequestNotice({
        title: translateMessage("status.notices.deletedFromUsersTitle"),
        message: translateMessage("status.notices.deletedFromUsersMessage"),
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
    dispatch({ type: "BATCH", actions: [
      { type: "SET", key: "gridCols", value: cols },
      { type: "SET", key: "gridRows", value: rows },
    ] })
  }, [dispatch])

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
        title: translateMessage("status.notices.exportFailedTitle"),
        message: translateMessage("status.notices.exportFailedPresetMessage"),
      })
    }
  }, [exportActions, handleRequestNotice])
  const hasPreviewLayout = previewLayout !== null
  const persistActiveUserProjectPromiseRef = useRef<Promise<void> | null>(null)

  const handleSaveToLibrary = useCallback(async () => {
    const fallbackStem = toProjectFilenameStem(defaultJsonFilename.replace(/\.json$/i, "")) || translateMessage("status.notices.untitledProject")
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
      exportActions.setIsSaveLibraryDialogOpen(false)
      markClean()
      handleRequestNotice({
        title: translateMessage("status.notices.savedToLibraryTitle"),
        message: user
          ? translateMessage("status.notices.savedToLibrarySignedInMessage")
          : translateMessage("status.notices.savedToLibrarySignedOutMessage"),
      })
    } catch (error) {
      console.error(error)
      handleRequestNotice({
        title: translateMessage("status.notices.librarySaveFailedTitle"),
        message: translateMessage("status.notices.librarySaveFailedMessage"),
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
          label: normalizedMetadata.title || toProjectFilenameStem(defaultJsonFilename.replace(/\.json$/i, "")) || translateMessage("status.notices.untitledProject"),
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
    queueProjectSyncByLocalId,
    user,
  ])

  const handleKeepLocalCloudConflict = useCallback(async () => {
    if (!activeUserProjectId) return
    const resolved = await resolveConflictByLocalId(activeUserProjectId, "keep_local")
    handleRequestNotice({
      title: resolved
        ? translateMessage("status.notices.conflictResolvedTitle")
        : translateMessage("status.notices.conflictResolutionFailedTitle"),
      message: resolved
        ? translateMessage("status.notices.conflictResolvedMessage")
        : translateMessage("status.notices.conflictResolutionFailedMessage"),
    })
  }, [activeUserProjectId, handleRequestNotice, resolveConflictByLocalId])

  const handleUseCloudConflict = useCallback(async () => {
    if (!activeUserProjectId) return
    const resolved = await resolveConflictByLocalId(activeUserProjectId, "use_cloud")
    if (!resolved) {
      handleRequestNotice({
        title: translateMessage("status.notices.conflictResolutionFailedTitle"),
        message: translateMessage("status.notices.conflictCloudLoadFailedMessage"),
      })
      return
    }

    const record = await getUserProjectRecord(activeUserProjectId)
    if (record) {
      handleApplyLoadedProject(parseLoadedProject<PreviewLayoutState>(record.project))
      markClean()
    }
    handleRequestNotice({
      title: translateMessage("status.notices.cloudCopyRestoredTitle"),
      message: translateMessage("status.notices.cloudCopyRestoredMessage"),
    })
  }, [activeUserProjectId, handleApplyLoadedProject, handleRequestNotice, markClean, resolveConflictByLocalId])

  const handleDeleteCloudConflict = useCallback(async () => {
    if (!activeUserProjectId) return
    const deleteResult = await deleteProjectByLocalId(activeUserProjectId)
    setActiveUserProjectId(null)
    setActiveOriginPresetId(activeUserProjectRecord?.originPresetId ?? null)

    if (deleteResult === "deleted_cloud") {
      handleRequestNotice({
        title: translateMessage("status.notices.conflictDeletedTitle"),
        message: translateMessage("status.notices.conflictDeletedCloudMessage"),
      })
      return
    }

    if (deleteResult === "queued_cloud_delete") {
      handleRequestNotice({
        title: translateMessage("status.notices.conflictDeleteQueuedTitle"),
        message: translateMessage("status.notices.conflictDeleteQueuedMessage"),
      })
      return
    }

    handleRequestNotice({
      title: translateMessage("status.notices.conflictDeletedLocallyTitle"),
      message: translateMessage("status.notices.conflictDeletedLocallyMessage"),
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
    onToggleSmartTextZoom: () => setSmartTextZoomEnabled(!useWorkspaceStore.getState().smartTextZoom),
    onToggleBaselines: (event) => handleHeaderVisibilityToggle("showBaselines", event),
    onToggleMargins: (event) => handleHeaderVisibilityToggle("showMargins", event),
    onToggleModules: (event) => handleHeaderVisibilityToggle("showModules", event),
    onToggleImagePlaceholders: (event) => handleHeaderVisibilityToggle("showImagePlaceholders", event),
    onToggleTypography: (event) => handleHeaderVisibilityToggle("showTypography", event),
    onToggleLayersPanel: toggleLayersPanel,
    onToggleAccountPanel: toggleAccountPanel,
  })

  const renderLeftPanel = () => (
    <LeftToolbar
      uiTheme={controlSidebarTheme}
      editorMode={editorSidebarMode}
      onEditorHostChange={setEditorSidebarHost}
      settingsPanels={settingsPanels}
    />
  )

  const previewWorkspace = (
    <CanvasContainer
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
      selectedLayerKey={selectedLayerKey}
      projectTitle={projectMetadata.title}
      projectDescription={projectMetadata.description}
      projectAuthor={effectiveProjectMetadata.author}
      projectCreatedAt={projectMetadata.createdAt}
      projectLoadTimeMs={projectLoadTiming.elapsedMs}
      projectPanelResetToken={projectPanelResetToken}
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
      projectPanelViewModel={projectPanelViewModel}
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
      onBeforePreviewMutation={recordPreviewHistoryBoundary}
      onUndoRequest={undoAny}
      onRedoRequest={redoAny}
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
      onToggleDarkMode={toggleDarkUi}
      onToggleHelpPanel={toggleHelpPanel}
      onToggleFeedbackPanel={handleToggleFeedbackPanel}
      onToggleLegalNoticePanel={handleToggleLegalNoticePanel}
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
      layoutOpenTooltipTotalCount={layoutOpenTooltipTotalCount}
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
          <h2 className="text-lg font-semibold">{translateMessage("app.screenTooSmall")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            {translateMessage("app.screenTooSmallMessage")}
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
            progressLog: exportActions.exportProgressLog,
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
