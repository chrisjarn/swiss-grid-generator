"use client"

import { create } from "zustand"

import type { DocumentPage, DocumentState, DocumentVisibilitySettings } from "@/core/types/document"
import { DEFAULT_UI } from "@/lib/config/ui-defaults"
import {
  createDefaultProject,
  createProjectPage,
  DEFAULT_PROJECT_VISIBILITY_SETTINGS,
  type LoadedProject,
  type ProjectPage,
  type ProjectVisibilitySettings,
} from "@/lib/document-session"
import { CURRENT_LAYOUT_ENGINE_CONTRACT } from "@/lib/layout-engine-contract"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"

type SwissDocumentState = DocumentState<PreviewLayoutState>
type SwissDocumentPage = DocumentPage<PreviewLayoutState>
type SwissLoadedProject = LoadedProject<PreviewLayoutState>
type DocumentMutation = (document: SwissDocumentState) => SwissDocumentState

type LayerDeleteRequest = {
  token: number
  target: string
} | null

type LayerEditorRequest = {
  token: number
  target: string
} | null

type LayerLockRequest = {
  token: number
  targets: string[]
  locked: boolean
} | null

type LayerOrderRequest = {
  token: number
  order: string[]
} | null

type LoadedLayoutState = {
  token: number
  layout: PreviewLayoutState | null
} | null

type ActivePageDraft = {
  uiSettings?: Record<string, unknown>
  previewLayout?: PreviewLayoutState | null
}

type CommitOptions = {
  history?: boolean
  dirty?: boolean
  reloadPreview?: boolean
}

type DocumentStoreState = {
  past: SwissDocumentState[]
  present: SwissDocumentState
  future: SwissDocumentState[]
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  layoutLoadToken: number
  commandToken: number
  loadedPreviewLayout: LoadedLayoutState
  requestedLayerOrderState: LayerOrderRequest
  requestedLayerDeleteState: LayerDeleteRequest
  requestedLayerEditorState: LayerEditorRequest
  requestedLayerLockState: LayerLockRequest
  setDocument: (document: SwissDocumentState, options?: CommitOptions) => void
  loadProject: (project: SwissLoadedProject) => void
  replaceProjectSnapshot: (project: SwissLoadedProject, options?: CommitOptions) => void
  commit: (mutation: DocumentMutation, options?: CommitOptions) => void
  setActivePage: (pageId: string, activePageDraft?: ActivePageDraft) => void
  patchActivePageConfig: (patch: Record<string, unknown>, options?: CommitOptions) => void
  replaceActivePagePreviewLayout: (layout: PreviewLayoutState | null) => void
  recordPreviewHistoryBoundary: (layout: PreviewLayoutState | null) => void
  patchMetadata: (patch: Partial<SwissDocumentState["metadata"]>, options?: CommitOptions) => void
  setVisibilityOption: (key: keyof DocumentVisibilitySettings, value: boolean, options?: CommitOptions) => void
  addPage: (includeContent: boolean, activePageDraft?: ActivePageDraft) => boolean
  setFacingPageEnabled: (pageId: string, enabled: boolean, activePageDraft?: ActivePageDraft) => void
  renamePage: (pageId: string, nextName: string) => void
  deletePage: (pageId: string, activePageDraft?: ActivePageDraft) => void
  reorderPages: (orderedIds: string[], activePageDraft?: ActivePageDraft) => void
  requestLayerOrder: (nextLayerOrder: string[]) => void
  requestLayerDelete: (target: string, kind?: "text" | "image") => void
  requestLayerEditor: (target: string) => void
  requestLayerLock: (targets: string[], locked: boolean) => void
  clearLayerRequests: () => void
  undo: () => void
  redo: () => void
  reset: () => void
  markClean: () => void
}

const HISTORY_LIMIT = 150
const MAX_PROJECT_PAGE_COUNT = 1000

function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function createDefaultUiSettings(): Record<string, unknown> {
  return {
    ...DEFAULT_UI,
    customMarginMultipliers: { ...DEFAULT_UI.customMarginMultipliers },
    format: "A4",
  }
}

function createDefaultDocument(): SwissDocumentState {
  return loadedProjectToDocument(
    createDefaultProject<PreviewLayoutState>({
      uiSettings: createDefaultUiSettings(),
      previewLayout: null,
      visibilitySettings: DEFAULT_PROJECT_VISIBILITY_SETTINGS,
    }),
  )
}

function trimHistory(history: SwissDocumentState[]): SwissDocumentState[] {
  return history.length > HISTORY_LIMIT ? history.slice(history.length - HISTORY_LIMIT) : history
}

function normalizePage(page: ProjectPage<PreviewLayoutState>): SwissDocumentPage {
  return {
    id: page.id,
    name: page.name,
    uiSettings: page.uiSettings,
    previewLayout: page.previewLayout,
    layoutMode: page.layoutMode ?? "single",
  }
}

function normalizeRevision(document: SwissDocumentState, revision: number): SwissDocumentState {
  return document.revision === revision ? document : { ...document, revision }
}

function nextRevision(document: SwissDocumentState): SwissDocumentState {
  return { ...document, revision: document.revision + 1 }
}

function activePageLayout(document: SwissDocumentState): PreviewLayoutState | null {
  return document.pages.find((page) => page.id === document.activePageId)?.previewLayout ?? null
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

function createLoadedPreviewLayout(document: SwissDocumentState, token: number): LoadedLayoutState {
  return {
    token,
    layout: activePageLayout(document),
  }
}

function applyActivePageDraft(
  document: SwissDocumentState,
  activePageDraft?: ActivePageDraft,
): SwissDocumentState {
  if (!activePageDraft) return document
  let changed = false
  const pages = document.pages.map((page) => {
    if (page.id !== document.activePageId) return page
    const nextPage = {
      ...page,
      uiSettings: activePageDraft.uiSettings ?? page.uiSettings,
      previewLayout: "previewLayout" in activePageDraft
        ? activePageDraft.previewLayout ?? null
        : page.previewLayout,
    }
    changed = nextPage.uiSettings !== page.uiSettings || nextPage.previewLayout !== page.previewLayout
    return changed ? nextPage : page
  })

  return changed ? { ...document, pages } : document
}

function patchActivePage(
  document: SwissDocumentState,
  patch: (page: SwissDocumentPage) => SwissDocumentPage,
): SwissDocumentState {
  let changed = false
  const pages = document.pages.map((page) => {
    if (page.id !== document.activePageId) return page
    const nextPage = patch(page)
    changed = changed || nextPage !== page
    return nextPage
  })

  return changed ? { ...document, pages } : document
}

function getNextPageName(pages: readonly SwissDocumentPage[]): string {
  let maxPageNumber = 0

  pages.forEach((page) => {
    const match = /^Page\s+(\d+)$/i.exec(page.name.trim())
    if (!match) return
    const pageNumber = Number.parseInt(match[1], 10)
    if (Number.isFinite(pageNumber)) {
      maxPageNumber = Math.max(maxPageNumber, pageNumber)
    }
  })

  return `Page ${Math.max(maxPageNumber + 1, pages.length + 1)}`
}

function clearPreviewLayoutContent(layout: PreviewLayoutState | null): PreviewLayoutState | null {
  if (!layout || typeof layout !== "object") return layout

  return {
    ...layout,
    blockOrder: [],
    textContent: {},
    blockTextEdited: {},
    styleAssignments: {},
    blockFontFamilies: {},
    blockFontWeights: {},
    blockOpticalKerning: {},
    blockTrackingScales: {},
    blockTrackingRuns: {},
    blockTextFormatRuns: {},
    blockColumnSpans: {},
    blockRowSpans: {},
    blockHeightBaselines: {},
    blockTextAlignments: {},
    blockVerticalAlignments: {},
    blockTextReflow: {},
    blockSyllableDivision: {},
    blockSnapToColumns: {},
    blockSnapToBaseline: {},
    blockItalic: {},
    blockRotations: {},
    blockCustomSizes: {},
    blockCustomLeadings: {},
    blockTextColors: {},
    blockModulePositions: {},
    lockedLayers: {},
    layerOrder: [],
    imageOrder: [],
    imageModulePositions: {},
    imageColumnSpans: {},
    imageRowSpans: {},
    imageHeightBaselines: {},
    imageSnapToColumns: {},
    imageSnapToBaseline: {},
    imageRotations: {},
    imageColors: {},
    imageOpacities: {},
  }
}

function reconcilePageOrder(
  currentPages: readonly SwissDocumentPage[],
  orderedIds: readonly string[],
): SwissDocumentPage[] {
  const pageById = new Map(currentPages.map((page) => [page.id, page]))
  const nextPages: SwissDocumentPage[] = []
  const seenIds = new Set<string>()

  orderedIds.forEach((pageId) => {
    const page = pageById.get(pageId)
    if (!page || seenIds.has(pageId)) return
    seenIds.add(pageId)
    nextPages.push(page)
  })

  currentPages.forEach((page) => {
    if (seenIds.has(page.id)) return
    nextPages.push(page)
  })

  return nextPages
}

function commitState(
  state: DocumentStoreState,
  mutation: DocumentMutation,
  options: CommitOptions = {},
): Partial<DocumentStoreState> | DocumentStoreState {
  const {
    history = true,
    dirty = true,
    reloadPreview = false,
  } = options
  const mutated = mutation(state.present)
  if (mutated === state.present) return state

  const next = nextRevision(mutated)
  const nextLayoutLoadToken = reloadPreview ? state.layoutLoadToken + 1 : state.layoutLoadToken

  return {
    ...createHistoryState(
      history ? trimHistory([...state.past, state.present]) : state.past,
      next,
      history ? [] : state.future,
    ),
    isDirty: dirty ? true : state.isDirty,
    layoutLoadToken: nextLayoutLoadToken,
    loadedPreviewLayout: reloadPreview ? createLoadedPreviewLayout(next, nextLayoutLoadToken) : state.loadedPreviewLayout,
  }
}

export function loadedProjectToDocument(project: SwissLoadedProject, revision = 0): SwissDocumentState {
  const pages = project.pages.map(normalizePage)
  const activePageId = pages.some((page) => page.id === project.activePageId)
    ? project.activePageId
    : pages[0]?.id ?? "page-1"

  return {
    id: "document-1",
    activePageId,
    pages,
    metadata: project.metadata,
    layoutEngine: project.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
    visibilitySettings: project.visibilitySettings,
    revision,
    tour: project.tour ?? null,
  }
}

export function documentToLoadedProject(document: SwissDocumentState): SwissLoadedProject {
  return {
    activePageId: document.activePageId,
    pages: document.pages.map((page) => ({
      id: page.id,
      name: page.name,
      uiSettings: page.uiSettings,
      previewLayout: page.previewLayout,
      layoutMode: page.layoutMode,
    })),
    metadata: document.metadata,
    layoutEngine: document.layoutEngine,
    visibilitySettings: document.visibilitySettings as ProjectVisibilitySettings,
    tour: (document.tour ?? null) as SwissLoadedProject["tour"],
  }
}

const initialDocument = createDefaultDocument()

export const useDocumentStore = create<DocumentStoreState>((set) => ({
  ...createHistoryState([], initialDocument, []),
  isDirty: false,
  layoutLoadToken: 0,
  commandToken: 0,
  loadedPreviewLayout: createLoadedPreviewLayout(initialDocument, 0),
  requestedLayerOrderState: null,
  requestedLayerDeleteState: null,
  requestedLayerEditorState: null,
  requestedLayerLockState: null,

  setDocument: (document, options = {}) => {
    set((state) => {
      const next = normalizeRevision(document, 0)
      const nextLayoutLoadToken = state.layoutLoadToken + 1
      return {
        ...createHistoryState([], next, []),
        isDirty: options.dirty ?? false,
        layoutLoadToken: nextLayoutLoadToken,
        loadedPreviewLayout: createLoadedPreviewLayout(next, nextLayoutLoadToken),
      }
    })
  },

  loadProject: (project) => {
    set((state) => {
      const next = loadedProjectToDocument(project, 0)
      const nextLayoutLoadToken = state.layoutLoadToken + 1
      return {
        ...createHistoryState([], next, []),
        isDirty: false,
        layoutLoadToken: nextLayoutLoadToken,
        loadedPreviewLayout: createLoadedPreviewLayout(next, nextLayoutLoadToken),
        requestedLayerOrderState: null,
        requestedLayerDeleteState: null,
        requestedLayerEditorState: null,
        requestedLayerLockState: null,
      }
    })
  },

  replaceProjectSnapshot: (project, options = {}) => {
    set((state) => {
      const next = loadedProjectToDocument(project, state.present.revision)
      return commitState(state, () => next, {
        history: options.history ?? false,
        dirty: options.dirty ?? state.isDirty,
        reloadPreview: options.reloadPreview ?? true,
      })
    })
  },

  commit: (mutation, options) => {
    set((state) => commitState(state, mutation, options))
  },

  setActivePage: (pageId, activePageDraft) => {
    set((state) => {
      if (state.present.activePageId === pageId) return state
      if (!state.present.pages.some((page) => page.id === pageId)) return state
      return commitState(state, (document) => ({
        ...applyActivePageDraft(document, activePageDraft),
        activePageId: pageId,
      }), {
        history: false,
        dirty: state.isDirty,
        reloadPreview: true,
      })
    })
  },

  patchActivePageConfig: (patch, options) => {
    set((state) => commitState(state, (document) => patchActivePage(document, (page) => ({
      ...page,
      uiSettings: {
        ...page.uiSettings,
        ...patch,
      },
    })), options))
  },

  replaceActivePagePreviewLayout: (layout) => {
    set((state) => commitState(state, (document) => patchActivePage(document, (page) => ({
      ...page,
      previewLayout: layout,
    })), {
      history: false,
      dirty: false,
      reloadPreview: false,
    }))
  },

  recordPreviewHistoryBoundary: (layout) => {
    set((state) => commitState(state, (document) => patchActivePage(document, (page) => ({
      ...page,
      previewLayout: layout,
    })), {
      history: true,
      dirty: true,
      reloadPreview: false,
    }))
  },

  patchMetadata: (patch, options) => {
    set((state) => commitState(state, (document) => ({
      ...document,
      metadata: {
        ...document.metadata,
        ...patch,
      },
    }), options))
  },

  setVisibilityOption: (key, value, options) => {
    set((state) => commitState(state, (document) => {
      if (document.visibilitySettings[key] === value) return document
      return {
        ...document,
        visibilitySettings: {
          ...document.visibilitySettings,
          [key]: value,
        },
      }
    }, options))
  },

  addPage: (includeContent, activePageDraft) => {
    let added = false
    set((state) => commitState(state, (document) => {
      const currentDocument = applyActivePageDraft(document, activePageDraft)
      if (currentDocument.pages.length >= MAX_PROJECT_PAGE_COUNT) return currentDocument
      const sourcePage = currentDocument.pages.find((page) => page.id === currentDocument.activePageId)
        ?? currentDocument.pages[0]
        ?? null
      if (!sourcePage) return currentDocument

      const nextPage = createProjectPage<PreviewLayoutState>({
        name: getNextPageName(currentDocument.pages),
        uiSettings: cloneSerializable(sourcePage.uiSettings),
        previewLayout: includeContent
          ? cloneSerializable(sourcePage.previewLayout)
          : clearPreviewLayoutContent(sourcePage.previewLayout),
        layoutMode: sourcePage.layoutMode,
      })
      const activePageIndex = currentDocument.pages.findIndex((page) => page.id === currentDocument.activePageId)
      const insertIndex = activePageIndex >= 0 ? activePageIndex + 1 : currentDocument.pages.length
      const nextPages = [...currentDocument.pages]
      nextPages.splice(insertIndex, 0, normalizePage(nextPage))
      added = true

      return {
        ...currentDocument,
        activePageId: nextPage.id,
        pages: nextPages,
      }
    }, {
      history: true,
      dirty: true,
      reloadPreview: true,
    }))
    return added
  },

  setFacingPageEnabled: (pageId, enabled, activePageDraft) => {
    if (!enabled) return
    set((state) => commitState(state, (document) => {
      const currentDocument = applyActivePageDraft(document, activePageDraft)
      const page = currentDocument.pages.find((entry) => entry.id === pageId)
      if (!page || page.layoutMode === "facing") return currentDocument
      return {
        ...currentDocument,
        pages: currentDocument.pages.map((entry) => (
          entry.id === pageId ? { ...entry, layoutMode: "facing" } : entry
        )),
      }
    }, {
      history: true,
      dirty: true,
      reloadPreview: pageId === state.present.activePageId,
    }))
  },

  renamePage: (pageId, nextName) => {
    const trimmedName = nextName.trim()
    if (!trimmedName) return
    set((state) => commitState(state, (document) => {
      let changed = false
      const pages = document.pages.map((page) => {
        if (page.id !== pageId || page.name === trimmedName) return page
        changed = true
        return { ...page, name: trimmedName }
      })
      return changed ? { ...document, pages } : document
    }))
  },

  deletePage: (pageId, activePageDraft) => {
    set((state) => commitState(state, (document) => {
      const currentDocument = applyActivePageDraft(document, activePageDraft)
      if (currentDocument.pages.length <= 1) return currentDocument
      const pageIndex = currentDocument.pages.findIndex((page) => page.id === pageId)
      if (pageIndex === -1) return currentDocument
      const remainingPages = currentDocument.pages.filter((page) => page.id !== pageId)
      if (!remainingPages.length) return currentDocument
      if (pageId !== currentDocument.activePageId) {
        return {
          ...currentDocument,
          pages: remainingPages,
        }
      }
      const fallbackIndex = Math.min(pageIndex, remainingPages.length - 1)
      const nextActivePage = remainingPages[fallbackIndex] ?? remainingPages[remainingPages.length - 1]
      return {
        ...currentDocument,
        activePageId: nextActivePage.id,
        pages: remainingPages,
      }
    }, {
      history: true,
      dirty: true,
      reloadPreview: pageId === state.present.activePageId,
    }))
  },

  reorderPages: (orderedIds, activePageDraft) => {
    set((state) => commitState(state, (document) => {
      const currentDocument = applyActivePageDraft(document, activePageDraft)
      const nextPages = reconcilePageOrder(currentDocument.pages, orderedIds)
      const hasChanged = nextPages.length !== currentDocument.pages.length
        || nextPages.some((page, index) => page.id !== currentDocument.pages[index]?.id)
      return hasChanged ? { ...currentDocument, pages: nextPages } : currentDocument
    }))
  },

  requestLayerOrder: (nextLayerOrder) => {
    set((state) => ({
      commandToken: state.commandToken + 1,
      requestedLayerOrderState: {
        token: state.commandToken + 1,
        order: [...nextLayerOrder],
      },
    }))
  },

  requestLayerDelete: (target, _kind) => {
    set((state) => {
      const nextCommandToken = state.commandToken + 1
      return {
        commandToken: nextCommandToken,
        requestedLayerDeleteState: {
          token: nextCommandToken,
          target,
        },
      }
    })
  },

  requestLayerEditor: (target) => {
    set((state) => ({
      commandToken: state.commandToken + 1,
      requestedLayerEditorState: {
        token: state.commandToken + 1,
        target,
      },
    }))
  },

  requestLayerLock: (targets, locked) => {
    const nextTargets = [...new Set(targets)]
    if (nextTargets.length === 0) return
    set((state) => {
      const nextCommandToken = state.commandToken + 1
      return {
        commandToken: nextCommandToken,
        requestedLayerLockState: {
          token: nextCommandToken,
          targets: nextTargets,
          locked,
        },
      }
    })
  },

  clearLayerRequests: () => {
    set({
      requestedLayerOrderState: null,
      requestedLayerDeleteState: null,
      requestedLayerEditorState: null,
      requestedLayerLockState: null,
    })
  },

  undo: () => {
    set((state) => {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      const nextLayoutLoadToken = state.layoutLoadToken + 1
      return {
        ...createHistoryState(
          state.past.slice(0, -1),
          previous,
          [state.present, ...state.future],
        ),
        isDirty: true,
        layoutLoadToken: nextLayoutLoadToken,
        loadedPreviewLayout: createLoadedPreviewLayout(previous, nextLayoutLoadToken),
      }
    })
  },

  redo: () => {
    set((state) => {
      const next = state.future[0]
      if (!next) return state
      const nextLayoutLoadToken = state.layoutLoadToken + 1
      return {
        ...createHistoryState(
          trimHistory([...state.past, state.present]),
          next,
          state.future.slice(1),
        ),
        isDirty: true,
        layoutLoadToken: nextLayoutLoadToken,
        loadedPreviewLayout: createLoadedPreviewLayout(next, nextLayoutLoadToken),
      }
    })
  },

  reset: () => {
    set((state) => {
      const next = createDefaultDocument()
      const nextLayoutLoadToken = state.layoutLoadToken + 1
      return {
        ...createHistoryState([], next, []),
        isDirty: false,
        layoutLoadToken: nextLayoutLoadToken,
        loadedPreviewLayout: createLoadedPreviewLayout(next, nextLayoutLoadToken),
        requestedLayerOrderState: null,
        requestedLayerDeleteState: null,
        requestedLayerEditorState: null,
        requestedLayerLockState: null,
      }
    })
  },

  markClean: () => set({ isDirty: false }),
}))

export type { ActivePageDraft, DocumentStoreState, SwissDocumentState, SwissLoadedProject }
