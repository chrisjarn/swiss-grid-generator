import {
  type TextWrapTraceCollector,
  type WrappedTextLine,
} from "@/core/layout/text-layout"
import {
  type BaseTextFormat,
  type TextFormatRun,
} from "@/core/layout/text-format-runs"
import {
  normalizeTrackingScale,
} from "@/core/layout/text-rendering"
import {
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/core/layout/text-tracking-runs"
import type { FontFamily } from "@/core/config/fonts"
import type {
  TextMeasureContext,
  TextMetricsEngine,
  TextMetricsEngineFactory,
} from "@/core/layout/text-metrics-engine"
import type { TextAlignMode } from "@/core/types/layout-primitives"

const DEFAULT_TEXT_CACHE_LIMIT = 5000
const EMPTY_TRACKING_RUNS: readonly TextTrackingRun[] = []
const EMPTY_FORMAT_RUNS: readonly TextFormatRun<string, string>[] = []

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

type FontSizeResolver<StyleKey extends string> = (styleKey: StyleKey) => number

export type TextMetricsService<StyleKey extends string, Family extends string = FontFamily> = {
  clearCaches: () => void
  getMeasuredTextWidth: (
    context: TextMeasureContext,
    text: string,
    trackingScale: number,
    opticalKerning: boolean,
    sourceText?: string,
    trackingRuns?: readonly TextTrackingRun[],
    range?: { start: number; end: number },
    baseFormat?: BaseTextFormat<StyleKey, Family>,
    formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
    resolveFontSize?: (styleKey: StyleKey) => number,
    canvasFont?: string,
  ) => number
  getWrappedText: (
    context: TextMeasureContext,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
    trackingRuns?: readonly TextTrackingRun[],
    baseFormat?: BaseTextFormat<StyleKey, Family>,
    formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
    resolveFontSize?: (styleKey: StyleKey) => number,
    trace?: TextWrapTraceCollector,
    canvasFont?: string,
  ) => WrappedTextLine[]
  getOpticalOffset: (
    context: TextMeasureContext,
    styleKey: StyleKey,
    line: string,
    align: TextAlignMode,
    fontSize: number,
    opticalKerning: boolean,
    canvasFont?: string,
  ) => number
  getTextAscent: (
    context: TextMeasureContext,
    canvasFont: string,
    fallbackFontSize: number,
  ) => number
  getTextDescent: (
    context: TextMeasureContext,
    canvasFont: string,
    fallbackFontSize: number,
  ) => number
}

export function createTextMetricsService<StyleKey extends string, Family extends string = FontFamily>(
  options: TextMetricsServiceOptions<StyleKey, Family>,
): TextMetricsService<StyleKey, Family> {
  const cacheLimit = options.cacheLimit ?? DEFAULT_TEXT_CACHE_LIMIT
  const metricsEngineFactory = options.metricsEngineFactory
  const measureWidthCache = new Map<string, number>()
  const wrapTextCache = new Map<string, WrappedTextLine[]>()
  const opticalOffsetCache = new Map<string, number>()
  const textAscentCache = new Map<string, number>()
  const textDescentCache = new Map<string, number>()
  let engineCache = new WeakMap<TextMeasureContext, TextMetricsEngine<StyleKey, Family>>()
  let normalizedTrackingRunsCache = new WeakMap<readonly TextTrackingRun[], Map<string, readonly TextTrackingRun[]>>()
  let trackingRunSignatureCache = new WeakMap<readonly TextTrackingRun[], string>()
  let formatRunSignatureCache = new WeakMap<readonly TextFormatRun<StyleKey, Family>[], string>()
  let baseFormatSignatureCache = new WeakMap<BaseTextFormat<StyleKey, Family>, string>()
  let resolvedFontSizesSignatureCache = new WeakMap<FontSizeResolver<StyleKey>, Map<string, string>>()

  const makeCachedValue = <T,>(cache: Map<string, T>, key: string, compute: () => T): T => {
    const existing = cache.get(key)
    if (existing !== undefined) return existing
    const value = compute()
    cache.set(key, value)
    if (cache.size > cacheLimit) {
      cache.clear()
      cache.set(key, value)
    }
    return value
  }

  const clearCaches = () => {
    measureWidthCache.clear()
    wrapTextCache.clear()
    opticalOffsetCache.clear()
    textAscentCache.clear()
    textDescentCache.clear()
    engineCache = new WeakMap<TextMeasureContext, TextMetricsEngine<StyleKey, Family>>()
    normalizedTrackingRunsCache = new WeakMap<readonly TextTrackingRun[], Map<string, readonly TextTrackingRun[]>>()
    trackingRunSignatureCache = new WeakMap<readonly TextTrackingRun[], string>()
    formatRunSignatureCache = new WeakMap<readonly TextFormatRun<StyleKey, Family>[], string>()
    baseFormatSignatureCache = new WeakMap<BaseTextFormat<StyleKey, Family>, string>()
    resolvedFontSizesSignatureCache = new WeakMap<FontSizeResolver<StyleKey>, Map<string, string>>()
  }

  const getEngine = (context: TextMeasureContext): TextMetricsEngine<StyleKey, Family> => {
    const existing = engineCache.get(context)
    if (existing) return existing
    const engine = metricsEngineFactory(context)
    engineCache.set(context, engine)
    return engine
  }

  const getNormalizedTrackingRuns = (
    sourceText: string,
    trackingRuns: readonly TextTrackingRun[],
    normalizedTrackingScale: number,
  ): readonly TextTrackingRun[] => {
    if (trackingRuns.length === 0) return EMPTY_TRACKING_RUNS
    let cacheBySource = normalizedTrackingRunsCache.get(trackingRuns)
    if (!cacheBySource) {
      cacheBySource = new Map<string, readonly TextTrackingRun[]>()
      normalizedTrackingRunsCache.set(trackingRuns, cacheBySource)
    }
    const key = `${normalizedTrackingScale}::${sourceText}`
    const cached = cacheBySource.get(key)
    if (cached) return cached
    const normalized = normalizeTextTrackingRuns(sourceText, trackingRuns, normalizedTrackingScale)
    cacheBySource.set(key, normalized)
    return normalized
  }

  const getTrackingRunsKey = (runs: readonly TextTrackingRun[]): string => {
    if (runs.length === 0) return "-"
    const cached = trackingRunSignatureCache.get(runs)
    if (cached !== undefined) return cached
    const key = makeCacheKeyForTrackingRuns(runs)
    trackingRunSignatureCache.set(runs, key)
    return key
  }

  const getBaseFormatKey = (
    baseFormat?: BaseTextFormat<StyleKey, Family>,
  ): string => {
    if (!baseFormat) return "-"
    const cached = baseFormatSignatureCache.get(baseFormat)
    if (cached !== undefined) return cached
    const key = makeCacheKeyForBaseFormat(baseFormat)
    baseFormatSignatureCache.set(baseFormat, key)
    return key
  }

  const getFormatRunsKey = (
    formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
  ): string => {
    if (!formatRuns || formatRuns.length === 0) return "-"
    const cached = formatRunSignatureCache.get(formatRuns)
    if (cached !== undefined) return cached
    const key = makeCacheKeyForFormatRuns(formatRuns)
    formatRunSignatureCache.set(formatRuns, key)
    return key
  }

  const getResolvedFontSizesKey = (
    baseFormat?: BaseTextFormat<StyleKey, Family>,
    formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
    resolveFontSize?: FontSizeResolver<StyleKey>,
  ): string => {
    if (!baseFormat || !resolveFontSize) return "-"
    const styleKeySetKey = `${baseFormat.styleKey}::${getFormatRunsKey(
      (formatRuns ?? EMPTY_FORMAT_RUNS) as readonly TextFormatRun<StyleKey, Family>[],
    )}`
    let cacheByStyleSet = resolvedFontSizesSignatureCache.get(resolveFontSize)
    if (!cacheByStyleSet) {
      cacheByStyleSet = new Map<string, string>()
      resolvedFontSizesSignatureCache.set(resolveFontSize, cacheByStyleSet)
    }
    const cached = cacheByStyleSet.get(styleKeySetKey)
    if (cached !== undefined) return cached
    const key = makeCacheKeyForResolvedFontSizes(baseFormat, formatRuns, resolveFontSize)
    cacheByStyleSet.set(styleKeySetKey, key)
    return key
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
    canvasFont = context.font,
  ): number => {
    const normalizedTrackingScale = normalizeTrackingScale(trackingScale)
    const normalizedRuns = getNormalizedTrackingRuns(sourceText, trackingRuns, normalizedTrackingScale)
    const rangeKey = range ? `${range.start}:${range.end}` : "-"
    const runsKey = getTrackingRunsKey(normalizedRuns)
    const formatBaseKey = getBaseFormatKey(baseFormat)
    const formatRunsKey = getFormatRunsKey(formatRuns)
    const resolvedFontSizesKey = getResolvedFontSizesKey(baseFormat, formatRuns, resolveFontSize)
    const engine = getEngine(context)
    const key = `${engine.id}::${canvasFont}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${rangeKey}::${runsKey}::${formatBaseKey}::${formatRunsKey}::${resolvedFontSizesKey}::${text}`

    return makeCachedValue(measureWidthCache, key, () => engine.measureWidth({
      text,
      canvasFont,
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
    canvasFont = context.font,
  ): WrappedTextLine[] => {
    const normalizedTrackingScale = normalizeTrackingScale(trackingScale)
    const normalizedRuns = getNormalizedTrackingRuns(text, trackingRuns, normalizedTrackingScale)
    const runsKey = getTrackingRunsKey(normalizedRuns)
    const formatRunsKey = getFormatRunsKey(formatRuns)
    const formatBaseKey = getBaseFormatKey(baseFormat)
    const resolvedFontSizesKey = getResolvedFontSizesKey(baseFormat, formatRuns, resolveFontSize)
    const engine = getEngine(context)
    const key = `${engine.id}::${canvasFont}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${runsKey}::${formatBaseKey}::${formatRunsKey}::${resolvedFontSizesKey}::${maxWidth.toFixed(4)}::${hyphenate ? 1 : 0}::${text}`
    const hyphenationCacheKeyPrefix = normalizedRuns.length === 0 && (!formatRuns || formatRuns.length === 0)
      ? `${engine.id}::${canvasFont}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${formatBaseKey}::${maxWidth.toFixed(4)}`
      : undefined
    const computeWrapped = () => engine.wrapText({
      text,
      canvasFont,
      maxWidth,
      hyphenate,
      trackingScale: normalizedTrackingScale,
      opticalKerning,
      trackingRuns: normalizedRuns,
      baseFormat,
      formatRuns,
      resolveFontSize,
      trace,
      hyphenationCacheKeyPrefix,
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
    canvasFont = context.font,
  ): number => {
    const engine = getEngine(context)
    const key = `${engine.id}::${canvasFont}::${opticalKerning ? 1 : 0}::${styleKey}::${line}::${align}::${fontSize.toFixed(4)}`
    return makeCachedValue(opticalOffsetCache, key, () => engine.opticalOffset({
      canvasFont,
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
    const engine = getEngine(context)
    const key = `${engine.id}::${canvasFont}::${fallbackFontSize.toFixed(4)}`
    return makeCachedValue(textAscentCache, key, () => engine.textAscent(canvasFont, fallbackFontSize))
  }

  const getTextDescent = (
    context: TextMeasureContext,
    canvasFont: string,
    fallbackFontSize: number,
  ): number => {
    const engine = getEngine(context)
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
