"use client"

import { useTranslation } from "@/lib/i18n"

type Props = {
  title: string
  description?: string
  isOpen: boolean
  stepTitle?: string
  stepCaption?: string
  stepIndex: number
  stepCount: number
  waitingForLayerClick: boolean
  canGoBack: boolean
  canGoNext: boolean
  isDarkMode: boolean
  onStart: () => void
  onClose: () => void
  onBack: () => void
  onNext: () => void
}

export function ProjectTourOverlay({
  title,
  description,
  isOpen,
  stepTitle,
  stepCaption,
  stepIndex,
  stepCount,
  waitingForLayerClick,
  canGoBack,
  canGoNext,
  isDarkMode,
  onStart,
  onClose,
  onBack,
  onNext,
}: Props) {
  const { t } = useTranslation()

  if (!isOpen) {
    return (
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
        <button
          type="button"
          onClick={onStart}
          className={`pointer-events-auto rounded-sm border px-3 py-2 text-left text-[11px] uppercase tracking-[0.08em] transition-colors ${
            isDarkMode
              ? "border-border bg-[color-mix(in_srgb,var(--color-panel-bg)_95%,transparent)] text-foreground hover:border-muted-foreground"
              : "border-border bg-[color-mix(in_srgb,var(--color-page-default)_95%,transparent)] text-foreground hover:border-muted-foreground"
          }`}
        >
          {t("ui.preview.tour.open")}
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 w-[min(720px,calc(100%-2rem))] -translate-x-1/2">
      <div
        className={`pointer-events-auto rounded-sm border px-4 py-3 shadow-lg backdrop-blur-sm ${
          isDarkMode
            ? "border-border bg-[color-mix(in_srgb,var(--color-panel-bg)_95%,transparent)] text-foreground"
            : "border-divider bg-[color-mix(in_srgb,var(--color-page-default)_95%,transparent)] text-foreground"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-[11px] uppercase tracking-[0.08em] ${isDarkMode ? "text-muted-foreground" : "text-muted-foreground"}`}>
              {title}
            </div>
            {description ? (
              <div className={`mt-1 text-[11px] leading-snug ${isDarkMode ? "text-muted-foreground" : "text-muted-foreground"}`}>
                {description}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              isDarkMode ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("ui.preview.tour.close")}
          </button>
        </div>

        <div className={`mt-3 border-t pt-3 ${isDarkMode ? "border-divider" : "border-divider"}`}>
          <div className={`text-[11px] uppercase tracking-[0.08em] ${isDarkMode ? "text-muted-foreground" : "text-muted-foreground"}`}>
            {t("ui.preview.tour.step")} {Math.min(stepIndex + 1, stepCount)} / {Math.max(1, stepCount)}
          </div>
          {stepTitle ? (
            <div className="mt-1 text-sm font-medium">
              {stepTitle}
            </div>
          ) : null}
          {stepCaption ? (
            <div className={`mt-2 text-sm leading-relaxed ${isDarkMode ? "text-muted-foreground" : "text-muted-foreground"}`}>
              {stepCaption}
            </div>
          ) : null}
          {waitingForLayerClick ? (
            <div className={`mt-2 text-[11px] uppercase tracking-[0.08em] ${isDarkMode ? "text-error" : "text-error"}`}>
              {t("ui.preview.tour.waitingForLayer")}
            </div>
          ) : null}
        </div>

        <div className={`mt-3 flex items-center justify-between gap-3 border-t pt-3 ${isDarkMode ? "border-divider" : "border-divider"}`}>
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className={`rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              !canGoBack
                ? isDarkMode
                  ? "cursor-not-allowed border-border text-muted-foreground opacity-50"
                  : "cursor-not-allowed border-divider text-muted-foreground opacity-50"
                : isDarkMode
                  ? "border-border text-foreground hover:border-muted-foreground"
                  : "border-border text-foreground hover:border-muted-foreground"
            }`}
          >
            {t("ui.preview.tour.back")}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={waitingForLayerClick || !canGoNext}
            className={`rounded-sm px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              waitingForLayerClick || !canGoNext
                ? isDarkMode
                  ? "cursor-not-allowed bg-surface text-muted-foreground opacity-50"
                  : "cursor-not-allowed bg-surface text-muted-foreground opacity-50"
                : "bg-accent text-accent-foreground hover:brightness-95"
            }`}
          >
            {canGoNext ? t("ui.preview.tour.next") : t("ui.preview.tour.done")}
          </button>
        </div>
      </div>
    </div>
  )
}
