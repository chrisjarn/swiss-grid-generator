import type {
  ExportEngineTimingEntry,
  ExportEngineProgress,
  ExportEngineResult,
} from "@/lib/export-engine"
import {
  decodePdfExportWorkerRequest,
  type PdfExportWorkerRequestEnvelope,
} from "@/lib/pdf-export-worker-protocol"
import { runProjectExport } from "@/lib/project-export-runner"

type PdfExportWorkerResponse =
  | {
      id: number
      type: "progress"
      progress: ExportEngineProgress
    }
  | {
      id: number
      type: "done"
      result: ExportEngineResult
    }
  | {
      id: number
      type: "log"
      message: string
    }
  | {
      id: number
      type: "error"
      error: string
    }

type PdfExportWorkerScope = {
  onmessage: ((event: MessageEvent<PdfExportWorkerRequestEnvelope>) => void) | null
  postMessage: (message: PdfExportWorkerResponse, transfer?: Transferable[]) => void
}

const workerScope = self as unknown as PdfExportWorkerScope

workerScope.onmessage = (event: MessageEvent<PdfExportWorkerRequestEnvelope>) => {
  const envelope = event.data
  const decodeStartedAt = performance.now()
  const request = decodePdfExportWorkerRequest(envelope.payload)
  const logEveryPages = request.logEveryPages
  const protocolTimings: ExportEngineTimingEntry[] = [{
    label: "pdf worker request decode",
    durationMs: performance.now() - decodeStartedAt,
    extra: `bytes=${envelope.payload.byteLength}`,
  }]
  void runProjectExport({
    formats: ["pdf"],
    project: request.project,
    pageNumbers: request.pageNumbers,
    visibilitySettings: request.visibilitySettings,
    metadata: request.metadata,
    baseName: request.baseName,
    filenames: { pdf: request.filename },
    bleed: request.bleed,
    layoutEngine: request.layoutEngine,
    onLog: (message) => {
      workerScope.postMessage({
        id: envelope.id,
        type: "log",
        message,
      })
    },
    shouldLogPage: logEveryPages
      ? (completed, total) => completed === 1 || completed === total || completed % logEveryPages === 0
      : undefined,
    onProgress: (progress) => {
      workerScope.postMessage({
        id: envelope.id,
        type: "progress",
        progress,
      })
    },
  })
    .then((result) => {
      const engineResult: ExportEngineResult = {
        outputs: result.outputs,
        timings: [
          ...protocolTimings,
          ...result.timings,
        ],
        totalDurationMs: result.totalDurationMs,
      }
      const transfer = engineResult.outputs
        .filter((output) => "bytes" in output)
        .map((output) => output.bytes.buffer) as Transferable[]
      workerScope.postMessage({
        id: envelope.id,
        type: "done",
        result: engineResult,
      }, transfer)
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        id: envelope.id,
        type: "error",
        error: error instanceof Error ? error.stack || error.message : String(error),
      })
    })
}

export {}
