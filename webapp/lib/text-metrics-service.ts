import {
  clearOpticalMarginMeasurementCache,
} from "@/lib/optical-margin"
import {
  type TextWrapTraceCollector,
  type WrappedTextLine,
} from "@/lib/text-layout"
import {
  type BaseTextFormat,
  type TextFormatRun,
} from "@/lib/text-format-runs"
import {
  normalizeTrackingScale,
} from "@/lib/text-rendering"
import {
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/lib/text-tracking-runs"
import type { FontFamily } from "@/lib/config/fonts"
import type {
  TextMeasureContext,
  TextMetricsEngineFactory,
} from "@/lib/text-metrics-engine"
import type { TextAlignMode } from "@/lib/types/layout-primitives"

const DEFAULT_TEXT_CACHE_LIMIT = 5000

function makeCacheKeyForTrackingRuns(runs: readonly TextTrackingRun[]): string {
  return runs.map((run) => `${run.start}:${run.end}:${run.trackingScale}`).join("|")
}

function makeCacheKeyForBaseFormat<StyleKey extends string, Family extends string>(
  baseFormat?: BaseTextFormat<StyleKey, Family>,
): string {
  if (!baseFormat) return "-"
  return `${baseFormat.fontFamily}:${baseFormat.fontWeight}:${baseFormat.italic ? 1 : 0}:${baseFormat.styleKey}:${baseFormat.color}`
}

function makeCacheKeyForFormatRuns<StyleKey extends string, Family extends string>(
  runs?: readonly TextFormatRun<StyleKey, Family>[],
): string {
  return (runs ?? [])
    .map((run) => `${run.start}:${run.end}:${run.fontFamily ?? ""}:${run.fontWeight ?? ""}:${run.italic === true ? 1 : run.italic === false ? 0 : ""}:${run.styleKey ?? ""}:${run.color ?? ""}`)
    .join("|")
}

function makeCacheKeyForResolvedFontSizes<StyleKey extends string, Family extends string>(
  baseFormat?: BaseTextFormat<StyleKey, Family>,
  formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
  resolveFontSize?: (styleKey: StyleKey) => number,
): string {
  if (!baseFormat || !resolveFontSize) return "-"
  const styleKeys = new Set<StyleKey>([baseFormat.styleKey])
  for (const run of formatRuns ?? []) {
    if (run.styleKey !== undefined) {
      styleKeys.add(run.styleKey)
    }
  }
  return [...styleKeys]
    .sort()
    .map((styleKey) => `${styleKey}:${resolveFontSize(styleKey).toFixed(4)}`)
    .join("|")
}

export type TextMetricsServiceOptions<StyleKey extends string, Family extends string = FontFamily> = {
  cacheLimit?: number
  metricsEngineFactory: TextMetricsEngineFactory<StyleKey, Family>
}

export function createTextMetricsService<StyleKey extends string, Family extends string = FontFamily>(
  options: TextMetricsServiceOptions<StyleKey, Family>,
) {
  const cacheLimit = options.cacheLimit ?? DEFAULT_TEXT_CACHE_LIMIT
  const metricsEngineFactory = options.metricsEngineFactory
  const measureWidthCache = new Map<string, number>()
  const wrapTextCache = new Map<string, WrappedTextLine[]>()
  const opticalOffsetCache = new Map<string, number>()
  const textAscentCache = new Map<string, number>()
  const textDescentCache = new Map<string, number>()

  const makeCachedValue = <T,>(cache: Map<string, T>, key: string, compute: () => T): T => {
    const existing = cache.get(key)
    if (existing !== undefined) return existing
    const value = compute()
    cache.set(key, value)
    if (cache.size > cacheLimit) cache.clear()
    return value
  }

  const clearCaches = () => {
    measureWidthCache.clear()
    wrapTextCache.clear()
    opticalOffsetCache.clear()
    textAscentCache.clear()
    textDescentCache.clear()
    clearOpticalMarginMeasurementCache()
  }

  const getMeasuredTextWidth = (
    context: TextMeasureContext,
    text: string,
    trackingScale: number,
    opticalKerning: boolean,
    sourceText = text,
    trackingRuns: readonly TextTrackingRun[] = [],
    range?: { start: number; end: number },
    baseFormat?: BaseTextFormat<StyleKey, Family>,
    formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
    resolveFontSize?: (styleKey: StyleKey) => number,
  ): number => {
    const normalizedTrackingScale = normalizeTrackingScale(trackingScale)
    const normalizedRuns = normalizeTextTrackingRuns(sourceText, trackingRuns, normalizedTrackingScale)
    const rangeKey = range ? `${range.start}:${range.end}` : "-"
    const runsKey = makeCacheKeyForTrackingRuns(normalizedRuns)
    const formatBaseKey = makeCacheKeyForBaseFormat(baseFormat)
    const formatRunsKey = makeCacheKeyForFormatRuns(formatRuns)
    const resolvedFontSizesKey = makeCacheKeyForResolvedFontSizes(baseFormat, formatRuns, resolveFontSize)
    const engine = metricsEngineFactory(context)
    const key = `${engine.id}::${context.font}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${rangeKey}::${runsKey}::${formatBaseKey}::${formatRunsKey}::${resolvedFontSizesKey}::${text}`

    return makeCachedValue(measureWidthCache, key, () => engine.measureWidth({
      text,
      canvasFont: context.font,
      trackingScale: normalizedTrackingScale,
      opticalKerning,
      sourceText,
      trackingRuns: normalizedRuns,
      range,
      baseFormat,
      formatRuns,
      resolveFontSize,
    }))
  }

  const getWrappedText = (
    context: TextMeasureContext,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
    trackingRuns: readonly TextTrackingRun[] = [],
    baseFormat?: BaseTextFormat<StyleKey, Family>,
    formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
    resolveFontSize?: (styleKey: StyleKey) => number,
    trace?: TextWrapTraceCollector,
  ): WrappedTextLine[] => {
    const normalizedTrackingScale = normalizeTrackingScale(trackingScale)
    const normalizedRuns = normalizeTextTrackingRuns(text, trackingRuns, normalizedTrackingScale)
    const runsKey = makeCacheKeyForTrackingRuns(normalizedRuns)
    const formatRunsKey = makeCacheKeyForFormatRuns(formatRuns)
    const formatBaseKey = makeCacheKeyForBaseFormat(baseFormat)
    const resolvedFontSizesKey = makeCacheKeyForResolvedFontSizes(baseFormat, formatRuns, resolveFontSize)
    const engine = metricsEngineFactory(context)
    const key = `${engine.id}::${context.font}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${runsKey}::${formatBaseKey}::${formatRunsKey}::${resolvedFontSizesKey}::${maxWidth.toFixed(4)}::${hyphenate ? 1 : 0}::${text}`
    const computeWrapped = () => engine.wrapText({
      text,
      canvasFont: context.font,
      maxWidth,
      hyphenate,
      trackingScale: normalizedTrackingScale,
      opticalKerning,
      trackingRuns: normalizedRuns,
      baseFormat,
      formatRuns,
      resolveFontSize,
      trace,
    })
    const wrapped = trace ? computeWrapped() : makeCachedValue(wrapTextCache, key, computeWrapped)

    return wrapped.map((line) => ({ ...line }))
  }

  const getOpticalOffset = (
    context: TextMeasureContext,
    styleKey: StyleKey,
    line: string,
    align: TextAlignMode,
    fontSize: number,
    opticalKerning: boolean,
  ): number => {
    const engine = metricsEngineFactory(context)
    const key = `${engine.id}::${context.font}::${opticalKerning ? 1 : 0}::${styleKey}::${line}::${align}::${fontSize.toFixed(4)}`
    return makeCachedValue(opticalOffsetCache, key, () => engine.opticalOffset({
      styleKey,
      line,
      align,
      fontSize,
      opticalKerning,
    }))
  }

  const getTextAscent = (
    context: TextMeasureContext,
    canvasFont: string,
    fallbackFontSize: number,
  ): number => {
    const engine = metricsEngineFactory(context)
    const key = `${engine.id}::${canvasFont}::${fallbackFontSize.toFixed(4)}`
    return makeCachedValue(textAscentCache, key, () => engine.textAscent(canvasFont, fallbackFontSize))
  }

  const getTextDescent = (
    context: TextMeasureContext,
    canvasFont: string,
    fallbackFontSize: number,
  ): number => {
    const engine = metricsEngineFactory(context)
    const key = `${engine.id}::${canvasFont}::${fallbackFontSize.toFixed(4)}`
    return makeCachedValue(textDescentCache, key, () => engine.textDescent(canvasFont, fallbackFontSize))
  }

  return {
    clearCaches,
    getMeasuredTextWidth,
    getWrappedText,
    getOpticalOffset,
    getTextAscent,
    getTextDescent,
  }
}
