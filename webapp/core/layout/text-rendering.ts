import { getOpticalKerningPairAdjustment, type OpticalGlyphBounds } from "./optical-margin.ts"
import { translateMessage } from "@/core/i18n/messages"

type CanvasKerningValue = "auto" | "normal" | "none"

type CanvasKerningContext = {
  fontKerning?: CanvasKerningValue
}

type CanvasTrackingContext = {
  letterSpacing?: string
}

type CanvasFontContext = CanvasKerningContext & CanvasTrackingContext & {
  font: string
}

type CanvasMeasureContext = CanvasFontContext & {
  measureText: (text: string) => TextMetrics
}

type CanvasDrawContext = CanvasMeasureContext & {
  save: () => void
  restore: () => void
  translate: (x: number, y: number) => void
  rotate: (angle: number) => void
  fillText: (text: string, x: number, y: number, maxWidth?: number) => void
  textAlign: CanvasTextAlign
}

const FONT_STACKS: Record<string, string> = {
  Inter: "Inter, system-ui, -apple-system, sans-serif",
  "Work Sans": "Work Sans, sans-serif",
  Jost: "Jost, sans-serif",
  "IBM Plex Sans": "IBM Plex Sans, sans-serif",
  "EB Garamond": "EB Garamond, serif",
  "Libre Baskerville": "Libre Baskerville, serif",
  "Bodoni Moda": "Bodoni Moda, serif",
  Besley: "Besley, serif",
  "Playfair Display": "Playfair Display, serif",
}

export const DEFAULT_TRACKING_SCALE = 0
export const DEFAULT_OPTICAL_KERNING = true
export const MIN_TRACKING_SCALE = -300
export const MAX_TRACKING_SCALE = 300

export const TRACKING_OPTIONS = [
  { label: translateMessage("ui.editor.trackingOptions.ultraCondensed"), value: -120 },
  { label: translateMessage("ui.editor.trackingOptions.extraCondensed"), value: -90 },
  { label: translateMessage("ui.editor.trackingOptions.condensed"), value: -60 },
  { label: translateMessage("ui.editor.trackingOptions.semiCondensed"), value: -30 },
  { label: translateMessage("ui.editor.trackingOptions.normal"), value: DEFAULT_TRACKING_SCALE },
  { label: translateMessage("ui.editor.trackingOptions.semiExpanded"), value: 30 },
  { label: translateMessage("ui.editor.trackingOptions.expanded"), value: 60 },
  { label: translateMessage("ui.editor.trackingOptions.extraExpanded"), value: 120 },
  { label: translateMessage("ui.editor.trackingOptions.ultraExpanded"), value: 200 },
] as const

export type TrackingOption = (typeof TRACKING_OPTIONS)[number]

const graphemeSegmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null

export function splitTextForTracking(text: string): string[] {
  if (!text) return []
  if (/^[\x00-\x7F]+$/.test(text)) return text.split("")
  if (!graphemeSegmenter) return Array.from(text)
  return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment)
}

export function formatTrackingScale(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0"
  return `${value > 0 ? "+" : ""}${Math.round(value)}`
}

export function normalizeTrackingScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TRACKING_SCALE
  }
  return Math.max(MIN_TRACKING_SCALE, Math.min(MAX_TRACKING_SCALE, Math.round(value)))
}

export function getTrackingOption(scale: number): TrackingOption {
  const normalized = normalizeTrackingScale(scale)
  return TRACKING_OPTIONS.find((option) => option.value === normalized) ?? TRACKING_OPTIONS[4]
}

export function normalizeOpticalKerning(value: unknown): boolean {
  return value !== false
}

function resolveCanvasFontSize(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/)
  if (!match) return 0
  const size = Number(match[1])
  return Number.isFinite(size) && size > 0 ? size : 0
}

export function getTrackingLetterSpacing(fontSize: number, trackingScale: number): number {
  const normalizedTracking = normalizeTrackingScale(trackingScale)
  if (!Number.isFinite(fontSize) || fontSize <= 0 || normalizedTracking === 0) return 0
  return (fontSize * normalizedTracking) / 1000
}

export function buildCanvasFont(
  fontFamily: string,
  fontWeight: number,
  italic: boolean,
  fontSize: number,
): string {
  const fontStyle = italic ? "italic " : ""
  const fontStack = FONT_STACKS[fontFamily] ?? `"${fontFamily}", sans-serif`
  return `${fontStyle}${fontWeight} ${fontSize}px ${fontStack}`
}

export function setCanvasFontKerning(context: CanvasKerningContext, opticalKerning: boolean): void {
  if (!("fontKerning" in context)) return
  context.fontKerning = opticalKerning ? "none" : "normal"
}

export function setCanvasLetterSpacing(
  context: CanvasTrackingContext,
  trackingScale: number,
  fontSize: number,
): void {
  if (!("letterSpacing" in context)) return
  context.letterSpacing = `${getTrackingLetterSpacing(fontSize, trackingScale)}px`
}

export function applyCanvasTextConfig(
  context: CanvasFontContext,
  {
    font,
    opticalKerning,
  }: {
    font: string
    opticalKerning: boolean
  },
): void {
  context.font = font
  setCanvasFontKerning(context, opticalKerning)
  if ("letterSpacing" in context) context.letterSpacing = "0px"
}

export type GlyphBoundsMeasure = (glyph: string) => OpticalGlyphBounds | null
export type GlyphPairAdvanceMeasure = (
  previous: string,
  current: string,
  opticalKerning: boolean,
) => number | null

function measureGlyphAdvance(
  context: CanvasMeasureContext,
  glyph: string,
  measureGlyphBounds?: GlyphBoundsMeasure,
): number {
  const measured = measureGlyphBounds?.(glyph)
  if (measured && Number.isFinite(measured.advanceWidth) && measured.advanceWidth >= 0) {
    return measured.advanceWidth
  }
  return context.measureText(glyph).width
}

export function measureTextPairAdvance(
  context: CanvasMeasureContext,
  previous: string,
  current: string,
  fontSize: number,
  opticalKerning: boolean,
  measureGlyphBounds?: GlyphBoundsMeasure,
  measurePairAdvance?: GlyphPairAdvanceMeasure,
): number {
  if (!previous) return 0
  if (!current) return measureGlyphAdvance(context, previous, measureGlyphBounds)
  const measuredPairAdvance = measurePairAdvance?.(previous, current, opticalKerning)
  if (
    typeof measuredPairAdvance === "number"
    && Number.isFinite(measuredPairAdvance)
    && measuredPairAdvance >= 0
  ) {
    return measuredPairAdvance
  }
  if (!opticalKerning) {
    const pairWidth = context.measureText(`${previous}${current}`).width
    const currentWidth = context.measureText(current).width
    return Math.max(0, pairWidth - currentWidth)
  }

  const unkernedAdvance = measureGlyphAdvance(context, previous, measureGlyphBounds)
  const adjustment = getOpticalKerningPairAdjustment({
    left: previous,
    right: current,
    font: context.font,
    fontSize,
    pairAdvance: unkernedAdvance,
    measureGlyphBounds,
  })
  return Math.max(0, unkernedAdvance + adjustment)
}

export function measureCanvasTextWidth(
  context: CanvasMeasureContext,
  text: string,
  trackingScale: number,
  fontSize?: number,
  opticalKerning = true,
  measureGlyphBounds?: GlyphBoundsMeasure,
  measurePairAdvance?: GlyphPairAdvanceMeasure,
): number {
  const trackingValue = normalizeTrackingScale(trackingScale)
  const glyphs = splitTextForTracking(text)
  const glyphCount = glyphs.length
  if (glyphCount <= 1) {
    return measureGlyphAdvance(context, text, measureGlyphBounds)
  }
  const resolvedFontSize = fontSize ?? resolveCanvasFontSize(context.font)
  if (!opticalKerning && trackingValue === 0 && !measurePairAdvance) {
    return context.measureText(text).width
  }

  let width = 0
  for (let index = 1; index < glyphCount; index += 1) {
    const previous = glyphs[index - 1] ?? ""
    const current = glyphs[index] ?? ""
    width += measureTextPairAdvance(
      context,
      previous,
      current,
      resolvedFontSize,
      opticalKerning,
      measureGlyphBounds,
      measurePairAdvance,
    ) + getTrackingLetterSpacing(resolvedFontSize, trackingValue)
  }

  return width + measureGlyphAdvance(context, glyphs[glyphCount - 1] ?? "", measureGlyphBounds)
}

export function drawCanvasText(
  context: CanvasDrawContext,
  {
    text,
    x,
    y,
    textAlign,
    fontSize,
    trackingScale,
    opticalKerning = true,
    blockRotation = 0,
    rotationOrigin,
    measureGlyphBounds,
  }: {
    text: string
    x: number
    y: number
    textAlign?: CanvasTextAlign
    fontSize?: number
    trackingScale: number
    opticalKerning?: boolean
    blockRotation?: number
    rotationOrigin?: { x: number; y: number }
    measureGlyphBounds?: GlyphBoundsMeasure
  },
): void {
  const trackingValue = normalizeTrackingScale(trackingScale)
  const angle = (blockRotation * Math.PI) / 180
  const glyphs = splitTextForTracking(text)
  const resolvedTextAlign = textAlign ?? context.textAlign
  const resolvedFontSize = fontSize ?? resolveCanvasFontSize(context.font)
  const letterSpacingPx = getTrackingLetterSpacing(resolvedFontSize, trackingValue)
  if (!opticalKerning && glyphs.length <= 1 && trackingValue === 0 && Math.abs(angle) <= 0.0001) {
    context.textAlign = resolvedTextAlign
    setCanvasLetterSpacing(context, trackingValue, resolvedFontSize)
    context.fillText(text, x, y)
    return
  }

  if (!opticalKerning && "letterSpacing" in context) {
    context.save()
    context.textAlign = resolvedTextAlign
    setCanvasLetterSpacing(context, trackingValue, resolvedFontSize)
    if (rotationOrigin && Math.abs(angle) > 0.0001) {
      context.translate(rotationOrigin.x, rotationOrigin.y)
      context.rotate(angle)
      context.fillText(text, x - rotationOrigin.x, y - rotationOrigin.y)
      context.restore()
      return
    }
    context.fillText(text, x, y)
    context.restore()
    return
  }

  const lineWidth = measureCanvasTextWidth(
    context,
    text,
    trackingValue,
    resolvedFontSize,
    opticalKerning,
    measureGlyphBounds,
  )
  const startX = resolvedTextAlign === "center"
    ? x - lineWidth / 2
    : resolvedTextAlign === "right"
      ? x - lineWidth
      : x

  context.save()
  context.textAlign = "left"
  if (rotationOrigin && Math.abs(angle) > 0.0001) {
    const localX = startX - rotationOrigin.x
    const localY = y - rotationOrigin.y
    context.translate(rotationOrigin.x, rotationOrigin.y)
    context.rotate(angle)
    drawTrackedGlyphs(
      context,
      glyphs,
      localX,
      localY,
      letterSpacingPx,
      resolvedFontSize,
      opticalKerning,
      measureGlyphBounds,
    )
    context.restore()
    return
  }

  drawTrackedGlyphs(
    context,
    glyphs,
    startX,
    y,
    letterSpacingPx,
    resolvedFontSize,
    opticalKerning,
    measureGlyphBounds,
  )
  context.restore()
}

function drawTrackedGlyphs(
  context: CanvasMeasureContext & Pick<CanvasDrawContext, "fillText">,
  glyphs: string[],
  startX: number,
  baselineY: number,
  letterSpacingPx: number,
  fontSize: number,
  opticalKerning: boolean,
  measureGlyphBounds?: GlyphBoundsMeasure,
): void {
  if (glyphs.length === 0) return
  let cursorX = startX
  context.fillText(glyphs[0] ?? "", cursorX, baselineY)
  for (let index = 1; index < glyphs.length; index += 1) {
    const previous = glyphs[index - 1] ?? ""
    const current = glyphs[index] ?? ""
    const pairAdvance = measureTextPairAdvance(
      context,
      previous,
      current,
      fontSize,
      opticalKerning,
      measureGlyphBounds,
    )
    cursorX += pairAdvance + letterSpacingPx
    context.fillText(current, cursorX, baselineY)
  }
}
