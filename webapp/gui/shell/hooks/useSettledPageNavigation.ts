import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export const PAGE_GUI_SETTLE_DELAY_MS = 500

type PageIdentity = {
  id: string
}

type Args<TPage extends PageIdentity> = {
  activePageId: string
  pages: readonly TPage[]
  settleDelayMs?: number
}

export function useSettledPageNavigation<TPage extends PageIdentity>({
  activePageId,
  pages,
  settleDelayMs = PAGE_GUI_SETTLE_DELAY_MS,
}: Args<TPage>) {
  const [settledPageId, setSettledPageId] = useState(activePageId)
  const [settledPages, setSettledPages] = useState<readonly TPage[]>(pages)
  const [settlingPageId, setSettlingPageId] = useState<string | null>(null)
  const latestPagesRef = useRef(pages)
  const settleTimeoutRef = useRef<number | null>(null)
  const pendingSettledPageTargetRef = useRef<string | null>(null)

  const clearSettleTimeout = useCallback(() => {
    if (settleTimeoutRef.current === null) return
    window.clearTimeout(settleTimeoutRef.current)
    settleTimeoutRef.current = null
  }, [])

  const commitSettledPage = useCallback((pageId = activePageId) => {
    clearSettleTimeout()
    pendingSettledPageTargetRef.current = null
    setSettlingPageId(null)
    setSettledPages(latestPagesRef.current)
    setSettledPageId(pageId)
  }, [activePageId, clearSettleTimeout])

  const requestSettledPageFocus = useCallback((pageId: string) => {
    pendingSettledPageTargetRef.current = pageId
    setSettlingPageId(pageId)
    clearSettleTimeout()
    settleTimeoutRef.current = window.setTimeout(() => {
      if (pendingSettledPageTargetRef.current !== pageId) return
      pendingSettledPageTargetRef.current = null
      setSettlingPageId(null)
      setSettledPages(latestPagesRef.current)
      setSettledPageId(pageId)
      settleTimeoutRef.current = null
    }, settleDelayMs)
  }, [clearSettleTimeout, settleDelayMs])

  useEffect(() => {
    latestPagesRef.current = pages
    if (pendingSettledPageTargetRef.current !== null) return
    setSettledPages(pages)
  }, [pages])

  useEffect(() => {
    if (pendingSettledPageTargetRef.current === activePageId) return
    commitSettledPage(activePageId)
  }, [activePageId, commitSettledPage])

  useEffect(() => {
    const latestPageIds = new Set(pages.map((page) => page.id))
    if (pendingSettledPageTargetRef.current && !latestPageIds.has(pendingSettledPageTargetRef.current)) {
      pendingSettledPageTargetRef.current = null
      setSettlingPageId(null)
      clearSettleTimeout()
      setSettledPages(pages)
    }
    const settledPageIds = new Set(settledPages.map((page) => page.id))
    if (!settledPageIds.has(settledPageId)) {
      const fallbackPageId = latestPageIds.has(activePageId)
        ? activePageId
        : (settledPages[0] ?? pages[0])?.id
      if (fallbackPageId) setSettledPageId(fallbackPageId)
    }
  }, [activePageId, clearSettleTimeout, pages, settledPageId, settledPages])

  useEffect(() => () => {
    clearSettleTimeout()
  }, [clearSettleTimeout])

  const settledPage = useMemo(() => (
    settledPages.find((page) => page.id === settledPageId)
    ?? settledPages.find((page) => page.id === activePageId)
    ?? settledPages[0]
    ?? null
  ), [activePageId, settledPageId, settledPages])

  return {
    isGuiSettling: settlingPageId !== null,
    requestSettledPageFocus,
    settledPage,
    settledPageId: settledPage?.id ?? settledPageId,
    settledPages,
  }
}
