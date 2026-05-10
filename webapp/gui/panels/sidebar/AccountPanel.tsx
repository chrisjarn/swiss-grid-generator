"use client"

import { RefreshCw, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/shared/ui/button"
import { Label } from "@/shared/ui/label"
import { getCompactActionButtonClassName, getNeutralFormControlClassName } from "@/shared/ui/popup-styles"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"
import { useTranslation } from "@/lib/i18n"
import {
  cloudActivityLogQuery,
  type CloudActivityLogEntry,
} from "@/lib/user-layout-library"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
  userEmail: string | null
  cloudStatusLabel: string
  cloudStatusIndicatorClassName: string
  pendingQueueCount?: number
  conflictQueueCount?: number
  hasActiveConflict?: boolean
  activeConflictDetails?: {
    title: string
    localUpdatedAt?: string | null
    lastSyncedAt?: string | null
    localRevision?: number | null
    remoteProjectId?: string | null
  } | null
  authError: string | null
  authMessage: string | null
  onClearFeedback: () => void
  onSyncNow?: () => Promise<void>
  onKeepLocalConflict?: () => Promise<void>
  onUseCloudConflict?: () => Promise<void>
  onDeleteConflict?: () => Promise<void>
  onSendSignInCode: (email: string) => Promise<void>
  onVerifySignInCode: (email: string, code: string) => Promise<void>
  onSignOut: () => Promise<void>
}

function formatActivityTimestamp(
  value: string | null | undefined,
  mode: "full" | "time" = "full",
  emptyLabel = "no events",
): string {
  if (!value) return emptyLabel
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  if (mode === "time") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`
}

function getActivityLevelClassName(level: CloudActivityLogEntry["level"], isDarkMode: boolean): string {
  if (level === "success") return isDarkMode ? "text-[#9AC99A]" : "text-[#2f7d32]"
  if (level === "warning") return isDarkMode ? "text-[#f2c182]" : "text-[#9a621f]"
  if (level === "error") return isDarkMode ? "text-swiss-orange-soft" : "text-[#c55a52]"
  return isDarkMode ? "text-[#F4F6F8]" : "text-gray-900"
}

export function AccountPanel({
  isDarkMode = false,
  onClose,
  userEmail,
  cloudStatusLabel,
  cloudStatusIndicatorClassName,
  pendingQueueCount = 0,
  conflictQueueCount = 0,
  hasActiveConflict = false,
  activeConflictDetails = null,
  authError,
  authMessage,
  onClearFeedback,
  onSyncNow,
  onKeepLocalConflict,
  onUseCloudConflict,
  onDeleteConflict,
  onSendSignInCode,
  onVerifySignInCode,
  onSignOut,
}: Props) {
  const { t } = useTranslation()
  const [emailDraft, setEmailDraft] = useState(userEmail ?? "")
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [codeDraft, setCodeDraft] = useState("")
  const [activityEntries, setActivityEntries] = useState<CloudActivityLogEntry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tone = isDarkMode
    ? {
        body: "text-[#A8B1BF]",
        caption: "text-[#8D98AA]",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        button: "border-[#313A47] bg-[#232A35] text-[#F4F6F8] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
      }
    : {
        body: "text-gray-600",
        caption: "text-gray-400",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        button: "border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200 hover:text-gray-900",
      }
  const fieldClassName = getNeutralFormControlClassName(isDarkMode, "rounded-md px-3 py-2 text-xs")
  const authButtonClassName = getCompactActionButtonClassName({ isDarkMode })
  const accountActionButtonClassName = `${authButtonClassName} inline-flex justify-center gap-1.5`
  const hasPendingCode = !userEmail && Boolean(pendingEmail)

  useEffect(() => {
    if (!userEmail) return
    setPendingEmail(null)
    setCodeDraft("")
    setEmailDraft(userEmail)
  }, [userEmail])

  useEffect(() => {
    const subscription = cloudActivityLogQuery.subscribe({
      next: setActivityEntries,
      error: () => setActivityEntries([]),
    })
    return () => subscription.unsubscribe()
  }, [])

  const feedbackSection = authError ? (
    <section className="space-y-2">
      <SectionHeaderRow label={t("common.message")} />
      <div className="rounded-md border border-swiss-orange-soft bg-swiss-orange-soft/10 px-3 py-2 text-xs text-[#c55a52] dark:text-swiss-orange-soft">
        {authError}
      </div>
    </section>
  ) : authMessage ? (
    <section className="space-y-2">
      <SectionHeaderRow label={t("common.message")} />
      <div className={fieldClassName}>
        {authMessage}
      </div>
    </section>
  ) : null

  return (
    <div className="space-y-4">
      <div className="rounded-md py-2">
        <SectionHeaderRow
          label={t("rightPanel.account.title")}
          actionIcon={<X className="h-2 w-2" />}
          actionLabel={t("rightPanel.account.close")}
          actionClassName={tone.action}
          onActionClick={onClose}
        />
      </div>
      {userEmail ? (
        <>
          <section className="space-y-2 pt-[13px]">
            <SectionHeaderRow
              label={t("rightPanel.account.signedInAs")}
              value={userEmail}
              valueClassName={`text-right ${tone.caption}`}
            />
            <div className="pt-1">
              <Button
                size="sm"
                className={`${accountActionButtonClassName} w-full`}
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true)
                  try {
                    await onSignOut()
                    onClearFeedback()
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              >
                {t("rightPanel.account.signOut")}
              </Button>
            </div>
          </section>
          {feedbackSection}
        </>
      ) : (
        <section className="space-y-2 pt-[13px]">
          <SectionHeaderRow
            label={t("rightPanel.account.signIn")}
            value={(
              <Label
                className={`text-right text-[11px] leading-none ${tone.caption}`}
                htmlFor="account-panel-email"
              >
                {t("common.email")}
              </Label>
            )}
          />
          <input
            id="account-panel-email"
            type="email"
            value={emailDraft}
            onChange={(event) => {
              const nextEmail = event.target.value
              setEmailDraft(nextEmail)
              if (pendingEmail && nextEmail.trim() !== pendingEmail) {
                setPendingEmail(null)
                setCodeDraft("")
              }
              if (authError || authMessage) onClearFeedback()
            }}
            className={`w-full ${fieldClassName}`}
            placeholder={t("rightPanel.account.emailPlaceholder")}
          />
          <div className="pt-1">
            <Button
              size="sm"
              className={`${accountActionButtonClassName} w-full`}
              disabled={isSubmitting || !emailDraft.trim()}
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  const normalizedEmail = emailDraft.trim()
                  await onSendSignInCode(normalizedEmail)
                  setPendingEmail(normalizedEmail)
                  setEmailDraft(normalizedEmail)
                  setCodeDraft("")
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              {hasPendingCode ? t("rightPanel.account.resendCode") : t("rightPanel.account.sendCode")}
            </Button>
          </div>
          {feedbackSection}
          {hasPendingCode ? (
            <div className="space-y-2 pt-2">
              <SectionHeaderRow
                label={t("rightPanel.account.code")}
                value={pendingEmail}
                valueClassName={`text-right ${tone.caption}`}
              />
              <input
                id="account-panel-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codeDraft}
                onChange={(event) => {
                  setCodeDraft(event.target.value.replace(/\D/g, "").slice(0, 6))
                  if (authError || authMessage) onClearFeedback()
                }}
                className={`w-full text-center font-mono tabular-nums ${fieldClassName}`}
                placeholder={t("rightPanel.account.codePlaceholder")}
              />
              <div className="pt-1">
                <Button
                  size="sm"
                  className={`${accountActionButtonClassName} w-full`}
                  disabled={isSubmitting || codeDraft.length !== 6}
                  onClick={async () => {
                    if (!pendingEmail) return
                    setIsSubmitting(true)
                    try {
                      await onVerifySignInCode(pendingEmail, codeDraft)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                >
                  {t("rightPanel.account.verifyCode")}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <section className="space-y-2 pt-[13px]">
        <SectionHeaderRow label={t("rightPanel.account.cloudStatus")} />
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`${cloudStatusIndicatorClassName} h-2.5 w-2.5 shrink-0 rounded-[2px]`} aria-hidden="true" />
          <span className={`min-w-0 truncate ${tone.caption}`}>{cloudStatusLabel}</span>
        </div>
        <div className="space-y-2 pt-1 text-xs">
          <div className="max-h-[190px] overflow-y-auto py-1">
            {activityEntries.length > 0 ? (
              <div className="space-y-1">
                {activityEntries.slice(0, 12).map((entry) => (
                  <div key={entry.id} className="grid grid-cols-[54px_1fr] gap-2 py-1 text-[11px] leading-snug">
                    <div className={`tabular-nums ${tone.caption}`}>
                      {formatActivityTimestamp(entry.createdAt, "time", t("common.noEvents"))}
                    </div>
                    <div className="min-w-0">
                      <div className={getActivityLevelClassName(entry.level, isDarkMode)}>
                        {entry.action}
                      </div>
                      {entry.projectTitle || entry.message ? (
                        <div className={`truncate ${tone.caption}`}>
                          {[entry.projectTitle, entry.message].filter(Boolean).join(" · ")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-2 text-[11px] ${tone.caption}`}>{t("rightPanel.account.noLocalActivity")}</div>
            )}
          </div>
          {userEmail && onSyncNow ? (
            <div className="space-y-2 pt-1">
              <Button
                size="sm"
                className={`${accountActionButtonClassName} w-full`}
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true)
                  try {
                    await onSyncNow()
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              >
                <RefreshCw className="h-2.5 w-2.5" />
                {t("rightPanel.account.syncNow")}
              </Button>
            </div>
          ) : null}
          {userEmail && (pendingQueueCount > 0 || conflictQueueCount > 0) ? (
            <div className={`rounded-md border px-3 py-2 ${isDarkMode ? "border-[#313A47]" : "border-gray-200"}`}>
              <div className="grid grid-cols-2 gap-2 text-[11px] leading-tight">
                <div>
                  <div className={tone.caption}>{t("rightPanel.account.queued")}</div>
                  <div className={tone.body}>{pendingQueueCount}</div>
                </div>
                <div>
                  <div className={tone.caption}>{t("rightPanel.account.conflicts")}</div>
                  <div className={tone.body}>{conflictQueueCount}</div>
                </div>
              </div>
            </div>
          ) : null}
          {userEmail && hasActiveConflict && onKeepLocalConflict && onUseCloudConflict ? (
            <div className={`space-y-2 rounded-md border px-3 py-2 ${isDarkMode ? "border-[#5a3840] bg-swiss-orange-soft/10" : "border-swiss-orange-soft bg-swiss-orange-soft/10"}`}>
              <div className={`text-[11px] leading-snug ${isDarkMode ? "text-swiss-orange-soft" : "text-[#c55a52]"}`}>
                {t("rightPanel.account.conflictMessage")}
              </div>
              {activeConflictDetails ? (
                <div className={`grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 rounded-md border px-2 py-2 text-[11px] leading-tight ${isDarkMode ? "border-[#5a3840]" : "border-swiss-orange-soft/40"}`}>
                  <div className={tone.caption}>{t("common.project")}</div>
                  <div className={`min-w-0 truncate ${tone.body}`}>{activeConflictDetails.title || t("rightPanel.account.untitledProject")}</div>
                  <div className={tone.caption}>{t("rightPanel.account.localEdit")}</div>
                  <div className={tone.body}>{formatActivityTimestamp(activeConflictDetails.localUpdatedAt, "full", t("common.noEvents"))}</div>
                  <div className={tone.caption}>{t("rightPanel.account.lastSync")}</div>
                  <div className={tone.body}>{formatActivityTimestamp(activeConflictDetails.lastSyncedAt, "full", t("common.noEvents"))}</div>
                  <div className={tone.caption}>{t("rightPanel.account.revision")}</div>
                  <div className={tone.body}>
                    {typeof activeConflictDetails.localRevision === "number"
                      ? t("rightPanel.account.localBaseRevision", { revision: activeConflictDetails.localRevision })
                      : t("rightPanel.account.localOnly")}
                  </div>
                </div>
              ) : null}
              <div className={`grid gap-2 pt-1 ${onDeleteConflict ? "grid-cols-3" : "grid-cols-2"}`}>
                {onDeleteConflict ? (
                  <Button
                    size="sm"
                    className={`${getCompactActionButtonClassName({ isDarkMode, danger: true })} inline-flex w-full items-center justify-center gap-1.5`}
                    disabled={isSubmitting}
                    onClick={async () => {
                      setIsSubmitting(true)
                      try {
                        await onDeleteConflict()
                      } finally {
                        setIsSubmitting(false)
                      }
                    }}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    {t("common.delete")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  className={`${accountActionButtonClassName} w-full`}
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true)
                    try {
                      await onUseCloudConflict()
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                >
                  {t("rightPanel.account.useCloud")}
                </Button>
                <Button
                  size="sm"
                  className={`${accountActionButtonClassName} w-full`}
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true)
                    try {
                      await onKeepLocalConflict()
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                >
                  {t("rightPanel.account.keepLocal")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
