"use client"

import type { ComponentProps } from "react"

import { ControlSidebar } from "@/components/layout/ControlSidebar"

export type LeftToolbarProps = ComponentProps<typeof ControlSidebar>

export function LeftToolbar(props: LeftToolbarProps) {
  return <ControlSidebar {...props} />
}
