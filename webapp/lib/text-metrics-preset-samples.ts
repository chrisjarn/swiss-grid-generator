import { clampFxSize } from "@/lib/block-constraints"
import {
  getStyleDefaultFontWeight,
  isFontFamily,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"
import { parseLoadedProject } from "@/lib/document-session"
import { DEFAULT_STYLE_ASSIGNMENTS, isBaseBlockId } from "@/lib/document-defaults"
import { LAYOUT_PRESETS } from "@/lib/presets"
import { buildPresetBrowserPage } from "@/lib/presets/browser-page"
import type { LayoutPreset, LayoutPresetBrowserPage } from "@/lib/presets/types"
import type { TextMetricsParitySample } from "@/lib/text-metrics-parity"
import {
  buildCanvasFont,
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
  normalizeOpticalKerning,
  normalizeTrackingScale,
} from "@/lib/text-rendering"
import type { PreviewLayoutState, TextAlignMode } from "@/lib/types/preview-layout"

type BlockId = string
type TypographyStyleKey = string
type PresetLayout = PreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

type TypographyStyleDefinition = {
  size: number
  weight: string
  blockItalic: boolean
}

export type TextMetricsPresetSampleOptions = {
  presets?: readonly LayoutPreset[]
  sampleLimit?: number
  maxTextLength?: number
  includeAllPages?: boolean
  includeStressSamples?: boolean
}

export type TextMetricsPresetSamplePage = {
  label: string
  page: LayoutPresetBrowserPage
}

function getPresetLayout(page: LayoutPresetBrowserPage): PresetLayout | null {
  const raw = page.previewLayout
  if (!raw || typeof raw !== "object") return null
  return raw as PresetLayout
}

export function collectTextMetricsPresetPages(
  preset: LayoutPreset,
  includeAllPages: boolean,
): TextMetricsPresetSamplePage[] {
  if (!includeAllPages) {
    return [{ label: `${preset.label} / ${preset.browserPage.name}`, page: preset.browserPage }]
  }

  try {
    const project = parseLoadedProject<Record<string, unknown>>(JSON.parse(preset.projectSourceJson))
    return project.pages.map((page) => {
      const browserPage = buildPresetBrowserPage(page, preset.id, project.layoutEngine)
      return {
        label: `${preset.label} / ${browserPage.name}`,
        page: browserPage,
      }
    })
  } catch {
    return [{ label: `${preset.label} / ${preset.browserPage.name}`, page: preset.browserPage }]
  }
}

function normalizeBlockOrder(value: unknown): BlockId[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is BlockId => typeof entry === "string" && entry.trim().length > 0)
    .filter((key, index, source) => source.indexOf(key) === index)
}

function getStyleDefinitions(page: LayoutPresetBrowserPage): Record<TypographyStyleKey, TypographyStyleDefinition> {
  return page.result.typography.styles as Record<TypographyStyleKey, TypographyStyleDefinition>
}

function getStyleKeyForBlock(
  key: BlockId,
  layout: PresetLayout,
  styleDefinitions: Record<TypographyStyleKey, TypographyStyleDefinition>,
): TypographyStyleKey {
  const assigned = layout.styleAssignments[key]
  if (assigned && Object.hasOwn(styleDefinitions, assigned)) return assigned
  if (isBaseBlockId(key)) return DEFAULT_STYLE_ASSIGNMENTS[key]
  return "body"
}

function getBlockFontSize(
  key: BlockId,
  styleKey: TypographyStyleKey,
  defaultSize: number,
  layout: PresetLayout,
): number {
  if (styleKey !== "fx") return defaultSize
  const raw = layout.blockCustomSizes?.[key]
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultSize
  return clampFxSize(raw)
}

function getBlockFontVariant(
  key: BlockId,
  styleKey: TypographyStyleKey,
  page: LayoutPresetBrowserPage,
  layout: PresetLayout,
  styleDefinitions: Record<TypographyStyleKey, TypographyStyleDefinition>,
) {
  const requestedFont = layout.blockFontFamilies?.[key]
  const fontFamily = isFontFamily(requestedFont) ? requestedFont : page.baseFont
  const weightOverride = layout.blockFontWeights?.[key]
  const requestedWeight = typeof weightOverride === "number" && Number.isFinite(weightOverride) && weightOverride > 0
    ? weightOverride
    : getStyleDefaultFontWeight(styleDefinitions[styleKey]?.weight)
  const italicOverride = layout.blockItalic?.[key]
  const requestedItalic = italicOverride === true || italicOverride === false
    ? italicOverride
    : styleDefinitions[styleKey]?.blockItalic === true

  return {
    fontFamily,
    variant: resolveFontVariant(fontFamily, requestedWeight, requestedItalic),
  }
}

function getSampleText(text: string, maxLength: number): string | null {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  if (!normalized) return null
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized
}

function getBlockWrapWidth(page: LayoutPresetBrowserPage, layout: PresetLayout, key: BlockId): number {
  const gridCols = Math.max(1, page.result.settings.gridCols)
  const span = Math.max(1, Math.min(gridCols, Math.round(layout.blockColumnSpans[key] ?? 1)))
  const widths = page.result.module.widths.length ? page.result.module.widths : [page.result.module.width]
  const firstWidths = widths.slice(0, span)
  const modulesWidth = firstWidths.reduce((sum, value) => sum + value, 0)
  const fallbackWidth = page.result.module.width * span
  return Math.max(1, modulesWidth || fallbackWidth || page.result.module.width)
    + Math.max(0, span - 1) * page.result.grid.gridMarginHorizontal
}

function toTextAlign(value: unknown): TextAlignMode {
  return value === "right" || value === "center" ? value : "left"
}

function collectTextMetricsStressSamples(
  maxTextLength: number,
): TextMetricsParitySample<TypographyStyleKey, FontFamily>[] {
  const samples: TextMetricsParitySample<TypographyStyleKey, FontFamily>[] = [
    {
      label: "Stress / German compound / Inter bold body",
      canvasFont: buildCanvasFont("Inter", 700, false, 20),
      text: "Donaudampfschifffahrtsgesellschaft und Bundesverfassungsgerichtsentscheidung als kontrollierte Umbruchprobe.",
      maxWidth: 210,
      hyphenate: true,
      trackingScale: DEFAULT_TRACKING_SCALE,
      opticalKerning: true,
      styleKey: "body",
      fontSize: 20,
      align: "left",
    },
    {
      label: "Stress / Terminal punctuation / Inter fx",
      canvasFont: buildCanvasFont("Inter", 400, false, 14),
      text: "facing pages without a real spread logic. compositional decisions, not repair tools.",
      maxWidth: 255.639,
      hyphenate: true,
      trackingScale: DEFAULT_TRACKING_SCALE,
      opticalKerning: true,
      styleKey: "fx",
      fontSize: 14,
      align: "left",
    },
    {
      label: "Stress / Editorial display / Playfair Display",
      canvasFont: buildCanvasFont("Playfair Display", 700, false, 96),
      text: "ANZEIGE",
      maxWidth: 520,
      hyphenate: false,
      trackingScale: -10,
      opticalKerning: true,
      styleKey: "display",
      fontSize: 96,
      align: "center",
    },
    {
      label: "Stress / Tracked caption / Jost",
      canvasFont: buildCanvasFont("Jost", 400, false, 18),
      text: "BASELINE GRID RHYTHM 12 PT",
      maxWidth: 270,
      hyphenate: false,
      trackingScale: 120,
      opticalKerning: true,
      styleKey: "caption",
      fontSize: 18,
      align: "left",
    },
    {
      label: "Stress / Narrow editorial note / Work Sans",
      canvasFont: buildCanvasFont("Work Sans", 400, false, 10),
      text: "Small editorial text in a narrow measure must keep line decisions stable across engines.",
      maxWidth: 118,
      hyphenate: true,
      trackingScale: DEFAULT_TRACKING_SCALE,
      opticalKerning: true,
      styleKey: "caption",
      fontSize: 10,
      align: "left",
    },
  ]

  return samples.map((sample) => ({
    ...sample,
    text: sample.text.length > maxTextLength ? sample.text.slice(0, maxTextLength).trim() : sample.text,
  }))
}

export function collectTextMetricsPresetSamples({
  presets = LAYOUT_PRESETS,
  sampleLimit = 240,
  maxTextLength = 180,
  includeAllPages = true,
  includeStressSamples = true,
}: TextMetricsPresetSampleOptions = {}): TextMetricsParitySample<TypographyStyleKey, FontFamily>[] {
  const samples: TextMetricsParitySample<TypographyStyleKey, FontFamily>[] = []

  for (const preset of presets) {
    for (const samplePage of collectTextMetricsPresetPages(preset, includeAllPages)) {
      const page = samplePage.page
      const layout = getPresetLayout(page)
      if (!layout) continue

      const styleDefinitions = getStyleDefinitions(page)
      for (const key of normalizeBlockOrder(layout.blockOrder)) {
        if (samples.length >= sampleLimit) return samples
        const rawText = layout.textContent[key] ?? ""
        const text = getSampleText(rawText, maxTextLength)
        if (!text) continue

        const styleKey = getStyleKeyForBlock(key, layout, styleDefinitions)
        const style = styleDefinitions[styleKey]
        if (!style) continue

        const fontSize = getBlockFontSize(key, styleKey, style.size, layout)
        const { fontFamily, variant } = getBlockFontVariant(key, styleKey, page, layout, styleDefinitions)
        const trackingScale = normalizeTrackingScale(layout.blockTrackingScales?.[key] ?? DEFAULT_TRACKING_SCALE)
        const opticalKerning = normalizeOpticalKerning(layout.blockOpticalKerning?.[key] ?? DEFAULT_OPTICAL_KERNING)

        samples.push({
          label: `${samplePage.label} / ${key}`,
          canvasFont: buildCanvasFont(fontFamily, variant.weight, variant.italic, fontSize),
          text,
          maxWidth: getBlockWrapWidth(page, layout, key),
          hyphenate: layout.blockSyllableDivision?.[key] === true,
          trackingScale,
          opticalKerning,
          styleKey,
          fontSize,
          align: toTextAlign(layout.blockTextAlignments[key]),
        })
      }
    }
  }

  if (includeStressSamples) {
    for (const sample of collectTextMetricsStressSamples(maxTextLength)) {
      if (samples.length >= sampleLimit) return samples
      samples.push(sample)
    }
  }

  return samples
}
