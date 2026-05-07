import jsPDFModule from "jspdf"
import { strToU8, zipSync } from "fflate"

import { getStyleDefaultFontWeight, isFontFamily, resolveFontVariant } from "@/lib/config/fonts"
import { buildExportBox } from "@/lib/export-box"
import type { PdfOutputIntentProfileId } from "@/lib/pdf-output-intent"
import { attachPdfOutputIntent } from "@/lib/pdf-output-intent"
import {
  DEFAULT_EXPORT_BLEED_OPTIONS,
  type ExportBleedOptions,
} from "@/lib/export-format-options"
import {
  preloadFontFileMetricFaces,
  type FontFileMetricFace,
} from "@/lib/font-file-text-metrics-engine"
import {
  buildSwissGridIdmlPackageFromPageSets,
  buildSwissGridIdmlPageSetArtifacts,
  type SwissGridIdmlPackageDiagnostics,
} from "@/lib/idml/builder"
import type { IdmlPageSetArtifacts } from "@/lib/idml/types"
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
import {
  renderSvgPageSetFiles,
  type SvgExportFile,
  type SvgPageSetRenderOptions,
} from "@/lib/svg-page-set-export"

export type ExportEngineFormat = "pdf" | "svg" | "idml"
export type ExportEngineSvgPackaging = "files" | "zip"

export type ExportEngineMetadata = {
  title: string
  description: string
  author: string
  createdAt: string
}

export type ExportEngineBleedConfig = ExportBleedOptions

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
  bleed?: ExportEngineBleedConfig
  svgPackaging?: ExportEngineSvgPackaging
  idmlCompressionLevel?: number
  onProgress?: (progress: ExportEngineProgress) => void | Promise<void>
  onLog?: (message: string) => void
  shouldLogPage?: (completed: number, total: number) => boolean
  assertNotCancelled?: () => void
}

const DEFAULT_BLEED_CONFIG: ExportEngineBleedConfig = DEFAULT_EXPORT_BLEED_OPTIONS
const DEFAULT_EXPORT_PAGE_SET_SIZE = 25
const MAX_BROWSER_EXPORT_WORKERS = 4
const MAX_EXPORT_PAGE_SET_CACHE_ENTRIES = 48
const EXPORT_CACHE_KEY_PREVIEW_LENGTH = 48
const PDF_CANCEL_CHECK_PAGE_INTERVAL = 10

type ExportPageSetCacheEntry<TResult> = {
  serializedRequest: string
  value: TResult
}

type ExportPageSetCacheKey = {
  id: string
  serializedRequest: string
}

const svgPageSetCache = new Map<string, ExportPageSetCacheEntry<SvgExportFile[]>>()
const idmlPageSetCache = new Map<string, ExportPageSetCacheEntry<IdmlPageSetArtifacts>>()

function getStableRequestCacheKey(request: unknown): ExportPageSetCacheKey {
  const serialized = JSON.stringify(request) ?? "null"
  let hash = 2166136261
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return {
    id: `${serialized.length}:${(hash >>> 0).toString(16)}:${serialized.slice(0, EXPORT_CACHE_KEY_PREVIEW_LENGTH)}:${serialized.slice(-EXPORT_CACHE_KEY_PREVIEW_LENGTH)}`,
    serializedRequest: serialized,
  }
}

async function yieldForMainThreadCancellation(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

function readPageSetCache<TResult>(
  cache: Map<string, ExportPageSetCacheEntry<TResult>>,
  key: ExportPageSetCacheKey,
  clone: (value: TResult) => TResult,
): TResult | null {
  const entry = cache.get(key.id)
  if (!entry || entry.serializedRequest !== key.serializedRequest) return null
  cache.delete(key.id)
  cache.set(key.id, entry)
  return clone(entry.value)
}

function writePageSetCache<TResult>(
  cache: Map<string, ExportPageSetCacheEntry<TResult>>,
  key: ExportPageSetCacheKey,
  value: TResult,
  clone: (value: TResult) => TResult,
): void {
  cache.set(key.id, { serializedRequest: key.serializedRequest, value: clone(value) })
  while (cache.size > MAX_EXPORT_PAGE_SET_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (!oldestKey) break
    cache.delete(oldestKey)
  }
}

function cloneSvgExportFiles(files: SvgExportFile[]): SvgExportFile[] {
  return files.map((file) => ({ ...file }))
}

function cloneUint8Array(bytes: Uint8Array): Uint8Array {
  return bytes.slice()
}

function cloneIdmlPageSetArtifacts(artifacts: IdmlPageSetArtifacts): IdmlPageSetArtifacts {
  return {
    startPageIndex: artifacts.startPageIndex,
    pageCount: artifacts.pageCount,
    spreads: artifacts.spreads.map((spread) => ({
      ...spread,
      bytes: cloneUint8Array(spread.bytes),
    })),
    stories: artifacts.stories.map((story) => ({
      ...story,
      bytes: cloneUint8Array(story.bytes),
    })),
    diagnostics: artifacts.diagnostics ? { ...artifacts.diagnostics } : undefined,
  }
}

const JsPDFConstructor = (
  typeof jsPDFModule === "function"
    ? jsPDFModule
    : (jsPDFModule as unknown as { jsPDF: typeof jsPDFModule }).jsPDF
)

function toUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer)
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)}KB`
  return `${bytes}B`
}

export type ExportPageSet<TPage> = {
  index: number
  startIndex: number
  pages: readonly TPage[]
}

export function buildExportPageSets<TPage>(
  pages: readonly TPage[],
  pageSetSize = DEFAULT_EXPORT_PAGE_SET_SIZE,
): Array<ExportPageSet<TPage>> {
  const normalizedSize = Math.max(1, Math.floor(pageSetSize))
  const pageSets: Array<ExportPageSet<TPage>> = []
  for (let startIndex = 0; startIndex < pages.length; startIndex += normalizedSize) {
    pageSets.push({
      index: pageSets.length,
      startIndex,
      pages: pages.slice(startIndex, startIndex + normalizedSize),
    })
  }
  return pageSets
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

function resolvePdfExportColorManagement(): {
  outputIntentProfileId: PdfOutputIntentProfileId
} {
  return {
    outputIntentProfileId: "srgb",
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

type BrowserWorkerRequestPayload<TRequest> = {
  request: TRequest
  transfer?: Transferable[]
}

type BrowserPageSetWorkerOptions<TRequest, TResponse, TResult> = {
  options: ExportEngineOptions
  pageSets: readonly ExportPageSet<PlannedProjectPageExportSource>[]
  workerCount: number
  format: ExportEngineFormat
  label: string
  createWorker: () => Worker
  buildRequest: (pageSet: ExportPageSet<PlannedProjectPageExportSource>) => BrowserWorkerRequestPayload<TRequest>
  readResult: (response: TResponse) => TResult
  cache?: Map<string, ExportPageSetCacheEntry<TResult>>
  cloneForCache?: (value: TResult) => TResult
}

type SingleBrowserWorkerOptions<TRequest, TResponse, TResult> = {
  options: ExportEngineOptions
  createWorker: () => Worker
  request: TRequest
  transfer?: Transferable[]
  readResult: (response: TResponse) => TResult
  errorLabel: string
}

function getLastCompletedPageNumber(
  options: ExportEngineOptions,
  completedPages: number,
): number {
  const startPageNumber = options.startPageNumber ?? 1
  return options.pageNumbers?.[Math.max(0, completedPages - 1)] ?? startPageNumber + completedPages - 1
}

async function runBrowserPageSetWorkers<TRequest, TResponse, TResult>({
  options,
  pageSets,
  workerCount,
  format,
  label,
  createWorker,
  buildRequest,
  readResult,
  cache,
  cloneForCache,
}: BrowserPageSetWorkerOptions<TRequest, TResponse, TResult>): Promise<TResult[]> {
  const results: TResult[] = []
  const workers = Array.from({ length: workerCount }, createWorker)
  let nextPageSetIndex = 0
  let completedPages = 0
  let completedPageSets = 0

  return new Promise((resolve, reject) => {
    let settled = false
    const cancelTimer = setInterval(() => {
      try {
        options.assertNotCancelled?.()
      } catch (error) {
        fail(error)
      }
    }, 100)
    const cleanup = () => {
      clearInterval(cancelTimer)
      workers.forEach((worker) => worker.terminate())
    }
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    const completePageSet = async (pageSet: ExportPageSet<PlannedProjectPageExportSource>, result: TResult) => {
      results[pageSet.index] = result
      completedPageSets += 1
      completedPages += pageSet.pages.length
      await publishProgress(options, {
        format,
        completedSteps: completedPages,
        totalSteps: options.pages.length,
        currentPageNumber: getLastCompletedPageNumber(options, completedPages),
        currentLabel: `${label} page set ${pageSet.index + 1}/${pageSets.length}`,
        phase: "rendering",
      })
    }
    const dispatch = (worker: Worker) => {
      options.assertNotCancelled?.()
      const pageSet = pageSets[nextPageSetIndex]
      if (!pageSet) {
        if (completedPageSets === pageSets.length && !settled) {
          settled = true
          cleanup()
          resolve(results)
        }
        return
      }
      nextPageSetIndex += 1
      const payload = buildRequest(pageSet)
      const cacheKey = cache && cloneForCache ? getStableRequestCacheKey(payload.request) : null
      if (cache && cloneForCache && cacheKey) {
        const cachedResult = readPageSetCache(cache, cacheKey, cloneForCache)
        if (cachedResult) {
          void completePageSet(pageSet, cachedResult)
            .then(() => dispatch(worker))
            .catch(fail)
          return
        }
      }
      worker.onmessage = (event: MessageEvent<TResponse>) => {
        let result: TResult
        try {
          result = readResult(event.data)
        } catch (error) {
          fail(error)
          return
        }
        if (cache && cloneForCache && cacheKey) {
          writePageSetCache(cache, cacheKey, result, cloneForCache)
        }
        void completePageSet(pageSet, result)
          .then(() => dispatch(worker))
          .catch(fail)
      }
      worker.onerror = (event) => {
        fail(new Error(event.message || `${label} page-set worker failed.`))
      }
      worker.postMessage(payload.request, payload.transfer ?? [])
    }

    try {
      workers.forEach(dispatch)
    } catch (error) {
      fail(error)
    }
  })
}

async function runSingleBrowserWorker<TRequest, TResponse, TResult>({
  options,
  createWorker,
  request,
  transfer,
  readResult,
  errorLabel,
}: SingleBrowserWorkerOptions<TRequest, TResponse, TResult>): Promise<TResult> {
  return new Promise((resolve, reject) => {
    const worker = createWorker()
    let settled = false
    const cancelTimer = setInterval(() => {
      try {
        options.assertNotCancelled?.()
      } catch (error) {
        fail(error)
      }
    }, 100)
    const cleanup = () => {
      clearInterval(cancelTimer)
      worker.terminate()
    }
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    worker.onmessage = (event: MessageEvent<TResponse>) => {
      let result: TResult
      try {
        result = readResult(event.data)
      } catch (error) {
        fail(error)
        return
      }
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }
    worker.onerror = (event) => {
      fail(new Error(event.message || `${errorLabel} worker failed.`))
    }
    worker.postMessage(request, transfer ?? [])
  })
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
  const bleedConfig = options.bleed ?? DEFAULT_BLEED_CONFIG
  options.onLog?.("pdf: initializing document")
  await publishPhaseProgress(options, "pdf", "PDF setup: initializing document")
  const { outputIntentProfileId } = resolvePdfExportColorManagement()
  const firstPage = plannedPages[0]
  const firstDimensions = {
    width: firstPage.result.pageSizePt.width,
    height: firstPage.result.pageSizePt.height,
  }
  const firstExportBox = buildExportBox({
    width: firstDimensions.width,
    height: firstDimensions.height,
    bleed: bleedConfig,
  })
  const firstPageWidth = firstExportBox.media.width
  const firstPageHeight = firstExportBox.media.height
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
      options.onLog?.(`pdf: registering ${pdfFontFaces.length} font faces`)
      await publishPhaseProgress(options, "pdf", `PDF setup: registering ${pdfFontFaces.length} font faces`)
      await ensurePdfFontFacesRegistered(pdf, pdfFontFaces)
    },
    `faces=${pdfFontFaces.length}`,
  )
  await record.measure(
    "pdf output intent",
    async () => {
      options.onLog?.(`pdf: attaching ${outputIntentProfileId} output intent`)
      await publishPhaseProgress(options, "pdf", `PDF setup: attaching ${outputIntentProfileId} output intent`)
      await attachPdfOutputIntent(pdf, outputIntentProfileId)
    },
    outputIntentProfileId,
  )
  record.record("pdf setup", performance.now() - pdfSetupStartedAt, `faces=${pdfFontFaces.length}`)

  options.onLog?.(`pdf: rendering ${plannedPages.length} pages`)
  await publishProgress(options, {
    format: "pdf",
    completedSteps: 0,
    totalSteps: plannedPages.length,
    currentPageNumber: options.pageNumbers?.[0] ?? options.startPageNumber ?? 1,
    currentLabel: `Rendering ${plannedPages.length} PDF pages`,
    phase: "rendering",
  })
  await record.measure("pdf render pages", async () => {
    for (const [index, page] of plannedPages.entries()) {
      options.assertNotCancelled?.()
      const dimensions = {
        width: page.result.pageSizePt.width,
        height: page.result.pageSizePt.height,
      }
      const exportBox = buildExportBox({
        width: dimensions.width,
        height: dimensions.height,
        bleed: bleedConfig,
      })
      const pageWidth = exportBox.media.width
      const pageHeight = exportBox.media.height

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
        originX: exportBox.origin.x,
        originY: exportBox.origin.y,
        imageColorScheme: page.imageColorScheme,
        canvasBackground: page.resolvedCanvasBackground,
        exportBox,
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
      if (completed % PDF_CANCEL_CHECK_PAGE_INTERVAL === 0) {
        await yieldForMainThreadCancellation()
        options.assertNotCancelled?.()
      }
    }
  }, `pages=${plannedPages.length}`)

  return record.measure("pdf finalize", async () => {
    options.onLog?.("pdf: finalizing bytes")
    await publishProgress(options, {
      format: "pdf",
      completedSteps: plannedPages.length,
      totalSteps: plannedPages.length,
      currentPageNumber: options.pageNumbers?.[plannedPages.length - 1] ?? plannedPages.length,
      currentLabel: "Finalizing PDF bytes",
      phase: "packaging",
    })
    await yieldForMainThreadCancellation()
    options.assertNotCancelled?.()
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
): Promise<SvgExportFile[]> {
  const startPageNumber = options.startPageNumber ?? 1
  const bleedConfig = options.bleed ?? DEFAULT_BLEED_CONFIG
  const pageSets = buildExportPageSets(plannedPages)
  const workerCount = getBrowserExportWorkerCount(pageSets.length)
  if (workerCount > 1) {
    options.onLog?.(`svg: rendering ${pageSets.length} page sets on ${workerCount} workers`)
    return renderSvgPageSetsWithBrowserWorkers(options, pageSets, bleedConfig, workerCount)
  }

  options.onLog?.(`svg: rendering ${pageSets.length} page sets`)
  return renderSvgPageSetsSequentially(options, pageSets, bleedConfig, startPageNumber)
}

async function renderSvgPageSetsSequentially(
  options: ExportEngineOptions,
  pageSets: readonly ExportPageSet<PlannedProjectPageExportSource>[],
  bleedConfig: ExportEngineBleedConfig,
  startPageNumber: number,
): Promise<SvgExportFile[]> {
  const files: SvgExportFile[] = []
  let completedPages = 0
  for (const pageSet of pageSets) {
    options.assertNotCancelled?.()
    const request: SvgPageSetWorkerRequest = {
      id: pageSet.index,
      options: {
        pages: pageSet.pages,
        metadata: options.metadata,
        baseName: options.baseName,
        startPageNumber: startPageNumber + pageSet.startIndex,
        pageNumbers: pageSet.pages.map((_, index) => options.pageNumbers?.[pageSet.startIndex + index] ?? startPageNumber + pageSet.startIndex + index),
        bleed: bleedConfig,
        layoutEngine: options.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
      },
    }
    const cacheKey = getStableRequestCacheKey(request)
    const cachedFiles = readPageSetCache(svgPageSetCache, cacheKey, cloneSvgExportFiles)
    const pageSetFiles = cachedFiles ?? await renderSvgPageSetFiles({
      pages: pageSet.pages,
      metadata: options.metadata,
      baseName: options.baseName,
      startPageNumber: startPageNumber + pageSet.startIndex,
      pageNumbers: pageSet.pages.map((_, index) => options.pageNumbers?.[pageSet.startIndex + index] ?? startPageNumber + pageSet.startIndex + index),
      bleed: bleedConfig,
      layoutEngine: options.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
    })
    if (!cachedFiles) {
      writePageSetCache(svgPageSetCache, cacheKey, pageSetFiles, cloneSvgExportFiles)
    }
    files.push(...pageSetFiles)
    completedPages += pageSet.pages.length
    if (options.shouldLogPage?.(completedPages, options.pages.length)) {
      options.onLog?.(`svg: ${completedPages}/${options.pages.length} page set ${pageSet.index + 1}`)
    }
    await publishProgress(options, {
      format: "svg",
      completedSteps: completedPages,
      totalSteps: options.pages.length,
      currentPageNumber: options.pageNumbers?.[Math.max(0, completedPages - 1)] ?? completedPages,
      currentLabel: `SVG page set ${pageSet.index + 1}/${pageSets.length}`,
      phase: "rendering",
    })
  }
  return files
}

type SvgPageSetWorkerRequest = {
  id: number
  options: SvgPageSetRenderOptions
}

type SvgPageSetWorkerResponse =
  | {
      id: number
      ok: true
      files: SvgExportFile[]
    }
  | {
      id: number
      ok: false
      error: string
    }

type SvgZipWorkerRequest = {
  id: number
  files: SvgExportFile[]
}

type SvgZipWorkerResponse =
  | {
      id: number
      ok: true
      bytes: Uint8Array
    }
  | {
      id: number
      ok: false
      error: string
    }

function createSvgPageSetWorker(): Worker {
  return new Worker(new URL("../workers/svg-page-set.worker.ts", import.meta.url), { type: "module" })
}

function createSvgZipWorker(): Worker {
  return new Worker(new URL("../workers/svg-zip.worker.ts", import.meta.url), { type: "module" })
}

async function zipSvgFilesWithBrowserWorker(
  options: ExportEngineOptions,
  files: SvgExportFile[],
): Promise<Uint8Array> {
  return runSingleBrowserWorker<SvgZipWorkerRequest, SvgZipWorkerResponse, Uint8Array>({
    options,
    createWorker: createSvgZipWorker,
    request: { id: 1, files },
    errorLabel: "SVG zip",
    readResult: (response) => {
      if (!response.ok) throw new Error(response.error)
      return response.bytes
    },
  })
}

async function renderSvgPageSetsWithBrowserWorkers(
  options: ExportEngineOptions,
  pageSets: readonly ExportPageSet<PlannedProjectPageExportSource>[],
  bleedConfig: ExportEngineBleedConfig,
  workerCount: number,
): Promise<SvgExportFile[]> {
  const startPageNumber = options.startPageNumber ?? 1
  const fileSets = await runBrowserPageSetWorkers<SvgPageSetWorkerRequest, SvgPageSetWorkerResponse, SvgExportFile[]>({
    options,
    pageSets,
    workerCount,
    format: "svg",
    label: "SVG",
    createWorker: createSvgPageSetWorker,
    buildRequest: (pageSet) => ({
      request: {
        id: pageSet.index,
        options: {
          pages: [...pageSet.pages],
          metadata: options.metadata,
          baseName: options.baseName,
          startPageNumber: startPageNumber + pageSet.startIndex,
          pageNumbers: pageSet.pages.map((_, index) => options.pageNumbers?.[pageSet.startIndex + index] ?? startPageNumber + pageSet.startIndex + index),
          bleed: bleedConfig,
          layoutEngine: options.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
        },
      },
    }),
    readResult: (response) => {
      if (!response.ok) throw new Error(response.error)
      return response.files
    },
    cache: svgPageSetCache,
    cloneForCache: cloneSvgExportFiles,
  })
  return fileSets.flat()
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
    const bytes = typeof Worker === "undefined"
      ? (() => {
          const zipEntries = Object.fromEntries(files.map((file) => [file.filename, strToU8(file.text)]))
          return zipSync(zipEntries)
        })()
      : await zipSvgFilesWithBrowserWorker(options, files)
    return {
      format: "svg" as const,
      packaging: "zip" as const,
      filename: options.filenames?.svg ?? `${options.baseName}.zip`,
      mimeType: "application/zip",
      bytes,
    }
  }, `files=${files.length}`)
}

type IdmlPageSetWorkerRequest = {
  id: number
  document: {
    metadata: ExportEngineMetadata
    pages: PlannedProjectPageExportSource[]
    bleedMm: number
  }
  startPageIndex: number
}

type IdmlPageSetWorkerResponse =
  | {
      id: number
      ok: true
      artifacts: IdmlPageSetArtifacts
    }
  | {
      id: number
      ok: false
      error: string
    }

type IdmlPackageWorkerRequest = {
  id: number
  document: {
    metadata: ExportEngineMetadata
    pages: PlannedProjectPageExportSource[]
    bleedMm: number
  }
  pageSets: IdmlPageSetArtifacts[]
  compressionLevel?: number
}

type IdmlPackageWorkerResponse =
  | {
      id: number
      ok: true
      bytes: Uint8Array
      diagnostics?: SwissGridIdmlPackageDiagnostics
    }
  | {
      id: number
      ok: false
      error: string
    }

function getBrowserExportWorkerCount(pageSetCount: number): number {
  if (typeof Worker === "undefined") return 0
  const concurrency = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency || 2
  return Math.max(0, Math.min(MAX_BROWSER_EXPORT_WORKERS, pageSetCount, Math.max(1, concurrency - 1)))
}

function createIdmlPageSetWorker(): Worker {
  return new Worker(new URL("../workers/idml-page-set.worker.ts", import.meta.url), { type: "module" })
}

function createIdmlPackageWorker(): Worker {
  return new Worker(new URL("../workers/idml-package.worker.ts", import.meta.url), { type: "module" })
}

async function renderIdmlPageSetsSequentially(
  options: ExportEngineOptions,
  pageSets: readonly ExportPageSet<PlannedProjectPageExportSource>[],
  bleedMm: number,
): Promise<IdmlPageSetArtifacts[]> {
  const artifacts: IdmlPageSetArtifacts[] = []
  let completedPages = 0
  for (const pageSet of pageSets) {
    options.assertNotCancelled?.()
    const request: IdmlPageSetWorkerRequest = {
      id: pageSet.index,
      document: {
        metadata: options.metadata,
        pages: [...pageSet.pages],
        bleedMm,
      },
      startPageIndex: pageSet.startIndex,
    }
    const cacheKey = getStableRequestCacheKey(request)
    const cachedArtifacts = readPageSetCache(idmlPageSetCache, cacheKey, cloneIdmlPageSetArtifacts)
    const pageSetArtifacts = cachedArtifacts ?? await buildSwissGridIdmlPageSetArtifacts(request.document, {
      startPageIndex: request.startPageIndex,
    })
    if (!cachedArtifacts) {
      writePageSetCache(idmlPageSetCache, cacheKey, pageSetArtifacts, cloneIdmlPageSetArtifacts)
    }
    artifacts[pageSet.index] = pageSetArtifacts
    completedPages += pageSet.pages.length
    await publishProgress(options, {
      format: "idml",
      completedSteps: completedPages,
      totalSteps: options.pages.length,
      currentPageNumber: options.pageNumbers?.[Math.max(0, completedPages - 1)] ?? completedPages,
      currentLabel: `IDML page set ${pageSet.index + 1}/${pageSets.length}`,
      phase: "rendering",
    })
  }
  return artifacts
}

async function renderIdmlPageSetsWithBrowserWorkers(
  options: ExportEngineOptions,
  pageSets: readonly ExportPageSet<PlannedProjectPageExportSource>[],
  bleedMm: number,
  workerCount: number,
): Promise<IdmlPageSetArtifacts[]> {
  return runBrowserPageSetWorkers<IdmlPageSetWorkerRequest, IdmlPageSetWorkerResponse, IdmlPageSetArtifacts>({
    options,
    pageSets,
    workerCount,
    format: "idml",
    label: "IDML",
    createWorker: createIdmlPageSetWorker,
    buildRequest: (pageSet) => ({
      request: {
        id: pageSet.index,
        document: {
          metadata: options.metadata,
          pages: [...pageSet.pages],
          bleedMm,
        },
        startPageIndex: pageSet.startIndex,
      },
    }),
    readResult: (response) => {
      if (!response.ok) throw new Error(response.error)
      return response.artifacts
    },
    cache: idmlPageSetCache,
    cloneForCache: cloneIdmlPageSetArtifacts,
  })
}

async function renderIdmlPageSetArtifacts(
  options: ExportEngineOptions,
  plannedPages: readonly PlannedProjectPageExportSource[],
  record: ReturnType<typeof createTimingRecorder>,
): Promise<IdmlPageSetArtifacts[]> {
  const bleedConfig = options.bleed ?? DEFAULT_BLEED_CONFIG
  const bleedMm = bleedConfig.enabled ? bleedConfig.widthMm : 0
  const pageSets = buildExportPageSets(plannedPages)
  const workerCount = getBrowserExportWorkerCount(pageSets.length)
  const artifacts = await record.measure(
    "idml render page sets",
    async () => {
      if (workerCount > 1) {
        options.onLog?.(`idml: rendering ${pageSets.length} page sets on ${workerCount} workers`)
        return renderIdmlPageSetsWithBrowserWorkers(options, pageSets, bleedMm, workerCount)
      }
      options.onLog?.(`idml: rendering ${pageSets.length} page sets`)
      return renderIdmlPageSetsSequentially(options, pageSets, bleedMm)
    },
    `sets=${pageSets.length}${workerCount > 1 ? ` workers=${workerCount}` : ""}`,
  )
  const diagnostics = artifacts.flatMap((pageSet) => pageSet.diagnostics ? [pageSet.diagnostics] : [])
  if (diagnostics.length > 0) {
    record.record(
      "idml page xml",
      diagnostics.reduce((total, entry) => total + entry.xmlGenerationMs, 0),
      `spreads=${diagnostics.reduce((total, entry) => total + entry.spreadCount, 0)} raw=${formatBytes(diagnostics.reduce((total, entry) => total + entry.spreadBytes + entry.storyBytes, 0))}`,
    )
    record.record(
      "idml page encode",
      diagnostics.reduce((total, entry) => total + entry.encodeMs, 0),
      `bytes=${formatBytes(diagnostics.reduce((total, entry) => total + entry.spreadBytes + entry.storyBytes, 0))}`,
    )
  }
  return artifacts
}

async function packageIdmlWithBrowserWorker(
  options: ExportEngineOptions,
  plannedPages: readonly PlannedProjectPageExportSource[],
  pageSets: IdmlPageSetArtifacts[],
  onDiagnostics?: (diagnostics: SwissGridIdmlPackageDiagnostics) => void,
): Promise<Uint8Array> {
  const bleedConfig = options.bleed ?? DEFAULT_BLEED_CONFIG
  const request: IdmlPackageWorkerRequest = {
    id: 1,
    document: {
      metadata: options.metadata,
      pages: [...plannedPages],
      bleedMm: bleedConfig.enabled ? bleedConfig.widthMm : 0,
    },
    pageSets,
    compressionLevel: options.idmlCompressionLevel,
  }
  const transfer = pageSets.flatMap((pageSet) => [
    ...pageSet.spreads.map((spread) => spread.bytes.buffer),
    ...pageSet.stories.map((story) => story.bytes.buffer),
  ]) as Transferable[]
  return runSingleBrowserWorker<IdmlPackageWorkerRequest, IdmlPackageWorkerResponse, Uint8Array>({
    options,
    createWorker: createIdmlPackageWorker,
    request,
    transfer,
    errorLabel: "IDML package",
    readResult: (response) => {
      if (!response.ok) throw new Error(response.error)
      if (response.diagnostics) onDiagnostics?.(response.diagnostics)
      return response.bytes
    },
  })
}

async function packageIdml(
  options: ExportEngineOptions,
  plannedPages: readonly PlannedProjectPageExportSource[],
  pageSets: IdmlPageSetArtifacts[],
  onDiagnostics?: (diagnostics: SwissGridIdmlPackageDiagnostics) => void,
): Promise<Uint8Array> {
  const bleedConfig = options.bleed ?? DEFAULT_BLEED_CONFIG
  if (typeof Worker !== "undefined" && pageSets.length > 1) {
    options.onLog?.("idml: packaging in worker")
    return packageIdmlWithBrowserWorker(options, plannedPages, pageSets, onDiagnostics)
  }
  return buildSwissGridIdmlPackageFromPageSets({
    metadata: options.metadata,
    pages: [...plannedPages],
    bleedMm: bleedConfig.enabled ? bleedConfig.widthMm : 0,
  }, pageSets, {
    compressionLevel: options.idmlCompressionLevel,
    onDiagnostics,
  })
}

async function exportIdml(
  options: ExportEngineOptions,
  plannedPages: readonly PlannedProjectPageExportSource[],
  record: ReturnType<typeof createTimingRecorder>,
): Promise<ExportEngineOutput> {
  const pageSets = await renderIdmlPageSetArtifacts(options, plannedPages, record)
  const packageDiagnosticsRef: { current: SwissGridIdmlPackageDiagnostics | null } = { current: null }
  const bytes = await record.measure(
    "idml package",
    () => packageIdml(options, plannedPages, pageSets, (diagnostics) => {
      packageDiagnosticsRef.current = diagnostics
    }),
    `pages=${plannedPages.length}`,
  )
  const packageDiagnostics = packageDiagnosticsRef.current
  if (packageDiagnostics) {
    const spreadBytes = packageDiagnostics.components
      .filter((component) => component.path.startsWith("Spreads/"))
      .reduce((total, component) => total + component.bytes, 0)
    const resourceBytes = packageDiagnostics.components
      .filter((component) => !component.path.startsWith("Spreads/") && !component.path.startsWith("Stories/"))
      .reduce((total, component) => total + component.bytes, 0)
    const largestComponents = [...packageDiagnostics.components]
      .sort((left, right) => right.bytes - left.bytes)
      .slice(0, 3)
      .map((component) => `${component.path}=${formatBytes(component.bytes)}`)
      .join(" ")
    record.record("idml package resources", packageDiagnostics.resourceXmlMs, `raw=${formatBytes(resourceBytes)}`)
    record.record("idml package zip", packageDiagnostics.zipMs, `engine=${packageDiagnostics.zipEngine} raw=${formatBytes(packageDiagnostics.components.reduce((total, component) => total + component.bytes, 0))}`)
    record.record("idml component sizes", 0, `spreads=${formatBytes(spreadBytes)} resources=${formatBytes(resourceBytes)} top=${largestComponents}`)
  }
  await publishProgress(options, {
    format: "idml",
    completedSteps: plannedPages.length,
    totalSteps: plannedPages.length,
    currentPageNumber: options.pageNumbers?.[plannedPages.length - 1] ?? (options.startPageNumber ?? 1) + plannedPages.length - 1,
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
