"use client"

import { Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react"

import { GridPreview } from "@/gui/preview/GridPreview"
import { FeedbackPanel } from "@/gui/panels/sidebar/FeedbackPanel"
import { LegalNoticePanel } from "@/gui/panels/sidebar/LegalNoticePanel"
import { AccountPanel } from "@/gui/panels/sidebar/AccountPanel"
import { PagesPanel } from "@/gui/panels/sidebar/PagesPanel"
import { ProjectPanelSection } from "@/gui/panels/sidebar/ProjectPanelSection"
import { ProjectPageLayersList } from "@/gui/panels/sidebar/ProjectPageLayersList"
import type { ProjectPanelViewModel } from "@/gui/panels/sidebar/project-panel-view-model"
import { PresetLayoutsPanel } from "@/gui/panels/sidebar/PresetLayoutsPanel"
import { ProjectTitleSection } from "@/gui/panels/sidebar/ProjectTitleSection"
import { SidebarSectionScrollFrame } from "@/gui/panels/SidebarSectionScrollFrame"
import { DocumentationHoverInfo } from "@/shared/ui/documentation-hover-info"
import { getStyleDefaultFontWeight, resolveFontVariant, type FontFamily } from "@/core/config/fonts"
import {
  type ImageColorSchemeId,
} from "@/core/config/color-schemes"
import { type ProjectPage } from "@/core/document/session"
import type { DocumentationSectionId as HelpSectionId } from "@/core/document/documentation-sections"
import type { HeaderAction, HeaderItem } from "@/gui/shell/hooks/useHeaderActions"
import type { GridResult } from "@/core/layout/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/core/types/preview-layout"
import type { LayoutPreset } from "@/lib/presets"
import type { LayoutEngineContract } from "@/core/layout/layout-engine-contract"
import { HelpIndicatorLine } from "@/shared/ui/help-indicator-line"
import { ProjectTourOverlay } from "@/gui/preview/ProjectTourOverlay"
import { LayoutOpenTooltipOverlay } from "@/gui/preview/LayoutOpenTooltipOverlay"
import {
  WORKSPACE_HEADER_GRID_WITH_SIDEBAR_CLASSNAME,
  WORKSPACE_HEADER_GRID_WITHOUT_SIDEBAR_CLASSNAME,
  isRightContentPanel,
} from "@/gui/shell/sidebar-panel-layout"
import { buildGridResultFromUiSettings, resolveUiSettingsSnapshot } from "@/core/document/ui-settings-resolver"
import {
  getProjectPagePhysicalPageSpan,
} from "@/core/document/page-numbering"
import type { LayoutOpenTooltipItem } from "@/gui/preview/lib/generated-tooltip-content"
import { RightPanel } from "@/gui/shell/RightPanel"
import { TopBar } from "@/gui/shell/TopBar"
import { useTranslation } from "@/lib/i18n/useTranslation"
import type { OnboardingVideoId } from "@/lib/onboarding/videos"
import { OnboardingVideoDialog } from "@/gui/dialogs/OnboardingVideoDialog"
import type { WorkspacePanel } from "@/core/types/workspace"
import type { NoticeRequest } from "@/gui/lib/notice-request"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>
type PreviewProjectPage = ProjectPage<PreviewLayoutState>

const MAX_GUI_PROJECT_PAGES = 1000
const PROJECT_PANEL_ROLLOVER_DELAY_MS = 30
const PROJECT_PANEL_SECTION_KEYS = ["project", "pages", "layers"] as const

type ProjectPanelSectionKey = (typeof PROJECT_PANEL_SECTION_KEYS)[number]
type ProjectPanelCollapsedState = Record<ProjectPanelSectionKey, boolean>
type ProjectPanelSingleClickSnapshot = {
  collapsed: ProjectPanelCollapsedState
  rolloverOpen: ProjectPanelSectionKey | null
} | null

type UiTheme = {
  divider: string
  bodyText: string
  previewHeader: string
  previewShell: string
  previewContent: string
  previewContentEdit: string
  sidebar: string
  sidebarBody: string
}

type Props = {
  renderLeftPanel?: () => ReactNode
  fileGroup: HeaderItem[]
  displayGroup: HeaderItem[]
  sidebarGroup: HeaderAction[]
  activeSidebarPanel: WorkspacePanel
  showPresetsBrowser: boolean
  presentationMode: boolean
  isDarkUi: boolean
  showSectionHelpIcons: boolean
  showHoverInfo: boolean
  hasPreviewLayout: boolean
  previewFocusToken: number
  smartTextZoomEnabled: boolean
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  resolvedCanvasBackground: string | null
  rotation: number
  selectedLayerKey: string | null
  projectTitle: string
  projectDescription: string
  projectAuthor: string
  projectCreatedAt?: string
  projectLoadTimeMs?: number | null
  projectPanelResetToken: number
  userId: string | null
  userEmail: string | null
  isCloudSignedIn: boolean
  cloudStatusLabel: string
  cloudStatusIndicatorClassName: string
  pendingCloudQueueCount?: number
  cloudConflictCount?: number
  hasActiveCloudConflict?: boolean
  activeCloudConflictDetails?: {
    title: string
    localUpdatedAt?: string | null
    lastSyncedAt?: string | null
    localRevision?: number | null
    remoteProjectId?: string | null
  } | null
  authError: string | null
  authMessage: string | null
  projectPanelViewModel: ProjectPanelViewModel
  projectInfoPages: readonly PreviewProjectPage[]
  activeProjectPage: PreviewProjectPage | null
  activePageId: string
  sidebarActiveProjectPage: PreviewProjectPage | null
  sidebarActivePageId: string
  sidebarControlsUseLivePage: boolean
  loadedPreviewLayout: { token: number; layout: PreviewLayoutState | null } | null
  layoutEngine: LayoutEngineContract
  requestedLayerOrderState: { token: number; order: string[] } | null
  requestedLayerDeleteState: { token: number; target: string } | null
  requestedLayerEditorState: { token: number; target: string } | null
  requestedLayerLockState: { token: number; targets: string[]; locked: boolean } | null
  appVersion: string
  uiTheme: UiTheme
  result: GridResult
  onLoadPreset: (preset: LayoutPreset) => void
  onExportPreset?: (preset: LayoutPreset) => void
  onDeleteUserPreset: (preset: LayoutPreset) => Promise<void>
  onHeaderHelpNavigate: (actionKey: string) => void
  onOpenHelpSection: (sectionId: HelpSectionId) => void
  onUndoRequest: () => void
  onRedoRequest: () => void
  onBeforePreviewMutation: (layout: PreviewLayoutState) => void
  onRequestGridRestore: (cols: number, rows: number) => void
  onRequestGridReductionWarning: (message: string) => void
  onRequestNotice: (notice: NoticeRequest) => void
  onLayoutChange: (layout: PreviewLayoutState) => void
  onSnapshotGetterChange: (getSnapshot: (() => PreviewLayoutState) | null) => void
  onProjectTitleChange: (nextTitle: string) => void
  onProjectDescriptionChange: (nextDescription: string) => void
  onProjectAuthorChange: (nextAuthor: string) => void
  onToggleDarkMode: (event: MouseEvent<HTMLButtonElement>) => void
  onCopyLayoutToClipboard: () => void | Promise<void>
  onPasteLayoutFromClipboard: () => void | Promise<void>
  onToggleHoverInfo: () => void
  onOpenDocumentation: () => void
  onToggleFeedbackPanel: () => void
  onToggleLegalNoticePanel: () => void
  onPreviewPlansCommit?: () => void
  onClearAuthFeedback: () => void
  onSyncNow?: () => Promise<void>
  onKeepLocalCloudConflict?: () => Promise<void>
  onUseCloudConflict?: () => Promise<void>
  onDeleteCloudConflict?: () => Promise<void>
  onSendSignInCode: (email: string) => Promise<void>
  onVerifySignInCode: (email: string, code: string) => Promise<void>
  onSignOut: () => Promise<void>
  onPageSelect: (pageId: string) => void
  onPageAdd: () => void
  onPageAddWithContent: () => void
  onPageFacingToggle: (pageId: string, enabled: boolean) => void
  onPageRename: (pageId: string, nextName: string) => void
  onPageDelete: (pageId: string) => void
  onPageOrderChange: (orderedIds: string[]) => void
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onLayerSelect: (key: string | null) => void
  onLayerEditorToggle: (target: string) => void
  onLayerLockToggle: (target: string, locked: boolean) => void
  onPageLayerLockToggle: (pageId: string, locked: boolean) => void
  onLayerDelete: (target: string, kind: "text" | "image") => void
  onSelectedLayerKeyChange: (key: string | null) => void
  onImageColorSchemeChange: (value: ImageColorSchemeId) => void
  onShowImagePlaceholdersChange: (value: boolean) => void
  editorSidebarHost: HTMLDivElement | null
  editorMode: "text" | "image" | null
  onEditorModeChange: (mode: "text" | "image" | null) => void
  closeSidebarPanel: () => void
  layoutOpenTooltip?: {
    displayToken: number
    index: number
    item: LayoutOpenTooltipItem
  } | null
  layoutOpenTooltipTotalCount: number
  onDismissLayoutOpenTooltip: () => void
  onNextLayoutOpenTooltip: () => void
  activeOnboardingVideoId: OnboardingVideoId | null
  onCloseOnboardingVideo: () => void
  tourState?: {
    title: string
    description?: string
    isOpen: boolean
    stepTitle?: string
    stepCaption?: string
    stepIndex: number
    stepCount: number
    waitingForLayerClick: boolean
    canGoBack: boolean
    canGoNext: boolean
    onStart: () => void
    onClose: () => void
    onBack: () => void
    onNext: () => void
  } | null
}

export function PreviewWorkspace({
  renderLeftPanel,
  fileGroup,
  displayGroup,
  sidebarGroup,
  activeSidebarPanel,
  showPresetsBrowser,
  presentationMode,
  isDarkUi,
  showSectionHelpIcons,
  showHoverInfo,
  hasPreviewLayout,
  previewFocusToken,
  smartTextZoomEnabled,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders,
  showTypography,
  baseFont,
  imageColorScheme,
  resolvedCanvasBackground,
  rotation,
  selectedLayerKey,
  projectTitle,
  projectDescription,
  projectAuthor,
  projectCreatedAt,
  projectLoadTimeMs = null,
  projectPanelResetToken,
  userId,
  userEmail,
  isCloudSignedIn,
  cloudStatusLabel,
  cloudStatusIndicatorClassName,
  pendingCloudQueueCount,
  cloudConflictCount,
  hasActiveCloudConflict,
  activeCloudConflictDetails,
  authError,
  authMessage,
  projectPanelViewModel,
  projectInfoPages,
  activeProjectPage,
  activePageId,
  sidebarActiveProjectPage,
  sidebarActivePageId,
  sidebarControlsUseLivePage,
  loadedPreviewLayout,
  layoutEngine,
  requestedLayerOrderState,
  requestedLayerDeleteState,
  requestedLayerEditorState,
  requestedLayerLockState,
  appVersion,
  uiTheme,
  result,
  onLoadPreset,
  onExportPreset,
  onDeleteUserPreset,
  onHeaderHelpNavigate,
  onOpenHelpSection,
  onUndoRequest,
  onRedoRequest,
  onBeforePreviewMutation,
  onRequestGridRestore,
  onRequestGridReductionWarning,
  onRequestNotice,
  onLayoutChange,
  onSnapshotGetterChange,
  onProjectTitleChange,
  onProjectDescriptionChange,
  onProjectAuthorChange,
  onToggleDarkMode,
  onCopyLayoutToClipboard,
  onPasteLayoutFromClipboard,
  onToggleHoverInfo,
  onOpenDocumentation,
  onToggleFeedbackPanel,
  onToggleLegalNoticePanel,
  onPreviewPlansCommit,
  onClearAuthFeedback,
  onSyncNow,
  onKeepLocalCloudConflict,
  onUseCloudConflict,
  onDeleteCloudConflict,
  onSendSignInCode,
  onVerifySignInCode,
  onSignOut,
  onPageSelect,
  onPageAdd,
  onPageAddWithContent,
  onPageFacingToggle,
  onPageRename,
  onPageDelete,
  onPageOrderChange,
  onLayerOrderChange,
  onLayerSelect,
  onLayerEditorToggle,
  onLayerLockToggle,
  onPageLayerLockToggle,
  onLayerDelete,
  onSelectedLayerKeyChange,
  onImageColorSchemeChange,
  onShowImagePlaceholdersChange,
  editorSidebarHost,
  editorMode,
  onEditorModeChange,
  closeSidebarPanel,
  layoutOpenTooltip = null,
  layoutOpenTooltipTotalCount,
  onDismissLayoutOpenTooltip,
  onNextLayoutOpenTooltip,
  activeOnboardingVideoId,
  onCloseOnboardingVideo,
  tourState = null,
}: Props) {
  const { t } = useTranslation()
  const projectPages = projectPanelViewModel.pages
  const [previewHoveredLayerKey, setPreviewHoveredLayerKey] = useState<string | null>(null)
  const [layerPanelHoveredLayerKey, setLayerPanelHoveredLayerKey] = useState<string | null>(null)
  const [projectPanelCollapsed, setProjectPanelCollapsed] = useState<ProjectPanelCollapsedState>({
    project: true,
    pages: true,
    layers: true,
  })
  const [projectPanelRolloverOpen, setProjectPanelRolloverOpen] = useState<ProjectPanelSectionKey | null>(null)
  const [pageAddHovered, setPageAddHovered] = useState(false)
  const [pageAddShiftActive, setPageAddShiftActive] = useState(false)
  const [pageNumberEditing, setPageNumberEditing] = useState(false)
  const [pageNumberDraft, setPageNumberDraft] = useState("")
  const [previewLayerCounts, setPreviewLayerCounts] = useState<{ pageId: string; text: number; images: number } | null>(null)
  const pageNumberInputRef = useRef<HTMLInputElement | null>(null)
  const projectPanelSingleClickSnapshotRef = useRef<ProjectPanelSingleClickSnapshot>(null)
  const projectPanelRolloverOpenTimerRef = useRef<number | null>(null)
  const projectPanelRolloverCloseTimerRef = useRef<number | null>(null)
  const projectPanelScrollRootRef = useRef<HTMLDivElement | null>(null)
  const previewVariableNow = useMemo(() => new Date(), [])
  const handlePreviewLayerCountsChange = useCallback((counts: { text: number; images: number }) => {
    setPreviewLayerCounts({
      pageId: activePageId,
      text: counts.text,
      images: counts.images,
    })
  }, [activePageId])
  const effectiveShowPresetsBrowser = showPresetsBrowser && !presentationMode
  const panelPreviewHoveredLayerKey = editorMode || presentationMode ? null : previewHoveredLayerKey
  const hoveredLayerKey = panelPreviewHoveredLayerKey ?? layerPanelHoveredLayerKey
  const liveLayerPanelState = {
    imageColorScheme,
    selectedLayerKey,
    hoveredLayerKey,
    previewHoveredLayerKey: panelPreviewHoveredLayerKey,
    editingLayerKey: editorMode ? selectedLayerKey : null,
    editorMode,
  }
  const settledLayerPanelStateRef = useRef(liveLayerPanelState)
  if (sidebarControlsUseLivePage) {
    settledLayerPanelStateRef.current = liveLayerPanelState
  }
  const layerPanelState = sidebarControlsUseLivePage
    ? liveLayerPanelState
    : settledLayerPanelStateRef.current
  const isProjectPanelSectionExpanded = (section: ProjectPanelSectionKey) => (
    !projectPanelCollapsed[section] || projectPanelRolloverOpen === section
  )
  const isProjectSectionExpanded = isProjectPanelSectionExpanded("project")
  const isPagesSectionExpanded = isProjectPanelSectionExpanded("pages")
  const isLayersSectionExpanded = isProjectPanelSectionExpanded("layers")
  const pagesPanelElement = useMemo(() => (
    <PagesPanel
      pageIndexById={projectPanelViewModel.pageIndexById}
      pages={projectPages}
      activePageId={sidebarActivePageId}
      onSelectPage={onPageSelect}
      onFacingPageToggle={onPageFacingToggle}
      onRenamePage={onPageRename}
      onDeletePage={onPageDelete}
      onRequestNotice={onRequestNotice}
      onPageOrderChange={onPageOrderChange}
      isDarkMode={isDarkUi}
    />
  ), [
    isDarkUi,
    onPageDelete,
    onPageFacingToggle,
    onPageOrderChange,
    onPageRename,
    onPageSelect,
    onRequestNotice,
    projectPanelViewModel.pageIndexById,
    projectPages,
    sidebarActivePageId,
  ])
  const pageAddDisabled = projectPages.length >= MAX_GUI_PROJECT_PAGES
  const isSingleProjectPage = projectPages.length <= 1
  const pageActionButtonClassName = "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
  const shouldRenderSidebarPanel = !presentationMode && activeSidebarPanel !== null && (
    !effectiveShowPresetsBrowser || isRightContentPanel(activeSidebarPanel)
  )
  const headerGridClassName = shouldRenderSidebarPanel
    ? WORKSPACE_HEADER_GRID_WITH_SIDEBAR_CLASSNAME
    : WORKSPACE_HEADER_GRID_WITHOUT_SIDEBAR_CLASSNAME

  useEffect(() => {
    if (presentationMode) {
      setLayerPanelHoveredLayerKey(null)
      return
    }
    if (activeSidebarPanel === "layers" && !effectiveShowPresetsBrowser) return
    setLayerPanelHoveredLayerKey(null)
  }, [activeSidebarPanel, effectiveShowPresetsBrowser, presentationMode])

  useEffect(() => {
    if (!effectiveShowPresetsBrowser && !presentationMode) return
    setPreviewHoveredLayerKey(null)
  }, [effectiveShowPresetsBrowser, presentationMode])

  useEffect(() => {
    if (!pageAddHovered) return
    const updatePageAddIntent = (event: KeyboardEvent) => {
      setPageAddShiftActive(event.shiftKey)
    }
    window.addEventListener("keydown", updatePageAddIntent)
    window.addEventListener("keyup", updatePageAddIntent)
    return () => {
      window.removeEventListener("keydown", updatePageAddIntent)
      window.removeEventListener("keyup", updatePageAddIntent)
    }
  }, [pageAddHovered])

  const activePageNumber = projectPanelViewModel.physicalPageNumberById.get(activePageId) ?? 1
  const documentVariablePageCount = projectPanelViewModel.physicalPageCount
  const documentPagePosition = Math.min(Math.max(activePageNumber, 1), documentVariablePageCount)
  const documentPagePositionPercent = documentVariablePageCount <= 1
    ? 100
    : (documentPagePosition - 1) / (documentVariablePageCount - 1) * 100

  useEffect(() => {
    if (!pageNumberEditing) return
    window.requestAnimationFrame(() => {
      pageNumberInputRef.current?.focus()
      pageNumberInputRef.current?.select()
    })
  }, [pageNumberEditing])

  useEffect(() => {
    if (pageNumberEditing) return
    setPageNumberDraft(String(documentPagePosition))
  }, [documentPagePosition, pageNumberEditing])

  function resolveProjectPageIdForPhysicalPage(pageNumber: number): string | null {
    let physicalStart = 1
    for (const page of projectPages) {
      const physicalEnd = physicalStart + getProjectPagePhysicalPageSpan(page) - 1
      if (pageNumber >= physicalStart && pageNumber <= physicalEnd) {
        return page.id
      }
      physicalStart = physicalEnd + 1
    }
    return projectPages[0]?.id ?? null
  }

  function beginPageNumberEdit() {
    setPageNumberDraft(String(documentPagePosition))
    setPageNumberEditing(true)
  }

  function cancelPageNumberEdit() {
    setPageNumberDraft(String(documentPagePosition))
    setPageNumberEditing(false)
  }

  function commitPageNumberEdit() {
    const parsedValue = Number.parseInt(pageNumberDraft, 10)
    if (!Number.isFinite(parsedValue)) {
      cancelPageNumberEdit()
      return
    }
    const targetPageNumber = Math.min(Math.max(parsedValue, 1), documentVariablePageCount)
    const targetPageId = resolveProjectPageIdForPhysicalPage(targetPageNumber)
    setPageNumberEditing(false)
    setPageNumberDraft(String(targetPageNumber))
    if (!targetPageId || targetPageId === activePageId) return
    onPageSelect(targetPageId)
  }

  const pagesSectionHeadlineLabel = isSingleProjectPage ? t("ui.panels.project.page") : t("ui.panels.project.pages")

  const pageCounterTextClassName = "text-muted-foreground"
  const pagePositionSummary = `${documentPagePosition} ${t("ui.common.of")} ${documentVariablePageCount}`

  const pagePositionValue = pageNumberEditing ? (
    <span className={`inline-flex min-w-0 items-center gap-1 font-normal normal-case tracking-normal ${pageCounterTextClassName}`}>
      <input
        ref={pageNumberInputRef}
        type="text"
        inputMode="numeric"
        aria-label={t("ui.panels.project.pageNumber")}
        value={pageNumberDraft}
        onChange={(event) => {
          const nextValue = event.target.value
          if (/^\d*$/.test(nextValue)) {
            setPageNumberDraft(nextValue)
          }
        }}
        onBlur={commitPageNumberEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commitPageNumberEdit()
          }
          if (event.key === "Escape") {
            event.preventDefault()
            cancelPageNumberEdit()
          }
        }}
        className="h-4 w-9 cursor-text rounded-sm border border-input bg-background px-1 text-right text-[11px] leading-none text-foreground outline-none focus:border-accent"
      />
      <span className="px-1">{t("ui.common.of")}</span>
      <span>{documentVariablePageCount}</span>
    </span>
  ) : (
    <span className={`inline-flex min-w-0 items-center gap-1 font-normal normal-case tracking-normal ${pageCounterTextClassName}`}>
      <DocumentationHoverInfo
        inline
        label={t("ui.panels.project.pageCounterTooltip", { page: documentPagePosition, total: documentVariablePageCount })}
        helpId="tooltip-project-pages"
        showRolloverInfo={showHoverInfo}
        tooltipClassName="border-border bg-popover/95 text-left text-[11px] leading-snug text-popover-foreground shadow-lg"
        horizontalAlign="end"
      >
        <button
          type="button"
          aria-label={t("ui.panels.project.editPageNumber", { page: documentPagePosition, total: documentVariablePageCount })}
          onClick={beginPageNumberEdit}
          className="inline-flex min-w-0 cursor-text items-center leading-none text-muted-foreground transition-colors hover:text-foreground"
        >
          {documentPagePosition}
        </button>
      </DocumentationHoverInfo>
      <span className="px-1">{t("ui.common.of")}</span>
      <span>{documentVariablePageCount}</span>
    </span>
  )

  const activePageTitle = useMemo(() => {
    return activeProjectPage?.name?.trim() || `${t("ui.panels.project.page")} ${activePageNumber}`
  }, [activePageNumber, activeProjectPage, t])
  const clearProjectPanelRolloverOpenTimer = () => {
    if (projectPanelRolloverOpenTimerRef.current === null) return
    window.clearTimeout(projectPanelRolloverOpenTimerRef.current)
    projectPanelRolloverOpenTimerRef.current = null
  }
  const clearProjectPanelRolloverCloseTimer = () => {
    if (projectPanelRolloverCloseTimerRef.current === null) return
    window.clearTimeout(projectPanelRolloverCloseTimerRef.current)
    projectPanelRolloverCloseTimerRef.current = null
  }
  const handleProjectPanelSectionRolloverOpen = (section: ProjectPanelSectionKey) => () => {
    if (!projectPanelCollapsed[section]) return
    clearProjectPanelRolloverCloseTimer()
    if (projectPanelRolloverOpen === section) return
    clearProjectPanelRolloverOpenTimer()
    projectPanelRolloverOpenTimerRef.current = window.setTimeout(() => {
      setProjectPanelRolloverOpen(section)
      projectPanelRolloverOpenTimerRef.current = null
    }, PROJECT_PANEL_ROLLOVER_DELAY_MS)
  }
  const handleProjectPanelSectionRolloverClose = () => {
    clearProjectPanelRolloverOpenTimer()
    clearProjectPanelRolloverCloseTimer()
    projectPanelRolloverCloseTimerRef.current = window.setTimeout(() => {
      setProjectPanelRolloverOpen(null)
      projectPanelRolloverCloseTimerRef.current = null
    }, PROJECT_PANEL_ROLLOVER_DELAY_MS)
  }
  const handleProjectPanelMouseEnter = () => {
    clearProjectPanelRolloverCloseTimer()
  }
  const handleProjectPanelMouseLeave = () => {
    if (!sidebarControlsUseLivePage) return
    handleProjectPanelSectionRolloverClose()
  }
  const toggleProjectPanelSection = (section: ProjectPanelSectionKey) => {
    setProjectPanelCollapsed((current) => {
      projectPanelSingleClickSnapshotRef.current = {
        collapsed: current,
        rolloverOpen: projectPanelRolloverOpen,
      }
      return {
        ...current,
        [section]: !current[section],
      }
    })
    setProjectPanelRolloverOpen(null)
  }
  const toggleAllProjectPanelSections = () => {
    clearProjectPanelRolloverOpenTimer()
    clearProjectPanelRolloverCloseTimer()
    const snapshot = projectPanelSingleClickSnapshotRef.current
    projectPanelSingleClickSnapshotRef.current = null
    setProjectPanelCollapsed((current) => {
      const baseCollapsed = snapshot?.collapsed ?? current
      const baseRolloverOpen = snapshot?.rolloverOpen ?? projectPanelRolloverOpen
      const allClosed = PROJECT_PANEL_SECTION_KEYS.every((section) => (
        baseCollapsed[section] && baseRolloverOpen !== section
      ))
      const nextCollapsed = !allClosed
      return {
        project: nextCollapsed,
        pages: nextCollapsed,
        layers: nextCollapsed,
      }
    })
    setProjectPanelRolloverOpen(null)
  }
  const handleProjectPanelSectionHeaderClick = (section: ProjectPanelSectionKey) => (event: MouseEvent<HTMLElement>) => {
    if (event.detail > 1) return
    toggleProjectPanelSection(section)
  }
  const handleProjectPanelSectionHeaderDoubleClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    toggleAllProjectPanelSections()
  }

  useEffect(() => (
    () => {
      if (projectPanelRolloverOpenTimerRef.current !== null) {
        window.clearTimeout(projectPanelRolloverOpenTimerRef.current)
      }
      if (projectPanelRolloverCloseTimerRef.current !== null) {
        window.clearTimeout(projectPanelRolloverCloseTimerRef.current)
      }
    }
  ), [])
  useEffect(() => {
    if (sidebarControlsUseLivePage) return
    clearProjectPanelRolloverCloseTimer()
  }, [sidebarControlsUseLivePage])
  useEffect(() => {
    clearProjectPanelRolloverOpenTimer()
    clearProjectPanelRolloverCloseTimer()
    setProjectPanelCollapsed({
      project: true,
      pages: true,
      layers: true,
    })
    setProjectPanelRolloverOpen(null)
  }, [projectPanelResetToken])
  const totalLayerCount = useMemo(() => {
    if (!isProjectSectionExpanded) return 0
    return projectInfoPages.reduce((sum, page) => (
      sum
      + (page.previewLayout?.blockOrder.length ?? 0)
      + (page.previewLayout?.imageOrder?.length ?? 0)
    ), 0)
  }, [isProjectSectionExpanded, projectInfoPages])

  const projectInfoStats = useMemo(() => {
    if (!isProjectSectionExpanded) {
      return {
        fontCount: 0,
        cutCount: 0,
        wordCount: 0,
        characterCount: 0,
      }
    }
    const usedFonts = new Set<string>()
    const usedCuts = new Set<string>()
    let wordCount = 0
    let characterCount = 0

    projectInfoPages.forEach((page) => {
      const layout = page.previewLayout
      if (!layout) return

      const uiSnapshot = resolveUiSettingsSnapshot(page.uiSettings)
      const pageResult = buildGridResultFromUiSettings(uiSnapshot)
      const styleDefinitions = pageResult.typography.styles
      const pageBaseFont = uiSnapshot.baseFont
      const blockFonts = layout.blockFontFamilies ?? {}
      const blockWeights = layout.blockFontWeights ?? {}
      const blockItalic = layout.blockItalic ?? {}
      const styleAssignments = layout.styleAssignments ?? {}

      layout.blockOrder.forEach((key) => {
        const rawText = layout.textContent[key] ?? ""
        characterCount += rawText.length
        const words = rawText.trim().match(/\S+/g)
        wordCount += words?.length ?? 0

        const styleKey = styleAssignments[key] ?? "body"
        const family = blockFonts[key] ?? pageBaseFont
        const requestedWeight = typeof blockWeights[key] === "number" && Number.isFinite(blockWeights[key])
          ? blockWeights[key]!
          : getStyleDefaultFontWeight(styleDefinitions[styleKey]?.weight)
        const requestedItalic = typeof blockItalic[key] === "boolean"
          ? blockItalic[key]!
          : styleDefinitions[styleKey]?.blockItalic === true
        const variant = resolveFontVariant(family, requestedWeight, requestedItalic)
        usedFonts.add(family)
        usedCuts.add(`${family}:${variant.id}`)
      })
    })

    return {
      fontCount: usedFonts.size,
      cutCount: usedCuts.size,
      wordCount,
      characterCount,
    }
  }, [isProjectSectionExpanded, projectInfoPages])

  const formattedProjectCreatedAt = useMemo(() => {
    if (!projectCreatedAt) return null
    const timestamp = Date.parse(projectCreatedAt)
    if (Number.isNaN(timestamp)) return null
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(timestamp))
  }, [projectCreatedAt])

  const formattedProjectLoadTime = useMemo(() => {
    if (projectLoadTimeMs === null || !Number.isFinite(projectLoadTimeMs)) return null
    if (projectLoadTimeMs < 1000) return `${Math.round(projectLoadTimeMs)} ms`
    return `${(projectLoadTimeMs / 1000).toFixed(2)} s`
  }, [projectLoadTimeMs])

  const projectInfoSentence = useMemo(() => {
    if (!isProjectSectionExpanded) return ""
    const authorSentence = projectAuthor.trim()
      ? t("ui.panels.project.authorSentence", { author: projectAuthor.trim() })
      : t("ui.panels.project.noAuthorSentence")
    const createdSentence = formattedProjectCreatedAt
      ? t("ui.panels.project.createdSentence", { date: formattedProjectCreatedAt })
      : ""
    const loadSentence = formattedProjectLoadTime
      ? t("ui.panels.project.loadSentence", { duration: formattedProjectLoadTime })
      : ""
    return t("ui.panels.project.infoSentence", {
      pages: documentVariablePageCount,
      pageWord: documentVariablePageCount === 1 ? "page" : "pages",
      layers: totalLayerCount,
      layerWord: totalLayerCount === 1 ? "layer" : "layers",
      fonts: projectInfoStats.fontCount,
      fontWord: projectInfoStats.fontCount === 1 ? "font" : "fonts",
      cuts: projectInfoStats.cutCount,
      cutWord: projectInfoStats.cutCount === 1 ? "cut" : "cuts",
      words: projectInfoStats.wordCount,
      wordWord: projectInfoStats.wordCount === 1 ? "word" : "words",
      characters: projectInfoStats.characterCount,
      characterWord: projectInfoStats.characterCount === 1 ? "character" : "characters",
      authorSentence,
      createdSentence,
      loadSentence,
    })
  }, [documentVariablePageCount, formattedProjectCreatedAt, formattedProjectLoadTime, isProjectSectionExpanded, projectAuthor, projectInfoStats.characterCount, projectInfoStats.cutCount, projectInfoStats.fontCount, projectInfoStats.wordCount, t, totalLayerCount])

  const layersPanelProjectPage = sidebarControlsUseLivePage
    ? activeProjectPage
    : sidebarActiveProjectPage
  const layersPanelPageId = sidebarControlsUseLivePage
    ? activePageId
    : sidebarActivePageId

  const activeLayerCounts = useMemo(() => {
    if (
      sidebarControlsUseLivePage
      && previewLayerCounts
      && previewLayerCounts.pageId === activePageId
    ) {
      return {
        text: previewLayerCounts.text,
        images: previewLayerCounts.images,
      }
    }
    const cachedCounts = projectPanelViewModel.layerCountsByPageId.get(layersPanelPageId)
    if (cachedCounts) {
      return {
        text: cachedCounts.text,
        images: cachedCounts.images,
      }
    }
    const layout = layersPanelProjectPage?.previewLayout
    return {
      text: layout?.blockOrder.length ?? 0,
      images: layout?.imageOrder?.length ?? 0,
    }
  }, [activePageId, layersPanelPageId, layersPanelProjectPage, previewLayerCounts, projectPanelViewModel.layerCountsByPageId, sidebarControlsUseLivePage])
  const layersSectionSummary = t("ui.panels.project.layersSummary", {
    text: activeLayerCounts.text,
    images: activeLayerCounts.images,
  })

  const documentVariableContext = useMemo(() => ({
    projectTitle,
    pageTitle: activePageTitle,
    pageNumber: activePageNumber,
    pageCount: documentVariablePageCount,
    now: previewVariableNow,
  }), [activePageNumber, activePageTitle, documentVariablePageCount, previewVariableNow, projectTitle])

  function handlePageAddClick(event: MouseEvent<HTMLButtonElement>) {
    if (pageAddDisabled) return
    if (event.shiftKey) {
      onPageAddWithContent()
      return
    }
    onPageAdd()
  }

  function renderPageAddActions() {
    const addShiftActive = pageAddShiftActive && pageAddHovered
    const pageAddButtonActiveClassName = addShiftActive
      ? "border-accent bg-accent text-background hover:brightness-95"
      : ""
    const tooltip = pageAddDisabled
      ? t("ui.panels.project.pageLimitTooltip", { count: MAX_GUI_PROJECT_PAGES })
      : t("ui.panels.project.addPageTooltip")

    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <DocumentationHoverInfo
          inline
          label={tooltip}
          helpId="tooltip-preview-create"
          showRolloverInfo={showHoverInfo}
          tooltipClassName="border-border bg-popover/95 text-left text-popover-foreground shadow-lg"
        >
          <button
            type="button"
            aria-label={addShiftActive ? t("ui.panels.project.duplicatePage") : t("ui.panels.project.addCleanPage")}
            disabled={pageAddDisabled}
            onMouseEnter={(event) => {
              setPageAddHovered(true)
              setPageAddShiftActive(event.shiftKey)
            }}
            onMouseMove={(event) => setPageAddShiftActive(event.shiftKey)}
            onMouseLeave={() => {
              setPageAddHovered(false)
              setPageAddShiftActive(false)
            }}
            onClick={handlePageAddClick}
            className={`${pageActionButtonClassName} ${pageAddButtonActiveClassName} ${
              pageAddDisabled ? "cursor-not-allowed opacity-45 hover:text-inherit" : ""
            }`}
          >
            <Plus className="h-2 w-2" />
          </button>
        </DocumentationHoverInfo>
      </div>
    )
  }

  return (
    <div className={`min-h-0 min-w-0 flex flex-1 flex-col ${uiTheme.previewShell}`}>
      {!presentationMode && !effectiveShowPresetsBrowser && documentVariablePageCount > 1 ? (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-px overflow-hidden"
          aria-label={t("ui.panels.project.pagePosition", { page: documentPagePosition, total: documentVariablePageCount })}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={documentVariablePageCount}
          aria-valuenow={documentPagePosition}
        >
          <div
            className="h-full bg-foreground"
            style={{ width: `${documentPagePositionPercent}%` }}
          />
        </div>
      ) : null}
      {!presentationMode ? (
        <TopBar
          fileGroup={fileGroup}
          displayGroup={displayGroup}
          sidebarGroup={sidebarGroup}
          activeSidebarPanel={activeSidebarPanel}
          headerGridClassName={headerGridClassName}
          previewHeaderClassName={uiTheme.previewHeader}
          dividerClassName={uiTheme.divider}
          showSectionHelpIcons={showSectionHelpIcons}
          showHoverInfo={showHoverInfo}
          isDarkUi={isDarkUi}
          canCopyLayout={hasPreviewLayout}
          onHeaderHelpNavigate={onHeaderHelpNavigate}
          onToggleDarkMode={onToggleDarkMode}
          onCopyLayoutToClipboard={onCopyLayoutToClipboard}
          onPasteLayoutFromClipboard={onPasteLayoutFromClipboard}
          onToggleHoverInfo={onToggleHoverInfo}
          onOpenDocumentation={onOpenDocumentation}
          onToggleFeedbackPanel={onToggleFeedbackPanel}
          onToggleLegalNoticePanel={onToggleLegalNoticePanel}
          onCloseSidebarPanel={closeSidebarPanel}
        />
      ) : null}

      {!presentationMode ? (
        <OnboardingVideoDialog
          videoId={activeOnboardingVideoId}
          onClose={onCloseOnboardingVideo}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
        {!presentationMode && !effectiveShowPresetsBrowser ? renderLeftPanel?.() : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
          <div
            className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto transition-colors ${
              effectiveShowPresetsBrowser ? "p-4 md:p-6" : ""
            } ${
              editorMode && !presentationMode ? uiTheme.previewContentEdit : uiTheme.previewContent
            }`}
          >
          {!presentationMode && !effectiveShowPresetsBrowser && tourState ? (
            <ProjectTourOverlay
              title={tourState.title}
              description={tourState.description}
              isOpen={tourState.isOpen}
              stepTitle={tourState.stepTitle}
              stepCaption={tourState.stepCaption}
              stepIndex={tourState.stepIndex}
              stepCount={tourState.stepCount}
              waitingForLayerClick={tourState.waitingForLayerClick}
              canGoBack={tourState.canGoBack}
              canGoNext={tourState.canGoNext}
              isDarkMode={isDarkUi}
              onStart={tourState.onStart}
              onClose={tourState.onClose}
              onBack={tourState.onBack}
              onNext={tourState.onNext}
            />
          ) : null}
          {!presentationMode && !effectiveShowPresetsBrowser && layoutOpenTooltip ? (
            <LayoutOpenTooltipOverlay
              tooltip={layoutOpenTooltip.item}
              displayToken={layoutOpenTooltip.displayToken}
              index={layoutOpenTooltip.index}
              totalCount={layoutOpenTooltipTotalCount}
              isDarkMode={isDarkUi}
              showHelpIndicator={showSectionHelpIcons}
              bottomClassName={tourState ? (tourState.isOpen ? "bottom-36" : "bottom-20") : "bottom-4"}
              onClose={onDismissLayoutOpenTooltip}
              onNext={onNextLayoutOpenTooltip}
              onHelpHover={() => onOpenHelpSection("tooltip-documentation-link")}
            />
          ) : null}
          {effectiveShowPresetsBrowser ? (
            <div
              className="relative h-full min-h-[360px] w-full bg-card"
              onMouseEnter={showSectionHelpIcons ? () => onHeaderHelpNavigate("presets") : undefined}
            >
              {showSectionHelpIcons ? <HelpIndicatorLine className="-top-[10px]" /> : null}
              <PresetLayoutsPanel
                isDarkMode={isDarkUi}
                onLoadPreset={onLoadPreset}
                onExportPreset={onExportPreset}
                onDeleteUserPreset={onDeleteUserPreset}
                isCloudSignedIn={isCloudSignedIn}
                onRequestNotice={onRequestNotice}
                showRolloverInfo={showHoverInfo}
                compact
              />
            </div>
          ) : (
            <GridPreview
              result={result}
              showBaselines={showBaselines}
              showModules={showModules}
              showMargins={showMargins}
              showImagePlaceholders={showImagePlaceholders}
              showTypography={showTypography}
              showRolloverInfo={!presentationMode && showHoverInfo}
              smartTextEditZoomEnabled={smartTextZoomEnabled}
              layoutEngine={layoutEngine}
              baseFont={baseFont}
              imageColorScheme={imageColorScheme}
              documentVariableContext={documentVariableContext}
              canvasBackground={resolvedCanvasBackground}
              onImageColorSchemeChange={onImageColorSchemeChange}
              onShowImagePlaceholdersChange={onShowImagePlaceholdersChange}
              onPreviewPlansCommit={onPreviewPlansCommit}
              initialLayout={loadedPreviewLayout?.layout ?? null}
              initialLayoutToken={loadedPreviewLayout?.token ?? 0}
              focusToken={previewFocusToken}
              rotation={rotation}
              externalHistory
              onBeforePreviewMutation={onBeforePreviewMutation}
              onUndoRequest={onUndoRequest}
              onRedoRequest={onRedoRequest}
              onOpenHelpSection={onOpenHelpSection}
              showEditorHelpIcon={!presentationMode && showSectionHelpIcons}
              showPreviewHelpIndicator={!presentationMode && showSectionHelpIcons}
              onRequestGridRestore={onRequestGridRestore}
              onRequestGridReductionWarning={onRequestGridReductionWarning}
              onRequestNotice={onRequestNotice}
              requestedLayerOrder={requestedLayerOrderState?.order ?? null}
              requestedLayerOrderToken={requestedLayerOrderState?.token ?? 0}
              requestedLayerDeleteTarget={requestedLayerDeleteState?.target ?? null}
              requestedLayerDeleteToken={requestedLayerDeleteState?.token ?? 0}
              requestedLayerEditorTarget={requestedLayerEditorState?.target ?? null}
              requestedLayerEditorToken={requestedLayerEditorState?.token ?? 0}
              requestedLayerLockTargets={requestedLayerLockState?.targets ?? null}
              requestedLayerLockValue={requestedLayerLockState?.locked ?? false}
              requestedLayerLockToken={requestedLayerLockState?.token ?? 0}
              selectedLayerKey={!presentationMode && activeSidebarPanel === "layers" ? selectedLayerKey : null}
              keyboardSelectedLayerKey={
                !presentationMode && activeSidebarPanel === "layers"
                  ? (layerPanelHoveredLayerKey ?? selectedLayerKey)
                  : presentationMode ? null : selectedLayerKey
              }
              hoveredLayerKey={presentationMode ? null : layerPanelHoveredLayerKey}
              onHoverLayerChange={presentationMode ? undefined : setPreviewHoveredLayerKey}
              onSelectLayer={presentationMode ? undefined : onLayerSelect}
              editorSidebarHost={presentationMode ? null : editorSidebarHost}
              onEditorModeChange={onEditorModeChange}
              onPreviewLayerCountsChange={handlePreviewLayerCountsChange}
              isDarkMode={isDarkUi}
              presentationMode={presentationMode}
              onLayoutChange={onLayoutChange}
              onSnapshotGetterChange={onSnapshotGetterChange}
            />
          )}
          </div>
          {shouldRenderSidebarPanel && (
            <RightPanel activeSidebarPanel={activeSidebarPanel} uiTheme={uiTheme}>
            {activeSidebarPanel === "layers" && (
              <div
                aria-disabled={!sidebarControlsUseLivePage}
                className={`flex h-full min-h-0 flex-col transition-opacity ${
                  sidebarControlsUseLivePage ? "" : "pointer-events-none opacity-50"
                }`}
                onMouseEnter={handleProjectPanelMouseEnter}
                onMouseLeave={handleProjectPanelMouseLeave}
              >
                <SidebarSectionScrollFrame
                  bottomSpacerHeight={0}
                  className="overscroll-contain [scrollbar-gutter:stable]"
                  helpScrollRoot
                  scrollRootRef={projectPanelScrollRootRef}
                >
                  <ProjectTitleSection
                    expanded={isProjectSectionExpanded}
                    onHeaderClick={handleProjectPanelSectionHeaderClick("project")}
                    onHeaderDoubleClick={handleProjectPanelSectionHeaderDoubleClick}
                    projectInfoSentence={projectInfoSentence}
                    projectTitle={projectTitle}
                    projectDescription={projectDescription}
                    projectAuthor={projectAuthor}
                    onRolloverOpen={handleProjectPanelSectionRolloverOpen("project")}
                    onProjectTitleChange={onProjectTitleChange}
                    onProjectDescriptionChange={onProjectDescriptionChange}
                    onProjectAuthorChange={onProjectAuthorChange}
                    isDarkMode={isDarkUi}
                  />
                  <ProjectPanelSection
                    title={pagesSectionHeadlineLabel}
                    collapsedSummary={pagePositionSummary}
                    expanded={isPagesSectionExpanded}
                    isDarkMode={isDarkUi}
                    onHeaderClick={handleProjectPanelSectionHeaderClick("pages")}
                    onHeaderDoubleClick={handleProjectPanelSectionHeaderDoubleClick}
                    onRolloverOpen={handleProjectPanelSectionRolloverOpen("pages")}
                  >
                    <div
                      className="mb-2 flex h-7 items-center justify-between gap-3 text-[11px] font-normal leading-none normal-case tracking-normal text-muted-foreground"
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                    >
                      <span className="min-w-0 truncate">{pagePositionValue}</span>
                      {renderPageAddActions()}
                    </div>
                    {pagesPanelElement}
                  </ProjectPanelSection>
                  <ProjectPanelSection
                    title={t("ui.panels.project.layers")}
                    collapsedSummary={layersSectionSummary}
                    expanded={isLayersSectionExpanded}
                    isDarkMode={isDarkUi}
                    onHeaderClick={handleProjectPanelSectionHeaderClick("layers")}
                    onHeaderDoubleClick={handleProjectPanelSectionHeaderDoubleClick}
                    onRolloverOpen={handleProjectPanelSectionRolloverOpen("layers")}
                  >
                    {layersPanelProjectPage ? (
                      <ProjectPageLayersList
                        pageId={layersPanelPageId}
                        layout={layersPanelProjectPage.previewLayout ?? null}
                        imageColorScheme={layerPanelState.imageColorScheme}
                        selectedLayerKey={layerPanelState.selectedLayerKey}
                        hoveredLayerKey={layerPanelState.hoveredLayerKey}
                        previewHoveredLayerKey={isLayersSectionExpanded ? layerPanelState.previewHoveredLayerKey : null}
                        editingLayerKey={layerPanelState.editingLayerKey}
                        isActivePage
                        onSelectPage={onPageSelect}
                        onLayerOrderChange={onLayerOrderChange}
                        onSelectLayer={onSelectedLayerKeyChange}
                        onHoverLayerChange={setLayerPanelHoveredLayerKey}
                        onToggleEditor={onLayerEditorToggle}
                        onToggleLock={onLayerLockToggle}
                        onToggleAllLocks={onPageLayerLockToggle}
                        onDeleteLayer={onLayerDelete}
                        isDarkMode={isDarkUi}
                      />
                    ) : null}
                  </ProjectPanelSection>
                </SidebarSectionScrollFrame>
              </div>
            )}
            {activeSidebarPanel === "legal" && (
              <LegalNoticePanel
                isDarkMode={isDarkUi}
                onClose={closeSidebarPanel}
              />
            )}
            {activeSidebarPanel === "account" && (
              <AccountPanel
                isDarkMode={isDarkUi}
                onClose={closeSidebarPanel}
                userEmail={userEmail}
                cloudStatusLabel={cloudStatusLabel}
                cloudStatusIndicatorClassName={cloudStatusIndicatorClassName}
                pendingQueueCount={pendingCloudQueueCount}
                conflictQueueCount={cloudConflictCount}
                hasActiveConflict={hasActiveCloudConflict}
                activeConflictDetails={activeCloudConflictDetails}
                authError={authError}
                authMessage={authMessage}
                onClearFeedback={onClearAuthFeedback}
                onSyncNow={onSyncNow}
                onKeepLocalConflict={onKeepLocalCloudConflict}
                onUseCloudConflict={onUseCloudConflict}
                onDeleteConflict={onDeleteCloudConflict}
                onSendSignInCode={onSendSignInCode}
                onVerifySignInCode={onVerifySignInCode}
                onSignOut={onSignOut}
              />
            )}
            {activeSidebarPanel === "feedback" && (
              <FeedbackPanel
                isDarkMode={isDarkUi}
                appVersion={appVersion}
                userId={userId}
                userEmail={userEmail}
                onClose={closeSidebarPanel}
              />
            )}
            </RightPanel>
          )}
        </div>
      </div>
    </div>
  )
}
