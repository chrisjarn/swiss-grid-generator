import type { TextAlignMode } from "@/lib/types/layout-primitives"
import type { TextWrapTraceCollector, WrappedTextLine } from "@/lib/text-layout"

export type TextMeasureContext = {
  font: string
  fontKerning?: "auto" | "normal" | "none"
  measureText: (text: string) => TextMetrics
}

export type TextWidthRequest<StyleKey extends string, Family extends string> = {
  text: string
  canvasFont: string
  trackingScale: number
  opticalKerning: boolean
  sourceText: string
  trackingRuns: readonly import("@/lib/text-tracking-runs").TextTrackingRun[]
  range?: { start: number; end: number }
  baseFormat?: import("@/lib/text-format-runs").BaseTextFormat<StyleKey, Family>
  formatRuns?: readonly import("@/lib/text-format-runs").TextFormatRun<StyleKey, Family>[]
  resolveFontSize?: (styleKey: StyleKey) => number
}

export type TextWrapRequest<StyleKey extends string, Family extends string> = {
  text: string
  canvasFont: string
  maxWidth: number
  hyphenate: boolean
  trackingScale: number
  opticalKerning: boolean
  trackingRuns: readonly import("@/lib/text-tracking-runs").TextTrackingRun[]
  baseFormat?: import("@/lib/text-format-runs").BaseTextFormat<StyleKey, Family>
  formatRuns?: readonly import("@/lib/text-format-runs").TextFormatRun<StyleKey, Family>[]
  resolveFontSize?: (styleKey: StyleKey) => number
  trace?: TextWrapTraceCollector
}

export type OpticalOffsetRequest<StyleKey extends string> = {
  canvasFont: string
  styleKey: StyleKey
  line: string
  align: TextAlignMode
  fontSize: number
  opticalKerning: boolean
}

export type TextMetricsEngine<StyleKey extends string, Family extends string> = {
  id: string
  measureWidth: (request: TextWidthRequest<StyleKey, Family>) => number
  wrapText: (request: TextWrapRequest<StyleKey, Family>) => WrappedTextLine[]
  textAscent: (canvasFont: string, fallbackFontSize: number) => number
  textDescent: (canvasFont: string, fallbackFontSize: number) => number
  opticalOffset: (request: OpticalOffsetRequest<StyleKey>) => number
}

export type TextMetricsEngineFactory<StyleKey extends string, Family extends string> = (
  context: TextMeasureContext,
) => TextMetricsEngine<StyleKey, Family>
