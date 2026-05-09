"use client"

import { create } from "zustand"

import type { LayerId, PageId } from "@/core/types/document"
import type { WorkspacePanel, WorkspaceState, WorkspaceTool } from "@/core/types/workspace"

type WorkspaceStoreState = WorkspaceState & {
  setActiveTool: (activeTool: WorkspaceTool) => void
  setActivePanel: (activePanel: WorkspacePanel) => void
  togglePanel: (panel: Exclude<WorkspacePanel, null>) => void
  setSelection: (selection: { pageId: PageId | null; layerId: LayerId | null }) => void
  clearSelection: () => void
  setZoom: (zoom: number) => void
  setDisplayOption: (
    key: "showBaselines" | "showMargins" | "showModules" | "showTypography" | "showImagePlaceholders",
    value: boolean,
  ) => void
  setSmartTextZoom: (smartTextZoom: boolean) => void
  setDarkMode: (darkMode: boolean) => void
  setInformationVisible: (informationVisible: boolean) => void
  resetWorkspace: () => void
}

const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  activeTool: "select",
  activePanel: "project",
  selection: {
    pageId: null,
    layerId: null,
  },
  zoom: 1,
  showBaselines: true,
  showMargins: true,
  showModules: true,
  showTypography: true,
  showImagePlaceholders: true,
  smartTextZoom: true,
  darkMode: false,
  informationVisible: false,
}

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_WORKSPACE_STATE.zoom
  return Math.min(8, Math.max(0.1, zoom))
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set) => ({
  ...DEFAULT_WORKSPACE_STATE,

  setActiveTool: (activeTool) => set({ activeTool }),

  setActivePanel: (activePanel) => set({ activePanel }),

  togglePanel: (panel) => {
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    }))
  },

  setSelection: (selection) => set({ selection }),

  clearSelection: () => {
    set({
      selection: {
        pageId: null,
        layerId: null,
      },
    })
  },

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  setDisplayOption: (key, value) => set({ [key]: value }),

  setSmartTextZoom: (smartTextZoom) => set({ smartTextZoom }),

  setDarkMode: (darkMode) => set({ darkMode }),

  setInformationVisible: (informationVisible) => set({ informationVisible }),

  resetWorkspace: () => set(DEFAULT_WORKSPACE_STATE),
}))

export type { WorkspaceStoreState }
