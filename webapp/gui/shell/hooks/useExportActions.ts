import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { flushSync } from "react-dom"
import type { ExportEngineProgress, ExportEngineResult } from "@/lib/export-engine"
import { type LoadedProject, type ProjectVisibilitySettings } from "@/lib/document-session"
import {
  DEFAULT_EXPORT_BLEED_OPTIONS,
  type ExportBleedOptions,
  type ExportFormat,
  type VectorExportFormat,
  EXPORT_DOWNLOAD_EXTENSION_PATTERN,
  normalizeExportBleedOptions,
  resolveExportBaseName,
  resolveExportDownloadExtension,
  supportsExportBleed,
} from "@/lib/export-format-options"
import { toProjectFilename } from "@/lib/project-file-naming"
import {
  buildProjectTransferPayload,
  encodeProjectTransferPayload,
  toArrayBuffer,
} from "@/lib/project-transfer"
import {
  getProjectExportFontWarmupSignature,
  warmDefaultExportFonts,
  warmProjectExportFonts,
} from "@/lib/export-font-warmup"
import {
  buildProjectExportPageNumbersFromRange,
  filterProjectByExportPageNumbers,
  formatProjectExportPageSelection,
  parseProjectExportPageSelectionDraft,
  resolveProjectExportPageSelection,
  type ProjectPageVisibilitySettings,
} from "@/lib/project-page-export-source"
import { runProjectExport } from "@/lib/project-export-runner"
import { translateMessage } from "@/lib/i18n/messages"

export type ExportProgressState = {
  format: ExportFormat
  completedSteps: number
  totalSteps: number
  currentPageNumber: number
  currentLabel: string
  phase: "preparing" | "rendering" | "packaging"
}

type ExportMetadataDraft = {
  title: string
  description: string
  author: string
  createdAt: string
}

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

function updateFilenameForExport(
  current: string,
  format: ExportFormat,
  selectedPageCount: number,
  getDefaultExportFilename: (format: ExportFormat, selectedPageCount: number) => string,
): string {
  const trimmed = current.trim()
  const extension = resolveExportDownloadExtension(format, selectedPageCount)
  if (!trimmed) return getDefaultExportFilename(format, selectedPageCount)
  if (EXPORT_DOWNLOAD_EXTENSION_PATTERN.test(trimmed)) {
    return trimmed.replace(EXPORT_DOWNLOAD_EXTENSION_PATTERN, extension)
  }
  return `${trimmed}${extension}`
}

function getVectorExportLogLabel(format: VectorExportFormat): string {
  return format.toUpperCase()
}

function shouldForceVectorProgress(format: VectorExportFormat, progress: ExportProgressState): boolean {
  void format
  if (progress.phase === "preparing" || progress.phase === "packaging") return true
  return progress.completedSteps === 1 || progress.completedSteps === progress.totalSteps
}

export type ExportActionsContext = {
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
  onProjectVisibilityToggle: (key: keyof ProjectVisibilitySettings) => void
  getCurrentProjectSnapshot: () => LoadedProject<Record<string, unknown>>
}

export function useExportActions(ctx: ExportActionsContext) {
  const {
    defaultPdfFilename,
    defaultIdmlFilename,
    defaultJsonFilename,
    projectMetadata,
    onProjectMetadataChange,
    onProjectVisibilityToggle,
    getCurrentProjectSnapshot,
  } = ctx
  const [isSaveLibraryDialogOpen, setIsSaveLibraryDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFormatDraft, setExportFormatDraft] = useState<ExportFormat>("pdf")
  const [exportFilenameDraft, setExportFilenameDraft] = useState("")
  const [bleedEnabledDraft, setBleedEnabledDraft] = useState(DEFAULT_EXPORT_BLEED_OPTIONS.enabled)
  const [bleedWidthMmDraft, setBleedWidthMmDraft] = useState(String(DEFAULT_EXPORT_BLEED_OPTIONS.widthMm))
  const [exportRangeStartDraft, setExportRangeStartDraft] = useState(1)
  const [exportPageNumbersDraft, setExportPageNumbersDraft] = useState<number[]>([1])
  const [exportRangeDraft, setExportRangeDraft] = useState("1-1")
  const [exportProgress, setExportProgress] = useState<ExportProgressState | null>(null)
  const exportCancelRequestedRef = useRef(false)
  const exportInFlightRef = useRef(false)
  const currentExportWorkerRef = useRef<Worker | null>(null)
  const currentExportRejectRef = useRef<((error: Error) => void) | null>(null)
  const [saveTitleDraft, setSaveTitleDraft] = useState("")
  const [saveDescriptionDraft, setSaveDescriptionDraft] = useState("")
  const [saveAuthorDraft, setSaveAuthorDraft] = useState("")
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

  const getDefaultVectorBleedDraft = useCallback(() => normalizeExportBleedOptions({
    enabled: DEFAULT_EXPORT_BLEED_OPTIONS.enabled,
    widthMm: DEFAULT_EXPORT_BLEED_OPTIONS.widthMm,
    fallbackWidthMm: DEFAULT_EXPORT_BLEED_OPTIONS.widthMm,
  }), [])

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
        visibilitySettings: currentProject.visibilitySettings,
      })
      if (signature === warmedProjectFontSignatureRef.current) return
      warmedProjectFontSignatureRef.current = signature
      void warmProjectExportFonts({
        project: currentProject,
        range,
        visibilitySettings: currentProject.visibilitySettings,
      })
    }, 650)
    return () => window.clearTimeout(timeoutId)
  }, [currentProject])

  const selectedPageNumbers = useMemo(() => (
    resolveProjectExportPageSelection(projectPageCount, exportPageNumbersDraft).pageNumbers
  ), [exportPageNumbersDraft, projectPageCount])

  const selectedPageCount = selectedPageNumbers.length

  const getDefaultExportFilename = useCallback((format: ExportFormat, selectedPages: number) => {
    const base = format === "svg"
      ? ctx.defaultSvgFilename
      : format === "idml"
        ? defaultIdmlFilename
        : format === "json"
          ? defaultJsonFilename
        : defaultPdfFilename
    const extension = resolveExportDownloadExtension(format, selectedPages)
    const fallbackStem = resolveExportBaseName(base)
    return toProjectFilename(activeProjectMetadata.title, fallbackStem, extension)
  }, [
    activeProjectMetadata.title,
    ctx.defaultSvgFilename,
    defaultIdmlFilename,
    defaultJsonFilename,
    defaultPdfFilename,
  ])

  const updateFilenameForFormat = useCallback((
    current: string,
    format: ExportFormat,
    selectedPages: number,
  ) => (
    updateFilenameForExport(current, format, selectedPages, getDefaultExportFilename)
  ), [getDefaultExportFilename])

  const saveJSON = useCallback(
    (
      filename: string,
      projectSnapshot: LoadedProject<Record<string, unknown>>,
      metadata: { title: string; description: string; author: string; createdAt: string },
    ) => {
      const trimmed = filename.trim()
      if (!trimmed) return
      const payload = buildProjectTransferPayload({
        ...projectSnapshot,
        pages: projectSnapshot.pages,
        metadata,
        tour: projectSnapshot.tour ?? null,
      })
      const encoded = encodeProjectTransferPayload(payload, false)
      const normalizedFilename = updateFilenameForExport(
        trimmed,
        "json",
        projectSnapshot.pages.length,
        getDefaultExportFilename,
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
    const basePdfStem = resolveExportBaseName(defaultPdfFilename)

    setExportFormatDraft("pdf")
    setExportRangeStartDraft(defaultRange.fromPage)
    const defaultPageNumbers = buildProjectExportPageNumbersFromRange(projectPageCount, defaultRange)
    setExportPageNumbersDraft(defaultPageNumbers)
    setExportRangeDraft(formatProjectExportPageSelection(defaultPageNumbers))
    const defaultBleed = getDefaultVectorBleedDraft()
    setBleedEnabledDraft(defaultBleed.enabled)
    setBleedWidthMmDraft(String(defaultBleed.widthMm))
    setExportFilenameDraft(toProjectFilename(currentProject.metadata.title, basePdfStem, ".pdf"))
    setSaveTitleDraft(currentProject.metadata.title ?? "")
    setSaveDescriptionDraft(currentProject.metadata.description ?? "")
    setSaveAuthorDraft(currentProject.metadata.author ?? "")
    setIsExportDialogOpen(true)
    void warmProjectExportFonts({
      project: currentProject,
      range: defaultRange,
      visibilitySettings: currentProject.visibilitySettings,
    })
  }, [
    currentProject,
    defaultPdfFilename,
    getDefaultVectorBleedDraft,
    projectPageCount,
  ])

  const openExportDialogForProject = useCallback((project: LoadedProject<Record<string, unknown>>) => {
    setExportProjectOverride(project)
    const defaultRange = { fromPage: 1, toPage: project.pages.length }

    setExportFormatDraft("pdf")
    setExportRangeStartDraft(defaultRange.fromPage)
    const defaultPageNumbers = buildProjectExportPageNumbersFromRange(project.pages.length, defaultRange)
    setExportPageNumbersDraft(defaultPageNumbers)
    setExportRangeDraft(formatProjectExportPageSelection(defaultPageNumbers))
    const defaultBleed = getDefaultVectorBleedDraft()
    setBleedEnabledDraft(defaultBleed.enabled)
    setBleedWidthMmDraft(String(defaultBleed.widthMm))
    const basePdfStem = resolveExportBaseName(defaultPdfFilename)
    setExportFilenameDraft(toProjectFilename(project.metadata.title, basePdfStem, ".pdf"))
    setSaveTitleDraft(project.metadata.title ?? "")
    setSaveDescriptionDraft(project.metadata.description ?? "")
    setSaveAuthorDraft(project.metadata.author ?? "")
    setIsExportDialogOpen(true)
    void warmProjectExportFonts({
      project,
      range: defaultRange,
      visibilitySettings: project.visibilitySettings,
    })
  }, [
    defaultPdfFilename,
    getDefaultVectorBleedDraft,
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
    currentExportWorkerRef.current?.terminate()
    currentExportWorkerRef.current = null
    currentExportRejectRef.current?.(new ExportCancelledError())
    currentExportRejectRef.current = null
    setExportProgress((current) => (
      current
        ? {
            ...current,
            currentLabel: translateMessage("status.export.cancelling"),
          }
        : current
    ))
  }, [])

  const setBleedEnabledDraftWithDefaultWidth = useCallback((enabled: boolean) => {
    setBleedEnabledDraft(enabled)
    if (!enabled) return
    setBleedWidthMmDraft((current) => {
      const width = Number(current)
      if (Number.isFinite(width) && width > 0) return current
      return String(DEFAULT_EXPORT_BLEED_OPTIONS.widthMm)
    })
  }, [])

  const runPdfExportInBrowserWorker = useCallback(({
    project,
    pageNumbers,
    visibilitySettings,
    filename,
    bleed,
    exportMetadata,
    onProgress,
  }: {
    project: LoadedProject<Record<string, unknown>>
    pageNumbers: readonly number[]
    visibilitySettings: ProjectPageVisibilitySettings
    filename: string
    bleed: ExportBleedOptions
    exportMetadata: ExportMetadataDraft
    onProgress: (progress: ExportEngineProgress) => void
  }): Promise<ExportEngineResult> => {
    if (typeof Worker === "undefined") {
      return runProjectExport({
        formats: ["pdf"],
        project,
        pageNumbers,
        visibilitySettings,
        metadata: exportMetadata,
        baseName: resolveExportBaseName(filename),
        filenames: { pdf: filename },
        bleed,
        onProgress,
        assertNotCancelled: throwIfExportCancelled,
      })
    }

    return new Promise<ExportEngineResult>((resolve, reject) => {
      const worker = new Worker(new URL("../../../workers/pdf-export.worker.ts", import.meta.url), { type: "module" })
      const requestId = 1
      let settled = false
      const cleanup = () => {
        if (currentExportWorkerRef.current === worker) {
          currentExportWorkerRef.current = null
          currentExportRejectRef.current = null
        }
        worker.terminate()
      }
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      }
      currentExportWorkerRef.current = worker
      currentExportRejectRef.current = fail
      worker.onmessage = (event: MessageEvent<
        | { id: number; type: "progress"; progress: ExportEngineProgress }
        | { id: number; type: "done"; result: ExportEngineResult }
        | { id: number; type: "error"; error: string }
      >) => {
        const response = event.data
        if (response.id !== requestId || settled) return
        if (response.type === "progress") {
          onProgress(response.progress)
          return
        }
        if (response.type === "error") {
          fail(new Error(response.error))
          return
        }
        settled = true
        cleanup()
        resolve(response.result)
      }
      worker.onerror = (event) => {
        fail(new Error(event.message || "PDF export worker failed."))
      }
      worker.postMessage({
        id: requestId,
        project,
        pageNumbers: [...pageNumbers],
        visibilitySettings,
        metadata: exportMetadata,
        baseName: resolveExportBaseName(filename),
        filename,
        bleed,
        layoutEngine: project.layoutEngine,
      })
    })
  }, [throwIfExportCancelled])

  const exportVector = useCallback(async (
    format: VectorExportFormat,
    project: LoadedProject<Record<string, unknown>>,
    pageNumbers: readonly number[],
    visibilitySettings: ProjectPageVisibilitySettings,
    filename: string,
    bleed: ExportBleedOptions,
    exportMetadata: ExportMetadataDraft,
  ) => {
    if (project.pages.length === 0) return
    const label = getVectorExportLogLabel(format)
    const publishProgress = createProgressPublisher()
    const onProgress = (progress: ExportEngineProgress) => {
      const force = shouldForceVectorProgress(format, progress)
      if (!shouldForwardExportProgress(progress, force)) return undefined
      publishProgressWithoutBlockingExport(publishProgress, progress, force)
      return undefined
    }
    const result = format === "pdf"
      ? await runPdfExportInBrowserWorker({
          project,
          pageNumbers,
          visibilitySettings,
          filename,
          bleed,
          exportMetadata,
          onProgress,
        })
      : await runProjectExport({
          formats: [format],
          project,
          pageNumbers,
          visibilitySettings,
          metadata: exportMetadata,
          baseName: resolveExportBaseName(filename),
          filenames: { [format]: filename },
          bleed,
          svgPackaging: format === "svg" ? "zip" : undefined,
          onProgress,
          assertNotCancelled: throwIfExportCancelled,
        })
    logExportEnginePerformance(label, result)
    const output = result.outputs[0]
    if (
      (format === "svg" && output?.format === "svg" && output.packaging === "zip")
      || (format !== "svg" && output?.format === format)
    ) {
      const downloadStartedAt = performance.now()
      downloadBytes(output.bytes, output.mimeType, output.filename)
      logExportDownloadPerformance(label, performance.now() - downloadStartedAt, output.bytes.byteLength)
    }
  }, [createProgressPublisher, downloadBytes, runPdfExportInBrowserWorker, throwIfExportCancelled])

  const handleExportFormatChange = useCallback((format: ExportFormat) => {
    setExportFormatDraft(format)
    setExportFilenameDraft((current) => updateFilenameForFormat(current, format, selectedPageCount))
  }, [selectedPageCount, updateFilenameForFormat])

  const toggleExportVisibility = useCallback((key: keyof ProjectVisibilitySettings) => {
    if (exportProjectOverride) {
      setExportProjectOverride((current) => current ? {
        ...current,
        visibilitySettings: {
          ...current.visibilitySettings,
          [key]: !current.visibilitySettings[key],
        },
      } : current)
      return
    }
    onProjectVisibilityToggle(key)
  }, [exportProjectOverride, onProjectVisibilityToggle])

  const applyExportPageSelection = useCallback((pageNumbers: readonly number[]) => {
    const normalized = resolveProjectExportPageSelection(projectPageCount, pageNumbers)
    setExportPageNumbersDraft(normalized.pageNumbers)
    setExportRangeStartDraft(normalized.fromPage)
    setExportRangeDraft(formatProjectExportPageSelection(normalized.pageNumbers))
    setExportFilenameDraft((current) => updateFilenameForFormat(
      current,
      exportFormatDraft,
      normalized.pageNumbers.length,
    ))
  }, [exportFormatDraft, projectPageCount, updateFilenameForFormat])

  const handleExportRangeDraftChange = useCallback((value: string) => {
    setExportRangeDraft(value)
    const parsed = parseProjectExportPageSelectionDraft(value, projectPageCount)
    if (!parsed) return
    applyExportPageSelection(parsed.pageNumbers)
  }, [applyExportPageSelection, projectPageCount])

  const commitExportRangeDraft = useCallback(() => {
    const parsed = parseProjectExportPageSelectionDraft(exportRangeDraft, projectPageCount)
    if (parsed) {
      applyExportPageSelection(parsed.pageNumbers)
      return true
    }
    setExportRangeDraft(formatProjectExportPageSelection(selectedPageNumbers))
    return false
  }, [
    applyExportPageSelection,
    exportRangeDraft,
    projectPageCount,
    selectedPageNumbers,
  ])

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
    const parsedPageSelection = parseProjectExportPageSelectionDraft(exportRangeDraft, projectPageCount)
    if (!parsedPageSelection) {
      setExportRangeDraft(formatProjectExportPageSelection(selectedPageNumbers))
      return
    }
    const exportSelectedPageCount = parsedPageSelection.pageNumbers.length
    if (exportFormatDraft !== "json" && exportSelectedPageCount === 0) return

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
      const selectedProject = filterProjectByExportPageNumbers(activeProject, parsedPageSelection.pageNumbers)
      const filename = updateFilenameForExport(
        trimmedName,
        exportFormatDraft,
        selectedProject.pages.length,
        getDefaultExportFilename,
      )
      saveJSON(filename, selectedProject, normalizedMetadata)
      if (!exportProjectOverride) {
        onProjectMetadataChange(normalizedMetadata)
      }
      closeExportDialog()
      recordActionTiming("json save and close", jsonStartedAt)
      logExportActionPerformance("JSON", actionTimings, performance.now() - actionStartedAt)
      return
    }

    exportCancelRequestedRef.current = false
    exportInFlightRef.current = true

    const progressStartedAt = performance.now()
    flushSync(() => {
      setExportProgress({
        format: exportFormatDraft,
        completedSteps: 0,
        totalSteps: exportSelectedPageCount,
        currentPageNumber: parsedPageSelection.fromPage,
        currentLabel: translateMessage("status.export.preparing"),
        phase: "preparing",
      })
    })
    await waitForUiCommit()
    recordActionTiming("initial progress paint", progressStartedAt)

    const optionsStartedAt = performance.now()
    const filename = updateFilenameForExport(
      trimmedName,
      exportFormatDraft,
      exportSelectedPageCount,
      getDefaultExportFilename,
    )
    const currentProjectSnapshot = activeProject
    const bleed = normalizeExportBleedOptions({
      enabled: supportsExportBleed(exportFormatDraft) && bleedEnabledDraft,
      widthMm: Number(bleedWidthMmDraft),
      fallbackWidthMm: DEFAULT_EXPORT_BLEED_OPTIONS.widthMm,
    })
    recordActionTiming("export options prepare", optionsStartedAt)

    try {
      if (supportsExportBleed(exportFormatDraft)) {
        const exportStartedAt = performance.now()
        if (exportFormatDraft === "idml") {
          setExportProgress((current) => current ? {
            ...current,
            totalSteps: exportSelectedPageCount,
            currentPageNumber: parsedPageSelection.fromPage,
            currentLabel: currentProjectSnapshot.pages[parsedPageSelection.fromPage - 1]?.name || translateMessage("status.export.preparingIdml"),
          } : current)
        }
        await exportVector(exportFormatDraft, currentProjectSnapshot, parsedPageSelection.pageNumbers, currentProjectSnapshot.visibilitySettings, filename, bleed, normalizedMetadata)
        recordActionTiming(`${exportFormatDraft} engine and download`, exportStartedAt)
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
      exportInFlightRef.current = false
      currentExportWorkerRef.current?.terminate()
      currentExportWorkerRef.current = null
      currentExportRejectRef.current = null
      setExportProgress(null)
      recordActionTiming("cleanup progress state", cleanupStartedAt)
      logExportActionPerformance(exportFormatDraft.toUpperCase(), actionTimings, performance.now() - actionStartedAt)
    }
  }, [
    activeProject,
    activeProjectMetadata.createdAt,
    bleedEnabledDraft,
    bleedWidthMmDraft,
    exportFormatDraft,
    exportFilenameDraft,
    exportRangeDraft,
    closeExportDialog,
    exportProjectOverride,
    exportVector,
    getDefaultExportFilename,
    projectPageCount,
    onProjectMetadataChange,
    saveAuthorDraft,
    saveDescriptionDraft,
    saveJSON,
    saveTitleDraft,
    selectedPageNumbers,
    waitForUiCommit,
  ])

  useEffect(() => {
    if (!isExportDialogOpen) return
    const next = resolveProjectExportPageSelection(projectPageCount, exportPageNumbersDraft)
    const isSameSelection = next.pageNumbers.length === exportPageNumbersDraft.length
      && next.pageNumbers.every((pageNumber, index) => pageNumber === exportPageNumbersDraft[index])
    if (isSameSelection && next.fromPage === exportRangeStartDraft) return
    setExportPageNumbersDraft(next.pageNumbers)
    setExportRangeStartDraft(next.fromPage)
    setExportRangeDraft(formatProjectExportPageSelection(next.pageNumbers))
  }, [exportPageNumbersDraft, exportRangeStartDraft, isExportDialogOpen, projectPageCount])

  // Close export dialog on Escape
  useEffect(() => {
    if (!isExportDialogOpen) return
    const isEscapeKey = (event: KeyboardEvent) =>
      event.key === "Escape" || event.key === "Esc" || event.code === "Escape"
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isEscapeKey(event)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      if (exportInFlightRef.current) {
        cancelExport()
        return
      }
      closeExportDialog()
    }
    window.addEventListener("keydown", onKeyDown, { capture: true })
    document.addEventListener("keydown", onKeyDown, { capture: true })
    window.addEventListener("keyup", onKeyDown, { capture: true })
    document.addEventListener("keyup", onKeyDown, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true })
      document.removeEventListener("keydown", onKeyDown, { capture: true })
      window.removeEventListener("keyup", onKeyDown, { capture: true })
      document.removeEventListener("keyup", onKeyDown, { capture: true })
    }
  }, [cancelExport, closeExportDialog, isExportDialogOpen])

  const requestCloseExportDialog = useCallback(() => {
    if (exportInFlightRef.current) {
      cancelExport()
      return
    }
    closeExportDialog()
  }, [cancelExport, closeExportDialog])

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
    // Export dialog
    isExportDialogOpen,
    setIsExportDialogOpen,
    closeExportDialog,
    requestCloseExportDialog,
    exportFormatDraft,
    setExportFormatDraft: handleExportFormatChange,
    exportFilenameDraft,
    setExportFilenameDraft,
    exportRangeDraft,
    setExportRangeDraft: handleExportRangeDraftChange,
    commitExportRangeDraft,
    exportRangeStartDraft,
    previewProject: activeProject,
    visibilitySettings: activeProject.visibilitySettings,
    toggleExportVisibility,
    selectedPageCount,
    bleedEnabledDraft,
    setBleedEnabledDraft: setBleedEnabledDraftWithDefaultWidth,
    bleedWidthMmDraft,
    setBleedWidthMmDraft,
    exportProgress,
    openExportDialog,
    openExportDialogForProject,
    confirmExport,
    defaultExportFilename: getDefaultExportFilename(exportFormatDraft, selectedPageCount),
  }
}
