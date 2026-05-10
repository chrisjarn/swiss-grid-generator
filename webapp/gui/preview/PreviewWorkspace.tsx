"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, List, Plus, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react"

import { GridPreview } from "@/gui/preview/GridPreview"
import { FeedbackPanel } from "@/gui/panels/sidebar/FeedbackPanel"
import { HelpPanel } from "@/gui/panels/sidebar/HelpPanel"
import { LegalNoticePanel } from "@/gui/panels/sidebar/LegalNoticePanel"
import { AccountPanel } from "@/gui/panels/sidebar/AccountPanel"
import { PagesPanel, type PagePanelListItem } from "@/gui/panels/sidebar/PagesPanel"
import { PresetLayoutsPanel } from "@/gui/panels/sidebar/PresetLayoutsPanel"
import { ProjectTitleSection } from "@/gui/panels/sidebar/ProjectTitleSection"
import { HoverTooltip } from "@/shared/ui/hover-tooltip"
import { SectionHeaderRow, SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME } from "@/shared/ui/section-header-row"
import { getStyleDefaultFontWeight, resolveFontVariant, type FontFamily } from "@/lib/config/fonts"
import {
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { type ProjectPage } from "@/lib/document-session"
import type { HelpSectionId } from "@/lib/help-registry"
import type { HeaderAction, HeaderItem } from "@/gui/shell/hooks/useHeaderActions"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import type { LayoutPreset } from "@/lib/presets"
import type { LayoutEngineContract } from "@/lib/layout-engine-contract"
import { HelpIndicatorLine } from "@/shared/ui/help-indicator-line"
import { ProjectTourOverlay } from "@/gui/preview/ProjectTourOverlay"
import { LayoutOpenTooltipOverlay } from "@/gui/preview/LayoutOpenTooltipOverlay"
import {
  WORKSPACE_HEADER_GRID_WITH_SIDEBAR_CLASSNAME,
  WORKSPACE_HEADER_GRID_WITHOUT_SIDEBAR_CLASSNAME,
} from "@/gui/shell/sidebar-panel-layout"
import { buildGridResultFromUiSettings, resolveUiSettingsSnapshot } from "@/lib/ui-settings-resolver"
import {
  getProjectPagePhysicalPageNumber,
  getProjectPagePhysicalPageSpan,
  getProjectPhysicalPageCount,
} from "@/lib/document-page-numbering"
import type { LayoutOpenTooltipItem } from "@/lib/generated-tooltip-content"
import { RightPanel } from "@/gui/shell/RightPanel"
import { TopBar } from "@/gui/shell/TopBar"
import { useTranslation } from "@/lib/i18n/useTranslation"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>
type PreviewProjectPage = ProjectPage<PreviewLayoutState>
type PreviewProjectPageListItem = PagePanelListItem

const MAX_GUI_PROJECT_PAGES = 100

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
  activeSidebarPanel: "settings" | "help" | "legal" | "layers" | "feedback" | "account" | null
  activeHelpSectionId: HelpSectionId | null
  showPresetsBrowser: boolean
  isDarkUi: boolean
  showSectionHelpIcons: boolean
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
  projectPages: readonly PreviewProjectPageListItem[]
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
  gridReductionWarningToast: { id: number; message: string } | null
  onDismissGridReductionWarningToast: () => void
  onRequestGridReductionWarning: (message: string) => void
  onRequestNotice: (notice: { title: string; message: string }) => void
  onLayoutChange: (layout: PreviewLayoutState) => void
  onSnapshotGetterChange: (getSnapshot: (() => PreviewLayoutState) | null) => void
  onProjectTitleChange: (nextTitle: string) => void
  onProjectDescriptionChange: (nextDescription: string) => void
  onProjectAuthorChange: (nextAuthor: string) => void
  onToggleDarkMode: (event: MouseEvent<HTMLButtonElement>) => void
  onToggleHelpPanel: () => void
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
  activeHelpSectionId,
  showPresetsBrowser,
  isDarkUi,
  showSectionHelpIcons,
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
  projectPages,
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
  gridReductionWarningToast,
  onDismissGridReductionWarningToast,
  onRequestGridReductionWarning,
  onRequestNotice,
  onLayoutChange,
  onSnapshotGetterChange,
  onProjectTitleChange,
  onProjectDescriptionChange,
  onProjectAuthorChange,
  onToggleDarkMode,
  onToggleHelpPanel,
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
  tourState = null,
}: Props) {
  const { t } = useTranslation()
  const [previewHoveredLayerKey, setPreviewHoveredLayerKey] = useState<string | null>(null)
  const [layerPanelHoveredLayerKey, setLayerPanelHoveredLayerKey] = useState<string | null>(null)
  const [previewEditorOpenToken, setPreviewEditorOpenToken] = useState(0)
  const [previewParagraphCreateToken, setPreviewParagraphCreateToken] = useState(0)
  const [showProjectInfo, setShowProjectInfo] = useState(false)
  const [pageListRequestToken, setPageListRequestToken] = useState(0)
  const [pageAddHovered, setPageAddHovered] = useState(false)
  const [pageAddShiftActive, setPageAddShiftActive] = useState(false)
  const [pageNumberEditing, setPageNumberEditing] = useState(false)
  const [pageNumberDraft, setPageNumberDraft] = useState("")
  const pageNumberInputRef = useRef<HTMLInputElement | null>(null)
  const previousEditorModeRef = useRef<"text" | "image" | null>(editorMode)
  const previewVariableNow = useMemo(() => new Date(), [])
  const panelPreviewHoveredLayerKey = editorMode ? null : previewHoveredLayerKey
  const hoveredLayerKey = panelPreviewHoveredLayerKey ?? layerPanelHoveredLayerKey
  const liveLayerPanelState = {
    baseFont,
    imageColorScheme,
    selectedLayerKey,
    hoveredLayerKey,
    previewHoveredLayerKey: panelPreviewHoveredLayerKey,
    editingLayerKey: editorMode ? selectedLayerKey : null,
    editorMode,
    previewEditorOpenToken,
    previewParagraphCreateToken,
  }
  const settledLayerPanelStateRef = useRef(liveLayerPanelState)
  if (sidebarControlsUseLivePage) {
    settledLayerPanelStateRef.current = liveLayerPanelState
  }
  const layerPanelState = sidebarControlsUseLivePage
    ? liveLayerPanelState
    : settledLayerPanelStateRef.current
  const pagesPanelElement = useMemo(() => (
    <PagesPanel
      pages={projectPages}
      activePage={sidebarActiveProjectPage}
      activePageId={sidebarActivePageId}
      pageListRequestToken={pageListRequestToken}
      onSelectPage={onPageSelect}
      onFacingPageToggle={onPageFacingToggle}
      onRenamePage={onPageRename}
      onDeletePage={onPageDelete}
      onRequestNotice={onRequestNotice}
      onPageOrderChange={onPageOrderChange}
      baseFont={layerPanelState.baseFont}
      imageColorScheme={layerPanelState.imageColorScheme}
      selectedLayerKey={layerPanelState.selectedLayerKey}
      hoveredLayerKey={layerPanelState.hoveredLayerKey}
      previewHoveredLayerKey={layerPanelState.previewHoveredLayerKey}
      editingLayerKey={layerPanelState.editingLayerKey}
      editorMode={layerPanelState.editorMode}
      previewEditorOpenToken={layerPanelState.previewEditorOpenToken}
      previewParagraphCreateToken={layerPanelState.previewParagraphCreateToken}
      onLayerOrderChange={onLayerOrderChange}
      onSelectedLayerKeyChange={onSelectedLayerKeyChange}
      onHoverLayerChange={setLayerPanelHoveredLayerKey}
      onLayerEditorToggle={onLayerEditorToggle}
      onLayerLockToggle={onLayerLockToggle}
      onPageLayerLockToggle={onPageLayerLockToggle}
      onLayerDelete={onLayerDelete}
      isDarkMode={isDarkUi}
    />
  ), [
    isDarkUi,
    layerPanelState,
    onLayerDelete,
    onLayerEditorToggle,
    onLayerLockToggle,
    onLayerOrderChange,
    onPageDelete,
    onPageFacingToggle,
    onPageLayerLockToggle,
    onPageOrderChange,
    onPageRename,
    onPageSelect,
    onRequestNotice,
    onSelectedLayerKeyChange,
    pageListRequestToken,
    projectPages,
    sidebarActivePageId,
    sidebarActiveProjectPage,
  ])
  const pageAddDisabled = projectPages.length >= MAX_GUI_PROJECT_PAGES
  const isSingleProjectPage = projectPages.length <= 1
  const pageActionButtonClassName = "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
  const shouldRenderSidebarPanel = activeSidebarPanel !== null && (
    !showPresetsBrowser
    || activeSidebarPanel === "help"
    || activeSidebarPanel === "feedback"
    || activeSidebarPanel === "legal"
    || activeSidebarPanel === "account"
  )
  const headerGridClassName = shouldRenderSidebarPanel
    ? WORKSPACE_HEADER_GRID_WITH_SIDEBAR_CLASSNAME
    : WORKSPACE_HEADER_GRID_WITHOUT_SIDEBAR_CLASSNAME

  useEffect(() => {
    if (activeSidebarPanel === "layers" && !showPresetsBrowser) return
    setLayerPanelHoveredLayerKey(null)
  }, [activeSidebarPanel, showPresetsBrowser])

  useEffect(() => {
    if (!showPresetsBrowser) return
    setPreviewHoveredLayerKey(null)
  }, [showPresetsBrowser])

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

  const activePageNumber = useMemo(() => {
    return getProjectPagePhysicalPageNumber(projectPages, activePageId)
  }, [activePageId, projectPages])
  const documentVariablePageCount = useMemo(
    () => getProjectPhysicalPageCount(projectPages),
    [projectPages],
  )
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

  function selectPhysicalPage(pageNumber: number) {
    const targetPageNumber = Math.min(Math.max(pageNumber, 1), documentVariablePageCount)
    const targetPageId = resolveProjectPageIdForPhysicalPage(targetPageNumber)
    setPageNumberEditing(false)
    setPageNumberDraft(String(targetPageNumber))
    if (!targetPageId || targetPageId === activePageId) return
    onPageSelect(targetPageId)
  }

  function requestPageListView() {
    setPageListRequestToken((current) => current + 1)
  }

  const pagesSectionHeadlineLabel = isSingleProjectPage ? t("projectPanel.page") : (
      <HoverTooltip
        inline
        label={t("projectPanel.pageListTooltip")}
        tooltipClassName="w-64 whitespace-pre-line border-border bg-popover/95 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-popover-foreground shadow-lg"
        horizontalAlign="start"
      >
        <span className="inline-flex cursor-pointer select-none items-center gap-1.5 leading-none">
          <List className="h-3 w-3" strokeWidth={1.9} />
          <span>{t("projectPanel.pages")}</span>
        </span>
      </HoverTooltip>
    )

  const pageNavigationButtonClassName = (disabled: boolean) => `inline-flex h-4 w-3 shrink-0 items-center justify-center rounded-sm transition-colors ${
    disabled
      ? "cursor-not-allowed text-muted-foreground/45"
      : "text-muted-foreground hover:text-foreground"
  }`

  const renderPageNavigationButton = (
    label: string,
    targetPageNumber: number,
    disabled: boolean,
    icon: ReactNode,
  ) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => selectPhysicalPage(targetPageNumber)}
      className={pageNavigationButtonClassName(disabled)}
    >
      {icon}
    </button>
  )

  const pageNavigationControlsBefore = (
    <span className="mr-1 inline-flex items-center -space-x-1">
      {renderPageNavigationButton(
        t("projectPanel.firstPage"),
        1,
        documentPagePosition <= 1,
        <ChevronsLeft className="h-3 w-3" strokeWidth={1.9} />,
      )}
      {renderPageNavigationButton(
        t("projectPanel.previousPage"),
        documentPagePosition - 1,
        documentPagePosition <= 1,
        <ChevronLeft className="h-3 w-3" strokeWidth={1.9} />,
      )}
    </span>
  )

  const pageNavigationControlsAfter = (
    <span className="ml-1 inline-flex items-center -space-x-1">
      {renderPageNavigationButton(
        t("projectPanel.nextPage"),
        documentPagePosition + 1,
        documentPagePosition >= documentVariablePageCount,
        <ChevronRight className="h-3 w-3" strokeWidth={1.9} />,
      )}
      {renderPageNavigationButton(
        t("projectPanel.lastPage"),
        documentVariablePageCount,
        documentPagePosition >= documentVariablePageCount,
        <ChevronsRight className="h-3 w-3" strokeWidth={1.9} />,
      )}
    </span>
  )
  const pageCounterTextClassName = "text-muted-foreground"

  const pagePositionValue = pageNumberEditing ? (
    <span className={`inline-flex min-w-0 items-center gap-1 font-normal normal-case tracking-normal ${pageCounterTextClassName}`}>
      {pageNavigationControlsBefore}
      <input
        ref={pageNumberInputRef}
        type="text"
        inputMode="numeric"
        aria-label={t("projectPanel.pageNumber")}
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
        className="h-4 w-9 cursor-text rounded-sm border border-input bg-background px-1 text-right text-[11px] leading-none text-foreground outline-none focus:border-swiss-orange"
      />
      <span className="px-1">{t("common.of")}</span>
      <span>{documentVariablePageCount}</span>
      {pageNavigationControlsAfter}
    </span>
  ) : (
    <span className={`inline-flex min-w-0 items-center gap-1 font-normal normal-case tracking-normal ${pageCounterTextClassName}`}>
      {pageNavigationControlsBefore}
      <HoverTooltip
        inline
        label={t("projectPanel.pageCounterTooltip", { page: documentPagePosition, total: documentVariablePageCount })}
        tooltipClassName="w-56 whitespace-pre-line border-border bg-popover/95 text-left text-[11px] leading-snug text-popover-foreground shadow-lg"
        horizontalAlign="end"
      >
        <button
          type="button"
          aria-label={t("projectPanel.editPageNumber", { page: documentPagePosition, total: documentVariablePageCount })}
          onDoubleClick={beginPageNumberEdit}
          className="inline-flex min-w-0 cursor-text items-center leading-none text-muted-foreground transition-colors hover:text-foreground"
        >
          {documentPagePosition}
        </button>
      </HoverTooltip>
      <span className="px-1">{t("common.of")}</span>
      <span>{documentVariablePageCount}</span>
      {pageNavigationControlsAfter}
    </span>
  )

  useEffect(() => {
    const previousEditorMode = previousEditorModeRef.current
    previousEditorModeRef.current = editorMode
    if (editorMode === null || previousEditorMode !== null) return
    setPreviewEditorOpenToken((current) => current + 1)
  }, [editorMode])

  const activePageTitle = useMemo(() => {
    return activeProjectPage?.name?.trim() || `${t("projectPanel.page")} ${activePageNumber}`
  }, [activePageNumber, activeProjectPage, t])

  const totalLayerCount = useMemo(() => {
    if (!showProjectInfo) return 0
    return projectInfoPages.reduce((sum, page) => (
      sum
      + (page.previewLayout?.blockOrder.length ?? 0)
      + (page.previewLayout?.imageOrder?.length ?? 0)
    ), 0)
  }, [projectInfoPages, showProjectInfo])

  const projectInfoStats = useMemo(() => {
    if (!showProjectInfo) {
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
  }, [projectInfoPages, showProjectInfo])

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
    if (!showProjectInfo) return ""
    const authorSentence = projectAuthor.trim()
      ? t("projectPanel.authorSentence", { author: projectAuthor.trim() })
      : t("projectPanel.noAuthorSentence")
    const createdSentence = formattedProjectCreatedAt
      ? t("projectPanel.createdSentence", { date: formattedProjectCreatedAt })
      : ""
    const loadSentence = formattedProjectLoadTime
      ? t("projectPanel.loadSentence", { duration: formattedProjectLoadTime })
      : ""
    return t("projectPanel.infoSentence", {
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
  }, [documentVariablePageCount, formattedProjectCreatedAt, formattedProjectLoadTime, projectAuthor, projectInfoStats.characterCount, projectInfoStats.cutCount, projectInfoStats.fontCount, projectInfoStats.wordCount, showProjectInfo, t, totalLayerCount])

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
      ? "border-swiss-orange bg-swiss-orange text-background hover:brightness-95"
      : ""
    const tooltip = pageAddDisabled
      ? t("projectPanel.pageLimitTooltip", { count: MAX_GUI_PROJECT_PAGES })
      : t("projectPanel.addPageTooltip")

    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <HoverTooltip
          inline
          label={tooltip}
        tooltipClassName="w-max whitespace-pre-line border-border bg-popover/95 text-center text-popover-foreground shadow-lg"
        >
          <button
            type="button"
            aria-label={addShiftActive ? t("projectPanel.duplicatePage") : t("projectPanel.addCleanPage")}
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
        </HoverTooltip>
      </div>
    )
  }

  return (
    <div className={`min-h-0 min-w-0 flex flex-1 flex-col ${uiTheme.previewShell}`}>
      {!showPresetsBrowser && documentVariablePageCount > 1 ? (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-px overflow-hidden"
          aria-label={`Page position ${documentPagePosition} of ${documentVariablePageCount}`}
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
      <TopBar
        fileGroup={fileGroup}
        displayGroup={displayGroup}
        sidebarGroup={sidebarGroup}
        headerGridClassName={headerGridClassName}
        previewHeaderClassName={uiTheme.previewHeader}
        dividerClassName={uiTheme.divider}
        showSectionHelpIcons={showSectionHelpIcons}
        isDarkUi={isDarkUi}
        onHeaderHelpNavigate={onHeaderHelpNavigate}
        onToggleDarkMode={onToggleDarkMode}
        onToggleHelpPanel={onToggleHelpPanel}
        onToggleFeedbackPanel={onToggleFeedbackPanel}
        onToggleLegalNoticePanel={onToggleLegalNoticePanel}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
        {!showPresetsBrowser ? renderLeftPanel?.() : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
          <div
            className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto transition-colors ${
              showPresetsBrowser ? "p-4 md:p-6" : ""
            } ${
              editorMode ? uiTheme.previewContentEdit : uiTheme.previewContent
            }`}
          >
          {!showPresetsBrowser && tourState ? (
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
          {!showPresetsBrowser && layoutOpenTooltip ? (
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
              onHelpHover={() => onOpenHelpSection("help-layout-tooltips")}
            />
          ) : null}
          {showPresetsBrowser ? (
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
                showRolloverInfo
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
              showRolloverInfo={false}
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
              rotation={rotation}
              externalHistory
              onBeforePreviewMutation={onBeforePreviewMutation}
              onUndoRequest={onUndoRequest}
              onRedoRequest={onRedoRequest}
              onOpenHelpSection={onOpenHelpSection}
              showEditorHelpIcon={showSectionHelpIcons}
              showPreviewHelpIndicator={showSectionHelpIcons}
              onRequestGridRestore={onRequestGridRestore}
              gridReductionWarningToast={gridReductionWarningToast}
              onDismissGridReductionWarningToast={onDismissGridReductionWarningToast}
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
              selectedLayerKey={activeSidebarPanel === "layers" ? selectedLayerKey : null}
              keyboardSelectedLayerKey={
                activeSidebarPanel === "layers"
                  ? (layerPanelHoveredLayerKey ?? selectedLayerKey)
                  : selectedLayerKey
              }
              hoveredLayerKey={layerPanelHoveredLayerKey}
              onHoverLayerChange={setPreviewHoveredLayerKey}
              onSelectLayer={onLayerSelect}
              editorSidebarHost={editorSidebarHost}
              onEditorModeChange={onEditorModeChange}
              onPreviewParagraphCreate={() => setPreviewParagraphCreateToken((current) => current + 1)}
              isDarkMode={isDarkUi}
              onLayoutChange={onLayoutChange}
              onSnapshotGetterChange={onSnapshotGetterChange}
            />
          )}
          </div>
          {shouldRenderSidebarPanel && (
            <RightPanel activeSidebarPanel={activeSidebarPanel} uiTheme={uiTheme}>
            {activeSidebarPanel === "help" && (
              <HelpPanel
                isDarkMode={isDarkUi}
                onClose={closeSidebarPanel}
                activeSectionId={activeHelpSectionId}
                appVersion={appVersion}
              />
            )}
            {activeSidebarPanel === "layers" && (
              <div
                aria-disabled={!sidebarControlsUseLivePage}
                className={`grid h-full min-h-0 grid-rows-[max-content_minmax(0,1fr)] transition-opacity ${
                  sidebarControlsUseLivePage ? "" : "pointer-events-none opacity-50"
                }`}
              >
                <div className="shrink-0 px-4 pt-4 md:px-6">
                  <div className="rounded-md py-2">
                    <SectionHeaderRow
                      label={t("projectPanel.title")}
                      labelClassName={SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME}
                      actions={(
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={showProjectInfo ? t("projectPanel.hideInfo") : t("projectPanel.showInfo")}
                            aria-pressed={showProjectInfo}
                            onClick={() => setShowProjectInfo((current) => !current)}
                            className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${
                              showProjectInfo
                                ? "border-swiss-orange bg-swiss-orange text-primary-foreground"
                                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Info className="h-2 w-2" />
                          </button>
                          <button
                            type="button"
                            aria-label={t("projectPanel.close")}
                            onClick={closeSidebarPanel}
                            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </div>
                      )}
                    />
                  </div>
                  {showProjectInfo ? (
                    <div className="pb-4 pt-1">
                      <p className={`text-xs leading-[1.45] ${uiTheme.sidebarBody}`}>
                        {projectInfoSentence}
                      </p>
                    </div>
                  ) : null}
                  <ProjectTitleSection
                    projectTitle={projectTitle}
                    projectDescription={projectDescription}
                    projectAuthor={projectAuthor}
                    onProjectTitleChange={onProjectTitleChange}
                    onProjectDescriptionChange={onProjectDescriptionChange}
                    onProjectAuthorChange={onProjectAuthorChange}
                    isDarkMode={isDarkUi}
                  />
                  <div className="mt-4 rounded-md py-2">
                    <SectionHeaderRow
                      label={pagesSectionHeadlineLabel}
                      labelClassName={SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME}
                      className={`${isSingleProjectPage ? "" : "cursor-pointer"} select-none`}
                      actions={isSingleProjectPage ? renderPageAddActions() : undefined}
                      onRowClick={isSingleProjectPage ? undefined : requestPageListView}
                    />
                  </div>
                  {!isSingleProjectPage ? (
                    <div className={`mb-2 mt-1 flex min-h-[18px] w-full items-center justify-between gap-2 rounded-md pb-1 text-[12px] font-normal leading-none normal-case tracking-normal ${uiTheme.sidebarBody}`}>
                      <span className="min-w-0">{t("projectPanel.page")}</span>
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate text-[11px] font-normal leading-none">
                          {pagePositionValue}
                        </span>
                        {renderPageAddActions()}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div
                  data-help-scroll-root="true"
                  className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                >
                  {pagesPanelElement}
                </div>
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
