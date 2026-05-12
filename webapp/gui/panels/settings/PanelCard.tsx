import { HoverTooltip } from "@/shared/ui/hover-tooltip"
import type { ReactNode } from "react"
import type { SectionKey } from "@/core/types/workspace-ui-schema"
import { useSettingsHelpNavigation } from "@/gui/panels/settings/help-navigation-context"
import { ChevronUp } from "lucide-react"
import { HelpIndicatorLine } from "@/shared/ui/help-indicator-line"
import { SETTINGS_FINE_CHEVRON_ICON_CLASSNAME } from "@/gui/panels/settings/settings-panel-styles"
import { SectionHeaderRow, SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME } from "@/shared/ui/section-header-row"

type Props = {
  title: string
  tooltip: string
  collapsed: boolean
  collapsedSummary?: ReactNode
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  helpSectionKey: SectionKey
  isDarkMode: boolean
  children: ReactNode
}

export function PanelCard({
  title,
  tooltip,
  collapsed,
  collapsedSummary,
  onHeaderClick,
  onHeaderDoubleClick,
  helpSectionKey,
  isDarkMode,
  children,
}: Props) {
  const { showHelpIcons, showRolloverInfo, interactionsDisabled, onNavigate } = useSettingsHelpNavigation()
  const openSectionBackgroundClassName = collapsed
    ? ""
    : isDarkMode
      ? "bg-[#232A35]"
      : "bg-gray-200"
  const sectionDividerSpacingClassName = collapsed ? "mt-3" : ""

  return (
    <section
      className={`-mx-4 px-4 pb-0 pt-4 md:-mx-6 md:px-6 ${openSectionBackgroundClassName} ${
        isDarkMode
          ? "text-gray-100"
          : "text-gray-900"
      }`}
    >
      <HoverTooltip
        label={tooltip}
        disabled={!showRolloverInfo}
        className="block"
        tooltipClassName="border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
      >
        <header
          className={`select-none ${interactionsDisabled ? "cursor-default" : "cursor-pointer"}`}
          onClick={interactionsDisabled ? undefined : onHeaderClick}
          onDoubleClick={interactionsDisabled ? undefined : onHeaderDoubleClick}
          onMouseEnter={showHelpIcons ? () => onNavigate(helpSectionKey) : undefined}
        >
          <div
            className={`rounded-md py-2 ${
              showHelpIcons ? "relative" : ""
            }`}
          >
            {showHelpIcons ? <HelpIndicatorLine /> : null}
            <h3 className={`leading-tight ${interactionsDisabled ? "opacity-50" : ""}`}>
              <SectionHeaderRow
                label={title}
                labelClassName={collapsed || interactionsDisabled ? SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME : ""}
                actionIcon={(
                  <ChevronUp
                    className={`${SETTINGS_FINE_CHEVRON_ICON_CLASSNAME} transition-transform ${collapsed ? "rotate-90" : "rotate-180"}`}
                    aria-hidden="true"
                  />
                )}
                actionClassName={isDarkMode
                  ? "border-gray-600 bg-gray-800 text-gray-300"
                  : "border-gray-300 bg-gray-100 text-gray-700"}
              />
              {collapsed && collapsedSummary ? (
                <div className={`mt-1 text-[10px] font-normal leading-snug ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {collapsedSummary}
                </div>
              ) : null}
            </h3>
          </div>
        </header>
      </HoverTooltip>
      {!collapsed && (
        <div className={`space-y-4 pb-4 pt-1 ${interactionsDisabled ? "pointer-events-none opacity-50" : ""}`}>
          {children}
        </div>
      )}
      <hr className={`-mx-4 h-px border-0 bg-[#f3f4f6] md:-mx-6 dark:bg-[#1D232D] ${sectionDividerSpacingClassName}`} />
    </section>
  )
}
