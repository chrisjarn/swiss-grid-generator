import { buildBrowserFontLoadSpec, preloadBrowserFontSpecs } from "@/lib/browser-font-loading"
import {
  collectFontFileMetricFacesFromCanvasFonts,
  createDeterministicFontFileOpticalMarginTextMetricsEngine,
  createDeterministicFontFileTextMetricsEngine,
  createFontFileRangeCalibrationClassCorrectionTextMetricsEngine,
  createFontFileRangeCalibrationTextMetricsEngine,
  measureLoadedFontFilePairAdvance,
  measureFontFileFormattedRangeWidth,
  measureFontFileTrackedRangeWidth,
  measureLoadedFontFileTextWidth,
  parseFontFileCanvasFontDescriptor,
  preloadFontFileMetricFaces,
  type FontFileCanvasFontDescriptor,
} from "@/lib/font-file-text-metrics-engine"
import { compareTextMetricsEngines, type TextMetricsParityDelta } from "@/lib/text-metrics-parity"
import {
  collectTextMetricsPresetPages,
  collectTextMetricsPresetSamples,
} from "@/lib/text-metrics-preset-samples"
import type { FontFamily } from "@/lib/config/fonts"
import { LAYOUT_PRESETS } from "@/lib/presets"
import {
  buildPageExportPlan,
  type PageExportPlan,
  type PageExportTextPlan,
  type PageExportTextWrapTrace,
} from "@/lib/page-export-plan"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  getTrackingLetterSpacing,
  measureCanvasTextWidth,
  measureTextPairAdvance,
} from "@/lib/text-rendering"
import {
  runBrowserTextMetricsDiagnostics,
  type BrowserTextMetricsDiagnostics,
} from "@/lib/text-metrics-browser-diagnostics"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"
import type { TextMetricsEngineFactory } from "@/lib/text-metrics-engine"

type TypographyStyleKey = string
type ExportPreviewLayoutState = PreviewLayoutState<TypographyStyleKey, FontFamily, string>

export type TextMetricsPresetParityReportOptions = {
  sampleLimit?: number
  maxTextLength?: number
  exportPageLimit?: number
}

export type TextMetricsPresetParityDelta = TextMetricsParityDelta & {
  text: string
  canvasFont: string
  fontFamily: FontFamily | null
  fontWeight: number | null
  italic: boolean | null
  fontSize: number
  maxWidth: number
  trackingScale: number
  opticalKerning: boolean
  activeWidthNoOpticalKerning: number
  candidateWidthNoOpticalKerning: number
  widthDeltaNoOpticalKerning: number
  opticalKerningDelta: number
}

export type TextMetricsPresetParityFontSummary = {
  fontFamily: FontFamily | null
  fontWeight: number | null
  italic: boolean | null
  sampleCount: number
  maxAbsWidthDelta: number
  averageAbsWidthDelta: number
  maxAbsAdvanceDelta: number
  averageAbsAdvanceDelta: number
  maxAbsOpticalKerningDelta: number
  averageAbsOpticalKerningDelta: number
}

export type TextMetricsPresetParityDiagnosis = {
  status: "compatible" | "unstable"
  primaryCause: string
  evidence: string[]
  browserRisks: {
    fontLoadingReady: boolean
    canvasFontKerningSupported: boolean
    canvasLetterSpacingSupported: boolean
    boldFontNormalizationStable: boolean
    collapsedTextBoundsProbeCount: number
    opticalKerningDominatesWidthDelta: boolean
  }
}

export type TextMetricsFontProbeDelta = {
  label: string
  text: string
  canvasFont: string
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  trackingScale: number
  browserNoKerningWidth: number
  browserNormalKerningWidth: number
  browserTrackedKerningWidth: number
  fontFileNoKerningWidth: number
  fontFileKerningWidth: number
  fontFileTrackedKerningWidth: number
  noKerningDelta: number
  fontKerningDelta: number
  trackedKerningDelta: number
  browserKerningEffect: number
  fontFileKerningEffect: number
}

export type TextMetricsPresetParityReport = {
  activeEngineId: string
  candidateEngineId: string
  sampleCount: number
  maxAbsWidthDelta: number
  averageAbsWidthDelta: number
  maxAbsAdvanceDelta: number
  averageAbsAdvanceDelta: number
  maxAbsOpticalKerningDelta: number
  averageAbsOpticalKerningDelta: number
  wrappedTextChangedCount: number
  wrappedLineCountChangedCount: number
  deltas: TextMetricsPresetParityDelta[]
  largestWidthDeltas: TextMetricsPresetParityDelta[]
  largestAdvanceDeltas: TextMetricsPresetParityDelta[]
  largestOpticalKerningDeltas: TextMetricsPresetParityDelta[]
  largestFontProbeDeltas: TextMetricsFontProbeDelta[]
  fontSummaries: TextMetricsPresetParityFontSummary[]
  exportPlan: TextMetricsExportPlanParityReport
  rangeCalibration: TextMetricsExportPlanParityReport
  rangeCalibrationClassCorrection: TextMetricsExportPlanParityReport
  deterministicOpticalMargin: TextMetricsExportPlanParityReport
  productionExportPlanSignatures: TextMetricsProductionExportPlanSignature[]
  deterministicOpticalMarginExportPlanSignatures: TextMetricsProductionExportPlanSignature[]
  browserDiagnostics: BrowserTextMetricsDiagnostics
  diagnosis: TextMetricsPresetParityDiagnosis
}

export type TextMetricsProductionExportPlanSignature = {
  label: string
  signature: string
  pageWidth: number
  pageHeight: number
  rotation: number
  textPlanCount: number
  imagePlanCount: number
  orderedLayerCount: number
}

export type TextMetricsExportPlanParityDelta = {
  label: string
  key: string
  styleKey: TypographyStyleKey
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  leading: number
  trackingScale: number
  opticalKerning: boolean
  columnReflow: boolean
  rectWidth: number
  activeCommandCount: number
  candidateCommandCount: number
  commandCountDelta: number
  changedCommandTextCount: number
  maxAbsCommandXDelta: number
  maxAbsCommandYDelta: number
  maxAbsRectXDelta: number
  maxAbsRectYDelta: number
  maxAbsRectWidthDelta: number
  maxAbsRectHeightDelta: number
  activeTexts: string[]
  candidateTexts: string[]
  changedCommands: TextMetricsExportPlanCommandDelta[]
  boundaryVetoes: TextMetricsWrapBoundaryVeto[]
}

export type TextMetricsExportPlanCommandDelta = {
  index: number
  textChanged: boolean
  activeText: string
  candidateText: string
  activeMeasuredText: string
  candidateMeasuredText: string
  activeX: number | null
  candidateX: number | null
  xDelta: number
  activeY: number | null
  candidateY: number | null
  yDelta: number
  activeWidth: number | null
  activeFontFileWidth: number | null
  activeFontFileDelta: number | null
  activeOverrun: number | null
  candidateWidth: number | null
  candidateBrowserWidth: number | null
  candidateBrowserDelta: number | null
  widthDelta: number | null
  candidateOverrun: number | null
  candidateBrowserOverrun: number | null
  activeSourceStart: number | null
  activeSourceEnd: number | null
  candidateSourceStart: number | null
  candidateSourceEnd: number | null
  boundaryProbe: TextMetricsWrapBoundaryProbe | null
  wrapTrace: TextMetricsWrapBoundaryTrace | null
  opticalPairDiagnostics: TextMetricsOpticalPairDiagnostics | null
}

export type TextMetricsWrapBoundaryProbe = {
  candidateText: string
  candidateMeasuredText: string
  candidateSourceStart: number | null
  candidateSourceEnd: number | null
  tippingText: string
  maxWidth: number
  browserWidth: number | null
  outlineWidth: number | null
  browserOverrun: number | null
  outlineOverrun: number | null
  browserWouldAccept: boolean | null
  outlineWouldAccept: boolean | null
  decisionChanged: boolean
  acceptedBy: "both" | "browser-only" | "outline-only" | "neither" | "unknown"
}

export type TextMetricsWrapBoundaryVeto = {
  lineIndex: number
  tokenText: string
  candidateText: string
  measuredText: string
  candidateSourceStart: number
  candidateSourceEnd: number
  uncorrectedWidth: number
  correctedWidth: number
  correction: number
  maxWidth: number
  uncorrectedOverrun: number
  correctedOverrun: number
}

export type TextMetricsOpticalPairDiagnostics = {
  text: string
  pairCount: number
  browserWidth: number
  outlineWidth: number
  widthDelta: number
  pairDeltaTotal: number
  terminalGlyphDelta: number
  pairs: TextMetricsOpticalPairDelta[]
  largestPairs: TextMetricsOpticalPairDelta[]
}

export type TextMetricsOpticalPairDelta = {
  index: number
  left: string
  right: string
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  styleKey: TypographyStyleKey
  trackingScale: number
  browserPairAdvance: number
  outlinePairAdvance: number
  pairAdvanceDelta: number
  tracking: number
  browserContribution: number
  outlineContribution: number
  contributionDelta: number
}

export type TextMetricsOpticalPairAggregate = {
  pairKey: string
  left: string
  right: string
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  styleKey: TypographyStyleKey
  trackingScale: number
  occurrenceCount: number
  totalContributionDelta: number
  averageContributionDelta: number
  maxAbsContributionDelta: number
  sameDirectionCount: number
}

type TextMetricsOpticalPairClass =
  | "space"
  | "punctuation"
  | "round-lower"
  | "straight-lower"
  | "stem-lower"
  | "diagonal-lower"
  | "upper"
  | "digit"
  | "other"

export type TextMetricsOpticalPairClassAggregate = {
  classKey: string
  leftClass: TextMetricsOpticalPairClass
  rightClass: TextMetricsOpticalPairClass
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  styleKey: TypographyStyleKey
  trackingScale: number
  occurrenceCount: number
  totalContributionDelta: number
  averageContributionDelta: number
  maxAbsContributionDelta: number
  sameDirectionCount: number
}

export type TextMetricsOpticalPairSummary = {
  commandCount: number
  pairCount: number
  totalContributionDelta: number
  averageContributionDelta: number
  maxAbsContributionDelta: number
  largestPairs: TextMetricsOpticalPairDelta[]
  largestAggregates: TextMetricsOpticalPairAggregate[]
  largestClassAggregates: TextMetricsOpticalPairClassAggregate[]
}

export type TextMetricsWrapBoundaryTrace = {
  active: PageExportTextWrapTrace | null
  candidate: PageExportTextWrapTrace | null
  decisionChanged: boolean
  widthDelta: number | null
  browserOverrun: number | null
  outlineOverrun: number | null
  sameCandidate: TextMetricsWrapCrossEngineTrace | null
}

export type TextMetricsWrapCrossEngineTrace = {
  browser: PageExportTextWrapTrace | null
  outline: PageExportTextWrapTrace | null
  decisionChanged: boolean
  widthDelta: number | null
  browserOverrun: number | null
  outlineOverrun: number | null
  acceptedBy: "both" | "browser-only" | "outline-only" | "neither" | "unknown"
}

export type TextMetricsWrapDecisionDeltaSummary = {
  label: string
  key: string
  styleKey: TypographyStyleKey
  commandIndex: number
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  leading: number
  trackingScale: number
  opticalKerning: boolean
  rectWidth: number
  candidateText: string
  candidateMeasuredText: string
  candidateSourceStart: number | null
  candidateSourceEnd: number | null
  widthDelta: number
  absWidthDelta: number
  browserOverrun: number | null
  outlineOverrun: number | null
  acceptedBy: TextMetricsWrapCrossEngineTrace["acceptedBy"]
  browserWidth: number | null
  outlineWidth: number | null
  maxWidth: number | null
}

export type TextMetricsWrapDecisionGroupSummary = {
  groupKey: string
  styleKey: TypographyStyleKey
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  trackingScale: number
  opticalKerning: boolean
  sampleCount: number
  decisionChangedCount: number
  outlineOnlyCount: number
  browserOnlyCount: number
  maxAbsWidthDelta: number
  averageAbsWidthDelta: number
}

export type TextMetricsWrapDecisionSummary = {
  sampleCount: number
  decisionChangedCount: number
  outlineOnlyCount: number
  browserOnlyCount: number
  bothAcceptedCount: number
  neitherAcceptedCount: number
  unknownAcceptedCount: number
  maxAbsWidthDelta: number
  averageAbsWidthDelta: number
  largestDeltas: TextMetricsWrapDecisionDeltaSummary[]
  groups: TextMetricsWrapDecisionGroupSummary[]
}

export type TextMetricsWrapBoundaryVetoSummary = {
  sampleCount: number
  maxCorrection: number
  averageCorrection: number
  largestVetoes: (TextMetricsWrapBoundaryVeto & {
    label: string
    key: string
    styleKey: TypographyStyleKey
    fontFamily: FontFamily
    fontWeight: number
    italic: boolean
    fontSize: number
    trackingScale: number
    opticalKerning: boolean
  })[]
}

export type TextMetricsExportPlanParityReport = {
  pageCount: number
  textPlanCount: number
  changedPlanCount: number
  changedCommandCount: number
  changedCommandTextCount: number
  maxAbsCommandXDelta: number
  maxAbsCommandYDelta: number
  maxAbsRectXDelta: number
  maxAbsRectYDelta: number
  maxAbsRectWidthDelta: number
  maxAbsRectHeightDelta: number
  largestDeltas: TextMetricsExportPlanParityDelta[]
  wrapDecisionSummary: TextMetricsWrapDecisionSummary
  boundaryVetoSummary: TextMetricsWrapBoundaryVetoSummary
  opticalPairSummary: TextMetricsOpticalPairSummary
}

function createMeasurementContext(): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Text metrics parity report requires a 2D canvas context.")
  }
  return context
}

function collectBrowserFontSpecs(canvasFonts: readonly string[]): string[] {
  const specs = new Set<string>()
  for (const font of canvasFonts) {
    const descriptor = parseFontFileCanvasFontDescriptor(font)
    if (!descriptor) continue
    specs.add(buildBrowserFontLoadSpec(
      descriptor.fontFamily,
      descriptor.fontWeight,
      descriptor.italic,
      Math.max(12, Math.round(descriptor.fontSize)),
    ))
  }
  return [...specs]
}

function average(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function buildFontSummaries(
  deltas: readonly TextMetricsPresetParityDelta[],
): TextMetricsPresetParityFontSummary[] {
  const grouped = new Map<string, TextMetricsPresetParityDelta[]>()
  for (const delta of deltas) {
    const key = `${delta.fontFamily ?? "unknown"}:${delta.fontWeight ?? "unknown"}:${delta.italic === true ? "italic" : delta.italic === false ? "normal" : "unknown"}`
    grouped.set(key, [...(grouped.get(key) ?? []), delta])
  }

  return [...grouped.values()]
    .map((items) => {
      const first = items[0]
      const absWidthDeltas = items.map((delta) => Math.abs(delta.widthDelta))
      const absAdvanceDeltas = items.map((delta) => Math.abs(delta.widthDeltaNoOpticalKerning))
      const absOpticalDeltas = items.map((delta) => Math.abs(delta.opticalKerningDelta))
      return {
        fontFamily: first?.fontFamily ?? null,
        fontWeight: first?.fontWeight ?? null,
        italic: first?.italic ?? null,
        sampleCount: items.length,
        maxAbsWidthDelta: Math.max(0, ...absWidthDeltas),
        averageAbsWidthDelta: average(absWidthDeltas),
        maxAbsAdvanceDelta: Math.max(0, ...absAdvanceDeltas),
        averageAbsAdvanceDelta: average(absAdvanceDeltas),
        maxAbsOpticalKerningDelta: Math.max(0, ...absOpticalDeltas),
        averageAbsOpticalKerningDelta: average(absOpticalDeltas),
      }
    })
    .sort((a, b) => b.maxAbsWidthDelta - a.maxAbsWidthDelta)
}

function measureBrowserWidth(
  context: CanvasRenderingContext2D,
  font: string,
  text: string,
  fontKerning: "none" | "normal",
): number {
  context.font = font
  if ("fontKerning" in context) {
    context.fontKerning = fontKerning
  }
  return context.measureText(text).width
}

function buildFontProbeDeltas(
  context: CanvasRenderingContext2D,
  deltas: readonly TextMetricsPresetParityDelta[],
): TextMetricsFontProbeDelta[] {
  const probes = new Map<string, TextMetricsPresetParityDelta>()
  for (const delta of deltas) {
    if (!delta.fontFamily || delta.fontWeight === null || delta.italic === null || delta.fontSize <= 0) continue
    const key = `${delta.canvasFont}::${delta.text}`
    if (!probes.has(key)) probes.set(key, delta)
  }

  return [...probes.values()].flatMap((delta) => {
    const descriptor: FontFileCanvasFontDescriptor = {
      fontFamily: delta.fontFamily as FontFamily,
      fontWeight: delta.fontWeight ?? 400,
      italic: delta.italic ?? false,
      fontSize: delta.fontSize,
    }
    const fontFileNoKerningWidth = measureLoadedFontFileTextWidth({
      text: delta.text,
      descriptor,
      trackingScale: 0,
      kerningMode: "none",
      styleKey: undefined,
    })
    const fontFileKerningWidth = measureLoadedFontFileTextWidth({
      text: delta.text,
      descriptor,
      trackingScale: 0,
      kerningMode: "font",
      styleKey: undefined,
    })
    const fontFileTrackedKerningWidth = measureLoadedFontFileTextWidth({
      text: delta.text,
      descriptor,
      trackingScale: delta.trackingScale,
      kerningMode: "font",
      styleKey: undefined,
    })
    if (
      fontFileNoKerningWidth === null
      || fontFileKerningWidth === null
      || fontFileTrackedKerningWidth === null
    ) {
      return []
    }

    const browserNoKerningWidth = measureBrowserWidth(context, delta.canvasFont, delta.text, "none")
    const browserNormalKerningWidth = measureBrowserWidth(context, delta.canvasFont, delta.text, "normal")
    context.font = delta.canvasFont
    if ("fontKerning" in context) context.fontKerning = "normal"
    const browserTrackedKerningWidth = measureCanvasTextWidth(
      context,
      delta.text,
      delta.trackingScale,
      delta.fontSize,
      false,
    )
    return [{
      label: delta.label,
      text: delta.text,
      canvasFont: delta.canvasFont,
      fontFamily: descriptor.fontFamily,
      fontWeight: descriptor.fontWeight,
      italic: descriptor.italic,
      fontSize: descriptor.fontSize,
      trackingScale: delta.trackingScale,
      browserNoKerningWidth,
      browserNormalKerningWidth,
      browserTrackedKerningWidth,
      fontFileNoKerningWidth,
      fontFileKerningWidth,
      fontFileTrackedKerningWidth,
      noKerningDelta: fontFileNoKerningWidth - browserNoKerningWidth,
      fontKerningDelta: fontFileKerningWidth - browserNormalKerningWidth,
      trackedKerningDelta: fontFileTrackedKerningWidth - browserTrackedKerningWidth,
      browserKerningEffect: browserNormalKerningWidth - browserNoKerningWidth,
      fontFileKerningEffect: fontFileKerningWidth - fontFileNoKerningWidth,
    }]
  })
}

function getExportPlanByKey(plans: readonly PageExportTextPlan[]): Map<string, PageExportTextPlan> {
  const byKey = new Map<string, PageExportTextPlan>()
  for (const plan of plans) {
    byKey.set(plan.key, plan)
  }
  return byKey
}

function maxAbs(values: readonly number[]): number {
  return Math.max(0, ...values.map((value) => Math.abs(value)))
}

function nearlyEqual(left: number | undefined, right: number | undefined, epsilon = 0.01): boolean {
  return typeof left === "number"
    && typeof right === "number"
    && Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) <= epsilon
}

function canvasFontRequestsBoldWeight(canvasFont: string): boolean {
  return /\b(?:[6-9]00|1000|bold)\b/i.test(canvasFont)
}

function normalizedFontKeepsBoldWeight(normalizedCanvasFont: string): boolean {
  return /\b(?:[6-9]00|1000|bold)\b/i.test(normalizedCanvasFont)
}

function buildTextMetricsDiagnosis({
  maxAbsWidthDelta,
  averageAbsWidthDelta,
  averageAbsAdvanceDelta,
  averageAbsOpticalKerningDelta,
  wrappedTextChangedCount,
  wrappedLineCountChangedCount,
  browserDiagnostics,
}: {
  maxAbsWidthDelta: number
  averageAbsWidthDelta: number
  averageAbsAdvanceDelta: number
  averageAbsOpticalKerningDelta: number
  wrappedTextChangedCount: number
  wrappedLineCountChangedCount: number
  browserDiagnostics: BrowserTextMetricsDiagnostics
}): TextMetricsPresetParityDiagnosis {
  const support = browserDiagnostics.support
  const fontLoadingReady = browserDiagnostics.fontStatus.readyResolved
    && browserDiagnostics.fontStatus.status === "loaded"
    && browserDiagnostics.probes.every((probe) => probe.fontCheck !== false)
  const collapsedTextBoundsProbeCount = browserDiagnostics.probes.filter((probe) => (
    nearlyEqual(probe.metrics.actualBoundingBoxLeft, 0)
    && nearlyEqual(probe.metrics.actualBoundingBoxRight, probe.metrics.width)
  )).length
  const boldFontNormalizationStable = browserDiagnostics.probes.every((probe) => (
    !canvasFontRequestsBoldWeight(probe.canvasFont)
    || normalizedFontKeepsBoldWeight(probe.normalizedCanvasFont)
  ))
  const opticalKerningDominatesWidthDelta = averageAbsOpticalKerningDelta > Math.max(0.25, averageAbsAdvanceDelta * 2)
  const unstable = maxAbsWidthDelta > 6
    || averageAbsWidthDelta > 1.5
    || wrappedTextChangedCount > 0
    || wrappedLineCountChangedCount > 0

  const evidence = [
    fontLoadingReady
      ? "Font loading completed and all diagnostic font checks passed."
      : "Font loading was not fully ready during capture.",
    support.canvasLetterSpacing
      ? "Canvas letterSpacing is available."
      : "Canvas letterSpacing is unavailable; tracked browser drawing cannot use the native spacing path.",
    support.canvasFontKerning
      ? "Canvas fontKerning is available."
      : "Canvas fontKerning is unavailable; kerning mode cannot be explicitly controlled.",
    boldFontNormalizationStable
      ? "Bold canvas font normalization preserved explicit weight information."
      : "At least one bold diagnostic font normalized without explicit bold or numeric weight.",
    collapsedTextBoundsProbeCount > 0
      ? `${collapsedTextBoundsProbeCount} diagnostic TextMetrics probes collapsed horizontal bounds to advance width.`
      : "Diagnostic TextMetrics horizontal bounds retained distinct ink bounds.",
    opticalKerningDominatesWidthDelta
      ? "Width drift is dominated by optical-kerning delta rather than raw advance-width delta."
      : "Width drift is not dominated by optical kerning.",
  ]

  return {
    status: unstable ? "unstable" : "compatible",
    primaryCause: unstable && opticalKerningDominatesWidthDelta
      ? "browser-canvas optical metrics diverge from deterministic outline metrics"
      : unstable
        ? "browser-canvas text metrics exceed deterministic parity thresholds"
        : "browser-canvas metrics are inside deterministic parity thresholds",
    evidence,
    browserRisks: {
      fontLoadingReady,
      canvasFontKerningSupported: support.canvasFontKerning,
      canvasLetterSpacingSupported: support.canvasLetterSpacing,
      boldFontNormalizationStable,
      collapsedTextBoundsProbeCount,
      opticalKerningDominatesWidthDelta,
    },
  }
}

function measureBrowserCommandWidth(
  context: CanvasRenderingContext2D,
  plan: PageExportTextPlan,
  text: string,
): number {
  applyCanvasTextConfig(context, {
    font: buildCanvasFont(plan.fontFamily, plan.fontWeight, plan.italic, plan.fontSize),
    opticalKerning: plan.opticalKerning,
  })
  return measureCanvasTextWidth(
    context,
    text,
    plan.trackingScale,
    plan.fontSize,
    plan.opticalKerning,
  )
}

function measureFontFileCommandWidth(
  plan: PageExportTextPlan,
  text: string,
  range?: { start: number; end: number },
): number | null {
  const descriptor: FontFileCanvasFontDescriptor = {
    fontFamily: plan.fontFamily,
    fontWeight: plan.fontWeight,
    italic: plan.italic,
    fontSize: plan.fontSize,
  }

  if (range) {
    const request = {
      text,
      canvasFont: buildCanvasFont(plan.fontFamily, plan.fontWeight, plan.italic, plan.fontSize),
      trackingScale: plan.trackingScale,
      opticalKerning: plan.opticalKerning,
      sourceText: plan.sourceText,
      trackingRuns: plan.trackingRuns,
      range,
      baseFormat: {
        fontFamily: plan.fontFamily,
        fontWeight: plan.fontWeight,
        italic: plan.italic,
        styleKey: plan.styleKey,
        color: "",
      },
      resolveFontSize: () => plan.fontSize,
    }
    return measureFontFileFormattedRangeWidth(request)
      ?? measureFontFileTrackedRangeWidth(request, descriptor)
  }

  return measureLoadedFontFileTextWidth({
    text,
    descriptor,
    trackingScale: plan.trackingScale,
    kerningMode: plan.opticalKerning ? "optical" : "font",
    styleKey: plan.styleKey,
  })
}

function getCommandLeadingBoundaryWhitespace(command: PageExportTextPlan["commands"][number]): number {
  return Math.max(0, Math.min(command.text.length, command.leadingBoundaryWhitespace ?? 0))
}

function getCommandTrailingBoundaryWhitespace(command: PageExportTextPlan["commands"][number]): number {
  return Math.max(0, Math.min(command.text.length, command.trailingBoundaryWhitespace ?? 0))
}

function getCommandMeasuredText(command: PageExportTextPlan["commands"][number] | undefined): string {
  if (!command) return ""
  const trimStart = getCommandLeadingBoundaryWhitespace(command)
  const trimEnd = getCommandTrailingBoundaryWhitespace(command)
  return command.text.slice(trimStart, Math.max(trimStart, command.text.length - trimEnd))
}

function getCommandRange(command: PageExportTextPlan["commands"][number] | undefined): { start: number; end: number } | undefined {
  if (
    typeof command?.sourceStart !== "number"
    || typeof command.sourceEnd !== "number"
    || !Number.isFinite(command.sourceStart)
    || !Number.isFinite(command.sourceEnd)
  ) {
    return undefined
  }
  const trimStart = getCommandLeadingBoundaryWhitespace(command)
  const trimEnd = getCommandTrailingBoundaryWhitespace(command)
  return {
    start: command.sourceStart + trimStart,
    end: Math.max(command.sourceStart + trimStart, command.sourceEnd - trimEnd),
  }
}

function resolveBoundaryAcceptedBy({
  browserWouldAccept,
  outlineWouldAccept,
}: {
  browserWouldAccept: boolean | null
  outlineWouldAccept: boolean | null
}): TextMetricsWrapBoundaryProbe["acceptedBy"] {
  if (browserWouldAccept === null || outlineWouldAccept === null) return "unknown"
  if (browserWouldAccept && outlineWouldAccept) return "both"
  if (browserWouldAccept) return "browser-only"
  if (outlineWouldAccept) return "outline-only"
  return "neither"
}

function getBoundaryTippingText({
  sourceText,
  activeRange,
  candidateRange,
  candidateMeasuredText,
}: {
  sourceText: string
  activeRange?: { start: number; end: number }
  candidateRange?: { start: number; end: number }
  candidateMeasuredText: string
}): string {
  if (!candidateRange) return candidateMeasuredText
  if (!activeRange) return sourceText.slice(candidateRange.start, candidateRange.end)
  if (candidateRange.start === activeRange.start && candidateRange.end > activeRange.end) {
    return sourceText.slice(activeRange.end, candidateRange.end)
  }
  if (candidateRange.end === activeRange.end && candidateRange.start < activeRange.start) {
    return sourceText.slice(candidateRange.start, activeRange.start)
  }
  return sourceText.slice(candidateRange.start, candidateRange.end)
}

function buildWrapBoundaryProbe({
  sourceText,
  activeRange,
  candidateRange,
  candidateText,
  candidateMeasuredText,
  maxWidth,
  browserWidth,
  outlineWidth,
}: {
  sourceText: string
  activeRange?: { start: number; end: number }
  candidateRange?: { start: number; end: number }
  candidateText: string
  candidateMeasuredText: string
  maxWidth: number
  browserWidth: number | null
  outlineWidth: number | null
}): TextMetricsWrapBoundaryProbe {
  const browserWouldAccept = browserWidth === null ? null : browserWidth <= maxWidth
  const outlineWouldAccept = outlineWidth === null ? null : outlineWidth <= maxWidth
  return {
    candidateText,
    candidateMeasuredText,
    candidateSourceStart: candidateRange?.start ?? null,
    candidateSourceEnd: candidateRange?.end ?? null,
    tippingText: getBoundaryTippingText({
      sourceText,
      activeRange,
      candidateRange,
      candidateMeasuredText,
    }),
    maxWidth,
    browserWidth,
    outlineWidth,
    browserOverrun: browserWidth === null ? null : browserWidth - maxWidth,
    outlineOverrun: outlineWidth === null ? null : outlineWidth - maxWidth,
    browserWouldAccept,
    outlineWouldAccept,
    decisionChanged: browserWouldAccept !== null
      && outlineWouldAccept !== null
      && browserWouldAccept !== outlineWouldAccept,
    acceptedBy: resolveBoundaryAcceptedBy({ browserWouldAccept, outlineWouldAccept }),
  }
}

function findWrapTraceForRange(
  traces: readonly PageExportTextWrapTrace[],
  range: { start: number; end: number } | undefined,
): PageExportTextWrapTrace | null {
  if (!range) return null
  const exact = traces.find((trace) => trace.range.start === range.start && trace.range.end === range.end)
  if (exact) return exact
  return traces.find((trace) => (
    trace.range.start === range.start
    && Math.abs(trace.range.end - range.end) <= 1
  )) ?? null
}

function buildWrapBoundaryTrace({
  activeTrace,
  candidateTrace,
  sameCandidateBrowserTrace,
  sameCandidateOutlineTrace,
}: {
  activeTrace: PageExportTextWrapTrace | null
  candidateTrace: PageExportTextWrapTrace | null
  sameCandidateBrowserTrace: PageExportTextWrapTrace | null
  sameCandidateOutlineTrace: PageExportTextWrapTrace | null
}): TextMetricsWrapBoundaryTrace | null {
  if (!activeTrace && !candidateTrace && !sameCandidateBrowserTrace && !sameCandidateOutlineTrace) return null
  const sameCandidateBrowserAccepted = sameCandidateBrowserTrace?.accepted ?? null
  const sameCandidateOutlineAccepted = sameCandidateOutlineTrace?.accepted ?? null
  return {
    active: activeTrace,
    candidate: candidateTrace,
    decisionChanged: Boolean(activeTrace && candidateTrace && activeTrace.accepted !== candidateTrace.accepted),
    widthDelta: activeTrace && candidateTrace ? candidateTrace.width - activeTrace.width : null,
    browserOverrun: activeTrace ? activeTrace.width - activeTrace.maxWidth : null,
    outlineOverrun: candidateTrace ? candidateTrace.width - candidateTrace.maxWidth : null,
    sameCandidate: sameCandidateBrowserTrace || sameCandidateOutlineTrace
      ? {
          browser: sameCandidateBrowserTrace,
          outline: sameCandidateOutlineTrace,
          decisionChanged: sameCandidateBrowserAccepted !== null
            && sameCandidateOutlineAccepted !== null
            && sameCandidateBrowserAccepted !== sameCandidateOutlineAccepted,
          widthDelta: sameCandidateBrowserTrace && sameCandidateOutlineTrace
            ? sameCandidateOutlineTrace.width - sameCandidateBrowserTrace.width
            : null,
          browserOverrun: sameCandidateBrowserTrace
            ? sameCandidateBrowserTrace.width - sameCandidateBrowserTrace.maxWidth
            : null,
          outlineOverrun: sameCandidateOutlineTrace
            ? sameCandidateOutlineTrace.width - sameCandidateOutlineTrace.maxWidth
            : null,
          acceptedBy: resolveBoundaryAcceptedBy({
            browserWouldAccept: sameCandidateBrowserAccepted,
            outlineWouldAccept: sameCandidateOutlineAccepted,
          }),
        }
      : null,
  }
}

function buildEmptyWrapDecisionSummary(): TextMetricsWrapDecisionSummary {
  return {
    sampleCount: 0,
    decisionChangedCount: 0,
    outlineOnlyCount: 0,
    browserOnlyCount: 0,
    bothAcceptedCount: 0,
    neitherAcceptedCount: 0,
    unknownAcceptedCount: 0,
    maxAbsWidthDelta: 0,
    averageAbsWidthDelta: 0,
    largestDeltas: [],
    groups: [],
  }
}

function buildWrapBoundaryVetoes(
  plan: PageExportTextPlan,
  traces: readonly PageExportTextWrapTrace[],
): TextMetricsWrapBoundaryVeto[] {
  const vetoes: TextMetricsWrapBoundaryVeto[] = []

  for (const trace of traces) {
    if (trace.accepted) continue
    const uncorrectedWidth = measureFontFileCommandWidth(plan, trace.measuredText, trace.range)
    if (uncorrectedWidth === null) continue
    if (uncorrectedWidth > trace.maxWidth || trace.width <= trace.maxWidth) continue
    const correction = trace.width - uncorrectedWidth
    if (correction <= 0.0001) continue
    vetoes.push({
      lineIndex: trace.lineIndex,
      tokenText: trace.tokenText,
      candidateText: trace.candidateText,
      measuredText: trace.measuredText,
      candidateSourceStart: trace.range.start,
      candidateSourceEnd: trace.range.end,
      uncorrectedWidth,
      correctedWidth: trace.width,
      correction,
      maxWidth: trace.maxWidth,
      uncorrectedOverrun: uncorrectedWidth - trace.maxWidth,
      correctedOverrun: trace.width - trace.maxWidth,
    })
  }

  return vetoes
}

function buildWrapBoundaryVetoSummary(
  deltas: readonly TextMetricsExportPlanParityDelta[],
): TextMetricsWrapBoundaryVetoSummary {
  const samples = deltas.flatMap((delta) => delta.boundaryVetoes.map((veto) => ({
    ...veto,
    label: delta.label,
    key: delta.key,
    styleKey: delta.styleKey,
    fontFamily: delta.fontFamily,
    fontWeight: delta.fontWeight,
    italic: delta.italic,
    fontSize: delta.fontSize,
    trackingScale: delta.trackingScale,
    opticalKerning: delta.opticalKerning,
  })))

  if (!samples.length) {
    return {
      sampleCount: 0,
      maxCorrection: 0,
      averageCorrection: 0,
      largestVetoes: [],
    }
  }

  return {
    sampleCount: samples.length,
    maxCorrection: Math.max(0, ...samples.map((sample) => sample.correction)),
    averageCorrection: average(samples.map((sample) => sample.correction)),
    largestVetoes: samples
      .sort((a, b) => b.correction - a.correction)
      .slice(0, 12),
  }
}

function buildWrapDecisionSummary(
  deltas: readonly TextMetricsExportPlanParityDelta[],
): TextMetricsWrapDecisionSummary {
  const samples: TextMetricsWrapDecisionDeltaSummary[] = []

  for (const delta of deltas) {
    for (const command of delta.changedCommands) {
      const sameCandidate = command.wrapTrace?.sameCandidate
      const widthDelta = sameCandidate?.widthDelta
      if (!sameCandidate || typeof widthDelta !== "number" || !Number.isFinite(widthDelta)) continue
      samples.push({
        label: delta.label,
        key: delta.key,
        styleKey: delta.styleKey,
        commandIndex: command.index,
        fontFamily: delta.fontFamily,
        fontWeight: delta.fontWeight,
        italic: delta.italic,
        fontSize: delta.fontSize,
        leading: delta.leading,
        trackingScale: delta.trackingScale,
        opticalKerning: delta.opticalKerning,
        rectWidth: delta.rectWidth,
        candidateText: command.candidateText,
        candidateMeasuredText: command.candidateMeasuredText,
        candidateSourceStart: command.candidateSourceStart,
        candidateSourceEnd: command.candidateSourceEnd,
        widthDelta,
        absWidthDelta: Math.abs(widthDelta),
        browserOverrun: sameCandidate.browserOverrun,
        outlineOverrun: sameCandidate.outlineOverrun,
        acceptedBy: sameCandidate.acceptedBy,
        browserWidth: sameCandidate.browser?.width ?? null,
        outlineWidth: sameCandidate.outline?.width ?? null,
        maxWidth: sameCandidate.browser?.maxWidth ?? sameCandidate.outline?.maxWidth ?? null,
      })
    }
  }

  if (!samples.length) return buildEmptyWrapDecisionSummary()

  const groupsByKey = new Map<string, TextMetricsWrapDecisionDeltaSummary[]>()
  for (const sample of samples) {
    const groupKey = [
      sample.styleKey,
      sample.fontFamily,
      sample.fontWeight,
      sample.italic ? "italic" : "normal",
      sample.fontSize,
      sample.trackingScale,
      sample.opticalKerning ? "optical" : "font",
    ].join(":")
    groupsByKey.set(groupKey, [...(groupsByKey.get(groupKey) ?? []), sample])
  }

  const groups = [...groupsByKey.entries()].map(([groupKey, items]) => {
    const first = items[0] as TextMetricsWrapDecisionDeltaSummary
    const absWidthDeltas = items.map((item) => item.absWidthDelta)
    return {
      groupKey,
      styleKey: first.styleKey,
      fontFamily: first.fontFamily,
      fontWeight: first.fontWeight,
      italic: first.italic,
      fontSize: first.fontSize,
      trackingScale: first.trackingScale,
      opticalKerning: first.opticalKerning,
      sampleCount: items.length,
      decisionChangedCount: items.filter((item) => item.acceptedBy === "browser-only" || item.acceptedBy === "outline-only").length,
      outlineOnlyCount: items.filter((item) => item.acceptedBy === "outline-only").length,
      browserOnlyCount: items.filter((item) => item.acceptedBy === "browser-only").length,
      maxAbsWidthDelta: Math.max(0, ...absWidthDeltas),
      averageAbsWidthDelta: average(absWidthDeltas),
    }
  })

  return {
    sampleCount: samples.length,
    decisionChangedCount: samples.filter((sample) => sample.acceptedBy === "browser-only" || sample.acceptedBy === "outline-only").length,
    outlineOnlyCount: samples.filter((sample) => sample.acceptedBy === "outline-only").length,
    browserOnlyCount: samples.filter((sample) => sample.acceptedBy === "browser-only").length,
    bothAcceptedCount: samples.filter((sample) => sample.acceptedBy === "both").length,
    neitherAcceptedCount: samples.filter((sample) => sample.acceptedBy === "neither").length,
    unknownAcceptedCount: samples.filter((sample) => sample.acceptedBy === "unknown").length,
    maxAbsWidthDelta: Math.max(0, ...samples.map((sample) => sample.absWidthDelta)),
    averageAbsWidthDelta: average(samples.map((sample) => sample.absWidthDelta)),
    largestDeltas: [...samples]
      .sort((a, b) => b.absWidthDelta - a.absWidthDelta)
      .slice(0, 20),
    groups: groups
      .sort((a, b) => (
        b.decisionChangedCount - a.decisionChangedCount
        || b.maxAbsWidthDelta - a.maxAbsWidthDelta
        || b.sampleCount - a.sampleCount
      ))
      .slice(0, 20),
  }
}

function buildEmptyOpticalPairSummary(): TextMetricsOpticalPairSummary {
  return {
    commandCount: 0,
    pairCount: 0,
    totalContributionDelta: 0,
    averageContributionDelta: 0,
    maxAbsContributionDelta: 0,
    largestPairs: [],
    largestAggregates: [],
    largestClassAggregates: [],
  }
}

function classifyOpticalPairChar(char: string): TextMetricsOpticalPairClass {
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

function getOpticalPairAggregateStats(items: readonly TextMetricsOpticalPairDelta[]): {
  occurrenceCount: number
  totalContributionDelta: number
  averageContributionDelta: number
  maxAbsContributionDelta: number
  sameDirectionCount: number
} {
  const totalContributionDelta = items.reduce((sum, item) => sum + item.contributionDelta, 0)
  const positiveCount = items.filter((item) => item.contributionDelta > 0).length
  const negativeCount = items.filter((item) => item.contributionDelta < 0).length
  return {
    occurrenceCount: items.length,
    totalContributionDelta,
    averageContributionDelta: items.length ? totalContributionDelta / items.length : 0,
    maxAbsContributionDelta: Math.max(0, ...items.map((item) => Math.abs(item.contributionDelta))),
    sameDirectionCount: Math.max(positiveCount, negativeCount),
  }
}

function buildOpticalPairSummary(
  deltas: readonly TextMetricsExportPlanParityDelta[],
): TextMetricsOpticalPairSummary {
  const diagnostics = deltas.flatMap((delta) => (
    delta.changedCommands
      .map((command) => command.opticalPairDiagnostics)
      .filter((diagnostic): diagnostic is TextMetricsOpticalPairDiagnostics => Boolean(diagnostic))
  ))
  const pairs = diagnostics.flatMap((diagnostic) => diagnostic.pairs)
  if (!pairs.length) return buildEmptyOpticalPairSummary()

  const grouped = new Map<string, TextMetricsOpticalPairDelta[]>()
  const classGrouped = new Map<string, TextMetricsOpticalPairDelta[]>()
  for (const pair of pairs) {
    const pairKey = [
      pair.left,
      pair.right,
      pair.styleKey,
      pair.fontFamily,
      pair.fontWeight,
      pair.italic ? "italic" : "normal",
      pair.fontSize,
      pair.trackingScale,
    ].join(":")
    grouped.set(pairKey, [...(grouped.get(pairKey) ?? []), pair])

    const classKey = [
      classifyOpticalPairChar(pair.left),
      classifyOpticalPairChar(pair.right),
      pair.styleKey,
      pair.fontFamily,
      pair.fontWeight,
      pair.italic ? "italic" : "normal",
      pair.fontSize,
      pair.trackingScale,
    ].join(":")
    classGrouped.set(classKey, [...(classGrouped.get(classKey) ?? []), pair])
  }

  const largestAggregates: TextMetricsOpticalPairAggregate[] = [...grouped.entries()].map(([pairKey, items]) => {
    const first = items[0] as TextMetricsOpticalPairDelta
    return {
      pairKey,
      left: first.left,
      right: first.right,
      fontFamily: first.fontFamily,
      fontWeight: first.fontWeight,
      italic: first.italic,
      fontSize: first.fontSize,
      styleKey: first.styleKey,
      trackingScale: first.trackingScale,
      ...getOpticalPairAggregateStats(items),
    }
  })
  const largestClassAggregates: TextMetricsOpticalPairClassAggregate[] = [...classGrouped.entries()].map(([classKey, items]) => {
    const first = items[0] as TextMetricsOpticalPairDelta
    return {
      classKey,
      leftClass: classifyOpticalPairChar(first.left),
      rightClass: classifyOpticalPairChar(first.right),
      fontFamily: first.fontFamily,
      fontWeight: first.fontWeight,
      italic: first.italic,
      fontSize: first.fontSize,
      styleKey: first.styleKey,
      trackingScale: first.trackingScale,
      ...getOpticalPairAggregateStats(items),
    }
  })

  const totalContributionDelta = pairs.reduce((sum, pair) => sum + pair.contributionDelta, 0)
  return {
    commandCount: diagnostics.length,
    pairCount: pairs.length,
    totalContributionDelta,
    averageContributionDelta: totalContributionDelta / pairs.length,
    maxAbsContributionDelta: Math.max(0, ...pairs.map((pair) => Math.abs(pair.contributionDelta))),
    largestPairs: [...pairs]
      .sort((a, b) => Math.abs(b.contributionDelta) - Math.abs(a.contributionDelta))
      .slice(0, 20),
    largestAggregates: largestAggregates
      .sort((a, b) => (
        Math.abs(b.totalContributionDelta) - Math.abs(a.totalContributionDelta)
        || b.occurrenceCount - a.occurrenceCount
        || b.maxAbsContributionDelta - a.maxAbsContributionDelta
      ))
      .slice(0, 20),
    largestClassAggregates: largestClassAggregates
      .sort((a, b) => (
        Math.abs(b.totalContributionDelta) - Math.abs(a.totalContributionDelta)
        || b.occurrenceCount - a.occurrenceCount
        || b.maxAbsContributionDelta - a.maxAbsContributionDelta
      ))
      .slice(0, 20),
  }
}

function measureBrowserGraphemeWidth(
  context: CanvasRenderingContext2D,
  grapheme: PageExportTextPlan["graphemeLines"][number][number],
): number {
  context.font = buildCanvasFont(
    grapheme.fontFamily,
    grapheme.fontWeight,
    grapheme.italic,
    grapheme.fontSize,
  )
  return context.measureText(grapheme.text).width
}

function measureOutlineGraphemeWidth(
  grapheme: PageExportTextPlan["graphemeLines"][number][number],
): number | null {
  return measureLoadedFontFileTextWidth({
    text: grapheme.text,
    descriptor: {
      fontFamily: grapheme.fontFamily,
      fontWeight: grapheme.fontWeight,
      italic: grapheme.italic,
      fontSize: grapheme.fontSize,
    },
    trackingScale: 0,
    kerningMode: "none",
    styleKey: grapheme.styleKey,
  })
}

function buildOpticalPairDiagnostics({
  context,
  plan,
  commandIndex,
  browserWidth,
  outlineWidth,
}: {
  context: CanvasRenderingContext2D
  plan: PageExportTextPlan
  commandIndex: number
  browserWidth: number | null
  outlineWidth: number | null
}): TextMetricsOpticalPairDiagnostics | null {
  if (!plan.opticalKerning || browserWidth === null || outlineWidth === null) return null
  const graphemes = plan.graphemeLines[commandIndex] ?? []
  if (graphemes.length <= 1) return null

  const pairDeltas: TextMetricsOpticalPairDelta[] = []
  for (let index = 1; index < graphemes.length; index += 1) {
    const previous = graphemes[index - 1]
    const current = graphemes[index]
    if (!previous || !current) continue
    const sameFontMetrics = previous.fontFamily === current.fontFamily
      && previous.fontWeight === current.fontWeight
      && previous.italic === current.italic
      && previous.fontSize === current.fontSize

    const browserPairAdvance = sameFontMetrics
      ? measureTextPairAdvance(
          context,
          previous.text,
          current.text,
          previous.fontSize,
          true,
        )
      : measureBrowserGraphemeWidth(context, previous)
    const outlinePairAdvance = sameFontMetrics
      ? measureLoadedFontFilePairAdvance({
          previous: previous.text,
          current: current.text,
          descriptor: {
            fontFamily: previous.fontFamily,
            fontWeight: previous.fontWeight,
            italic: previous.italic,
            fontSize: previous.fontSize,
          },
          kerningMode: "optical",
          styleKey: previous.styleKey,
        })
      : measureOutlineGraphemeWidth(previous)
    if (outlinePairAdvance === null) continue

    const tracking = getTrackingLetterSpacing(previous.fontSize, previous.trackingScale)
    const browserContribution = browserPairAdvance + tracking
    const outlineContribution = outlinePairAdvance + tracking
    pairDeltas.push({
      index: index - 1,
      left: previous.text,
      right: current.text,
      fontFamily: previous.fontFamily,
      fontWeight: previous.fontWeight,
      italic: previous.italic,
      fontSize: previous.fontSize,
      styleKey: previous.styleKey,
      trackingScale: previous.trackingScale,
      browserPairAdvance,
      outlinePairAdvance,
      pairAdvanceDelta: outlinePairAdvance - browserPairAdvance,
      tracking,
      browserContribution,
      outlineContribution,
      contributionDelta: outlineContribution - browserContribution,
    })
  }

  const last = graphemes[graphemes.length - 1]
  if (!last) return null
  const browserTerminalWidth = measureBrowserGraphemeWidth(context, last)
  const outlineTerminalWidth = measureOutlineGraphemeWidth(last)
  if (outlineTerminalWidth === null) return null

  return {
    text: graphemes.map((grapheme) => grapheme.text).join(""),
    pairCount: pairDeltas.length,
    browserWidth,
    outlineWidth,
    widthDelta: outlineWidth - browserWidth,
    pairDeltaTotal: pairDeltas.reduce((sum, pair) => sum + pair.contributionDelta, 0),
    terminalGlyphDelta: outlineTerminalWidth - browserTerminalWidth,
    pairs: pairDeltas,
    largestPairs: [...pairDeltas]
      .sort((a, b) => Math.abs(b.contributionDelta) - Math.abs(a.contributionDelta))
      .slice(0, 12),
  }
}

function compareExportTextPlans({
  label,
  active,
  candidate,
  measurementContext,
  activeTraces,
  candidateTraces,
}: {
  label: string
  active: PageExportTextPlan
  candidate: PageExportTextPlan
  measurementContext: CanvasRenderingContext2D
  activeTraces: readonly PageExportTextWrapTrace[]
  candidateTraces: readonly PageExportTextWrapTrace[]
}): TextMetricsExportPlanParityDelta {
  const commandCount = Math.max(active.commands.length, candidate.commands.length)
  let changedCommandTextCount = 0
  const commandXDeltas: number[] = []
  const commandYDeltas: number[] = []
  const activeTexts: string[] = []
  const candidateTexts: string[] = []
  const changedCommands: TextMetricsExportPlanCommandDelta[] = []

  for (let index = 0; index < commandCount; index += 1) {
    const activeCommand = active.commands[index]
    const candidateCommand = candidate.commands[index]
    const activeText = activeCommand?.text ?? ""
    const candidateText = candidateCommand?.text ?? ""
    const xDelta = (candidateCommand?.x ?? 0) - (activeCommand?.x ?? 0)
    const yDelta = (candidateCommand?.y ?? 0) - (activeCommand?.y ?? 0)
    const textChanged = activeText !== candidateText
    activeTexts.push(activeText)
    candidateTexts.push(candidateText)
    if (textChanged) changedCommandTextCount += 1
    commandXDeltas.push(xDelta)
    commandYDeltas.push(yDelta)
    if (textChanged || Math.abs(xDelta) > 0.0001 || Math.abs(yDelta) > 0.0001) {
      const activeMeasuredText = getCommandMeasuredText(activeCommand)
      const candidateMeasuredText = getCommandMeasuredText(candidateCommand)
      const activeRange = getCommandRange(activeCommand)
      const candidateRange = getCommandRange(candidateCommand)
      const activeWidth = activeCommand
        ? measureBrowserCommandWidth(measurementContext, active, activeMeasuredText)
        : null
      const activeFontFileWidth = activeCommand
        ? measureFontFileCommandWidth(active, activeMeasuredText, activeRange)
        : null
      const candidateWidth = candidateCommand
        ? measureFontFileCommandWidth(candidate, candidateMeasuredText, candidateRange)
        : null
      const candidateBrowserWidth = candidateCommand
        ? measureBrowserCommandWidth(measurementContext, candidate, candidateMeasuredText)
        : null
      const activeTrace = findWrapTraceForRange(activeTraces, activeRange)
      const candidateTrace = findWrapTraceForRange(candidateTraces, candidateRange)
      const activeCandidateTrace = findWrapTraceForRange(activeTraces, candidateRange)
      const boundaryProbe = candidateCommand
        ? buildWrapBoundaryProbe({
            sourceText: candidate.sourceText,
            activeRange,
            candidateRange,
            candidateText,
            candidateMeasuredText,
            maxWidth: active.rect.width,
            browserWidth: candidateBrowserWidth,
            outlineWidth: candidateWidth,
          })
        : null
      const wrapTrace = buildWrapBoundaryTrace({
        activeTrace,
        candidateTrace,
        sameCandidateBrowserTrace: activeCandidateTrace,
        sameCandidateOutlineTrace: candidateTrace,
      })
      changedCommands.push({
        index,
        textChanged,
        activeText,
        candidateText,
        activeMeasuredText,
        candidateMeasuredText,
        activeX: activeCommand?.x ?? null,
        candidateX: candidateCommand?.x ?? null,
        xDelta,
        activeY: activeCommand?.y ?? null,
        candidateY: candidateCommand?.y ?? null,
        yDelta,
        activeWidth,
        activeFontFileWidth,
        activeFontFileDelta: activeWidth !== null && activeFontFileWidth !== null
          ? activeFontFileWidth - activeWidth
          : null,
        activeOverrun: activeWidth !== null ? activeWidth - active.rect.width : null,
        candidateWidth,
        candidateBrowserWidth,
        candidateBrowserDelta: candidateWidth !== null && candidateBrowserWidth !== null
          ? candidateWidth - candidateBrowserWidth
          : null,
        widthDelta: activeWidth !== null && candidateWidth !== null ? candidateWidth - activeWidth : null,
        candidateOverrun: candidateWidth !== null ? candidateWidth - active.rect.width : null,
        candidateBrowserOverrun: candidateBrowserWidth !== null ? candidateBrowserWidth - active.rect.width : null,
        activeSourceStart: activeCommand?.sourceStart ?? null,
        activeSourceEnd: activeCommand?.sourceEnd ?? null,
        candidateSourceStart: candidateCommand?.sourceStart ?? null,
        candidateSourceEnd: candidateCommand?.sourceEnd ?? null,
        boundaryProbe,
        wrapTrace,
        opticalPairDiagnostics: wrapTrace?.sameCandidate?.decisionChanged === true
          ? buildOpticalPairDiagnostics({
              context: measurementContext,
              plan: candidate,
              commandIndex: index,
              browserWidth: wrapTrace.sameCandidate.browser?.width ?? candidateBrowserWidth,
              outlineWidth: wrapTrace.sameCandidate.outline?.width ?? candidateWidth,
            })
          : null,
      })
    }
  }

  return {
    label,
    key: active.key,
    styleKey: active.styleKey,
    fontFamily: active.fontFamily,
    fontWeight: active.fontWeight,
    italic: active.italic,
    fontSize: active.fontSize,
    leading: active.leading,
    trackingScale: active.trackingScale,
    opticalKerning: active.opticalKerning,
    columnReflow: active.columnReflow,
    rectWidth: active.rect.width,
    activeCommandCount: active.commands.length,
    candidateCommandCount: candidate.commands.length,
    commandCountDelta: candidate.commands.length - active.commands.length,
    changedCommandTextCount,
    maxAbsCommandXDelta: maxAbs(commandXDeltas),
    maxAbsCommandYDelta: maxAbs(commandYDeltas),
    maxAbsRectXDelta: Math.abs(candidate.rect.x - active.rect.x),
    maxAbsRectYDelta: Math.abs(candidate.rect.y - active.rect.y),
    maxAbsRectWidthDelta: Math.abs(candidate.rect.width - active.rect.width),
    maxAbsRectHeightDelta: Math.abs(candidate.rect.height - active.rect.height),
    activeTexts,
    candidateTexts,
    changedCommands: changedCommands.slice(0, 12),
    boundaryVetoes: buildWrapBoundaryVetoes(candidate, candidateTraces),
  }
}

function buildExportPlanParityReport({
  exportPageLimit,
  measurementContext,
  candidateFactory,
}: {
  exportPageLimit: number
  measurementContext: CanvasRenderingContext2D
  candidateFactory?: TextMetricsEngineFactory<TypographyStyleKey, FontFamily>
}): TextMetricsExportPlanParityReport {
  const deltas: TextMetricsExportPlanParityDelta[] = []
  let pageCount = 0
  let textPlanCount = 0

  for (const preset of LAYOUT_PRESETS) {
    for (const samplePage of collectTextMetricsPresetPages(preset, true)) {
      if (pageCount >= exportPageLimit) break
      pageCount += 1
      const page = samplePage.page
      const commonArgs = {
        result: page.result,
        layout: page.previewLayout as ExportPreviewLayoutState | null,
        baseFont: page.baseFont,
        imageColorScheme: page.imageColorScheme,
        canvasBackground: page.resolvedCanvasBackground,
        rotation: typeof page.uiSettings.rotation === "number" ? page.uiSettings.rotation : 0,
        showBaselines: page.uiSettings.showBaselines !== false,
        showModules: page.uiSettings.showModules !== false,
        showMargins: page.uiSettings.showMargins === true,
        showImagePlaceholders: page.uiSettings.showImagePlaceholders !== false,
        showTypography: page.uiSettings.showTypography !== false,
        layoutEngine: page.layoutEngine,
      }
      const activeWrapTraces: PageExportTextWrapTrace[] = []
      const candidateWrapTraces: PageExportTextWrapTrace[] = []
      const activePlan = buildPageExportPlan({
        ...commonArgs,
        textWrapTraceCollector: (trace) => {
          activeWrapTraces.push(trace)
        },
      })
      const candidatePlan = buildPageExportPlan({
        ...commonArgs,
        textMetricsEngineFactory: candidateFactory,
        textWrapTraceCollector: (trace) => {
          candidateWrapTraces.push(trace)
        },
      })
      const candidateByKey = getExportPlanByKey(candidatePlan.textPlans)
      for (const activeTextPlan of activePlan.textPlans) {
        textPlanCount += 1
        const candidateTextPlan = candidateByKey.get(activeTextPlan.key)
        const activeTraces = activeWrapTraces.filter((trace) => trace.key === activeTextPlan.key)
        if (!candidateTextPlan) {
          deltas.push({
            label: `${samplePage.label} / ${activeTextPlan.key}`,
            key: activeTextPlan.key,
            styleKey: activeTextPlan.styleKey,
            fontFamily: activeTextPlan.fontFamily,
            fontWeight: activeTextPlan.fontWeight,
            italic: activeTextPlan.italic,
            fontSize: activeTextPlan.fontSize,
            leading: activeTextPlan.leading,
            trackingScale: activeTextPlan.trackingScale,
            opticalKerning: activeTextPlan.opticalKerning,
            columnReflow: activeTextPlan.columnReflow,
            rectWidth: activeTextPlan.rect.width,
            activeCommandCount: activeTextPlan.commands.length,
            candidateCommandCount: 0,
            commandCountDelta: -activeTextPlan.commands.length,
            changedCommandTextCount: activeTextPlan.commands.length,
            maxAbsCommandXDelta: 0,
            maxAbsCommandYDelta: 0,
            maxAbsRectXDelta: 0,
            maxAbsRectYDelta: 0,
            maxAbsRectWidthDelta: 0,
            maxAbsRectHeightDelta: 0,
            activeTexts: activeTextPlan.commands.map((command) => command.text),
            candidateTexts: [],
            changedCommands: activeTextPlan.commands.slice(0, 12).map((command, index) => ({
              index,
              textChanged: true,
              activeText: command.text,
              candidateText: "",
              activeMeasuredText: getCommandMeasuredText(command),
              candidateMeasuredText: "",
              activeX: command.x,
              candidateX: null,
              xDelta: -command.x,
              activeY: command.y,
              candidateY: null,
              yDelta: -command.y,
              activeWidth: measureBrowserCommandWidth(measurementContext, activeTextPlan, getCommandMeasuredText(command)),
              activeFontFileWidth: measureFontFileCommandWidth(
                activeTextPlan,
                getCommandMeasuredText(command),
                getCommandRange(command),
              ),
              activeFontFileDelta: null,
              activeOverrun: null,
              candidateWidth: null,
              candidateBrowserWidth: null,
              candidateBrowserDelta: null,
              widthDelta: null,
              candidateOverrun: null,
              candidateBrowserOverrun: null,
              activeSourceStart: command.sourceStart ?? null,
              activeSourceEnd: command.sourceEnd ?? null,
              candidateSourceStart: null,
              candidateSourceEnd: null,
              boundaryProbe: null,
              wrapTrace: null,
              opticalPairDiagnostics: null,
            })),
            boundaryVetoes: [],
          })
          continue
        }
        deltas.push(compareExportTextPlans({
          label: `${samplePage.label} / ${activeTextPlan.key}`,
          active: activeTextPlan,
          candidate: candidateTextPlan,
          measurementContext,
          activeTraces,
          candidateTraces: candidateWrapTraces.filter((trace) => trace.key === candidateTextPlan.key),
        }))
      }
    }
    if (pageCount >= exportPageLimit) break
  }

  const changedPlanDeltas = deltas.filter((delta) => (
    delta.commandCountDelta !== 0
    || delta.changedCommandTextCount > 0
    || delta.maxAbsCommandXDelta > 0.0001
    || delta.maxAbsCommandYDelta > 0.0001
    || delta.maxAbsRectXDelta > 0.0001
    || delta.maxAbsRectYDelta > 0.0001
    || delta.maxAbsRectWidthDelta > 0.0001
    || delta.maxAbsRectHeightDelta > 0.0001
  ))

  return {
    pageCount,
    textPlanCount,
    changedPlanCount: changedPlanDeltas.length,
    changedCommandCount: deltas.reduce((sum, delta) => sum + Math.abs(delta.commandCountDelta), 0),
    changedCommandTextCount: deltas.reduce((sum, delta) => sum + delta.changedCommandTextCount, 0),
    maxAbsCommandXDelta: Math.max(0, ...deltas.map((delta) => delta.maxAbsCommandXDelta)),
    maxAbsCommandYDelta: Math.max(0, ...deltas.map((delta) => delta.maxAbsCommandYDelta)),
    maxAbsRectXDelta: Math.max(0, ...deltas.map((delta) => delta.maxAbsRectXDelta)),
    maxAbsRectYDelta: Math.max(0, ...deltas.map((delta) => delta.maxAbsRectYDelta)),
    maxAbsRectWidthDelta: Math.max(0, ...deltas.map((delta) => delta.maxAbsRectWidthDelta)),
    maxAbsRectHeightDelta: Math.max(0, ...deltas.map((delta) => delta.maxAbsRectHeightDelta)),
    largestDeltas: [...changedPlanDeltas]
      .sort((a, b) => (
        Math.max(
          b.maxAbsCommandXDelta,
          b.maxAbsCommandYDelta,
          b.maxAbsRectXDelta,
          b.maxAbsRectYDelta,
          b.maxAbsRectWidthDelta,
          b.maxAbsRectHeightDelta,
          Math.abs(b.commandCountDelta),
          b.changedCommandTextCount,
        )
        - Math.max(
          a.maxAbsCommandXDelta,
          a.maxAbsCommandYDelta,
          a.maxAbsRectXDelta,
          a.maxAbsRectYDelta,
          a.maxAbsRectWidthDelta,
          a.maxAbsRectHeightDelta,
          Math.abs(a.commandCountDelta),
          a.changedCommandTextCount,
        )
      ))
      .slice(0, 20),
    wrapDecisionSummary: buildWrapDecisionSummary(deltas),
    boundaryVetoSummary: buildWrapBoundaryVetoSummary(deltas),
    opticalPairSummary: buildOpticalPairSummary(deltas),
  }
}

function roundSignatureNumber(value: number): number {
  return Number(value.toFixed(3))
}

function hashSignaturePayload(payload: string): string {
  let hash = 2166136261
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

function buildExportPlanSignaturePayload(plan: PageExportPlan): string {
  return JSON.stringify({
    page: [
      roundSignatureNumber(plan.pageWidth),
      roundSignatureNumber(plan.pageHeight),
      roundSignatureNumber(plan.rotation),
    ],
    layers: plan.orderedLayerKeys,
    imagePlans: plan.imagePlans.map((imagePlan) => ({
      key: imagePlan.key,
      rect: [
        roundSignatureNumber(imagePlan.x),
        roundSignatureNumber(imagePlan.y),
        roundSignatureNumber(imagePlan.width),
        roundSignatureNumber(imagePlan.height),
      ],
      rotation: roundSignatureNumber(imagePlan.rotation),
    })),
    textPlans: plan.textPlans.map((textPlan) => ({
      key: textPlan.key,
      styleKey: textPlan.styleKey,
      fontFamily: textPlan.fontFamily,
      fontWeight: textPlan.fontWeight,
      italic: textPlan.italic,
      fontSize: roundSignatureNumber(textPlan.fontSize),
      leading: roundSignatureNumber(textPlan.leading),
      rect: [
        roundSignatureNumber(textPlan.rect.x),
        roundSignatureNumber(textPlan.rect.y),
        roundSignatureNumber(textPlan.rect.width),
        roundSignatureNumber(textPlan.rect.height),
      ],
      commands: textPlan.commands.map((command) => ({
        text: command.text,
        x: roundSignatureNumber(command.x),
        y: roundSignatureNumber(command.y),
        sourceStart: command.sourceStart ?? null,
        sourceEnd: command.sourceEnd ?? null,
      })),
    })),
  })
}

const REQUIRED_PRODUCTION_EXPORT_PLAN_SIGNATURE_LABELS = new Set([
  "Classic Book Cover Lookalike / Blank Start Page",
])

function buildProductionExportPlanSignatures(
  exportPageLimit: number,
  textMetricsEngineFactory?: TextMetricsEngineFactory<TypographyStyleKey, FontFamily>,
): TextMetricsProductionExportPlanSignature[] {
  const signatures: TextMetricsProductionExportPlanSignature[] = []
  const signatureLabels = new Set<string>()
  const signaturePageLimit = Math.max(0, exportPageLimit)

  const addSignature = (samplePage: ReturnType<typeof collectTextMetricsPresetPages>[number]) => {
    if (signatureLabels.has(samplePage.label)) return
    const page = samplePage.page
    const plan = buildPageExportPlan({
      result: page.result,
      layout: page.previewLayout as ExportPreviewLayoutState | null,
      baseFont: page.baseFont,
      imageColorScheme: page.imageColorScheme,
      canvasBackground: page.resolvedCanvasBackground,
      rotation: typeof page.uiSettings.rotation === "number" ? page.uiSettings.rotation : 0,
      showBaselines: page.uiSettings.showBaselines !== false,
      showModules: page.uiSettings.showModules !== false,
      showMargins: page.uiSettings.showMargins === true,
      showImagePlaceholders: page.uiSettings.showImagePlaceholders !== false,
      showTypography: page.uiSettings.showTypography !== false,
      layoutEngine: page.layoutEngine,
      textMetricsEngineFactory,
    })
    if (plan.textPlans.length === 0) return
    signatures.push({
      label: samplePage.label,
      signature: hashSignaturePayload(buildExportPlanSignaturePayload(plan)),
      pageWidth: roundSignatureNumber(plan.pageWidth),
      pageHeight: roundSignatureNumber(plan.pageHeight),
      rotation: roundSignatureNumber(plan.rotation),
      textPlanCount: plan.textPlans.length,
      imagePlanCount: plan.imagePlans.length,
      orderedLayerCount: plan.orderedLayerKeys.length,
    })
    signatureLabels.add(samplePage.label)
  }

  for (const preset of LAYOUT_PRESETS) {
    for (const samplePage of collectTextMetricsPresetPages(preset, true)) {
      if (signatures.length >= signaturePageLimit) break
      addSignature(samplePage)
    }
    if (signatures.length >= signaturePageLimit) break
  }

  for (const preset of LAYOUT_PRESETS) {
    for (const samplePage of collectTextMetricsPresetPages(preset, true)) {
      if (!REQUIRED_PRODUCTION_EXPORT_PLAN_SIGNATURE_LABELS.has(samplePage.label)) continue
      addSignature(samplePage)
    }
  }

  return signatures
}

export async function runPresetTextMetricsParityReport({
  sampleLimit = 240,
  maxTextLength = 180,
  exportPageLimit = 80,
}: TextMetricsPresetParityReportOptions = {}): Promise<TextMetricsPresetParityReport> {
  if (typeof document === "undefined") {
    throw new Error("Text metrics parity report must run in a browser.")
  }

  const samples = collectTextMetricsPresetSamples({ sampleLimit, maxTextLength })
  const canvasFonts = samples.map((sample) => sample.canvasFont)
  await preloadBrowserFontSpecs(collectBrowserFontSpecs(canvasFonts))
  await preloadFontFileMetricFaces(collectFontFileMetricFacesFromCanvasFonts(canvasFonts))

  const context = createMeasurementContext()
  const deltas = compareTextMetricsEngines<TypographyStyleKey, FontFamily>({
    context,
    samples,
    candidateFactory: createDeterministicFontFileTextMetricsEngine,
  })
  const advanceDeltas = compareTextMetricsEngines<TypographyStyleKey, FontFamily>({
    context,
    samples: samples.map((sample) => ({
      ...sample,
      opticalKerning: false,
    })),
    candidateFactory: createDeterministicFontFileTextMetricsEngine,
  })
  const advanceDeltaByLabel = new Map(advanceDeltas.map((delta) => [delta.label, delta]))
  const diagnosticDeltas: TextMetricsPresetParityDelta[] = deltas.map((delta, index) => {
    const sample = samples[index]
    const descriptor = sample ? parseFontFileCanvasFontDescriptor(sample.canvasFont) : null
    const advanceDelta = advanceDeltaByLabel.get(delta.label)
    const widthDeltaNoOpticalKerning = advanceDelta?.widthDelta ?? delta.widthDelta
    return {
      ...delta,
      text: sample?.text ?? "",
      canvasFont: sample?.canvasFont ?? "",
      fontFamily: descriptor?.fontFamily ?? null,
      fontWeight: descriptor?.fontWeight ?? null,
      italic: descriptor?.italic ?? null,
      fontSize: descriptor?.fontSize ?? sample?.fontSize ?? 0,
      maxWidth: sample?.maxWidth ?? 0,
      trackingScale: sample?.trackingScale ?? 0,
      opticalKerning: sample?.opticalKerning ?? false,
      activeWidthNoOpticalKerning: advanceDelta?.activeWidth ?? delta.activeWidth,
      candidateWidthNoOpticalKerning: advanceDelta?.candidateWidth ?? delta.candidateWidth,
      widthDeltaNoOpticalKerning,
      opticalKerningDelta: delta.widthDelta - widthDeltaNoOpticalKerning,
    }
  })

  const largestWidthDeltas = [...diagnosticDeltas]
    .sort((a, b) => Math.abs(b.widthDelta) - Math.abs(a.widthDelta))
    .slice(0, 20)
  const largestAdvanceDeltas = [...diagnosticDeltas]
    .sort((a, b) => Math.abs(b.widthDeltaNoOpticalKerning) - Math.abs(a.widthDeltaNoOpticalKerning))
    .slice(0, 20)
  const largestOpticalKerningDeltas = [...diagnosticDeltas]
    .sort((a, b) => Math.abs(b.opticalKerningDelta) - Math.abs(a.opticalKerningDelta))
    .slice(0, 20)
  const absWidthDeltas = diagnosticDeltas.map((delta) => Math.abs(delta.widthDelta))
  const absAdvanceDeltas = diagnosticDeltas.map((delta) => Math.abs(delta.widthDeltaNoOpticalKerning))
  const absOpticalDeltas = diagnosticDeltas.map((delta) => Math.abs(delta.opticalKerningDelta))
  const fontSummaries = buildFontSummaries(diagnosticDeltas)
  const largestFontProbeDeltas = buildFontProbeDeltas(context, diagnosticDeltas)
    .sort((a, b) => Math.abs(b.trackedKerningDelta) - Math.abs(a.trackedKerningDelta))
    .slice(0, 20)
  const maxAbsWidthDelta = Math.max(0, ...absWidthDeltas)
  const averageAbsWidthDelta = average(absWidthDeltas)
  const maxAbsAdvanceDelta = Math.max(0, ...absAdvanceDeltas)
  const averageAbsAdvanceDelta = average(absAdvanceDeltas)
  const maxAbsOpticalKerningDelta = Math.max(0, ...absOpticalDeltas)
  const averageAbsOpticalKerningDelta = average(absOpticalDeltas)
  const exportPlan = buildExportPlanParityReport({ exportPageLimit, measurementContext: context })
  const rangeCalibration = buildExportPlanParityReport({
    exportPageLimit,
    measurementContext: context,
    candidateFactory: createFontFileRangeCalibrationTextMetricsEngine,
  })
  const rangeCalibrationClassCorrection = buildExportPlanParityReport({
    exportPageLimit,
    measurementContext: context,
    candidateFactory: createFontFileRangeCalibrationClassCorrectionTextMetricsEngine,
  })
  const deterministicOpticalMargin = buildExportPlanParityReport({
    exportPageLimit,
    measurementContext: context,
    candidateFactory: createDeterministicFontFileOpticalMarginTextMetricsEngine,
  })
  const productionExportPlanSignatures = buildProductionExportPlanSignatures(exportPageLimit)
  const deterministicOpticalMarginExportPlanSignatures = buildProductionExportPlanSignatures(
    exportPageLimit,
    createDeterministicFontFileOpticalMarginTextMetricsEngine,
  )
  const browserDiagnostics = await runBrowserTextMetricsDiagnostics()
  const diagnosis = buildTextMetricsDiagnosis({
    maxAbsWidthDelta,
    averageAbsWidthDelta,
    averageAbsAdvanceDelta,
    averageAbsOpticalKerningDelta,
    wrappedTextChangedCount: diagnosticDeltas.filter((delta) => delta.wrappedTextChanged).length,
    wrappedLineCountChangedCount: diagnosticDeltas.filter((delta) => delta.wrappedLineCountDelta !== 0).length,
    browserDiagnostics,
  })

  return {
    activeEngineId: diagnosticDeltas[0]?.activeEngineId ?? "browser-canvas-v1",
    candidateEngineId: diagnosticDeltas[0]?.candidateEngineId ?? "font-file-v2",
    sampleCount: diagnosticDeltas.length,
    maxAbsWidthDelta,
    averageAbsWidthDelta,
    maxAbsAdvanceDelta,
    averageAbsAdvanceDelta,
    maxAbsOpticalKerningDelta,
    averageAbsOpticalKerningDelta,
    wrappedTextChangedCount: diagnosticDeltas.filter((delta) => delta.wrappedTextChanged).length,
    wrappedLineCountChangedCount: diagnosticDeltas.filter((delta) => delta.wrappedLineCountDelta !== 0).length,
    deltas: diagnosticDeltas,
    largestWidthDeltas,
    largestAdvanceDeltas,
    largestOpticalKerningDeltas,
    largestFontProbeDeltas,
    fontSummaries,
    exportPlan,
    rangeCalibration,
    rangeCalibrationClassCorrection,
    deterministicOpticalMargin,
    productionExportPlanSignatures,
    deterministicOpticalMarginExportPlanSignatures,
    browserDiagnostics,
    diagnosis,
  }
}
