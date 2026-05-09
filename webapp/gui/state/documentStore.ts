"use client"

import { create } from "zustand"

import type { DocumentPage, DocumentState } from "@/core/types/document"
import type { GridConfig } from "@/core/types/grid"
import { DEFAULT_UI } from "@/lib/config/ui-defaults"
import { CURRENT_LAYOUT_ENGINE_CONTRACT } from "@/lib/layout-engine-contract"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"

type SwissDocumentState = DocumentState<PreviewLayoutState>
type SwissDocumentPage = DocumentPage<PreviewLayoutState>

type DocumentMutation = (document: SwissDocumentState) => SwissDocumentState

type DocumentStoreState = {
  past: SwissDocumentState[]
  present: SwissDocumentState
  future: SwissDocumentState[]
  canUndo: boolean
  canRedo: boolean
  setDocument: (document: SwissDocumentState) => void
  commit: (mutation: DocumentMutation) => void
  setActivePage: (pageId: string) => void
  patchActivePageConfig: (patch: Partial<GridConfig>) => void
  patchMetadata: (patch: Partial<SwissDocumentState["metadata"]>) => void
  undo: () => void
  redo: () => void
  reset: () => void
}

const HISTORY_LIMIT = 100

function createDefaultGridConfig(): GridConfig {
  return {
    canvasRatio: DEFAULT_UI.canvasRatio,
    customRatioWidth: DEFAULT_UI.customRatioWidth,
    customRatioHeight: DEFAULT_UI.customRatioHeight,
    orientation: DEFAULT_UI.orientation,
    rotation: DEFAULT_UI.rotation,
    marginMethod: DEFAULT_UI.marginMethod,
    gridCols: DEFAULT_UI.gridCols,
    gridRows: DEFAULT_UI.gridRows,
    gutterMultiple: DEFAULT_UI.gutterMultiple,
    rhythm: DEFAULT_UI.rhythm,
    rhythmRowsEnabled: DEFAULT_UI.rhythmRowsEnabled,
    rhythmRowsDirection: DEFAULT_UI.rhythmRowsDirection,
    rhythmColsEnabled: DEFAULT_UI.rhythmColsEnabled,
    rhythmColsDirection: DEFAULT_UI.rhythmColsDirection,
    typographyScale: DEFAULT_UI.typographyScale,
    fibonacciSequenceStartIndex: DEFAULT_UI.fibonacciSequenceStartIndex,
    baseFont: DEFAULT_UI.baseFont,
    imageColorScheme: DEFAULT_UI.imageColorScheme,
    canvasBackground: DEFAULT_UI.canvasBackground,
    customBaseline: DEFAULT_UI.customBaseline,
    useCustomMargins: DEFAULT_UI.useCustomMargins,
    customMarginMultipliers: { ...DEFAULT_UI.customMarginMultipliers },
    format: "A4",
  }
}

function createDefaultDocument(): SwissDocumentState {
  const pageId = "page-1"

  return {
    id: "document-1",
    activePageId: pageId,
    pages: [
      {
        id: pageId,
        name: "Page 1",
        uiSettings: createDefaultGridConfig(),
        previewLayout: null,
        layoutMode: "single",
      },
    ],
    metadata: {
      title: "",
      description: "",
      author: "",
    },
    layoutEngine: CURRENT_LAYOUT_ENGINE_CONTRACT,
    visibilitySettings: {
      showBaselines: true,
      showModules: true,
      showMargins: true,
      showImagePlaceholders: true,
      showTypography: true,
    },
    revision: 0,
  }
}

function normalizeRevision(document: SwissDocumentState, revision: number): SwissDocumentState {
  return document.revision === revision ? document : { ...document, revision }
}

function nextRevision(document: SwissDocumentState): SwissDocumentState {
  return { ...document, revision: document.revision + 1 }
}

function trimHistory(history: SwissDocumentState[]): SwissDocumentState[] {
  return history.length > HISTORY_LIMIT ? history.slice(history.length - HISTORY_LIMIT) : history
}

function createHistoryState(
  past: SwissDocumentState[],
  present: SwissDocumentState,
  future: SwissDocumentState[],
): Pick<DocumentStoreState, "past" | "present" | "future" | "canUndo" | "canRedo"> {
  return {
    past,
    present,
    future,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  }
}

function patchActivePage(
  document: SwissDocumentState,
  patch: (page: SwissDocumentPage) => SwissDocumentPage,
): SwissDocumentState {
  let changed = false
  const pages = document.pages.map((page) => {
    if (page.id !== document.activePageId) return page
    changed = true
    return patch(page)
  })

  return changed ? { ...document, pages } : document
}

const initialDocument = createDefaultDocument()

export const useDocumentStore = create<DocumentStoreState>((set) => ({
  ...createHistoryState([], initialDocument, []),

  setDocument: (document) => {
    set(createHistoryState([], normalizeRevision(document, 0), []))
  },

  commit: (mutation) => {
    set((state) => {
      const mutated = mutation(state.present)
      if (mutated === state.present) return state
      const next = nextRevision(mutated)

      return createHistoryState(
        trimHistory([...state.past, state.present]),
        next,
        [],
      )
    })
  },

  setActivePage: (pageId) => {
    set((state) => {
      if (state.present.activePageId === pageId) return state
      if (!state.present.pages.some((page) => page.id === pageId)) return state

      const next = nextRevision({ ...state.present, activePageId: pageId })
      return createHistoryState(trimHistory([...state.past, state.present]), next, [])
    })
  },

  patchActivePageConfig: (patch) => {
    set((state) => {
      const nextDocument = patchActivePage(state.present, (page) => ({
        ...page,
        uiSettings: {
          ...page.uiSettings,
          ...patch,
        },
      }))

      if (nextDocument === state.present) return state

      return createHistoryState(
        trimHistory([...state.past, state.present]),
        nextRevision(nextDocument),
        [],
      )
    })
  },

  patchMetadata: (patch) => {
    set((state) => {
      const nextDocument = {
        ...state.present,
        metadata: {
          ...state.present.metadata,
          ...patch,
        },
      }

      return createHistoryState(
        trimHistory([...state.past, state.present]),
        nextRevision(nextDocument),
        [],
      )
    })
  },

  undo: () => {
    set((state) => {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state

      return createHistoryState(
        state.past.slice(0, -1),
        previous,
        [state.present, ...state.future],
      )
    })
  },

  redo: () => {
    set((state) => {
      const next = state.future[0]
      if (!next) return state

      return createHistoryState(
        trimHistory([...state.past, state.present]),
        next,
        state.future.slice(1),
      )
    })
  },

  reset: () => {
    set(createHistoryState([], createDefaultDocument(), []))
  },
}))

export type { DocumentStoreState }
