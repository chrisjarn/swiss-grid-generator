import type { BlockEditorStyleOption } from "@/gui/editors/block-editor-types"
import type { GridResult } from "@/lib/grid-calculator"
import { translateMessage } from "@/lib/i18n/messages"

export type PreviewTypographyStyleKey = keyof GridResult["typography"]["styles"]

export const PREVIEW_STYLE_OPTIONS: BlockEditorStyleOption<PreviewTypographyStyleKey>[] = [
  { value: "display", label: translateMessage("editor.hierarchyLabels.display") },
  { value: "headline", label: translateMessage("editor.hierarchyLabels.headline") },
  { value: "subhead", label: translateMessage("editor.hierarchyLabels.subhead") },
  { value: "body", label: translateMessage("editor.hierarchyLabels.body") },
  { value: "caption", label: translateMessage("editor.hierarchyLabels.caption") },
  { value: "fx", label: translateMessage("editor.hierarchyLabels.custom") },
]

const DEFAULT_COPYRIGHT_YEAR = new Date().getFullYear()

const PREVIEW_DUMMY_TEXT_BY_STYLE: Record<PreviewTypographyStyleKey, string> = {
  fx: translateMessage("defaultContent.display"),
  display: translateMessage("defaultContent.display"),
  headline: translateMessage("defaultContent.headline"),
  subhead: translateMessage("defaultContent.subhead"),
  body: translateMessage("defaultContent.body"),
  caption: translateMessage("defaultContent.caption", { year: DEFAULT_COPYRIGHT_YEAR }),
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
