"use client"

import type { MutableRefObject, ReactNode } from "react"

type SidebarSectionScrollFrameProps = {
  bottomSpacerHeight: number
  children: ReactNode
  className?: string
  scrollRootRef: MutableRefObject<HTMLDivElement | null>
}

export function SidebarSectionScrollFrame({
  bottomSpacerHeight,
  children,
  className = "",
  scrollRootRef,
}: SidebarSectionScrollFrameProps) {
  return (
    <div
      ref={scrollRootRef}
      className={`min-h-0 flex-1 overflow-y-auto px-4 pb-0 md:px-6 ${className}`.trim()}
    >
      {children}
      <div aria-hidden="true" className="shrink-0" style={{ height: bottomSpacerHeight }} />
    </div>
  )
}
