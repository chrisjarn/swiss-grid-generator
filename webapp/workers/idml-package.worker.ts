import { buildSwissGridIdmlPackageFromPageSets } from "@/lib/idml/builder"
import type { IdmlPageSetArtifacts, SwissGridIdmlDocument } from "@/lib/idml/types"

type IdmlPackageWorkerRequest = {
  id: number
  document: SwissGridIdmlDocument
  pageSets: IdmlPageSetArtifacts[]
  compressionLevel?: number
}

type IdmlPackageWorkerResponse =
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

type IdmlPackageWorkerScope = {
  onmessage: ((event: MessageEvent<IdmlPackageWorkerRequest>) => void) | null
  postMessage: (message: IdmlPackageWorkerResponse, transfer?: Transferable[]) => void
}

const workerScope = self as unknown as IdmlPackageWorkerScope

workerScope.onmessage = (event: MessageEvent<IdmlPackageWorkerRequest>) => {
  const request = event.data
  void buildSwissGridIdmlPackageFromPageSets(request.document, request.pageSets, {
    compressionLevel: request.compressionLevel,
  })
    .then((bytes) => {
      workerScope.postMessage({
        id: request.id,
        ok: true,
        bytes,
      }, [bytes.buffer])
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
