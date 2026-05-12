"use client"

import type { ReactNode } from "react"
import { ChevronUp } from "lucide-react"

import { HoverTooltip } from "@/shared/ui/hover-tooltip"
import { HelpIndicatorLine } from "@/shared/ui/help-indicator-line"
import { SectionHeaderRow, SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME } from "@/shared/ui/section-header-row"

type Props = {
  title: ReactNode
  tooltip: string
  collapsed: boolean
  collapsedSummary?: ReactNode
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick?: (event: React.MouseEvent) => void
  isDarkMode: boolean
  showHelpIndicator?: boolean
  showRolloverInfo?: boolean
  onHelpNavigate?: () => void
  children: ReactNode
}

export function EditorSidebarSection({
  title,
  tooltip,
  collapsed,
  collapsedSummary,
  onHeaderClick,
  onHeaderDoubleClick,
  isDarkMode,
  showHelpIndicator = false,
  showRolloverInfo = true,
  onHelpNavigate,
  children,
}: Props) {
  return (
    <section
      className={`mb-3 pb-3 pt-4 last:mb-0 last:pb-0 ${
        isDarkMode
          ? "text-foreground"
          : "text-foreground"
      }`}
    >
      <HoverTooltip
        label={tooltip}
        disabled={!showRolloverInfo}
        className="block"
        tooltipClassName="border-divider bg-[color-mix(in_srgb,var(--color-page-default)_95%,transparent)] text-muted-foreground shadow-lg dark:border-border dark:bg-[color-mix(in_srgb,var(--color-panel-bg)_95%,transparent)] dark:text-foreground"
      >
        <header
          className="cursor-pointer select-none"
          onClick={onHeaderClick}
          onDoubleClick={onHeaderDoubleClick}
          onMouseEnter={showHelpIndicator ? onHelpNavigate : undefined}
        >
          <div className={`rounded-md py-2 ${showHelpIndicator ? "relative" : ""}`}>
            {showHelpIndicator ? <HelpIndicatorLine /> : null}
            <h3 className="leading-tight">
              <SectionHeaderRow
                label={title}
                labelClassName={collapsed ? SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME : ""}
                actionIcon={(
                  <ChevronUp
                    className={`h-2 w-2 transition-transform ${collapsed ? "rotate-90" : "rotate-180"}`}
                    aria-hidden="true"
                  />
                )}
                actionClassName={isDarkMode
                  ? "border-border bg-surface text-muted-foreground"
                  : "border-border bg-panel text-muted-foreground"}
              />
              {collapsed && collapsedSummary ? (
                <div className={`mt-1 text-[10px] font-normal leading-snug ${isDarkMode ? "text-muted-foreground" : "text-muted-foreground"}`}>
                  {collapsedSummary}
                </div>
              ) : null}
            </h3>
          </div>
        </header>
      </HoverTooltip>
      {!collapsed ? <div className="space-y-4 pb-4 pt-1">{children}</div> : null}
    </section>
  )
}
