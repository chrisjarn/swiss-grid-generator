import { useCallback, useEffect, useMemo, useRef } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import type { CSSProperties, Dispatch, SetStateAction } from "react"
import type { PagePoint } from "@/lib/preview-types"
import { resolvePreviewHoverTarget } from "@/lib/preview-hover-target"
export type PreviewHoverState<Key extends string> = {
  key: Key
  point: PagePoint
}

const COPY_CURSOR_STYLE_VALUE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath fill='%23000' d='M4 3v17l4.8-4.2 3.5 8.2 2.2-.9-3.5-8.1H18L4 3z'/%3E%3Ccircle cx='20' cy='8' r='5.25' fill='%23fff' stroke='%23000' stroke-width='1.5'/%3E%3Cpath d='M20 5.25v5.5M17.25 8h5.5' stroke='%23000' stroke-width='1.5' stroke-linecap='square'/%3E%3C/svg%3E") 2 2, copy`

type DragCursorState = {
  copyOnDrop: boolean
}

type Args<Key extends string> = {
  showTypography: boolean
  editorOpen: boolean
  dragState: DragCursorState | null
  hoverState: PreviewHoverState<Key> | null
  hoverImageKey: Key | null
  hoverTargetLocked?: boolean
  hoverCopyIntent: boolean
  persistentTextCopyIntent: boolean
  setHoverState: Dispatch<SetStateAction<PreviewHoverState<Key> | null>>
  setHoverImageKey: Dispatch<SetStateAction<Key | null>>
  setHoverCopyIntent: Dispatch<SetStateAction<boolean>>
  findTopmostBlockAtPoint: (pageX: number, pageY: number) => Key | null
  findTopmostImageAtPoint: (pageX: number, pageY: number) => Key | null
  isPointWithinHoverTarget: (key: Key, pageX: number, pageY: number) => boolean
  toPagePointFromClient: (clientX: number, clientY: number) => PagePoint | null
}

export function usePreviewHoverState<Key extends string>({
  showTypography,
  editorOpen,
  dragState,
  hoverState,
  hoverImageKey,
  hoverTargetLocked = false,
  hoverCopyIntent,
  persistentTextCopyIntent,
  setHoverState,
  setHoverImageKey,
  setHoverCopyIntent,
  findTopmostBlockAtPoint,
  findTopmostImageAtPoint,
  isPointWithinHoverTarget,
  toPagePointFromClient,
}: Args<Key>) {
  const mouseMoveRafRef = useRef<number | null>(null)
  const hasHoverTarget = Boolean(hoverState || hoverImageKey)
  const hasTextHoverTarget = Boolean(hoverState)

  const clearHover = useCallback(() => {
    setHoverState(null)
    setHoverImageKey(null)
    setHoverCopyIntent(false)
  }, [setHoverCopyIntent, setHoverImageKey, setHoverState])

  const handleCanvasMouseMoveInner = useCallback((clientX: number, clientY: number) => {
    mouseMoveRafRef.current = null

    if (!showTypography || dragState) {
      clearHover()
      return
    }

    const pagePoint = toPagePointFromClient(clientX, clientY)
    if (!pagePoint) {
      clearHover()
      return
    }

    const nextHoverTarget = resolvePreviewHoverTarget({
      pageX: pagePoint.x,
      pageY: pagePoint.y,
      currentTextKey: hoverState?.key ?? null,
      currentImageKey: hoverImageKey,
      findTopmostBlockAtPoint,
      findTopmostImageAtPoint,
      isPointWithinHoverTarget,
    })

    if (!nextHoverTarget) {
      clearHover()
      return
    }

    if (nextHoverTarget.kind === "image") {
      setHoverState(null)
      setHoverCopyIntent(false)
      setHoverImageKey((prev) => (prev === nextHoverTarget.key ? prev : nextHoverTarget.key))
      return
    }

    setHoverImageKey(null)
    setHoverCopyIntent(false)
    setHoverState((prev) => (
      prev?.key === nextHoverTarget.key
      && prev.point.x === pagePoint.x
      && prev.point.y === pagePoint.y
        ? prev
        : { key: nextHoverTarget.key, point: pagePoint }
    ))
  }, [
    clearHover,
    dragState,
    editorOpen,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    hoverImageKey,
    hoverState,
    isPointWithinHoverTarget,
    setHoverCopyIntent,
    showTypography,
    toPagePointFromClient,
  ])

  const handleCanvasMouseMove = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (mouseMoveRafRef.current !== null) return
    const { clientX, clientY } = event
    mouseMoveRafRef.current = requestAnimationFrame(() => handleCanvasMouseMoveInner(clientX, clientY))
  }, [handleCanvasMouseMoveInner])

  useEffect(() => {
    if (!hasTextHoverTarget) {
      if (hoverCopyIntent) setHoverCopyIntent(false)
      return
    }
    if (!showTypography || editorOpen || dragState) {
      if (hoverCopyIntent) setHoverCopyIntent(false)
      return
    }

    if (hoverCopyIntent) setHoverCopyIntent(false)
  }, [dragState, editorOpen, hasTextHoverTarget, hoverCopyIntent, setHoverCopyIntent, showTypography])

  useEffect(() => {
    return () => {
      if (mouseMoveRafRef.current !== null) cancelAnimationFrame(mouseMoveRafRef.current)
    }
  }, [])

  const canvasCursorClass = useMemo(() => (
    dragState
      ? (dragState.copyOnDrop ? "cursor-default" : "cursor-grabbing")
      : hasHoverTarget
        ? (persistentTextCopyIntent || hoverTargetLocked ? "cursor-default" : "cursor-grab")
        : "cursor-default"
  ), [dragState, hasHoverTarget, hoverTargetLocked, persistentTextCopyIntent])

  const canvasCursorStyle = useMemo<CSSProperties | undefined>(() => (
    (dragState?.copyOnDrop || persistentTextCopyIntent)
      ? { cursor: COPY_CURSOR_STYLE_VALUE }
      : undefined
  ), [dragState?.copyOnDrop, persistentTextCopyIntent])

  return {
    clearHover,
    handleCanvasMouseMove,
    canvasCursorClass,
    canvasCursorStyle,
  }
}
