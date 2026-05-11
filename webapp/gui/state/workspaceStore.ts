"use client"

import { create } from "zustand"

import type { LayerId, PageId } from "@/core/types/document"
import type { WorkspacePanel, WorkspaceState, WorkspaceTool } from "@/core/types/workspace"
import { DEFAULT_UI } from "@/core/config/ui-defaults"

type WorkspaceStoreState = WorkspaceState & {
  setActiveTool: (activeTool: WorkspaceTool) => void
  setActivePanel: (activePanel: WorkspacePanel) => void
  togglePanel: (panel: Exclude<WorkspacePanel, null>) => void
  setShowPresetsBrowser: (showPresetsBrowser: boolean) => void
  setActiveHelpSectionId: (activeHelpSectionId: string | null) => void
  setSelection: (selection: { pageId: PageId | null; layerId: LayerId | null }) => void
  setSelectedLayer: (layerId: LayerId | null, pageId?: PageId | null) => void
  clearSelection: () => void
  setZoom: (zoom: number) => void
  setSmartTextZoom: (smartTextZoom: boolean) => void
  setDarkMode: (darkMode: boolean) => void
  setInformationVisible: (informationVisible: boolean) => void
  setCollapsed: (collapsed: WorkspaceState["collapsed"]) => void
  resetWorkspace: () => void
}

const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  activeTool: "select",
  activePanel: null,
  showPresetsBrowser: true,
  activeHelpSectionId: null,
  selection: {
    pageId: null,
    layerId: null,
  },
  zoom: 1,
  smartTextZoom: true,
  darkMode: false,
  informationVisible: false,
  collapsed: DEFAULT_UI.collapsed,
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

  setShowPresetsBrowser: (showPresetsBrowser) => {
    set((state) => ({
      showPresetsBrowser,
      activePanel: showPresetsBrowser && state.activePanel === "layers" ? null : state.activePanel,
    }))
  },

  setActiveHelpSectionId: (activeHelpSectionId) => set({ activeHelpSectionId }),

  setSelection: (selection) => set({ selection }),

  setSelectedLayer: (layerId, pageId = null) => {
    set((state) => ({
      selection: {
        pageId: pageId ?? state.selection.pageId,
        layerId,
      },
    }))
  },

  clearSelection: () => {
    set({
      selection: {
        pageId: null,
        layerId: null,
      },
    })
  },

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  setSmartTextZoom: (smartTextZoom) => set({ smartTextZoom }),

  setDarkMode: (darkMode) => set({ darkMode }),

  setInformationVisible: (informationVisible) => set({ informationVisible }),

  setCollapsed: (collapsed) => set({ collapsed }),

  resetWorkspace: () => set(DEFAULT_WORKSPACE_STATE),
}))

export type { WorkspaceStoreState }
