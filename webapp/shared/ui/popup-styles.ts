import { cn } from "@/lib/utils"

type ToneArgs = {
  isDarkMode?: boolean
  active?: boolean
  danger?: boolean
}

export function getCompactActionButtonClassName({
  isDarkMode = false,
  active = false,
  danger = false,
}: ToneArgs = {}): string {
  const baseButtonClassName =
    "h-[24px] min-h-0 rounded-[5px] border px-2.5 text-[11px] leading-[1] transition-colors active:translate-y-px"

  if (danger) {
    return cn(
      baseButtonClassName,
      isDarkMode
        ? "border-error bg-[color-mix(in_srgb,var(--color-error)_16%,var(--color-panel-bg))] text-error hover:bg-[color-mix(in_srgb,var(--color-error)_22%,var(--color-panel-bg))] hover:text-accent-foreground"
        : "border-error bg-[color-mix(in_srgb,var(--color-error)_8%,var(--color-panel-bg))] text-error hover:bg-[color-mix(in_srgb,var(--color-error)_14%,var(--color-panel-bg))] hover:text-accent-foreground",
    )
  }

  if (active) {
    return cn(
      baseButtonClassName,
      isDarkMode
        ? "border-[color-mix(in_srgb,var(--color-accent)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-foreground hover:bg-[color-mix(in_srgb,var(--color-accent)_28%,transparent)]"
        : "border-[color-mix(in_srgb,var(--color-accent)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-accent-foreground hover:bg-[color-mix(in_srgb,var(--color-accent)_22%,transparent)]",
    )
  }

  return cn(
    baseButtonClassName,
    isDarkMode
      ? "border-border bg-surface text-foreground hover:bg-panel hover:text-foreground"
      : "border-border bg-panel text-foreground hover:bg-surface hover:text-foreground",
  )
}

export function getPopupSurfaceClassName(isDarkMode: boolean, className?: string): string {
  return cn(
    isDarkMode && "dark",
    "rounded-sm border p-4 shadow-lg backdrop-blur-sm",
    isDarkMode
      ? "border-border bg-[color-mix(in_srgb,var(--color-panel-bg)_95%,transparent)] text-foreground"
      : "border-divider bg-[color-mix(in_srgb,var(--color-panel-bg)_95%,transparent)] text-foreground",
    className,
  )
}

export function getNeutralFormControlClassName(isDarkMode: boolean, className?: string): string {
  return cn(
    "rounded-[5px] border outline-none transition-colors",
    isDarkMode
      ? "border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-muted-foreground"
      : "border-border bg-panel text-foreground placeholder:text-muted-foreground focus:border-muted-foreground",
    className,
  )
}

export function getPopupInputClassName(isDarkMode: boolean, className?: string): string {
  return getNeutralFormControlClassName(isDarkMode, cn("w-full px-3 py-2 text-sm", className))
}

export function getPopupMutedTextClassName(isDarkMode: boolean): string {
  return isDarkMode ? "text-muted-foreground" : "text-muted-foreground"
}
