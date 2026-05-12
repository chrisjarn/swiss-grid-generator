import { useCallback, useEffect, useRef, type KeyboardEvent } from "react"

type DialogPrimaryActionOptions = {
  isOpen: boolean
  onPrimaryAction: () => void
}

export function useDialogPrimaryAction({ isOpen, onPrimaryAction }: DialogPrimaryActionOptions) {
  const primaryActionRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const frameId = window.requestAnimationFrame(() => {
      primaryActionRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen])

  const handleDialogKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (
      event.defaultPrevented
      || event.nativeEvent.isComposing
      || event.key !== "Enter"
      || event.metaKey
      || event.ctrlKey
      || event.altKey
      || event.shiftKey
    ) {
      return
    }

    if (event.target instanceof HTMLButtonElement) return

    event.preventDefault()
    onPrimaryAction()
  }, [onPrimaryAction])

  return {
    primaryActionRef,
    handleDialogKeyDown,
  }
}
