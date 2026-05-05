import { strToU8, zipSync } from "fflate"
import type { SvgExportFile } from "@/lib/svg-page-set-export"

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

type SvgZipWorkerScope = {
  onmessage: ((event: MessageEvent<SvgZipWorkerRequest>) => void) | null
  postMessage: (message: SvgZipWorkerResponse, transfer?: Transferable[]) => void
}

const workerScope = self as unknown as SvgZipWorkerScope

workerScope.onmessage = (event: MessageEvent<SvgZipWorkerRequest>) => {
  const request = event.data
  try {
    const zipEntries = Object.fromEntries(request.files.map((file) => [file.filename, strToU8(file.text)]))
    const bytes = zipSync(zipEntries)
    workerScope.postMessage({
      id: request.id,
      ok: true,
      bytes,
    }, [bytes.buffer])
  } catch (error: unknown) {
    workerScope.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
    })
  }
}

export {}
