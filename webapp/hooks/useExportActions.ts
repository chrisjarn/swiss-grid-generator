import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { flushSync } from "react-dom"
import type { ExportEngineResult } from "@/lib/export-engine"
import { type LoadedProject } from "@/lib/document-session"
import { toProjectFilename } from "@/lib/project-file-naming"
import {
  buildProjectTransferPayload,
  encodeProjectTransferPayload,
  PROJECT_ARCHIVE_EXTENSION,
  PROJECT_JSON_EXTENSION,
  toArrayBuffer,
} from "@/lib/project-transfer"
import {
  getProjectExportFontWarmupSignature,
  warmDefaultExportFonts,
  warmProjectExportFonts,
} from "@/lib/export-font-warmup"
import {
  filterProjectByExportRange,
  normalizeProjectExportPageRange,
  type ProjectPageVisibilitySettings,
  type ProjectExportPageRange,
} from "@/lib/project-page-export-source"
import { runProjectExport } from "@/lib/project-export-runner"

export type ExportFormat = "pdf" | "svg" | "idml" | "json"

export type ExportProgressState = {
  format: ExportFormat
  completedSteps: number
  totalSteps: number
  currentPageNumber: number
  currentLabel: string
  phase: "preparing" | "rendering" | "packaging"
}

type PrintPresetConfig = {
  enabled: boolean
  bleedMm: number
  registrationMarks: boolean
}

type ExportMetadataDraft = {
  title: string
  description: string
  author: string
  createdAt: string
}

export type PrintPresetKey = "digital_print" | "press_proof" | "offset_final"

const DIGITAL_PRINT_CONFIG: PrintPresetConfig = {
  enabled: false,
  bleedMm: 0,
  registrationMarks: false,
}

const PRESS_PROOF_CONFIG: PrintPresetConfig = {
  enabled: true,
  bleedMm: 3,
  registrationMarks: true,
}

const OFFSET_FINAL_CONFIG: PrintPresetConfig = {
  enabled: true,
  bleedMm: 3,
  registrationMarks: true,
}

export const PRINT_PRESETS: Array<{
  key: PrintPresetKey
  label: string
  config: PrintPresetConfig
}> = [
  {
    key: "digital_print",
    label: "Digital Print",
    config: DIGITAL_PRINT_CONFIG,
  },
  {
    key: "press_proof",
    label: "Press Proof",
    config: PRESS_PROOF_CONFIG,
  },
  {
    key: "offset_final",
    label: "Offset Final",
    config: OFFSET_FINAL_CONFIG,
  },
]

export const EXPORT_DIALOG_PRINT_PRESETS = PRINT_PRESETS.filter((preset) => preset.key !== "offset_final")

const EXPORT_PROGRESS_BATCH_SIZE = 8
const EXPORT_PROGRESS_MIN_INTERVAL_MS = 100
const LARGE_EXPORT_PROGRESS_THRESHOLD = 250
const LARGE_EXPORT_PROGRESS_PAGE_INTERVAL = 250

class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled")
    this.name = "ExportCancelledError"
  }
}

function isExportCancelledError(error: unknown): error is ExportCancelledError {
  return error instanceof ExportCancelledError
    || (error instanceof Error && error.name === "ExportCancelledError")
}

function isSamePrintPresetConfig(left: PrintPresetConfig, right: PrintPresetConfig): boolean {
  return left.enabled === right.enabled
    && left.bleedMm === right.bleedMm
    && left.registrationMarks === right.registrationMarks
}

function formatExportDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(2)}s`
}

function logExportEnginePerformance(label: string, result: ExportEngineResult): void {
  if (typeof console === "undefined") return
  const rows = result.timings.map((entry) => ({
    phase: entry.label,
    duration: formatExportDuration(entry.durationMs),
    extra: entry.extra,
  }))
  const total = formatExportDuration(result.totalDurationMs)
  console.info(`[Swiss Grid Generator] ${label} export performance total ${total}`)
  if (typeof console.table === "function") {
    console.table(rows)
  } else {
    console.info(rows)
  }
}

function logExportDownloadPerformance(label: string, durationMs: number, byteLength: number): void {
  if (typeof console === "undefined") return
  const sizeMb = byteLength / 1024 / 1024
  console.info(`[Swiss Grid Generator] ${label} download handoff ${formatExportDuration(durationMs)} size=${sizeMb.toFixed(2)}MB`)
}

function logExportActionPerformance(label: string, timings: Array<{ phase: string; durationMs: number }>, totalDurationMs: number): void {
  if (typeof console === "undefined") return
  const rows = timings.map((entry) => ({
    phase: entry.phase,
    duration: formatExportDuration(entry.durationMs),
  }))
  console.info(`[Swiss Grid Generator] ${label} export action total ${formatExportDuration(totalDurationMs)}`)
  if (typeof console.table === "function") {
    console.table(rows)
  } else {
    console.info(rows)
  }
}

function shouldForwardExportProgress(state: ExportProgressState, force = false): boolean {
  if (force) return true
  if (state.totalSteps < LARGE_EXPORT_PROGRESS_THRESHOLD) return true
  if (state.completedSteps === 0 || state.completedSteps === state.totalSteps) return true
  return state.completedSteps % LARGE_EXPORT_PROGRESS_PAGE_INTERVAL === 0
}

function publishProgressWithoutBlockingExport(
  publishProgress: (state: ExportProgressState, force?: boolean) => Promise<void>,
  state: ExportProgressState,
  force: boolean,
): void {
  void publishProgress(state, force)
}

function resolveActivePrintPresetKey(config: PrintPresetConfig): PrintPresetKey | null {
  const match = PRINT_PRESETS.find((preset) => isSamePrintPresetConfig(preset.config, config))
  return match?.key ?? null
}

function resolveExportDownloadExtension(format: ExportFormat, selectedPageCount: number): string {
  if (format === "svg" && selectedPageCount > 1) return ".zip"
  if (format === "svg") return ".svg"
  if (format === "idml") return ".idml"
  if (format === "json") return PROJECT_JSON_EXTENSION
  return ".pdf"
}

function updateFilenameForExport(
  current: string,
  format: ExportFormat,
  selectedPageCount: number,
  getDefaultExportFilename: (format: ExportFormat, selectedPageCount: number, compressedJson?: boolean) => string,
  compressedJson = false,
): string {
  const trimmed = current.trim()
  const extension = format === "json" && compressedJson
    ? PROJECT_ARCHIVE_EXTENSION
    : resolveExportDownloadExtension(format, selectedPageCount)
  if (!trimmed) return getDefaultExportFilename(format, selectedPageCount, compressedJson)
  if (/\.(pdf|svg|idml|json|zip|swissgridgenerator)$/i.test(trimmed)) {
    return trimmed.replace(/\.(pdf|svg|idml|json|zip|swissgridgenerator)$/i, extension)
  }
  return `${trimmed}${extension}`
}

export type ExportActionsContext = {
  exportPrintPro: boolean
  setExportPrintPro: (b: boolean) => void
  exportBleedMm: number
  setExportBleedMm: (n: number) => void
  exportRegistrationMarks: boolean
  setExportRegistrationMarks: (b: boolean) => void
  defaultPdfFilename: string
  defaultSvgFilename: string
  defaultIdmlFilename: string
  defaultJsonFilename: string
  projectMetadata: {
    title: string
    description: string
    author: string
    createdAt?: string
  }
  onProjectMetadataChange: (metadata: {
    title: string
    description: string
    author: string
    createdAt?: string
  }) => void
  exportViewSettings: ProjectPageVisibilitySettings
  getCurrentProjectSnapshot: () => LoadedProject<Record<string, unknown>>
}

export function useExportActions(ctx: ExportActionsContext) {
  const {
    exportPrintPro: persistedPrintPresetEnabled,
    setExportPrintPro: setPersistedPrintPresetEnabled,
    exportBleedMm,
    setExportBleedMm,
    exportRegistrationMarks,
    setExportRegistrationMarks,
    defaultPdfFilename,
    defaultIdmlFilename,
    defaultJsonFilename,
    projectMetadata,
    onProjectMetadataChange,
    exportViewSettings,
    getCurrentProjectSnapshot,
  } = ctx
  const [isSaveLibraryDialogOpen, setIsSaveLibraryDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFormatDraft, setExportFormatDraft] = useState<ExportFormat>("pdf")
  const [exportFilenameDraft, setExportFilenameDraft] = useState("")
  const [printPresetEnabledDraft, setPrintPresetEnabledDraft] = useState(persistedPrintPresetEnabled)
  const [exportBleedMmDraft, setExportBleedMmDraft] = useState(String(exportBleedMm))
  const [exportRegistrationMarksDraft, setExportRegistrationMarksDraft] = useState(exportRegistrationMarks)
  const [exportRangeStartDraft, setExportRangeStartDraft] = useState(1)
  const [exportRangeEndDraft, setExportRangeEndDraft] = useState(1)
  const [exportProgress, setExportProgress] = useState<ExportProgressState | null>(null)
  const exportCancelRequestedRef = useRef(false)
  const [saveTitleDraft, setSaveTitleDraft] = useState("")
  const [saveDescriptionDraft, setSaveDescriptionDraft] = useState("")
  const [saveAuthorDraft, setSaveAuthorDraft] = useState("")
  const [jsonCompressionEnabledDraft, setJsonCompressionEnabledDraft] = useState(false)
  const [exportProjectOverride, setExportProjectOverride] = useState<LoadedProject<Record<string, unknown>> | null>(null)
  const warmedProjectFontSignatureRef = useRef("")

  const getCurrentProjectWithMetadata = useCallback(() => ({
    ...getCurrentProjectSnapshot(),
    metadata: {
      title: projectMetadata.title,
      description: projectMetadata.description,
      author: projectMetadata.author,
      createdAt: projectMetadata.createdAt,
    },
  }), [
    getCurrentProjectSnapshot,
    projectMetadata.author,
    projectMetadata.createdAt,
    projectMetadata.description,
    projectMetadata.title,
  ])

  const currentProject = useMemo(() => getCurrentProjectWithMetadata(), [getCurrentProjectWithMetadata])
  const activeProject = useMemo(
    () => exportProjectOverride ?? currentProject,
    [currentProject, exportProjectOverride],
  )
  const activeProjectMetadata = activeProject.metadata

  const projectPageCount = activeProject.pages.length

  useEffect(() => {
    void warmDefaultExportFonts()
  }, [])

  useEffect(() => {
    if (currentProject.pages.length === 0) return
    const timeoutId = window.setTimeout(() => {
      const range = {
        fromPage: 1,
        toPage: currentProject.pages.length,
      }
      const signature = getProjectExportFontWarmupSignature({
        project: currentProject,
        range,
        visibilitySettings: exportViewSettings,
      })
      if (signature === warmedProjectFontSignatureRef.current) return
      warmedProjectFontSignatureRef.current = signature
      void warmProjectExportFonts({
        project: currentProject,
        range,
        visibilitySettings: exportViewSettings,
      })
    }, 650)
    return () => window.clearTimeout(timeoutId)
  }, [currentProject, exportViewSettings])

  const normalizedRange = useMemo(() => normalizeProjectExportPageRange(
    projectPageCount,
    exportRangeStartDraft,
    exportRangeEndDraft,
  ), [exportRangeEndDraft, exportRangeStartDraft, projectPageCount])

  const selectedProjectPages = useMemo(
    () => activeProject.pages.slice(normalizedRange.startIndex, normalizedRange.endIndex + 1),
    [activeProject.pages, normalizedRange.endIndex, normalizedRange.startIndex],
  )
  const selectedPageCount = selectedProjectPages.length
  const selectedSinglePage = selectedPageCount === 1 ? selectedProjectPages[0] ?? null : null

  const pageRangeOptions = useMemo(() => activeProject.pages.map((page, index) => ({
    value: String(index + 1),
    label: `${index + 1}. ${page.name || `Page ${index + 1}`}`,
  })), [activeProject.pages])

  const getDefaultExportFilename = useCallback((format: ExportFormat, selectedPages: number, compressedJson = jsonCompressionEnabledDraft) => {
    const base = format === "svg"
      ? ctx.defaultSvgFilename
      : format === "idml"
        ? defaultIdmlFilename
        : format === "json"
          ? defaultJsonFilename
        : defaultPdfFilename
    const extension = format === "json" && compressedJson
      ? PROJECT_ARCHIVE_EXTENSION
      : resolveExportDownloadExtension(format, selectedPages)
    const fallbackStem = base.replace(/\.(pdf|svg|idml|json|zip|swissgridgenerator)$/i, "")
    return toProjectFilename(activeProjectMetadata.title, fallbackStem, extension)
  }, [
    activeProjectMetadata.title,
    ctx.defaultSvgFilename,
    defaultIdmlFilename,
    defaultJsonFilename,
    defaultPdfFilename,
    jsonCompressionEnabledDraft,
  ])

  const updateFilenameForFormat = useCallback((
    current: string,
    format: ExportFormat,
    selectedPages: number,
    compressedJson = jsonCompressionEnabledDraft,
  ) => (
    updateFilenameForExport(current, format, selectedPages, getDefaultExportFilename, compressedJson)
  ), [getDefaultExportFilename, jsonCompressionEnabledDraft])

  const saveJSON = useCallback(
    (
      filename: string,
      projectSnapshot: LoadedProject<Record<string, unknown>>,
      metadata: { title: string; description: string; author: string; createdAt: string },
      compressed: boolean,
    ) => {
      const trimmed = filename.trim()
      if (!trimmed) return
      const payload = buildProjectTransferPayload({
        ...projectSnapshot,
        pages: projectSnapshot.pages,
        metadata,
        tour: projectSnapshot.tour ?? null,
      })
      const encoded = encodeProjectTransferPayload(payload, compressed)
      const normalizedFilename = updateFilenameForExport(
        trimmed,
        "json",
        projectSnapshot.pages.length,
        getDefaultExportFilename,
        compressed,
      )
      const blob = new Blob([toArrayBuffer(encoded.bytes)], { type: encoded.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = normalizedFilename
      a.click()
      URL.revokeObjectURL(url)
    },
    [getDefaultExportFilename],
  )

  const openSaveLibraryDialog = useCallback(() => {
    setSaveTitleDraft(projectMetadata.title ?? "")
    setSaveDescriptionDraft(projectMetadata.description ?? "")
    setSaveAuthorDraft(projectMetadata.author ?? "")
    setIsSaveLibraryDialogOpen(true)
  }, [projectMetadata.author, projectMetadata.description, projectMetadata.title])

  const closeExportDialog = useCallback(() => {
    setIsExportDialogOpen(false)
    setExportProjectOverride(null)
  }, [])

  const openExportDialog = useCallback(() => {
    setExportProjectOverride(null)
    const defaultRange = { fromPage: 1, toPage: projectPageCount }
    const basePdfStem = defaultPdfFilename.replace(/\.(pdf|svg|idml|json|zip|swissgridgenerator)$/i, "")

    setExportFormatDraft("pdf")
    setExportRangeStartDraft(defaultRange.fromPage)
    setExportRangeEndDraft(defaultRange.toPage)
    setPrintPresetEnabledDraft(persistedPrintPresetEnabled)
    setExportBleedMmDraft(String(exportBleedMm))
    setExportRegistrationMarksDraft(exportRegistrationMarks)
    setJsonCompressionEnabledDraft(false)
    setExportFilenameDraft(toProjectFilename(currentProject.metadata.title, basePdfStem, ".pdf"))
    setSaveTitleDraft(currentProject.metadata.title ?? "")
    setSaveDescriptionDraft(currentProject.metadata.description ?? "")
    setSaveAuthorDraft(currentProject.metadata.author ?? "")
    setIsExportDialogOpen(true)
    void warmProjectExportFonts({
      project: currentProject,
      range: defaultRange,
      visibilitySettings: exportViewSettings,
    })
  }, [
    currentProject.metadata.author,
    currentProject.metadata.description,
    currentProject.metadata.title,
    currentProject,
    defaultPdfFilename,
    exportBleedMm,
    exportRegistrationMarks,
    exportViewSettings,
    persistedPrintPresetEnabled,
    projectPageCount,
  ])

  const openExportDialogForProject = useCallback((project: LoadedProject<Record<string, unknown>>) => {
    setExportProjectOverride(project)
    const defaultRange = { fromPage: 1, toPage: project.pages.length }

    setExportFormatDraft("pdf")
    setExportRangeStartDraft(defaultRange.fromPage)
    setExportRangeEndDraft(defaultRange.toPage)
    setPrintPresetEnabledDraft(persistedPrintPresetEnabled)
    setExportBleedMmDraft(String(exportBleedMm))
    setExportRegistrationMarksDraft(exportRegistrationMarks)
    setJsonCompressionEnabledDraft(false)
    const basePdfStem = defaultPdfFilename.replace(/\.(pdf|svg|idml|json|zip|swissgridgenerator)$/i, "")
    setExportFilenameDraft(toProjectFilename(project.metadata.title, basePdfStem, ".pdf"))
    setSaveTitleDraft(project.metadata.title ?? "")
    setSaveDescriptionDraft(project.metadata.description ?? "")
    setSaveAuthorDraft(project.metadata.author ?? "")
    setIsExportDialogOpen(true)
    void warmProjectExportFonts({
      project,
      range: defaultRange,
      visibilitySettings: exportViewSettings,
    })
  }, [
    defaultPdfFilename,
    exportBleedMm,
    exportRegistrationMarks,
    exportViewSettings,
    persistedPrintPresetEnabled,
  ])

  const handleSaveTitleChange = useCallback((value: string) => {
    setSaveTitleDraft(value)
  }, [])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [])

  const downloadBytes = useCallback((bytes: Uint8Array, mimeType: string, filename: string) => {
    const backingBuffer = bytes.buffer
    const blobPart: BlobPart = backingBuffer instanceof ArrayBuffer
      ? (
        bytes.byteOffset === 0 && bytes.byteLength === backingBuffer.byteLength
          ? backingBuffer
          : backingBuffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      )
      : bytes.slice().buffer
    downloadBlob(new Blob([blobPart], { type: mimeType }), filename)
  }, [downloadBlob])

  const yieldToBrowser = useCallback(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
  }, [])

  const waitForUiCommit = useCallback(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve())
      })
    })
  }, [])

  const createProgressPublisher = useCallback(() => {
    let lastPublishedAt = 0
    let lastPublishedStep = -1

    return async (state: ExportProgressState, force = false) => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const shouldPublish = force
        || state.phase === "preparing"
        || state.phase === "packaging"
        || state.completedSteps === 0
        || state.completedSteps === state.totalSteps
        || state.completedSteps - lastPublishedStep >= EXPORT_PROGRESS_BATCH_SIZE
        || now - lastPublishedAt >= EXPORT_PROGRESS_MIN_INTERVAL_MS

      if (!shouldPublish) return

      lastPublishedAt = now
      lastPublishedStep = state.completedSteps
      setExportProgress(state)
      await yieldToBrowser()
    }
  }, [yieldToBrowser])

  const throwIfExportCancelled = useCallback(() => {
    if (!exportCancelRequestedRef.current) return
    throw new ExportCancelledError()
  }, [])

  const cancelExport = useCallback(() => {
    exportCancelRequestedRef.current = true
    setExportProgress((current) => (
      current
        ? {
            ...current,
            currentLabel: "Cancelling export",
          }
        : current
    ))
  }, [])

  const exportPDF = useCallback(async (
    project: LoadedProject<Record<string, unknown>>,
    range: ProjectExportPageRange,
    visibilitySettings: ProjectPageVisibilitySettings,
    filename: string,
    printPresetConfig: PrintPresetConfig,
    exportMetadata: ExportMetadataDraft,
  ) => {
    if (project.pages.length === 0) return
    const publishProgress = createProgressPublisher()
    const result = await runProjectExport({
      formats: ["pdf"],
      project,
      range,
      visibilitySettings,
      metadata: exportMetadata,
      baseName: filename.replace(/\.pdf$/i, ""),
      filenames: { pdf: filename },
      printConfig: printPresetConfig,
      onProgress: (progress) => {
        const force = progress.completedSteps === 1 || progress.completedSteps === progress.totalSteps
        if (!shouldForwardExportProgress(progress, force)) return undefined
        publishProgressWithoutBlockingExport(publishProgress, progress, force)
        return undefined
      },
      assertNotCancelled: throwIfExportCancelled,
    })
    logExportEnginePerformance("PDF", result)
    const output = result.outputs[0]
    if (output?.format === "pdf") {
      const downloadStartedAt = performance.now()
      downloadBytes(output.bytes, output.mimeType, output.filename)
      logExportDownloadPerformance("PDF", performance.now() - downloadStartedAt, output.bytes.byteLength)
    }
  }, [createProgressPublisher, downloadBytes, throwIfExportCancelled])

  const exportSVG = useCallback(async (
    project: LoadedProject<Record<string, unknown>>,
    range: ProjectExportPageRange,
    visibilitySettings: ProjectPageVisibilitySettings,
    filename: string,
    exportMetadata: ExportMetadataDraft,
  ) => {
    if (project.pages.length === 0) return

    const publishProgress = createProgressPublisher()
    const result = await runProjectExport({
      formats: ["svg"],
      project,
      range,
      visibilitySettings,
      metadata: exportMetadata,
      baseName: filename.replace(/\.(svg|zip)$/i, ""),
      filenames: { svg: filename },
      svgPackaging: "zip",
      onProgress: (progress) => {
        const force = progress.completedSteps === 1 || progress.completedSteps === progress.totalSteps
        if (!shouldForwardExportProgress(progress, force)) return undefined
        publishProgressWithoutBlockingExport(publishProgress, progress, force)
        return undefined
      },
      assertNotCancelled: throwIfExportCancelled,
    })
    logExportEnginePerformance("SVG", result)
    const output = result.outputs[0]
    if (output?.format === "svg" && output.packaging === "zip") {
      const downloadStartedAt = performance.now()
      downloadBytes(output.bytes, output.mimeType, output.filename)
      logExportDownloadPerformance("SVG", performance.now() - downloadStartedAt, output.bytes.byteLength)
    }
  }, [createProgressPublisher, downloadBytes, throwIfExportCancelled])

  const exportIDML = useCallback(async (
    project: LoadedProject<Record<string, unknown>>,
    range: ProjectExportPageRange,
    visibilitySettings: ProjectPageVisibilitySettings,
    filename: string,
    exportMetadata: ExportMetadataDraft,
  ) => {
    if (project.pages.length === 0) return

    const publishProgress = createProgressPublisher()
    const result = await runProjectExport({
      formats: ["idml"],
      project,
      range,
      visibilitySettings,
      metadata: exportMetadata,
      baseName: filename.replace(/\.idml$/i, ""),
      filenames: { idml: filename },
      onProgress: (progress) => {
        const force = progress.phase === "packaging" || progress.completedSteps === progress.totalSteps
        if (!shouldForwardExportProgress(progress, force)) return undefined
        publishProgressWithoutBlockingExport(publishProgress, progress, force)
        return undefined
      },
      assertNotCancelled: throwIfExportCancelled,
    })
    logExportEnginePerformance("IDML", result)
    const output = result.outputs[0]
    if (output?.format === "idml") {
      const downloadStartedAt = performance.now()
      downloadBytes(output.bytes, output.mimeType, output.filename)
      logExportDownloadPerformance("IDML", performance.now() - downloadStartedAt, output.bytes.byteLength)
    }
  }, [createProgressPublisher, downloadBytes, throwIfExportCancelled])

  const handleExportFormatChange = useCallback((format: ExportFormat) => {
    setExportFormatDraft(format)
    setExportFilenameDraft((current) => updateFilenameForFormat(current, format, selectedPageCount))
  }, [selectedPageCount, updateFilenameForFormat])

  const handleJsonCompressionEnabledChange = useCallback((enabled: boolean) => {
    setJsonCompressionEnabledDraft(enabled)
    setExportFilenameDraft((current) => updateFilenameForFormat(current, "json", activeProject.pages.length, enabled))
  }, [activeProject.pages.length, updateFilenameForFormat])

  const applyExportRange = useCallback((nextRange: ProjectExportPageRange) => {
    const normalized = normalizeProjectExportPageRange(projectPageCount, nextRange.fromPage, nextRange.toPage)
    setExportRangeStartDraft(normalized.fromPage)
    setExportRangeEndDraft(normalized.toPage)
    setExportFilenameDraft((current) => updateFilenameForFormat(
      current,
      exportFormatDraft,
      normalized.toPage - normalized.fromPage + 1,
    ))
  }, [exportFormatDraft, projectPageCount, updateFilenameForFormat])

  const handleExportRangeStartChange = useCallback((value: string) => {
    const nextStart = Number(value)
    applyExportRange({
      fromPage: nextStart,
      toPage: Math.max(nextStart, exportRangeEndDraft),
    })
  }, [applyExportRange, exportRangeEndDraft])

  const handleExportRangeEndChange = useCallback((value: string) => {
    const nextEnd = Number(value)
    applyExportRange({
      fromPage: Math.min(exportRangeStartDraft, nextEnd),
      toPage: nextEnd,
    })
  }, [applyExportRange, exportRangeStartDraft])

  const applyPrintPresetConfig = useCallback((config: PrintPresetConfig) => {
    setPrintPresetEnabledDraft(config.enabled)
    setExportBleedMmDraft(String(config.bleedMm))
    setExportRegistrationMarksDraft(config.registrationMarks)
  }, [])

  const applyPrintPreset = useCallback((presetKey: PrintPresetKey) => {
    const preset = PRINT_PRESETS.find((entry) => entry.key === presetKey)
    if (!preset) return
    applyPrintPresetConfig(preset.config)
  }, [applyPrintPresetConfig])

  const confirmExport = useCallback(async () => {
    const actionStartedAt = performance.now()
    const actionTimings: Array<{ phase: string; durationMs: number }> = []
    const recordActionTiming = (phase: string, startedAt: number) => {
      actionTimings.push({
        phase,
        durationMs: performance.now() - startedAt,
      })
    }
    const trimmedName = exportFilenameDraft.trim()
    if (!trimmedName) return
    if (exportFormatDraft !== "json" && selectedPageCount === 0) return

    const nextCreatedAt = activeProjectMetadata.createdAt && !Number.isNaN(Date.parse(activeProjectMetadata.createdAt))
      ? new Date(activeProjectMetadata.createdAt).toISOString()
      : new Date().toISOString()
    const normalizedMetadata: ExportMetadataDraft = {
      title: saveTitleDraft.trim(),
      description: saveDescriptionDraft.trim(),
      author: saveAuthorDraft.trim(),
      createdAt: nextCreatedAt,
    }
    recordActionTiming("metadata prepare", actionStartedAt)

    if (exportFormatDraft === "json") {
      const jsonStartedAt = performance.now()
      const selectedRange = {
        fromPage: normalizedRange.fromPage,
        toPage: normalizedRange.toPage,
      } satisfies ProjectExportPageRange
      const selectedProject = filterProjectByExportRange(activeProject, selectedRange)
      const filename = updateFilenameForExport(
        trimmedName,
        exportFormatDraft,
        selectedProject.pages.length,
        getDefaultExportFilename,
        jsonCompressionEnabledDraft,
      )
      saveJSON(filename, selectedProject, normalizedMetadata, jsonCompressionEnabledDraft)
      if (!exportProjectOverride) {
        onProjectMetadataChange(normalizedMetadata)
      }
      closeExportDialog()
      recordActionTiming("json save and close", jsonStartedAt)
      logExportActionPerformance("JSON", actionTimings, performance.now() - actionStartedAt)
      return
    }

    exportCancelRequestedRef.current = false

    const progressStartedAt = performance.now()
    flushSync(() => {
      setExportProgress({
        format: exportFormatDraft,
        completedSteps: 0,
        totalSteps: selectedPageCount,
        currentPageNumber: normalizedRange.fromPage,
        currentLabel: "Preparing export",
        phase: "preparing",
      })
    })
    await waitForUiCommit()
    recordActionTiming("initial progress paint", progressStartedAt)

    const optionsStartedAt = performance.now()
    const filename = updateFilenameForExport(
      trimmedName,
      exportFormatDraft,
      selectedPageCount,
      getDefaultExportFilename,
    )
    const currentProjectSnapshot = activeProject
    const selectedRange = {
      fromPage: normalizedRange.fromPage,
      toPage: normalizedRange.toPage,
    } satisfies ProjectExportPageRange
    const parsedBleed = Number(exportBleedMmDraft)
    const bleedMm = Number.isFinite(parsedBleed) && parsedBleed >= 0 ? parsedBleed : exportBleedMm
    const shouldPersistActivePageExportSettings = (
      !exportProjectOverride
      && selectedPageCount === 1
      && selectedSinglePage?.id === currentProjectSnapshot.activePageId
    )
    recordActionTiming("export options prepare", optionsStartedAt)

    try {
      if (exportFormatDraft === "idml") {
        const exportStartedAt = performance.now()
        setExportProgress((current) => current ? {
          ...current,
          totalSteps: selectedPageCount,
          currentPageNumber: normalizedRange.fromPage,
          currentLabel: currentProjectSnapshot.pages[normalizedRange.startIndex]?.name || "Preparing IDML",
        } : current)
        await exportIDML(currentProjectSnapshot, selectedRange, exportViewSettings, filename, normalizedMetadata)
        recordActionTiming("idml engine and download", exportStartedAt)
        const closeStartedAt = performance.now()
        closeExportDialog()
        recordActionTiming("close dialog", closeStartedAt)
        return
      }

      if (exportFormatDraft === "pdf") {
        const exportStartedAt = performance.now()
        if (shouldPersistActivePageExportSettings) {
          setPersistedPrintPresetEnabled(printPresetEnabledDraft)
          setExportBleedMm(bleedMm)
          setExportRegistrationMarks(exportRegistrationMarksDraft)
        }
        await exportPDF(currentProjectSnapshot, selectedRange, exportViewSettings, filename, {
          enabled: printPresetEnabledDraft,
          bleedMm,
          registrationMarks: exportRegistrationMarksDraft,
        }, normalizedMetadata)
        recordActionTiming("pdf engine and download", exportStartedAt)
      } else {
        const exportStartedAt = performance.now()
        await exportSVG(currentProjectSnapshot, selectedRange, exportViewSettings, filename, normalizedMetadata)
        recordActionTiming("svg engine and download", exportStartedAt)
      }

      const closeStartedAt = performance.now()
      closeExportDialog()
      recordActionTiming("close dialog", closeStartedAt)
    } catch (error) {
      if (!isExportCancelledError(error)) {
        throw error
      }
    } finally {
      const cleanupStartedAt = performance.now()
      exportCancelRequestedRef.current = false
      setExportProgress(null)
      recordActionTiming("cleanup progress state", cleanupStartedAt)
      logExportActionPerformance(exportFormatDraft.toUpperCase(), actionTimings, performance.now() - actionStartedAt)
    }
  }, [
    activeProject,
    activeProject.pages.length,
    activeProjectMetadata.createdAt,
    exportBleedMm,
    exportBleedMmDraft,
    exportFormatDraft,
    exportFilenameDraft,
    exportRegistrationMarksDraft,
    closeExportDialog,
    exportProjectOverride,
    exportIDML,
    exportPDF,
    exportSVG,
    exportViewSettings,
    getDefaultExportFilename,
    normalizedRange.fromPage,
    normalizedRange.toPage,
    onProjectMetadataChange,
    printPresetEnabledDraft,
    jsonCompressionEnabledDraft,
    saveAuthorDraft,
    saveDescriptionDraft,
    saveJSON,
    saveTitleDraft,
    selectedPageCount,
    selectedSinglePage?.id,
    setExportBleedMm,
    setPersistedPrintPresetEnabled,
    setExportRegistrationMarks,
    waitForUiCommit,
  ])

  const parsedDraftBleed = Number(exportBleedMmDraft)
  const resolvedDraftBleedMm = Number.isFinite(parsedDraftBleed) && parsedDraftBleed >= 0 ? parsedDraftBleed : exportBleedMm
  const activePrintPresetDraft = resolveActivePrintPresetKey({
    enabled: printPresetEnabledDraft,
    bleedMm: resolvedDraftBleedMm,
    registrationMarks: exportRegistrationMarksDraft,
  })

  useEffect(() => {
    if (!isExportDialogOpen) return
    const next = normalizeProjectExportPageRange(projectPageCount, exportRangeStartDraft, exportRangeEndDraft)
    if (next.fromPage === exportRangeStartDraft && next.toPage === exportRangeEndDraft) return
    setExportRangeStartDraft(next.fromPage)
    setExportRangeEndDraft(next.toPage)
  }, [exportRangeEndDraft, exportRangeStartDraft, isExportDialogOpen, projectPageCount])

  // Close export dialog on Escape
  useEffect(() => {
    if (!isExportDialogOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        if (exportProgress !== null) {
          cancelExport()
          return
        }
        closeExportDialog()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [cancelExport, closeExportDialog, exportProgress, isExportDialogOpen])

  const requestCloseExportDialog = useCallback(() => {
    if (exportProgress !== null) {
      cancelExport()
      return
    }
    closeExportDialog()
  }, [cancelExport, closeExportDialog, exportProgress])

  return {
    // Save to Library dialog
    isSaveLibraryDialogOpen,
    setIsSaveLibraryDialogOpen,
    openSaveLibraryDialog,
    // JSON export metadata
    saveTitleDraft,
    setSaveTitleDraft: handleSaveTitleChange,
    saveDescriptionDraft,
    setSaveDescriptionDraft,
    saveAuthorDraft,
    setSaveAuthorDraft,
    jsonCompressionEnabledDraft,
    setJsonCompressionEnabledDraft: handleJsonCompressionEnabledChange,
    // Export dialog
    isExportDialogOpen,
    setIsExportDialogOpen,
    closeExportDialog,
    requestCloseExportDialog,
    exportFormatDraft,
    setExportFormatDraft: handleExportFormatChange,
    exportFilenameDraft,
    setExportFilenameDraft,
    exportRangeStartDraft,
    setExportRangeStartDraft: handleExportRangeStartChange,
    exportRangeEndDraft,
    setExportRangeEndDraft: handleExportRangeEndChange,
    pageRangeOptions,
    selectedPageCount,
    activePrintPresetDraft,
    showPrintAdjustmentsDraft: printPresetEnabledDraft,
    exportBleedMmDraft,
    setExportBleedMmDraft,
    exportRegistrationMarksDraft,
    setExportRegistrationMarksDraft,
    exportProgress,
    openExportDialog,
    openExportDialogForProject,
    applyPrintPreset,
    confirmExport,
    defaultExportFilename: getDefaultExportFilename(exportFormatDraft, selectedPageCount),
  }
}
