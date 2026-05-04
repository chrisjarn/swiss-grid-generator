import { useCallback, useEffect, useRef, useState } from "react"

type Args<T> = {
  historyLimit: number
  undoNonce: number
  redoNonce: number
  buildSnapshot: () => T
  revisionKey?: string | number | null
  applySnapshot: (snapshot: T) => void
  onClearTransient?: () => void
  onHistoryAvailabilityChange?: (canUndo: boolean, canRedo: boolean) => void
  onRecordHistory?: () => void
}

export function usePreviewHistory<T>({
  historyLimit,
  undoNonce,
  redoNonce,
  buildSnapshot,
  revisionKey = null,
  applySnapshot,
  onClearTransient,
  onHistoryAvailabilityChange,
  onRecordHistory,
}: Args<T>) {
  const [historyPast, setHistoryPast] = useState<T[]>([])
  const [historyFuture, setHistoryFuture] = useState<T[]>([])
  const lastUndoNonceRef = useRef(undoNonce)
  const lastRedoNonceRef = useRef(redoNonce)
  const cachedSnapshotRef = useRef<T | null>(null)
  const cachedSnapshotRevisionRef = useRef<string | number | null>(null)
  const lastRecordedRevisionRef = useRef<string | number | null>(null)

  const getCurrentSnapshot = useCallback((): T => {
    if (
      revisionKey !== null
      && cachedSnapshotRef.current !== null
      && cachedSnapshotRevisionRef.current === revisionKey
    ) {
      return cachedSnapshotRef.current
    }
    const snapshot = buildSnapshot()
    if (revisionKey !== null) {
      cachedSnapshotRef.current = snapshot
      cachedSnapshotRevisionRef.current = revisionKey
    }
    return snapshot
  }, [buildSnapshot, revisionKey])

  const pushHistory = useCallback((snapshot: T) => {
    setHistoryPast((prev) => {
      const next = [...prev, snapshot]
      return next.length > historyLimit ? next.slice(next.length - historyLimit) : next
    })
    setHistoryFuture([])
    onRecordHistory?.()
  }, [historyLimit, onRecordHistory])

  const recordHistoryBeforeChange = useCallback(() => {
    if (revisionKey !== null && lastRecordedRevisionRef.current === revisionKey) {
      onClearTransient?.()
      return
    }
    pushHistory(getCurrentSnapshot())
    lastRecordedRevisionRef.current = revisionKey
    onClearTransient?.()
  }, [getCurrentSnapshot, onClearTransient, pushHistory, revisionKey])

  const undo = useCallback(() => {
    setHistoryPast((prev) => {
      if (!prev.length) return prev
      const current = getCurrentSnapshot()
      const nextPast = prev.slice(0, -1)
      const previous = prev[prev.length - 1]
      setHistoryFuture((future) => [current, ...future].slice(0, historyLimit))
      applySnapshot(previous)
      cachedSnapshotRef.current = null
      cachedSnapshotRevisionRef.current = null
      lastRecordedRevisionRef.current = null
      onClearTransient?.()
      return nextPast
    })
  }, [applySnapshot, getCurrentSnapshot, historyLimit, onClearTransient])

  const redo = useCallback(() => {
    setHistoryFuture((future) => {
      if (!future.length) return future
      const current = getCurrentSnapshot()
      const [nextSnapshot, ...rest] = future
      setHistoryPast((prev) => {
        const next = [...prev, current]
        return next.length > historyLimit ? next.slice(next.length - historyLimit) : next
      })
      applySnapshot(nextSnapshot)
      cachedSnapshotRef.current = null
      cachedSnapshotRevisionRef.current = null
      lastRecordedRevisionRef.current = null
      onClearTransient?.()
      return rest
    })
  }, [applySnapshot, getCurrentSnapshot, historyLimit, onClearTransient])

  const resetHistory = useCallback(() => {
    setHistoryPast([])
    setHistoryFuture([])
    cachedSnapshotRef.current = null
    cachedSnapshotRevisionRef.current = null
    lastRecordedRevisionRef.current = null
    onClearTransient?.()
  }, [onClearTransient])

  useEffect(() => {
    onHistoryAvailabilityChange?.(historyPast.length > 0, historyFuture.length > 0)
  }, [historyFuture.length, historyPast.length, onHistoryAvailabilityChange])

  useEffect(() => {
    if (undoNonce === lastUndoNonceRef.current) return
    lastUndoNonceRef.current = undoNonce
    undo()
  }, [undo, undoNonce])

  useEffect(() => {
    if (redoNonce === lastRedoNonceRef.current) return
    lastRedoNonceRef.current = redoNonce
    redo()
  }, [redo, redoNonce])

  return {
    pushHistory,
    recordHistoryBeforeChange,
    resetHistory,
    undo,
    redo,
    canUndo: historyPast.length > 0,
    canRedo: historyFuture.length > 0,
  }
}
