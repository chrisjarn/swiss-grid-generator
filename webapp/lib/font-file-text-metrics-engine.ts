import { isFontFamily, type FontFamily } from "@/lib/config/fonts"
import {
  getResolvedOutlineFontFace,
  loadOutlineFont,
  type OpenTypeFont,
} from "@/lib/font-outline"
import {
  getOpticalMarginAnchorOffset,
  resolveOpticalKerningPairAdjustment,
  type OpticalGlyphBounds,
} from "@/lib/optical-margin"
import { wrapTextDetailed, type WrappedTextLine } from "@/lib/text-layout"
import {
  resolveFontTrackingGraphemes,
  type ResolvedFormatTrackingGrapheme,
} from "@/lib/text-format-runs"
import { buildTrackingSegmentsForRenderedRange } from "@/lib/text-tracking-runs"
import {
  buildCanvasFont,
  getTrackingLetterSpacing,
  normalizeTrackingScale,
  splitTextForTracking,
} from "@/lib/text-rendering"
import {
  createDiagnosticBrowserCanvasTextMetricsEngine,
} from "@/lib/diagnostic-browser-canvas-text-metrics-engine"
import { isLayoutProfilingEnabled, recordLayoutPerformanceMetric } from "@/lib/layout-performance"
import type {
  TextMeasureContext,
  TextMetricsEngine,
  TextWidthRequest,
  TextWrapRequest,
} from "@/lib/text-metrics-engine"

type FontFileWrapProfilingAccumulator = {
  calls: number
  boundaryCorrections: number
  fallbackCalls: number
  formattedRangeWidthMs: number
  formattedRangeWidthCalls: number
  trackedRangeWidthMs: number
  trackedRangeWidthCalls: number
  plainTextWidthMs: number
  plainTextWidthCalls: number
}

type FormattedRangeWidthGrapheme = {
  text: string
  trackingScale: number
  descriptor: FontFileCanvasFontDescriptor
  styleKey?: string
  sourceStart: number
  sourceEnd: number
}

type RuntimeGlyph = {
  advanceWidth?: number
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  getPath?: (
    x: number,
    y: number,
    fontSize: number,
    options?: Record<string, unknown>,
    font?: RuntimeOpenTypeFont,
  ) => {
    commands?: RuntimePathCommand[]
  }
  getBoundingBox?: () => {
    x1?: number
    x2?: number
    xMin?: number
    xMax?: number
    y1?: number
    y2?: number
    yMin?: number
    yMax?: number
  }
}

type RuntimeOpenTypeFont = OpenTypeFont & {
  unitsPerEm?: number
  ascender?: number
  descender?: number
  stringToGlyphs?: (text: string) => RuntimeGlyph[]
  charToGlyph?: (char: string) => RuntimeGlyph
  getKerningValue?: (left: RuntimeGlyph, right: RuntimeGlyph) => number
}

type RuntimePathCommand =
  | { type: "M"; x: number; y: number }
  | { type: "L"; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Z" }

export type FontFileCanvasFontDescriptor = {
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
}

export type FontFileMetricFace = {
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
}

export type FontFileKerningMode = "none" | "font" | "optical"
type FontFileRangeCalibrationOptions = {
  classCorrection?: boolean
  boundaryClassCorrection?: boolean
  allowDiagnosticBrowserFallback?: boolean
}

export type FontFileMetricFaceBlock<StyleKey extends string> = {
  styleKey: StyleKey
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  textFormatRuns?: readonly {
    fontFamily?: unknown
    fontWeight?: number
    italic?: boolean
    styleKey?: StyleKey
  }[]
}

const loadedFontFileMetrics = new Map<string, RuntimeOpenTypeFont | null>()
const FONT_FILE_DESCRIPTOR_CACHE_LIMIT = 2048
const FONT_FILE_GLYPH_RUN_CACHE_LIMIT = 10000
const FONT_FILE_MEASURE_CACHE_LIMIT = 2048
const fontFileCanvasDescriptorCache = new Map<string, FontFileCanvasFontDescriptor | null>()
const fontFileGlyphRunCache = new WeakMap<RuntimeOpenTypeFont, Map<string, RuntimeGlyph[]>>()
const loadedGlyphBoundsMeasureCache = new Map<string, (glyph: string) => OpticalGlyphBounds | null>()
const loadedOpticalGlyphBoundsMeasureCache = new Map<string, (glyph: string) => OpticalGlyphBounds | null>()
const loadedPairAdvanceMeasureCache = new Map<string, (previous: string, current: string, opticalKerning: boolean) => number | null>()
const loadedCapAscentCache = new Map<string, number>()
const loadedGlyphWidthCache = new Map<string, number | null>()
const loadedPairAdvanceValueCache = new Map<string, number | null>()

function getNowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now()
}

function setBoundedCacheValue<Key, Value>(cache: Map<Key, Value>, key: Key, value: Value, limit: number): void {
  cache.set(key, value)
  if (cache.size > limit) {
    cache.clear()
    cache.set(key, value)
  }
}

function getOutlineOpticalKerningStrengthScale(descriptor: FontFileCanvasFontDescriptor): number {
  if (descriptor.fontFamily === "Playfair Display" && descriptor.fontSize >= 96) return 2
  if (descriptor.fontFamily === "Inter" && descriptor.fontWeight >= 700) return 1
  if (descriptor.fontSize >= 48) return 1.34
  if (descriptor.fontSize >= 20) return 1.2
  if (descriptor.fontSize >= 14) return 1.12
  return 1
}

function getFontFileMetricCacheKey(face: FontFileMetricFace): string {
  return getResolvedOutlineFontFace(face.fontFamily, face.fontWeight, face.italic).cacheKey
}

function getFontFileDescriptorCacheKey(descriptor: FontFileCanvasFontDescriptor): string {
  return `${getFontFileMetricCacheKey(descriptor)}::${descriptor.fontSize.toFixed(6)}`
}

function getFontFileTupleCacheKey(parts: readonly unknown[]): string {
  return JSON.stringify(parts)
}

function resolveKnownFamily(fontFamilyStack: string): FontFamily | null {
  const normalized = fontFamilyStack.trim()
  for (const definition of [
    "Noto Sans Symbols 2",
    "Libre Baskerville",
    "Playfair Display",
    "Libre Franklin",
    "IBM Plex Sans",
    "IBM Plex Mono",
    "Bodoni Moda",
    "EB Garamond",
    "Work Sans",
    "Besley",
    "Inter",
    "Jost",
  ]) {
    if (!isFontFamily(definition)) continue
    if (
      normalized === definition
      || normalized.startsWith(`${definition},`)
      || normalized.startsWith(`${definition} `)
      || normalized.startsWith(`"${definition}"`)
      || normalized.startsWith(`'${definition}'`)
    ) {
      return definition
    }
  }
  return null
}

export function parseFontFileCanvasFontDescriptor(font: string): FontFileCanvasFontDescriptor | null {
  if (fontFileCanvasDescriptorCache.has(font)) {
    return fontFileCanvasDescriptorCache.get(font) ?? null
  }

  const sizeMatch = font.match(/(^|\s)(\d+(?:\.\d+)?)px\s+(.+)$/)
  if (!sizeMatch) {
    setBoundedCacheValue(fontFileCanvasDescriptorCache, font, null, FONT_FILE_DESCRIPTOR_CACHE_LIMIT)
    return null
  }
  const prefix = font.slice(0, sizeMatch.index).trim()
  const fontSize = Number(sizeMatch[2])
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    setBoundedCacheValue(fontFileCanvasDescriptorCache, font, null, FONT_FILE_DESCRIPTOR_CACHE_LIMIT)
    return null
  }

  const family = resolveKnownFamily(sizeMatch[3] ?? "")
  if (!family) {
    setBoundedCacheValue(fontFileCanvasDescriptorCache, font, null, FONT_FILE_DESCRIPTOR_CACHE_LIMIT)
    return null
  }

  const weightMatch = prefix.match(/(^|\s)([1-9]00|1000)(?=\s|$)/)
  const fontWeight = weightMatch
    ? Number(weightMatch[2])
    : /(^|\s)bold(?=\s|$)/i.test(prefix)
      ? 700
      : 400
  const descriptor = {
    fontFamily: family,
    fontWeight: Number.isFinite(fontWeight) ? fontWeight : 400,
    italic: /(^|\s)italic(?=\s|$)/i.test(prefix),
    fontSize,
  }
  setBoundedCacheValue(fontFileCanvasDescriptorCache, font, descriptor, FONT_FILE_DESCRIPTOR_CACHE_LIMIT)
  return descriptor
}

export function collectFontFileMetricFacesFromCanvasFonts(fonts: Iterable<string>): FontFileMetricFace[] {
  const faces = new Map<string, FontFileMetricFace>()
  for (const font of fonts) {
    const descriptor = parseFontFileCanvasFontDescriptor(font)
    if (!descriptor) continue
    const face = {
      fontFamily: descriptor.fontFamily,
      fontWeight: descriptor.fontWeight,
      italic: descriptor.italic,
    }
    faces.set(getFontFileMetricCacheKey(face), face)
  }
  return [...faces.values()]
}

export function collectFontFileMetricFacesFromBlocks<StyleKey extends string>(
  blocks: readonly FontFileMetricFaceBlock<StyleKey>[],
): FontFileMetricFace[] {
  const faces = new Map<string, FontFileMetricFace>()
  const addFace = (face: FontFileMetricFace) => {
    faces.set(getFontFileMetricCacheKey(face), face)
  }

  for (const block of blocks) {
    addFace({
      fontFamily: block.fontFamily,
      fontWeight: block.fontWeight,
      italic: block.italic,
    })

    for (const run of block.textFormatRuns ?? []) {
      addFace({
        fontFamily: isFontFamily(run.fontFamily) ? run.fontFamily : block.fontFamily,
        fontWeight: typeof run.fontWeight === "number" && Number.isFinite(run.fontWeight)
          ? run.fontWeight
          : block.fontWeight,
        italic: typeof run.italic === "boolean" ? run.italic : block.italic,
      })
    }
  }

  return [...faces.values()]
}

export async function preloadFontFileMetricFaces(faces: Iterable<FontFileMetricFace>): Promise<void> {
  await Promise.all([...faces].map(async (face) => {
    const key = getFontFileMetricCacheKey(face)
    if (loadedFontFileMetrics.get(key)) return
    const font = await loadOutlineFont(face.fontFamily, face.fontWeight, face.italic)
    loadedFontFileMetrics.set(key, font as RuntimeOpenTypeFont | null)
  }))
}

export function areFontFileMetricFacesLoaded(faces: Iterable<FontFileMetricFace>): boolean {
  for (const face of faces) {
    if (!loadedFontFileMetrics.get(getFontFileMetricCacheKey(face))) return false
  }
  return true
}

function getLoadedFontFileMetric(descriptor: FontFileCanvasFontDescriptor): RuntimeOpenTypeFont | null {
  return loadedFontFileMetrics.get(getFontFileMetricCacheKey(descriptor)) ?? null
}

function getFontUnitsPerEm(font: RuntimeOpenTypeFont): number {
  return typeof font.unitsPerEm === "number" && font.unitsPerEm > 0 ? font.unitsPerEm : 1000
}

function measureDeterministicLayoutAscent(fallbackFontSize: number): number {
  return fallbackFontSize * 0.8
}

function measureDeterministicLayoutDescent(fallbackFontSize: number): number {
  return fallbackFontSize * 0.2
}

function measureLoadedFontFileCapAscent(descriptor: FontFileCanvasFontDescriptor): number | null {
  const cacheKey = getFontFileDescriptorCacheKey(descriptor)
  const cached = loadedCapAscentCache.get(cacheKey)
  if (cached !== undefined) return cached
  const font = getLoadedFontFileMetric(descriptor)
  if (!font) return null
  const unitsPerEm = getFontUnitsPerEm(font)
  const glyph = font.charToGlyph?.("H") ?? getGlyphs(font, "H")[0]
  const rawBounds = glyph?.getBoundingBox?.()
  const yMax = rawBounds?.y2 ?? rawBounds?.yMax ?? glyph?.yMax
  if (typeof yMax !== "number" || !Number.isFinite(yMax) || yMax <= 0) return null
  const ascent = yMax * descriptor.fontSize / unitsPerEm
  setBoundedCacheValue(loadedCapAscentCache, cacheKey, ascent, FONT_FILE_MEASURE_CACHE_LIMIT)
  return ascent
}

function measureDeterministicTextTopAscent(canvasFont: string, fallbackFontSize: number): number {
  const descriptor = parseFontFileCanvasFontDescriptor(canvasFont)
  return descriptor
    ? measureLoadedFontFileCapAscent(descriptor) ?? measureDeterministicLayoutAscent(fallbackFontSize)
    : measureDeterministicLayoutAscent(fallbackFontSize)
}

function getGlyphs(font: RuntimeOpenTypeFont, text: string): RuntimeGlyph[] {
  let cache = fontFileGlyphRunCache.get(font)
  if (!cache) {
    cache = new Map<string, RuntimeGlyph[]>()
    fontFileGlyphRunCache.set(font, cache)
  }
  const cached = cache.get(text)
  if (cached) return cached
  const glyphs = font.stringToGlyphs?.(text) ?? splitTextForTracking(text).map((glyph) => font.charToGlyph?.(glyph) ?? {})
  setBoundedCacheValue(cache, text, glyphs, FONT_FILE_GLYPH_RUN_CACHE_LIMIT)
  return glyphs
}

function getGlyphAdvance(glyph: RuntimeGlyph, fontSize: number, unitsPerEm: number): number | null {
  const advanceWidth = glyph.advanceWidth
  if (typeof advanceWidth !== "number" || !Number.isFinite(advanceWidth)) return null
  return advanceWidth * fontSize / unitsPerEm
}

function getGlyphBounds(
  glyph: RuntimeGlyph,
  fontSize: number,
  unitsPerEm: number,
): OpticalGlyphBounds | null {
  const advanceWidth = getGlyphAdvance(glyph, fontSize, unitsPerEm)
  if (advanceWidth === null) return null
  const rawBounds = glyph.getBoundingBox?.()
  const xMin = rawBounds?.x1 ?? rawBounds?.xMin ?? glyph.xMin
  const xMax = rawBounds?.x2 ?? rawBounds?.xMax ?? glyph.xMax
  if (
    typeof xMin !== "number"
    || typeof xMax !== "number"
    || !Number.isFinite(xMin)
    || !Number.isFinite(xMax)
  ) {
    return {
      advanceWidth,
      leftBoundary: 0,
      rightBoundary: advanceWidth,
    }
  }
  return {
    advanceWidth,
    leftBoundary: xMin * fontSize / unitsPerEm,
    rightBoundary: xMax * fontSize / unitsPerEm,
  }
}

function getValueQuantile(values: number[], quantile: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const clamped = Math.max(0, Math.min(1, quantile))
  const index = (sorted.length - 1) * clamped
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  const lower = sorted[lowerIndex]
  if (lower === undefined) return null
  if (lowerIndex === upperIndex) return lower
  const upper = sorted[upperIndex] ?? lower
  return lower + (upper - lower) * (index - lowerIndex)
}

function getContourOpticalBoundaryProfile(char: string, fontSize: number): {
  leftQuantile: number
  rightQuantile: number
  blend: number
  leftAdjustmentEm?: number
} | null {
  if (char === "-" && fontSize <= 12) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.32, leftAdjustmentEm: -0.0203 }
  }
  if (/^\d$/.test(char)) {
    if (char === "7") return { leftQuantile: 0.5, rightQuantile: 0.8, blend: 0.86 }
    if (char === "1" && fontSize >= 48 && fontSize <= 96) {
      return { leftQuantile: 0.5, rightQuantile: 0.8, blend: 0.18, leftAdjustmentEm: -0.0047 }
    }
    if (char === "1" && fontSize <= 20) {
      return { leftQuantile: 0.5, rightQuantile: 0.8, blend: 0.18, leftAdjustmentEm: 0.01436 }
    }
    if (char === "2" && fontSize >= 48 && fontSize <= 96) {
      return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.32, leftAdjustmentEm: -0.00236 }
    }
    if (char === "1") return { leftQuantile: 0.5, rightQuantile: 0.8, blend: 0.18 }
    if (char === "3" && fontSize >= 48 && fontSize <= 96) {
      return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.32, leftAdjustmentEm: 0.01124 }
    }
    if (char === "4" && fontSize >= 48 && fontSize <= 96) {
      return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.3, leftAdjustmentEm: -0.00616 }
    }
    if (char === "5" && fontSize >= 48 && fontSize <= 96) {
      return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.32, leftAdjustmentEm: 0.00397 }
    }
    if (char === "6" && fontSize >= 48 && fontSize <= 96) {
      return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.32, leftAdjustmentEm: -0.00335 }
    }
    if (char === "4") return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.3 }
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.32 }
  }
  if (!/^[A-Za-zÄÖÜäöüß]$/.test(char)) return null
  if (/^[ag]$/.test(char) && fontSize >= 200) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.24 }
  }
  if (char === "z" && fontSize >= 200) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.82, leftAdjustmentEm: -0.00158 }
  }
  if (char === "t" && fontSize >= 18 && fontSize <= 24) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.82, leftAdjustmentEm: 0.03057 }
  }
  if (char === "v" && fontSize >= 16 && fontSize <= 20) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.82, leftAdjustmentEm: -0.0193 }
  }
  if (char === "v" && fontSize > 12 && fontSize < 16) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.82, leftAdjustmentEm: -0.0138 }
  }
  if (char === "v" && fontSize <= 12) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.82, leftAdjustmentEm: -0.0183 }
  }
  if (char === "w" && fontSize > 12 && fontSize < 16) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.82, leftAdjustmentEm: -0.01264 }
  }
  if (char === "g" && fontSize >= 16 && fontSize <= 20) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.82, leftAdjustmentEm: -0.00924 }
  }
  if (char === "A" && fontSize <= 18) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: 0.0225 }
  }
  if (char === "S") return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.75 }
  if (char === "D" && fontSize >= 48 && fontSize <= 96) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.01465 }
  }
  if (char === "F" && fontSize >= 180) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.0045 }
  }
  if (char === "C" && fontSize >= 48 && fontSize <= 96) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.00362 }
  }
  if (char === "G" && fontSize >= 48 && fontSize <= 120) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.0039 }
  }
  if (char === "W" && fontSize >= 48 && fontSize <= 96) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.00533 }
  }
  if (char === "I" && fontSize >= 48 && fontSize <= 96) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.00282 }
  }
  if (char === "I" && fontSize >= 16 && fontSize <= 20) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.00843 }
  }
  if (char === "Q" && fontSize >= 48 && fontSize <= 96) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.0024 }
  }
  if (/^[EFKMPR]$/.test(char) && fontSize >= 48 && fontSize <= 96) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.00282 }
  }
  if (char === "T" && fontSize <= 16) {
    return { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25, leftAdjustmentEm: -0.05 }
  }
  return /^[A-ZÄÖÜ]$/.test(char)
    ? { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.25 }
    : { leftQuantile: 0.2, rightQuantile: 0.8, blend: 0.82 }
}

function sampleLinePoints(
  points: { x: number; y: number }[],
  start: { x: number; y: number },
  end: { x: number; y: number },
  steps: number,
): void {
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps
    points.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    })
  }
}

function sampleQuadraticPoints(
  points: { x: number; y: number }[],
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  steps: number,
): void {
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps
    const u = 1 - t
    points.push({
      x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
    })
  }
}

function sampleCubicPoints(
  points: { x: number; y: number }[],
  start: { x: number; y: number },
  controlA: { x: number; y: number },
  controlB: { x: number; y: number },
  end: { x: number; y: number },
  steps: number,
): void {
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps
    const u = 1 - t
    points.push({
      x: u * u * u * start.x + 3 * u * u * t * controlA.x + 3 * u * t * t * controlB.x + t * t * t * end.x,
      y: u * u * u * start.y + 3 * u * u * t * controlA.y + 3 * u * t * t * controlB.y + t * t * t * end.y,
    })
  }
}

function getGlyphContourOpticalBounds(
  glyphText: string,
  glyph: RuntimeGlyph,
  font: RuntimeOpenTypeFont,
  fontSize: number,
  fallbackBounds: OpticalGlyphBounds,
): OpticalGlyphBounds {
  const commands = glyph.getPath?.(0, 0, fontSize, { kerning: false }, font)?.commands
  if (!commands?.length) return fallbackBounds

  const points: { x: number; y: number }[] = []
  let current = { x: 0, y: 0 }
  let start = current
  for (const command of commands) {
    if (command.type === "M") {
      current = { x: command.x, y: command.y }
      start = current
      points.push(current)
      continue
    }
    if (command.type === "L") {
      const end = { x: command.x, y: command.y }
      sampleLinePoints(points, current, end, 8)
      current = end
      continue
    }
    if (command.type === "Q") {
      const end = { x: command.x, y: command.y }
      sampleQuadraticPoints(points, current, { x: command.x1, y: command.y1 }, end, 24)
      current = end
      continue
    }
    if (command.type === "C") {
      const end = { x: command.x, y: command.y }
      sampleCubicPoints(
        points,
        current,
        { x: command.x1, y: command.y1 },
        { x: command.x2, y: command.y2 },
        end,
        32,
      )
      current = end
      continue
    }
    if (command.type === "Z") {
      sampleLinePoints(points, current, start, 8)
      current = start
    }
  }

  if (points.length < 8) return fallbackBounds

  const rowBinSize = Math.max(1, fontSize / 120)
  const rows = new Map<number, { left: number; right: number }>()
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
    const rowKey = Math.round(point.y / rowBinSize)
    const row = rows.get(rowKey)
    if (!row) {
      rows.set(rowKey, { left: point.x, right: point.x })
      continue
    }
    row.left = Math.min(row.left, point.x)
    row.right = Math.max(row.right, point.x)
  }

  const leftRows = [...rows.values()].map((row) => row.left)
  const rightRows = [...rows.values()].map((row) => row.right)
  const char = Array.from(glyphText.trim())[0] ?? glyphText
  const boundaryProfile = getContourOpticalBoundaryProfile(char, fontSize)
  if (!boundaryProfile) return fallbackBounds

  const leftBoundary = getValueQuantile(leftRows, boundaryProfile.leftQuantile)
  const rightBoundary = getValueQuantile(rightRows, boundaryProfile.rightQuantile)
  if (leftBoundary === null || rightBoundary === null || rightBoundary <= leftBoundary) return fallbackBounds

  if (boundaryProfile.blend <= 0) return fallbackBounds

  const blendedLeftBoundary = fallbackBounds.leftBoundary
    + (Math.max(fallbackBounds.leftBoundary, leftBoundary) - fallbackBounds.leftBoundary) * boundaryProfile.blend
  const blendedRightBoundary = fallbackBounds.rightBoundary
    + (Math.min(fallbackBounds.rightBoundary, rightBoundary) - fallbackBounds.rightBoundary) * boundaryProfile.blend
  const adjustedLeftBoundary = Math.max(
    0,
    blendedLeftBoundary + (boundaryProfile.leftAdjustmentEm ?? 0) * fontSize,
  )
  if (blendedRightBoundary <= adjustedLeftBoundary) return fallbackBounds

  return {
    advanceWidth: fallbackBounds.advanceWidth,
    leftBoundary: adjustedLeftBoundary,
    rightBoundary: blendedRightBoundary,
  }
}

function measureFontFilePlainTextWidth(
  font: RuntimeOpenTypeFont,
  text: string,
  descriptor: FontFileCanvasFontDescriptor,
  trackingScale: number,
  kerningMode: FontFileKerningMode,
  styleKey?: string,
): number | null {
  const unitsPerEm = getFontUnitsPerEm(font)
  const normalizedTracking = normalizeTrackingScale(trackingScale)
  const tracking = getTrackingLetterSpacing(descriptor.fontSize, normalizedTracking)
  const glyphTexts = splitTextForTracking(text)
  if (!glyphTexts.length) return 0

  const glyphs = glyphTexts.map((glyphText) => getGlyphs(font, glyphText)[0] ?? null)
  if (glyphs.some((glyph) => glyph === null)) return null

  const lastGlyph = glyphs[glyphs.length - 1]
  if (!lastGlyph) return 0

  const lastAdvance = getGlyphAdvance(lastGlyph, descriptor.fontSize, unitsPerEm)
  if (lastAdvance === null) return null

  let width = lastAdvance
  for (let index = 1; index < glyphs.length; index += 1) {
    const previous = glyphs[index - 1]
    const current = glyphs[index]
    if (!previous || !current) return null
    const previousAdvance = getGlyphAdvance(previous, descriptor.fontSize, unitsPerEm)
    if (previousAdvance === null) return null

    let pairAdvance = previousAdvance
    if (kerningMode === "optical") {
      const leftBounds = getGlyphBounds(previous, descriptor.fontSize, unitsPerEm)
      const rightBounds = getGlyphBounds(current, descriptor.fontSize, unitsPerEm)
      pairAdvance += leftBounds && rightBounds
        ? resolveOpticalKerningPairAdjustment({
            left: glyphTexts[index - 1] ?? "",
            right: glyphTexts[index] ?? "",
            leftBounds,
            rightBounds,
            pairAdvance: previousAdvance,
            fontSize: descriptor.fontSize,
            styleKey,
          }) * getOutlineOpticalKerningStrengthScale(descriptor)
        : 0
    } else if (kerningMode === "font") {
      pairAdvance += (font.getKerningValue?.(previous, current) ?? 0) * descriptor.fontSize / unitsPerEm
    }

    width += Math.max(0, pairAdvance) + tracking
  }

  return width
}

function measureFontFileGlyphWidth(
  glyphText: string,
  descriptor: FontFileCanvasFontDescriptor,
): number | null {
  const cacheKey = getFontFileTupleCacheKey([getFontFileDescriptorCacheKey(descriptor), glyphText])
  const cached = loadedGlyphWidthCache.get(cacheKey)
  if (cached !== undefined || loadedGlyphWidthCache.has(cacheKey)) return cached ?? null
  const font = getLoadedFontFileMetric(descriptor)
  if (!font) return null
  const unitsPerEm = typeof font.unitsPerEm === "number" && font.unitsPerEm > 0 ? font.unitsPerEm : 1000
  const glyph = getGlyphs(font, glyphText)[0]
  const width = glyph ? getGlyphAdvance(glyph, descriptor.fontSize, unitsPerEm) : null
  setBoundedCacheValue(loadedGlyphWidthCache, cacheKey, width, FONT_FILE_MEASURE_CACHE_LIMIT)
  return width
}

function measureFontFilePairAdvance({
  previous,
  current,
  descriptor,
  kerningMode,
  styleKey,
}: {
  previous: string
  current: string
  descriptor: FontFileCanvasFontDescriptor
  kerningMode: FontFileKerningMode
  styleKey?: string
}): number | null {
  const cacheKey = getFontFileTupleCacheKey([
    getFontFileDescriptorCacheKey(descriptor),
    kerningMode,
    styleKey ?? null,
    previous,
    current,
  ])
  const cached = loadedPairAdvanceValueCache.get(cacheKey)
  if (cached !== undefined || loadedPairAdvanceValueCache.has(cacheKey)) return cached ?? null
  if (!previous) return 0
  if (!current) return measureFontFileGlyphWidth(previous, descriptor)

  const font = getLoadedFontFileMetric(descriptor)
  if (!font) return null
  const unitsPerEm = typeof font.unitsPerEm === "number" && font.unitsPerEm > 0 ? font.unitsPerEm : 1000
  const previousGlyph = getGlyphs(font, previous)[0]
  const currentGlyph = getGlyphs(font, current)[0]
  if (!previousGlyph || !currentGlyph) return null

  const previousAdvance = getGlyphAdvance(previousGlyph, descriptor.fontSize, unitsPerEm)
  if (previousAdvance === null) return null

  let pairAdvance = previousAdvance
  if (kerningMode === "optical") {
    const leftBounds = getGlyphBounds(previousGlyph, descriptor.fontSize, unitsPerEm)
    const rightBounds = getGlyphBounds(currentGlyph, descriptor.fontSize, unitsPerEm)
    pairAdvance += leftBounds && rightBounds
      ? resolveOpticalKerningPairAdjustment({
          left: previous,
          right: current,
          leftBounds,
          rightBounds,
          pairAdvance: previousAdvance,
          fontSize: descriptor.fontSize,
          styleKey,
        }) * getOutlineOpticalKerningStrengthScale(descriptor)
      : 0
  } else {
    pairAdvance += (font.getKerningValue?.(previousGlyph, currentGlyph) ?? 0) * descriptor.fontSize / unitsPerEm
  }

  const advance = Math.max(0, pairAdvance)
  setBoundedCacheValue(loadedPairAdvanceValueCache, cacheKey, advance, FONT_FILE_MEASURE_CACHE_LIMIT)
  return advance
}

type FontFilePairClass =
  | "space"
  | "punctuation"
  | "round-lower"
  | "straight-lower"
  | "stem-lower"
  | "diagonal-lower"
  | "upper"
  | "digit"
  | "other"

function classifyFontFilePairChar(char: string): FontFilePairClass {
  if (!char || /^\s+$/.test(char)) return "space"
  if (/^[.,:;!?'"“”‘’()[\]{}<>/\\\-–—]$/.test(char)) return "punctuation"
  if (/^\d$/.test(char)) return "digit"
  if (/^[A-ZÄÖÜ]$/.test(char)) return "upper"
  if (/^[bdfhklt]$/.test(char)) return "stem-lower"
  if (/^[ij]$/.test(char)) return "straight-lower"
  if (/^[acdegopq]$/.test(char)) return "round-lower"
  if (/^[mnrsu]$/.test(char)) return "straight-lower"
  if (/^[vwxyz]$/.test(char)) return "diagonal-lower"
  return "other"
}

function getRangeCalibrationClassCorrection({
  previous,
  current,
  descriptor,
  kerningMode,
  styleKey,
}: {
  previous: string
  current: string
  descriptor: FontFileCanvasFontDescriptor
  kerningMode: FontFileKerningMode
  styleKey?: string
}): number {
  if (
    kerningMode !== "optical"
    || styleKey !== "fx"
    || descriptor.fontFamily !== "Inter"
    || descriptor.fontWeight !== 400
    || descriptor.italic !== false
    || descriptor.fontSize !== 14
  ) {
    return 0
  }

  const leftClass = classifyFontFilePairChar(previous)
  const rightClass = classifyFontFilePairChar(current)
  if (leftClass === "round-lower" && rightClass === "round-lower") return 0.11
  if (leftClass === "round-lower" && rightClass === "straight-lower") return 0.09
  if (leftClass === "stem-lower" && rightClass === "round-lower") return 0.08
  if (leftClass === "straight-lower" && rightClass === "straight-lower") return 0.075
  if (leftClass === "round-lower" && rightClass === "stem-lower") return 0.045
  if (leftClass === "straight-lower" && rightClass === "punctuation") return 0.12
  if (leftClass === "round-lower" && rightClass === "punctuation") return 0.1
  return 0
}

function isTerminalPunctuationBoundaryCandidate(text: string): boolean {
  return /[.!?]$/.test(text.trimEnd())
}

export function measureLoadedFontFilePairAdvance({
  previous,
  current,
  descriptor,
  kerningMode,
  styleKey,
}: {
  previous: string
  current: string
  descriptor: FontFileCanvasFontDescriptor
  kerningMode: FontFileKerningMode
  styleKey?: string
}): number | null {
  return measureFontFilePairAdvance({
    previous,
    current,
    descriptor,
    kerningMode,
    styleKey,
  })
}

function measureFontFileGraphemeRunWidth(
  graphemes: readonly {
    text: string
    trackingScale: number
    descriptor: FontFileCanvasFontDescriptor
    styleKey?: string
  }[],
  kerningMode: FontFileKerningMode,
  options: FontFileRangeCalibrationOptions = {},
): number | null {
  if (!graphemes.length) return 0
  const last = graphemes[graphemes.length - 1]
  if (!last) return 0

  const lastWidth = measureFontFileGlyphWidth(last.text, last.descriptor)
  if (lastWidth === null) return null
  if (graphemes.length === 1) return lastWidth

  let width = lastWidth
  for (let index = 1; index < graphemes.length; index += 1) {
    const previous = graphemes[index - 1]
    const current = graphemes[index]
    if (!previous || !current) return null
    const sameFontMetrics = previous.descriptor.fontFamily === current.descriptor.fontFamily
      && previous.descriptor.fontWeight === current.descriptor.fontWeight
      && previous.descriptor.italic === current.descriptor.italic
      && previous.descriptor.fontSize === current.descriptor.fontSize
    const pairAdvance = sameFontMetrics
      ? measureFontFilePairAdvance({
          previous: previous.text,
          current: current.text,
          descriptor: previous.descriptor,
          kerningMode,
          styleKey: previous.styleKey,
        })
      : measureFontFileGlyphWidth(previous.text, previous.descriptor)
    if (pairAdvance === null) return null
    const classCorrection = options.classCorrection && sameFontMetrics
      ? getRangeCalibrationClassCorrection({
          previous: previous.text,
          current: current.text,
          descriptor: previous.descriptor,
          kerningMode,
          styleKey: previous.styleKey,
        })
      : 0
    width += pairAdvance + classCorrection + getTrackingLetterSpacing(previous.descriptor.fontSize, previous.trackingScale)
  }

  return width
}

function createExactFormattedRangeWidthMeasurer<StyleKey extends string, Family extends string>(
  request: Pick<
    TextWidthRequest<StyleKey, Family>,
    "sourceText" | "trackingScale" | "trackingRuns" | "opticalKerning" | "baseFormat" | "formatRuns" | "resolveFontSize"
  >,
  options: FontFileRangeCalibrationOptions = {},
): ((renderedText: string, range: { start: number; end: number }) => number | null) | null {
  const { baseFormat, resolveFontSize } = request
  if (!baseFormat || !resolveFontSize) return null

  const resolved = resolveFontTrackingGraphemes({
    sourceText: request.sourceText,
    renderedText: request.sourceText,
    range: {
      start: 0,
      end: request.sourceText.length,
    },
    baseFormat,
    formatRuns: request.formatRuns,
    baseTrackingScale: request.trackingScale,
    trackingRuns: request.trackingRuns,
    resolveFontSize,
  })
  const graphemes: FormattedRangeWidthGrapheme[] = []
  for (const grapheme of resolved) {
    const descriptor = resolveFontFileDescriptorFromGrapheme(grapheme)
    if (!descriptor) return null
    graphemes.push({
      text: grapheme.text,
      trackingScale: grapheme.trackingScale,
      descriptor,
      styleKey: grapheme.styleKey,
      sourceStart: grapheme.start,
      sourceEnd: grapheme.end,
    })
  }

  if (graphemes.length === 0) {
    return (renderedText, range) => (
      renderedText.length === 0 && range.start === range.end ? 0 : null
    )
  }

  const startIndexBySourceStart = new Map<number, number>()
  const endExclusiveBySourceEnd = new Map<number, number>()
  const glyphWidths = new Array<number>(graphemes.length)
  const contributionPrefix = new Array<number>(graphemes.length).fill(0)
  const terminalHyphenWidthByLastIndex = new Array<number | null>(graphemes.length).fill(null)
  const kerningMode: FontFileKerningMode = request.opticalKerning ? "optical" : "font"

  for (let index = 0; index < graphemes.length; index += 1) {
    const grapheme = graphemes[index]!
    startIndexBySourceStart.set(grapheme.sourceStart, index)
    endExclusiveBySourceEnd.set(grapheme.sourceEnd, index + 1)
    const glyphWidth = measureFontFileGlyphWidth(grapheme.text, grapheme.descriptor)
    if (glyphWidth === null) return null
    glyphWidths[index] = glyphWidth
    if (index === 0) continue
    const previous = graphemes[index - 1]!
    const sameFontMetrics = previous.descriptor.fontFamily === grapheme.descriptor.fontFamily
      && previous.descriptor.fontWeight === grapheme.descriptor.fontWeight
      && previous.descriptor.italic === grapheme.descriptor.italic
      && previous.descriptor.fontSize === grapheme.descriptor.fontSize
    const pairAdvance = sameFontMetrics
      ? measureFontFilePairAdvance({
          previous: previous.text,
          current: grapheme.text,
          descriptor: previous.descriptor,
          kerningMode,
          styleKey: previous.styleKey,
        })
      : glyphWidths[index - 1]!
    if (pairAdvance === null) return null
    const classCorrection = options.classCorrection && sameFontMetrics
      ? getRangeCalibrationClassCorrection({
          previous: previous.text,
          current: grapheme.text,
          descriptor: previous.descriptor,
          kerningMode,
          styleKey: previous.styleKey,
        })
      : 0
    contributionPrefix[index] = contributionPrefix[index - 1]!
      + pairAdvance
      + classCorrection
      + getTrackingLetterSpacing(previous.descriptor.fontSize, previous.trackingScale)
  }

  const localCache = new Map<string, number | null>()
  const getTerminalHyphenWidth = (lastIndex: number): number | null => {
    const cached = terminalHyphenWidthByLastIndex[lastIndex]
    if (cached !== null) return cached
    const lastGrapheme = graphemes[lastIndex]
    if (!lastGrapheme) return null
    const hyphenWidth = measureFontFileGlyphWidth("-", lastGrapheme.descriptor)
    if (hyphenWidth === null) return null
    const pairAdvance = measureFontFilePairAdvance({
      previous: lastGrapheme.text,
      current: "-",
      descriptor: lastGrapheme.descriptor,
      kerningMode,
      styleKey: lastGrapheme.styleKey,
    })
    if (pairAdvance === null) return null
    const classCorrection = options.classCorrection
      ? getRangeCalibrationClassCorrection({
          previous: lastGrapheme.text,
          current: "-",
          descriptor: lastGrapheme.descriptor,
          kerningMode,
          styleKey: lastGrapheme.styleKey,
        })
      : 0
    const width = pairAdvance
      + classCorrection
      + getTrackingLetterSpacing(lastGrapheme.descriptor.fontSize, lastGrapheme.trackingScale)
      + hyphenWidth
    terminalHyphenWidthByLastIndex[lastIndex] = width
    return width
  }
  return (renderedText, range) => {
    const cacheKey = `${range.start}:${range.end}:${renderedText}`
    const cached = localCache.get(cacheKey)
    if (cached !== undefined || localCache.has(cacheKey)) return cached ?? null

    const sourceSliceText = request.sourceText.slice(range.start, range.end)
    if (range.start === range.end) {
      const width = renderedText.length === 0 ? 0 : null
      localCache.set(cacheKey, width)
      return width
    }

    const startIndex = startIndexBySourceStart.get(range.start)
    const endExclusive = endExclusiveBySourceEnd.get(range.end)
    if (startIndex === undefined || endExclusive === undefined || endExclusive <= startIndex) {
      localCache.set(cacheKey, null)
      return null
    }

    const lastIndex = endExclusive - 1
    const exactWidth = (
      contributionPrefix[lastIndex]!
      - contributionPrefix[startIndex]!
      + glyphWidths[lastIndex]!
    )
    if (renderedText === sourceSliceText) {
      localCache.set(cacheKey, exactWidth)
      return exactWidth
    }
    if (renderedText === `${sourceSliceText}-`) {
      const terminalHyphenWidth = getTerminalHyphenWidth(lastIndex)
      const width = terminalHyphenWidth === null
        ? null
        : exactWidth - glyphWidths[lastIndex]! + terminalHyphenWidth
      localCache.set(cacheKey, width)
      return width
    }
    localCache.set(cacheKey, null)
    return null
  }
}

export function measureFontFileTrackedRangeWidth<StyleKey extends string, Family extends string>(
  request: TextWidthRequest<StyleKey, Family>,
  descriptor: FontFileCanvasFontDescriptor,
  options: FontFileRangeCalibrationOptions = {},
): number | null {
  const range = request.range
  if (!range) return null
  const segments = buildTrackingSegmentsForRenderedRange({
    sourceText: request.sourceText,
    renderedText: request.text,
    range,
    baseTrackingScale: request.trackingScale,
    runs: request.trackingRuns,
  })
  const graphemes = segments.flatMap((segment) => splitTextForTracking(segment.text).map((text) => ({
    text,
    trackingScale: segment.trackingScale,
    descriptor,
    styleKey: request.baseFormat?.styleKey,
  })))

  return measureFontFileGraphemeRunWidth(
    graphemes,
    request.opticalKerning ? "optical" : "font",
    options,
  )
}

function resolveFontFileDescriptorFromGrapheme<StyleKey extends string, Family extends string>(
  grapheme: ResolvedFormatTrackingGrapheme<StyleKey, Family>,
): FontFileCanvasFontDescriptor | null {
  if (!isFontFamily(grapheme.fontFamily)) return null
  return {
    fontFamily: grapheme.fontFamily,
    fontWeight: grapheme.fontWeight,
    italic: grapheme.italic,
    fontSize: grapheme.fontSize,
  }
}

export function measureFontFileFormattedRangeWidth<StyleKey extends string, Family extends string>(
  request: TextWidthRequest<StyleKey, Family>,
  options: FontFileRangeCalibrationOptions = {},
): number | null {
  const range = request.range
  const baseFormat = request.baseFormat
  const resolveFontSize = request.resolveFontSize
  if (!range || !baseFormat || !resolveFontSize) return null

  const resolved = resolveFontTrackingGraphemes({
    sourceText: request.sourceText,
    renderedText: request.text,
    range,
    baseFormat,
    formatRuns: request.formatRuns,
    baseTrackingScale: request.trackingScale,
    trackingRuns: request.trackingRuns,
    resolveFontSize,
  })
  const graphemes = resolved.flatMap((grapheme) => {
    const descriptor = resolveFontFileDescriptorFromGrapheme(grapheme)
    return descriptor
      ? [{
          text: grapheme.text,
          trackingScale: grapheme.trackingScale,
          descriptor,
          styleKey: grapheme.styleKey,
        }]
      : []
  })
  if (graphemes.length !== resolved.length) return null

  return measureFontFileGraphemeRunWidth(
    graphemes,
    request.opticalKerning ? "optical" : "font",
    options,
  )
}

export function measureLoadedFontFileTextWidth({
  text,
  descriptor,
  trackingScale,
  kerningMode,
  styleKey,
}: {
  text: string
  descriptor: FontFileCanvasFontDescriptor
  trackingScale: number
  kerningMode: FontFileKerningMode
  styleKey?: string
}): number | null {
  const font = getLoadedFontFileMetric(descriptor)
  if (!font) return null
  return measureFontFilePlainTextWidth(
    font,
    text,
    descriptor,
    trackingScale,
    kerningMode,
    styleKey,
  )
}

function buildRequiredFontFileMetricsError(message: string, request: TextWidthRequest<string, string>): Error {
  return new Error(`${message}: ${request.canvasFont} / ${request.text.slice(0, 80)}`)
}

function requireFontFileWidth<StyleKey extends string, Family extends string>(
  width: number | null,
  request: TextWidthRequest<StyleKey, Family>,
): number {
  if (width !== null && Number.isFinite(width)) return width
  throw buildRequiredFontFileMetricsError("Deterministic font-file width unavailable", request as unknown as TextWidthRequest<string, string>)
}

export function createLoadedFontFileGlyphBoundsMeasure(
  descriptor: FontFileCanvasFontDescriptor,
): ((glyph: string) => OpticalGlyphBounds | null) | null {
  const font = getLoadedFontFileMetric(descriptor)
  if (!font) return null
  const unitsPerEm = getFontUnitsPerEm(font)
  return (glyphText) => {
    const glyph = getGlyphs(font, glyphText)[0]
    return glyph ? getGlyphBounds(glyph, descriptor.fontSize, unitsPerEm) : null
  }
}

export function createLoadedFontFileGlyphBoundsMeasureForCanvasFont(
  canvasFont: string,
): ((glyph: string) => OpticalGlyphBounds | null) | null {
  const cached = loadedGlyphBoundsMeasureCache.get(canvasFont)
  if (cached) return cached
  const descriptor = parseFontFileCanvasFontDescriptor(canvasFont)
  const measure = descriptor ? createLoadedFontFileGlyphBoundsMeasure(descriptor) : null
  if (measure) {
    setBoundedCacheValue(loadedGlyphBoundsMeasureCache, canvasFont, measure, FONT_FILE_MEASURE_CACHE_LIMIT)
  }
  return measure
}

export function createLoadedFontFileOpticalMarginGlyphBoundsMeasureForCanvasFont(
  canvasFont: string,
): ((glyph: string) => OpticalGlyphBounds | null) | null {
  const cached = loadedOpticalGlyphBoundsMeasureCache.get(canvasFont)
  if (cached) return cached
  const descriptor = parseFontFileCanvasFontDescriptor(canvasFont)
  const font = descriptor ? getLoadedFontFileMetric(descriptor) : null
  if (!descriptor || !font) return null
  const unitsPerEm = getFontUnitsPerEm(font)
  const measure = (glyphText: string) => {
    const glyph = getGlyphs(font, glyphText)[0]
    if (!glyph) return null
    const fallbackBounds = getGlyphBounds(glyph, descriptor.fontSize, unitsPerEm)
    return fallbackBounds
      ? getGlyphContourOpticalBounds(glyphText, glyph, font, descriptor.fontSize, fallbackBounds)
      : null
  }
  setBoundedCacheValue(loadedOpticalGlyphBoundsMeasureCache, canvasFont, measure, FONT_FILE_MEASURE_CACHE_LIMIT)
  return measure
}

export function createLoadedFontFilePairAdvanceMeasureForCanvasFont(
  canvasFont: string,
  styleKey?: string,
): ((previous: string, current: string, opticalKerning: boolean) => number | null) | null {
  const cacheKey = getFontFileTupleCacheKey([styleKey ?? null, canvasFont])
  const cached = loadedPairAdvanceMeasureCache.get(cacheKey)
  if (cached) return cached
  const descriptor = parseFontFileCanvasFontDescriptor(canvasFont)
  if (!descriptor) return null
  const measure = (previous: string, current: string, opticalKerning: boolean) => (
    measureLoadedFontFilePairAdvance({
      previous,
      current,
      descriptor,
      kerningMode: opticalKerning ? "optical" : "font",
      styleKey,
    })
  )
  setBoundedCacheValue(loadedPairAdvanceMeasureCache, cacheKey, measure, FONT_FILE_MEASURE_CACHE_LIMIT)
  return measure
}

export function createResolvedFontFileGlyphBoundsMeasure<StyleKey extends string>() {
  const measureCache = new Map<string, ReturnType<typeof createLoadedFontFileGlyphBoundsMeasureForCanvasFont>>()
  return (grapheme: ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>): OpticalGlyphBounds | null => {
    const canvasFont = buildCanvasFont(
      grapheme.fontFamily,
      grapheme.fontWeight,
      grapheme.italic,
      grapheme.fontSize,
    )
    if (!measureCache.has(canvasFont)) {
      measureCache.set(canvasFont, createLoadedFontFileGlyphBoundsMeasureForCanvasFont(canvasFont))
    }
    return measureCache.get(canvasFont)?.(grapheme.text) ?? null
  }
}

export function createResolvedFontFilePairAdvanceMeasure<StyleKey extends string>() {
  const measureCache = new Map<string, ReturnType<typeof createLoadedFontFilePairAdvanceMeasureForCanvasFont>>()
  return (
    previous: ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>,
    current: ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>,
    opticalKerning: boolean,
  ): number | null => {
    if (
      previous.fontFamily !== current.fontFamily
      || previous.fontWeight !== current.fontWeight
      || previous.italic !== current.italic
      || previous.fontSize !== current.fontSize
    ) {
      return null
    }
    const canvasFont = buildCanvasFont(
      previous.fontFamily,
      previous.fontWeight,
      previous.italic,
      previous.fontSize,
    )
    const cacheKey = `${canvasFont}::${previous.styleKey}`
    if (!measureCache.has(cacheKey)) {
      measureCache.set(
        cacheKey,
        createLoadedFontFilePairAdvanceMeasureForCanvasFont(canvasFont, previous.styleKey),
      )
    }
    return measureCache.get(cacheKey)?.(previous.text, current.text, opticalKerning) ?? null
  }
}

function shouldDelegateWidth<StyleKey extends string, Family extends string>(
  request: TextWidthRequest<StyleKey, Family>,
): boolean {
  return request.trackingRuns.length > 0
    || (request.formatRuns?.length ?? 0) > 0
    || request.baseFormat !== undefined
}

function createFontFileOpticalOffset<StyleKey extends string, Family extends string>(
  measureWidth: (request: TextWidthRequest<StyleKey, Family>) => number,
): TextMetricsEngine<StyleKey, Family>["opticalOffset"] {
  return ({
    styleKey,
    line,
    align,
    fontSize,
    opticalKerning,
    canvasFont,
  }) => {
    const measureGlyphBounds = createLoadedFontFileOpticalMarginGlyphBoundsMeasureForCanvasFont(canvasFont) ?? undefined
    return getOpticalMarginAnchorOffset({
      line,
      align,
      fontSize,
      styleKey,
      measureGlyphBounds,
      measureWidth: (sample) => measureWidth({
        text: sample,
        canvasFont,
        trackingScale: 0,
        opticalKerning,
        sourceText: sample,
        trackingRuns: [],
      }),
    })
  }
}

export function createFontFileTextMetricsEngine<StyleKey extends string, Family extends string>(
  context: TextMeasureContext,
): TextMetricsEngine<StyleKey, Family> {
  const fallbackEngine = createDiagnosticBrowserCanvasTextMetricsEngine<StyleKey, Family>(context)
  const measureWidth = (request: TextWidthRequest<StyleKey, Family>): number => {
    if (shouldDelegateWidth(request)) return fallbackEngine.measureWidth(request)
    const descriptor = parseFontFileCanvasFontDescriptor(request.canvasFont)
    const font = descriptor ? getLoadedFontFileMetric(descriptor) : null
    if (!descriptor || !font) return fallbackEngine.measureWidth(request)

    return measureFontFilePlainTextWidth(
      font,
      request.text,
      descriptor,
      request.trackingScale,
      request.opticalKerning ? "optical" : "font",
      request.baseFormat?.styleKey,
    ) ?? fallbackEngine.measureWidth(request)
  }
  const wrapText = ({
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
      (sample, range) => measureWidth({
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
    )
  const engine: TextMetricsEngine<StyleKey, Family> = {
    id: "font-file-v2",
    measureWidth,
    wrapText,
    textAscent: (canvasFont, fallbackFontSize) => measureDeterministicTextTopAscent(canvasFont, fallbackFontSize),
    textDescent: (_canvasFont, fallbackFontSize) => measureDeterministicLayoutDescent(fallbackFontSize),
    opticalOffset: createFontFileOpticalOffset(measureWidth),
  }

  return engine
}

export function createFontFileRangeCalibrationTextMetricsEngine<StyleKey extends string, Family extends string>(
  context: TextMeasureContext,
): TextMetricsEngine<StyleKey, Family> {
  return createFontFileRangeCalibrationTextMetricsEngineWithOptions(context)
}

function createFontFileRangeCalibrationTextMetricsEngineWithOptions<StyleKey extends string, Family extends string>(
  context: TextMeasureContext,
  options: FontFileRangeCalibrationOptions = {},
): TextMetricsEngine<StyleKey, Family> {
  const allowDiagnosticBrowserFallback = options.allowDiagnosticBrowserFallback !== false
  const fallbackEngine = createDiagnosticBrowserCanvasTextMetricsEngine<StyleKey, Family>(context)
  const profilingEnabled = isLayoutProfilingEnabled()
  const measureFontFileWidth = (
    request: TextWidthRequest<StyleKey, Family>,
    widthOptions: FontFileRangeCalibrationOptions = options,
    accumulator?: FontFileWrapProfilingAccumulator | null,
  ): number | null => {
    const descriptor = parseFontFileCanvasFontDescriptor(request.canvasFont)
    const font = descriptor ? getLoadedFontFileMetric(descriptor) : null
    if (!descriptor || !font) return null

    if (request.range && request.baseFormat && request.resolveFontSize) {
      const startedAt = accumulator ? getNowMs() : 0
      const width = measureFontFileFormattedRangeWidth(request, widthOptions)
      if (accumulator) {
        accumulator.formattedRangeWidthCalls += 1
        accumulator.formattedRangeWidthMs += getNowMs() - startedAt
      }
      return width
    }

    if (request.range && request.trackingRuns.length > 0) {
      const startedAt = accumulator ? getNowMs() : 0
      const width = measureFontFileTrackedRangeWidth(request, descriptor, widthOptions)
      if (accumulator) {
        accumulator.trackedRangeWidthCalls += 1
        accumulator.trackedRangeWidthMs += getNowMs() - startedAt
      }
      return width
    }

    if (shouldDelegateWidth(request)) return null

    const startedAt = accumulator ? getNowMs() : 0
    const width = measureFontFilePlainTextWidth(
      font,
      request.text,
      descriptor,
      request.trackingScale,
      request.opticalKerning ? "optical" : "font",
      request.baseFormat?.styleKey,
    )
    if (accumulator) {
      accumulator.plainTextWidthCalls += 1
      accumulator.plainTextWidthMs += getNowMs() - startedAt
    }
    return width
  }
  const measureWidth = (request: TextWidthRequest<StyleKey, Family>): number => {
    const width = measureFontFileWidth(request)
    return allowDiagnosticBrowserFallback
      ? width ?? fallbackEngine.measureWidth(request)
      : requireFontFileWidth(width, request)
  }
  const wrapText = ({
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
    }: TextWrapRequest<StyleKey, Family>): WrappedTextLine[] => {
      const accumulator: FontFileWrapProfilingAccumulator | null = profilingEnabled
        ? {
            calls: 0,
            boundaryCorrections: 0,
            fallbackCalls: 0,
            formattedRangeWidthMs: 0,
            formattedRangeWidthCalls: 0,
            trackedRangeWidthMs: 0,
            trackedRangeWidthCalls: 0,
            plainTextWidthMs: 0,
            plainTextWidthCalls: 0,
          }
        : null
      const exactFormattedRangeWidth = createExactFormattedRangeWidthMeasurer(
        {
          sourceText: text,
          trackingScale,
          trackingRuns,
          opticalKerning,
          baseFormat,
          formatRuns,
          resolveFontSize,
        },
        options,
      )
      const startedAt = accumulator ? getNowMs() : 0
      try {
        return wrapTextDetailed(
          text,
          maxWidth,
          hyphenate,
          (sample, range) => {
            if (accumulator) accumulator.calls += 1
            const request = {
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
            }
            let measuredWidth: number | null = null
            if (range && exactFormattedRangeWidth) {
              const fastMeasureStartedAt = accumulator ? getNowMs() : 0
              measuredWidth = exactFormattedRangeWidth(sample, range)
              if (accumulator && measuredWidth !== null) {
                accumulator.formattedRangeWidthCalls += 1
                accumulator.formattedRangeWidthMs += getNowMs() - fastMeasureStartedAt
              }
            }
            if (measuredWidth === null) {
              measuredWidth = measureFontFileWidth(request, options, accumulator)
            }
            if (accumulator && measuredWidth === null && allowDiagnosticBrowserFallback) {
              accumulator.fallbackCalls += 1
            }
            const width = allowDiagnosticBrowserFallback
              ? measuredWidth ?? fallbackEngine.measureWidth(request)
              : requireFontFileWidth(measuredWidth, request)
            if (!options.boundaryClassCorrection) return width
            if (!isTerminalPunctuationBoundaryCandidate(sample)) return width

            if (accumulator) accumulator.boundaryCorrections += 1
            const correctedWidth = measureFontFileWidth(request, { classCorrection: true }, accumulator)
            if (correctedWidth === null || correctedWidth <= width) return width
            return width <= maxWidth && correctedWidth > maxWidth ? correctedWidth : width
          },
          trace,
        )
      } finally {
        if (accumulator) {
          recordLayoutPerformanceMetric("fontFile.wrapText", getNowMs() - startedAt, {
            calls: accumulator.calls,
            boundaryCorrections: accumulator.boundaryCorrections,
            fallbackCalls: accumulator.fallbackCalls,
            hyphenate,
          })
          recordLayoutPerformanceMetric(
            "fontFile.wrapText.measureFormattedRangeWidth",
            accumulator.formattedRangeWidthMs,
            {
              calls: accumulator.formattedRangeWidthCalls,
            },
          )
          recordLayoutPerformanceMetric(
            "fontFile.wrapText.measureTrackedRangeWidth",
            accumulator.trackedRangeWidthMs,
            {
              calls: accumulator.trackedRangeWidthCalls,
            },
          )
          recordLayoutPerformanceMetric(
            "fontFile.wrapText.measurePlainTextWidth",
            accumulator.plainTextWidthMs,
            {
              calls: accumulator.plainTextWidthCalls,
            },
          )
        }
      }
    }
  const engine: TextMetricsEngine<StyleKey, Family> = {
    id: options.boundaryClassCorrection
      ? "font-file-range-calibration-boundary-class-correction-v1"
      : options.classCorrection
      ? "font-file-range-calibration-class-correction-v1"
      : "font-file-range-calibration-v1",
    measureWidth,
    wrapText,
    textAscent: (canvasFont, fallbackFontSize) => measureDeterministicTextTopAscent(canvasFont, fallbackFontSize),
    textDescent: (_canvasFont, fallbackFontSize) => measureDeterministicLayoutDescent(fallbackFontSize),
    opticalOffset: createFontFileOpticalOffset(measureWidth),
  }

  return engine
}

export function createFontFileRangeCalibrationClassCorrectionTextMetricsEngine<StyleKey extends string, Family extends string>(
  context: TextMeasureContext,
): TextMetricsEngine<StyleKey, Family> {
  return createFontFileRangeCalibrationTextMetricsEngineWithOptions(context, { boundaryClassCorrection: true })
}

export function createDeterministicFontFileTextMetricsEngine<StyleKey extends string, Family extends string>(
  context: TextMeasureContext,
): TextMetricsEngine<StyleKey, Family> {
  return {
    ...createFontFileRangeCalibrationTextMetricsEngineWithOptions(context, {
      boundaryClassCorrection: true,
      allowDiagnosticBrowserFallback: false,
    }),
    id: "font-file-deterministic-v1",
  }
}

export function createDeterministicFontFileOpticalMarginTextMetricsEngine<StyleKey extends string, Family extends string>(
  context: TextMeasureContext,
): TextMetricsEngine<StyleKey, Family> {
  const engine = createDeterministicFontFileTextMetricsEngine<StyleKey, Family>(context)
  return {
    ...engine,
    id: "font-file-deterministic-optical-margin-v1",
    opticalOffset: createFontFileOpticalOffset(engine.measureWidth),
  }
}
