import { LAYOUT_OPEN_TOOLTIP_ITEMS, type LayoutOpenTooltipItem } from "@/gui/preview/lib/generated-tooltip-content"
import { useCallback, useRef, useState } from "react"

const LAYOUT_OPEN_TOOLTIP_CURSOR_STORAGE_KEY = "swiss-grid-generator.layout-open-tooltip-cursor"

export type ActiveLayoutOpenTooltip = {
  displayToken: number
  index: number
  item: LayoutOpenTooltipItem
} | null

function readStoredNonNegativeInteger(key: string): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return 0
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

export function useLayoutOpenTooltipController() {
  const [activeLayoutOpenTooltip, setActiveLayoutOpenTooltip] = useState<ActiveLayoutOpenTooltip>(null)
  const displayTokenRef = useRef(0)
  const dismissedForSessionRef = useRef(false)

  const dismissLayoutOpenTooltip = useCallback((mode: "dismiss" | "session" = "dismiss") => {
    if (mode === "session") {
      dismissedForSessionRef.current = true
    }
    setActiveLayoutOpenTooltip(null)
  }, [])

  const setLayoutOpenTooltipByIndex = useCallback((index: number) => {
    const fallbackItem = LAYOUT_OPEN_TOOLTIP_ITEMS[0]
    if (!fallbackItem) return

    const totalCount = LAYOUT_OPEN_TOOLTIP_ITEMS.length
    const safeIndex = ((index % totalCount) + totalCount) % totalCount
    const item = LAYOUT_OPEN_TOOLTIP_ITEMS[safeIndex] ?? fallbackItem

    displayTokenRef.current += 1
    setActiveLayoutOpenTooltip({
      displayToken: displayTokenRef.current,
      index: safeIndex,
      item,
    })

    try {
      window.localStorage.setItem(
        LAYOUT_OPEN_TOOLTIP_CURSOR_STORAGE_KEY,
        String((safeIndex + 1) % totalCount),
      )
    } catch {
      // Ignore persistence failures and continue rotating in-memory for this session.
    }
  }, [])

  const showNextLayoutOpenTooltip = useCallback(() => {
    if (typeof window === "undefined") return
    if (dismissedForSessionRef.current) return

    const cursor = readStoredNonNegativeInteger(LAYOUT_OPEN_TOOLTIP_CURSOR_STORAGE_KEY)
    setLayoutOpenTooltipByIndex(cursor)
  }, [setLayoutOpenTooltipByIndex])

  const handleNextLayoutOpenTooltip = useCallback(() => {
    if (typeof window === "undefined" || !LAYOUT_OPEN_TOOLTIP_ITEMS[0]) return
    const nextIndex = activeLayoutOpenTooltip
      ? (activeLayoutOpenTooltip.index + 1) % LAYOUT_OPEN_TOOLTIP_ITEMS.length
      : readStoredNonNegativeInteger(LAYOUT_OPEN_TOOLTIP_CURSOR_STORAGE_KEY)
    setLayoutOpenTooltipByIndex(nextIndex)
  }, [activeLayoutOpenTooltip, setLayoutOpenTooltipByIndex])

  return {
    activeLayoutOpenTooltip,
    dismissLayoutOpenTooltip,
    handleNextLayoutOpenTooltip,
    layoutOpenTooltipTotalCount: LAYOUT_OPEN_TOOLTIP_ITEMS.length,
    showNextLayoutOpenTooltip,
  }
}
