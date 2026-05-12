import type { BlockEditorStyleOption } from "@/gui/editors/block-editor-types"
import type { GridResult } from "@/core/layout/grid-calculator"
import { translateMessage } from "@/core/i18n/messages"

export type PreviewTypographyStyleKey = keyof GridResult["typography"]["styles"]

export const PREVIEW_STYLE_OPTIONS: BlockEditorStyleOption<PreviewTypographyStyleKey>[] = [
  { value: "display", label: translateMessage("ui.editor.hierarchyLabels.display") },
  { value: "headline", label: translateMessage("ui.editor.hierarchyLabels.headline") },
  { value: "subhead", label: translateMessage("ui.editor.hierarchyLabels.subhead") },
  { value: "body", label: translateMessage("ui.editor.hierarchyLabels.body") },
  { value: "caption", label: translateMessage("ui.editor.hierarchyLabels.caption") },
  { value: "fx", label: translateMessage("ui.editor.hierarchyLabels.custom") },
]

const DEFAULT_COPYRIGHT_YEAR = new Date().getFullYear()

const PREVIEW_DUMMY_TEXT_BY_STYLE: Record<PreviewTypographyStyleKey, string> = {
  fx: translateMessage("app.defaultContent.display"),
  display: translateMessage("app.defaultContent.display"),
  headline: translateMessage("app.defaultContent.headline"),
  subhead: translateMessage("app.defaultContent.subhead"),
  body: translateMessage("app.defaultContent.body"),
  caption: translateMessage("app.defaultContent.caption", { year: DEFAULT_COPYRIGHT_YEAR }),
}

export function formatPtSize(size: number): string {
  return Number.isInteger(size) ? `${size}pt` : `${size.toFixed(1)}pt`
}

export function resolveCustomStyleSeedMetrics<StyleKey extends string>({
  currentStyle,
  currentCustomSize,
  currentCustomLeading,
  isCustomStyle,
  getStyleSize,
  getStyleLeading,
}: {
  currentStyle: StyleKey
  currentCustomSize: number
  currentCustomLeading: number
  isCustomStyle: (styleKey: StyleKey) => boolean
  getStyleSize: (styleKey: StyleKey) => number
  getStyleLeading: (styleKey: StyleKey) => number
}): { size: number; leading: number } {
  if (isCustomStyle(currentStyle)) {
    return {
      size: currentCustomSize,
      leading: currentCustomLeading,
    }
  }
  return {
    size: getStyleSize(currentStyle),
    leading: getStyleLeading(currentStyle),
  }
}

export function getDummyTextForStyle(style: string): string {
  return PREVIEW_DUMMY_TEXT_BY_STYLE[style as PreviewTypographyStyleKey] ?? PREVIEW_DUMMY_TEXT_BY_STYLE.body
}
