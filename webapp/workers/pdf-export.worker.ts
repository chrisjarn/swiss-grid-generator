import type { LoadedProject } from "@/lib/document-session"
import type {
  ExportEngineBleedConfig,
  ExportEngineProgress,
  ExportEngineResult,
} from "@/lib/export-engine"
import type { LayoutEngineContract } from "@/lib/layout-engine-contract"
import type { ProjectPageVisibilitySettings } from "@/lib/project-page-export-source"
import { runProjectExport } from "@/lib/project-export-runner"

type PdfExportWorkerRequest = {
  id: number
  project: LoadedProject<Record<string, unknown>>
  pageNumbers: number[]
  visibilitySettings: ProjectPageVisibilitySettings
  metadata: {
    title: string
    description: string
    author: string
    createdAt: string
  }
  baseName: string
  filename: string
  bleed: ExportEngineBleedConfig
  layoutEngine?: LayoutEngineContract
}

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
      type: "error"
      error: string
    }

type PdfExportWorkerScope = {
  onmessage: ((event: MessageEvent<PdfExportWorkerRequest>) => void) | null
  postMessage: (message: PdfExportWorkerResponse, transfer?: Transferable[]) => void
}

const workerScope = self as unknown as PdfExportWorkerScope

workerScope.onmessage = (event: MessageEvent<PdfExportWorkerRequest>) => {
  const request = event.data
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
    onProgress: (progress) => {
      workerScope.postMessage({
        id: request.id,
        type: "progress",
        progress,
      })
    },
  })
    .then((result) => {
      const engineResult: ExportEngineResult = {
        outputs: result.outputs,
        timings: result.timings,
        totalDurationMs: result.totalDurationMs,
      }
      const transfer = engineResult.outputs
        .filter((output) => "bytes" in output)
        .map((output) => output.bytes.buffer) as Transferable[]
      workerScope.postMessage({
        id: request.id,
        type: "done",
        result: engineResult,
      }, transfer)
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        id: request.id,
        type: "error",
        error: error instanceof Error ? error.stack || error.message : String(error),
      })
    })
}

export {}
