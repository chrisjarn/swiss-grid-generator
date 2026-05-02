"use client"

type CloudSyncLogContext = {
  action: string
  projectId?: string | null
  remoteProjectId?: string | null
  queueId?: string | null
  attemptCount?: number | null
  userId?: string | null
}

type WindowWithSentry = Window & {
  Sentry?: {
    captureException?: (error: unknown, context?: unknown) => void
  }
}

export function reportCloudSyncError(error: unknown, context: CloudSyncLogContext): void {
  const payload = {
    subsystem: "cloud-sync",
    ...context,
  }
  console.error("Cloud sync error", payload, error)

  if (typeof window === "undefined") return
  const sentry = (window as WindowWithSentry).Sentry
  sentry?.captureException?.(error, {
    tags: {
      subsystem: "cloud-sync",
      action: context.action,
    },
    extra: payload,
  })
}
