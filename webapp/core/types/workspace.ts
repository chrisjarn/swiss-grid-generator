import type { LayerId, PageId } from "@/core/types/document"
import type { SectionKey } from "@/core/types/workspace-ui-schema"

export type WorkspaceTool = "select" | "text" | "image" | "pan"
export type WorkspacePanel = "layers" | "account" | "feedback" | "legal" | null

export type WorkspaceSelection = {
  pageId: PageId | null
  layerId: LayerId | null
}

export type WorkspaceState = {
  activeTool: WorkspaceTool
  activePanel: WorkspacePanel
  showPresetsBrowser: boolean
  selection: WorkspaceSelection
  zoom: number
  smartTextZoom: boolean
  darkMode: boolean
  informationVisible: boolean
  collapsed: Record<SectionKey, boolean>
}
