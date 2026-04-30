import type { TextAlignMode } from "@/lib/types/layout-primitives"
import {
  createDiagnosticBrowserCanvasTextMetricsEngine,
} from "@/lib/diagnostic-browser-canvas-text-metrics-engine"
import type {
  TextMeasureContext,
  TextMetricsEngineFactory,
} from "@/lib/text-metrics-engine"
import type {
  BaseTextFormat,
  TextFormatRun,
} from "@/lib/text-format-runs"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"

export type TextMetricsParitySample<StyleKey extends string, Family extends string> = {
  label: string
  canvasFont: string
  text: string
  maxWidth: number
  hyphenate: boolean
  trackingScale: number
  opticalKerning: boolean
  styleKey: StyleKey
  fontSize: number
  align: TextAlignMode
  sourceText?: string
  trackingRuns?: readonly TextTrackingRun[]
  baseFormat?: BaseTextFormat<StyleKey, Family>
  formatRuns?: readonly TextFormatRun<StyleKey, Family>[]
  resolveFontSize?: (styleKey: StyleKey) => number
}

export type TextMetricsParityDelta = {
  label: string
  activeEngineId: string
  candidateEngineId: string
  activeWidth: number
  candidateWidth: number
  widthDelta: number
  activeWrappedText: string
  candidateWrappedText: string
  ascentDelta: number
  descentDelta: number
  opticalOffsetDelta: number
  wrappedLineCountDelta: number
  wrappedTextChanged: boolean
}

export function compareTextMetricsEngines<StyleKey extends string, Family extends string>({
  context,
  samples,
  candidateFactory,
}: {
  context: TextMeasureContext
  samples: readonly TextMetricsParitySample<StyleKey, Family>[]
  candidateFactory: TextMetricsEngineFactory<StyleKey, Family>
}): TextMetricsParityDelta[] {
  const activeEngine = createDiagnosticBrowserCanvasTextMetricsEngine<StyleKey, Family>(context)
  const candidateEngine = candidateFactory(context)

  return samples.map((sample) => {
    context.font = sample.canvasFont
    const sourceText = sample.sourceText ?? sample.text
    const trackingRuns = sample.trackingRuns ?? []
    const activeWidth = activeEngine.measureWidth({
      text: sample.text,
      canvasFont: sample.canvasFont,
      trackingScale: sample.trackingScale,
      opticalKerning: sample.opticalKerning,
      sourceText,
      trackingRuns,
      baseFormat: sample.baseFormat,
      formatRuns: sample.formatRuns,
      resolveFontSize: sample.resolveFontSize,
    })
    const candidateWidth = candidateEngine.measureWidth({
      text: sample.text,
      canvasFont: sample.canvasFont,
      trackingScale: sample.trackingScale,
      opticalKerning: sample.opticalKerning,
      sourceText,
      trackingRuns,
      baseFormat: sample.baseFormat,
      formatRuns: sample.formatRuns,
      resolveFontSize: sample.resolveFontSize,
    })
    const activeWrapped = activeEngine.wrapText({
      text: sample.text,
      canvasFont: sample.canvasFont,
      maxWidth: sample.maxWidth,
      hyphenate: sample.hyphenate,
      trackingScale: sample.trackingScale,
      opticalKerning: sample.opticalKerning,
      trackingRuns,
      baseFormat: sample.baseFormat,
      formatRuns: sample.formatRuns,
      resolveFontSize: sample.resolveFontSize,
    })
    const candidateWrapped = candidateEngine.wrapText({
      text: sample.text,
      canvasFont: sample.canvasFont,
      maxWidth: sample.maxWidth,
      hyphenate: sample.hyphenate,
      trackingScale: sample.trackingScale,
      opticalKerning: sample.opticalKerning,
      trackingRuns,
      baseFormat: sample.baseFormat,
      formatRuns: sample.formatRuns,
      resolveFontSize: sample.resolveFontSize,
    })

    return {
      label: sample.label,
      activeEngineId: activeEngine.id,
      candidateEngineId: candidateEngine.id,
      activeWidth,
      candidateWidth,
      widthDelta: candidateWidth - activeWidth,
      activeWrappedText: activeWrapped.map((line) => line.text).join("\n"),
      candidateWrappedText: candidateWrapped.map((line) => line.text).join("\n"),
      ascentDelta: candidateEngine.textAscent(sample.canvasFont, sample.fontSize)
        - activeEngine.textAscent(sample.canvasFont, sample.fontSize),
      descentDelta: candidateEngine.textDescent(sample.canvasFont, sample.fontSize)
        - activeEngine.textDescent(sample.canvasFont, sample.fontSize),
      opticalOffsetDelta: candidateEngine.opticalOffset({
        styleKey: sample.styleKey,
        line: sample.text,
        align: sample.align,
        fontSize: sample.fontSize,
        opticalKerning: sample.opticalKerning,
      }) - activeEngine.opticalOffset({
        styleKey: sample.styleKey,
        line: sample.text,
        align: sample.align,
        fontSize: sample.fontSize,
        opticalKerning: sample.opticalKerning,
      }),
      wrappedLineCountDelta: candidateWrapped.length - activeWrapped.length,
      wrappedTextChanged: candidateWrapped.map((line) => line.text).join("\n")
        !== activeWrapped.map((line) => line.text).join("\n"),
    }
  })
}
