import type { GridResult } from "@/core/layout/grid-calculator"
import {
  DEFAULT_BASE_FONT,
  type FontFamily,
} from "@/core/config/fonts"
import { translateMessage } from "@/core/i18n/messages"
import type { ImageColorSchemeId } from "@/core/config/color-schemes"
import { formatSvgColor } from "@/core/export/colors"
import { measureLayoutPerformanceAsync } from "@/core/layout/layout-performance"
import { buildPageExportPlan, type PageExportPlan } from "@/core/layout/page-export-plan"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/core/types/preview-layout"
import type { DocumentVariableContext } from "@/core/document/variable-text"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/core/layout/layout-engine-contract"
import {
  buildSvgPathDataFromCommands,
  preloadTextPlanOutlineFonts,
  resolveTextPlanVectorShapes,
  type VectorTextOutlineResolver,
} from "@/lib/vector-text-outline"
import { getExportGuideClipRect, type ExportBox } from "@/lib/export-box"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>

type ExportVectorSvgOptions = {
  width: number
  height: number
  result: GridResult
  layout: PreviewLayoutState | null
  documentVariableContext?: DocumentVariableContext | null
  baseFont?: FontFamily
  imageColorScheme: ImageColorSchemeId
  canvasBackground?: string | null
  rotation: number
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  layoutEngine?: LayoutEngineContract
  title?: string
  description?: string
  author?: string
  createdAt?: string
  creatorTool?: string
  exportBox: ExportBox
  exportPlan?: PageExportPlan
  outlineResolver?: VectorTextOutlineResolver
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value * 1000) / 1000
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "")
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
}

function quoteAttr(value: string): string {
  return escapeXml(value)
}

function buildSvgMetadataMarkup({
  title,
  description,
  author,
  createdAt,
  creatorTool,
}: {
  title: string
  description: string
  author: string
  createdAt: string
  creatorTool: string
}): string {
  return [
    `<metadata>`,
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
    `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">`,
    `<dc:format>image/svg+xml</dc:format>`,
    `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>`,
    description
      ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(description)}</rdf:li></rdf:Alt></dc:description>`
      : "",
    author
      ? `<dc:creator><rdf:Seq><rdf:li>${escapeXml(author)}</rdf:li></rdf:Seq></dc:creator>`
      : "",
    createdAt
      ? `<dc:date><rdf:Seq><rdf:li>${escapeXml(createdAt)}</rdf:li></rdf:Seq></dc:date>`
      : "",
    creatorTool ? `<xmp:CreatorTool>${escapeXml(creatorTool)}</xmp:CreatorTool>` : "",
    `</rdf:Description>`,
    `</rdf:RDF>`,
    `</metadata>`,
  ].join("")
}

function renderRotationTransform(rotation: number, originX: number, originY: number): string {
  if (Math.abs(rotation) <= 0.0001) return ""
  return ` transform="rotate(${formatNumber(rotation)} ${formatNumber(originX)} ${formatNumber(originY)})"`
}

async function renderSwissGridVectorSvgInternal({
  width,
  height,
  result,
  layout,
  documentVariableContext = null,
  baseFont = DEFAULT_BASE_FONT,
  imageColorScheme,
  canvasBackground = null,
  rotation,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders,
  showTypography,
  layoutEngine = CURRENT_LAYOUT_ENGINE_CONTRACT,
  title = translateMessage("ui.export.metadata.vectorTitle"),
  description = translateMessage("ui.export.metadata.svgDescription"),
  author = "",
  createdAt = "",
  creatorTool = translateMessage("ui.export.metadata.creatorTool"),
  exportBox,
  exportPlan: providedExportPlan,
  outlineResolver,
}: ExportVectorSvgOptions): Promise<string> {
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

  const imagePlans = new Map<string, PageExportPlan["imagePlans"][number]>()
  for (const plan of exportPlan.imagePlans) imagePlans.set(plan.key, plan)
  const textPlans = new Map<string, PageExportPlan["textPlans"][number]>()
  for (const plan of exportPlan.textPlans) textPlans.set(plan.key, plan)
  const documentWidth = exportBox.media.width
  const documentHeight = exportBox.media.height
  const viewBoxX = exportBox.media.x
  const viewBoxY = exportBox.media.y
  const pageClipId = "swiss-page-clip"
  const pageClipRect = getExportGuideClipRect(exportBox, true) ?? exportBox.trim
  const pageRotationTransform = renderRotationTransform(
    exportPlan.rotation,
    exportPlan.pageWidth / 2,
    exportPlan.pageHeight / 2,
  )

  await preloadTextPlanOutlineFonts(exportPlan.textPlans)

  let guideMarkup = ""
  for (const guideGroup of exportPlan.guideGroups) {
    const stroke = formatSvgColor(guideGroup.strokeColor)
    const dashAttr = guideGroup.dashPattern.length
      ? ` stroke-dasharray="${guideGroup.dashPattern.map(formatNumber).join(" ")}"`
      : ""
    let body = ""
    for (const rect of guideGroup.rects) {
      body += `<rect x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}" fill="none" />`
    }
    for (const line of guideGroup.lines) {
      body += `<line x1="${formatNumber(line.x1)}" y1="${formatNumber(line.y1)}" x2="${formatNumber(line.x2)}" y2="${formatNumber(line.y2)}" />`
    }
    const clipAttr = guideGroup.clipToPage ? ` clip-path="url(#${pageClipId})"` : ""
    guideMarkup += `<g id="guides-${guideGroup.id}"${clipAttr} fill="none" stroke="${stroke}" stroke-width="${formatNumber(guideGroup.strokeWidth)}"${dashAttr}>${body}</g>`
  }

  let layerMarkup = ""
  for (const key of exportPlan.orderedLayerKeys) {
    const imagePlan = imagePlans.get(key)
    if (imagePlan) {
      const opacityAttr = imagePlan.opacity < 0.999 ? ` fill-opacity="${formatNumber(imagePlan.opacity)}"` : ""
      const rotationTransform = renderRotationTransform(
        imagePlan.rotation,
        imagePlan.rotationOriginX,
        imagePlan.rotationOriginY,
      )
      layerMarkup += `<rect id="image-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" x="${formatNumber(imagePlan.x)}" y="${formatNumber(imagePlan.y)}" width="${formatNumber(imagePlan.width)}" height="${formatNumber(imagePlan.height)}" fill="${formatSvgColor(imagePlan.fillColor)}"${opacityAttr}${rotationTransform} />`
      continue
    }

    const textPlan = textPlans.get(key)
    if (!textPlan) continue

    const rotationTransform = renderRotationTransform(
      textPlan.blockRotation,
      textPlan.rotationOriginX,
      textPlan.rotationOriginY,
    )

    const { outlineShapes, fallbackTextShapes } = await (outlineResolver ?? resolveTextPlanVectorShapes)(textPlan)
    let outlinedMarkup = ""
    for (const shape of outlineShapes) {
      const pathData = buildSvgPathDataFromCommands(shape.commands).trim()
      if (pathData) {
        outlinedMarkup += `<path d="${quoteAttr(pathData)}" fill="${formatSvgColor(shape.color)}" />`
      }
    }
    if (outlinedMarkup) {
      layerMarkup += `<g id="text-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" data-style-key="${quoteAttr(textPlan.styleKey)}" data-text-rendering="glyph-outline"${rotationTransform}>${outlinedMarkup}</g>`
      continue
    }

    let fallbackLines = ""
    for (const shape of fallbackTextShapes) {
      fallbackLines += `<text x="${formatNumber(shape.x)}" y="${formatNumber(shape.y)}" fill="${formatSvgColor(shape.color)}" font-family="${quoteAttr(shape.fontFamily)}" font-size="${formatNumber(shape.fontSize)}" font-weight="${shape.fontWeight}" font-style="${shape.italic ? "italic" : "normal"}" xml:space="preserve">${escapeXml(shape.text)}</text>`
    }

    layerMarkup += `<g id="text-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" data-style-key="${quoteAttr(textPlan.styleKey)}" data-text-rendering="text-fallback"${rotationTransform}>${fallbackLines}</g>`
  }

  const exportCanvasMarkup = exportBox.exportCanvasMarginPt > 0
    ? `<rect x="${formatNumber(exportBox.media.x)}" y="${formatNumber(exportBox.media.y)}" width="${formatNumber(exportBox.media.width)}" height="${formatNumber(exportBox.media.height)}" fill="#ffffff" />`
    : ""
  const backgroundMarkup = exportPlan.backgroundColor
    ? `<rect x="${formatNumber(pageClipRect.x)}" y="${formatNumber(pageClipRect.y)}" width="${formatNumber(pageClipRect.width)}" height="${formatNumber(pageClipRect.height)}" fill="${formatSvgColor(exportPlan.backgroundColor)}" />`
    : ""

  const pageOutlineMarkup = exportPlan.pageOutline
    ? `<rect x="0" y="0" width="${formatNumber(exportPlan.pageWidth)}" height="${formatNumber(exportPlan.pageHeight)}" fill="none" stroke="${formatSvgColor(exportPlan.pageOutline.strokeColor)}" stroke-width="${formatNumber(exportPlan.pageOutline.strokeWidth)}" />`
    : ""
  const cropMarkMarkup = exportBox.cropMarkLines.length > 0
    ? (() => {
      const line = (x1: number, y1: number, x2: number, y2: number) => (
          `<line x1="${formatNumber(x1)}" y1="${formatNumber(y1)}" x2="${formatNumber(x2)}" y2="${formatNumber(y2)}" />`
        )
        let cropLines = ""
        for (const cropMarkLine of exportBox.cropMarkLines) {
          cropLines += line(cropMarkLine.x1, cropMarkLine.y1, cropMarkLine.x2, cropMarkLine.y2)
        }
        return `<g id="crop-marks" fill="none" stroke="#141414" stroke-width="0.35">` + cropLines + `</g>`
      })()
    : ""
  const metadataMarkup = buildSvgMetadataMarkup({
    title,
    description,
    author,
    createdAt,
    creatorTool,
  })

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width + exportBox.exportCanvasMarginPt * 2)}pt" height="${formatNumber(height + exportBox.exportCanvasMarginPt * 2)}pt" viewBox="${formatNumber(viewBoxX)} ${formatNumber(viewBoxY)} ${formatNumber(documentWidth)} ${formatNumber(documentHeight)}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="desc">${escapeXml(description)}</desc>`,
    metadataMarkup,
    exportCanvasMarkup,
    backgroundMarkup,
    `<defs><clipPath id="${pageClipId}"><rect x="${formatNumber(pageClipRect.x)}" y="${formatNumber(pageClipRect.y)}" width="${formatNumber(pageClipRect.width)}" height="${formatNumber(pageClipRect.height)}" /></clipPath></defs>`,
    `<g id="page"${pageRotationTransform} stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10">`,
    cropMarkMarkup,
    pageOutlineMarkup,
    guideMarkup,
    layerMarkup,
    `</g>`,
    `</svg>`,
  ].join("")
}

export async function renderSwissGridVectorSvg(options: ExportVectorSvgOptions): Promise<string> {
  return measureLayoutPerformanceAsync(
    "svg.renderSwissGridVectorSvg",
    () => renderSwissGridVectorSvgInternal(options),
    {
      width: options.width,
      height: options.height,
      typography: options.showTypography,
      placeholders: options.showImagePlaceholders,
    },
  )
}
