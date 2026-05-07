import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export const PAGE_KEYBOARD_GUI_SETTLE_DELAY_MS = 160

export type PageKeyboardFocusRequest = {
  token: number
  pageId: string | null
}

type PageIdentity = {
  id: string
}

type Args<TPage extends PageIdentity> = {
  activePageId: string
  pages: readonly TPage[]
  settleDelayMs?: number
}

export function useSettledPageKeyboardNavigation<TPage extends PageIdentity>({
  activePageId,
  pages,
  settleDelayMs = PAGE_KEYBOARD_GUI_SETTLE_DELAY_MS,
}: Args<TPage>) {
  const [settledPageId, setSettledPageId] = useState(activePageId)
  const [settlingPageId, setSettlingPageId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<PageKeyboardFocusRequest>({ token: 0, pageId: null })
  const settleTimeoutRef = useRef<number | null>(null)
  const pendingKeyboardTargetRef = useRef<string | null>(null)

  const clearSettleTimeout = useCallback(() => {
    if (settleTimeoutRef.current === null) return
    window.clearTimeout(settleTimeoutRef.current)
    settleTimeoutRef.current = null
  }, [])

  const settleGuiPageNow = useCallback((pageId = activePageId) => {
    clearSettleTimeout()
    pendingKeyboardTargetRef.current = null
    setSettlingPageId(null)
    setSettledPageId(pageId)
  }, [activePageId, clearSettleTimeout])

  const requestKeyboardPageFocus = useCallback((pageId: string) => {
    pendingKeyboardTargetRef.current = pageId
    setSettlingPageId(pageId)
    setFocusRequest((current) => ({
      token: current.token + 1,
      pageId,
    }))
    clearSettleTimeout()
    settleTimeoutRef.current = window.setTimeout(() => {
      if (pendingKeyboardTargetRef.current !== pageId) return
      pendingKeyboardTargetRef.current = null
      setSettlingPageId(null)
      setSettledPageId(pageId)
      settleTimeoutRef.current = null
    }, settleDelayMs)
  }, [clearSettleTimeout, settleDelayMs])

  useEffect(() => {
    if (pendingKeyboardTargetRef.current === activePageId) return
    settleGuiPageNow(activePageId)
  }, [activePageId, settleGuiPageNow])

  useEffect(() => {
    if (pages.length === 0) return
    const pageIds = new Set(pages.map((page) => page.id))
    if (pendingKeyboardTargetRef.current && !pageIds.has(pendingKeyboardTargetRef.current)) {
      pendingKeyboardTargetRef.current = null
      setSettlingPageId(null)
      clearSettleTimeout()
    }
    if (!pageIds.has(settledPageId)) {
      setSettledPageId(pageIds.has(activePageId) ? activePageId : pages[0]!.id)
    }
  }, [activePageId, clearSettleTimeout, pages, settledPageId])

  useEffect(() => () => {
    clearSettleTimeout()
  }, [clearSettleTimeout])

  const settledPage = useMemo(() => (
    pages.find((page) => page.id === settledPageId)
    ?? pages.find((page) => page.id === activePageId)
    ?? pages[0]
    ?? null
  ), [activePageId, pages, settledPageId])

  return {
    focusRequest,
    isGuiSettling: settlingPageId !== null,
    requestKeyboardPageFocus,
    settleGuiPageNow,
    settledPage,
    settledPageId: settledPage?.id ?? settledPageId,
  }
}
