"use client"

import { memo, type ReactNode } from "react"

import { SIDEBAR_PANEL_WIDTH_CLASSNAME } from "@/components/layout/sidebar-panel-layout"

type UiTheme = {
  leftPanel: string
  leftPanelEdit: string
  subtleBorder: string
  bodyText: string
  link: string
}

type Props = {
  showBetaBadge: boolean
  uiTheme: UiTheme
  settingsPanels: ReactNode
  editorMode: "text" | "image" | null
  onEditorHostChange: (node: HTMLDivElement | null) => void
  onToggleFeedbackPanel: () => void
  onToggleLegalNoticePanel: () => void
}

export const ControlSidebar = memo(function ControlSidebar({
  showBetaBadge,
  uiTheme,
  settingsPanels,
  editorMode,
  onEditorHostChange,
  onToggleFeedbackPanel,
  onToggleLegalNoticePanel,
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

        <div className={`shrink-0 px-4 py-3 text-[11px] md:px-6 ${uiTheme.bodyText}`}>
          <div className={`flex items-center gap-3 ${showBetaBadge ? "justify-between" : "justify-end"}`}>
            {showBetaBadge ? (
              <span className="inline-flex items-center rounded bg-red-600 px-2 py-0.5 font-medium text-white">Beta</span>
            ) : null}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={uiTheme.link}
                onClick={onToggleFeedbackPanel}
              >
                Feedback
              </button>
              <button
                type="button"
                className={uiTheme.link}
                onClick={onToggleLegalNoticePanel}
              >
                Legal Notice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

ControlSidebar.displayName = "ControlSidebar"
