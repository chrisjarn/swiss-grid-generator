"use client"

import { BookOpen, Check, ChevronUp, File, LoaderCircle, Pencil, Square, Trash2 } from "lucide-react"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"

import { ProjectPageLayersList } from "@/components/sidebar/ProjectPageLayersList"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { ProjectPage } from "@/lib/document-session"
import {
  clearWindowSelection,
  isCardDragIgnoreTarget,
  lockDocumentUserSelect,
} from "@/lib/sidebar-card-drag"
import { getNeutralFormControlClassName } from "@/components/ui/popup-styles"
import { SectionHeaderRow } from "@/components/ui/section-header-row"
import { PAGE_KEYBOARD_GUI_SETTLE_DELAY_MS } from "@/hooks/useSettledPageKeyboardNavigation"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"

type PreviewLayoutState = SharedPreviewLayoutState<string, string, string>
type TransientExpandedReason = "editor" | "keyboard" | "paragraph" | "preview-hover"

const PAGE_VIRTUALIZATION_THRESHOLD = 80
const PAGE_VIRTUALIZATION_OVERSCAN = 8
const DEFAULT_PAGE_CARD_HEIGHT = 50
const DEFAULT_EXPANDED_PAGE_CARD_HEIGHT = 320
const KEYBOARD_PAGE_SETTLE_DELAY_MS = PAGE_KEYBOARD_GUI_SETTLE_DELAY_MS
const KEYBOARD_PAGE_EXPAND_DELAY_MS = 500
const PAGE_HEADER_SCROLL_TOP_OFFSET_PX = 0

type Props = {
  pages: ProjectPage<PreviewLayoutState>[]
  activePage: ProjectPage<PreviewLayoutState> | null
  activePageId: string
  activePageFocusRequest?: {
    token: number
    pageId: string | null
  }
  onSelectPage: (pageId: string) => void
  onFacingPageToggle: (pageId: string, enabled: boolean) => void
  onRenamePage: (pageId: string, nextName: string) => void
  onDeletePage: (pageId: string) => void
  onRequestNotice?: (notice: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm?: () => void
    onCancel?: () => void
  }) => void
  onPageOrderChange: (orderedIds: string[]) => void
  baseFont: string
  imageColorScheme: ImageColorSchemeId
  selectedLayerKey: string | null
  hoveredLayerKey: string | null
  previewHoveredLayerKey: string | null
  editingLayerKey: string | null
  editorMode: "text" | "image" | null
  previewEditorOpenToken: number
  previewParagraphCreateToken: number
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onSelectedLayerKeyChange: (key: string | null) => void
  onHoverLayerChange: (key: string | null) => void
  onLayerEditorToggle: (target: string) => void
  onLayerLockToggle: (target: string, locked: boolean) => void
  onPageLayerLockToggle: (pageId: string, locked: boolean) => void
  onLayerDelete: (target: string, kind: "text" | "image") => void
  isDarkMode?: boolean
}

export function PagesPanel({
  pages,
  activePage,
  activePageId,
  activePageFocusRequest = { token: 0, pageId: null },
  onSelectPage,
  onFacingPageToggle,
  onRenamePage,
  onDeletePage,
  onRequestNotice,
  onPageOrderChange,
  baseFont,
  imageColorScheme,
  selectedLayerKey,
  hoveredLayerKey,
  previewHoveredLayerKey,
  editingLayerKey,
  editorMode,
  previewEditorOpenToken,
  previewParagraphCreateToken,
  onLayerOrderChange,
  onSelectedLayerKeyChange,
  onHoverLayerChange,
  onLayerEditorToggle,
  onLayerLockToggle,
  onPageLayerLockToggle,
  onLayerDelete,
  isDarkMode = false,
}: Props) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [pageNameDraft, setPageNameDraft] = useState("")
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const [previewHoverFocusToken, setPreviewHoverFocusToken] = useState(0)
  const [manualExpandedPageId, setManualExpandedPageId] = useState<string | null>(null)
  const [transientExpandedPageId, setTransientExpandedPageId] = useState<string | null>(null)
  const [transientExpandedReason, setTransientExpandedReason] = useState<TransientExpandedReason | null>(null)
  const [scheduledKeyboardFocusRequest, setScheduledKeyboardFocusRequest] = useState<{
    token: number
    pageId: string
  } | null>(null)
  const [deferredPreviewHoveredLayerKey, setDeferredPreviewHoveredLayerKey] = useState<string | null>(null)
  const [scrollViewport, setScrollViewport] = useState({ top: 0, height: 0 })
  const [measuredPageHeights, setMeasuredPageHeights] = useState<Record<string, number>>({})
  const previousPageIdsRef = useRef<string[]>(pages.map((page) => page.id))
  const pendingScrollTargetRef = useRef<{ pageId: string } | null>(null)
  const lastPreviewEditorOpenTokenRef = useRef(0)
  const lastActivePageFocusTokenRef = useRef(0)
  const keyboardSettleTimeoutRef = useRef<number | null>(null)
  const keyboardExpandTimeoutRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dropIndicatorIndexRef = useRef<number | null>(null)
  const selectionLockCleanupRef = useRef<(() => void) | null>(null)

  const expandedPageId = transientExpandedPageId
    ?? manualExpandedPageId
    ?? (pages.length <= 1 ? activePageId : null)

  useEffect(() => {
    if (!editingPageId) return
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [editingPageId])

  useEffect(() => {
    if (manualExpandedPageId === null) return
    if (pages.some((page) => page.id === manualExpandedPageId)) return
    setManualExpandedPageId(null)
  }, [manualExpandedPageId, pages])

  useEffect(() => {
    if (transientExpandedPageId === null) return
    if (pages.some((page) => page.id === transientExpandedPageId)) return
    setTransientExpandedPageId(null)
    setTransientExpandedReason(null)
  }, [pages, transientExpandedPageId])

  useEffect(() => {
    const previousPageIds = previousPageIdsRef.current
    const currentPageIds = pages.map((page) => page.id)
    const pageWasAdded = currentPageIds.length > previousPageIds.length
    const activePageIsNew = !previousPageIds.includes(activePageId) && currentPageIds.includes(activePageId)

    if (pageWasAdded && activePageIsNew) {
      if (currentPageIds.length <= 1) {
        pendingScrollTargetRef.current = { pageId: activePageId }
        setTransientExpandedPageId(activePageId)
        setTransientExpandedReason("paragraph")
      } else {
        setTransientExpandedPageId(null)
        setTransientExpandedReason(null)
      }
    }

    previousPageIdsRef.current = currentPageIds
  }, [activePageId, pages])

  useEffect(() => {
    if (previewParagraphCreateToken === 0) return
    pendingScrollTargetRef.current = { pageId: activePageId }
    setTransientExpandedPageId(activePageId)
    setTransientExpandedReason("paragraph")
  }, [activePageId, previewParagraphCreateToken])

  useEffect(() => {
    if (!previewHoveredLayerKey) {
      setDeferredPreviewHoveredLayerKey(null)
      if (transientExpandedReason === "preview-hover") {
        setTransientExpandedPageId(null)
        setTransientExpandedReason(null)
      }
      return
    }
    pendingScrollTargetRef.current = { pageId: activePageId }
    setPreviewHoverFocusToken((current) => current + 1)
    setDeferredPreviewHoveredLayerKey(previewHoveredLayerKey)
    if (expandedPageId === activePageId) return
    setTransientExpandedPageId(activePageId)
    setTransientExpandedReason("preview-hover")
  }, [activePageId, expandedPageId, previewHoveredLayerKey, transientExpandedReason])

  useEffect(() => {
    if (previewEditorOpenToken === 0) return
    if (lastPreviewEditorOpenTokenRef.current === previewEditorOpenToken) return
    lastPreviewEditorOpenTokenRef.current = previewEditorOpenToken

    if (expandedPageId === activePageId) return
    pendingScrollTargetRef.current = { pageId: activePageId }
    setTransientExpandedPageId(activePageId)
    setTransientExpandedReason("editor")
  }, [activePageId, expandedPageId, previewEditorOpenToken])

  useEffect(() => {
    const nextToken = activePageFocusRequest.token
    const nextPageId = activePageFocusRequest.pageId
    if (nextToken === 0 || !nextPageId) return
    if (lastActivePageFocusTokenRef.current === nextToken) return
    lastActivePageFocusTokenRef.current = nextToken
    setScheduledKeyboardFocusRequest(null)
    if (keyboardSettleTimeoutRef.current !== null) {
      window.clearTimeout(keyboardSettleTimeoutRef.current)
      keyboardSettleTimeoutRef.current = null
    }
    if (keyboardExpandTimeoutRef.current !== null) {
      window.clearTimeout(keyboardExpandTimeoutRef.current)
      keyboardExpandTimeoutRef.current = null
    }
    keyboardSettleTimeoutRef.current = window.setTimeout(() => {
      if (transientExpandedReason === "keyboard") {
        setTransientExpandedPageId(null)
        setTransientExpandedReason(null)
      }
      setScheduledKeyboardFocusRequest({ token: nextToken, pageId: nextPageId })
      keyboardSettleTimeoutRef.current = null
    }, KEYBOARD_PAGE_SETTLE_DELAY_MS)
  }, [activePageFocusRequest, transientExpandedReason])

  useEffect(() => {
    if (!scheduledKeyboardFocusRequest) return
    pendingScrollTargetRef.current = { pageId: scheduledKeyboardFocusRequest.pageId }
    if (keyboardExpandTimeoutRef.current !== null) {
      window.clearTimeout(keyboardExpandTimeoutRef.current)
      keyboardExpandTimeoutRef.current = null
    }
    keyboardExpandTimeoutRef.current = window.setTimeout(() => {
      pendingScrollTargetRef.current = { pageId: scheduledKeyboardFocusRequest.pageId }
      setTransientExpandedPageId(scheduledKeyboardFocusRequest.pageId)
      setTransientExpandedReason("keyboard")
      setScheduledKeyboardFocusRequest(null)
      keyboardExpandTimeoutRef.current = null
    }, KEYBOARD_PAGE_EXPAND_DELAY_MS)
  }, [scheduledKeyboardFocusRequest])

  useEffect(() => {
    if (editorMode !== null) return
    if (transientExpandedReason !== "editor") return
    setTransientExpandedPageId(null)
    setTransientExpandedReason(null)
  }, [editorMode, transientExpandedReason])

  useEffect(() => {
    if (transientExpandedPageId === null) return
    if (transientExpandedPageId === activePageId) return
    if (transientExpandedReason === "editor") return
    if (transientExpandedReason === "keyboard") return
    setTransientExpandedPageId(null)
    setTransientExpandedReason(null)
  }, [activePageId, transientExpandedPageId, transientExpandedReason])

  const virtualizationEnabled = pages.length >= PAGE_VIRTUALIZATION_THRESHOLD
    && editingPageId === null
    && draggingPageId === null

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const scrollRoot = root.closest("[data-help-scroll-root='true']") as HTMLElement | null
    if (!scrollRoot) return

    const updateViewport = () => {
      const rootRect = root.getBoundingClientRect()
      const scrollRootRect = scrollRoot.getBoundingClientRect()
      const rootTopInScroll = rootRect.top - scrollRootRect.top + scrollRoot.scrollTop
      const relativeTop = Math.max(0, scrollRoot.scrollTop - rootTopInScroll)
      setScrollViewport({
        top: relativeTop,
        height: scrollRoot.clientHeight,
      })
    }

    updateViewport()
    scrollRoot.addEventListener("scroll", updateViewport, { passive: true })
    window.addEventListener("resize", updateViewport)
    return () => {
      scrollRoot.removeEventListener("scroll", updateViewport)
      window.removeEventListener("resize", updateViewport)
    }
  }, [virtualizationEnabled])

  const pageMetrics = useMemo(() => {
    const offsets = new Map<string, number>()
    const heights = new Map<string, number>()
    let runningTop = 0
    for (const page of pages) {
      const measuredHeight = measuredPageHeights[page.id]
      const estimatedHeight = measuredHeight ?? (
        expandedPageId === page.id ? DEFAULT_EXPANDED_PAGE_CARD_HEIGHT : DEFAULT_PAGE_CARD_HEIGHT
      )
      offsets.set(page.id, runningTop)
      heights.set(page.id, estimatedHeight)
      runningTop += estimatedHeight
    }
    return {
      offsets,
      heights,
      totalHeight: runningTop,
    }
  }, [expandedPageId, measuredPageHeights, pages])

  useEffect(() => {
    const pendingScrollTarget = pendingScrollTargetRef.current
    if (!pendingScrollTarget) return
    const targetPageId = pendingScrollTarget.pageId
    const root = rootRef.current
    if (!root) return
    const scrollRoot = root.closest("[data-help-scroll-root='true']") as HTMLElement | null
    if (!scrollRoot) return

    const target = cardRefs.current[targetPageId]
    if (!target && virtualizationEnabled) {
      const targetTop = pageMetrics.offsets.get(targetPageId)
      if (targetTop === undefined) return
      const nextTop = Math.max(0, targetTop - PAGE_HEADER_SCROLL_TOP_OFFSET_PX)
      const rootRect = root.getBoundingClientRect()
      const scrollRootRect = scrollRoot.getBoundingClientRect()
      const rootTopInScroll = rootRect.top - scrollRootRect.top + scrollRoot.scrollTop
      const absoluteTop = rootTopInScroll + nextTop
      window.requestAnimationFrame(() => {
        scrollRoot.scrollTo({ top: absoluteTop, behavior: "smooth" })
      })
      pendingScrollTargetRef.current = null
      return
    }
    if (!target) return

    const scrollRootRect = scrollRoot.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const nextTop = scrollRoot.scrollTop + (targetRect.top - scrollRootRect.top - PAGE_HEADER_SCROLL_TOP_OFFSET_PX)

    window.requestAnimationFrame(() => {
      scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
    })
    pendingScrollTargetRef.current = null
  }, [pageMetrics, previewHoverFocusToken, scheduledKeyboardFocusRequest, scrollViewport.height, virtualizationEnabled])

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
      if (keyboardSettleTimeoutRef.current !== null) {
        window.clearTimeout(keyboardSettleTimeoutRef.current)
        keyboardSettleTimeoutRef.current = null
      }
      if (keyboardExpandTimeoutRef.current !== null) {
        window.clearTimeout(keyboardExpandTimeoutRef.current)
        keyboardExpandTimeoutRef.current = null
      }
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }
  ), [])

  const tone = isDarkMode
    ? {
        row: "border-[#313A47] text-[#F4F6F8] hover:bg-[#232A35]",
        rowMuted: "text-[#8D98AA]",
        close: "text-[#A8B1BF] hover:bg-[#232A35] hover:text-[#F4F6F8]",
        accent: "text-swiss-orange-soft",
      }
    : {
        row: "border-gray-200 text-gray-900 hover:bg-gray-100",
        rowMuted: "text-gray-500",
        close: "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
        accent: "text-swiss-orange",
      }
  const renameInputClassName = getNeutralFormControlClassName(isDarkMode, "h-6 w-full rounded-sm px-2 text-[12px] leading-none")

  const stationaryPages = useMemo(
    () => pages.filter((page) => page.id !== draggingPageId),
    [draggingPageId, pages],
  )
  const stationaryIndexByPageId = useMemo(
    () => new Map(stationaryPages.map((page, index) => [page.id, index])),
    [stationaryPages],
  )
  const virtualizedWindow = useMemo(() => {
    if (!virtualizationEnabled) {
      return {
        startIndex: 0,
        endIndex: pages.length,
      }
    }

    const overscanPx = PAGE_VIRTUALIZATION_OVERSCAN * DEFAULT_PAGE_CARD_HEIGHT
    const windowTop = Math.max(0, scrollViewport.top - overscanPx)
    const windowBottom = scrollViewport.top + scrollViewport.height + overscanPx

    let startIndex = 0
    while (startIndex < pages.length) {
      const page = pages[startIndex]
      if (!page) break
      const pageTop = pageMetrics.offsets.get(page.id) ?? 0
      const pageHeight = pageMetrics.heights.get(page.id) ?? DEFAULT_PAGE_CARD_HEIGHT
      if (pageTop + pageHeight >= windowTop) break
      startIndex += 1
    }

    let endIndex = startIndex
    while (endIndex < pages.length) {
      const page = pages[endIndex]
      if (!page) break
      const pageTop = pageMetrics.offsets.get(page.id) ?? 0
      if (pageTop > windowBottom) break
      endIndex += 1
    }

    return {
      startIndex: Math.max(0, startIndex),
      endIndex: Math.min(pages.length, Math.max(endIndex, startIndex + 1)),
    }
  }, [pageMetrics, pages, scrollViewport.height, scrollViewport.top, virtualizationEnabled])

  const virtualizedStartIndex = virtualizedWindow.startIndex
  const virtualizedEndIndex = virtualizedWindow.endIndex
  const visiblePages = virtualizationEnabled
    ? pages.slice(virtualizedStartIndex, virtualizedEndIndex)
    : pages
  const topSpacerHeight = virtualizationEnabled
    ? (pageMetrics.offsets.get(pages[virtualizedStartIndex]?.id ?? "") ?? 0)
    : 0
  const bottomSpacerHeight = virtualizationEnabled
    ? Math.max(
      0,
      pageMetrics.totalHeight - (pageMetrics.offsets.get(pages[virtualizedEndIndex]?.id ?? "") ?? pageMetrics.totalHeight),
    )
    : 0

  const beginRename = (page: ProjectPage<PreviewLayoutState>) => {
    setEditingPageId(page.id)
    setPageNameDraft(page.name)
  }

  const cancelRename = () => {
    setEditingPageId(null)
    setPageNameDraft("")
  }

  const commitRename = () => {
    if (!editingPageId) return
    const trimmedName = pageNameDraft.trim()
    if (trimmedName.length > 0) {
      onRenamePage(editingPageId, trimmedName)
    }
    cancelRename()
  }

  const renderDropMarker = (index: number | null) => {
    if (dropIndicatorIndex !== index) return null
    return (
      <div className="relative h-4 shrink-0">
        <div
          className={`absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded-full ${isDarkMode ? "bg-blue-400" : "bg-blue-500"}`}
        />
      </div>
    )
  }

  const movePage = (targetIndex: number) => {
    if (!draggingPageId) return
    const nextVisibleOrder = [...stationaryPages]
    const normalizedIndex = Math.max(0, Math.min(targetIndex, nextVisibleOrder.length))
    const draggedPage = pages.find((page) => page.id === draggingPageId)
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

  const renderPageCard = (page: ProjectPage<PreviewLayoutState>) => {
    const resolvedPage = activePage?.id === page.id ? activePage : page
    const isActive = page.id === activePageId
    const isEditing = page.id === editingPageId
    const isExpanded = expandedPageId === page.id
    const isWaitingForKeyboardExpand = scheduledKeyboardFocusRequest?.pageId === page.id && !isExpanded
    const pageTitleToneClassName = isWaitingForKeyboardExpand
      ? tone.rowMuted
      : isActive
        ? tone.accent
        : ""
    const isFacingPage = resolvedPage.layoutMode === "facing"
    const deleteDisabled = pages.length <= 1
    const stationaryIndex = stationaryIndexByPageId.get(page.id) ?? null

    return (
      <Fragment key={page.id}>
        {page.id !== draggingPageId && stationaryIndex !== null && stationaryIndex > 0
          ? renderDropMarker(stationaryIndex)
          : null}
        <div
          ref={(node) => {
            cardRefs.current[page.id] = node
            if (!node) return
            if (Math.abs((measuredPageHeights[page.id] ?? 0) - node.offsetHeight) > 1) {
              setMeasuredPageHeights((current) => (
                current[page.id] === node.offsetHeight
                  ? current
                  : {
                    ...current,
                    [page.id]: node.offsetHeight,
                  }
              ))
            }
          }}
          draggable={!isEditing && !isExpanded}
          onPointerDownCapture={(event) => {
            if (isEditing || isExpanded) return
            if (event.button !== 0) return
            if (isCardDragIgnoreTarget(event.target)) return
            engageSelectionLock()
          }}
          onDragStart={(event) => {
            if (isEditing || isExpanded) return
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
            if (isEditing) return
            onSelectPage(page.id)
          }}
          onDoubleClick={() => {
            if (isEditing) return
            onSelectPage(page.id)
            if (isExpanded) {
              setManualExpandedPageId(null)
              setTransientExpandedPageId(null)
              setTransientExpandedReason(null)
              return
            }
            pendingScrollTargetRef.current = { pageId: page.id }
            setManualExpandedPageId(page.id)
            setTransientExpandedPageId(null)
            setTransientExpandedReason(null)
          }}
          className={`flex min-h-[50px] flex-col border-t text-xs leading-snug transition-colors ${tone.row} ${
            draggingPageId === page.id
              ? "opacity-45"
              : ""
          } ${
            isEditing || isExpanded ? "select-none" : "cursor-grab select-none"
          }`}
        >
          <div className="flex min-h-[50px] items-center justify-between gap-3 px-4 md:px-6">
            <div className={`min-w-0 flex-1 ${isEditing ? "" : "pointer-events-none select-none"}`}>
              {isEditing ? (
                <input
                  ref={inputRef}
                  data-card-drag-ignore="true"
                  value={pageNameDraft}
                  onChange={(event) => setPageNameDraft(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      commitRename()
                    }
                    if (event.key === "Escape") {
                      event.preventDefault()
                      cancelRename()
                    }
                  }}
                  className={renameInputClassName}
                />
              ) : (
                <div className={`flex items-center gap-1.5 ${pageTitleToneClassName}`}>
                  {isFacingPage ? (
                    <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                  ) : (
                    <File className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                  )}
                  <div className="truncate text-[12px] font-medium leading-none">{page.name}</div>
                </div>
              )}
            </div>
            <div className="flex h-6 items-center gap-1">
              {isWaitingForKeyboardExpand ? (
                <div className="inline-flex h-6 w-6 items-center justify-center">
                  <LoaderCircle
                    className={`h-3 w-3 animate-spin ${tone.rowMuted}`}
                    strokeWidth={2}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  data-card-drag-ignore="true"
                  aria-label={isExpanded ? `Collapse ${page.name}` : `Expand ${page.name}`}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors ${tone.close}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (isExpanded) {
                      setManualExpandedPageId(null)
                      setTransientExpandedPageId(null)
                      setTransientExpandedReason(null)
                      return
                    }
                    pendingScrollTargetRef.current = { pageId: page.id }
                    setManualExpandedPageId(page.id)
                    setTransientExpandedPageId(null)
                    setTransientExpandedReason(null)
                  }}
                >
                  <ChevronUp className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : "rotate-90"}`} />
                </button>
              )}
              <button
                type="button"
                data-card-drag-ignore="true"
                aria-label={`Rename ${page.name}`}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors ${tone.close}`}
                onClick={(event) => {
                  event.stopPropagation()
                  beginRename(page)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-card-drag-ignore="true"
                aria-label={`Delete ${page.name}`}
                disabled={deleteDisabled}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors ${
                  deleteDisabled
                    ? "cursor-not-allowed text-gray-400/60"
                    : `${tone.close} hover:text-red-500`
                }`}
                onClick={(event) => {
                  event.stopPropagation()
                  if (deleteDisabled) return
                  onRequestNotice?.({
                    title: "Delete Page",
                    message: `Delete ${page.name}?`,
                    confirmLabel: "Delete",
                    cancelLabel: "Cancel",
                    onConfirm: () => {
                      cancelRename()
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
            <div data-card-drag-ignore="true" className="px-4 pb-4 md:px-6">
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${tone.rowMuted}`}>
                  Facing Pages
                </span>
                <button
                  type="button"
                  data-card-drag-ignore="true"
                  role="checkbox"
                  aria-checked={isFacingPage}
                  aria-label={`Toggle facing pages for ${page.name}`}
                  className={`rounded-sm p-1 transition-colors ${tone.close}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onFacingPageToggle(page.id, !isFacingPage)
                  }}
                >
                  {isFacingPage ? <Check className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                </button>
              </div>
              <SectionHeaderRow label="Layers" className="mt-3" />
              <div
                data-page-layers-scroll-root="true"
                className="mt-2 max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain pr-1"
              >
                <ProjectPageLayersList
                  pageId={page.id}
                  layout={resolvedPage.previewLayout}
                  baseFont={baseFont}
                  imageColorScheme={imageColorScheme}
                  selectedLayerKey={isActive ? selectedLayerKey : null}
                  hoveredLayerKey={isActive ? hoveredLayerKey : null}
                  previewHoveredLayerKey={isActive && isExpanded ? deferredPreviewHoveredLayerKey : null}
                  editingLayerKey={isActive ? editingLayerKey : null}
                  isActivePage={isActive}
                  onSelectPage={onSelectPage}
                  onLayerOrderChange={onLayerOrderChange}
                  onSelectLayer={onSelectedLayerKeyChange}
                  onHoverLayerChange={onHoverLayerChange}
                  onToggleEditor={onLayerEditorToggle}
                  onToggleLock={onLayerLockToggle}
                  onToggleAllLocks={onPageLayerLockToggle}
                  onDeleteLayer={onLayerDelete}
                  isDarkMode={isDarkMode}
                />
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
      className="flex flex-col pb-4 md:pb-6"
      onDragOver={handleListDragOver}
      onDrop={handleListDrop}
    >
      <div
        className={draggingPageId ? "relative h-5 shrink-0" : "hidden"}
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        {renderDropMarker(0)}
      </div>
      {topSpacerHeight > 0 ? <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" /> : null}
      {visiblePages.map(renderPageCard)}
      {bottomSpacerHeight > 0 ? <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" /> : null}
      <div
        className={draggingPageId ? "relative h-5 shrink-0" : "hidden"}
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        {renderDropMarker(stationaryPages.length)}
      </div>
    </div>
  )
}
