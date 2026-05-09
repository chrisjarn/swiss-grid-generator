"use client"

import type { ReactNode } from "react"

import {
  SIDEBAR_PANEL_WIDTH_CLASSNAME,
} from "@/components/layout/sidebar-panel-layout"

type RightPanelTheme = {
  sidebar: string
}

export type RightPanelProps = {
  activeSidebarPanel: "settings" | "help" | "legal" | "layers" | "feedback" | "account" | null
  uiTheme: RightPanelTheme
  children: ReactNode
}

export function RightPanel({ activeSidebarPanel, uiTheme, children }: RightPanelProps) {
  return (
    <div
      data-help-scroll-root={activeSidebarPanel === "layers" ? undefined : "true"}
      className={`min-h-0 ${SIDEBAR_PANEL_WIDTH_CLASSNAME} overflow-x-hidden text-sm ${uiTheme.sidebar} ${
        activeSidebarPanel === "layers"
          ? "overflow-hidden"
          : "overflow-y-auto overscroll-contain p-4 md:p-6"
      }`}
    >
      {children}
    </div>
  )
}
