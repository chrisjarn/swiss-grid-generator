import type { LoadedProject } from "@/core/document/session"
import type { ProjectPageVisibilitySettings } from "@/core/export/project-page-export-source"
import type { LayoutEngineContract } from "@/core/layout/layout-engine-contract"
import type { ExportEngineBleedConfig } from "@/lib/export-engine"

export type PdfExportWorkerRequestPayload = {
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
  logEveryPages?: number
}

export type PdfExportWorkerRequestEnvelope = {
  id: number
  payload: Uint8Array
}

export type EncodedPdfExportWorkerRequest = {
  bytes: Uint8Array
  transfer: Transferable[]
}

function toTransferableBytes(bytes: Uint8Array): EncodedPdfExportWorkerRequest {
  if (
    bytes.byteOffset === 0
    && bytes.buffer instanceof ArrayBuffer
    && bytes.byteLength === bytes.buffer.byteLength
  ) {
    return {
      bytes,
      transfer: [bytes.buffer],
    }
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  return {
    bytes: new Uint8Array(buffer),
    transfer: [buffer],
  }
}

export function encodePdfExportWorkerRequest(
  request: PdfExportWorkerRequestPayload,
): EncodedPdfExportWorkerRequest {
  return toTransferableBytes(new TextEncoder().encode(JSON.stringify(request)))
}

export function decodePdfExportWorkerRequest(
  payload: Uint8Array | ArrayBuffer,
): PdfExportWorkerRequestPayload {
  const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload)
  return JSON.parse(new TextDecoder().decode(bytes)) as PdfExportWorkerRequestPayload
}
