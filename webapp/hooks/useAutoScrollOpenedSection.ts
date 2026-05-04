"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"

const SCROLL_RESTORE_FRAME_COUNT = 2

type AutoScrollOpenedSectionOptions = {
  resetEventName?: string
  scrollStorageKey?: string
  restoreKey?: string | number | null
}

function resolveSectionAnchorElement(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null
  if (node.matches("[data-section-scroll-anchor='true']")) return node
  return node.querySelector<HTMLElement>("[data-section-scroll-anchor='true']")
}

function readStoredScrollTop(storageKey: string): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = window.localStorage.getItem(storageKey)
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
  } catch {
    return 0
  }
}

function writeStoredScrollTop(storageKey: string, value: number): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey, String(Math.max(0, Math.round(value))))
  } catch {
    // Scroll restoration is a convenience; editor state must keep working without storage.
  }
}

export function useAutoScrollOpenedSection<SectionKey extends string>(
  collapsed: Record<SectionKey, boolean>,
  options: AutoScrollOpenedSectionOptions = {},
) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLDivElement | null>>>({})
  const previousCollapsedRef = useRef(collapsed)
  const topAnchorOffsetRef = useRef(0)
  const scrollPersistFrameRef = useRef<number | null>(null)
  const restoreFrameRef = useRef<number | null>(null)
  const { resetEventName, restoreKey = null, scrollStorageKey } = options

  useLayoutEffect(() => {
    const scrollRoot = scrollRootRef.current
    if (!scrollRoot) return
    const firstSectionKey = (Object.keys(collapsed) as SectionKey[])[0]
    if (!firstSectionKey) return
    const firstSectionNode = sectionRefs.current[firstSectionKey]
    if (!firstSectionNode) return
    const firstSectionAnchor = resolveSectionAnchorElement(firstSectionNode)
    if (!firstSectionAnchor) return

    const rootRect = scrollRoot.getBoundingClientRect()
    const firstSectionRect = firstSectionAnchor.getBoundingClientRect()
    topAnchorOffsetRef.current = Math.max(0, firstSectionRect.top - rootRect.top)
  }, [collapsed, restoreKey])

  useLayoutEffect(() => {
    if (!scrollStorageKey) return
    const scrollRoot = scrollRootRef.current
    if (!scrollRoot) return

    let frameCount = 0
    const restore = () => {
      scrollRoot.scrollTop = readStoredScrollTop(scrollStorageKey)
      frameCount += 1
      if (frameCount >= SCROLL_RESTORE_FRAME_COUNT) {
        restoreFrameRef.current = null
        return
      }
      restoreFrameRef.current = window.requestAnimationFrame(restore)
    }

    if (restoreFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreFrameRef.current)
    }
    restoreFrameRef.current = window.requestAnimationFrame(restore)

    return () => {
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current)
        restoreFrameRef.current = null
      }
    }
  }, [restoreKey, scrollStorageKey])

  useEffect(() => {
    if (!scrollStorageKey) return
    const scrollRoot = scrollRootRef.current
    if (!scrollRoot) return

    const handleScroll = () => {
      if (scrollPersistFrameRef.current !== null) return
      scrollPersistFrameRef.current = window.requestAnimationFrame(() => {
        scrollPersistFrameRef.current = null
        writeStoredScrollTop(scrollStorageKey, scrollRoot.scrollTop)
      })
    }

    scrollRoot.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      scrollRoot.removeEventListener("scroll", handleScroll)
      if (scrollPersistFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollPersistFrameRef.current)
        scrollPersistFrameRef.current = null
      }
      writeStoredScrollTop(scrollStorageKey, scrollRoot.scrollTop)
    }
  }, [scrollStorageKey])

  useEffect(() => {
    if (!resetEventName || typeof window === "undefined") return

    const handleReset = () => {
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current)
        restoreFrameRef.current = null
      }
      if (scrollPersistFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollPersistFrameRef.current)
        scrollPersistFrameRef.current = null
      }

      const scrollRoot = scrollRootRef.current
      if (!scrollRoot) return
      scrollRoot.scrollTop = 0
      if (scrollStorageKey) {
        writeStoredScrollTop(scrollStorageKey, 0)
      }
    }

    window.addEventListener(resetEventName, handleReset)
    return () => window.removeEventListener(resetEventName, handleReset)
  }, [resetEventName, scrollStorageKey])

  useEffect(() => {
    const allClosed = (Object.keys(collapsed) as SectionKey[]).every((key) => collapsed[key])
    if (allClosed) {
      previousCollapsedRef.current = collapsed
      const scrollRoot = scrollRootRef.current
      if (!scrollRoot) return
      const frame = window.requestAnimationFrame(() => {
        scrollRoot.scrollTo({
          top: 0,
          behavior: "auto",
        })
      })
      return () => window.cancelAnimationFrame(frame)
    }

    const openedSection = (Object.keys(collapsed) as SectionKey[]).find((key) => (
      previousCollapsedRef.current[key] && !collapsed[key]
    ))
    previousCollapsedRef.current = collapsed
    if (!openedSection) return

    const scrollRoot = scrollRootRef.current
    const sectionNode = sectionRefs.current[openedSection]
    if (!scrollRoot || !sectionNode) return
    const sectionAnchor = resolveSectionAnchorElement(sectionNode)
    if (!sectionAnchor) return

    const frame = window.requestAnimationFrame(() => {
      const rootRect = scrollRoot.getBoundingClientRect()
      const sectionRect = sectionAnchor.getBoundingClientRect()
      const nextTop = Math.max(
        0,
        scrollRoot.scrollTop + (sectionRect.top - rootRect.top) - topAnchorOffsetRef.current,
      )

      scrollRoot.scrollTo({
        top: nextTop,
        behavior: "auto",
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [collapsed])

  const registerSectionRef = useCallback(
    (key: SectionKey) => (node: HTMLDivElement | null) => {
      sectionRefs.current[key] = node
    },
    [],
  )

  return {
    scrollRootRef,
    registerSectionRef,
  }
}
