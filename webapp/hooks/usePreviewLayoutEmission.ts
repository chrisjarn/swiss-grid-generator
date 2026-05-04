import { useEffect, useRef } from "react"

type Args<Snapshot> = {
  buildSnapshot: () => Snapshot
  debounceMs: number
  enabled?: boolean
  paused?: boolean
  flushOnResume?: boolean
  revisionKey?: string | number | null
  onLayoutChange?: ((layout: Snapshot) => void) | undefined
}

export function usePreviewLayoutEmission<Snapshot>({
  buildSnapshot,
  debounceMs,
  enabled = true,
  paused = false,
  flushOnResume = false,
  revisionKey = null,
  onLayoutChange,
}: Args<Snapshot>) {
  const timeoutRef = useRef<number | null>(null)
  const lastEmittedRevisionRef = useRef<string | number | null>(null)
  const lastEmittedSignatureRef = useRef<string | null>(null)
  const pendingWhilePausedRef = useRef(false)
  const wasPausedRef = useRef(paused)

  const getSnapshotSignature = (snapshot: Snapshot): string | null => {
    try {
      return JSON.stringify(snapshot)
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!enabled || !onLayoutChange) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    if (paused) {
      pendingWhilePausedRef.current = true
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      const snapshot = buildSnapshot()
      if (revisionKey !== null) {
        if (revisionKey === lastEmittedRevisionRef.current) return
        lastEmittedRevisionRef.current = revisionKey
        onLayoutChange(snapshot)
        return
      }
      const signature = getSnapshotSignature(snapshot)
      if (signature !== null && signature === lastEmittedSignatureRef.current) return
      lastEmittedSignatureRef.current = signature
      onLayoutChange(snapshot)
    }, debounceMs)

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [buildSnapshot, debounceMs, enabled, onLayoutChange, paused, revisionKey])

  useEffect(() => {
    const wasPaused = wasPausedRef.current
    wasPausedRef.current = paused
    if (!enabled || !onLayoutChange) return
    if (paused || !wasPaused || !flushOnResume || !pendingWhilePausedRef.current) return

    pendingWhilePausedRef.current = false
    const snapshot = buildSnapshot()
    if (revisionKey !== null) {
      if (revisionKey === lastEmittedRevisionRef.current) return
      lastEmittedRevisionRef.current = revisionKey
      onLayoutChange(snapshot)
      return
    }
    const signature = getSnapshotSignature(snapshot)
    if (signature !== null && signature === lastEmittedSignatureRef.current) return
    lastEmittedSignatureRef.current = signature
    onLayoutChange(snapshot)
  }, [buildSnapshot, enabled, flushOnResume, onLayoutChange, paused, revisionKey])
}
