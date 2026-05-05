import jsPDFModule from "jspdf"
import { strToU8, zipSync } from "fflate"

import { getStyleDefaultFontWeight, isFontFamily, resolveFontVariant } from "@/lib/config/fonts"
import { attachPdfOutputIntent, type PdfExportColorMode, type PdfOutputIntentProfileId } from "@/lib/pdf-output-intent"
import {
  preloadFontFileMetricFaces,
  type FontFileMetricFace,
} from "@/lib/font-file-text-metrics-engine"
import { buildSwissGridIdmlPackage } from "@/lib/idml/builder"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/lib/layout-engine-contract"
import {
  ensurePdfFontFacesRegistered,
  type PdfFontRegistrationFace,
} from "@/lib/pdf-font-registry"
import { renderSwissGridVectorPdf } from "@/lib/pdf-vector-export"
import {
  buildPlannedProjectPageExportSources,
  type PlannedProjectPageExportSource,
} from "@/lib/planned-page-export-source"
import type { ResolvedProjectPageExportSource } from "@/lib/project-page-export-source"
import { renderSwissGridVectorSvg } from "@/lib/svg-vector-export"
import { mmToPt } from "@/lib/units"

export type ExportEngineFormat = "pdf" | "svg" | "idml"
export type ExportEngineSvgPackaging = "files" | "zip"

export type ExportEngineMetadata = {
  title: string
  description: string
  author: string
  createdAt: string
}

export type ExportEnginePrintConfig = {
  enabled: boolean
  bleedMm: number
  registrationMarks: boolean
}

export type ExportEngineProgress = {
  format: ExportEngineFormat
  completedSteps: number
  totalSteps: number
  currentPageNumber: number
  currentLabel: string
  phase: "preparing" | "rendering" | "packaging"
}

export type ExportEngineTimingEntry = {
  label: string
  durationMs: number
  extra: string
}

export type ExportEngineOutput =
  | {
      format: "pdf" | "idml"
      filename: string
      mimeType: string
      bytes: Uint8Array
    }
  | {
      format: "svg"
      packaging: "zip"
      filename: string
      mimeType: string
      bytes: Uint8Array
    }
  | {
      format: "svg"
      packaging: "files"
      directoryName: string
      files: Array<{
        filename: string
        text: string
      }>
    }

export type ExportEngineResult = {
  outputs: ExportEngineOutput[]
  timings: ExportEngineTimingEntry[]
  totalDurationMs: number
}

export type ExportEngineOptions = {
  formats: readonly ExportEngineFormat[]
  pages: readonly ResolvedProjectPageExportSource[]
  metadata: ExportEngineMetadata
  baseName: string
  filenames?: Partial<Record<ExportEngineFormat, string>>
  startPageNumber?: number
  pageNumbers?: readonly number[]
  layoutEngine?: LayoutEngineContract
  printConfig?: ExportEnginePrintConfig
  svgPackaging?: ExportEngineSvgPackaging
  onProgress?: (progress: ExportEngineProgress) => void | Promise<void>
  onLog?: (message: string) => void
  shouldLogPage?: (completed: number, total: number) => boolean
  assertNotCancelled?: () => void
}

const PRINT_CROP_OFFSET_MM = 2
const PRINT_CROP_LENGTH_MM = 5

const DEFAULT_PRINT_CONFIG: ExportEnginePrintConfig = {
  enabled: false,
  bleedMm: 0,
  registrationMarks: false,
}

const JsPDFConstructor = (
  typeof jsPDFModule === "function"
    ? jsPDFModule
    : (jsPDFModule as unknown as { jsPDF: typeof jsPDFModule }).jsPDF
)

function normalizeFilenameSegment(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return "page"
  return trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "page"
}

function toUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer)
}

function getFontFaceCacheKey(face: PdfFontRegistrationFace): string {
  const resolved = resolveFontVariant(face.fontFamily, face.fontWeight, face.italic)
  return `${face.fontFamily}:${resolved.weight}:${resolved.italic ? "italic" : "normal"}`
}

function addFontFace(
  faces: Map<string, PdfFontRegistrationFace>,
  face: PdfFontRegistrationFace,
): void {
  faces.set(getFontFaceCacheKey(face), face)
}

function collectPdfFontFaces(pages: readonly ResolvedProjectPageExportSource[]): PdfFontRegistrationFace[] {
  const faces = new Map<string, PdfFontRegistrationFace>()
  pages.forEach((page) => {
    const layout = page.previewLayout
    if (!layout) {
      addFontFace(faces, { fontFamily: page.baseFont, fontWeight: 400, italic: false })
      return
    }

    const blockKeys = layout.blockOrder.length > 0
      ? layout.blockOrder
      : Object.keys(layout.textContent)
    blockKeys.forEach((key) => {
      const styleKey = layout.styleAssignments[key] ?? "body"
      const style = page.result.typography.styles[styleKey]
      const fontFamily = isFontFamily(layout.blockFontFamilies?.[key])
        ? layout.blockFontFamilies[key]
        : page.baseFont
      const fontWeight = typeof layout.blockFontWeights?.[key] === "number" && Number.isFinite(layout.blockFontWeights[key])
        ? layout.blockFontWeights[key]!
        : getStyleDefaultFontWeight(style?.weight)
      const italic = layout.blockItalic?.[key] ?? false
      addFontFace(faces, { fontFamily, fontWeight, italic })

      layout.blockTextFormatRuns?.[key]?.forEach((run) => {
        addFontFace(faces, {
          fontFamily: isFontFamily(run.fontFamily) ? run.fontFamily : fontFamily,
          fontWeight: typeof run.fontWeight === "number" && Number.isFinite(run.fontWeight)
            ? run.fontWeight
            : fontWeight,
          italic: typeof run.italic === "boolean" ? run.italic : italic,
        })
      })
    })
  })
  return [...faces.values()]
}

function collectExportTextMetricFaces(pages: readonly ResolvedProjectPageExportSource[]): FontFileMetricFace[] {
  return collectPdfFontFaces(pages)
}

function resolvePdfExportColorManagement(config: Pick<ExportEnginePrintConfig, "enabled">): {
  colorMode: PdfExportColorMode
  outputIntentProfileId: PdfOutputIntentProfileId
} {
  if (!config.enabled) {
    return {
      colorMode: "rgb",
      outputIntentProfileId: "srgb",
    }
  }

  return {
    colorMode: "cmyk",
    outputIntentProfileId: "coated-fogra39",
  }
}

function createTimingRecorder() {
  const timings: ExportEngineTimingEntry[] = []
  return {
    timings,
    record(label: string, durationMs: number, extra = "") {
      timings.push({ label, durationMs, extra })
    },
    async measure<T>(label: string, task: () => T | Promise<T>, extra = ""): Promise<T> {
      const startedAt = performance.now()
      const result = await task()
      this.record(label, performance.now() - startedAt, extra)
      return result
    },
  }
}

async function publishProgress(
  options: ExportEngineOptions,
  progress: ExportEngineProgress,
): Promise<void> {
  options.assertNotCancelled?.()
  await options.onProgress?.(progress)
}

async function publishPhaseProgress(
  options: ExportEngineOptions,
  format: ExportEngineFormat,
  currentLabel: string,
  completedSteps = 0,
): Promise<void> {
  await publishProgress(options, {
    format,
    completedSteps,
    totalSteps: options.pages.length,
    currentPageNumber: options.pageNumbers?.[Math.max(0, completedSteps - 1)] ?? options.startPageNumber ?? 1,
    currentLabel,
    phase: "preparing",
  })
}

async function exportPdf(
  options: ExportEngineOptions,
  plannedPages: readonly PlannedProjectPageExportSource[],
  record: ReturnType<typeof createTimingRecorder>,
): Promise<ExportEngineOutput> {
  const printConfig = options.printConfig ?? DEFAULT_PRINT_CONFIG
  await publishPhaseProgress(options, "pdf", "PDF setup: initializing document")
  const { enabled, bleedMm, registrationMarks } = printConfig
  const { colorMode, outputIntentProfileId } = resolvePdfExportColorManagement({ enabled })
  const bleedPt = mmToPt(bleedMm)
  const cropOffsetPt = mmToPt(PRINT_CROP_OFFSET_MM)
  const cropLengthPt = mmToPt(PRINT_CROP_LENGTH_MM)
  const cropMarginPt = bleedPt + cropOffsetPt + cropLengthPt
  const originX = enabled ? cropMarginPt : 0
  const originY = enabled ? cropMarginPt : 0
  const firstPage = plannedPages[0]
  const firstDimensions = {
    width: firstPage.result.pageSizePt.width,
    height: firstPage.result.pageSizePt.height,
  }
  const firstPageWidth = enabled ? firstDimensions.width + cropMarginPt * 2 : firstDimensions.width
  const firstPageHeight = enabled ? firstDimensions.height + cropMarginPt * 2 : firstDimensions.height
  const trimmedTitle = options.metadata.title.trim()
  const trimmedDescription = options.metadata.description.trim()
  const trimmedAuthor = options.metadata.author.trim()
  const parsedCreatedAt = options.metadata.createdAt ? Date.parse(options.metadata.createdAt) : Number.NaN

  const pdfSetupStartedAt = performance.now()
  const pdfFontFaces = collectPdfFontFaces(plannedPages)
  const pdf = await record.measure("pdf init", async () => {
    const instance = new JsPDFConstructor({
      orientation: firstPageWidth > firstPageHeight ? "landscape" : "portrait",
      unit: "pt",
      format: [firstPageWidth, firstPageHeight],
      compress: true,
      putOnlyUsedFonts: true,
      precision: 12,
      floatPrecision: "smart",
      userUnit: 1,
    })
    instance.setDocumentProperties({
      title: trimmedTitle || options.filenames?.pdf || `${options.baseName}.pdf`,
      author: trimmedAuthor || "Generated by Swiss Grid Generator",
      subject: trimmedDescription || "Swiss Grid Vector Export",
      creator: "Swiss Grid Generator",
      keywords: "swiss grid, typography, modular grid, vector pdf",
    })
    instance.setCreationDate(Number.isNaN(parsedCreatedAt) ? new Date() : new Date(parsedCreatedAt))
    instance.setLanguage("en-US")
    instance.viewerPreferences({
      DisplayDocTitle: true,
      PrintScaling: "None",
      PickTrayByPDFSize: true,
      PrintArea: "TrimBox",
      PrintClip: "TrimBox",
      ViewArea: "TrimBox",
      ViewClip: "TrimBox",
    })
    return instance
  })
  await record.measure(
    "pdf font register",
    async () => {
      await publishPhaseProgress(options, "pdf", `PDF setup: registering ${pdfFontFaces.length} font faces`)
      await ensurePdfFontFacesRegistered(pdf, pdfFontFaces)
    },
    `faces=${pdfFontFaces.length}`,
  )
  await record.measure(
    "pdf output intent",
    async () => {
      await publishPhaseProgress(options, "pdf", `PDF setup: attaching ${outputIntentProfileId} output intent`)
      await attachPdfOutputIntent(pdf, outputIntentProfileId)
    },
    outputIntentProfileId,
  )
  record.record("pdf setup", performance.now() - pdfSetupStartedAt, `faces=${pdfFontFaces.length}`)

  await record.measure("pdf render pages", async () => {
    for (const [index, page] of plannedPages.entries()) {
      options.assertNotCancelled?.()
      const dimensions = {
        width: page.result.pageSizePt.width,
        height: page.result.pageSizePt.height,
      }
      const pageWidth = enabled ? dimensions.width + cropMarginPt * 2 : dimensions.width
      const pageHeight = enabled ? dimensions.height + cropMarginPt * 2 : dimensions.height

      if (index > 0) {
        pdf.addPage([pageWidth, pageHeight], pageWidth > pageHeight ? "landscape" : "portrait")
      }

      await renderSwissGridVectorPdf({
        pdf,
        width: dimensions.width,
        height: dimensions.height,
        result: page.result,
        layout: page.previewLayout,
        documentVariableContext: page.documentVariableContext,
        baseFont: page.baseFont,
        originX,
        originY,
        colorMode,
        imageColorScheme: page.imageColorScheme,
        canvasBackground: page.resolvedCanvasBackground,
        printPro: {
          enabled,
          bleedPt,
          cropMarkOffsetPt: cropOffsetPt,
          cropMarkLengthPt: cropLengthPt,
          showBleedGuide: enabled,
          registrationMarks,
        },
        rotation: page.uiSettings.rotation,
        showBaselines: page.uiSettings.showBaselines,
        showModules: page.uiSettings.showModules,
        showMargins: page.uiSettings.showMargins,
        showImagePlaceholders: page.uiSettings.showImagePlaceholders,
        showTypography: page.uiSettings.showTypography,
        layoutEngine: options.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
        exportPlan: page.exportPlan,
      })
      const completed = index + 1
      if (options.shouldLogPage?.(completed, plannedPages.length)) {
        options.onLog?.(`pdf: ${completed}/${plannedPages.length} ${page.name || `Page ${completed}`}`)
      }
      await publishProgress(options, {
        format: "pdf",
        completedSteps: completed,
        totalSteps: plannedPages.length,
        currentPageNumber: options.pageNumbers?.[index] ?? completed,
        currentLabel: page.name || `Page ${completed}`,
        phase: "rendering",
      })
    }
  }, `pages=${plannedPages.length}`)

  return record.measure("pdf finalize", async () => {
    await publishProgress(options, {
      format: "pdf",
      completedSteps: plannedPages.length,
      totalSteps: plannedPages.length,
      currentPageNumber: options.pageNumbers?.[plannedPages.length - 1] ?? plannedPages.length,
      currentLabel: "Finalizing PDF bytes",
      phase: "packaging",
    })
    return {
      format: "pdf" as const,
      filename: options.filenames?.pdf ?? `${options.baseName}.pdf`,
      mimeType: "application/pdf",
      bytes: toUint8Array(pdf.output("arraybuffer")),
    }
  })
}

async function renderSvgFiles(
  options: ExportEngineOptions,
  plannedPages: readonly PlannedProjectPageExportSource[],
): Promise<Array<{ filename: string; text: string }>> {
  const startPageNumber = options.startPageNumber ?? 1
  const files: Array<{ filename: string; text: string }> = []
  for (const [index, page] of plannedPages.entries()) {
    options.assertNotCancelled?.()
    const pageNumber = options.pageNumbers?.[index] ?? startPageNumber + index
    const pageSlug = normalizeFilenameSegment(page.name || `page-${pageNumber}`)
    const svg = await renderSwissGridVectorSvg({
      width: page.result.pageSizePt.width,
      height: page.result.pageSizePt.height,
      result: page.result,
      layout: page.previewLayout,
      documentVariableContext: page.documentVariableContext,
      baseFont: page.baseFont,
      imageColorScheme: page.imageColorScheme,
      canvasBackground: page.resolvedCanvasBackground,
      rotation: page.uiSettings.rotation,
      showBaselines: page.uiSettings.showBaselines,
      showModules: page.uiSettings.showModules,
      showMargins: page.uiSettings.showMargins,
      showImagePlaceholders: page.uiSettings.showImagePlaceholders,
      showTypography: page.uiSettings.showTypography,
      layoutEngine: options.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
      title: options.metadata.title.trim()
        ? `${options.metadata.title.trim()} - Page ${pageNumber}`
        : `${options.baseName} - Page ${pageNumber}`,
      description: options.metadata.description.trim() || `Swiss Grid Vector Export - Page ${pageNumber}`,
      author: options.metadata.author.trim(),
      createdAt: options.metadata.createdAt,
      creatorTool: "Swiss Grid Generator",
      exportPlan: page.exportPlan,
    })
    files.push({
      filename: `${options.baseName}_page_${String(pageNumber).padStart(3, "0")}_${pageSlug}.svg`,
      text: svg,
    })
    const completed = index + 1
    if (options.shouldLogPage?.(completed, plannedPages.length)) {
      options.onLog?.(`svg: ${completed}/${plannedPages.length} ${page.name || `Page ${pageNumber}`}`)
    }
    await publishProgress(options, {
      format: "svg",
      completedSteps: completed,
      totalSteps: plannedPages.length,
      currentPageNumber: pageNumber,
      currentLabel: page.name || `Page ${pageNumber}`,
      phase: "rendering",
    })
  }
  return files
}

async function exportSvg(
  options: ExportEngineOptions,
  plannedPages: readonly PlannedProjectPageExportSource[],
  record: ReturnType<typeof createTimingRecorder>,
): Promise<ExportEngineOutput> {
  const packaging = options.svgPackaging ?? "zip"
  const files = await record.measure(
    "svg render pages",
    () => renderSvgFiles(options, plannedPages),
    `pages=${plannedPages.length}`,
  )

  if (packaging === "files") {
    record.record("svg zip", 0, "not used")
    return {
      format: "svg",
      packaging: "files",
      directoryName: `${options.baseName}-svg`,
      files,
    }
  }

  if (plannedPages.length === 1) {
    record.record("svg zip", 0, "single file")
    return {
      format: "svg",
      packaging: "zip",
      filename: options.filenames?.svg ?? `${options.baseName}.svg`,
      mimeType: "image/svg+xml;charset=utf-8",
      bytes: strToU8(files[0]?.text ?? ""),
    }
  }

  await publishProgress(options, {
    format: "svg",
    completedSteps: plannedPages.length,
    totalSteps: plannedPages.length,
    currentPageNumber: options.pageNumbers?.[plannedPages.length - 1] ?? (options.startPageNumber ?? 1) + plannedPages.length - 1,
    currentLabel: "Packaging SVG archive",
    phase: "packaging",
  })
  return record.measure("svg zip", async () => {
    const zipEntries = Object.fromEntries(files.map((file) => [file.filename, strToU8(file.text)]))
    return {
      format: "svg" as const,
      packaging: "zip" as const,
      filename: options.filenames?.svg ?? `${options.baseName}.zip`,
      mimeType: "application/zip",
      bytes: zipSync(zipEntries),
    }
  }, `files=${files.length}`)
}

async function exportIdml(
  options: ExportEngineOptions,
  plannedPages: readonly PlannedProjectPageExportSource[],
  record: ReturnType<typeof createTimingRecorder>,
): Promise<ExportEngineOutput> {
  const bytes = await record.measure("idml package", () => buildSwissGridIdmlPackage({
    metadata: options.metadata,
    pages: [...plannedPages],
  }), `pages=${plannedPages.length}`)
  await publishProgress(options, {
    format: "idml",
    completedSteps: plannedPages.length,
    totalSteps: plannedPages.length,
    currentPageNumber: plannedPages.length,
    currentLabel: "Packaging IDML",
    phase: "packaging",
  })
  return record.measure("idml finalize", async () => ({
    format: "idml" as const,
    filename: options.filenames?.idml ?? `${options.baseName}.idml`,
    mimeType: "application/vnd.adobe.indesign-idml-package",
    bytes,
  }))
}

export async function runExportEngine(options: ExportEngineOptions): Promise<ExportEngineResult> {
  if (options.pages.length === 0) {
    return {
      outputs: [],
      timings: [],
      totalDurationMs: 0,
    }
  }

  const totalStartedAt = performance.now()
  const record = createTimingRecorder()
  const layoutEngine = options.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT

  options.onLog?.("font metrics preload: start")
  await publishPhaseProgress(options, options.formats[0] ?? "pdf", "Preloading font metrics")
  await record.measure(
    "font metrics preload",
    () => preloadFontFileMetricFaces(collectExportTextMetricFaces(options.pages)),
  )
  options.onLog?.("font metrics preload: done")
  options.onLog?.("plan pages: start")
  await publishPhaseProgress(options, options.formats[0] ?? "pdf", `Planning ${options.pages.length} pages`)
  const plannedPages = await record.measure(
    "planning",
    async () => buildPlannedProjectPageExportSources(
      options.pages,
      layoutEngine,
      (planned, index, total) => {
        const completed = index + 1
        if (options.shouldLogPage?.(completed, total)) {
          options.onLog?.(`plan pages: ${completed}/${total} ${planned.name || `Page ${completed}`}`)
        }
      },
    ),
    `pages=${options.pages.length}`,
  )
  options.onLog?.("plan pages: done")

  const outputs: ExportEngineOutput[] = []
  for (const format of options.formats) {
    options.assertNotCancelled?.()
    options.onLog?.(`${format}: start`)
    if (format === "pdf") {
      outputs.push(await exportPdf(options, plannedPages, record))
      continue
    }
    if (format === "svg") {
      outputs.push(await exportSvg(options, plannedPages, record))
      continue
    }
    outputs.push(await exportIdml(options, plannedPages, record))
  }

  return {
    outputs,
    timings: record.timings,
    totalDurationMs: performance.now() - totalStartedAt,
  }
}

export { collectExportTextMetricFaces, collectPdfFontFaces, resolvePdfExportColorManagement }
