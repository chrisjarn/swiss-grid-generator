import type jsPDF from "jspdf"
import type { GridResult } from "@/lib/grid-calculator"
import type { TextAlignMode } from "@/lib/types/layout-primitives"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import {
  DEFAULT_BASE_FONT,
  isPdfSerifStyleFont,
  type FontFamily,
} from "@/lib/config/fonts"
import { buildPageExportPlan, type PageExportGuideGroup, type PageExportPlan } from "@/lib/page-export-plan"
import { measureLayoutPerformanceAsync } from "@/lib/layout-performance"
import { resolvePdfFontFamily } from "@/lib/pdf-font-registry"
import {
  DEFAULT_TRACKING_SCALE,
  getTrackingLetterSpacing,
} from "@/lib/text-rendering"
import {
  isRenderableTextFragment,
  preloadTextPlanOutlineFonts,
  quadraticToCubic,
  resolveTextPlanVectorShapes,
  type OutlineTextShape,
} from "@/lib/vector-text-outline"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { getExportGuideClipRect, type ExportBox } from "@/lib/export-box"
import type { RgbColor } from "@/lib/export-colors"
import type { OpenTypePathCommand } from "@/lib/font-outline"
import type { DocumentVariableContext } from "@/lib/document-variable-text"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/lib/layout-engine-contract"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type BlockId = string
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>
type PdfMatrix = { toString: () => string }
type PdfMatrixConstructor = new (
  sx: number,
  shy: number,
  shx: number,
  sy: number,
  tx: number,
  ty: number,
) => PdfMatrix
type PdfGraphicsStateParameters = { opacity?: number; "stroke-opacity"?: number }
type PdfGraphicsState = PdfGraphicsStateParameters & {
  equals: (other: unknown) => boolean
}
type PdfGraphicsStateConstructor = new (parameters: PdfGraphicsStateParameters) => PdfGraphicsState
type PdfPathCommand = {
  op: "m" | "l" | "c" | "h"
  c: number[]
}
type PdfWithFormObjects = jsPDF & {
  advancedAPI?: (body?: (pdf: jsPDF) => void) => jsPDF
  beginFormObject?: (x: number, y: number, width: number, height: number, matrix: PdfMatrix) => jsPDF
  endFormObject?: (key: string) => jsPDF
  doFormObject?: (key: string, matrix: PdfMatrix) => jsPDF
  Matrix?: PdfMatrixConstructor
  GState?: PdfGraphicsStateConstructor
  addGState?: (key: string, gState: PdfGraphicsState) => jsPDF
  setGState?: (gState: string | PdfGraphicsState) => jsPDF
}
type ExportVectorPdfOptions = {
  pdf: jsPDF
  width: number
  height: number
  result: GridResult
  layout: PreviewLayoutState | null
  documentVariableContext?: DocumentVariableContext | null
  baseFont?: FontFamily
  originX?: number
  originY?: number
  imageColorScheme: ImageColorSchemeId
  canvasBackground?: string | null
  exportBox: ExportBox
  rotation: number
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  layoutEngine?: LayoutEngineContract
  exportPlan?: PageExportPlan
}

function formatCacheNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return String(Math.round(value * 1000) / 1000)
}

function appendHashByte(hash: number, byte: number): number {
  let next = hash ^ byte
  next = Math.imul(next, 16777619)
  return next >>> 0
}

function appendHashText(hash: number, value: string): number {
  let next = hash
  for (let index = 0; index < value.length; index += 1) {
    next = appendHashByte(next, value.charCodeAt(index))
  }
  return appendHashByte(next, 124)
}

function buildGuideFormObjectKey(
  guideGroup: PageExportGuideGroup,
  transformFingerprint: string,
): string {
  let hash = 2166136261
  hash = appendHashText(hash, guideGroup.id)
  hash = appendHashText(hash, transformFingerprint)
  hash = appendHashText(hash, `${guideGroup.strokeColor.r},${guideGroup.strokeColor.g},${guideGroup.strokeColor.b}`)
  hash = appendHashText(hash, formatCacheNumber(guideGroup.strokeWidth))
  hash = appendHashText(hash, guideGroup.clipToPage ? "clip" : "no-clip")
  hash = appendHashText(hash, guideGroup.dashPattern.map(formatCacheNumber).join(","))

  for (const rect of guideGroup.rects) {
    hash = appendHashText(hash, [
      formatCacheNumber(rect.x),
      formatCacheNumber(rect.y),
      formatCacheNumber(rect.width),
      formatCacheNumber(rect.height),
    ].join(","))
  }

  for (const line of guideGroup.lines) {
    hash = appendHashText(hash, [
      formatCacheNumber(line.x1),
      formatCacheNumber(line.y1),
      formatCacheNumber(line.x2),
      formatCacheNumber(line.y2),
    ].join(","))
  }

  return `swiss_guides_${guideGroup.id}_${hash.toString(36)}`
}

function getPdfFontFamily(fontFamily: FontFamily, fontWeight: number): string {
  const embedded = resolvePdfFontFamily(fontFamily, fontWeight)
  if (embedded) return embedded
  return isPdfSerifStyleFont(fontFamily) ? "times" : "helvetica"
}

function setDrawColor(pdf: jsPDF, color: RgbColor): void {
  pdf.setDrawColor(color.r, color.g, color.b)
}

function setTextColor(pdf: jsPDF, color: RgbColor): void {
  pdf.setTextColor(color.r, color.g, color.b)
}

function setFillColor(pdf: jsPDF, color: RgbColor): void {
  pdf.setFillColor(color.r, color.g, color.b)
}

async function renderSwissGridVectorPdfInternal({
  pdf,
  width,
  height,
  result,
  layout,
  documentVariableContext = null,
  baseFont = DEFAULT_BASE_FONT,
  originX = 0,
  originY = 0,
  imageColorScheme,
  canvasBackground = null,
  exportBox,
  rotation,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders,
  showTypography,
  layoutEngine = CURRENT_LAYOUT_ENGINE_CONTRACT,
  exportPlan: providedExportPlan,
}: ExportVectorPdfOptions): Promise<void> {
  const exportPlan = providedExportPlan ?? buildPageExportPlan({
    result,
    layout,
    documentVariableContext,
    baseFont,
    imageColorScheme,
    canvasBackground,
    rotation,
    showBaselines,
    showModules,
    showMargins,
    showImagePlaceholders,
    showTypography,
    layoutEngine,
  })
  const sourceWidth = exportPlan.pageWidth
  const sourceHeight = exportPlan.pageHeight
  const exportCanvasMarginPt = exportBox.exportCanvasMarginPt
  const sx = width / sourceWidth
  const sy = height / sourceHeight
  const scale = (sx + sy) / 2
  const pageWidth = width + originX * 2
  const pageHeight = height + originY * 2
  const cx = originX + width / 2
  const cy = originY + height / 2
  const theta = (rotation * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const guideTransformFingerprint = [
    formatCacheNumber(sourceWidth),
    formatCacheNumber(sourceHeight),
    formatCacheNumber(width),
    formatCacheNumber(height),
    formatCacheNumber(originX),
    formatCacheNumber(originY),
    formatCacheNumber(rotation),
  ].join(":")

  const transformPoint = (x: number, y: number) => {
    const scaledX = originX + x * sx
    const scaledY = originY + y * sy
    const dx = scaledX - cx
    const dy = scaledY - cy
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    }
  }

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    const a = transformPoint(x1, y1)
    const b = transformPoint(x2, y2)
    pdf.line(a.x, a.y, b.x, b.y)
  }

  const drawRectOutline = (x: number, y: number, w: number, h: number) => {
    drawLine(x, y, x + w, y)
    drawLine(x + w, y, x + w, y + h)
    drawLine(x + w, y + h, x, y + h)
    drawLine(x, y + h, x, y)
  }

  const drawGuideGroup = (key: string, draw: () => void) => {
    const formPdf = pdf as PdfWithFormObjects
    if (
      typeof formPdf.advancedAPI !== "function"
      || typeof formPdf.beginFormObject !== "function"
      || typeof formPdf.endFormObject !== "function"
      || typeof formPdf.doFormObject !== "function"
      || typeof formPdf.Matrix !== "function"
    ) {
      draw()
      return
    }

    const identityMatrix = new formPdf.Matrix(1, 0, 0, 1, 0, 0)
    formPdf.advancedAPI(() => {
      formPdf.beginFormObject(0, 0, pageWidth, pageHeight, identityMatrix)
      draw()
      formPdf.endFormObject(key)
      formPdf.doFormObject(key, identityMatrix)
    })
  }

  const drawFilledRect = (x: number, y: number, w: number, h: number) => {
    const topLeft = transformPoint(x, y)
    const topRight = transformPoint(x + w, y)
    const bottomRight = transformPoint(x + w, y + h)
    const bottomLeft = transformPoint(x, y + h)
    pdf.moveTo(topLeft.x, topLeft.y)
    pdf.lineTo(topRight.x, topRight.y)
    pdf.lineTo(bottomRight.x, bottomRight.y)
    pdf.lineTo(bottomLeft.x, bottomLeft.y)
    pdf.close()
    pdf.fill()
  }
  const registeredOpacityGStates = new Set<string>()
  const setPdfOpacity = (opacity: number) => {
    const normalizedOpacity = Math.max(0, Math.min(1, opacity))
    const opacityPdf = pdf as PdfWithFormObjects
    if (
      typeof opacityPdf.GState !== "function"
      || typeof opacityPdf.addGState !== "function"
      || typeof opacityPdf.setGState !== "function"
    ) {
      return
    }
    const key = `sgg_opacity_${Math.round(normalizedOpacity * 1000)}`
    if (!registeredOpacityGStates.has(key)) {
      const gState = new opacityPdf.GState({
        opacity: normalizedOpacity,
        "stroke-opacity": 1,
      })
      opacityPdf.addGState(key, gState)
      registeredOpacityGStates.add(key)
    }
    opacityPdf.setGState(key)
  }

  if (exportCanvasMarginPt > 0) {
    setFillColor(pdf, { r: 255, g: 255, b: 255 })
    pdf.rect(0, 0, pageWidth, pageHeight, "F")
  }

  if (exportPlan.backgroundColor) {
    const backgroundRect = exportBox.bleed
    setFillColor(pdf, exportPlan.backgroundColor)
    pdf.rect(
      originX + backgroundRect.x * scale,
      originY + backgroundRect.y * scale,
      backgroundRect.width * scale,
      backgroundRect.height * scale,
      "F",
    )
  }

  const rotatePointAround = (
    x: number,
    y: number,
    originX: number,
    originY: number,
    angleDeg: number,
  ) => {
    const radians = (angleDeg * Math.PI) / 180
    const cosAngle = Math.cos(radians)
    const sinAngle = Math.sin(radians)
    const dx = x - originX
    const dy = y - originY
    return {
      x: originX + dx * cosAngle - dy * sinAngle,
      y: originY + dx * sinAngle + dy * cosAngle,
    }
  }

  const drawText = (
    line: string,
    x: number,
    y: number,
    align: TextAlignMode,
    trackingScale = DEFAULT_TRACKING_SCALE,
    fontSize = 0,
    blockRotation = 0,
    rotationOrigin?: { x: number; y: number },
  ) => {
    let drawX = x
    let drawY = y
    if (rotationOrigin && Math.abs(blockRotation) > 0.0001) {
      const rotated = rotatePointAround(x, y, rotationOrigin.x, rotationOrigin.y, blockRotation)
      drawX = rotated.x
      drawY = rotated.y
    }
    const point = transformPoint(drawX, drawY)
    pdf.text(line, point.x, point.y, {
      align,
      charSpace: getTrackingLetterSpacing(fontSize * scale, trackingScale),
      angle: rotation + blockRotation,
      // Keep PDF text rotation semantics aligned with canvas:
      // positive angles rotate clockwise in preview.
      rotationDirection: 0,
    })
  }
  const transformOutlinePoint = (
    x: number,
    y: number,
    blockRotation = 0,
    rotationOrigin?: { x: number; y: number },
  ) => {
    const rotated = rotationOrigin && Math.abs(blockRotation) > 0.0001
      ? rotatePointAround(x, y, rotationOrigin.x, rotationOrigin.y, blockRotation)
      : { x, y }
    return transformPoint(rotated.x, rotated.y)
  }
  const buildPdfOutlinePath = (
    commands: readonly OpenTypePathCommand[],
    blockRotation = 0,
    rotationOrigin?: { x: number; y: number },
  ): PdfPathCommand[] => {
    const path: PdfPathCommand[] = []
    let previousPoint: { x: number; y: number } | undefined
    for (const command of commands) {
      switch (command.type) {
        case "M": {
          const point = transformOutlinePoint(command.x, command.y, blockRotation, rotationOrigin)
          path.push({ op: "m", c: [point.x, point.y] })
          previousPoint = { x: command.x, y: command.y }
          break
        }
        case "L": {
          const point = transformOutlinePoint(command.x, command.y, blockRotation, rotationOrigin)
          path.push({ op: "l", c: [point.x, point.y] })
          previousPoint = { x: command.x, y: command.y }
          break
        }
        case "C": {
          const control1 = transformOutlinePoint(command.x1, command.y1, blockRotation, rotationOrigin)
          const control2 = transformOutlinePoint(command.x2, command.y2, blockRotation, rotationOrigin)
          const point = transformOutlinePoint(command.x, command.y, blockRotation, rotationOrigin)
          path.push({ op: "c", c: [control1.x, control1.y, control2.x, control2.y, point.x, point.y] })
          previousPoint = { x: command.x, y: command.y }
          break
        }
        case "Q": {
          if (!previousPoint) break
          const cubic = quadraticToCubic(
            previousPoint,
            { x: command.x1, y: command.y1 },
            { x: command.x, y: command.y },
          )
          const control1 = transformOutlinePoint(cubic.control1.x, cubic.control1.y, blockRotation, rotationOrigin)
          const control2 = transformOutlinePoint(cubic.control2.x, cubic.control2.y, blockRotation, rotationOrigin)
          const point = transformOutlinePoint(command.x, command.y, blockRotation, rotationOrigin)
          path.push({ op: "c", c: [control1.x, control1.y, control2.x, control2.y, point.x, point.y] })
          previousPoint = { x: command.x, y: command.y }
          break
        }
        case "Z":
          path.push({ op: "h", c: [] })
          break
        default:
          break
      }
    }
    return path
  }
  const drawTextOutlineShape = (
    shape: OutlineTextShape,
    blockRotation = 0,
    rotationOrigin?: { x: number; y: number },
  ) => {
    const path = buildPdfOutlinePath(shape.commands, blockRotation, rotationOrigin)
    if (path.length === 0) return
    setFillColor(pdf, shape.color)
    pdf.path(path).fill()
  }
  const minHairlinePt = 0.25

  pdf.setLineCap("butt")
  pdf.setLineJoin("miter")
  pdf.setLineMiterLimit(10)
  if (exportPlan.pageOutline) {
    setDrawColor(pdf, exportPlan.pageOutline.strokeColor)
    pdf.setLineWidth(Math.max(exportPlan.pageOutline.strokeWidth * scale, minHairlinePt))
    drawRectOutline(0, 0, sourceWidth, sourceHeight)
  }

  if (exportBox.cropMarkLines.length > 0) {
    setDrawColor(pdf, { r: 20, g: 20, b: 20 })
    pdf.setLineWidth(Math.max(0.35 * scale, minHairlinePt))
    for (const line of exportBox.cropMarkLines) {
      drawLine(line.x1, line.y1, line.x2, line.y2)
    }
  }

  const drawImagePlan = (imagePlan: {
    x: number
    y: number
    width: number
    height: number
    fillColor: RgbColor
    opacity: number
    rotation: number
    rotationOriginX: number
    rotationOriginY: number
  }) => {
    pdf.saveGraphicsState()
    try {
      setFillColor(pdf, imagePlan.fillColor)
      setPdfOpacity(imagePlan.opacity)
      if (Math.abs(imagePlan.rotation) <= 0.0001) {
        drawFilledRect(imagePlan.x, imagePlan.y, imagePlan.width, imagePlan.height)
        return
      }
      const topLeft = rotatePointAround(
        imagePlan.x,
        imagePlan.y,
        imagePlan.rotationOriginX,
        imagePlan.rotationOriginY,
        imagePlan.rotation,
      )
      const topRight = rotatePointAround(
        imagePlan.x + imagePlan.width,
        imagePlan.y,
        imagePlan.rotationOriginX,
        imagePlan.rotationOriginY,
        imagePlan.rotation,
      )
      const bottomRight = rotatePointAround(
        imagePlan.x + imagePlan.width,
        imagePlan.y + imagePlan.height,
        imagePlan.rotationOriginX,
        imagePlan.rotationOriginY,
        imagePlan.rotation,
      )
      const bottomLeft = rotatePointAround(
        imagePlan.x,
        imagePlan.y + imagePlan.height,
        imagePlan.rotationOriginX,
        imagePlan.rotationOriginY,
        imagePlan.rotation,
      )
      const transformed = [topLeft, topRight, bottomRight, bottomLeft].map((point) => transformPoint(point.x, point.y))
      pdf.lines(
        [
          [transformed[1]!.x - transformed[0]!.x, transformed[1]!.y - transformed[0]!.y],
          [transformed[2]!.x - transformed[1]!.x, transformed[2]!.y - transformed[1]!.y],
          [transformed[3]!.x - transformed[2]!.x, transformed[3]!.y - transformed[2]!.y],
          [transformed[0]!.x - transformed[3]!.x, transformed[0]!.y - transformed[3]!.y],
        ],
        transformed[0]!.x,
        transformed[0]!.y,
        [1, 1],
        "F",
        true,
      )
    } finally {
      pdf.restoreGraphicsState()
    }
  }
  for (const guideGroup of exportPlan.guideGroups) {
    drawGuideGroup(buildGuideFormObjectKey(guideGroup, guideTransformFingerprint), () => {
      setDrawColor(pdf, guideGroup.strokeColor)
      pdf.setLineWidth(Math.max(guideGroup.strokeWidth * scale, minHairlinePt))
      pdf.setLineDashPattern(guideGroup.dashPattern.map((value) => value * scale), 0)
      const guideClipRect = getExportGuideClipRect(exportBox, guideGroup.clipToPage)
      if (guideClipRect) {
        pdf.saveGraphicsState()
        pdf.rect(
          originX + guideClipRect.x * scale,
          originY + guideClipRect.y * scale,
          guideClipRect.width * scale,
          guideClipRect.height * scale,
          null,
        )
        pdf.clip()
        pdf.discardPath()
      }
      for (const rect of guideGroup.rects) {
        drawRectOutline(rect.x, rect.y, rect.width, rect.height)
      }
      for (const line of guideGroup.lines) {
        drawLine(line.x1, line.y1, line.x2, line.y2)
      }
      if (guideClipRect) {
        pdf.restoreGraphicsState()
      }
      pdf.setLineDashPattern([], 0)
    })
  }

  const imagePlans = new Map(exportPlan.imagePlans.map((plan) => [plan.key, plan] as const))
  const textPlans = new Map(exportPlan.textPlans.map((plan) => [plan.key, plan] as const))
  const shouldRenderTypography = showTypography && textPlans.size > 0

  if (!shouldRenderTypography) {
    for (const key of exportPlan.orderedLayerKeys) {
      const imagePlan = imagePlans.get(key)
      if (imagePlan) drawImagePlan(imagePlan)
    }
    return
  }

  await preloadTextPlanOutlineFonts(exportPlan.textPlans)

  setDrawColor(pdf, { r: 31, g: 41, b: 55 })
  setTextColor(pdf, { r: 31, g: 41, b: 55 })
  setFillColor(pdf, { r: 31, g: 41, b: 55 })

  for (const key of exportPlan.orderedLayerKeys) {
    const imagePlan = imagePlans.get(key)
    if (imagePlan) {
      drawImagePlan(imagePlan)
      continue
    }
    const plan = textPlans.get(key)
    if (!plan) continue
    const rotationOrigin = { x: plan.rotationOriginX, y: plan.rotationOriginY }
    pdf.saveGraphicsState()
    try {
      setPdfOpacity(1)
      const { outlineShapes, fallbackTextShapes } = await resolveTextPlanVectorShapes(plan)
      for (const shape of outlineShapes) {
        drawTextOutlineShape(shape, plan.blockRotation, rotationOrigin)
      }

      for (const shape of fallbackTextShapes) {
        if (!isRenderableTextFragment(shape.text)) continue
        setTextColor(pdf, shape.color)
        pdf.setFont(
          getPdfFontFamily(shape.fontFamily, shape.fontWeight),
          shape.italic ? "italic" : "normal",
        )
        pdf.setFontSize(shape.fontSize * scale)
        drawText(
          shape.text,
          shape.x,
          shape.y,
          "left",
          shape.trackingScale,
          shape.fontSize,
          plan.blockRotation,
          rotationOrigin,
        )
      }
    } finally {
      pdf.restoreGraphicsState()
    }
  }
}

export async function renderSwissGridVectorPdf(options: ExportVectorPdfOptions): Promise<void> {
  return measureLayoutPerformanceAsync(
    "pdf.renderSwissGridVectorPdf",
    () => renderSwissGridVectorPdfInternal(options),
    {
      width: options.width,
      height: options.height,
      typography: options.showTypography,
      placeholders: options.showImagePlaceholders,
    },
  )
}
