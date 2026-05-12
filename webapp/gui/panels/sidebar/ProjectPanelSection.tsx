"use client"

import { ChevronUp } from "lucide-react"
import type { MouseEvent, ReactNode } from "react"

import { SectionHeaderRow, SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME } from "@/shared/ui/section-header-row"

type Props = {
  actions?: ReactNode
  children: ReactNode
  collapsedSummary?: ReactNode
  expanded: boolean
  isDarkMode?: boolean
  onHeaderClick: (event: MouseEvent<HTMLElement>) => void
  onHeaderDoubleClick: (event: MouseEvent<HTMLElement>) => void
  onRolloverOpen: () => void
  title: ReactNode
}

export function ProjectPanelSection({
  actions,
  children,
  collapsedSummary,
  expanded,
  isDarkMode = false,
  onHeaderClick,
  onHeaderDoubleClick,
  onRolloverOpen,
  title,
}: Props) {
  const tone = isDarkMode
    ? {
        action: "bg-surface text-muted-foreground hover:text-foreground",
        section: "bg-surface text-foreground",
        summary: "text-muted-foreground",
      }
    : {
        action: "bg-panel text-muted-foreground hover:text-foreground",
        section: "bg-surface text-foreground",
        summary: "text-muted-foreground",
      }

  return (
    <section
      className={`-mx-4 px-4 pb-0 pt-4 md:-mx-6 md:px-6 ${expanded ? tone.section : ""}`}
      onMouseEnter={onRolloverOpen}
    >
      <div
        className="cursor-pointer select-none rounded-md py-2"
        onClick={onHeaderClick}
        onDoubleClick={onHeaderDoubleClick}
      >
        <SectionHeaderRow
          label={title}
          labelClassName={expanded ? "" : SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME}
          actions={(
            <span className="inline-flex shrink-0 items-center gap-2">
              {actions}
              <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors ${tone.action}`}>
                <ChevronUp
                  className={`h-2 w-2 transition-transform ${expanded ? "rotate-180" : "rotate-90"}`}
                  aria-hidden="true"
                />
              </span>
            </span>
          )}
        />
        {!expanded && collapsedSummary ? (
          <div className={`mt-1 truncate text-[10px] font-normal leading-snug ${tone.summary}`}>
            {collapsedSummary}
          </div>
        ) : null}
      </div>
      {expanded ? (
        <div className="pb-4 pt-1">
          {children}
        </div>
      ) : null}
      <hr className="-mx-4 h-px border-0 bg-divider md:-mx-6" />
    </section>
  )
}
