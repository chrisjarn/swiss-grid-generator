import { getNeutralFormControlClassName } from "@/shared/ui/popup-styles"
import { SECTION_HEADLINE_CLASSNAME } from "@/shared/ui/section-headline"
import { SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME } from "@/shared/ui/section-header-row"

export const SETTINGS_ROW_LABEL_CLASSNAME = `${SECTION_HEADLINE_CLASSNAME} ${SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME} flex h-8 items-center text-left leading-none`
export const SETTINGS_OPEN_LIST_LABEL_CLASSNAME = `${SECTION_HEADLINE_CLASSNAME} ${SECTION_HEADER_NEUTRAL_LABEL_CLASSNAME} flex h-7 items-center text-left leading-none`
export const SETTINGS_FINE_CHEVRON_ICON_CLASSNAME = "h-2 w-2 stroke-[1.5]"
export const SETTINGS_FINE_ICON_CLASSNAME = "h-3 w-3 stroke-[1.5]"

export function getSettingsControlClassName(isDarkMode: boolean, className = "") {
  return getNeutralFormControlClassName(
    isDarkMode,
    `h-8 w-full rounded-sm px-2 text-[12px] font-normal normal-case tracking-normal ${className}`.trim(),
  )
}

export function getSettingsValueBadgeClassName(isDarkMode: boolean) {
  return `inline-flex min-w-max items-center justify-end whitespace-nowrap rounded-sm px-1.5 py-0.5 text-xs font-mono ${
    isDarkMode ? "bg-surface text-foreground" : "bg-panel text-foreground"
  }`
}

export function getSettingsIconButtonClassName(isDarkMode: boolean, active: boolean) {
  const baseClassName = "inline-flex h-8 w-full items-center justify-center rounded-sm border transition-colors active:translate-y-px"
  if (active) {
    return `${baseClassName} ${
      isDarkMode
        ? "border-[color-mix(in_srgb,var(--color-accent)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-foreground"
        : "border-[color-mix(in_srgb,var(--color-accent)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-accent-foreground"
    }`
  }
  return `${baseClassName} ${
    isDarkMode
      ? "border-border bg-surface text-foreground hover:bg-panel"
      : "border-border bg-panel text-foreground hover:bg-surface"
  }`
}

export function getSettingsOpenListClassName(isDarkMode: boolean) {
  return `overflow-hidden rounded-sm text-[12px] ${
    isDarkMode
      ? "bg-surface text-foreground"
      : "bg-panel text-foreground"
  }`
}

export function getSettingsOpenListOptionClassName(isDarkMode: boolean, active: boolean) {
  return `flex h-7 w-full items-center px-2 text-left font-normal leading-none transition-colors ${
    active
      ? isDarkMode
        ? "bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-foreground"
        : "bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-accent-foreground"
      : isDarkMode
        ? "text-foreground hover:bg-panel"
        : "text-foreground hover:bg-surface"
  }`
}
