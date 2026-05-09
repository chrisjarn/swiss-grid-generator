"use client"

import type { ComponentProps } from "react"

import { PreviewWorkspace } from "@/components/preview/PreviewWorkspace"

export type CanvasContainerProps = ComponentProps<typeof PreviewWorkspace>

export function CanvasContainer(props: CanvasContainerProps) {
  return <PreviewWorkspace {...props} />
}
