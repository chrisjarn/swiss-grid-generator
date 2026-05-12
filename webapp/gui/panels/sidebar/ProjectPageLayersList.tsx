"use client"

import { Lock, LockOpen, Trash2 } from "lucide-react"
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"

import {
  getDefaultTextSchemeColor,
  isImagePlaceholderColor,
  resolveImageSchemeColor,
  type ImageColorSchemeId,
} from "@/core/config/color-schemes"
import { getFontFamilyCss } from "@/core/config/fonts"
import { normalizeImagePlaceholderOpacity } from "@/core/layout/image-placeholder-opacity"
import {
  clearWindowSelection,
  isCardDragIgnoreTarget,
  lockDocumentUserSelect,
} from "@/gui/panels/sidebar/lib/sidebar-card-drag"
import {
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
} from "@/gui/panels/settings/settings-panel-styles"
import { getTextLayerDisplayName } from "@/gui/panels/sidebar/lib/layer-display-name"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/core/types/preview-layout"
import { useTranslation } from "@/lib/i18n/useTranslation"

type PreviewLayoutState = SharedPreviewLayoutState<string, string, string>

type Props = {
  pageId: string
  layout: PreviewLayoutState | null
  imageColorScheme: ImageColorSchemeId
  selectedLayerKey: string | null
  hoveredLayerKey: string | null
  previewHoveredLayerKey: string | null
  editingLayerKey: string | null
  isActivePage: boolean
  onSelectPage: (pageId: string) => void
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onSelectLayer: (key: string | null) => void
  onHoverLayerChange: (key: string | null) => void
  onToggleEditor: (key: string) => void
  onToggleLock: (key: string, locked: boolean) => void
  onToggleAllLocks: (pageId: string, locked: boolean) => void
  onDeleteLayer: (key: string, kind: "text" | "image") => void
  isDarkMode?: boolean
}

type LayerThumb = {
  key: string
  kind: "text" | "image"
  textPreview: string
  color: string
  opacity: number
}

const LAYER_TITLE_FONT_FAMILY = getFontFamilyCss("Inter")
const LOCK_BUTTON_DOUBLE_CLICK_WINDOW_MS = 320
const MIN_LAYER_LIST_MAX_HEIGHT_PX = 84
const LAYER_LIST_BOTTOM_GAP_PX = 16

function reconcileLayerOrder(
  current: readonly string[],
  blockOrder: readonly string[],
  imageOrder: readonly string[],
): string[] {
  const validKeys = new Set<string>([...imageOrder, ...blockOrder])
  const next: string[] = []
  const seen = new Set<string>()

  for (const key of current) {
    if (!validKeys.has(key) || seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of imageOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of blockOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  return next
}

export function ProjectPageLayersList({
  pageId,
  layout,
  imageColorScheme,
  selectedLayerKey,
  hoveredLayerKey,
  previewHoveredLayerKey,
  editingLayerKey,
  isActivePage,
  onSelectPage,
  onLayerOrderChange,
  onSelectLayer,
  onHoverLayerChange,
  onToggleEditor,
  onToggleLock,
  onToggleAllLocks,
  onDeleteLayer,
  isDarkMode = false,
}: Props) {
  const { t } = useTranslation()
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const [listMaxHeight, setListMaxHeight] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dropIndicatorIndexRef = useRef<number | null>(null)
  const selectionLockCleanupRef = useRef<(() => void) | null>(null)
  const lastLockButtonClickRef = useRef<{ key: string; targetLocked: boolean; timeStamp: number } | null>(null)
  const layerScrollFrameRef = useRef<number | null>(null)

  const blockOrder = useMemo(() => layout?.blockOrder ?? [], [layout?.blockOrder])
  const imageOrder = useMemo(() => layout?.imageOrder ?? [], [layout?.imageOrder])
  const layerOrder = useMemo(
    () => reconcileLayerOrder(layout?.layerOrder ?? [], blockOrder, imageOrder),
    [blockOrder, imageOrder, layout?.layerOrder],
  )

  const thumbs = useMemo(() => {
    const next = new Map<string, LayerThumb>()
    const defaultTextColor = getDefaultTextSchemeColor(imageColorScheme)
    for (const key of blockOrder) {
      const rawText = layout?.textContent?.[key] ?? ""
      const rawColor = layout?.blockTextColors?.[key]
      next.set(key, {
        key,
        kind: "text",
        textPreview: getTextLayerDisplayName(rawText, t("ui.panels.project.layersList.emptyParagraph")),
        color: typeof rawColor === "string" && isImagePlaceholderColor(rawColor)
          ? rawColor.toLowerCase()
          : defaultTextColor,
        opacity: 1,
      })
    }
    for (const key of imageOrder) {
      const rawColor = layout?.imageColors?.[key]
      next.set(key, {
        key,
        kind: "image",
        textPreview: "",
        color: resolveImageSchemeColor(rawColor, imageColorScheme),
        opacity: normalizeImagePlaceholderOpacity(layout?.imageOpacities?.[key]),
      })
    }
    return next
  }, [blockOrder, imageColorScheme, imageOrder, layout, t])

  const visibleOrder = useMemo(() => [...layerOrder].reverse(), [layerOrder])
  const visibleThumbs = visibleOrder
    .map((key) => thumbs.get(key))
    .filter((thumb): thumb is LayerThumb => Boolean(thumb))
  const stationaryVisibleOrder = useMemo(
    () => visibleOrder.filter((key) => key !== draggingKey),
    [draggingKey, visibleOrder],
  )
  const stationaryIndexByKey = useMemo(
    () => new Map(stationaryVisibleOrder.map((key, index) => [key, index])),
    [stationaryVisibleOrder],
  )
  const scrollLayerCardIntoView = useCallback((layerKey: string, align: ScrollLogicalPosition = "nearest") => {
    const target = cardRefs.current[layerKey]
    if (!target) return
    const scrollRoot = (
      target.closest("[data-page-layers-scroll-root='true']")
      ?? target.closest("[data-help-scroll-root='true']")
    ) as HTMLElement | null
    if (!scrollRoot) return

    const topGapPx = 12
    const bottomGapPx = 12
    const rootRect = scrollRoot.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (align === "center") {
      const nextTop = scrollRoot.scrollTop
        + (targetRect.top - rootRect.top)
        - (rootRect.height - targetRect.height) / 2
      scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
      return
    }

    const isAbove = targetRect.top < rootRect.top + topGapPx
    const isBelow = targetRect.bottom > rootRect.bottom - bottomGapPx
    if (!isAbove && !isBelow) return

    const nextTop = isAbove
      ? scrollRoot.scrollTop + (targetRect.top - rootRect.top) - topGapPx
      : scrollRoot.scrollTop + (targetRect.bottom - rootRect.bottom) + bottomGapPx

    window.requestAnimationFrame(() => {
      scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
    })
  }, [])

  const scheduleLayerCardScroll = useCallback((layerKey: string, align?: ScrollLogicalPosition) => {
    if (layerScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(layerScrollFrameRef.current)
    }
    layerScrollFrameRef.current = window.requestAnimationFrame(() => {
      layerScrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollLayerCardIntoView(layerKey, align)
        layerScrollFrameRef.current = null
      })
    })
  }, [scrollLayerCardIntoView])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    let frameId: number | null = null
    const updateListMaxHeight = () => {
      const bounds = root.getBoundingClientRect()
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const nextMaxHeight = Math.max(
        MIN_LAYER_LIST_MAX_HEIGHT_PX,
        Math.floor(viewportHeight - bounds.top - LAYER_LIST_BOTTOM_GAP_PX),
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
  }, [visibleThumbs.length])

  useEffect(() => {
    if (!selectedLayerKey || !isActivePage) return
    scheduleLayerCardScroll(selectedLayerKey)
  }, [isActivePage, scheduleLayerCardScroll, selectedLayerKey])

  useEffect(() => {
    if (!previewHoveredLayerKey || !isActivePage) return
    scheduleLayerCardScroll(previewHoveredLayerKey, "center")
  }, [isActivePage, previewHoveredLayerKey, scheduleLayerCardScroll, visibleOrder])

  useEffect(() => {
    const releaseOnMouseUp = () => {
      if (draggingKey) return
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }

    window.addEventListener("mouseup", releaseOnMouseUp)
    window.addEventListener("blur", releaseOnMouseUp)
    return () => {
      window.removeEventListener("mouseup", releaseOnMouseUp)
      window.removeEventListener("blur", releaseOnMouseUp)
    }
  }, [draggingKey])

  useEffect(() => (
    () => {
      if (layerScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(layerScrollFrameRef.current)
        layerScrollFrameRef.current = null
      }
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }
  ), [])

  const tone = isDarkMode
    ? {
        rowMuted: "text-muted-foreground",
        empty: "text-muted-foreground",
      }
    : {
        rowMuted: "text-muted-foreground",
        empty: "text-muted-foreground",
      }
  const layerListClassName = getSettingsOpenListClassName(isDarkMode)

  const moveLayer = (targetIndex: number) => {
    if (!draggingKey || !isActivePage) return
    const nextVisibleOrder = [...stationaryVisibleOrder]
    const normalizedIndex = Math.max(0, Math.min(targetIndex, nextVisibleOrder.length))
    nextVisibleOrder.splice(normalizedIndex, 0, draggingKey)
    const nextLayerOrder = [...nextVisibleOrder].reverse()
    if (nextLayerOrder.every((key, index) => key === layerOrder[index]) && nextLayerOrder.length === layerOrder.length) {
      return
    }
    onLayerOrderChange(nextLayerOrder)
  }

  const updateDropIndicator = (nextIndex: number | null) => {
    dropIndicatorIndexRef.current = nextIndex
    setDropIndicatorIndex((current) => (current === nextIndex ? current : nextIndex))
  }

  const clearDragState = () => {
    setDraggingKey(null)
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
    for (let index = 0; index < stationaryVisibleOrder.length; index += 1) {
      const key = stationaryVisibleOrder[index]
      const card = cardRefs.current[key]
      if (!card) continue
      const bounds = card.getBoundingClientRect()
      if (clientY < bounds.top + bounds.height / 2) {
        return index
      }
    }
    return stationaryVisibleOrder.length
  }

  const handleListDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingKey || !isActivePage) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    updateDropIndicator(getDropIndexForPointer(event.clientY))
  }

  const handleListDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingKey || !isActivePage) return
    event.preventDefault()
    event.stopPropagation()
    const targetIndex = dropIndicatorIndexRef.current
    if (targetIndex !== null) {
      moveLayer(targetIndex)
    }
    clearDragState()
  }

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

  if (visibleThumbs.length === 0) {
    return (
      <div
        data-card-drag-ignore="true"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        className={`${layerListClassName} px-2 py-2 text-[11px] ${tone.empty}`}
      >
        {t("ui.panels.project.layersList.empty")} <strong className="font-semibold">{t("ui.panels.project.layersList.emptyInstruction")}</strong>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      data-page-layers-scroll-root="true"
      data-card-drag-ignore="true"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className="overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      style={listMaxHeight === null ? undefined : { maxHeight: `${listMaxHeight}px` }}
      onDragOver={handleListDragOver}
      onDrop={handleListDrop}
    >
      <div className={`flex flex-col ${layerListClassName}`}>
        <div
          className={draggingKey && isActivePage ? "relative h-5 shrink-0" : "hidden"}
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
        >
          {renderDropMarker(0)}
        </div>
        {visibleThumbs.map((thumb) => {
          const isSelected = selectedLayerKey === thumb.key
          const isHovered = isActivePage && hoveredLayerKey === thumb.key
          const isEditing = editingLayerKey === thumb.key
          const isLocked = layout?.lockedLayers?.[thumb.key] === true
          const stationaryIndex = stationaryIndexByKey.get(thumb.key) ?? null
          const allowLayerInteractions = isActivePage && !isLocked
          const showPreviewHighlight = isSelected || isHovered || isEditing
          const editingHighlightClassName = isEditing
            ? "shadow-[inset_1px_0_0_0_var(--color-accent),inset_0_1px_0_0_var(--color-accent)]"
            : ""
          return (
            <Fragment key={`${pageId}-${thumb.key}`}>
              {thumb.key !== draggingKey && stationaryIndex !== null && stationaryIndex > 0
                ? renderDropMarker(stationaryIndex)
                : null}
              <div
                ref={(node) => {
                  cardRefs.current[thumb.key] = node
                }}
                data-project-layer-card="true"
                data-editor-retarget-root="true"
                data-card-drag-ignore="true"
                draggable={allowLayerInteractions}
                onPointerDownCapture={(event) => {
                  if (!allowLayerInteractions) return
                  if (event.button !== 0) return
                  if (isCardDragIgnoreTarget(event.target)) return
                  engageSelectionLock()
                }}
                onDragStart={(event) => {
                  if (!allowLayerInteractions) return
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", thumb.key)
                  clearWindowSelection()
                  onSelectPage(pageId)
                  onSelectLayer(thumb.key)
                  setDraggingKey(thumb.key)
                  updateDropIndicator(stationaryVisibleOrder.indexOf(thumb.key))
                }}
                onDragEnd={clearDragState}
                onDragOver={handleListDragOver}
                onDrop={handleListDrop}
                onMouseEnter={allowLayerInteractions ? () => onHoverLayerChange(thumb.key) : undefined}
                onMouseLeave={allowLayerInteractions ? () => onHoverLayerChange(null) : undefined}
                onClick={() => {
                  if (!isActivePage) return
                  onSelectPage(pageId)
                  onSelectLayer(thumb.key)
                }}
                onDoubleClick={() => {
                  if (!isActivePage) return
                  onSelectPage(pageId)
                  onSelectLayer(thumb.key)
                  if (!allowLayerInteractions) return
                  onToggleEditor(thumb.key)
                }}
                className={`${getSettingsOpenListOptionClassName(isDarkMode, showPreviewHighlight)} relative justify-between gap-3 text-xs ${
                  draggingKey === thumb.key
                    ? "cursor-grabbing opacity-45"
                    : ""
                } ${
                  editingHighlightClassName
                } ${
                  allowLayerInteractions ? "cursor-grab select-none" : "cursor-pointer"
                } ${
                  isLocked ? "opacity-80" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center">
                  <div className="pointer-events-none min-w-0 flex-1 select-none">
                    {thumb.kind === "text" ? (
                      <div
                        className={`truncate text-[12px] ${isEditing ? "italic" : ""}`}
                        style={{
                          color: thumb.color,
                          fontFamily: LAYER_TITLE_FONT_FAMILY,
                        }}
                      >
                        {thumb.textPreview}
                      </div>
                    ) : (
                      <div
                        className={`h-2.5 w-full rounded-[2px] ${isEditing ? "ring-1 ring-[color-mix(in_srgb,var(--color-accent)_70%,transparent)]" : ""}`}
                        style={{
                          backgroundColor: thumb.color,
                          opacity: thumb.opacity,
                        }}
                        aria-label={t("ui.panels.project.layersList.imageColor")}
                      />
                    )}
                  </div>
                </div>
                {isActivePage ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      data-card-drag-ignore="true"
                      aria-label={t(isLocked ? "ui.panels.project.layersList.unlock" : "ui.panels.project.layersList.lock", {
                        kind: thumb.kind === "image" ? t("ui.panels.project.layersList.imagePlaceholder") : t("ui.panels.project.layersList.paragraph"),
                      })}
                      aria-pressed={isLocked}
                      className={`rounded-sm p-1 transition-colors ${
                        isLocked
                          ? (isDarkMode ? "bg-surface text-accent" : "bg-surface text-accent")
                          : tone.rowMuted
                      } ${isLocked ? "" : "hover:text-accent"}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        const previousClick = lastLockButtonClickRef.current
                        const isRepeatedLockClick = previousClick?.key === thumb.key
                          && event.timeStamp - previousClick.timeStamp <= LOCK_BUTTON_DOUBLE_CLICK_WINDOW_MS
                        if (event.detail >= 2 || isRepeatedLockClick) {
                          onHoverLayerChange(null)
                          onToggleAllLocks(pageId, previousClick?.targetLocked ?? !isLocked)
                          lastLockButtonClickRef.current = null
                          return
                        }
                        const targetLocked = !isLocked
                        lastLockButtonClickRef.current = {
                          key: thumb.key,
                          targetLocked,
                          timeStamp: event.timeStamp,
                        }
                        onHoverLayerChange(null)
                        onToggleLock(thumb.key, targetLocked)
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      {isLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      data-card-drag-ignore="true"
                      aria-label={t("ui.panels.project.layersList.delete", {
                        kind: thumb.kind === "image" ? t("ui.panels.project.layersList.imagePlaceholder") : t("ui.panels.project.layersList.paragraph"),
                      })}
                      className={`rounded-sm p-1 ${tone.rowMuted} hover:text-error`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDeleteLayer(thumb.key, thumb.kind)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </Fragment>
          )
        })}
        <div
          className={draggingKey && isActivePage ? "relative h-5 shrink-0" : "hidden"}
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
        >
          {renderDropMarker(stationaryVisibleOrder.length)}
        </div>
      </div>
    </div>
  )
}
