"use client"

import { ChevronUp } from "lucide-react"
import { useState, type MouseEvent, type ReactNode } from "react"

import { DocumentationHoverInfo, type DocumentationHoverInfoId } from "@/shared/ui/documentation-hover-info"
import { HeaderIconButton } from "@/shared/ui/header-icon-button"
import { HelpIndicatorLine } from "@/shared/ui/help-indicator-line"
import { useTranslation } from "@/lib/i18n"
import { PREVIEW_HEADER_SHORTCUTS } from "@/gui/shell/lib/preview-header-shortcuts"
import type { HeaderAction, HeaderItem } from "@/gui/shell/hooks/useHeaderActions"
import { SIDEBAR_PANEL_POPOVER_WIDTH_CLASSNAME, isRightContentPanel } from "@/gui/shell/sidebar-panel-layout"
import type { WorkspacePanel } from "@/core/types/workspace"
import {
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  SETTINGS_FINE_CHEVRON_ICON_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"

export type TopBarProps = {
  fileGroup: HeaderItem[]
  displayGroup: HeaderItem[]
  sidebarGroup: HeaderAction[]
  activeSidebarPanel: WorkspacePanel
  headerGridClassName: string
  previewHeaderClassName: string
  dividerClassName: string
  showSectionHelpIcons: boolean
  showHoverInfo: boolean
  isDarkUi: boolean
  canCopyLayout: boolean
  onHeaderHelpNavigate: (actionKey: string) => void
  onToggleDarkMode: (event: MouseEvent<HTMLButtonElement>) => void
  onCopyLayoutToClipboard: () => void | Promise<void>
  onPasteLayoutFromClipboard: () => void | Promise<void>
  onToggleHoverInfo: () => void
  onOpenDocumentation: (sectionId?: string) => void
  onToggleFeedbackPanel: () => void
  onToggleLegalNoticePanel: () => void
  onCloseSidebarPanel: () => void
}

function renderHeaderAction(
  action: HeaderAction,
  showSectionHelpIcons: boolean,
  showHoverInfo: boolean,
  onHeaderHelpNavigate: (actionKey: string) => void,
  isDarkMode: boolean,
): ReactNode {
  const shortcut = action.shortcutId
    ? PREVIEW_HEADER_SHORTCUTS.find((item) => item.id === action.shortcutId)?.combo
    : null
  const tooltip = shortcut ? `${action.tooltip}\n${shortcut}` : action.tooltip
  return (
    <div
      key={action.key}
      data-preview-header-action={action.key}
      className={`inline-flex h-8 w-8 justify-center ${showSectionHelpIcons ? "relative items-center" : "items-center"}`}
      onMouseEnter={showSectionHelpIcons ? () => onHeaderHelpNavigate(action.key) : undefined}
    >
      {showSectionHelpIcons ? <HelpIndicatorLine /> : null}
      <HeaderIconButton
        ariaLabel={action.ariaLabel}
        tooltip={tooltip}
        variant={action.variant ?? "outline"}
        aria-pressed={action.pressed}
        disabled={action.disabled}
        onClick={action.onClick}
        showStatusDot={action.showStatusDot}
        statusDotClassName={action.statusDotClassName}
        showTooltip={showHoverInfo}
        helpId={action.helpId}
        buttonClassName={action.buttonClassName}
        isDarkMode={isDarkMode}
      >
        {action.icon}
      </HeaderIconButton>
    </div>
  )
}

export function TopBar({
  fileGroup,
  displayGroup,
  sidebarGroup,
  activeSidebarPanel,
  headerGridClassName,
  previewHeaderClassName,
  dividerClassName,
  showSectionHelpIcons,
  showHoverInfo,
  isDarkUi,
  canCopyLayout,
  onHeaderHelpNavigate,
  onToggleDarkMode,
  onCopyLayoutToClipboard,
  onPasteLayoutFromClipboard,
  onToggleHoverInfo,
  onOpenDocumentation,
  onToggleFeedbackPanel,
  onToggleLegalNoticePanel,
  onCloseSidebarPanel,
}: TopBarProps) {
  const { t } = useTranslation()
  const [supportMenuOpen, setSupportMenuOpen] = useState(false)
  type SupportMenuOption = {
    key: string
    label: string
    active: boolean
    disabled: boolean
    ariaLabel: string
    helpId?: DocumentationHoverInfoId
    onMouseEnter?: () => void
    onClick: (event: MouseEvent<HTMLButtonElement>) => void
  }

  const supportMenuClassName = `absolute -right-4 top-8 z-40 py-1 md:-right-6 ${SIDEBAR_PANEL_POPOVER_WIDTH_CLASSNAME} ${
    isDarkUi ? "bg-surface" : "bg-surface"
  }`
  const supportMenuListClassName = `${getSettingsOpenListClassName(isDarkUi)} ${
    isDarkUi ? "bg-surface" : "bg-surface"
  }`
  const supportMenuOptionClassName = (active: boolean, disabled = false) => (
    `${getSettingsOpenListOptionClassName(isDarkUi, active)} justify-end text-right ${
      disabled ? "cursor-not-allowed opacity-45 hover:bg-transparent" : ""
    }`
  )
  const smartTextZoomItem = displayGroup.find((item): item is Extract<HeaderItem, { type: "action" }> => (
    item.type === "action" && item.action.key === "smart-text-zoom"
  ))
  const smartTextZoomAction = smartTextZoomItem?.action
  const visibleDisplayGroup = displayGroup.filter((item) => {
    if (item.type === "action") return item.action.key !== "smart-text-zoom"
    return item.key !== "divider-smart-text-zoom-history"
  })
  const supportHelpIds = {
    menu: "tooltip-header-support-menu",
    documentation: "tooltip-documentation-link",
    feedback: "tooltip-feedback-panel",
    legal: "tooltip-legal-panel",
  } satisfies Record<string, DocumentationHoverInfoId>
  const supportMenuOptions: SupportMenuOption[] = [
    ...(smartTextZoomAction
      ? [{
          key: smartTextZoomAction.key,
          label: smartTextZoomAction.pressed
            ? t("ui.shell.topBar.supportMenu.textEditZoomOn")
            : t("ui.shell.topBar.supportMenu.textEditZoomOff"),
          active: smartTextZoomAction.pressed === true,
          disabled: smartTextZoomAction.disabled === true,
          ariaLabel: smartTextZoomAction.ariaLabel,
          helpId: smartTextZoomAction.helpId,
          onMouseEnter: showSectionHelpIcons ? () => onHeaderHelpNavigate(smartTextZoomAction.key) : undefined,
          onClick: (event: MouseEvent<HTMLButtonElement>) => {
            if (smartTextZoomAction.disabled) return
            smartTextZoomAction.onClick(event)
          },
        }]
      : []),
    {
      key: "hover-info",
      label: showHoverInfo ? t("ui.shell.topBar.supportMenu.hideHoverInfo") : t("ui.shell.topBar.supportMenu.showHoverInfo"),
      active: showHoverInfo,
      disabled: false,
      ariaLabel: showHoverInfo ? t("ui.shell.topBar.supportMenu.hideHoverInfo") : t("ui.shell.topBar.supportMenu.showHoverInfo"),
      helpId: supportHelpIds.menu,
      onClick: () => {
        onToggleHoverInfo()
      },
    },
    {
      key: "mode",
      label: t("ui.shell.topBar.supportMenu.darkMode"),
      active: isDarkUi,
      disabled: false,
      ariaLabel: t("ui.shell.topBar.supportMenu.darkMode"),
      helpId: supportHelpIds.menu,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        onToggleDarkMode(event)
      },
    },
    ...(canCopyLayout
      ? [{
          key: "copy-layout",
          label: t("ui.shell.topBar.supportMenu.copyLayoutToClipboard"),
          active: false,
          disabled: false,
          ariaLabel: t("ui.shell.topBar.supportMenu.copyLayoutToClipboard"),
          helpId: supportHelpIds.menu,
          onClick: () => {
            void onCopyLayoutToClipboard()
          },
        }]
      : []),
    {
      key: "paste-layout",
      label: t("ui.shell.topBar.supportMenu.pasteLayoutFromClipboard"),
      active: false,
      disabled: false,
      ariaLabel: t("ui.shell.topBar.supportMenu.pasteLayoutFromClipboard"),
      helpId: supportHelpIds.menu,
      onClick: () => {
        void onPasteLayoutFromClipboard()
      },
    },
    {
      key: "documentation",
      label: t("ui.shell.topBar.supportMenu.documentation"),
      active: false,
      disabled: false,
      ariaLabel: t("ui.shell.topBar.supportMenu.documentation"),
      helpId: supportHelpIds.documentation,
      onClick: () => {
        onOpenDocumentation("tooltip-guide")
      },
    },
    {
      key: "feedback",
      label: t("ui.shell.topBar.supportMenu.feedback"),
      active: false,
      disabled: false,
      ariaLabel: t("ui.shell.topBar.supportMenu.feedback"),
      helpId: supportHelpIds.feedback,
      onClick: () => {
        onToggleFeedbackPanel()
        setSupportMenuOpen(false)
      },
    },
    {
      key: "legal-notice",
      label: t("ui.shell.topBar.supportMenu.legalNotice"),
      active: false,
      disabled: false,
      ariaLabel: t("ui.shell.topBar.supportMenu.legalNotice"),
      helpId: supportHelpIds.legal,
      onClick: () => {
        onToggleLegalNoticePanel()
        setSupportMenuOpen(false)
      },
    },
  ]

  const renderHeaderItem = (item: HeaderItem) => (
    item.type === "divider"
      ? <div key={item.key} className={`h-6 w-px ${dividerClassName}`} aria-hidden="true" />
      : renderHeaderAction(item.action, showSectionHelpIcons, showHoverInfo, onHeaderHelpNavigate, isDarkUi)
  )
  const handleSupportMenuMouseEnter = () => {
    if (isRightContentPanel(activeSidebarPanel)) {
      onCloseSidebarPanel()
    }
    setSupportMenuOpen(true)
  }

  return (
    <div className={`px-4 py-3 md:px-6 ${previewHeaderClassName}`}>
      <div className={`grid grid-cols-1 gap-2 md:items-center md:gap-3 ${headerGridClassName}`}>
        <div className="flex flex-wrap items-start gap-2 md:flex-nowrap md:justify-self-start">
          {fileGroup.map(renderHeaderItem)}
        </div>

        <div className="flex flex-wrap items-start justify-start gap-2 md:flex-nowrap md:justify-self-center">
          {visibleDisplayGroup.map(renderHeaderItem)}
        </div>

        <div className="flex flex-wrap items-start gap-2 md:flex-nowrap md:justify-self-end">
          {sidebarGroup.map((action) => renderHeaderAction(action, showSectionHelpIcons, showHoverInfo, onHeaderHelpNavigate, isDarkUi))}
          <div
            className="relative inline-flex h-8 w-8 items-center justify-center"
            onMouseEnter={handleSupportMenuMouseEnter}
            onMouseLeave={() => setSupportMenuOpen(false)}
            onFocus={() => setSupportMenuOpen(true)}
          >
            <HeaderIconButton
              ariaLabel={supportMenuOpen ? t("ui.shell.topBar.supportMenu.close") : t("ui.shell.topBar.supportMenu.open")}
              tooltip={t("ui.shell.topBar.supportMenu.more")}
              variant={supportMenuOpen ? "default" : "outline"}
              aria-pressed={supportMenuOpen}
              onClick={(event) => {
                if (event.detail === 0) {
                  setSupportMenuOpen((current) => !current)
                  return
                }
                setSupportMenuOpen(true)
              }}
              showTooltip={showHoverInfo && !supportMenuOpen}
              helpId="tooltip-header-support-menu"
              isDarkMode={isDarkUi}
            >
              <ChevronUp className={`${SETTINGS_FINE_CHEVRON_ICON_CLASSNAME} rotate-90`} />
            </HeaderIconButton>
            {supportMenuOpen ? (
              <div className={supportMenuClassName}>
                <div
                  role="listbox"
                  aria-label={t("ui.shell.topBar.supportMenu.more")}
                  className={supportMenuListClassName}
                >
                  {supportMenuOptions.map((option) => (
                    <DocumentationHoverInfo
                      key={option.key}
                      label={option.label}
                      helpId={option.helpId}
                      showRolloverInfo={showHoverInfo}
                      disabled={option.disabled}
                      className="block"
                      tooltipClassName="border-border bg-popover/95 text-left text-popover-foreground shadow-lg"
                      horizontalAlign="end"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-label={option.ariaLabel}
                        aria-selected={option.active}
                        disabled={option.disabled}
                        className={supportMenuOptionClassName(option.active, option.disabled)}
                        onMouseEnter={option.onMouseEnter}
                        onClick={option.onClick}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      </button>
                    </DocumentationHoverInfo>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
