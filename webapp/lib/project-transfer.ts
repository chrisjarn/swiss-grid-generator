import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate"

import type { LoadedProject } from "@/core/document/session"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/core/layout/layout-engine-contract"
import { stripSessionUiSettings } from "@/core/document/ui-settings-resolver"

export const PROJECT_JSON_EXTENSION = ".json"
export const PROJECT_ARCHIVE_EXTENSION = ".swissgridgenerator"
export const PROJECT_JSON_MIME_TYPE = "application/json"
export const PROJECT_ARCHIVE_MIME_TYPE = "application/gzip"

const GZIP_MAGIC_BYTE_0 = 0x1f
const GZIP_MAGIC_BYTE_1 = 0x8b

export type ProjectTransferPayload = Record<string, unknown> & {
  schemaVersion: 2
  exportedAt: string
  title: string
  description: string
  author: string
  createdAt?: string
  layoutEngine: LayoutEngineContract
  visibilitySettings: LoadedProject<unknown>["visibilitySettings"]
  pages: Array<Record<string, unknown>>
  tour?: Record<string, unknown>
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function toUint8Array(source: ArrayBuffer | Uint8Array): Uint8Array {
  return source instanceof Uint8Array ? source : new Uint8Array(source)
}

function stripByteOrderMark(source: string): string {
  return source.replace(/^\uFEFF/, "")
}

export function isCompressedProjectBytes(source: ArrayBuffer | Uint8Array): boolean {
  const bytes = toUint8Array(source)
  return bytes[0] === GZIP_MAGIC_BYTE_0 && bytes[1] === GZIP_MAGIC_BYTE_1
}

export function parseProjectTransferPayloadText(source: string): ProjectTransferPayload {
  return JSON.parse(stripByteOrderMark(source)) as ProjectTransferPayload
}

export function parseProjectTransferPayloadBytes(source: ArrayBuffer | Uint8Array): ProjectTransferPayload {
  const bytes = toUint8Array(source)
  const decodedBytes = isCompressedProjectBytes(bytes) ? gunzipSync(bytes) : bytes
  return parseProjectTransferPayloadText(strFromU8(decodedBytes))
}

export function buildProjectTransferPayload<Layout>(
  project: LoadedProject<Layout>,
  exportedAt = new Date().toISOString(),
): ProjectTransferPayload {
  const pages = project.pages.map((page) => ({
    ...page,
    uiSettings: stripSessionUiSettings(page.uiSettings),
  })) as Array<Record<string, unknown>>

  return {
    schemaVersion: 2,
    exportedAt,
    title: project.metadata.title,
    description: project.metadata.description,
    author: project.metadata.author,
    createdAt: project.metadata.createdAt,
    layoutEngine: project.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
    visibilitySettings: project.visibilitySettings,
    pages,
    tour: project.tour ? project.tour as Record<string, unknown> : undefined,
  }
}

export function encodeProjectTransferPayload(
  payload: ProjectTransferPayload,
  compressed: boolean,
): {
  bytes: Uint8Array
  extension: string
  mimeType: string
} {
  const sourceBytes = strToU8(`${JSON.stringify(payload, null, 2)}\n`)
  if (!compressed) {
    return {
      bytes: sourceBytes,
      extension: PROJECT_JSON_EXTENSION,
      mimeType: PROJECT_JSON_MIME_TYPE,
    }
  }

  return {
    bytes: gzipSync(sourceBytes),
    extension: PROJECT_ARCHIVE_EXTENSION,
    mimeType: PROJECT_ARCHIVE_MIME_TYPE,
  }
}
