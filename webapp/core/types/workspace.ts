import type { LayerId, PageId } from "@/core/types/document"
import type { SectionKey } from "@/lib/workspace-ui-schema"

export type WorkspaceTool = "select" | "text" | "image" | "pan"
export type WorkspacePanel = "layers" | "account" | "feedback" | "help" | "legal" | null

export type WorkspaceSelection = {
  pageId: PageId | null
  layerId: LayerId | null
}

export type WorkspaceState = {
  activeTool: WorkspaceTool
  activePanel: WorkspacePanel
  showPresetsBrowser: boolean
  activeHelpSectionId: string | null
  selection: WorkspaceSelection
  zoom: number
  smartTextZoom: boolean
  darkMode: boolean
  informationVisible: boolean
  collapsed: Record<SectionKey, boolean>
}
