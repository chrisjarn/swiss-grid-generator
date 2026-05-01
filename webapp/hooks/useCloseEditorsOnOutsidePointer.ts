import { useEffect } from "react"
import type { MutableRefObject } from "react"

import { eventPathHasEditorOwnedTarget } from "@/lib/editor-interaction-ownership"

type Args = {
  isEditorOpen: boolean
  editorSidebarHost: HTMLDivElement | null
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  onCloseEditors: () => void
  shouldKeepEditorsOpenForPointerDown?: (event: PointerEvent) => boolean
}

export function useCloseEditorsOnOutsidePointer({
  isEditorOpen,
  editorSidebarHost,
  textareaRef,
  onCloseEditors,
  shouldKeepEditorsOpenForPointerDown,
}: Args) {
  useEffect(() => {
    if (!isEditorOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const ownedNodes = [textareaRef.current, editorSidebarHost]
      if (eventPathHasEditorOwnedTarget(event, ownedNodes)) return
      if (shouldKeepEditorsOpenForPointerDown?.(event)) return

      onCloseEditors()
    }
    window.addEventListener("pointerdown", handlePointerDown, true)
    return () => window.removeEventListener("pointerdown", handlePointerDown, true)
  }, [editorSidebarHost, isEditorOpen, onCloseEditors, shouldKeepEditorsOpenForPointerDown, textareaRef])
}
