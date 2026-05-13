import type { ReactNode } from "react"
import type { SectionKey } from "@/core/types/workspace-ui-schema"
import { useSettingsHelpNavigation } from "@/gui/panels/settings/help-navigation-context"
import { ChevronUp } from "lucide-react"
import { HelpIndicatorLine } from "@/shared/ui/help-indicator-line"
import { SETTINGS_FINE_CHEVRON_ICON_CLASSNAME } from "@/gui/panels/settings/settings-panel-styles"
import { SectionHeaderRow, SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME } from "@/shared/ui/section-header-row"
import { DocumentationHoverInfo, type DocumentationHoverInfoId } from "@/shared/ui/documentation-hover-info"

type Props = {
  title: string
  tooltip: string
  helpId?: DocumentationHoverInfoId
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
  helpId,
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
      ? "bg-surface"
      : "bg-surface"
  const sectionDividerSpacingClassName = collapsed ? "mt-3" : ""

  return (
    <section
      className={`-mx-4 px-4 pb-0 pt-4 md:-mx-6 md:px-6 ${openSectionBackgroundClassName} ${
        isDarkMode
          ? "text-foreground"
          : "text-foreground"
      }`}
    >
      <DocumentationHoverInfo
        label={tooltip}
        helpId={helpId}
        showRolloverInfo={showRolloverInfo}
        className="block"
        tooltipClassName="border-divider bg-[color-mix(in_srgb,var(--color-page-default)_95%,transparent)] text-muted-foreground shadow-lg dark:border-border dark:bg-[color-mix(in_srgb,var(--color-panel-bg)_95%,transparent)] dark:text-foreground"
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
      </DocumentationHoverInfo>
      {!collapsed && (
        <div className={`space-y-4 pb-4 pt-1 ${interactionsDisabled ? "pointer-events-none opacity-50" : ""}`}>
          {children}
        </div>
      )}
      <hr className={`-mx-4 h-px border-0 bg-divider md:-mx-6 ${sectionDividerSpacingClassName}`} />
    </section>
  )
}
