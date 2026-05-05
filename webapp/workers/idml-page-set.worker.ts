import { buildSwissGridIdmlPageSetArtifacts } from "@/lib/idml/builder"
import type { IdmlPageSetArtifacts, SwissGridIdmlDocument } from "@/lib/idml/types"

type IdmlPageSetWorkerRequest = {
  id: number
  document: SwissGridIdmlDocument
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

type IdmlWorkerScope = {
  onmessage: ((event: MessageEvent<IdmlPageSetWorkerRequest>) => void) | null
  postMessage: (message: IdmlPageSetWorkerResponse, transfer?: Transferable[]) => void
}

const workerScope = self as unknown as IdmlWorkerScope

workerScope.onmessage = (event: MessageEvent<IdmlPageSetWorkerRequest>) => {
  const request = event.data
  void buildSwissGridIdmlPageSetArtifacts(request.document, {
    startPageIndex: request.startPageIndex,
  })
    .then((artifacts) => {
      const transfer = [
        ...artifacts.spreads.map((spread) => spread.bytes.buffer),
        ...artifacts.stories.map((story) => story.bytes.buffer),
      ] as Transferable[]
      workerScope.postMessage({
        id: request.id,
        ok: true,
        artifacts,
      } satisfies IdmlPageSetWorkerResponse, transfer)
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.stack || error.message : String(error),
      } satisfies IdmlPageSetWorkerResponse)
    })
}

export {}
