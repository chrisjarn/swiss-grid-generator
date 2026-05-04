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
  if (danger) {
    return cn(
      "h-[22px] min-h-0 rounded-[5px] border px-2 py-0 text-[11px] leading-none transition-colors active:translate-y-px",
      isDarkMode
        ? "border-[#6f3d45] bg-[#2B2028] text-swiss-orange-soft hover:bg-[#36262F] hover:text-[#ffd2ce]"
        : "border-swiss-orange-soft bg-[#fff6f5] text-[#c55a52] hover:bg-[#ffecea] hover:text-[#9d4039]",
    )
  }

  if (active) {
    return cn(
      "h-[22px] min-h-0 rounded-[5px] border px-2 py-0 text-[11px] leading-none transition-colors active:translate-y-px",
      isDarkMode
        ? "border-[#A8B1BF] bg-[#F4F6F8] text-[#1D232D] hover:bg-white"
        : "border-gray-900 bg-gray-900 text-white hover:bg-gray-800",
    )
  }

  return cn(
    "h-[22px] min-h-0 rounded-[5px] border px-2 py-0 text-[11px] leading-none transition-colors active:translate-y-px",
    isDarkMode
      ? "border-[#313A47] bg-[#232A35] text-[#F4F6F8] hover:bg-[#1D232D] hover:text-[#F4F6F8]"
      : "border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200 hover:text-gray-900",
  )
}

export function getPopupSurfaceClassName(isDarkMode: boolean, className?: string): string {
  return cn(
    isDarkMode && "dark",
    "rounded-sm border p-4 shadow-lg backdrop-blur-sm",
    isDarkMode
      ? "border-[#313A47] bg-[#1D232D]/95 text-[#F4F6F8]"
      : "border-gray-200 bg-gray-100/95 text-gray-900",
    className,
  )
}

export function getPopupInputClassName(isDarkMode: boolean, className?: string): string {
  return cn(
    "w-full rounded-[5px] border px-3 py-2 text-sm outline-none transition-colors",
    isDarkMode
      ? "border-[#313A47] bg-[#232A35] text-[#F4F6F8] placeholder:text-[#8D98AA] focus:border-[#A8B1BF]"
      : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-500",
    className,
  )
}

export function getPopupMutedTextClassName(isDarkMode: boolean): string {
  return isDarkMode ? "text-[#A8B1BF]" : "text-gray-600"
}
