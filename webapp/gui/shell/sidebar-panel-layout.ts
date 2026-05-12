import type { WorkspacePanel } from "@/core/types/workspace"

export const SIDEBAR_PANEL_WIDTH_CLASSNAME = "w-full md:w-[280px] md:basis-[280px] md:shrink-0"
export const SIDEBAR_PANEL_POPOVER_WIDTH_CLASSNAME = "w-[280px]"
export const WORKSPACE_HEADER_GRID_WITH_SIDEBAR_CLASSNAME = "md:grid-cols-[280px_minmax(0,1fr)_280px]"
export const WORKSPACE_HEADER_GRID_WITHOUT_SIDEBAR_CLASSNAME = "md:grid-cols-[280px_minmax(0,1fr)_0px]"

const RIGHT_CONTENT_PANEL_KEYS = new Set<Exclude<WorkspacePanel, null>>(["account", "feedback", "legal"])

export function isRightContentPanel(panel: WorkspacePanel): boolean {
  return panel !== null && RIGHT_CONTENT_PANEL_KEYS.has(panel)
}
