"use client"

import { translateMessage } from "@/lib/i18n"

export type UserFacingNotice = {
  title: string
  message: string
}

export type SupabaseAuthErrorContext = "send_sign_in_code" | "verify_sign_in_code" | "sign_out" | "session"

type ErrorLike = {
  message?: string
  code?: string
  status?: number
}

function toErrorLike(error: unknown): ErrorLike {
  if (!error || typeof error !== "object") {
    return {}
  }
  return error as ErrorLike
}

function getErrorMessage(error: unknown, fallback: string): string {
  const { message } = toErrorLike(error)
  return typeof message === "string" && message.trim().length > 0 ? message.trim() : fallback
}

function isNetworkLikeMessage(message: string): boolean {
  return /failed to fetch|fetch failed|network ?request failed|load failed|network error/i.test(message)
}

function isAuthRateLimitMessage(message: string): boolean {
  return /email rate limit exceeded|too many requests|rate limit/i.test(message)
}

function getSupabaseAuthFallback(context: SupabaseAuthErrorContext): string {
  if (context === "sign_out") return translateMessage("status.auth.signOutFailed")
  if (context === "session") return translateMessage("status.auth.sessionRestoreFailed")
  if (context === "verify_sign_in_code") return translateMessage("status.auth.verifyCodeFailed")
  return translateMessage("status.auth.sendCodeFailed")
}

export function mapSupabaseAuthError(error: unknown, context: SupabaseAuthErrorContext = "send_sign_in_code"): string {
  const rawMessage = getErrorMessage(error, getSupabaseAuthFallback(context))
  const { status } = toErrorLike(error)

  if (/supabase environment variables are missing/i.test(rawMessage)) {
    return translateMessage("status.auth.authUnavailable")
  }

  if (/email is required/i.test(rawMessage)) {
    return translateMessage("status.auth.emailRequired")
  }

  if (/code is required/i.test(rawMessage)) {
    return translateMessage("status.auth.codeRequired")
  }

  if (/token.*expired|expired.*token|invalid.*token|otp.*expired|otp.*invalid/i.test(rawMessage)) {
    return translateMessage("status.auth.codeInvalid")
  }

  if (status === 429 || isAuthRateLimitMessage(rawMessage)) {
    return translateMessage("status.auth.rateLimit")
  }

  if (typeof status === "number" && status >= 500) {
    if (context === "sign_out") {
      return translateMessage("status.auth.signOutUnavailable")
    }
    if (context === "session") {
      return translateMessage("status.auth.sessionUnavailable")
    }
    if (context === "verify_sign_in_code") {
      return translateMessage("status.auth.verifyUnavailable")
    }
    return translateMessage("status.auth.sendUnavailable")
  }

  if (/email address not authorized/i.test(rawMessage)) {
    return translateMessage("status.auth.emailNotAllowed")
  }

  if (/redirect/i.test(rawMessage) && /invalid|not allowed|mismatch/i.test(rawMessage)) {
    return translateMessage("status.auth.redirectNotAllowed")
  }

  if (isNetworkLikeMessage(rawMessage)) {
    if (context === "sign_out") {
      return translateMessage("status.auth.signOutNetwork")
    }
    if (context === "session") {
      return translateMessage("status.auth.sessionNetwork")
    }
    return translateMessage("status.auth.network")
  }

  if (context === "sign_out") {
    return translateMessage("status.auth.signOutWithRaw", { message: rawMessage })
  }
  if (context === "session") {
    return translateMessage("status.auth.sessionWithRaw", { message: rawMessage })
  }
  if (context === "verify_sign_in_code") {
    return translateMessage("status.auth.verifyWithRaw", { message: rawMessage })
  }
  return translateMessage("status.auth.sendWithRaw", { message: rawMessage })
}

export const CLOUD_SYNC_CONFLICT_NOTICE: UserFacingNotice = {
  title: translateMessage("status.cloud.conflictTitle"),
  message: translateMessage("status.cloud.conflictMessage"),
}

export function mapCloudSyncError(error: unknown): UserFacingNotice {
  const rawMessage = getErrorMessage(error, translateMessage("status.cloud.failed"))
  const { status, code } = toErrorLike(error)

  if (status === 401 || /jwt|token.*expired|auth session missing|invalid token|not authenticated/i.test(rawMessage)) {
    return {
      title: translateMessage("status.cloud.sessionExpiredTitle"),
      message: translateMessage("status.cloud.sessionExpiredMessage"),
    }
  }

  if (status === 403 || /permission denied|row-level security|violates row-level security/i.test(rawMessage)) {
    return {
      title: translateMessage("status.cloud.permissionsTitle"),
      message: translateMessage("status.cloud.permissionsMessage"),
    }
  }

  if (/bucket.*not found|project-archives.*not found|storage.*not found/i.test(rawMessage)) {
    return {
      title: translateMessage("status.cloud.storageMissingTitle"),
      message: translateMessage("status.cloud.storageMissingMessage"),
    }
  }

  if (/relation .*projects.* does not exist|column .* does not exist|schema cache/i.test(rawMessage)) {
    return {
      title: translateMessage("status.cloud.databaseMissingTitle"),
      message: translateMessage("status.cloud.databaseMissingMessage"),
    }
  }

  if (status === 429 || /rate limit/i.test(rawMessage)) {
    return {
      title: translateMessage("status.cloud.rateLimitTitle"),
      message: translateMessage("status.cloud.rateLimitMessage"),
    }
  }

  if (typeof status === "number" && status >= 500) {
    return {
      title: translateMessage("status.cloud.serviceUnavailableTitle"),
      message: translateMessage("status.cloud.serviceUnavailableMessage"),
    }
  }

  if (isNetworkLikeMessage(rawMessage) || code === "20") {
    return {
      title: translateMessage("status.cloud.offlineTitle"),
      message: translateMessage("status.cloud.offlineMessage"),
    }
  }

  return {
    title: translateMessage("status.cloud.errorTitle"),
    message: translateMessage("status.cloud.errorMessage", { message: rawMessage }),
  }
}
