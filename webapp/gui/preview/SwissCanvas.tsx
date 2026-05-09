"use client"

import { useEffect, useMemo, useRef } from "react"

import type { PageExportGuideGroup, PageExportPlan } from "@/core/types/export-plan"
import {
  buildCanvasRenderPlansFromPageExportPlan,
  drawCanvasLayerPlanStack,
} from "@/lib/canvas-page-renderer"
import { formatSvgColor } from "@/lib/export-colors"
import { cn } from "@/lib/utils"

type SwissCanvasProps = {
  plan: PageExportPlan | null
  scale?: number
  showGuides?: boolean
  className?: string
}

function resolveScale(scale: number | undefined): number {
  if (scale === undefined) return 1
  if (!Number.isFinite(scale) || scale <= 0) return 1
  return scale
}

function drawGuideGroup(ctx: CanvasRenderingContext2D, group: PageExportGuideGroup): void {
  ctx.save()
  ctx.strokeStyle = formatSvgColor(group.strokeColor)
  ctx.lineWidth = group.strokeWidth
  ctx.setLineDash(group.dashPattern)

  for (const line of group.lines) {
    ctx.beginPath()
    ctx.moveTo(line.x1, line.y1)
    ctx.lineTo(line.x2, line.y2)
    ctx.stroke()
  }

  for (const rect of group.rects) {
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  }

  ctx.restore()
}

function drawPlan(ctx: CanvasRenderingContext2D, plan: PageExportPlan, showGuides: boolean): void {
  ctx.clearRect(0, 0, plan.pageWidth, plan.pageHeight)

  ctx.save()
  ctx.translate(plan.pageWidth / 2, plan.pageHeight / 2)
  ctx.rotate((plan.rotation * Math.PI) / 180)
  ctx.translate(-plan.pageWidth / 2, -plan.pageHeight / 2)

  ctx.fillStyle = plan.backgroundColor ? formatSvgColor(plan.backgroundColor) : "#ffffff"
  ctx.fillRect(0, 0, plan.pageWidth, plan.pageHeight)

  if (showGuides) {
    for (const guideGroup of plan.guideGroups) {
      drawGuideGroup(ctx, guideGroup)
    }
  }

  const canvasPlans = buildCanvasRenderPlansFromPageExportPlan(plan, { signatureMode: "key" })
  drawCanvasLayerPlanStack(ctx, canvasPlans.orderedLayerPlans)

  if (plan.pageOutline) {
    ctx.strokeStyle = formatSvgColor(plan.pageOutline.strokeColor)
    ctx.lineWidth = plan.pageOutline.strokeWidth
    ctx.setLineDash([])
    ctx.strokeRect(0, 0, plan.pageWidth, plan.pageHeight)
  }

  ctx.restore()
}

export function SwissCanvas({
  plan,
  scale,
  showGuides = true,
  className,
}: SwissCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resolvedScale = resolveScale(scale)
  const canvasSize = useMemo(() => {
    if (!plan) return { width: 1, height: 1 }
    return {
      width: Math.max(1, Math.ceil(plan.pageWidth * resolvedScale)),
      height: Math.max(1, Math.ceil(plan.pageHeight * resolvedScale)),
    }
  }, [plan, resolvedScale])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    context.setTransform(resolvedScale, 0, 0, resolvedScale, 0, 0)

    if (!plan) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    drawPlan(context, plan, showGuides)
  }, [canvasSize.height, canvasSize.width, plan, resolvedScale, showGuides])

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      style={{
        width: plan ? plan.pageWidth * resolvedScale : 1,
        height: plan ? plan.pageHeight * resolvedScale : 1,
      }}
      className={cn("block bg-white shadow-[0_12px_36px_rgba(15,23,42,0.18)]", className)}
      data-swiss-canvas="page-export-plan"
    />
  )
}
