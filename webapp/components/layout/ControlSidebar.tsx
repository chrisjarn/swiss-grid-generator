"use client"

import { memo, type ReactNode } from "react"

import { SIDEBAR_PANEL_WIDTH_CLASSNAME } from "@/components/layout/sidebar-panel-layout"

type UiTheme = {
  leftPanel: string
  leftPanelEdit: string
}

type Props = {
  uiTheme: UiTheme
  settingsPanels: ReactNode
  editorMode: "text" | "image" | null
  onEditorHostChange: (node: HTMLDivElement | null) => void
}

export const ControlSidebar = memo(function ControlSidebar({
  uiTheme,
  settingsPanels,
  editorMode,
  onEditorHostChange,
}: Props) {
  return (
    <div
      data-editor-mode-preserve-root="true"
      className={`${SIDEBAR_PANEL_WIDTH_CLASSNAME} flex max-h-[50vh] flex-col overflow-hidden transition-colors md:max-h-full ${uiTheme.leftPanel} ${
        editorMode ? uiTheme.leftPanelEdit : ""
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {editorMode ? (
            <div
              ref={onEditorHostChange}
              data-editor-sidebar-host="true"
              data-editor-interactive-root="true"
              className="min-h-0 flex-1 overflow-hidden"
            />
          ) : (
            settingsPanels
          )}
        </div>
      </div>
    </div>
  )
})

ControlSidebar.displayName = "ControlSidebar"
