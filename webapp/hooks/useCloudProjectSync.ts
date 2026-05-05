"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { SupabaseClient, User } from "@supabase/supabase-js"

import { parseLoadedProject, type LoadedProject } from "@/lib/document-session"
import { getCloudSyncRetryAt, isRetryableCloudSyncError } from "@/lib/cloud-sync/retry"
import { reportCloudSyncError } from "@/lib/cloud-sync/logger"
import {
  createCloudProject,
  deleteCloudProject,
  downloadCloudProjectArchiveBytes,
  getCloudProjectRow,
  listCloudProjectRows,
  updateCloudProject,
  CloudProjectConflictError,
} from "@/lib/supabase/cloud-projects"
import {
  CLOUD_SYNC_CONFLICT_NOTICE,
  mapCloudSyncError,
  type UserFacingNotice,
} from "@/lib/supabase/error-messages"
import {
  addCloudActivityLogEntry,
  addProjectAuditEntry,
  claimDueCloudSyncQueueEntries,
  clearCloudSyncQueueEntriesForProject,
  cloudSyncQueueQuery,
  completeCloudSyncQueueEntry,
  enqueueCloudSyncOperation,
  failCloudSyncQueueEntry,
  getUserProjectRecord,
  listUserProjectRecords,
  markUserProjectDeleted,
  purgeUserProjectFromLibrary,
  upsertCloudProjectToUserLibrary,
  updateUserProjectSyncState,
  type CloudSyncQueueEntry,
  type UserProjectRecord,
} from "@/lib/user-layout-library"

export type CloudSyncStatus = "signed_out" | "idle" | "syncing" | "synced" | "offline" | "error" | "conflict"
export type CloudSyncRequestReason = "session" | "online" | "focus" | "visible" | "preset_browser" | "manual" | "save" | "retry"
export type CloudConflictResolutionStrategy = "keep_local" | "use_cloud"

type CloudSyncRequestOptions = {
  force?: boolean
  throttleMs?: number
}

type Notice = {
  title: string
  message: string
}

type Args = {
  supabase: SupabaseClient | null
  user: User | null
  onRequestNotice?: (notice: Notice) => void
}

const DEFAULT_SYNC_THROTTLE_MS = 60_000
const QUEUE_DRAIN_BATCH_SIZE = 3

function hasLocalChangesAfterLastSync(record: UserProjectRecord): boolean {
  if (record.syncState === "local" || record.syncState === "offline" || record.syncState === "error") return true
  if (!record.lastSyncedAt) return false
  const updatedAt = Date.parse(record.updatedAt)
  const lastSyncedAt = Date.parse(record.lastSyncedAt)
  if (Number.isNaN(updatedAt) || Number.isNaN(lastSyncedAt)) return false
  return updatedAt > lastSyncedAt + 1000
}

function toLoadedProject(record: UserProjectRecord): LoadedProject<Record<string, unknown>> {
  const parsedProject = parseLoadedProject<Record<string, unknown>>(record.project)
  return {
    activePageId: parsedProject.activePageId,
    pages: parsedProject.pages,
    metadata: {
      title: record.title,
      description: record.description,
      author: record.author,
      createdAt: record.createdAt,
    },
    layoutEngine: parsedProject.layoutEngine,
    visibilitySettings: parsedProject.visibilitySettings,
    tour: parsedProject.tour ?? null,
  }
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine
}

function queueStatusFromNotice(notice: UserFacingNotice): CloudSyncStatus {
  return notice.title === "Cloud Offline" ? "offline" : "error"
}

export function useCloudProjectSync({ supabase, user, onRequestNotice }: Args) {
  const [status, setStatus] = useState<CloudSyncStatus>("signed_out")
  const [lastNotice, setLastNotice] = useState<UserFacingNotice | null>(null)
  const [queueEntries, setQueueEntries] = useState<CloudSyncQueueEntry[]>([])
  const lastSyncAttemptAtRef = useRef(0)
  const drainQueuePromiseRef = useRef<Promise<void> | null>(null)
  const syncAllProjectsPromiseRef = useRef<Promise<void> | null>(null)

  const handleSyncError = useCallback(async ({
    error,
    entry,
    projectTitle,
    projectId,
  }: {
    error: unknown
    entry?: CloudSyncQueueEntry
    projectTitle?: string | null
    projectId?: string | null
  }) => {
    reportCloudSyncError(error, {
      action: entry?.action ?? "sync",
      projectId: projectId ?? entry?.projectId,
      remoteProjectId: entry?.remoteProjectId,
      queueId: entry?.id,
      attemptCount: entry?.attemptCount,
      userId: user?.id ?? null,
    })

    const notice = mapCloudSyncError(error)
    setLastNotice(notice)
    setStatus(queueStatusFromNotice(notice))

    if (entry) {
      const retryAt = isRetryableCloudSyncError(error)
        ? getCloudSyncRetryAt(entry.attemptCount)
        : new Date(Date.now() + 60 * 60_000).toISOString()
      await failCloudSyncQueueEntry({
        id: entry.id,
        error: notice.message,
        runAfter: retryAt,
      })
    }

    if (projectId) {
      await updateUserProjectSyncState({
        id: projectId,
        syncState: notice.title === "Cloud Offline" ? "offline" : "error",
        syncError: notice.message,
      })
    }

    void addCloudActivityLogEntry({
      level: "error",
      action: "Project sync failed",
      message: notice.message,
      projectTitle,
    })
  }, [user?.id])

  const processUploadQueueEntry = useCallback(async (entry: CloudSyncQueueEntry) => {
    if (!supabase || !user) return
    const localRecord = await getUserProjectRecord(entry.projectId)
    if (!localRecord) {
      await completeCloudSyncQueueEntry(entry.id)
      return
    }

    if (localRecord.deletedAt || localRecord.syncState === "deleted") {
      await enqueueCloudSyncOperation({
        projectId: localRecord.id,
        action: "delete",
        ownerUserId: user.id,
        remoteProjectId: localRecord.remoteProjectId,
        reason: "upload_record_deleted",
        force: true,
      })
      await completeCloudSyncQueueEntry(entry.id)
      return
    }

    if (localRecord.ownerUserId && localRecord.ownerUserId !== user.id) {
      await completeCloudSyncQueueEntry(entry.id)
      return
    }

    await updateUserProjectSyncState({
      id: localRecord.id,
      ownerUserId: user.id,
      remoteProjectId: localRecord.remoteProjectId ?? null,
      remoteRevision: localRecord.remoteRevision ?? null,
      syncState: "syncing",
      syncError: null,
    })

    void addCloudActivityLogEntry({
      level: "info",
      action: localRecord.remoteProjectId ? "Project upload started" : "Project cloud create started",
      projectTitle: localRecord.title,
    })

    try {
      const loadedProject = toLoadedProject(localRecord)
      const remoteRow = localRecord.remoteProjectId
        ? await updateCloudProject(
          supabase,
          user.id,
          localRecord.remoteProjectId,
          entry.baseRevision ?? localRecord.remoteRevision ?? 0,
          loadedProject,
        )
        : await createCloudProject(supabase, user.id, loadedProject)

      await updateUserProjectSyncState({
        id: localRecord.id,
        ownerUserId: user.id,
        remoteProjectId: remoteRow.id,
        remoteRevision: remoteRow.revision,
        syncState: "synced",
        syncError: null,
        lastSyncedAt: remoteRow.last_synced_at ?? remoteRow.updated_at,
      })
      await completeCloudSyncQueueEntry(entry.id)
      void addProjectAuditEntry({
        projectId: localRecord.id,
        actor: "cloud",
        action: localRecord.remoteProjectId ? "upload" : "create",
        baseRevision: localRecord.remoteRevision ?? 0,
        nextRevision: remoteRow.revision,
        checksum: localRecord.contentHash,
      })
      void addCloudActivityLogEntry({
        level: "success",
        action: localRecord.remoteProjectId ? "Project uploaded" : "Project created in cloud",
        message: `revision ${remoteRow.revision}`,
        projectTitle: localRecord.title,
      })
    } catch (error) {
      if (error instanceof CloudProjectConflictError) {
        await updateUserProjectSyncState({
          id: localRecord.id,
          syncState: "conflict",
          syncError: CLOUD_SYNC_CONFLICT_NOTICE.message,
        })
        await failCloudSyncQueueEntry({
          id: entry.id,
          error: CLOUD_SYNC_CONFLICT_NOTICE.message,
          runAfter: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          status: "conflict",
        })
        setStatus("conflict")
        setLastNotice({ ...CLOUD_SYNC_CONFLICT_NOTICE })
        void addProjectAuditEntry({
          projectId: localRecord.id,
          actor: "system",
          action: "conflict",
          message: CLOUD_SYNC_CONFLICT_NOTICE.message,
          baseRevision: localRecord.remoteRevision ?? 0,
          checksum: localRecord.contentHash,
        })
        void addCloudActivityLogEntry({
          level: "warning",
          action: "Project sync conflict",
          message: CLOUD_SYNC_CONFLICT_NOTICE.message,
          projectTitle: localRecord.title,
        })
        return
      }

      await handleSyncError({
        error,
        entry,
        projectTitle: localRecord.title,
        projectId: localRecord.id,
      })
    }
  }, [handleSyncError, supabase, user])

  const processDeleteQueueEntry = useCallback(async (entry: CloudSyncQueueEntry) => {
    if (!supabase || !user) return
    const localRecord = await getUserProjectRecord(entry.projectId)
    const remoteProjectId = localRecord?.remoteProjectId ?? entry.remoteProjectId

    if (!remoteProjectId) {
      await completeCloudSyncQueueEntry(entry.id)
      if (localRecord) await purgeUserProjectFromLibrary(localRecord.id)
      return
    }

    try {
      void addCloudActivityLogEntry({
        level: "info",
        action: "Cloud delete started",
        projectTitle: localRecord?.title,
      })
      await deleteCloudProject(supabase, user.id, remoteProjectId)
      await completeCloudSyncQueueEntry(entry.id)
      if (localRecord) await purgeUserProjectFromLibrary(localRecord.id)
      void addProjectAuditEntry({
        projectId: entry.projectId,
        actor: "cloud",
        action: "delete",
        baseRevision: localRecord?.remoteRevision,
      })
      void addCloudActivityLogEntry({
        level: "success",
        action: "Cloud project deleted",
        projectTitle: localRecord?.title,
      })
    } catch (error) {
      await handleSyncError({
        error,
        entry,
        projectTitle: localRecord?.title,
        projectId: localRecord?.id ?? entry.projectId,
      })
    }
  }, [handleSyncError, supabase, user])

  const drainSyncQueue = useCallback(async () => {
    if (drainQueuePromiseRef.current) {
      await drainQueuePromiseRef.current
      return
    }

    const drainPromise = (async () => {
      if (!supabase || !user) {
        setStatus("signed_out")
        return
      }
      if (isBrowserOffline()) {
        setStatus("offline")
        return
      }

      setStatus("syncing")

      for (;;) {
        const dueEntries = await claimDueCloudSyncQueueEntries(QUEUE_DRAIN_BATCH_SIZE)
        if (dueEntries.length === 0) break

        for (const entry of dueEntries) {
          if (entry.action === "delete") {
            await processDeleteQueueEntry(entry)
          } else {
            await processUploadQueueEntry(entry)
          }
        }
      }

      const records = await listUserProjectRecords()
      if (records.some((record) => record.syncState === "conflict")) {
        setStatus("conflict")
        return
      }
      if (records.some((record) => record.syncState === "error")) {
        setStatus("error")
        return
      }
      if (records.some((record) => record.syncState === "offline")) {
        setStatus("offline")
        return
      }
      setStatus("synced")
    })()

    drainQueuePromiseRef.current = drainPromise
    try {
      await drainPromise
    } finally {
      if (drainQueuePromiseRef.current === drainPromise) {
        drainQueuePromiseRef.current = null
      }
    }
  }, [processDeleteQueueEntry, processUploadQueueEntry, supabase, user])

  const queueProjectSyncByLocalId = useCallback(async (
    localId: string,
    reason: CloudSyncRequestReason = "save",
    options: { force?: boolean } = {},
  ): Promise<boolean> => {
    if (!user) return false
    const localRecord = await getUserProjectRecord(localId)
    if (!localRecord) return false
    if (localRecord.ownerUserId && localRecord.ownerUserId !== user.id) return false
    if (localRecord.syncState === "conflict" && !options.force) return false

    await enqueueCloudSyncOperation({
      projectId: localRecord.id,
      action: localRecord.deletedAt || localRecord.syncState === "deleted" ? "delete" : "upload",
      ownerUserId: user.id,
      remoteProjectId: localRecord.remoteProjectId,
      baseRevision: localRecord.remoteRevision,
      reason,
      force: options.force,
    })

    if (isBrowserOffline() || !supabase) {
      await updateUserProjectSyncState({
        id: localRecord.id,
        ownerUserId: user.id,
        syncState: "offline",
        syncError: "Cloud sync is queued until the browser is online.",
      })
      setStatus("offline")
      return true
    }

    void drainSyncQueue()
    return true
  }, [drainSyncQueue, supabase, user])

  const syncProjectByLocalId = useCallback(async (localId: string): Promise<string | null> => {
    await queueProjectSyncByLocalId(localId, "save", { force: true })
    await drainSyncQueue()
    const localRecord = await getUserProjectRecord(localId)
    return localRecord?.remoteProjectId ?? null
  }, [drainSyncQueue, queueProjectSyncByLocalId])

  const deleteProjectByLocalId = useCallback(async (localId: string): Promise<"no_op" | "purged_local" | "queued_cloud_delete" | "deleted_cloud"> => {
    const localRecord = await getUserProjectRecord(localId)
    if (!localRecord) return "no_op"

    const deletionResult = await markUserProjectDeleted(localRecord.id)

    if (deletionResult === "purged") {
      return "purged_local"
    }

    await enqueueCloudSyncOperation({
      projectId: localRecord.id,
      action: "delete",
      ownerUserId: user?.id ?? localRecord.ownerUserId,
      remoteProjectId: localRecord.remoteProjectId,
      baseRevision: localRecord.remoteRevision,
      reason: "delete",
      force: true,
    })

    if (!supabase || !user || isBrowserOffline()) {
      setStatus(isBrowserOffline() ? "offline" : status)
      void addCloudActivityLogEntry({
        level: "warning",
        action: isBrowserOffline() ? "Cloud delete queued offline" : "Cloud delete queued",
        projectTitle: localRecord.title,
      })
      return "queued_cloud_delete"
    }

    await drainSyncQueue()
    const remainingRecord = await getUserProjectRecord(localRecord.id)
    return remainingRecord ? "queued_cloud_delete" : "deleted_cloud"
  }, [drainSyncQueue, status, supabase, user])

  const syncAllProjects = useCallback(async (reason: CloudSyncRequestReason = "manual") => {
    if (syncAllProjectsPromiseRef.current) {
      await syncAllProjectsPromiseRef.current
      return
    }

    const syncPromise = (async () => {
      if (!supabase || !user) {
        setStatus("signed_out")
        return
      }
      if (isBrowserOffline()) {
        setStatus("offline")
        void addCloudActivityLogEntry({
          level: "warning",
          action: "Cloud sync skipped offline",
        })
        return
      }

      setStatus("syncing")
      setLastNotice(null)
      lastSyncAttemptAtRef.current = Date.now()
      void addCloudActivityLogEntry({
        level: "info",
        action: "Cloud sync started",
        message: reason,
      })

      try {
        const [localRecords, remoteRows] = await Promise.all([
          listUserProjectRecords(),
          listCloudProjectRows(supabase, user.id),
        ])
        const remoteProjectIds = new Set(remoteRows.map((row) => row.id))
        const localByRemoteId = new Map(
          localRecords
            .filter((record) => typeof record.remoteProjectId === "string" && record.remoteProjectId.length > 0)
            .map((record) => [record.remoteProjectId as string, record]),
        )

        let sawConflict = false

        for (const localRecord of localRecords) {
          if (localRecord.ownerUserId && localRecord.ownerUserId !== user.id) continue
          if ((localRecord.syncState === "deleted" || localRecord.deletedAt) && localRecord.remoteProjectId) {
            await enqueueCloudSyncOperation({
              projectId: localRecord.id,
              action: "delete",
              ownerUserId: user.id,
              remoteProjectId: localRecord.remoteProjectId,
              baseRevision: localRecord.remoteRevision,
              reason,
            })
          }
        }

        for (const remoteRow of remoteRows) {
          const localRecord = localByRemoteId.get(remoteRow.id)

          if (!localRecord) {
            const archiveBytes = await downloadCloudProjectArchiveBytes(supabase, remoteRow.archive_path)
            await upsertCloudProjectToUserLibrary({
              ownerUserId: user.id,
              remoteProjectId: remoteRow.id,
              remoteRevision: remoteRow.revision,
              updatedAt: remoteRow.updated_at,
              lastSyncedAt: remoteRow.last_synced_at ?? remoteRow.updated_at,
              archiveBytes,
            })
            void addCloudActivityLogEntry({
              level: "success",
              action: "Cloud project downloaded",
              projectTitle: remoteRow.title,
            })
            continue
          }

          if ((localRecord.syncState === "local" || localRecord.syncState === "offline" || localRecord.syncState === "error")
            && localRecord.remoteRevision != null
            && localRecord.remoteRevision !== remoteRow.revision) {
            await updateUserProjectSyncState({
              id: localRecord.id,
              syncState: "conflict",
              syncError: CLOUD_SYNC_CONFLICT_NOTICE.message,
            })
            await enqueueCloudSyncOperation({
              projectId: localRecord.id,
              action: "upload",
              ownerUserId: user.id,
              remoteProjectId: localRecord.remoteProjectId,
              baseRevision: localRecord.remoteRevision,
              reason: "conflict",
            })
            sawConflict = true
            setLastNotice({ ...CLOUD_SYNC_CONFLICT_NOTICE })
            void addCloudActivityLogEntry({
              level: "warning",
              action: "Project sync conflict",
              message: CLOUD_SYNC_CONFLICT_NOTICE.message,
              projectTitle: localRecord.title,
            })
            continue
          }

          const localRevision = localRecord.remoteRevision ?? 0
          const shouldPullRemote = (
            (localRecord.syncState === "synced" || localRecord.syncState === "idle")
            && localRevision < remoteRow.revision
          )

          if (shouldPullRemote) {
            const archiveBytes = await downloadCloudProjectArchiveBytes(supabase, remoteRow.archive_path)
            await upsertCloudProjectToUserLibrary({
              localId: localRecord.id,
              ownerUserId: user.id,
              remoteProjectId: remoteRow.id,
              remoteRevision: remoteRow.revision,
              updatedAt: remoteRow.updated_at,
              lastSyncedAt: remoteRow.last_synced_at ?? remoteRow.updated_at,
              originPresetId: localRecord.originPresetId,
              archiveBytes,
            })
            void addCloudActivityLogEntry({
              level: "success",
              action: "Cloud project updated locally",
              message: `revision ${remoteRow.revision}`,
              projectTitle: remoteRow.title,
            })
          }
        }

        for (const localRecord of localRecords) {
          if (localRecord.ownerUserId && localRecord.ownerUserId !== user.id) continue
          if (localRecord.syncState === "conflict") {
            sawConflict = true
            continue
          }
          if (!localRecord.remoteProjectId) {
            if (!localRecord.deletedAt && localRecord.syncState !== "deleted") {
              await enqueueCloudSyncOperation({
                projectId: localRecord.id,
                action: "upload",
                ownerUserId: user.id,
                reason,
              })
            }
            continue
          }
          if (localRecord.deletedAt || localRecord.syncState === "deleted") continue

          if (!remoteProjectIds.has(localRecord.remoteProjectId)) {
            if (hasLocalChangesAfterLastSync(localRecord)) {
              await updateUserProjectSyncState({
                id: localRecord.id,
                syncState: "conflict",
                syncError: CLOUD_SYNC_CONFLICT_NOTICE.message,
              })
              sawConflict = true
              setLastNotice({ ...CLOUD_SYNC_CONFLICT_NOTICE })
              void addCloudActivityLogEntry({
                level: "warning",
                action: "Project deleted remotely conflict",
                message: CLOUD_SYNC_CONFLICT_NOTICE.message,
                projectTitle: localRecord.title,
              })
              continue
            }

            await purgeUserProjectFromLibrary(localRecord.id)
            void addCloudActivityLogEntry({
              level: "success",
              action: "Remote delete applied locally",
              projectTitle: localRecord.title,
            })
            continue
          }

          if (localRecord.syncState === "local" || localRecord.syncState === "offline" || localRecord.syncState === "error") {
            await enqueueCloudSyncOperation({
              projectId: localRecord.id,
              action: "upload",
              ownerUserId: user.id,
              remoteProjectId: localRecord.remoteProjectId,
              baseRevision: localRecord.remoteRevision,
              reason,
            })
          }
        }

        await drainSyncQueue()

        if (sawConflict) {
          setStatus("conflict")
        }
        void addCloudActivityLogEntry({
          level: sawConflict ? "warning" : "success",
          action: sawConflict ? "Cloud sync completed with conflict" : "Cloud sync completed",
        })
      } catch (error) {
        await handleSyncError({ error })
      }
    })()

    syncAllProjectsPromiseRef.current = syncPromise
    try {
      await syncPromise
    } finally {
      if (syncAllProjectsPromiseRef.current === syncPromise) {
        syncAllProjectsPromiseRef.current = null
      }
    }
  }, [drainSyncQueue, handleSyncError, supabase, user])

  const requestCloudSync = useCallback((
    reason: CloudSyncRequestReason = "manual",
    options: CloudSyncRequestOptions = {},
  ): boolean => {
    if (!supabase || !user) return false
    if (isBrowserOffline()) {
      setStatus("offline")
      void addCloudActivityLogEntry({
        level: "warning",
        action: "Cloud sync request skipped offline",
        message: reason,
      })
      return false
    }

    const now = Date.now()
    const throttleMs = options.throttleMs ?? DEFAULT_SYNC_THROTTLE_MS
    if (!options.force && now - lastSyncAttemptAtRef.current < throttleMs) {
      return false
    }

    void syncAllProjects(reason)
    return true
  }, [supabase, syncAllProjects, user])

  const resolveConflictByLocalId = useCallback(async (
    localId: string,
    strategy: CloudConflictResolutionStrategy,
  ): Promise<boolean> => {
    if (!supabase || !user) return false
    const localRecord = await getUserProjectRecord(localId)
    if (!localRecord || !localRecord.remoteProjectId) return false

    const remoteRow = await getCloudProjectRow(supabase, user.id, localRecord.remoteProjectId)
    if (!remoteRow || remoteRow.deleted_at) {
      if (strategy === "use_cloud") return false
      await clearCloudSyncQueueEntriesForProject(localRecord.id)
      await updateUserProjectSyncState({
        id: localRecord.id,
        remoteProjectId: null,
        remoteRevision: null,
        syncState: "local",
        syncError: null,
      })
      await enqueueCloudSyncOperation({
        projectId: localRecord.id,
        action: "upload",
        ownerUserId: user.id,
        reason: "resolve_keep_local_after_remote_delete",
        force: true,
      })
      await drainSyncQueue()
      return true
    }

    if (strategy === "use_cloud") {
      const archiveBytes = await downloadCloudProjectArchiveBytes(supabase, remoteRow.archive_path)
      await upsertCloudProjectToUserLibrary({
        localId: localRecord.id,
        ownerUserId: user.id,
        remoteProjectId: remoteRow.id,
        remoteRevision: remoteRow.revision,
        updatedAt: remoteRow.updated_at,
        lastSyncedAt: remoteRow.last_synced_at ?? remoteRow.updated_at,
        originPresetId: localRecord.originPresetId,
        archiveBytes,
      })
      await clearCloudSyncQueueEntriesForProject(localRecord.id)
      setStatus("synced")
      void addProjectAuditEntry({
        projectId: localRecord.id,
        actor: "local",
        action: "resolve_use_cloud",
        baseRevision: localRecord.remoteRevision,
        nextRevision: remoteRow.revision,
      })
      void addCloudActivityLogEntry({
        level: "success",
        action: "Conflict resolved from cloud",
        projectTitle: remoteRow.title,
      })
      return true
    }

    await clearCloudSyncQueueEntriesForProject(localRecord.id)
    await updateUserProjectSyncState({
      id: localRecord.id,
      syncState: "local",
      syncError: null,
    })
    await enqueueCloudSyncOperation({
      projectId: localRecord.id,
      action: "upload",
      ownerUserId: user.id,
      remoteProjectId: remoteRow.id,
      baseRevision: remoteRow.revision,
      reason: "resolve_keep_local",
      force: true,
    })
    await drainSyncQueue()
    void addProjectAuditEntry({
      projectId: localRecord.id,
      actor: "cloud",
      action: "resolve_keep_local",
      baseRevision: remoteRow.revision,
      checksum: localRecord.contentHash,
    })
    return true
  }, [drainSyncQueue, supabase, user])

  useEffect(() => {
    const subscription = cloudSyncQueueQuery.subscribe({
      next: setQueueEntries,
      error: () => setQueueEntries([]),
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !user) {
      setStatus("signed_out")
      return
    }
    setStatus("idle")
    void syncAllProjects("session")
  }, [supabase, syncAllProjects, user])

  useEffect(() => {
    const handleOnline = () => {
      if (supabase && user) {
        requestCloudSync("online", { force: true })
      }
    }
    const handleOffline = () => {
      setStatus("offline")
      void addCloudActivityLogEntry({
        level: "warning",
        action: "Browser went offline",
      })
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [requestCloudSync, supabase, user])

  useEffect(() => {
    if (!lastNotice || !onRequestNotice) return
    onRequestNotice(lastNotice)
  }, [lastNotice, onRequestNotice])

  const pendingQueueCount = useMemo(() => (
    queueEntries.filter((entry) => entry.status === "pending" || entry.status === "failed" || entry.status === "running").length
  ), [queueEntries])

  const conflictQueueCount = useMemo(() => (
    queueEntries.filter((entry) => entry.status === "conflict").length
  ), [queueEntries])

  const statusLabel = useMemo(() => {
    if (!supabase) return "Cloud unavailable"
    if (!user) return "Not connected"
    if (status === "idle") return pendingQueueCount > 0 ? `${pendingQueueCount} queued` : "Cloud idle"
    if (status === "syncing") return pendingQueueCount > 0 ? `Cloud syncing (${pendingQueueCount})` : "Cloud syncing"
    if (status === "synced") return "Cloud synced"
    if (status === "offline") return pendingQueueCount > 0 ? `Cloud offline (${pendingQueueCount} queued)` : "Cloud offline"
    if (status === "conflict") return conflictQueueCount > 0 ? `Cloud conflict (${conflictQueueCount})` : "Cloud conflict"
    if (status === "error") return pendingQueueCount > 0 ? `Cloud error (${pendingQueueCount} queued)` : "Cloud error"
    return "Not connected"
  }, [conflictQueueCount, pendingQueueCount, status, supabase, user])

  return {
    status,
    statusLabel,
    lastError: lastNotice?.message ?? null,
    pendingQueueCount,
    conflictQueueCount,
    queueProjectSyncByLocalId,
    deleteProjectByLocalId,
    requestCloudSync,
    resolveConflictByLocalId,
    syncAllProjects,
    syncProjectByLocalId,
  }
}
