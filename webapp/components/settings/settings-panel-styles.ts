import { getNeutralFormControlClassName } from "@/components/ui/popup-styles"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

export const SETTINGS_ROW_LABEL_CLASSNAME = `${SECTION_HEADLINE_CLASSNAME} flex h-8 items-center text-left leading-none`
export const SETTINGS_OPEN_LIST_LABEL_CLASSNAME = `${SECTION_HEADLINE_CLASSNAME} flex h-7 items-center text-left leading-none`

export function getSettingsControlClassName(isDarkMode: boolean, className = "") {
  return getNeutralFormControlClassName(
    isDarkMode,
    `h-8 w-full rounded-sm px-2 text-[12px] font-normal normal-case tracking-normal ${className}`.trim(),
  )
}

export function getSettingsValueBadgeClassName(isDarkMode: boolean) {
  return `rounded-sm px-1.5 py-0.5 text-xs font-mono ${
    isDarkMode ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-900"
  }`
}

export function getSettingsIconButtonClassName(isDarkMode: boolean, active: boolean) {
  const baseClassName = "inline-flex h-8 w-full items-center justify-center rounded-sm border transition-colors active:translate-y-px"
  if (active) {
    return `${baseClassName} ${
      isDarkMode
        ? "border-swiss-orange-soft/70 bg-swiss-orange-soft/20 text-[#F4F6F8]"
        : "border-swiss-orange-soft/70 bg-swiss-orange-soft/15 text-[#9d4039]"
    }`
  }
  return `${baseClassName} ${
    isDarkMode
      ? "border-[#313A47] bg-[#232A35] text-[#F4F6F8] hover:bg-[#1D232D]"
      : "border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200"
  }`
}

export function getSettingsOpenListClassName(isDarkMode: boolean) {
  return `overflow-hidden rounded-sm border text-[12px] ${
    isDarkMode
      ? "border-[#313A47] bg-[#232A35] text-[#F4F6F8]"
      : "border-gray-300 bg-gray-100 text-gray-900"
  }`
}

export function getSettingsOpenListOptionClassName(isDarkMode: boolean, active: boolean) {
  return `flex h-7 w-full items-center px-2 text-left font-normal leading-none transition-colors ${
    active
      ? isDarkMode
        ? "bg-swiss-orange-soft/20 text-[#F4F6F8]"
        : "bg-swiss-orange-soft/15 text-[#9d4039]"
      : isDarkMode
        ? "text-[#F4F6F8] hover:bg-[#1D232D]"
        : "text-gray-900 hover:bg-gray-200"
  }`
}
