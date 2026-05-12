"use client"

import type { ReactNode } from "react"

import {
  SIDEBAR_PANEL_WIDTH_CLASSNAME,
} from "@/gui/shell/sidebar-panel-layout"
import type { WorkspacePanel } from "@/core/types/workspace"

type RightPanelTheme = {
  sidebar: string
}

export type RightPanelProps = {
  activeSidebarPanel: WorkspacePanel
  uiTheme: RightPanelTheme
  children: ReactNode
}

const RIGHT_CONTENT_PANEL_BACKGROUND_CLASSNAME = "bg-surface"

export function RightPanel({ activeSidebarPanel, uiTheme, children }: RightPanelProps) {
  return (
    <div
      data-help-scroll-root={activeSidebarPanel === "layers" ? undefined : "true"}
      className={`min-h-0 ${SIDEBAR_PANEL_WIDTH_CLASSNAME} overflow-x-hidden text-sm ${uiTheme.sidebar} ${
        activeSidebarPanel === "layers"
          ? "overflow-hidden"
          : `overflow-y-auto overscroll-contain p-4 md:p-6 ${RIGHT_CONTENT_PANEL_BACKGROUND_CLASSNAME}`
      }`}
    >
      {children}
    </div>
  )
}
