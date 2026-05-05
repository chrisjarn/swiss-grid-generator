import { renderSvgPageSetFiles, type SvgExportFile, type SvgPageSetRenderOptions } from "@/lib/svg-page-set-export"

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

type SvgWorkerScope = {
  onmessage: ((event: MessageEvent<SvgPageSetWorkerRequest>) => void) | null
  postMessage: (message: SvgPageSetWorkerResponse) => void
}

const workerScope = self as unknown as SvgWorkerScope

workerScope.onmessage = (event: MessageEvent<SvgPageSetWorkerRequest>) => {
  const request = event.data
  void renderSvgPageSetFiles(request.options)
    .then((files) => {
      workerScope.postMessage({
        id: request.id,
        ok: true,
        files,
      })
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.stack || error.message : String(error),
      })
    })
}

export {}
