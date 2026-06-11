import type { GridRhythm, GridRhythmColsDirection, GridRhythmRowsDirection, TypographyScale } from "@/core/config/defaults"
import type { FontFamily } from "@/core/config/fonts"
import type { ImageColorSchemeId } from "@/core/config/color-schemes"
import type { CanvasRatioKey } from "@/core/layout/grid-calculator"

export const SECTION_KEYS = ["brand", "format", "baseline", "margins", "gutter", "typo", "color", "summary"] as const
export type SectionKey = typeof SECTION_KEYS[number]
export const SESSION_UI_SETTING_KEYS = [
  "showBaselines",
  "showModules",
  "showMargins",
  "showImagePlaceholders",
  "showTypography",
  "showLayers",
  "collapsed",
] as const
export type SessionUiSettingKey = typeof SESSION_UI_SETTING_KEYS[number]

export type CustomMarginMultipliers = {
  top: number
  left: number
  right: number
  bottom: number
}

export type UiSettingsSnapshot = {
  canvasRatio: CanvasRatioKey
  customRatioWidth: number
  customRatioHeight: number
  orientation: "portrait" | "landscape"
  rotation: number
  marginMethod: 1 | 2 | 3
  gridCols: number
  gridRows: number
  gutterMultiple: number
  rhythm: GridRhythm
  rhythmRowsEnabled: boolean
  rhythmRowsDirection: GridRhythmRowsDirection
  rhythmColsEnabled: boolean
  rhythmColsDirection: GridRhythmColsDirection
  typographyScale: TypographyScale
  fibonacciSequenceStartIndex: number
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  canvasBackground: string | null
  customBaseline: number
  useCustomMargins: boolean
  customMarginMultipliers: CustomMarginMultipliers
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  showLayers: boolean
  collapsed: Record<SectionKey, boolean>
}

export function buildCollapsedSectionState(
  source?: Partial<Record<SectionKey, unknown>> | null,
  fallback?: Record<SectionKey, boolean>,
): Record<SectionKey, boolean> {
  return SECTION_KEYS.reduce(
    (acc, key) => {
      const fallbackValue = fallback?.[key]
      const raw = source?.[key]
      acc[key] = typeof raw === "boolean" ? raw : typeof fallbackValue === "boolean" ? fallbackValue : true
      return acc
    },
    {} as Record<SectionKey, boolean>,
  )
}
