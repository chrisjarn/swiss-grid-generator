"use client"

type ErrorLike = {
  message?: string
  status?: number
  code?: string
}

function toErrorLike(error: unknown): ErrorLike {
  return error && typeof error === "object" ? error as ErrorLike : {}
}

function getErrorMessage(error: unknown): string {
  const { message } = toErrorLike(error)
  return typeof message === "string" ? message : ""
}

export function isRetryableCloudSyncError(error: unknown): boolean {
  const { status, code } = toErrorLike(error)
  const message = getErrorMessage(error)
  if (typeof status === "number" && (status === 408 || status === 425 || status === 429 || status >= 500)) {
    return true
  }
  if (code === "20") return true
  return /failed to fetch|fetch failed|network ?request failed|load failed|network error|timeout|rate limit|too many requests/i.test(message)
}

export function getCloudSyncRetryAt(attemptCount: number, now = Date.now()): string {
  const baseDelayMs = 2000
  const maxDelayMs = 5 * 60_000
  const exponentialDelayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attemptCount))
  const jitterMs = Math.floor(Math.random() * Math.min(1000, exponentialDelayMs * 0.2))
  return new Date(now + exponentialDelayMs + jitterMs).toISOString()
}
