import type { DocumentationHoverInfoId } from "@/shared/ui/documentation-hover-info"

type HoverInfoCoverageEntry =
  | {
      key: string
      helpId: DocumentationHoverInfoId
      shortOnly?: never
      reason?: never
    }
  | {
      key: string
      helpId?: never
      shortOnly: true
      reason: "obvious" | "field-label" | "confirmation"
    }

export const GUI_HOVER_INFO_COVERAGE: readonly HoverInfoCoverageEntry[] = [
  { key: "header.presets", helpId: "tooltip-header-presets" },
  { key: "header.import", helpId: "tooltip-header-import" },
  { key: "header.save", helpId: "tooltip-header-save" },
  { key: "header.export", helpId: "tooltip-header-export" },
  { key: "header.undo", helpId: "tooltip-header-history" },
  { key: "header.redo", helpId: "tooltip-header-history" },
  { key: "header.smart-text-zoom", helpId: "tooltip-smart-text-zoom" },
  { key: "header.baselines", helpId: "tooltip-header-guide-visibility" },
  { key: "header.margins", helpId: "tooltip-header-guide-visibility" },
  { key: "header.modules", helpId: "tooltip-header-guide-visibility" },
  { key: "header.typography", helpId: "tooltip-header-guide-visibility" },
  { key: "header.image-placeholders", helpId: "tooltip-header-guide-visibility" },
  { key: "header.layers", helpId: "tooltip-header-project-panel" },
  { key: "header.account", helpId: "tooltip-account-cloud" },
  { key: "header.support-menu", helpId: "tooltip-header-support-menu" },
  { key: "header.support-menu.documentation", helpId: "tooltip-documentation-link" },
  { key: "header.support-menu.feedback", helpId: "tooltip-feedback-panel" },
  { key: "header.support-menu.legal", helpId: "tooltip-legal-panel" },

  { key: "settings.canvas", helpId: "tooltip-settings-canvas" },
  { key: "settings.baseline", helpId: "tooltip-settings-baseline" },
  { key: "settings.margins", helpId: "tooltip-settings-margins" },
  { key: "settings.grid", helpId: "tooltip-settings-grid" },
  { key: "settings.typography", helpId: "tooltip-settings-typography" },
  { key: "settings.color", helpId: "tooltip-settings-color" },
  { key: "settings.custom-ratio", helpId: "tooltip-control-custom-ratio" },
  { key: "settings.rotation", helpId: "tooltip-control-rotation" },
  { key: "settings.margin-method", helpId: "tooltip-control-margin-method" },
  { key: "settings.grid-size", helpId: "tooltip-control-grid-size" },
  { key: "settings.grid-rhythm", helpId: "tooltip-control-grid-rhythm" },
  { key: "settings.type-rhythm", helpId: "tooltip-control-type-rhythm" },
  { key: "settings.base-family", helpId: "tooltip-control-base-family" },
  { key: "settings.page-ground", helpId: "tooltip-control-page-ground" },

  { key: "editor.paragraph", helpId: "tooltip-editor-paragraph" },
  { key: "editor.typography", helpId: "tooltip-editor-typography" },
  { key: "editor.symbols", helpId: "tooltip-editor-symbols" },
  { key: "editor.placeholders", helpId: "tooltip-editor-placeholders" },
  { key: "editor.paragraph-info", helpId: "tooltip-editor-info" },
  { key: "editor.image-geometry", helpId: "tooltip-editor-image-geometry" },
  { key: "editor.image-color", helpId: "tooltip-editor-image-color" },
  { key: "editor.image-info", helpId: "tooltip-editor-image-info" },
  { key: "editor.snap-columns", helpId: "tooltip-control-snap-x" },
  { key: "editor.snap-baseline", helpId: "tooltip-control-snap-y" },
  { key: "editor.reflow", helpId: "tooltip-control-reflow" },
  { key: "editor.hyphenation", helpId: "tooltip-control-hyphenation" },
  { key: "editor.tracking", helpId: "tooltip-control-tracking" },
  { key: "editor.transparency", helpId: "tooltip-control-transparency" },

  { key: "preview.create-page", helpId: "tooltip-preview-create" },
  { key: "preview.layer-affordances", helpId: "tooltip-preview-layer-affordances" },
  { key: "project.pages", helpId: "tooltip-project-pages" },
  { key: "project.layers", helpId: "tooltip-project-layer-cards" },
  { key: "project.metadata", helpId: "tooltip-project-metadata" },
  { key: "project.facing-pages", helpId: "tooltip-project-facing-pages" },
  { key: "presets.browser", helpId: "tooltip-preset-browser" },
  { key: "presets.user-library", helpId: "tooltip-user-library" },

  { key: "export.dialog", helpId: "tooltip-export-dialog" },
  { key: "export.format", helpId: "tooltip-export-format" },
  { key: "export.visibility", helpId: "tooltip-export-visibility" },
  { key: "export.bleed", helpId: "tooltip-export-bleed" },
  { key: "export.page-range", helpId: "tooltip-export-page-range" },
  { key: "export.metadata", helpId: "tooltip-export-metadata" },
  { key: "export.progress-log", helpId: "tooltip-export-progress-log" },
  { key: "account.cloud", helpId: "tooltip-account-cloud" },
  { key: "feedback.panel", helpId: "tooltip-feedback-panel" },
  { key: "legal.panel", helpId: "tooltip-legal-panel" },

  { key: "common.close", shortOnly: true, reason: "obvious" },
  { key: "common.cancel", shortOnly: true, reason: "confirmation" },
  { key: "common.confirm", shortOnly: true, reason: "confirmation" },
  { key: "common.clear-field", shortOnly: true, reason: "field-label" },
  { key: "editor.symbol-button", shortOnly: true, reason: "obvious" },
  { key: "color.swatch", shortOnly: true, reason: "obvious" },
]
