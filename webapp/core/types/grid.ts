import type { GridRhythm, GridRhythmColsDirection, GridRhythmRowsDirection, TypographyScale } from "@/lib/config/defaults"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { FontFamily } from "@/lib/config/fonts"
import type { CanvasRatioKey, GridResult, GridSettings } from "@/lib/grid-calculator"
import type { CustomMarginMultipliers } from "@/lib/workspace-ui-schema"

export type PageOrientation = "portrait" | "landscape"
export type MarginMethod = 1 | 2 | 3

export type GridConfig = {
  canvasRatio: CanvasRatioKey
  customRatioWidth: number
  customRatioHeight: number
  orientation: PageOrientation
  rotation: number
  marginMethod: MarginMethod
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
  format: string
}

export type GridCalculationInput = GridSettings
export type PlannedGrid = GridResult
