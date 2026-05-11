import { translateMessage } from "@/lib/i18n"

export type PreviewHeaderShortcutId =
  | "import_project"
  | "save_to_library"
  | "open_export"
  | "undo"
  | "redo"
  | "toggle_dark_mode"
  | "toggle_baselines"
  | "toggle_margins"
  | "toggle_modules"
  | "toggle_typography"
  | "toggle_image_placeholders"
  | "toggle_layers_panel"
  | "toggle_help_panel"
  | "toggle_legal_notice_panel"
  | "toggle_example_panel"

export type ShortcutBinding = {
  key: string
  shift?: boolean
  alt?: boolean
}

export type PreviewHeaderShortcut = {
  id: PreviewHeaderShortcutId
  combo: string
  description: string
  bindings: ShortcutBinding[]
}

export const PREVIEW_HEADER_SHORTCUTS: PreviewHeaderShortcut[] = [
  {
    id: "import_project",
    combo: "Cmd/Ctrl+O",
    description: translateMessage("shortcuts.importProject"),
    bindings: [{ key: "o" }],
  },
  {
    id: "save_to_library",
    combo: "Cmd/Ctrl+S",
    description: translateMessage("shortcuts.saveToLibrary"),
    bindings: [{ key: "s" }],
  },
  {
    id: "open_export",
    combo: "Cmd/Ctrl+Shift+E",
    description: translateMessage("shortcuts.exportDialog"),
    bindings: [{ key: "e", shift: true }],
  },
  {
    id: "undo",
    combo: "Cmd/Ctrl+Z",
    description: translateMessage("shortcuts.undo"),
    bindings: [{ key: "z" }],
  },
  {
    id: "redo",
    combo: "Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y",
    description: translateMessage("shortcuts.redo"),
    bindings: [{ key: "z", shift: true }, { key: "y" }],
  },
  {
    id: "toggle_dark_mode",
    combo: "Cmd/Ctrl+Shift+D",
    description: translateMessage("shortcuts.toggleDarkMode"),
    bindings: [{ key: "d", shift: true }],
  },
  {
    id: "toggle_baselines",
    combo: "Cmd/Ctrl+Shift+B",
    description: translateMessage("shortcuts.toggleBaselines"),
    bindings: [{ key: "b", shift: true }],
  },
  {
    id: "toggle_margins",
    combo: "Cmd/Ctrl+Shift+M",
    description: translateMessage("shortcuts.toggleMargins"),
    bindings: [{ key: "m", shift: true }],
  },
  {
    id: "toggle_modules",
    combo: "Cmd/Ctrl+Shift+G",
    description: translateMessage("shortcuts.toggleModules"),
    bindings: [{ key: "g", shift: true }],
  },
  {
    id: "toggle_typography",
    combo: "Cmd/Ctrl+Shift+T",
    description: translateMessage("shortcuts.toggleTypography"),
    bindings: [{ key: "t", shift: true }],
  },
  {
    id: "toggle_image_placeholders",
    combo: "Cmd/Ctrl+Shift+J",
    description: translateMessage("shortcuts.toggleImagePlaceholders"),
    bindings: [{ key: "j", shift: true }],
  },
  {
    id: "toggle_layers_panel",
    combo: "Cmd/Ctrl+Shift+P",
    description: translateMessage("shortcuts.toggleProjectPanel"),
    bindings: [{ key: "p", shift: true }],
  },
  {
    id: "toggle_help_panel",
    combo: "Cmd/Ctrl+Shift+H",
    description: translateMessage("shortcuts.toggleHelp"),
    bindings: [{ key: "h", shift: true }],
  },
  {
    id: "toggle_legal_notice_panel",
    combo: "Cmd/Ctrl+Shift+3",
    description: translateMessage("shortcuts.toggleLegalNotice"),
    bindings: [{ key: "3", shift: true }],
  },
  {
    id: "toggle_example_panel",
    combo: "Cmd/Ctrl+Shift+4",
    description: translateMessage("shortcuts.togglePresets"),
    bindings: [{ key: "4", shift: true }],
  },
]
