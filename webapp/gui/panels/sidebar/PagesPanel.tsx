"use client"

import { BookOpen, Check, ChevronUp, Square, Trash2 } from "lucide-react"
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"

import {
  clearWindowSelection,
  isCardDragIgnoreTarget,
  lockDocumentUserSelect,
} from "@/gui/panels/sidebar/lib/sidebar-card-drag"
import {
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
} from "@/gui/panels/settings/settings-panel-styles"
import { getNeutralFormControlClassName } from "@/shared/ui/popup-styles"
import { useTranslation } from "@/lib/i18n/useTranslation"
import type { ProjectPanelPageRow } from "@/gui/panels/sidebar/project-panel-view-model"
import type { NoticeRequest } from "@/gui/lib/notice-request"

export type PagePanelListItem = ProjectPanelPageRow

const MIN_PAGE_LIST_MAX_HEIGHT_PX = 84
const CLOSED_LAYERS_SECTION_RESERVE_PX = 128
const PAGE_LIST_VIRTUALIZATION_THRESHOLD = 120
const PAGE_LIST_OVERSCAN_ROWS = 8
const PAGE_LIST_ROW_HEIGHT_PX = 28
const PAGE_LIST_EXPANDED_ROW_HEIGHT_PX = 104

type Props = {
  pageIndexById: ReadonlyMap<string, number>
  pages: readonly PagePanelListItem[]
  activePageId: string
  onSelectPage: (pageId: string) => void
  onFacingPageToggle: (pageId: string, enabled: boolean) => void
  onRenamePage: (pageId: string, nextName: string) => void
  onDeletePage: (pageId: string) => void
  onRequestNotice?: (notice: NoticeRequest) => void
  onPageOrderChange: (orderedIds: string[]) => void
  isDarkMode?: boolean
}

export function PagesPanel({
  pageIndexById,
  pages,
  activePageId,
  onSelectPage,
  onFacingPageToggle,
  onRenamePage,
  onDeletePage,
  onRequestNotice,
  onPageOrderChange,
  isDarkMode = false,
}: Props) {
  const { t } = useTranslation()
  const [pageNameDraft, setPageNameDraft] = useState("")
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const [manualExpandedPageId, setManualExpandedPageId] = useState<string | null>(null)
  const [listMaxHeight, setListMaxHeight] = useState<number | null>(null)
  const [scrollViewport, setScrollViewport] = useState({ top: 0, height: 0 })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dropIndicatorIndexRef = useRef<number | null>(null)
  const selectionLockCleanupRef = useRef<(() => void) | null>(null)
  const lastRevealedActivePageIdRef = useRef(activePageId)

  const expandedPageId = manualExpandedPageId
  const expandedPageIndex = expandedPageId ? pageIndexById.get(expandedPageId) ?? -1 : -1
  const expandedPage = expandedPageIndex >= 0 ? pages[expandedPageIndex] ?? null : null
  const expandedPageName = expandedPage?.name ?? ""
  const virtualizationEnabled = pages.length >= PAGE_LIST_VIRTUALIZATION_THRESHOLD
    && draggingPageId === null

  useEffect(() => {
    if (manualExpandedPageId === null) return
    if (pageIndexById.has(manualExpandedPageId)) return
    setManualExpandedPageId(null)
  }, [manualExpandedPageId, pageIndexById])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    let frameId: number | null = null
    const updateListMaxHeight = () => {
      const bounds = root.getBoundingClientRect()
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const nextMaxHeight = Math.max(
        MIN_PAGE_LIST_MAX_HEIGHT_PX,
        Math.floor(viewportHeight - bounds.top - CLOSED_LAYERS_SECTION_RESERVE_PX),
      )
      setListMaxHeight((current) => (current === nextMaxHeight ? current : nextMaxHeight))
    }
    const scheduleUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        updateListMaxHeight()
      })
    }

    updateListMaxHeight()
    window.addEventListener("resize", scheduleUpdate)
    window.visualViewport?.addEventListener("resize", scheduleUpdate)
    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      window.removeEventListener("resize", scheduleUpdate)
      window.visualViewport?.removeEventListener("resize", scheduleUpdate)
    }
  }, [expandedPageId, pages.length])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !virtualizationEnabled || listMaxHeight === null) {
      setScrollViewport({ top: 0, height: 0 })
      return
    }

    let frameId: number | null = null
    const updateViewport = () => {
      frameId = null
      setScrollViewport((current) => {
        const next = {
          top: root.scrollTop,
          height: root.clientHeight,
        }
        return current.top === next.top && current.height === next.height ? current : next
      })
    }
    const scheduleUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(updateViewport)
    }

    updateViewport()
    root.addEventListener("scroll", scheduleUpdate, { passive: true })
    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      root.removeEventListener("scroll", scheduleUpdate)
    }
  }, [listMaxHeight, virtualizationEnabled])

  useEffect(() => {
    const releaseOnMouseUp = () => {
      if (draggingPageId) return
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }

    window.addEventListener("mouseup", releaseOnMouseUp)
    window.addEventListener("blur", releaseOnMouseUp)
    return () => {
      window.removeEventListener("mouseup", releaseOnMouseUp)
      window.removeEventListener("blur", releaseOnMouseUp)
    }
  }, [draggingPageId])

  useEffect(() => (
    () => {
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }
  ), [])

  const tone = isDarkMode
    ? {
        expandedControls: "bg-surface",
        rowMuted: "text-muted-foreground",
        close: "text-muted-foreground hover:bg-surface hover:text-foreground",
        accent: "text-accent",
      }
    : {
        expandedControls: "bg-surface",
        rowMuted: "text-muted-foreground",
        close: "text-muted-foreground hover:bg-panel hover:text-foreground",
        accent: "text-accent",
      }
  const renameInputClassName = getNeutralFormControlClassName(isDarkMode, "h-6 w-full rounded-sm px-2 text-[12px] leading-none")
  const pageListClassName = getSettingsOpenListClassName(isDarkMode)

  const stationaryPages = useMemo(() => (
    draggingPageId ? pages.filter((page) => page.id !== draggingPageId) : pages
  ), [draggingPageId, pages])
  const stationaryIndexByPageId = useMemo(() => (
    draggingPageId
      ? new Map(stationaryPages.map((page, index) => [page.id, index]))
      : pageIndexById
  ), [draggingPageId, pageIndexById, stationaryPages])

  const pageMetrics = useMemo(() => {
    const expandedHeightDelta = expandedPageIndex >= 0
      ? PAGE_LIST_EXPANDED_ROW_HEIGHT_PX - PAGE_LIST_ROW_HEIGHT_PX
      : 0
    const getOffsetForIndex = (index: number) => (
      index * PAGE_LIST_ROW_HEIGHT_PX + (
        expandedPageIndex >= 0 && index > expandedPageIndex ? expandedHeightDelta : 0
      )
    )
    const getHeightForIndex = (index: number) => (
      index === expandedPageIndex ? PAGE_LIST_EXPANDED_ROW_HEIGHT_PX : PAGE_LIST_ROW_HEIGHT_PX
    )
    const findFirstVisibleIndex = (targetTop: number) => {
      if (pages.length === 0) return 0
      let low = 0
      let high = pages.length
      while (low < high) {
        const mid = Math.floor((low + high) / 2)
        const rowBottom = getOffsetForIndex(mid) + getHeightForIndex(mid)
        if (rowBottom >= targetTop) {
          high = mid
        } else {
          low = mid + 1
        }
      }
      return Math.min(low, Math.max(0, pages.length - 1))
    }
    const findEndIndex = (targetBottom: number, startIndex: number) => {
      if (pages.length === 0) return 0
      let low = startIndex
      let high = pages.length
      while (low < high) {
        const mid = Math.floor((low + high) / 2)
        const rowTop = getOffsetForIndex(mid)
        if (rowTop > targetBottom) {
          high = mid
        } else {
          low = mid + 1
        }
      }
      return Math.min(pages.length, Math.max(low, startIndex + 1))
    }

    return {
      findEndIndex,
      findFirstVisibleIndex,
      getHeightForIndex,
      getOffsetForIndex,
      totalHeight: pages.length * PAGE_LIST_ROW_HEIGHT_PX + expandedHeightDelta,
    }
  }, [expandedPageIndex, pages.length])

  const virtualizedWindow = useMemo(() => {
    if (!virtualizationEnabled) {
      return {
        bottomSpacerHeight: 0,
        endIndex: pages.length,
        startIndex: 0,
        topSpacerHeight: 0,
      }
    }

    const overscanPx = PAGE_LIST_OVERSCAN_ROWS * PAGE_LIST_ROW_HEIGHT_PX
    const viewportHeight = scrollViewport.height || listMaxHeight || 0
    const windowTop = Math.max(0, scrollViewport.top - overscanPx)
    const windowBottom = scrollViewport.top + viewportHeight + overscanPx

    const boundedStartIndex = pageMetrics.findFirstVisibleIndex(windowTop)
    const boundedEndIndex = pageMetrics.findEndIndex(windowBottom, boundedStartIndex)
    const nextPageTop = boundedEndIndex < pages.length
      ? pageMetrics.getOffsetForIndex(boundedEndIndex)
      : pageMetrics.totalHeight

    return {
      bottomSpacerHeight: Math.max(0, pageMetrics.totalHeight - nextPageTop),
      endIndex: boundedEndIndex,
      startIndex: boundedStartIndex,
      topSpacerHeight: pageMetrics.getOffsetForIndex(boundedStartIndex),
    }
  }, [listMaxHeight, pageMetrics, pages.length, scrollViewport.height, scrollViewport.top, virtualizationEnabled])

  const visiblePages = virtualizationEnabled
    ? pages.slice(virtualizedWindow.startIndex, virtualizedWindow.endIndex)
    : pages

  useLayoutEffect(() => {
    if (lastRevealedActivePageIdRef.current === activePageId) return
    lastRevealedActivePageIdRef.current = activePageId

    const root = rootRef.current
    if (!root || !activePageId) return

    const scrollGapPx = 4
    const activeNode = cardRefs.current[activePageId]
    if (activeNode) {
      const rootRect = root.getBoundingClientRect()
      const activeRect = activeNode.getBoundingClientRect()
      const isAbove = activeRect.top < rootRect.top + scrollGapPx
      const isBelow = activeRect.bottom > rootRect.bottom - scrollGapPx
      if (!isAbove && !isBelow) return

      const nextTop = isAbove
        ? root.scrollTop + activeRect.top - rootRect.top - scrollGapPx
        : root.scrollTop + activeRect.bottom - rootRect.bottom + scrollGapPx
      root.scrollTo({ top: Math.max(0, nextTop), behavior: "auto" })
      return
    }

    if (!virtualizationEnabled) return
    const activePageIndex = pageIndexById.get(activePageId)
    if (activePageIndex === undefined) return
    const pageTop = pageMetrics.getOffsetForIndex(activePageIndex)
    const pageHeight = pageMetrics.getHeightForIndex(activePageIndex)

    const viewportTop = root.scrollTop
    const viewportBottom = viewportTop + root.clientHeight
    const pageBottom = pageTop + pageHeight
    if (pageTop >= viewportTop + scrollGapPx && pageBottom <= viewportBottom - scrollGapPx) return

    const nextTop = pageTop < viewportTop
      ? pageTop - scrollGapPx
      : pageBottom - root.clientHeight + scrollGapPx
    const normalizedTop = Math.max(0, nextTop)
    root.scrollTo({ top: normalizedTop, behavior: "auto" })
    setScrollViewport((current) => ({
      top: normalizedTop,
      height: current.height || root.clientHeight,
    }))
  }, [activePageId, pageIndexById, pageMetrics, virtualizationEnabled])

  const commitPageTitleDraft = (pageId: string | null = expandedPageId) => {
    if (!pageId) return
    const trimmedName = pageNameDraft.trim()
    const pageIndex = pageIndexById.get(pageId)
    const page = pageIndex === undefined ? undefined : pages[pageIndex]
    if (trimmedName.length > 0) {
      onRenamePage(pageId, trimmedName)
      return
    }
    setPageNameDraft(page?.name ?? "")
  }

  const cancelPageTitleDraft = (pageId: string | null = expandedPageId) => {
    if (!pageId) return
    const pageIndex = pageIndexById.get(pageId)
    const page = pageIndex === undefined ? undefined : pages[pageIndex]
    setPageNameDraft(page?.name ?? "")
  }

  useEffect(() => {
    if (!expandedPageId) {
      setPageNameDraft("")
      return
    }
    setPageNameDraft(expandedPageName)
    if (manualExpandedPageId !== expandedPageId) return
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
      inputRef.current?.select()
    })
  }, [expandedPageId, expandedPageName, manualExpandedPageId])

  const renderDropMarker = (index: number | null) => {
    if (dropIndicatorIndex !== index) return null
    return (
      <div className="relative h-4 shrink-0">
        <div
          className={`absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded-full ${isDarkMode ? "bg-accent" : "bg-accent"}`}
        />
      </div>
    )
  }

  const openPageControls = (pageId: string) => {
    if (expandedPageId && expandedPageId !== pageId) {
      commitPageTitleDraft(expandedPageId)
    }
    setManualExpandedPageId(pageId)
  }

  const closePageControlsToList = (pageId: string) => {
    commitPageTitleDraft(pageId)
    setManualExpandedPageId(null)
  }

  const movePage = (targetIndex: number) => {
    if (!draggingPageId) return
    const nextVisibleOrder = [...stationaryPages]
    const normalizedIndex = Math.max(0, Math.min(targetIndex, nextVisibleOrder.length))
    const draggedPageIndex = pageIndexById.get(draggingPageId)
    const draggedPage = draggedPageIndex === undefined ? undefined : pages[draggedPageIndex]
    if (!draggedPage) return
    nextVisibleOrder.splice(normalizedIndex, 0, draggedPage)
    const nextOrder = nextVisibleOrder.map((page) => page.id)
    if (nextOrder.length === pages.length && nextOrder.every((pageId, index) => pageId === pages[index]?.id)) {
      return
    }
    onPageOrderChange(nextOrder)
  }

  const updateDropIndicator = (nextIndex: number | null) => {
    dropIndicatorIndexRef.current = nextIndex
    setDropIndicatorIndex((current) => (current === nextIndex ? current : nextIndex))
  }

  const clearDragState = () => {
    setDraggingPageId(null)
    updateDropIndicator(null)
    selectionLockCleanupRef.current?.()
    selectionLockCleanupRef.current = null
  }

  const engageSelectionLock = () => {
    clearWindowSelection()
    if (selectionLockCleanupRef.current) return
    selectionLockCleanupRef.current = lockDocumentUserSelect()
  }

  const getDropIndexForPointer = (clientY: number) => {
    for (let index = 0; index < stationaryPages.length; index += 1) {
      const page = stationaryPages[index]
      const card = cardRefs.current[page.id]
      if (!card) continue
      const bounds = card.getBoundingClientRect()
      if (clientY < bounds.top + bounds.height / 2) {
        return index
      }
    }
    return stationaryPages.length
  }

  const handleListDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingPageId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    updateDropIndicator(getDropIndexForPointer(event.clientY))
  }

  const handleListDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingPageId) return
    event.preventDefault()
    event.stopPropagation()
    const targetIndex = dropIndicatorIndexRef.current
    if (targetIndex !== null) {
      movePage(targetIndex)
    }
    clearDragState()
  }

  const renderPageCard = (page: PagePanelListItem, pageIndex: number) => {
    const isActive = page.id === activePageId
    const isExpanded = expandedPageId === page.id
    const pageTitleToneClassName = isActive ? tone.accent : ""
    const isFacingPage = page.layoutMode === "facing"
    const deleteDisabled = pages.length <= 1
    const stationaryIndex = draggingPageId
      ? stationaryIndexByPageId.get(page.id) ?? null
      : pageIndex

    return (
      <Fragment key={page.id}>
        {page.id !== draggingPageId && stationaryIndex !== null && stationaryIndex > 0
          ? renderDropMarker(stationaryIndex)
          : null}
        <div
          ref={(node) => {
            cardRefs.current[page.id] = node
          }}
          draggable={!isExpanded}
          onPointerDownCapture={(event) => {
            if (isExpanded) return
            if (event.button !== 0) return
            if (isCardDragIgnoreTarget(event.target)) return
            engageSelectionLock()
          }}
          onDragStart={(event) => {
            if (isExpanded) return
            event.dataTransfer.effectAllowed = "move"
            event.dataTransfer.setData("text/plain", page.id)
            clearWindowSelection()
            onSelectPage(page.id)
            setDraggingPageId(page.id)
            updateDropIndicator(pages.findIndex((item) => item.id === page.id))
          }}
          onDragEnd={clearDragState}
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
          onClick={() => {
            onSelectPage(page.id)
          }}
          className={`flex flex-col text-xs leading-snug transition-colors ${
            draggingPageId === page.id
              ? "opacity-45"
              : ""
          } ${
            isExpanded ? "select-none" : "cursor-grab select-none"
          }`}
        >
          <div className={`${getSettingsOpenListOptionClassName(isDarkMode, isActive)} justify-between gap-3`}>
            <div className="pointer-events-none min-w-0 flex-1 select-none">
              <div className={`flex items-center gap-1.5 ${pageTitleToneClassName}`}>
                <div className="truncate text-[12px] font-normal leading-none">{page.name}</div>
              </div>
            </div>
            <div className="flex h-6 items-center gap-1">
              <button
                type="button"
                data-card-drag-ignore="true"
                aria-label={isExpanded
                  ? t("ui.panels.project.collapsePage", { name: page.name })
                  : t("ui.panels.project.expandPage", { name: page.name })}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors ${tone.close}`}
                onClick={(event) => {
                  event.stopPropagation()
                  if (isExpanded) {
                    closePageControlsToList(page.id)
                    return
                  }
                  openPageControls(page.id)
                }}
              >
                <ChevronUp className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : "rotate-90"}`} />
              </button>
              {isFacingPage ? (
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-sm ${tone.accent}`}
                  aria-label={t("ui.panels.project.facingPages")}
                >
                  <BookOpen className="h-3.5 w-3.5" strokeWidth={1.9} />
                </span>
              ) : null}
              <button
                type="button"
                data-card-drag-ignore="true"
                aria-label={t("ui.panels.project.deletePage", { name: page.name })}
                disabled={deleteDisabled}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors ${
                  deleteDisabled
                    ? "cursor-not-allowed text-muted-foreground/60"
                    : `${tone.close} hover:text-error`
                }`}
                onClick={(event) => {
                  event.stopPropagation()
                  if (deleteDisabled) return
                  onRequestNotice?.({
                    title: t("ui.panels.project.deletePageTitle"),
                    message: t("ui.panels.project.deletePageMessage", { name: page.name }),
                    onConfirm: () => {
                      onDeletePage(page.id)
                    },
                  })
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {isExpanded ? (
            <div
              data-card-drag-ignore="true"
              className={`px-2 pb-2 pt-1 ${tone.expandedControls}`}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-x-3 py-1">
                <span className={`text-[10px] font-semibold uppercase leading-none tracking-[0.08em] ${tone.accent}`}>
                  {t("ui.panels.project.metadata.title")}
                </span>
                <input
                  ref={inputRef}
                  data-card-drag-ignore="true"
                  value={pageNameDraft}
                  onChange={(event) => setPageNameDraft(event.target.value)}
                  onBlur={() => commitPageTitleDraft(page.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      commitPageTitleDraft(page.id)
                      event.currentTarget.blur()
                    }
                    if (event.key === "Escape") {
                      event.preventDefault()
                      cancelPageTitleDraft(page.id)
                      event.currentTarget.blur()
                    }
                  }}
                  className={renameInputClassName}
                />
              </div>
              <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-x-3 py-1">
                <span className={`text-[10px] font-semibold uppercase leading-none tracking-[0.08em] ${tone.accent}`}>
                  {t("ui.panels.project.facingPages")}
                </span>
                <div className="flex justify-end">
                  <button
                    type="button"
                    data-card-drag-ignore="true"
                    role="checkbox"
                    aria-checked={isFacingPage}
                    aria-label={t("ui.panels.project.toggleFacingPages", { name: page.name })}
                    className={`rounded-sm p-1 transition-colors ${tone.close}`}
                    onClick={() => {
                      onFacingPageToggle(page.id, !isFacingPage)
                    }}
                  >
                    {isFacingPage ? <Check className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Fragment>
    )
  }

  return (
    <div
      ref={rootRef}
      data-page-list-scroll-root="true"
      className="overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      style={listMaxHeight === null ? undefined : { maxHeight: `${listMaxHeight}px` }}
      onDragOver={handleListDragOver}
      onDrop={handleListDrop}
    >
      <div className={`flex flex-col ${pageListClassName}`}>
        <div
          className={draggingPageId ? "relative h-5 shrink-0" : "hidden"}
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
        >
          {renderDropMarker(0)}
        </div>
        {virtualizedWindow.topSpacerHeight > 0 ? (
          <div style={{ height: `${virtualizedWindow.topSpacerHeight}px` }} aria-hidden="true" />
        ) : null}
        {visiblePages.map((page, index) => renderPageCard(page, virtualizedWindow.startIndex + index))}
        {virtualizedWindow.bottomSpacerHeight > 0 ? (
          <div style={{ height: `${virtualizedWindow.bottomSpacerHeight}px` }} aria-hidden="true" />
        ) : null}
        <div
          className={draggingPageId ? "relative h-5 shrink-0" : "hidden"}
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
        >
          {renderDropMarker(stationaryPages.length)}
        </div>
      </div>
    </div>
  )
}
