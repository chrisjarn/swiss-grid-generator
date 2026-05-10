"use client"

import { MoreVertical } from "lucide-react"
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react"

import { HeaderIconButton } from "@/shared/ui/header-icon-button"
import { HelpIndicatorLine } from "@/shared/ui/help-indicator-line"
import { useTranslation } from "@/lib/i18n"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import type { HeaderAction, HeaderItem } from "@/gui/shell/hooks/useHeaderActions"

export type TopBarProps = {
  fileGroup: HeaderItem[]
  displayGroup: HeaderItem[]
  sidebarGroup: HeaderAction[]
  headerGridClassName: string
  previewHeaderClassName: string
  dividerClassName: string
  showSectionHelpIcons: boolean
  isDarkUi: boolean
  onHeaderHelpNavigate: (actionKey: string) => void
  onToggleDarkMode: (event: MouseEvent<HTMLButtonElement>) => void
  onToggleHelpPanel: () => void
  onToggleFeedbackPanel: () => void
  onToggleLegalNoticePanel: () => void
}

function renderHeaderAction(
  action: HeaderAction,
  showSectionHelpIcons: boolean,
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
        showTooltip
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
  headerGridClassName,
  previewHeaderClassName,
  dividerClassName,
  showSectionHelpIcons,
  isDarkUi,
  onHeaderHelpNavigate,
  onToggleDarkMode,
  onToggleHelpPanel,
  onToggleFeedbackPanel,
  onToggleLegalNoticePanel,
}: TopBarProps) {
  const { t } = useTranslation()
  const [supportMenuOpen, setSupportMenuOpen] = useState(false)
  const supportMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!supportMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const menuRoot = supportMenuRef.current
      if (menuRoot?.contains(event.target as Node)) return
      setSupportMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSupportMenuOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [supportMenuOpen])

  const renderHeaderItem = (item: HeaderItem) => (
    item.type === "divider"
      ? <div key={item.key} className={`h-6 w-px ${dividerClassName}`} aria-hidden="true" />
      : renderHeaderAction(item.action, showSectionHelpIcons, onHeaderHelpNavigate, isDarkUi)
  )

  return (
    <div className={`px-4 py-3 md:px-6 ${previewHeaderClassName}`}>
      <div className={`grid grid-cols-1 gap-2 md:items-center md:gap-3 ${headerGridClassName}`}>
        <div className="flex flex-wrap items-start gap-2 md:flex-nowrap md:justify-self-start">
          {fileGroup.map(renderHeaderItem)}
        </div>

        <div className="flex flex-wrap items-start justify-start gap-2 md:flex-nowrap md:justify-self-center">
          {displayGroup.map(renderHeaderItem)}
        </div>

        <div className="flex flex-wrap items-start gap-2 md:flex-nowrap md:justify-self-end">
          {sidebarGroup.map((action) => renderHeaderAction(action, showSectionHelpIcons, onHeaderHelpNavigate, isDarkUi))}
          <div ref={supportMenuRef} className="relative inline-flex h-8 w-8 items-center justify-center">
            <HeaderIconButton
              ariaLabel={supportMenuOpen ? t("topBar.supportMenu.close") : t("topBar.supportMenu.open")}
              tooltip={t("topBar.supportMenu.more")}
              variant={supportMenuOpen ? "default" : "outline"}
              aria-pressed={supportMenuOpen}
              onClick={() => setSupportMenuOpen((current) => !current)}
              showTooltip
              isDarkMode={isDarkUi}
            >
              <MoreVertical className="h-4 w-4" />
            </HeaderIconButton>
            {supportMenuOpen ? (
              <div className="absolute right-0 top-9 z-40 min-w-36 border border-border bg-popover py-1 text-[11px] text-popover-foreground shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left transition-colors hover:bg-accent"
                  onClick={(event) => {
                    setSupportMenuOpen(false)
                    onToggleDarkMode(event)
                  }}
                >
                  {isDarkUi ? t("topBar.supportMenu.lightMode") : t("topBar.supportMenu.darkMode")}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left transition-colors hover:bg-accent"
                  onClick={() => {
                    setSupportMenuOpen(false)
                    onToggleHelpPanel()
                  }}
                >
                  {t("topBar.supportMenu.help")}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left transition-colors hover:bg-accent"
                  onClick={() => {
                    setSupportMenuOpen(false)
                    onToggleFeedbackPanel()
                  }}
                >
                  {t("topBar.supportMenu.feedback")}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left transition-colors hover:bg-accent"
                  onClick={() => {
                    setSupportMenuOpen(false)
                    onToggleLegalNoticePanel()
                  }}
                >
                  {t("topBar.supportMenu.legalNotice")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
