import {
  EXPORT_CROP_MARK_CANVAS_MARGIN_MM,
  EXPORT_CROP_MARK_LENGTH_MM,
  EXPORT_CROP_MARK_OFFSET_MM,
  type ExportBleedOptions,
} from "@/lib/export-format-options"
import { mmToPt } from "@/lib/units"

export type ExportRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ExportLine = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type ExportBox = {
  trim: ExportRect
  bleed: ExportRect
  media: ExportRect
  origin: {
    x: number
    y: number
  }
  bleedPt: number
  markCanvasPt: number
  exportCanvasMarginPt: number
  cropMarkOffsetPt: number
  cropMarkLengthPt: number
  cropMarkLines: ExportLine[]
}

export function buildCropMarkLines({
  width,
  height,
  offset,
  length,
}: {
  width: number
  height: number
  offset: number
  length: number
}): ExportLine[] {
  if (!(length > 0)) return []
  return [
    { x1: -offset - length, y1: 0, x2: -offset, y2: 0 },
    { x1: 0, y1: -offset - length, x2: 0, y2: -offset },
    { x1: width + offset, y1: 0, x2: width + offset + length, y2: 0 },
    { x1: width, y1: -offset - length, x2: width, y2: -offset },
    { x1: -offset - length, y1: height, x2: -offset, y2: height },
    { x1: 0, y1: height + offset, x2: 0, y2: height + offset + length },
    { x1: width + offset, y1: height, x2: width + offset + length, y2: height },
    { x1: width, y1: height + offset, x2: width, y2: height + offset + length },
  ]
}

export function getExportGuideClipRect(exportBox: ExportBox, clipToPage: boolean): ExportRect | null {
  return clipToPage ? exportBox.bleed : null
}

export function clipExportLineToRect(
  line: ExportLine,
  rect: ExportRect,
  strokeWidth = 0,
): ExportLine | null {
  const left = rect.x
  const right = rect.x + rect.width
  const top = rect.y
  const bottom = rect.y + rect.height
  const strokeOverhang = Math.max(0, strokeWidth) / 2

  if (Math.abs(line.y1 - line.y2) <= 0.000001) {
    const y = line.y1
    if (y < top - strokeOverhang || y > bottom + strokeOverhang) return null
    const clippedLeft = Math.max(left, Math.min(line.x1, line.x2))
    const clippedRight = Math.min(right, Math.max(line.x1, line.x2))
    if (!(clippedRight > clippedLeft)) return null
    return { x1: clippedLeft, y1: y, x2: clippedRight, y2: y }
  }

  if (Math.abs(line.x1 - line.x2) <= 0.000001) {
    const x = line.x1
    if (x < left - strokeOverhang || x > right + strokeOverhang) return null
    const clippedTop = Math.max(top, Math.min(line.y1, line.y2))
    const clippedBottom = Math.min(bottom, Math.max(line.y1, line.y2))
    if (!(clippedBottom > clippedTop)) return null
    return { x1: x, y1: clippedTop, x2: x, y2: clippedBottom }
  }

  const dx = line.x2 - line.x1
  const dy = line.y2 - line.y1
  let start = 0
  let end = 1
  const clip = (edgeDelta: number, edgeDistance: number) => {
    if (Math.abs(edgeDelta) <= 0.000001) return edgeDistance >= 0
    const amount = edgeDistance / edgeDelta
    if (edgeDelta < 0) {
      if (amount > end) return false
      if (amount > start) start = amount
      return true
    }
    if (amount < start) return false
    if (amount < end) end = amount
    return true
  }

  if (
    !clip(-dx, line.x1 - left)
    || !clip(dx, right - line.x1)
    || !clip(-dy, line.y1 - top)
    || !clip(dy, bottom - line.y1)
  ) {
    return null
  }

  return {
    x1: line.x1 + start * dx,
    y1: line.y1 + start * dy,
    x2: line.x1 + end * dx,
    y2: line.y1 + end * dy,
  }
}

export function buildExportBox({
  width,
  height,
  bleed,
}: {
  width: number
  height: number
  bleed: ExportBleedOptions
}): ExportBox {
  const trimWidth = Math.max(0, width)
  const trimHeight = Math.max(0, height)
  const bleedPt = bleed.enabled ? mmToPt(Math.max(0, bleed.widthMm)) : 0
  const markCanvasPt = bleed.enabled ? mmToPt(EXPORT_CROP_MARK_CANVAS_MARGIN_MM) : 0
  const cropMarkOffsetPt = bleed.enabled ? mmToPt(EXPORT_CROP_MARK_OFFSET_MM) : 0
  const cropMarkLengthPt = bleed.enabled ? mmToPt(EXPORT_CROP_MARK_LENGTH_MM) : 0
  return buildExportBoxFromPoints({
    width: trimWidth,
    height: trimHeight,
    bleedPt,
    markCanvasPt,
    cropMarkOffsetPt,
    cropMarkLengthPt,
  })
}

function buildExportBoxFromPoints({
  width,
  height,
  bleedPt,
  markCanvasPt,
  cropMarkOffsetPt,
  cropMarkLengthPt,
}: {
  width: number
  height: number
  bleedPt: number
  markCanvasPt: number
  cropMarkOffsetPt: number
  cropMarkLengthPt: number
}): ExportBox {
  const trimWidth = Math.max(0, width)
  const trimHeight = Math.max(0, height)
  const resolvedBleedPt = Math.max(0, bleedPt)
  const resolvedMarkCanvasPt = Math.max(0, markCanvasPt)
  const resolvedCropMarkOffsetPt = Math.max(0, cropMarkOffsetPt)
  const resolvedCropMarkLengthPt = Math.max(0, cropMarkLengthPt)
  const exportCanvasMarginPt = resolvedBleedPt + resolvedMarkCanvasPt
  const cropMarkOffsetFromTrimPt = resolvedBleedPt + resolvedCropMarkOffsetPt

  return {
    trim: {
      x: 0,
      y: 0,
      width: trimWidth,
      height: trimHeight,
    },
    bleed: {
      x: -resolvedBleedPt,
      y: -resolvedBleedPt,
      width: trimWidth + resolvedBleedPt * 2,
      height: trimHeight + resolvedBleedPt * 2,
    },
    media: {
      x: -exportCanvasMarginPt,
      y: -exportCanvasMarginPt,
      width: trimWidth + exportCanvasMarginPt * 2,
      height: trimHeight + exportCanvasMarginPt * 2,
    },
    origin: {
      x: exportCanvasMarginPt,
      y: exportCanvasMarginPt,
    },
    bleedPt: resolvedBleedPt,
    markCanvasPt: resolvedMarkCanvasPt,
    exportCanvasMarginPt,
    cropMarkOffsetPt: resolvedCropMarkOffsetPt,
    cropMarkLengthPt: resolvedCropMarkLengthPt,
    cropMarkLines: buildCropMarkLines({
      width: trimWidth,
      height: trimHeight,
      offset: cropMarkOffsetFromTrimPt,
      length: resolvedCropMarkLengthPt,
    }),
  }
}
