import type { LayerId, PageId } from "@/core/types/document"

export type WorkspaceTool = "select" | "text" | "image" | "pan"
export type WorkspacePanel = "project" | "account" | "feedback" | "help" | "legal" | "presets" | null

export type WorkspaceSelection = {
  pageId: PageId | null
  layerId: LayerId | null
}

export type WorkspaceState = {
  activeTool: WorkspaceTool
  activePanel: WorkspacePanel
  selection: WorkspaceSelection
  zoom: number
  showBaselines: boolean
  showMargins: boolean
  showModules: boolean
  showTypography: boolean
  showImagePlaceholders: boolean
  smartTextZoom: boolean
  darkMode: boolean
  informationVisible: boolean
}
