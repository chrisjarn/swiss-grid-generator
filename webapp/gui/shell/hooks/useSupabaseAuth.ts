"use client"

import { useCallback, useEffect, useState } from "react"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { mapSupabaseAuthError } from "@/lib/supabase/error-messages"
import { addCloudActivityLogEntry } from "@/lib/user-layout-library"
import { translateMessage } from "@/core/i18n/messages"

export type SupabaseAuthStatus = "loading" | "signed_out" | "signed_in"

function maskEmailForLog(email: string | null | undefined): string | undefined {
  const trimmed = email?.trim()
  if (!trimmed) return undefined
  const [localPart, domain] = trimmed.split("@")
  if (!localPart || !domain) return "masked email"
  return `${localPart.slice(0, 1)}***@${domain}`
}

export function useSupabaseAuth() {
  const [supabase] = useState<SupabaseClient | null>(() => {
    try {
      return getSupabaseBrowserClient()
    } catch {
      return null
    }
  })
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<SupabaseAuthStatus>(supabase ? "loading" : "signed_out")
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setAuthError(mapSupabaseAuthError(error, "session"))
        setStatus("signed_out")
        void addCloudActivityLogEntry({
          level: "error",
          action: translateMessage("ui.status.activity.sessionRestoreFailed"),
          message: mapSupabaseAuthError(error, "session"),
        })
        return
      }
      setSession(data.session ?? null)
      setStatus(data.session ? "signed_in" : "signed_out")
      if (data.session?.user?.email) {
        void addCloudActivityLogEntry({
          level: "success",
          action: translateMessage("ui.status.activity.sessionRestored"),
          message: maskEmailForLog(data.session.user.email),
        })
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? "signed_in" : "signed_out")
      if (nextSession?.user?.email) {
        setAuthError(null)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  const user = session?.user ?? null

  const sendSignInCode = useCallback(async (email: string) => {
    if (!supabase) {
      const error = new Error("Supabase client is unavailable.")
      setAuthError(mapSupabaseAuthError(error, "send_sign_in_code"))
      throw error
    }
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      const error = new Error("Email is required.")
      setAuthError(mapSupabaseAuthError(error, "send_sign_in_code"))
      throw error
    }

    setAuthError(null)
    setAuthMessage(translateMessage("ui.status.auth.sendingCode", { email: normalizedEmail }))
    void addCloudActivityLogEntry({
      level: "info",
      action: translateMessage("ui.status.activity.signInCodeRequested"),
      message: maskEmailForLog(normalizedEmail),
    })

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(mapSupabaseAuthError(error, "send_sign_in_code"))
      void addCloudActivityLogEntry({
        level: "error",
        action: translateMessage("ui.status.activity.signInCodeFailed"),
        message: mapSupabaseAuthError(error, "send_sign_in_code"),
      })
      throw error
    }

    setAuthMessage(translateMessage("ui.status.auth.codeSent", { email: normalizedEmail }))
    void addCloudActivityLogEntry({
      level: "success",
      action: translateMessage("ui.status.activity.signInCodeSent"),
      message: maskEmailForLog(normalizedEmail),
    })
  }, [supabase])

  const verifySignInCode = useCallback(async (email: string, code: string) => {
    if (!supabase) {
      const error = new Error("Supabase client is unavailable.")
      setAuthError(mapSupabaseAuthError(error, "verify_sign_in_code"))
      throw error
    }
    const normalizedEmail = email.trim()
    const normalizedCode = code.replace(/\D/g, "").slice(0, 6)
    if (!normalizedEmail) {
      const error = new Error("Email is required.")
      setAuthError(mapSupabaseAuthError(error, "verify_sign_in_code"))
      throw error
    }
    if (normalizedCode.length !== 6) {
      const error = new Error("Code is required.")
      setAuthError(mapSupabaseAuthError(error, "verify_sign_in_code"))
      throw error
    }

    setAuthError(null)
    setAuthMessage(translateMessage("ui.status.auth.verifyingCode"))

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedCode,
      type: "email",
    })

    if (error) {
      setAuthError(mapSupabaseAuthError(error, "verify_sign_in_code"))
      void addCloudActivityLogEntry({
        level: "error",
        action: translateMessage("ui.status.activity.signInCodeRejected"),
        message: mapSupabaseAuthError(error, "verify_sign_in_code"),
      })
      throw error
    }

    setAuthMessage(null)
    void addCloudActivityLogEntry({
      level: "success",
      action: translateMessage("ui.status.activity.signInVerified"),
      message: maskEmailForLog(normalizedEmail),
    })
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return
    setAuthError(null)
    setAuthMessage(translateMessage("ui.status.auth.signingOut"))
    const { error } = await supabase.auth.signOut()
    if (error) {
      setAuthError(mapSupabaseAuthError(error, "sign_out"))
      void addCloudActivityLogEntry({
        level: "error",
        action: translateMessage("ui.status.activity.signOutFailed"),
        message: mapSupabaseAuthError(error, "sign_out"),
      })
      throw error
    }
    void addCloudActivityLogEntry({
      level: "success",
      action: translateMessage("ui.status.activity.signedOut"),
    })
  }, [supabase])

  return {
    supabase,
    session,
    user: user as User | null,
    status,
    authError,
    authMessage,
    clearAuthFeedback: () => {
      setAuthError(null)
      setAuthMessage(null)
    },
    sendSignInCode,
    verifySignInCode,
    signOut,
  }
}
