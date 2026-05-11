import type { LoadedProject } from "@/core/document/session"
import type { ProjectPageVisibilitySettings } from "@/core/export/project-page-export-source"
import type {
  ExportEngineProgress,
  ExportEngineResult,
  ExportEngineTimingEntry,
} from "@/lib/export-engine"
import type { ExportBleedOptions } from "@/lib/export-format-options"
import { resolveExportBaseName } from "@/lib/export-format-options"
import { encodePdfExportWorkerRequest } from "@/lib/pdf-export-worker-protocol"
import { runProjectExport } from "@/lib/project-export-runner"

export type PdfExportWorkerMetadata = {
  title: string
  description: string
  author: string
  createdAt: string
}

export type RunPdfExportInBrowserWorkerOptions = {
  project: LoadedProject<Record<string, unknown>>
  pageNumbers: readonly number[]
  visibilitySettings: ProjectPageVisibilitySettings
  filename: string
  bleed: ExportBleedOptions
  metadata: PdfExportWorkerMetadata
  onProgress?: (progress: ExportEngineProgress) => void
  onLog?: (message: string) => void
  logEveryPages?: number
  assertNotCancelled?: () => void
  onWorkerReady?: (worker: Worker, reject: (error: Error) => void) => void
  onWorkerSettled?: (worker: Worker) => void
}

type PdfExportWorkerResponse =
  | { id: number; type: "progress"; progress: ExportEngineProgress }
  | { id: number; type: "log"; message: string }
  | { id: number; type: "done"; result: ExportEngineResult }
  | { id: number; type: "error"; error: string }

function createPdfExportWorker(): Worker {
  return new Worker(new URL("../workers/pdf-export.worker.ts", import.meta.url), { type: "module" })
}

export function runPdfExportInBrowserWorker({
  project,
  pageNumbers,
  visibilitySettings,
  filename,
  bleed,
  metadata,
  onProgress,
  onLog,
  logEveryPages,
  assertNotCancelled,
  onWorkerReady,
  onWorkerSettled,
}: RunPdfExportInBrowserWorkerOptions): Promise<ExportEngineResult> {
  if (typeof Worker === "undefined") {
    return runProjectExport({
      formats: ["pdf"],
      project,
      pageNumbers,
      visibilitySettings,
      metadata,
      baseName: resolveExportBaseName(filename),
      filenames: { pdf: filename },
      bleed,
      onProgress,
      onLog,
      shouldLogPage: logEveryPages
        ? (completed, total) => completed === 1 || completed === total || completed % logEveryPages === 0
        : undefined,
      assertNotCancelled,
    })
  }

  return new Promise<ExportEngineResult>((resolve, reject) => {
    const workerStartedAt = performance.now()
    const transportTimings: ExportEngineTimingEntry[] = []
    const recordTransportTiming = (label: string, startedAt: number, extra = "") => {
      transportTimings.push({
        label,
        durationMs: performance.now() - startedAt,
        extra,
      })
    }
    const baseName = resolveExportBaseName(filename)
    const encodeStartedAt = performance.now()
    const encodedRequest = encodePdfExportWorkerRequest({
      project,
      pageNumbers: [...pageNumbers],
      visibilitySettings,
      metadata,
      baseName,
      filename,
      bleed,
      layoutEngine: project.layoutEngine,
      logEveryPages,
    })
    const encodedByteLength = encodedRequest.bytes.byteLength
    recordTransportTiming("pdf worker request encode", encodeStartedAt, `bytes=${encodedByteLength}`)
    const workerCreateStartedAt = performance.now()
    const worker = createPdfExportWorker()
    recordTransportTiming("pdf worker create", workerCreateStartedAt)
    const requestId = 1
    let settled = false
    let requestPostedAt = 0
    let firstResponseRecorded = false
    const cleanup = () => {
      onWorkerSettled?.(worker)
      worker.terminate()
    }
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    onWorkerReady?.(worker, fail)
    worker.onmessage = (event: MessageEvent<PdfExportWorkerResponse>) => {
      const response = event.data
      if (response.id !== requestId || settled) return
      if (!firstResponseRecorded) {
        firstResponseRecorded = true
        recordTransportTiming("pdf worker first response", requestPostedAt)
      }
      if (response.type === "progress") {
        onProgress?.(response.progress)
        return
      }
      if (response.type === "log") {
        onLog?.(response.message)
        return
      }
      if (response.type === "error") {
        fail(new Error(response.error))
        return
      }
      settled = true
      recordTransportTiming("pdf worker total", workerStartedAt)
      const result: ExportEngineResult = {
        ...response.result,
        timings: [
          ...transportTimings,
          ...response.result.timings,
        ],
        totalDurationMs: performance.now() - workerStartedAt,
      }
      cleanup()
      resolve(result)
    }
    worker.onerror = (event) => {
      fail(new Error(event.message || "PDF export worker failed."))
    }
    assertNotCancelled?.()
    requestPostedAt = performance.now()
    worker.postMessage({
      id: requestId,
      payload: encodedRequest.bytes,
    }, encodedRequest.transfer)
    recordTransportTiming("pdf worker request post", requestPostedAt, `bytes=${encodedByteLength}`)
  })
}
