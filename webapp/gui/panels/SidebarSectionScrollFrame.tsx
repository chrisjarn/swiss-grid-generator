"use client"

import type { MouseEventHandler, MutableRefObject, ReactNode } from "react"

type SidebarSectionScrollFrameProps = {
  bottomSpacerHeight: number
  children: ReactNode
  className?: string
  helpScrollRoot?: boolean
  onMouseEnter?: MouseEventHandler<HTMLDivElement>
  onMouseLeave?: MouseEventHandler<HTMLDivElement>
  onMouseMove?: MouseEventHandler<HTMLDivElement>
  scrollRootRef: MutableRefObject<HTMLDivElement | null>
}

export function SidebarSectionScrollFrame({
  bottomSpacerHeight,
  children,
  className = "",
  helpScrollRoot = false,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  scrollRootRef,
}: SidebarSectionScrollFrameProps) {
  return (
    <div
      ref={scrollRootRef}
      data-help-scroll-root={helpScrollRoot ? "true" : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      className={`min-h-0 flex-1 overflow-y-auto px-4 pb-0 md:px-6 ${className}`.trim()}
    >
      {children}
      <div aria-hidden="true" className="shrink-0" style={{ height: bottomSpacerHeight }} />
    </div>
  )
}
