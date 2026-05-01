import {
  getOpticalMarginAnchorOffset,
} from "@/lib/optical-margin"
import {
  wrapTextDetailed,
  type WrappedTextLine,
} from "@/lib/text-layout"
import {
  measureFormattedTextRangeWidth,
} from "@/lib/text-format-runs"
import {
  measureCanvasTextWidth,
  DEFAULT_TRACKING_SCALE,
  setCanvasFontKerning,
} from "@/lib/text-rendering"
import {
  measureTrackedTextRangeWidth,
} from "@/lib/text-tracking-runs"
import type {
  OpticalOffsetRequest,
  TextMeasureContext,
  TextMetricsEngine,
  TextWidthRequest,
  TextWrapRequest,
} from "@/lib/text-metrics-engine"

export function measureDiagnosticCanvasTextAscent(
  context: CanvasRenderingContext2D | null,
  canvasFont: string,
  fallbackFontSize: number,
): number {
  if (!context) return fallbackFontSize * 0.8
  context.font = canvasFont
  const metrics = context.measureText("Hg")
  return metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fallbackFontSize * 0.8
}

export function measureDiagnosticCanvasTextDescent(
  context: CanvasRenderingContext2D | null,
  canvasFont: string,
  fallbackFontSize: number,
): number {
  if (!context) return fallbackFontSize * 0.2
  context.font = canvasFont
  const metrics = context.measureText("Hgyp<>%")
  return metrics.actualBoundingBoxDescent > 0 ? metrics.actualBoundingBoxDescent : fallbackFontSize * 0.2
}

export function createDiagnosticBrowserCanvasTextMetricsEngine<StyleKey extends string, Family extends string>(
  context: TextMeasureContext,
): TextMetricsEngine<StyleKey, Family> {
  const engine: TextMetricsEngine<StyleKey, Family> = {
    id: "browser-canvas-v1",
    measureWidth: ({
      text,
      trackingScale,
      opticalKerning,
      sourceText,
      trackingRuns,
      range,
      baseFormat,
      formatRuns,
      resolveFontSize,
    }: TextWidthRequest<StyleKey, Family>): number => {
      setCanvasFontKerning(context, opticalKerning)
      if (range && baseFormat && resolveFontSize && (trackingRuns.length > 0 || (formatRuns?.length ?? 0) > 0)) {
        return measureFormattedTextRangeWidth(context, {
          sourceText,
          renderedText: text,
          range,
          baseFormat,
          formatRuns,
          baseTrackingScale: trackingScale,
          trackingRuns,
          resolveFontSize,
          opticalKerning,
        })
      }
      if (range && trackingRuns.length > 0) {
        const sizeMatch = context.font.match(/(\d+(?:\.\d+)?)px/)
        const fontSize = sizeMatch ? Number(sizeMatch[1]) : 0
        return measureTrackedTextRangeWidth(context, {
          sourceText,
          renderedText: text,
          range,
          baseTrackingScale: trackingScale,
          runs: trackingRuns,
          fontSize,
          opticalKerning,
        })
      }
      return measureCanvasTextWidth(context, text, trackingScale, undefined, opticalKerning)
    },
    wrapText: ({
      text,
      canvasFont,
      maxWidth,
      hyphenate,
      trackingScale,
      opticalKerning,
      trackingRuns,
      baseFormat,
      formatRuns,
      resolveFontSize,
      trace,
    }: TextWrapRequest<StyleKey, Family>): WrappedTextLine[] => wrapTextDetailed(
      text,
      maxWidth,
      hyphenate,
      (sample, range) => engine.measureWidth({
        text: sample,
        canvasFont,
        trackingScale,
        opticalKerning,
        sourceText: text,
        trackingRuns,
        range,
        baseFormat,
        formatRuns,
        resolveFontSize,
      }),
      trace,
    ),
    textAscent: (canvasFont, fallbackFontSize) => measureDiagnosticCanvasTextAscent(
      context as CanvasRenderingContext2D,
      canvasFont,
      fallbackFontSize,
    ),
    textDescent: (canvasFont, fallbackFontSize) => measureDiagnosticCanvasTextDescent(
      context as CanvasRenderingContext2D,
      canvasFont,
      fallbackFontSize,
    ),
    opticalOffset: ({
      canvasFont,
      styleKey,
      line,
      align,
      fontSize,
      opticalKerning,
    }: OpticalOffsetRequest<StyleKey>): number => getOpticalMarginAnchorOffset({
      line,
      align,
      fontSize,
      styleKey,
      font: canvasFont,
      measureWidth: (sample) => engine.measureWidth({
        text: sample,
        canvasFont,
        trackingScale: DEFAULT_TRACKING_SCALE,
        opticalKerning,
        sourceText: sample,
        trackingRuns: [],
      }),
    }),
  }

  return engine
}
