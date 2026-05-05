import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  createDefaultProject,
  createProjectPage,
  type LoadedProject,
  type ProjectPage,
  type ProjectVisibilitySettings,
} from "@/lib/document-session"

type Args<Layout> = {
  defaultUiSettings: Record<string, unknown>
  defaultPreviewLayout: Layout | null
  currentUiSettings: Record<string, unknown>
  currentVisibilitySettings: ProjectVisibilitySettings
  currentPreviewLayout: Layout | null
  getCurrentPreviewLayout: () => Layout | null
  onApplyPage: (page: ProjectPage<Layout>, visibilitySettings: ProjectVisibilitySettings) => void
  onPageLimitReached?: (limit: number) => void
}

const MAX_PROJECT_PAGE_COUNT = 1000

function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function getNextPageName<Layout>(pages: readonly ProjectPage<Layout>[]): string {
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

function clearPreviewLayoutContent<Layout>(layout: Layout | null): Layout | null {
  if (!layout || typeof layout !== "object") return layout
  const candidate = layout as Record<string, unknown>
  if (!Array.isArray(candidate.blockOrder) || !("textContent" in candidate)) {
    return cloneSerializable(layout)
  }

  const cleared = {
    ...candidate,
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

  return cleared as Layout
}

function reconcilePageOrder<Layout>(
  currentPages: readonly ProjectPage<Layout>[],
  orderedIds: readonly string[],
): ProjectPage<Layout>[] {
  const pageById = new Map(currentPages.map((page) => [page.id, page]))
  const nextPages: ProjectPage<Layout>[] = []
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

function resolveActivePageDraft<Layout>(
  project: LoadedProject<Layout>,
  currentUiSettings: Record<string, unknown>,
  currentPreviewLayout: Layout | null,
): ProjectPage<Layout> | null {
  const activePage = project.pages.find((page) => page.id === project.activePageId) ?? null
  if (!activePage) return null
  if (
    activePage.uiSettings === currentUiSettings
    && activePage.previewLayout === currentPreviewLayout
  ) {
    return activePage
  }

  return {
    ...activePage,
    uiSettings: currentUiSettings,
    previewLayout: currentPreviewLayout,
  }
}

function persistActivePageSnapshot<Layout>(
  project: LoadedProject<Layout>,
  activePageDraft: ProjectPage<Layout> | null,
  visibilitySettings: ProjectVisibilitySettings,
): LoadedProject<Layout> {
  const projectWithVisibility = project.visibilitySettings === visibilitySettings
    ? project
    : {
        ...project,
        visibilitySettings,
      }
  if (!activePageDraft) return projectWithVisibility
  const activePageIndex = project.pages.findIndex((page) => page.id === activePageDraft.id)
  if (activePageIndex === -1) return projectWithVisibility
  if (project.pages[activePageIndex] === activePageDraft) return projectWithVisibility

  const nextPages = project.pages.slice()
  nextPages[activePageIndex] = activePageDraft
  return {
    ...projectWithVisibility,
    pages: nextPages,
  }
}

export function useProjectState<Layout>({
  defaultUiSettings,
  defaultPreviewLayout,
  currentUiSettings,
  currentVisibilitySettings,
  currentPreviewLayout,
  getCurrentPreviewLayout,
  onApplyPage,
  onPageLimitReached,
}: Args<Layout>) {
  const [project, setProject] = useState<LoadedProject<Layout>>(() =>
    createDefaultProject({
      uiSettings: defaultUiSettings,
      previewLayout: defaultPreviewLayout,
      visibilitySettings: currentVisibilitySettings,
    }),
  )
  const activePageIdRef = useRef(project.activePageId)

  useEffect(() => {
    activePageIdRef.current = project.activePageId
  }, [project.activePageId])

  const getLivePreviewLayout = useCallback(
    () => getCurrentPreviewLayout() ?? currentPreviewLayout,
    [currentPreviewLayout, getCurrentPreviewLayout],
  )

  const activePage = useMemo(
    () => (
      resolveActivePageDraft(project, currentUiSettings, currentPreviewLayout)
      ?? project.pages.find((page) => page.id === project.activePageId)
      ?? project.pages[0]
      ?? null
    ),
    [currentPreviewLayout, currentUiSettings, project],
  )

  const getCurrentProjectSnapshot = useCallback(() => (
    persistActivePageSnapshot(
      project,
      resolveActivePageDraft(project, currentUiSettings, getLivePreviewLayout()),
      currentVisibilitySettings,
    )
  ), [currentUiSettings, currentVisibilitySettings, getLivePreviewLayout, project])

  const replaceProjectSnapshot = useCallback((nextProject: LoadedProject<Layout>) => {
    activePageIdRef.current = nextProject.activePageId
    setProject(nextProject)
  }, [])

  const applyLoadedProject = useCallback((loadedProject: LoadedProject<Layout>) => {
    const firstPage = loadedProject.pages[0] ?? null
    const normalizedProject = firstPage
      ? {
          ...loadedProject,
          activePageId: firstPage.id,
        }
      : loadedProject

    setProject(normalizedProject)
    const nextActivePage = normalizedProject.pages[0] ?? null
    if (nextActivePage) {
      activePageIdRef.current = nextActivePage.id
      onApplyPage(nextActivePage, normalizedProject.visibilitySettings)
    }
  }, [onApplyPage])

  const selectPage = useCallback((pageId: string) => {
    if (pageId === activePageIdRef.current) return

    const currentProject = getCurrentProjectSnapshot()
    const nextActivePage = currentProject.pages.find((page) => page.id === pageId)
    if (!nextActivePage) return

    activePageIdRef.current = pageId
    setProject({
      ...currentProject,
      activePageId: pageId,
    })
    onApplyPage(nextActivePage, currentProject.visibilitySettings)
  }, [getCurrentProjectSnapshot, onApplyPage])

  const duplicateActivePage = useCallback((includeContent: boolean) => {
    const currentProject = getCurrentProjectSnapshot()
    if (currentProject.pages.length >= MAX_PROJECT_PAGE_COUNT) {
      onPageLimitReached?.(MAX_PROJECT_PAGE_COUNT)
      return
    }
    const sourcePage = currentProject.pages.find((page) => page.id === currentProject.activePageId)
      ?? currentProject.pages[0]
      ?? null
    if (!sourcePage) return
    const nextPage = createProjectPage({
      name: getNextPageName(currentProject.pages),
      uiSettings: cloneSerializable(sourcePage.uiSettings),
      previewLayout: includeContent
        ? cloneSerializable(sourcePage.previewLayout)
        : clearPreviewLayoutContent(sourcePage.previewLayout ?? defaultPreviewLayout),
      layoutMode: sourcePage.layoutMode,
    })
    const activePageIndex = currentProject.pages.findIndex((page) => page.id === currentProject.activePageId)
    const insertIndex = activePageIndex >= 0 ? activePageIndex + 1 : currentProject.pages.length
    const nextPages = [...currentProject.pages]
    nextPages.splice(insertIndex, 0, nextPage)

    setProject({
      ...currentProject,
      activePageId: nextPage.id,
      pages: nextPages,
    })
    activePageIdRef.current = nextPage.id
    onApplyPage(nextPage, currentProject.visibilitySettings)
  }, [
    defaultPreviewLayout,
    getCurrentProjectSnapshot,
    onApplyPage,
    onPageLimitReached,
  ])

  const addPage = useCallback(() => {
    duplicateActivePage(false)
  }, [duplicateActivePage])

  const addPageWithContent = useCallback(() => {
    duplicateActivePage(true)
  }, [duplicateActivePage])

  const setFacingPageEnabled = useCallback((pageId: string, enabled: boolean) => {
    if (!enabled) return
    const currentProject = getCurrentProjectSnapshot()
    const pageIndex = currentProject.pages.findIndex((page) => page.id === pageId)
    if (pageIndex === -1) return
    const page = currentProject.pages[pageIndex]
    if (!page) return
    if (page.layoutMode === "facing") return

    const nextPages = currentProject.pages.map((entry) => (
      entry.id === page.id
        ? {
            ...entry,
            layoutMode: "facing" as const,
          }
        : entry
    ))
    const nextActivePage = nextPages.find((entry) => entry.id === currentProject.activePageId) ?? nextPages[0] ?? null
    if (!nextActivePage) return

    setProject({
      ...currentProject,
      activePageId: nextActivePage.id,
      pages: nextPages,
    })
    if (nextActivePage.id === currentProject.activePageId) {
      onApplyPage(nextActivePage, currentProject.visibilitySettings)
    }
  }, [getCurrentProjectSnapshot, onApplyPage])

  const renamePage = useCallback((pageId: string, nextName: string) => {
    const trimmedName = nextName.trim()
    if (!trimmedName) return

    setProject((current) => ({
      ...current,
      pages: current.pages.map((page) => (
        page.id === pageId && page.name !== trimmedName
          ? { ...page, name: trimmedName }
          : page
      )),
    }))
  }, [])

  const deletePage = useCallback((pageId: string) => {
    if (project.pages.length <= 1) return

    const currentProject = getCurrentProjectSnapshot()
    const pageIndex = currentProject.pages.findIndex((page) => page.id === pageId)
    if (pageIndex === -1) return

    const remainingPages = currentProject.pages.filter((page) => page.id !== pageId)
    if (!remainingPages.length) return

    if (pageId !== currentProject.activePageId) {
      setProject({
        ...currentProject,
        pages: remainingPages,
      })
      return
    }

    const fallbackIndex = Math.min(pageIndex, remainingPages.length - 1)
    const nextActivePage = remainingPages[fallbackIndex] ?? remainingPages[remainingPages.length - 1] ?? null
    if (!nextActivePage) return

    setProject({
      ...currentProject,
      activePageId: nextActivePage.id,
      pages: remainingPages,
    })
    activePageIdRef.current = nextActivePage.id
    onApplyPage(nextActivePage, currentProject.visibilitySettings)
  }, [getCurrentProjectSnapshot, onApplyPage, project.pages.length])

  const reorderPages = useCallback((orderedIds: string[]) => {
    const currentProject = getCurrentProjectSnapshot()
    const nextPages = reconcilePageOrder(currentProject.pages, orderedIds)
    const hasChanged = nextPages.length !== currentProject.pages.length
      || nextPages.some((page, index) => page.id !== currentProject.pages[index]?.id)

    if (!hasChanged) return

    setProject({
      ...currentProject,
      pages: nextPages,
    })
  }, [getCurrentProjectSnapshot])

  return {
    project,
    pages: project.pages,
    activePage,
    activePageId: project.activePageId,
    getCurrentProjectSnapshot,
    replaceProjectSnapshot,
    applyLoadedProject,
    selectPage,
    addPage,
    addPageWithContent,
    setFacingPageEnabled,
    renamePage,
    deletePage,
    reorderPages,
  }
}
