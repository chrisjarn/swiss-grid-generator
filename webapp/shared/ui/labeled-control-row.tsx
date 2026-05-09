"use client"

import type { ReactNode } from "react"

type Props = {
  label: ReactNode
  children: ReactNode
  variant?: "default" | "popup"
  className?: string
  labelClassName?: string
  controlClassName?: string
}

export function LabeledControlRow({
  label,
  children,
  variant = "default",
  className = "",
  labelClassName = "",
  controlClassName = "",
}: Props) {
  const baseClassName = variant === "popup"
    ? "grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3"
    : "grid grid-cols-[minmax(0,1fr)_168px] items-center gap-x-3 gap-y-2"
  const resolvedControlClassName = variant === "popup"
    ? `min-w-0 w-full justify-self-stretch ${controlClassName}`.trim()
    : `min-w-0 ${controlClassName}`.trim()

  return (
    <div className={`${baseClassName} ${className}`.trim()}>
      <div className={`min-w-0 ${labelClassName}`.trim()}>{label}</div>
      <div className={resolvedControlClassName}>{children}</div>
    </div>
  )
}
