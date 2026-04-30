import { buildBrowserFontLoadSpec, preloadBrowserFontSpecs } from "@/lib/browser-font-loading"
import type { FontFamily } from "@/lib/config/fonts"
import {
  buildCanvasFont,
  measureCanvasTextWidth,
} from "@/lib/text-rendering"

type CanvasTextMetricField =
  | "width"
  | "actualBoundingBoxLeft"
  | "actualBoundingBoxRight"
  | "actualBoundingBoxAscent"
  | "actualBoundingBoxDescent"
  | "fontBoundingBoxAscent"
  | "fontBoundingBoxDescent"
  | "emHeightAscent"
  | "emHeightDescent"
  | "hangingBaseline"
  | "alphabeticBaseline"
  | "ideographicBaseline"

type BrowserTextMetricsProbeDefinition = {
  label: string
  text: string
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  trackingScale: number
}

export type BrowserTextMetricsRawProbe = {
  label: string
  text: string
  canvasFont: string
  normalizedCanvasFont: string
  fontLoadSpec: string
  fontCheck: boolean | null
  trackingScale: number
  widths: {
    autoKerning: number
    normalKerning: number
    noKerning: number
    trackedNormalKerning: number
    opticalKerning: number
  }
  metrics: Partial<Record<CanvasTextMetricField, number>>
}

export type BrowserTextMetricsDiagnostics = {
  support: {
    canvas2d: boolean
    documentFonts: boolean
    documentFontsCheck: boolean
    documentFontsLoad: boolean
    canvasFontKerning: boolean
    canvasLetterSpacing: boolean
    textMetricsFields: Record<CanvasTextMetricField, boolean>
  }
  fontStatus: {
    status: string | null
    readyResolved: boolean
  }
  probes: BrowserTextMetricsRawProbe[]
}

const METRIC_FIELDS: CanvasTextMetricField[] = [
  "width",
  "actualBoundingBoxLeft",
  "actualBoundingBoxRight",
  "actualBoundingBoxAscent",
  "actualBoundingBoxDescent",
  "fontBoundingBoxAscent",
  "fontBoundingBoxDescent",
  "emHeightAscent",
  "emHeightDescent",
  "hangingBaseline",
  "alphabeticBaseline",
  "ideographicBaseline",
]

const BROWSER_TEXT_METRICS_PROBES: BrowserTextMetricsProbeDefinition[] = [
  {
    label: "Inter 400 display title",
    text: "7. Placing Text and Image Areas",
    fontFamily: "Inter",
    fontWeight: 400,
    italic: false,
    fontSize: 64,
    trackingScale: 0,
  },
  {
    label: "Inter 400 title kerning",
    text: "Recommended Workflow",
    fontFamily: "Inter",
    fontWeight: 400,
    italic: false,
    fontSize: 64,
    trackingScale: 0,
  },
  {
    label: "Inter 700 poster pair",
    text: "an",
    fontFamily: "Inter",
    fontWeight: 700,
    italic: false,
    fontSize: 228,
    trackingScale: -40,
  },
  {
    label: "Inter 400 body run",
    text: "Set the page before the content. Set the rhythm before the styling.",
    fontFamily: "Inter",
    fontWeight: 400,
    italic: false,
    fontSize: 14,
    trackingScale: 0,
  },
  {
    label: "Playfair Display 700 display",
    text: "Swiss Grid System",
    fontFamily: "Playfair Display",
    fontWeight: 700,
    italic: false,
    fontSize: 96,
    trackingScale: 0,
  },
]

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  return canvas.getContext("2d")
}

function collectMetricValues(metrics: TextMetrics): Partial<Record<CanvasTextMetricField, number>> {
  const values: Partial<Record<CanvasTextMetricField, number>> = {}
  for (const field of METRIC_FIELDS) {
    const value = metrics[field]
    if (typeof value === "number" && Number.isFinite(value)) {
      values[field] = value
    }
  }
  return values
}

function collectMetricFieldSupport(metrics: TextMetrics): Record<CanvasTextMetricField, boolean> {
  return METRIC_FIELDS.reduce((acc, field) => {
    acc[field] = typeof metrics[field] === "number" && Number.isFinite(metrics[field])
    return acc
  }, {} as Record<CanvasTextMetricField, boolean>)
}

function measureWithKerning(
  context: CanvasRenderingContext2D,
  text: string,
  fontKerning: "auto" | "normal" | "none",
): number {
  if ("fontKerning" in context) {
    context.fontKerning = fontKerning
  }
  return context.measureText(text).width
}

export async function runBrowserTextMetricsDiagnostics(): Promise<BrowserTextMetricsDiagnostics> {
  const context = getCanvasContext()
  const hasFonts = typeof document !== "undefined" && "fonts" in document
  const fonts = hasFonts ? document.fonts : null
  const fontSpecs = BROWSER_TEXT_METRICS_PROBES.map((probe) => buildBrowserFontLoadSpec(
    probe.fontFamily,
    probe.fontWeight,
    probe.italic,
    probe.fontSize,
  ))

  await preloadBrowserFontSpecs(fontSpecs)
  let readyResolved = false
  if (fonts?.ready) {
    await fonts.ready
    readyResolved = true
  }

  if (!context) {
    const emptySupport = METRIC_FIELDS.reduce((acc, field) => {
      acc[field] = false
      return acc
    }, {} as Record<CanvasTextMetricField, boolean>)
    return {
      support: {
        canvas2d: false,
        documentFonts: hasFonts,
        documentFontsCheck: Boolean(fonts?.check),
        documentFontsLoad: Boolean(fonts?.load),
        canvasFontKerning: false,
        canvasLetterSpacing: false,
        textMetricsFields: emptySupport,
      },
      fontStatus: {
        status: fonts?.status ?? null,
        readyResolved,
      },
      probes: [],
    }
  }

  context.font = "400 64px Inter, system-ui, -apple-system, sans-serif"
  const supportMetrics = context.measureText("HgAV")
  const probes = BROWSER_TEXT_METRICS_PROBES.map((probe) => {
    const canvasFont = buildCanvasFont(probe.fontFamily, probe.fontWeight, probe.italic, probe.fontSize)
    const fontLoadSpec = buildBrowserFontLoadSpec(
      probe.fontFamily,
      probe.fontWeight,
      probe.italic,
      probe.fontSize,
    )
    context.font = canvasFont
    const normalizedCanvasFont = context.font
    const fontCheck = typeof fonts?.check === "function" ? fonts.check(fontLoadSpec) : null
    const autoKerning = measureWithKerning(context, probe.text, "auto")
    const normalKerning = measureWithKerning(context, probe.text, "normal")
    const noKerning = measureWithKerning(context, probe.text, "none")
    measureWithKerning(context, probe.text, "normal")
    const trackedNormalKerning = measureCanvasTextWidth(
      context,
      probe.text,
      probe.trackingScale,
      probe.fontSize,
      false,
    )
    const opticalKerning = measureCanvasTextWidth(
      context,
      probe.text,
      probe.trackingScale,
      probe.fontSize,
      true,
    )

    return {
      label: probe.label,
      text: probe.text,
      canvasFont,
      normalizedCanvasFont,
      fontLoadSpec,
      fontCheck,
      trackingScale: probe.trackingScale,
      widths: {
        autoKerning,
        normalKerning,
        noKerning,
        trackedNormalKerning,
        opticalKerning,
      },
      metrics: collectMetricValues(context.measureText(probe.text)),
    }
  })

  return {
    support: {
      canvas2d: true,
      documentFonts: hasFonts,
      documentFontsCheck: Boolean(fonts?.check),
      documentFontsLoad: Boolean(fonts?.load),
      canvasFontKerning: "fontKerning" in context,
      canvasLetterSpacing: "letterSpacing" in context,
      textMetricsFields: collectMetricFieldSupport(supportMetrics),
    },
    fontStatus: {
      status: fonts?.status ?? null,
      readyResolved,
    },
    probes,
  }
}
