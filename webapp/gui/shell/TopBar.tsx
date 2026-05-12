"use client"

import { ChevronUp } from "lucide-react"
import { useState, type MouseEvent, type ReactNode } from "react"

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
  onOpenDocumentation: () => void
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

  const supportMenuClassName = `absolute -right-4 top-8 z-40 py-1 md:-right-6 ${SIDEBAR_PANEL_POPOVER_WIDTH_CLASSNAME} ${
    isDarkUi ? "bg-[#232A35]" : "bg-gray-200"
  }`
  const supportMenuListClassName = `${getSettingsOpenListClassName(isDarkUi)} ${
    isDarkUi ? "bg-[#232A35]" : "bg-gray-200"
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
  const supportMenuOptions = [
    ...(smartTextZoomAction
      ? [{
          key: smartTextZoomAction.key,
          label: smartTextZoomAction.pressed
            ? t("ui.shell.topBar.supportMenu.textEditZoomOn")
            : t("ui.shell.topBar.supportMenu.textEditZoomOff"),
          active: smartTextZoomAction.pressed === true,
          disabled: smartTextZoomAction.disabled === true,
          ariaLabel: smartTextZoomAction.ariaLabel,
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
      onClick: () => {
        onOpenDocumentation()
      },
    },
    {
      key: "feedback",
      label: t("ui.shell.topBar.supportMenu.feedback"),
      active: false,
      disabled: false,
      ariaLabel: t("ui.shell.topBar.supportMenu.feedback"),
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
                    <button
                      key={option.key}
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
