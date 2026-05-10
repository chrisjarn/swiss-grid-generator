"use client"

import { Paperclip, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"

import { Button } from "@/shared/ui/button"
import {
  getCompactActionButtonClassName,
  getPopupInputClassName,
  getPopupMutedTextClassName,
} from "@/shared/ui/popup-styles"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"
import { translateMessage, useTranslation } from "@/lib/i18n"
import {
  addCloudActivityLogEntry,
  formatCloudActivityLogForSupport,
  listCloudActivityLogEntries,
} from "@/lib/user-layout-library"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { submitFeedbackMessage, type FeedbackScreenshot } from "@/lib/supabase/feedback"

const MAX_SCREENSHOTS = 3
const MAX_SCREENSHOT_BYTES = 1_000_000
const MAX_TOTAL_SCREENSHOT_BYTES = 3_000_000
const ACCEPTED_SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const

type FeedbackFormState = {
  email: string
  comment: string
}

type FieldKey = keyof FeedbackFormState | "screenshots"

type Props = {
  isDarkMode?: boolean
  appVersion: string
  userId: string | null
  userEmail: string | null
  onClose: () => void
}

const INITIAL_FORM_STATE: FeedbackFormState = {
  email: "",
  comment: "",
}

function Section({
  title,
  value,
  children,
}: {
  title: string
  value?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-2 pt-[13px]">
      <SectionHeaderRow label={title} value={value} />
      {children}
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">{message}</p>
}

function formatBytes(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`
  if (value >= 1_000) return `${Math.round(value / 1_000)} KB`
  return `${value} B`
}

function isAcceptedScreenshotType(value: string): value is FeedbackScreenshot["type"] {
  return ACCEPTED_SCREENSHOT_TYPES.includes(value as FeedbackScreenshot["type"])
}

function getScreenshotValidationError(files: File[]) {
  if (files.length > MAX_SCREENSHOTS) {
    return translateMessage("rightPanel.feedback.tooManyScreenshots", { count: MAX_SCREENSHOTS })
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > MAX_TOTAL_SCREENSHOT_BYTES) {
    return translateMessage("rightPanel.feedback.screenshotsTooLarge", { size: formatBytes(MAX_TOTAL_SCREENSHOT_BYTES) })
  }

  const invalidFile = files.find((file) => !isAcceptedScreenshotType(file.type))
  if (invalidFile) {
    return translateMessage("rightPanel.feedback.invalidScreenshotType", { name: invalidFile.name })
  }

  const oversizedFile = files.find((file) => file.size > MAX_SCREENSHOT_BYTES)
  if (oversizedFile) {
    return translateMessage("rightPanel.feedback.screenshotTooLarge", { name: oversizedFile.name, size: formatBytes(MAX_SCREENSHOT_BYTES) })
  }

  return null
}

function getValidationErrors(
  values: FeedbackFormState,
  screenshotFiles: File[],
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {}
  const email = values.email.trim()
  const comment = values.comment.trim()

  if (!email) {
    errors.email = translateMessage("rightPanel.feedback.emailRequired")
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = translateMessage("rightPanel.feedback.emailInvalid")
  }

  if (!comment) {
    errors.comment = translateMessage("rightPanel.feedback.commentRequired")
  } else if (comment.length > 4000) {
    errors.comment = translateMessage("rightPanel.feedback.commentTooLong")
  }

  const screenshotError = getScreenshotValidationError(screenshotFiles)
  if (screenshotError) {
    errors.screenshots = screenshotError
  }

  return errors
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const [, base64Data] = reader.result.split(",", 2)
        if (base64Data) {
          resolve(base64Data)
          return
        }
        reject(new Error(translateMessage("rightPanel.feedback.encodeError")))
        return
      }
      reject(new Error(translateMessage("rightPanel.feedback.readError")))
    }
    reader.onerror = () => reject(reader.error ?? new Error(translateMessage("rightPanel.feedback.readError")))
    reader.readAsDataURL(file)
  })
}

async function buildScreenshotPayload(files: File[]): Promise<FeedbackScreenshot[]> {
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type as FeedbackScreenshot["type"],
      size: file.size,
      base64Data: await readFileAsBase64(file),
    })),
  )
}

function getFeedbackSubmitErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error && typeof error.message === "string"
      ? error.message
      : ""
  const rawDetails = typeof error === "object" && error && "details" in error && typeof error.details === "string"
    ? error.details
    : ""
  const rawHint = typeof error === "object" && error && "hint" in error && typeof error.hint === "string"
    ? error.hint
    : ""
  const diagnosticText = [rawMessage, rawDetails, rawHint].filter(Boolean).join(" ")

  if (/support_log|column .* does not exist|schema cache/i.test(diagnosticText)) {
    return translateMessage("rightPanel.feedback.logColumnMissing")
  }

  if (/add_feedback_screenshot|feedback_screenshots|function .* does not exist/i.test(diagnosticText)) {
    return translateMessage("rightPanel.feedback.screenshotStorageMissing")
  }

  if (/ambiguous|column reference .* ambiguous|variable_conflict/i.test(diagnosticText)) {
    return translateMessage("rightPanel.feedback.screenshotStorageAmbiguous")
  }

  if (/row-level security|violates row-level security|permission denied/i.test(diagnosticText)) {
    return translateMessage("rightPanel.feedback.policyRejected")
  }

  if (/screenshots|check constraint|feedback_messages_screenshots/i.test(diagnosticText)) {
    return translateMessage("rightPanel.feedback.attachmentLimit")
  }

  return translateMessage("rightPanel.feedback.submitFailed")
}

export function FeedbackPanel({ isDarkMode = false, appVersion, userId, userEmail, onClose }: Props) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FeedbackFormState>(() => ({
    ...INITIAL_FORM_STATE,
    email: userEmail?.trim() ?? "",
  }))
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [attachSupportLog, setAttachSupportLog] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  useEffect(() => {
    const signedInEmail = userEmail?.trim()
    if (!signedInEmail) return
    setForm((current) => current.email === signedInEmail ? current : { ...current, email: signedInEmail })
    setErrors((current) => {
      if (!current.email) return current
      const next = { ...current }
      delete next.email
      return next
    })
  }, [userEmail])

  const tone = isDarkMode
    ? {
        heading: "text-gray-100",
        caption: "text-[#8D98AA]",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        success: "border-[#9AC99A] bg-[#9AC99A]/10 text-[#9AC99A]",
        error: "border-swiss-orange-soft bg-swiss-orange-soft/10 text-swiss-orange-soft",
      }
    : {
        heading: "text-gray-900",
        caption: "text-gray-400",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        success: "border-[#9AC99A] bg-[#9AC99A]/10 text-[#2f7d32]",
        error: "border-swiss-orange-soft bg-swiss-orange-soft/10 text-[#c55a52]",
      }
  const fieldClassName = getPopupInputClassName(isDarkMode, "rounded-sm px-2 py-1 text-[12px]")
  const feedbackButtonClassName = getCompactActionButtonClassName({ isDarkMode })
  const mutedTextClassName = getPopupMutedTextClassName(isDarkMode)

  const setField = <K extends keyof FeedbackFormState,>(key: K, value: FeedbackFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    if (submitMessage) {
      setSubmitMessage(null)
    }
  }

  const scrollPanelToTop = () => {
    const scrollRoot = rootRef.current?.closest<HTMLElement>('[data-help-scroll-root="true"]')
    if (scrollRoot) {
      scrollRoot.scrollTo({ top: 0 })
    }
  }

  const handleScreenshotChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (selectedFiles.length === 0) return

    const nextFiles = [...screenshotFiles, ...selectedFiles]
    const validationError = getScreenshotValidationError(nextFiles)
    if (validationError) {
      setErrors((current) => ({ ...current, screenshots: validationError }))
      return
    }

    setScreenshotFiles(nextFiles)
    setErrors((current) => {
      if (!current.screenshots) return current
      const next = { ...current }
      delete next.screenshots
      return next
    })
    if (submitMessage) {
      setSubmitMessage(null)
    }
  }

  const handleRemoveScreenshot = (index: number) => {
    setScreenshotFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setErrors((current) => {
      if (!current.screenshots) return current
      const next = { ...current }
      delete next.screenshots
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = getValidationErrors(form, screenshotFiles)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmitMessage(t("rightPanel.feedback.requiredAttention"))
      scrollPanelToTop()
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)
    void addCloudActivityLogEntry({
      level: "info",
      action: t("rightPanel.feedback.submitRequested"),
      message: attachSupportLog ? t("rightPanel.feedback.localLogAttached") : undefined,
    })

    try {
      const supabase = getSupabaseBrowserClient()
      const screenshots = await buildScreenshotPayload(screenshotFiles)
      const supportLog = attachSupportLog
        ? formatCloudActivityLogForSupport(await listCloudActivityLogEntries())
        : null

      await submitFeedbackMessage(supabase, {
        userId,
        email: form.email.trim(),
        comment: form.comment.trim(),
        screenshots,
        supportLog,
        pageUrl: window.location.href,
        userAgent: window.navigator.userAgent,
        appVersion,
      })

      setHasSubmitted(true)
      setErrors({})
      setSubmitMessage(null)
      setScreenshotFiles([])
      setAttachSupportLog(false)
      void addCloudActivityLogEntry({
        level: "success",
        action: t("rightPanel.feedback.feedbackSent"),
        message: screenshotFiles.length > 0
          ? `${screenshotFiles.length} ${screenshotFiles.length === 1 ? t("rightPanel.feedback.screenshot") : t("rightPanel.feedback.screenshotsPlural")}`
          : undefined,
      })
      scrollPanelToTop()
    } catch (error) {
      const message = getFeedbackSubmitErrorMessage(error)
      const rawMessage = error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error && typeof error.message === "string"
          ? error.message
          : undefined
      setSubmitMessage(message)
      void addCloudActivityLogEntry({
        level: "error",
        action: t("rightPanel.feedback.feedbackFailed"),
        message: rawMessage ? `${message} (${rawMessage})` : message,
      })
      scrollPanelToTop()
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderInput = ({
    field,
    placeholder,
    type = "text",
    id,
  }: {
    field: keyof FeedbackFormState
    placeholder: string
    type?: "text" | "email"
    id?: string
  }) => (
    <div className="space-y-1.5">
      <input
        id={id}
        type={type}
        value={form[field]}
        onChange={(event) => setField(field, event.target.value)}
        className={`w-full ${fieldClassName}`}
        placeholder={placeholder}
        autoComplete={type === "email" ? "email" : undefined}
        inputMode={type === "email" ? "email" : undefined}
      />
      <FieldError message={errors[field]} />
    </div>
  )

  const renderTextarea = () => (
    <div className="space-y-1.5">
      <textarea
        value={form.comment}
        onChange={(event) => setField("comment", event.target.value)}
        rows={7}
        className={`min-h-20 w-full resize-none leading-[1.45] ${fieldClassName}`}
        placeholder={t("rightPanel.feedback.commentPlaceholder")}
      />
      <FieldError message={errors.comment} />
    </div>
  )

  const renderSupportLogCheckbox = () => (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-swiss-orange-soft">
        {t("rightPanel.feedback.attachLocalLog")}
      </span>
      <input
        type="checkbox"
        checked={attachSupportLog}
        onChange={(event) => setAttachSupportLog(event.target.checked)}
        className="h-3.5 w-3.5 shrink-0"
      />
    </label>
  )

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="rounded-md py-2">
        <SectionHeaderRow
          label={t("rightPanel.feedback.title")}
          actionIcon={<X className="h-2 w-2" />}
          actionLabel={t("rightPanel.feedback.close")}
          actionClassName={tone.action}
          onActionClick={onClose}
        />
      </div>

      {submitMessage ? (
        <div className={`rounded-md border px-3 py-2 text-xs ${tone.error}`}>
          {submitMessage}
        </div>
      ) : null}

      {hasSubmitted ? (
        <div className="space-y-4">
          <div className={`rounded-md border px-3 py-2 text-xs ${tone.success}`}>
            {t("rightPanel.feedback.sent")}
          </div>
        </div>
      ) : (
        <form className={`space-y-4 ${mutedTextClassName}`} onSubmit={handleSubmit} noValidate>
          <section className="space-y-2 pt-[13px]">
            <SectionHeaderRow
              label={t("rightPanel.feedback.email")}
            />
            {renderInput({
              field: "email",
              type: "email",
              id: "feedback-panel-email",
              placeholder: "name@example.com",
            })}
          </section>

          <section className="space-y-2 pt-[13px]">
            <SectionHeaderRow
              label={t("rightPanel.feedback.comment")}
              actions={(
                <span className={`shrink-0 text-right text-[10px] uppercase tracking-[0.08em] ${tone.caption}`}>
                  {form.comment.trim().length}/4000
                </span>
              )}
            />
            {renderTextarea()}
          </section>

          <Section title={t("rightPanel.feedback.screenshots")}>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_SCREENSHOT_TYPES.join(",")}
              multiple
              className="hidden"
              onChange={handleScreenshotChange}
            />
            <div className="space-y-2">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={screenshotFiles.length >= MAX_SCREENSHOTS}
                className={`${feedbackButtonClassName} inline-flex w-full items-center justify-center gap-1.5 disabled:cursor-not-allowed`}
              >
                <Paperclip className="h-3 w-3" />
                {t("rightPanel.feedback.attachScreenshots")}
              </Button>
              <p className={`text-[10px] uppercase tracking-[0.08em] ${tone.caption}`}>
                {t("rightPanel.feedback.attachmentHelp", { count: MAX_SCREENSHOTS, size: formatBytes(MAX_SCREENSHOT_BYTES) })}
              </p>
            </div>
            {screenshotFiles.length > 0 ? (
              <div className="space-y-1.5">
                {screenshotFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className={`flex min-h-9 items-center gap-2 rounded-sm border px-2 py-1 text-[12px] ${
                      isDarkMode
                        ? "border-[#313A47] bg-[#232A35] text-[#F4F6F8]"
                        : "border-gray-300 bg-white text-gray-900"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium leading-tight">{file.name}</p>
                      <p className={`text-[10px] leading-tight ${tone.caption}`}>{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={t("rightPanel.feedback.removeScreenshot", { name: file.name })}
                      onClick={() => handleRemoveScreenshot(index)}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${isDarkMode ? "text-gray-400 hover:text-gray-100" : "text-gray-500 hover:text-gray-900"}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <FieldError message={errors.screenshots} />
          </Section>

          <section className="space-y-2 pt-[13px]">
            {renderSupportLogCheckbox()}
          </section>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className={`${feedbackButtonClassName} w-full`}
            >
              {isSubmitting ? t("rightPanel.feedback.sending") : t("rightPanel.feedback.send")}
            </Button>
          </div>

          <div className={`pt-1 text-[10px] uppercase tracking-[0.08em] ${tone.caption}`}>
            {t("common.version")} {appVersion}
          </div>
        </form>
      )}
    </div>
  )
}
