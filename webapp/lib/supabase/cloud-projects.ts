import type { SupabaseClient } from "@supabase/supabase-js"

import { parseLoadedProject, type LoadedProject } from "@/lib/document-session"
import {
  buildProjectTransferPayload,
  encodeProjectTransferPayload,
  parseProjectTransferPayloadBytes,
  PROJECT_ARCHIVE_MIME_TYPE,
  type ProjectTransferPayload,
} from "@/lib/project-transfer"
import { encodeChecksumSidecar, readChecksumSidecar, sha256Hex } from "@/lib/cloud-sync/hash"

export const CLOUD_PROJECT_ARCHIVE_BUCKET = "project-archives"
const CLOUD_PROJECT_CHECKSUM_CONTENT_TYPE = "text/plain;charset=utf-8"
const MAX_UPLOAD_ECHO_VALIDATION_BYTES = 20 * 1024 * 1024

export type CloudProjectRow = {
  id: string
  owner_user_id: string
  title: string
  description: string
  author: string
  created_at: string
  updated_at: string
  last_synced_at: string | null
  revision: number
  archive_path: string
  archive_size_bytes: number | null
  archived_content_type: string
  deleted_at: string | null
}

export class CloudProjectConflictError extends Error {
  constructor() {
    super("Cloud project revision conflict.")
    this.name = "CloudProjectConflictError"
  }
}

export class CloudProjectIntegrityError extends Error {
  constructor(message = "Cloud project archive checksum validation failed.") {
    super(message)
    this.name = "CloudProjectIntegrityError"
  }
}

function createCloudProjectId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `cloud-${Date.now()}`
}

function createArchivePath(ownerUserId: string, remoteProjectId: string, revision: number): string {
  return `${ownerUserId}/${remoteProjectId}/r${revision}.swissgridgenerator`
}

function createChecksumPath(archivePath: string): string {
  return `${archivePath}.sha256`
}

function normalizeTimestamp(value: string | null | undefined, fallback = new Date().toISOString()): string {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : fallback
}

export async function listCloudProjectRows(
  supabase: SupabaseClient,
  ownerUserId: string,
): Promise<CloudProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_user_id, title, description, author, created_at, updated_at, last_synced_at, revision, archive_path, archive_size_bytes, archived_content_type, deleted_at")
    .eq("owner_user_id", ownerUserId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as CloudProjectRow[]
}

export async function getCloudProjectRow(
  supabase: SupabaseClient,
  ownerUserId: string,
  remoteProjectId: string,
): Promise<CloudProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_user_id, title, description, author, created_at, updated_at, last_synced_at, revision, archive_path, archive_size_bytes, archived_content_type, deleted_at")
    .eq("id", remoteProjectId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle()

  if (error) throw error
  return data as CloudProjectRow | null
}

export async function downloadCloudProjectPayload(
  supabase: SupabaseClient,
  archivePath: string,
): Promise<ProjectTransferPayload> {
  return parseProjectTransferPayloadBytes(await downloadCloudProjectArchiveBytes(supabase, archivePath))
}

export async function downloadCloudProjectArchiveBytes(
  supabase: SupabaseClient,
  archivePath: string,
): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from(CLOUD_PROJECT_ARCHIVE_BUCKET)
    .download(archivePath)

  if (error) throw error
  const bytes = await data.arrayBuffer()
  await validateDownloadedArchiveChecksum(supabase, archivePath, bytes)
  return bytes
}

export async function downloadCloudProjectDocument(
  supabase: SupabaseClient,
  archivePath: string,
): Promise<LoadedProject<Record<string, unknown>>> {
  return parseLoadedProject<Record<string, unknown>>(await downloadCloudProjectPayload(supabase, archivePath))
}

export async function createCloudProject(
  supabase: SupabaseClient,
  ownerUserId: string,
  project: LoadedProject<Record<string, unknown>>,
): Promise<CloudProjectRow> {
  const remoteProjectId = createCloudProjectId()
  const initialRevision = 1
  const archivePath = createArchivePath(ownerUserId, remoteProjectId, initialRevision)
  const encoded = encodeProjectTransferPayload(buildProjectTransferPayload(project), true)
  const archiveChecksum = await sha256Hex(encoded.bytes)
  const now = new Date().toISOString()

  await uploadCloudProjectArchive(supabase, archivePath, encoded.bytes, archiveChecksum)

  const row = {
    id: remoteProjectId,
    owner_user_id: ownerUserId,
    title: project.metadata.title,
    description: project.metadata.description,
    author: project.metadata.author,
    created_at: normalizeTimestamp(project.metadata.createdAt, now),
    updated_at: now,
    last_synced_at: now,
    revision: initialRevision,
    archive_path: archivePath,
    archive_size_bytes: encoded.bytes.byteLength,
    archived_content_type: PROJECT_ARCHIVE_MIME_TYPE,
    deleted_at: null,
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(row)
    .select("id, owner_user_id, title, description, author, created_at, updated_at, last_synced_at, revision, archive_path, archive_size_bytes, archived_content_type, deleted_at")
    .single()

  if (error) throw error
  return data as CloudProjectRow
}

export async function updateCloudProject(
  supabase: SupabaseClient,
  ownerUserId: string,
  remoteProjectId: string,
  baseRevision: number,
  project: LoadedProject<Record<string, unknown>>,
): Promise<CloudProjectRow> {
  const nextRevision = baseRevision + 1
  const archivePath = createArchivePath(ownerUserId, remoteProjectId, nextRevision)
  const encoded = encodeProjectTransferPayload(buildProjectTransferPayload(project), true)
  const archiveChecksum = await sha256Hex(encoded.bytes)
  const now = new Date().toISOString()

  await uploadCloudProjectArchive(supabase, archivePath, encoded.bytes, archiveChecksum)

  const { data, error } = await supabase
    .from("projects")
    .update({
      title: project.metadata.title,
      description: project.metadata.description,
      author: project.metadata.author,
      created_at: normalizeTimestamp(project.metadata.createdAt, now),
      updated_at: now,
      last_synced_at: now,
      revision: nextRevision,
      archive_path: archivePath,
      archive_size_bytes: encoded.bytes.byteLength,
      archived_content_type: PROJECT_ARCHIVE_MIME_TYPE,
    })
    .eq("id", remoteProjectId)
    .eq("owner_user_id", ownerUserId)
    .eq("revision", baseRevision)
    .is("deleted_at", null)
    .select("id, owner_user_id, title, description, author, created_at, updated_at, last_synced_at, revision, archive_path, archive_size_bytes, archived_content_type, deleted_at")
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new CloudProjectConflictError()
  }
  return data as CloudProjectRow
}

async function uploadCloudProjectArchive(
  supabase: SupabaseClient,
  archivePath: string,
  bytes: Uint8Array,
  checksum: string,
): Promise<void> {
  const bucket = supabase.storage.from(CLOUD_PROJECT_ARCHIVE_BUCKET)
  const { error: uploadError } = await bucket.upload(archivePath, bytes, {
    contentType: PROJECT_ARCHIVE_MIME_TYPE,
    upsert: true,
  })

  if (uploadError) throw uploadError

  const { error: checksumUploadError } = await bucket.upload(
    createChecksumPath(archivePath),
    encodeChecksumSidecar(checksum),
    {
      contentType: CLOUD_PROJECT_CHECKSUM_CONTENT_TYPE,
      upsert: true,
    },
  )

  if (checksumUploadError) throw checksumUploadError

  // Echo validation catches truncated/corrupt storage writes while avoiding
  // doubling bandwidth for very large projects. Large archives are still
  // validated when they are downloaded because the checksum sidecar persists.
  if (bytes.byteLength <= MAX_UPLOAD_ECHO_VALIDATION_BYTES) {
    const { data, error } = await bucket.download(archivePath)
    if (error) throw error
    const uploadedBytes = await data.arrayBuffer()
    const uploadedChecksum = await sha256Hex(uploadedBytes)
    if (uploadedChecksum !== checksum) {
      throw new CloudProjectIntegrityError()
    }
  }
}

async function validateDownloadedArchiveChecksum(
  supabase: SupabaseClient,
  archivePath: string,
  bytes: ArrayBuffer,
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(CLOUD_PROJECT_ARCHIVE_BUCKET)
    .download(createChecksumPath(archivePath))

  if (error) {
    // Existing archives created before checksum sidecars are still valid; they
    // will receive a checksum the next time they are uploaded.
    return
  }

  const expectedChecksum = await readChecksumSidecar(data)
  if (!expectedChecksum) return

  const actualChecksum = await sha256Hex(bytes)
  if (actualChecksum !== expectedChecksum) {
    throw new CloudProjectIntegrityError()
  }
}

export async function deleteCloudProject(
  supabase: SupabaseClient,
  ownerUserId: string,
  remoteProjectId: string,
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("projects")
    .update({
      deleted_at: now,
      updated_at: now,
      last_synced_at: now,
    })
    .eq("id", remoteProjectId)
    .eq("owner_user_id", ownerUserId)
    .is("deleted_at", null)

  if (error) throw error
}
