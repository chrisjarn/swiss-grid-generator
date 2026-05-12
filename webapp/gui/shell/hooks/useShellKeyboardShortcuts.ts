import { useEffect } from "react"

import { PREVIEW_HEADER_SHORTCUTS } from "@/gui/shell/lib/preview-header-shortcuts"

type Args = {
  canUndo: boolean
  canRedo: boolean
  showPresetsBrowser: boolean
  presentationMode: boolean
  hasPreviewLayout: boolean
  hasMultipleProjectPages: boolean
  onImportProject: () => void
  onOpenSaveLibraryDialog: () => void
  onOpenExportDialog: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleDarkMode: () => void
  onCopyLayoutToClipboard: () => void | Promise<void>
  onTogglePresentationMode: () => void
  onExitPresentationMode: () => void
  onToggleBaselines: () => void
  onToggleMargins: () => void
  onToggleModules: () => void
  onToggleTypography: () => void
  onToggleImagePlaceholders: () => void
  onToggleLayersPanel: () => void
  onOpenDocumentation: () => void
  onToggleLegalNoticePanel: () => void
  onOpenPresets: () => void
  onClosePresets: () => void
  onSelectFirstPage: () => void
  onSelectLastPage: () => void
  onSelectPreviousPage: () => void
  onSelectNextPage: () => void
  onSelectPreviousPageJump: () => void
  onSelectNextPageJump: () => void
}

export function useShellKeyboardShortcuts({
  canUndo,
  canRedo,
  showPresetsBrowser,
  presentationMode,
  hasPreviewLayout,
  hasMultipleProjectPages,
  onImportProject,
  onOpenSaveLibraryDialog,
  onOpenExportDialog,
  onUndo,
  onRedo,
  onToggleDarkMode,
  onCopyLayoutToClipboard,
  onTogglePresentationMode,
  onExitPresentationMode,
  onToggleBaselines,
  onToggleMargins,
  onToggleModules,
  onToggleTypography,
  onToggleImagePlaceholders,
  onToggleLayersPanel,
  onOpenDocumentation,
  onToggleLegalNoticePanel,
  onOpenPresets,
  onClosePresets,
  onSelectFirstPage,
  onSelectLastPage,
  onSelectPreviousPage,
  onSelectNextPage,
  onSelectPreviousPageJump,
  onSelectNextPageJump,
}: Args) {
  const canSaveOrExport = hasPreviewLayout && !showPresetsBrowser
  const canUseLayerControls = hasPreviewLayout && !showPresetsBrowser

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key === "Tab") {
        if (!hasPreviewLayout) return
        event.preventDefault()
        onTogglePresentationMode()
        return
      }

      if (presentationMode && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key === "Escape") {
        event.preventDefault()
        onExitPresentationMode()
        return
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.shiftKey && event.key === "?") {
        event.preventDefault()
        onOpenDocumentation()
        return
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.shiftKey && event.key.toLowerCase() === "j") {
        event.preventDefault()
        if (hasPreviewLayout) void onCopyLayoutToClipboard()
        return
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault()
        if (hasPreviewLayout) onTogglePresentationMode()
        return
      }

      if (!showPresetsBrowser && hasMultipleProjectPages && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === "PageUp") {
          event.preventDefault()
          if (event.shiftKey) {
            onSelectPreviousPageJump()
          } else {
            onSelectPreviousPage()
          }
          return
        }
        if (event.key === "PageDown") {
          event.preventDefault()
          if (event.shiftKey) {
            onSelectNextPageJump()
          } else {
            onSelectNextPage()
          }
          return
        }
        if (event.key === "Home") {
          event.preventDefault()
          onSelectFirstPage()
          return
        }
        if (event.key === "End") {
          event.preventDefault()
          onSelectLastPage()
          return
        }
      }

      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      const shifted = event.shiftKey
      const alted = event.altKey

      const shortcut = PREVIEW_HEADER_SHORTCUTS.find((item) =>
        item.bindings.some(
          (binding) =>
            binding.key === key
            && (binding.shift ?? false) === shifted
            && (binding.alt ?? false) === alted,
        ),
      )
      if (!shortcut) return

      event.preventDefault()
      switch (shortcut.id) {
        case "import_project":
          onImportProject()
          return
        case "save_to_library":
          if (canSaveOrExport) onOpenSaveLibraryDialog()
          return
        case "open_export":
          if (canSaveOrExport) onOpenExportDialog()
          return
        case "undo":
          if (canUndo) onUndo()
          return
        case "redo":
          if (canRedo) onRedo()
          return
        case "toggle_dark_mode":
          onToggleDarkMode()
          return
        case "toggle_baselines":
          if (canUseLayerControls) onToggleBaselines()
          return
        case "toggle_margins":
          if (canUseLayerControls) onToggleMargins()
          return
        case "toggle_modules":
          if (canUseLayerControls) onToggleModules()
          return
        case "toggle_typography":
          if (canUseLayerControls) onToggleTypography()
          return
        case "toggle_image_placeholders":
          if (canUseLayerControls) onToggleImagePlaceholders()
          return
        case "toggle_layers_panel":
          onToggleLayersPanel()
          return
        case "open_documentation":
          onOpenDocumentation()
          return
        case "toggle_legal_notice_panel":
          onToggleLegalNoticePanel()
          return
        case "toggle_example_panel":
          onOpenPresets()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    canRedo,
    canUndo,
    canSaveOrExport,
    canUseLayerControls,
    hasMultipleProjectPages,
    hasPreviewLayout,
    onOpenExportDialog,
    onImportProject,
    onOpenSaveLibraryDialog,
    onSelectFirstPage,
    onSelectLastPage,
    onSelectNextPage,
    onSelectNextPageJump,
    onSelectPreviousPageJump,
    onSelectPreviousPage,
    onOpenPresets,
    onRedo,
    onToggleBaselines,
    onToggleDarkMode,
    onCopyLayoutToClipboard,
    onTogglePresentationMode,
    onExitPresentationMode,
    onOpenDocumentation,
    onToggleLegalNoticePanel,
    onToggleLayersPanel,
    onToggleMargins,
    onToggleModules,
    onToggleImagePlaceholders,
    onToggleTypography,
    onUndo,
    presentationMode,
    showPresetsBrowser,
  ])

  useEffect(() => {
    if (!showPresetsBrowser) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      onClosePresets()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClosePresets, showPresetsBrowser])
}
