import { strToU8, zipSync } from "fflate"
import {
  buildExportBox,
  clipExportLineToRect,
  getExportGuideClipRect,
  type ExportLine,
} from "@/lib/export-box"
import { normalizeExportBleedOptions } from "@/lib/export-format-options"
import { parseHexColor, type RgbColor } from "@/core/export/colors"
import { translateMessage } from "@/core/i18n/messages"
import { resolveIdmlFontMetadata } from "@/lib/idml/font-metadata"
import type {
  IdmlFontMetadata,
  IdmlPageSetArtifacts,
  IdmlSpreadArtifact,
  IdmlStoryArtifact,
  SwissGridIdmlDocument,
} from "@/lib/idml/types"
import { escapeIdmlXml, formatIdmlNumber, renderIdmlElement } from "@/lib/idml/xml"
import {
  convertOpenTypeCommandsToGeometryPaths,
  preloadTextPlanOutlineFonts,
  type GeometryPath,
  resolveTextPlanVectorShapes,
  type VectorTextOutlineResolver,
} from "@/lib/vector-text-outline"

type Matrix = readonly [number, number, number, number, number, number]
type Point = { x: number; y: number }

type ColorSwatch = {
  id: string
  name: string
  color: RgbColor
}

type CharacterStyleRecord = {
  id: string
  name: string
  font: IdmlFontMetadata
  pointSize: number
  leading: number
  tracking: number
  fillColorId: string
}

type StoryExportRecord = {
  id: string
  filePath: string
  xml: string
}

type SpreadExportRecord = {
  filePath: string
  xml: string
  pageId: string
}

type IdmlPathPoint = {
  anchor: Point
  left: Point
  right: Point
}

const IDML_MIMETYPE = "application/vnd.adobe.indesign-idml-package"
const IDML_ZIP_COMPRESSION_LEVEL = 1
type IdmlZipCompressionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type IdmlZipEntry = {
  path: string
  bytes: Uint8Array
  level?: IdmlZipCompressionLevel
}

export type SwissGridIdmlPackageOptions = {
  compressionLevel?: number
  onDiagnostics?: (diagnostics: SwissGridIdmlPackageDiagnostics) => void
}

export type SwissGridIdmlPackageDiagnostics = {
  resourceXmlMs: number
  zipMs: number
  zipEngine: "fflate" | "node-zlib"
  components: Array<{
    path: string
    bytes: number
  }>
  pageSets: Array<NonNullable<IdmlPageSetArtifacts["diagnostics"]>>
}

const DOCUMENT_ID = "d"
const BACKING_STORY_ID = "sggBackingStory"
const MASTER_SPREAD_ID = "sggMaster"
const MASTER_PAGE_ID = "sggMasterPage"
const LAYER_PLACEHOLDERS_ID = "sggLayerPlaceholders"
const LAYER_TYPOGRAPHY_ID = "sggLayerTypography"
const LAYER_GUIDES_ID = "sggLayerGuides"
const SWATCH_NONE_ID = "Swatch/None"
const COLOR_BLACK_ID = "Color/Black"
const COLOR_PAPER_ID = "Color/Paper"

const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0]
const MAX_IDML_POLYGON_PATHS_PER_ITEM = 512

function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now()
}

function isIdentityMatrix(matrix: Matrix): boolean {
  return matrix.every((value, index) => Math.abs(value - IDENTITY_MATRIX[index]) <= 0.000001)
}

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  const [a1, b1, c1, d1, tx1, ty1] = left
  const [a2, b2, c2, d2, tx2, ty2] = right
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * tx2 + c1 * ty2 + tx1,
    b1 * tx2 + d1 * ty2 + ty1,
  ]
}

function buildRotationMatrix(angle: number, originX: number, originY: number): Matrix {
  if (Math.abs(angle) <= 0.000001) return IDENTITY_MATRIX
  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    cos,
    sin,
    -sin,
    cos,
    originX - originX * cos + originY * sin,
    originY - originX * sin - originY * cos,
  ]
}

function formatMatrix(matrix: Matrix): string {
  return matrix.map((value) => formatIdmlNumber(value)).join(" ")
}

function formatPoint(x: number, y: number): string {
  return `${formatIdmlNumber(x)} ${formatIdmlNumber(y)}`
}

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y }
}

function buildStraightPathPoint(point: Point): IdmlPathPoint {
  return {
    anchor: clonePoint(point),
    left: clonePoint(point),
    right: clonePoint(point),
  }
}

function buildPageCoordinateTransform(pageHeight: number): Matrix {
  return [1, 0, 0, 1, 0, -pageHeight / 2]
}

function buildPageItemTransform(pageWidth: number, pageHeight: number, pageRotation: number): Matrix {
  const pageCoordinateTransform = buildPageCoordinateTransform(pageHeight)
  if (Math.abs(pageRotation) <= 0.000001) return pageCoordinateTransform
  const pageRotationTransform = buildRotationMatrix(pageRotation, pageWidth / 2, pageHeight / 2)
  return multiplyMatrices(pageCoordinateTransform, pageRotationTransform)
}

function renderPathGeometry(paths: GeometryPath[]): string {
  let xml = "<Properties><PathGeometry>"
  for (const path of paths) {
    xml += `<GeometryPathType GeometryPathType="NormalPath" PathOpen="${path.open}"><PathPointArray>`
    for (const point of path.points) {
      const anchor = formatPoint(point.anchor.x, point.anchor.y)
      const left = formatPoint(point.left.x, point.left.y)
      const right = formatPoint(point.right.x, point.right.y)
      xml += `<PathPointType Anchor="${anchor}" LeftDirection="${left}" RightDirection="${right}" />`
    }
    xml += "</PathPointArray></GeometryPathType>"
  }
  return `${xml}</PathGeometry></Properties>`
}

function renderRectPathGeometry(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  return renderPathGeometry([{
    open: false,
    points: [
      buildStraightPathPoint({ x, y }),
      buildStraightPathPoint({ x: x + width, y }),
      buildStraightPathPoint({ x: x + width, y: y + height }),
      buildStraightPathPoint({ x, y: y + height }),
    ],
  }])
}

function renderLinePathGeometry(line: ExportLine): string {
  return renderPathGeometry([{
    open: true,
    points: [
      buildStraightPathPoint({ x: line.x1, y: line.y1 }),
      buildStraightPathPoint({ x: line.x2, y: line.y2 }),
    ],
  }])
}

function buildColorId(color: RgbColor): string {
  return `Color/sgg-r${String(color.r).padStart(3, "0")}g${String(color.g).padStart(3, "0")}b${String(color.b).padStart(3, "0")}`
}

function buildColorName(color: RgbColor): string {
  return `SGG RGB ${String(color.r).padStart(3, "0")} ${String(color.g).padStart(3, "0")} ${String(color.b).padStart(3, "0")}`
}

function getColorSignature(color: RgbColor): string {
  return `${color.r},${color.g},${color.b}`
}

function createDocumentUuid(prefix: "xmp.did" | "xmp.iid", seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) >>> 0
  }
  const hex = hash.toString(16).padStart(8, "0")
  return `${prefix}:${hex}-0000-4000-8000-${hex}${hex.slice(0, 4)}`
}

function buildColorSwatches(document: SwissGridIdmlDocument): ColorSwatch[] {
  const swatches = new Map<string, ColorSwatch>()
  const register = (color: RgbColor | null | undefined) => {
    if (!color) return
    const signature = `${color.r},${color.g},${color.b}`
    if (signature === "0,0,0") return
    if (signature === "255,255,255") return
    if (swatches.has(signature)) return
    swatches.set(signature, {
      id: buildColorId(color),
      name: buildColorName(color),
      color,
    })
  }

  for (const page of document.pages) {
    register(page.exportPlan.backgroundColor)
    for (const guideGroup of page.exportPlan.guideGroups) register(guideGroup.strokeColor)
    for (const imagePlan of page.exportPlan.imagePlans) register(imagePlan.fillColor)
    for (const textPlan of page.exportPlan.textPlans) register(textPlan.textColor)
    for (const textPlan of page.exportPlan.textPlans) {
      for (const segments of textPlan.segmentLines) {
        for (const segment of segments) {
          register(parseHexColor(segment.color))
        }
      }
    }
  }

  return [...swatches.values()]
}

async function buildFontCatalog(document: SwissGridIdmlDocument): Promise<Map<string, IdmlFontMetadata>> {
  const requested = new Map<string, Promise<IdmlFontMetadata>>()
  for (const page of document.pages) {
    for (const textPlan of page.exportPlan.textPlans) {
      const signature = `${textPlan.fontFamily}:${textPlan.fontWeight}:${textPlan.italic ? "italic" : "normal"}`
      if (requested.has(signature)) continue
      requested.set(
        signature,
        resolveIdmlFontMetadata(textPlan.fontFamily, textPlan.fontWeight, textPlan.italic),
      )
      for (const segments of textPlan.segmentLines) {
        for (const segment of segments) {
          const segmentSignature = `${segment.fontFamily}:${segment.fontWeight}:${segment.italic ? "italic" : "normal"}`
          if (requested.has(segmentSignature)) continue
          requested.set(
            segmentSignature,
            resolveIdmlFontMetadata(segment.fontFamily, segment.fontWeight, segment.italic),
          )
        }
      }
    }
  }

  const catalog = new Map<string, IdmlFontMetadata>()
  for (const [signature, task] of requested) {
    catalog.set(signature, await task)
  }
  return catalog
}

async function buildCharacterStyles(
  document: SwissGridIdmlDocument,
  colorIdBySignature: Map<string, string>,
  fontCatalog: Map<string, IdmlFontMetadata>,
): Promise<{
  styles: CharacterStyleRecord[]
  styleIdBySignature: Map<string, string>
}> {
  const styleIdBySignature = new Map<string, string>()
  const stylesBySignature = new Map<string, CharacterStyleRecord>()
  const styles: CharacterStyleRecord[] = []
  let sequence = 0

  for (const page of document.pages) {
    for (const textPlan of page.exportPlan.textPlans) {
      if (textPlan.commands.length === 0) continue
      const fontSignature = `${textPlan.fontFamily}:${textPlan.fontWeight}:${textPlan.italic ? "italic" : "normal"}`
      const font = fontCatalog.get(fontSignature)
      if (!font) continue
      const colorSignature = `${textPlan.textColor.r},${textPlan.textColor.g},${textPlan.textColor.b}`
      const fillColorId = colorIdBySignature.get(colorSignature) ?? COLOR_BLACK_ID
      const registerCharacterStyle = (
        segmentFont: IdmlFontMetadata,
        pointSize: number,
        trackingScale: number,
        segmentFillColorId: string,
      ) => {
        const styleSignature = [
          segmentFont.postScriptName,
          formatIdmlNumber(pointSize),
          formatIdmlNumber(textPlan.leading),
          formatIdmlNumber(trackingScale),
          segmentFillColorId,
        ].join("|")

        let style = stylesBySignature.get(styleSignature)
        if (!style) {
          sequence += 1
          style = {
            id: `CharacterStyle/sgg/char_${String(sequence).padStart(3, "0")}`,
            name: `SGG Character ${String(sequence).padStart(3, "0")}`,
            font: segmentFont,
            pointSize,
            leading: textPlan.leading,
            tracking: trackingScale,
            fillColorId: segmentFillColorId,
          }
          stylesBySignature.set(styleSignature, style)
          styles.push(style)
        }

        styleIdBySignature.set(styleSignature, style.id)
      }

      registerCharacterStyle(font, textPlan.fontSize, textPlan.trackingScale, fillColorId)
      for (const segments of textPlan.segmentLines) {
        for (const segment of segments) {
          const segmentFontSignature = `${segment.fontFamily}:${segment.fontWeight}:${segment.italic ? "italic" : "normal"}`
          const segmentFont = fontCatalog.get(segmentFontSignature)
          if (!segmentFont) continue
          const segmentColor = parseHexColor(segment.color) ?? textPlan.textColor
          const segmentColorSignature = `${segmentColor.r},${segmentColor.g},${segmentColor.b}`
          const segmentFillColorId = colorIdBySignature.get(segmentColorSignature) ?? COLOR_BLACK_ID
          registerCharacterStyle(segmentFont, segment.fontSize, segment.trackingScale, segmentFillColorId)
        }
      }
    }
  }

  return { styles, styleIdBySignature }
}

function buildParagraphStyleKeys(document: SwissGridIdmlDocument): string[] {
  const required = ["body", "headline", "display", "fx", "caption"]
  const used = new Set<string>(required)
  for (const page of document.pages) {
    for (const textPlan of page.exportPlan.textPlans) {
      used.add(String(textPlan.styleKey))
    }
  }
  const ordered = required.filter((key) => used.has(key))
  for (const key of [...used]) {
    if (!ordered.includes(key)) ordered.push(key)
  }
  return ordered
}

function buildParagraphStyleId(styleKey: string): string {
  return `ParagraphStyle/sgg/${styleKey.replace(/[^A-Za-z0-9_-]/g, "_")}`
}

function buildGuideRectanglesXml(
  pageTransformMatrix: Matrix,
  rects: Array<{
    key: string
    x: number
    y: number
    width: number
    height: number
    fillColorId?: string
    strokeColorId?: string
    strokeWeight?: number
    layerId: string
    name: string
  }>,
): string[] {
  const xml = new Array<string>(rects.length)
  const itemTransform = isIdentityMatrix(pageTransformMatrix) ? undefined : formatMatrix(pageTransformMatrix)
  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index]!
    xml[index] = renderIdmlElement(
      "Rectangle",
      {
        Self: `${rect.key}_${index + 1}`,
        Name: rect.name,
        ItemLayer: rect.layerId,
        ItemTransform: itemTransform,
        Visible: true,
        FillColor: rect.fillColorId ?? SWATCH_NONE_ID,
        StrokeColor: rect.strokeColorId ?? SWATCH_NONE_ID,
        StrokeWeight: rect.strokeWeight !== undefined ? formatIdmlNumber(rect.strokeWeight) : 0,
      },
      renderRectPathGeometry(rect.x, rect.y, rect.width, rect.height),
    )
  }
  return xml
}

function buildGuideLinesXml(
  pageTransformMatrix: Matrix,
  lines: Array<{
    key: string
    line: ExportLine
    strokeColorId: string
    strokeWeight: number
    layerId: string
    name: string
  }>,
): string[] {
  const xml = new Array<string>(lines.length)
  const itemTransform = isIdentityMatrix(pageTransformMatrix) ? undefined : formatMatrix(pageTransformMatrix)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!
    xml[index] = renderIdmlElement(
      "GraphicLine",
      {
        Self: `${line.key}_${index + 1}`,
        Name: line.name,
        ItemLayer: line.layerId,
        ItemTransform: itemTransform,
        Visible: true,
        FillColor: SWATCH_NONE_ID,
        StrokeColor: line.strokeColorId,
        StrokeWeight: formatIdmlNumber(line.strokeWeight),
      },
      renderLinePathGeometry(line.line),
    )
  }
  return xml
}

function renderCropMarkLines({
  cropMarkLines,
  pageTransformMatrix,
  pageIndex,
}: {
  cropMarkLines: readonly ExportLine[]
  pageTransformMatrix: Matrix
  pageIndex: number
}): string[] {
  const lines = new Array<{
    key: string
    line: ExportLine
    strokeColorId: string
    strokeWeight: number
    layerId: string
    name: string
  }>(cropMarkLines.length)
  for (let lineIndex = 0; lineIndex < cropMarkLines.length; lineIndex += 1) {
    const line = cropMarkLines[lineIndex]!
    lines[lineIndex] = {
      key: `sggCropMark_${pageIndex + 1}_${lineIndex + 1}`,
      line,
      strokeColorId: COLOR_BLACK_ID,
      strokeWeight: 0.35,
      layerId: LAYER_GUIDES_ID,
      name: `Crop mark ${lineIndex + 1}`,
    }
  }
  return buildGuideLinesXml(pageTransformMatrix, lines)
}

function renderPolygonItem({
  itemId,
  itemName,
  itemMatrix,
  fillColorId,
  geometryPaths,
}: {
  itemId: string
  itemName: string
  itemMatrix: Matrix
  fillColorId: string
  geometryPaths: GeometryPath[]
}): string {
  return renderIdmlElement(
    "Polygon",
    {
      Self: itemId,
      Name: itemName,
      ItemLayer: LAYER_TYPOGRAPHY_ID,
      ItemTransform: isIdentityMatrix(itemMatrix) ? undefined : formatMatrix(itemMatrix),
      Visible: true,
      FillColor: fillColorId,
      StrokeColor: SWATCH_NONE_ID,
      StrokeWeight: 0,
    },
    renderPathGeometry(geometryPaths),
  )
}

async function buildSpreadAndStories(
  document: SwissGridIdmlDocument,
  colorIdBySignature: Map<string, string>,
  startPageIndex = 0,
  outlineResolver?: VectorTextOutlineResolver,
): Promise<{
  spreads: SpreadExportRecord[]
  stories: StoryExportRecord[]
}> {
  const spreads: SpreadExportRecord[] = []
  const stories: StoryExportRecord[] = []
  const documentBleed = normalizeExportBleedOptions({
    enabled: (document.bleedMm ?? 0) > 0,
    widthMm: document.bleedMm ?? 0,
  })

  for (const [pageIndex, page] of document.pages.entries()) {
    const globalPageIndex = startPageIndex + pageIndex
    const spreadId = `sggSpread${String(globalPageIndex + 1).padStart(3, "0")}`
    const pageId = `sggPage${String(globalPageIndex + 1).padStart(3, "0")}`
    const pageWidth = page.exportPlan.pageWidth
    const pageHeight = page.exportPlan.pageHeight
    const exportBox = buildExportBox({
      width: pageWidth,
      height: pageHeight,
      bleed: documentBleed,
    })
    const marginPreference = page.result.grid.margins
    const contentWidth = Math.max(0, pageWidth - marginPreference.left - marginPreference.right)
    const pageCoordinateTransform = buildPageCoordinateTransform(pageHeight)
    const pageTransformMatrix = buildPageItemTransform(pageWidth, pageHeight, page.exportPlan.rotation)
    const guideItems: string[] = []
    const placeholderItems: string[] = []
    const textItems: string[] = []
    let localItemSequence = 0

    if (exportBox.exportCanvasMarginPt > 0) {
      placeholderItems.push(
        renderIdmlElement(
          "Rectangle",
          {
            Self: `sggExportCanvas${String(globalPageIndex + 1).padStart(3, "0")}`,
            Name: "Export Canvas",
            ItemLayer: LAYER_PLACEHOLDERS_ID,
            ItemTransform: isIdentityMatrix(pageCoordinateTransform) ? undefined : formatMatrix(pageCoordinateTransform),
            Visible: true,
            FillColor: COLOR_PAPER_ID,
            StrokeColor: SWATCH_NONE_ID,
            StrokeWeight: 0,
          },
          renderRectPathGeometry(
            exportBox.media.x,
            exportBox.media.y,
            exportBox.media.width,
            exportBox.media.height,
          ),
        ),
      )
    }

    guideItems.push(...renderCropMarkLines({ cropMarkLines: exportBox.cropMarkLines, pageTransformMatrix, pageIndex: globalPageIndex }))

    if (page.exportPlan.backgroundColor) {
      const signature = `${page.exportPlan.backgroundColor.r},${page.exportPlan.backgroundColor.g},${page.exportPlan.backgroundColor.b}`
      placeholderItems.push(
        renderIdmlElement(
          "Rectangle",
          {
            Self: `sggBackground${String(globalPageIndex + 1).padStart(3, "0")}`,
            Name: "Canvas Background",
            ItemLayer: LAYER_PLACEHOLDERS_ID,
            ItemTransform: isIdentityMatrix(pageCoordinateTransform) ? undefined : formatMatrix(pageCoordinateTransform),
            Visible: true,
            FillColor: colorIdBySignature.get(signature) ?? COLOR_PAPER_ID,
            StrokeColor: SWATCH_NONE_ID,
            StrokeWeight: 0,
          },
          renderRectPathGeometry(exportBox.bleed.x, exportBox.bleed.y, exportBox.bleed.width, exportBox.bleed.height),
        ),
      )
    }

    for (const imagePlan of page.exportPlan.imagePlans) {
      localItemSequence += 1
      const signature = `${imagePlan.fillColor.r},${imagePlan.fillColor.g},${imagePlan.fillColor.b}`
      const fillTint = Math.max(0, Math.min(100, Math.round(imagePlan.opacity * 100)))
      const imageTransform = multiplyMatrices(
        pageTransformMatrix,
        buildRotationMatrix(imagePlan.rotation, imagePlan.rotationOriginX, imagePlan.rotationOriginY),
      )
      placeholderItems.push(
        renderIdmlElement(
          "Rectangle",
          {
            Self: `sggPlaceholder_${globalPageIndex + 1}_${localItemSequence}`,
            Name: `Placeholder ${imagePlan.key}`,
            ItemLayer: LAYER_PLACEHOLDERS_ID,
            ItemTransform: isIdentityMatrix(imageTransform) ? undefined : formatMatrix(imageTransform),
            Visible: true,
            FillColor: colorIdBySignature.get(signature) ?? COLOR_BLACK_ID,
            FillTint: fillTint,
            StrokeColor: SWATCH_NONE_ID,
            StrokeWeight: 0,
          },
          renderRectPathGeometry(imagePlan.x, imagePlan.y, imagePlan.width, imagePlan.height),
        ),
      )
    }

    for (const guideGroup of page.exportPlan.guideGroups) {
      const guideColorSignature = `${guideGroup.strokeColor.r},${guideGroup.strokeColor.g},${guideGroup.strokeColor.b}`
      const guideColorId = colorIdBySignature.get(guideColorSignature) ?? COLOR_BLACK_ID
      const guideRects = guideGroup.rects.map((rect, rectIndex) => ({
        key: `sggGuideRect_${globalPageIndex + 1}_${guideGroup.id}_${rectIndex + 1}`,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        strokeColorId: guideColorId,
        strokeWeight: guideGroup.strokeWidth,
        layerId: LAYER_GUIDES_ID,
        name: `${guideGroup.id} ${rectIndex + 1}`,
      }))
      guideItems.push(...buildGuideRectanglesXml(pageTransformMatrix, guideRects))

      if (guideGroup.lines.length > 0) {
        const guideClipRect = getExportGuideClipRect(exportBox, guideGroup.clipToPage)
        const guideLines = guideGroup.lines
          .map((line, lineIndex) => {
            const clippedLine = guideClipRect
              ? clipExportLineToRect(line, guideClipRect, guideGroup.strokeWidth)
              : line
            if (!clippedLine) return null
            return {
              key: `sggGuideLine_${globalPageIndex + 1}_${guideGroup.id}_${lineIndex + 1}`,
              line: clippedLine,
              strokeColorId: guideColorId,
              strokeWeight: guideGroup.strokeWidth,
              layerId: LAYER_GUIDES_ID,
              name: `${guideGroup.id} line ${lineIndex + 1}`,
            }
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        guideItems.push(...buildGuideLinesXml(pageTransformMatrix, guideLines))
      }
    }

    await preloadTextPlanOutlineFonts(page.exportPlan.textPlans)

    for (const textPlan of page.exportPlan.textPlans) {
      const blockRotationMatrix = buildRotationMatrix(
        textPlan.blockRotation,
        textPlan.rotationOriginX,
        textPlan.rotationOriginY,
      )
      const itemMatrix = multiplyMatrices(pageTransformMatrix, blockRotationMatrix)
      const { outlineShapes, fallbackTextShapes } = await (outlineResolver ?? resolveTextPlanVectorShapes)(textPlan)
      if (fallbackTextShapes.length > 0) {
        throw new Error(`Unable to resolve outline font for IDML export: ${textPlan.key}`)
      }
      let groupedPaths: GeometryPath[] = []
      let groupedColorSignature = ""
      let groupedStartIndex = 0
      let groupedLastIndex = 0
      const flushGroupedTextPaths = () => {
        if (groupedPaths.length === 0) return
        localItemSequence += 1
        const itemId = `sggGlyph_${String(globalPageIndex + 1).padStart(3, "0")}_${String(localItemSequence).padStart(4, "0")}`
        const rangeLabel = groupedStartIndex === groupedLastIndex
          ? `glyph ${groupedStartIndex + 1}`
          : `glyphs ${groupedStartIndex + 1}-${groupedLastIndex + 1}`
        textItems.push(renderPolygonItem({
          itemId,
          itemName: `${page.name} / ${textPlan.key} / ${rangeLabel}`,
          itemMatrix,
          fillColorId: colorIdBySignature.get(groupedColorSignature) ?? COLOR_BLACK_ID,
          geometryPaths: groupedPaths,
        }))
        groupedPaths = []
      }

      for (const [shapeIndex, shape] of outlineShapes.entries()) {
        const geometryPaths = convertOpenTypeCommandsToGeometryPaths(shape.commands)
        if (geometryPaths.length === 0) continue
        const colorSignature = getColorSignature(shape.color)
        if (
          groupedPaths.length > 0
          && (colorSignature !== groupedColorSignature
            || groupedPaths.length + geometryPaths.length > MAX_IDML_POLYGON_PATHS_PER_ITEM)
        ) {
          flushGroupedTextPaths()
        }
        if (groupedPaths.length === 0) {
          groupedColorSignature = colorSignature
          groupedStartIndex = shapeIndex
        }
        groupedPaths.push(...geometryPaths)
        groupedLastIndex = shapeIndex
      }
      flushGroupedTextPaths()
    }

    spreads.push({
      filePath: `Spreads/Spread_${String(globalPageIndex + 1).padStart(3, "0")}.xml`,
      pageId,
      xml: [
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
        `<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
        renderIdmlElement(
          "Spread",
          {
            Self: spreadId,
            Hidden: false,
            ItemTransform: formatMatrix(IDENTITY_MATRIX),
          },
          [
            renderIdmlElement("FlattenerPreference", {
              LineArtAndTextResolution: 300,
              GradientAndMeshResolution: 150,
              ClipComplexRegions: false,
              ConvertAllStrokesToOutlines: false,
              ConvertAllTextToOutlines: false,
            }, renderIdmlElement("Properties", {}, renderIdmlElement("RasterVectorBalance", { type: "double" }, "50"))),
            renderIdmlElement(
              "Page",
              {
                Self: pageId,
                TabOrder: "",
                AppliedMaster: "n",
                OverrideList: "",
                MasterPageTransform: formatMatrix(IDENTITY_MATRIX),
                Name: String(globalPageIndex + 1),
                AppliedTrapPreset: "TrapPreset/$ID/kDefaultTrapStyleName",
                GeometricBounds: `0 0 ${formatIdmlNumber(pageHeight)} ${formatIdmlNumber(pageWidth)}`,
                ItemTransform: formatMatrix(buildPageCoordinateTransform(pageHeight)),
                AppliedAlternateLayout: "n",
                LayoutRule: "Off",
                SnapshotBlendingMode: "IgnoreLayoutSnapshots",
                OptionalPage: false,
                GridStartingPoint: "TopOutside",
                UseMasterGrid: true,
              },
              [
                renderIdmlElement(
                  "Properties",
                  {},
                  renderIdmlElement("PageColor", { type: "enumeration" }, "UseMasterColor"),
                ),
                renderIdmlElement("MarginPreference", {
                  ColumnCount: 1,
                  ColumnGutter: formatIdmlNumber(page.result.grid.gridMarginHorizontal),
                  Top: formatIdmlNumber(marginPreference.top),
                  Bottom: formatIdmlNumber(marginPreference.bottom),
                  Left: formatIdmlNumber(marginPreference.left),
                  Right: formatIdmlNumber(marginPreference.right),
                  ColumnDirection: "Horizontal",
                  ColumnsPositions: `0 ${formatIdmlNumber(contentWidth)}`,
                }),
                renderIdmlElement(
                  "GridDataInformation",
                  {
                    FontStyle: "Regular",
                    PointSize: formatIdmlNumber(page.result.grid.gridUnit),
                    CharacterAki: 0,
                    LineAki: formatIdmlNumber(Math.max(0, page.result.grid.gridUnit * 0.75)),
                    HorizontalScale: 100,
                    VerticalScale: 100,
                    LineAlignment: "LeftOrTopLineJustify",
                    GridAlignment: "AlignEmCenter",
                    CharacterAlignment: "AlignEmCenter",
                  },
                  renderIdmlElement(
                    "Properties",
                    {},
                    renderIdmlElement("AppliedFont", { type: "string" }, page.baseFont),
                  ),
                ),
              ],
            ),
            ...placeholderItems,
            ...textItems,
            ...guideItems,
          ],
        ),
        `</idPkg:Spread>`,
      ].join(""),
    })
  }

  return { spreads, stories }
}

function buildGraphicXml(customSwatches: ColorSwatch[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement("Color", {
      Self: COLOR_BLACK_ID,
      Model: "Process",
      Space: "RGB",
      ColorValue: "0 0 0",
      ColorOverride: "Specialblack",
      ConvertToHsb: false,
      AlternateSpace: "NoAlternateColor",
      AlternateColorValue: "",
      Name: "Black",
      ColorEditable: false,
      ColorRemovable: false,
      Visible: true,
      SwatchCreatorID: 7937,
    }),
    renderIdmlElement("Color", {
      Self: COLOR_PAPER_ID,
      Model: "Process",
      Space: "CMYK",
      ColorValue: "0 0 0 0",
      ColorOverride: "Specialpaper",
      ConvertToHsb: false,
      AlternateSpace: "NoAlternateColor",
      AlternateColorValue: "",
      Name: "Paper",
      ColorEditable: true,
      ColorRemovable: false,
      Visible: true,
      SwatchCreatorID: 7937,
    }),
    renderIdmlElement("Swatch", {
      Self: SWATCH_NONE_ID,
      Name: "None",
      ColorEditable: false,
      ColorRemovable: false,
      Visible: true,
      SwatchCreatorID: 7937,
    }),
    ...customSwatches.map((swatch) => renderIdmlElement("Color", {
      Self: swatch.id,
      Model: "Process",
      Space: "RGB",
      ColorValue: `${swatch.color.r} ${swatch.color.g} ${swatch.color.b}`,
      ColorOverride: "Normal",
      ConvertToHsb: false,
      AlternateSpace: "NoAlternateColor",
      AlternateColorValue: "",
      Name: swatch.name,
      ColorEditable: true,
      ColorRemovable: true,
      Visible: true,
      SwatchCreatorID: 7937,
    })),
    renderIdmlElement("StrokeStyle", {
      Self: "StrokeStyle/$ID/Solid",
      Name: "$ID/Solid",
    }),
    `</idPkg:Graphic>`,
  ].join("")
}

function buildFontsXml(fonts: IdmlFontMetadata[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    ...fonts.map((font, index) => (
      renderIdmlElement(
        "FontFamily",
        {
          Self: `sggFontFamily${String(index + 1).padStart(3, "0")}`,
          Name: font.family,
        },
        renderIdmlElement("Font", {
          Self: `sggFont${String(index + 1).padStart(3, "0")}`,
          FontFamily: font.family,
          Name: `${font.family} ${font.styleName}`.trim(),
          PostScriptName: font.postScriptName,
          Status: "Installed",
          FontStyleName: font.styleName,
          FontType: font.fontType,
          WritingScript: 0,
          FullName: font.fullName,
          FullNameNative: font.fullName,
          FontStyleNameNative: font.styleName,
          PlatformName: "$ID/",
          Version: "",
          TypekitID: "$ID/",
        }),
      )
    )),
    `</idPkg:Fonts>`,
  ].join("")
}

function buildStylesXml(
  paragraphStyleKeys: string[],
  characterStyles: CharacterStyleRecord[],
  baseFontFamily: string,
): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement(
      "RootCharacterStyleGroup",
      { Self: "sggCharacterRoot" },
      [
        renderIdmlElement("CharacterStyle", {
          Self: "CharacterStyle/$ID/[No character style]",
          Imported: false,
          SplitDocument: false,
          EmitCss: true,
          IncludeClass: true,
          ExtendedKeyboardShortcut: "0 0 0",
          Name: "$ID/[No character style]",
        }),
        ...characterStyles.map((style) => renderIdmlElement(
          "CharacterStyle",
          {
            Self: style.id,
            Name: style.name,
            Imported: false,
            SplitDocument: false,
            EmitCss: true,
            IncludeClass: true,
            FontStyle: style.font.styleName,
            PointSize: formatIdmlNumber(style.pointSize),
            Tracking: formatIdmlNumber(style.tracking),
            FillColor: style.fillColorId,
            StrokeColor: SWATCH_NONE_ID,
          },
          renderIdmlElement("Properties", {}, [
            renderIdmlElement("BasedOn", { type: "string" }, "$ID/[No character style]"),
            renderIdmlElement("AppliedFont", { type: "string" }, style.font.family),
            renderIdmlElement("Leading", { type: "unit" }, formatIdmlNumber(style.leading)),
            renderIdmlElement("PreviewColor", { type: "enumeration" }, "Nothing"),
          ]),
        )),
      ],
    ),
    renderIdmlElement(
      "RootParagraphStyleGroup",
      { Self: "sggParagraphRoot" },
      [
        renderIdmlElement(
          "ParagraphStyle",
          {
            Self: "ParagraphStyle/$ID/[No paragraph style]",
            Name: "$ID/[No paragraph style]",
            Imported: false,
            SplitDocument: false,
            EmitCss: true,
            IncludeClass: true,
            FillColor: COLOR_BLACK_ID,
            FontStyle: "Regular",
            PointSize: 12,
            Tracking: 0,
            Justification: "LeftAlign",
            StrokeColor: SWATCH_NONE_ID,
          },
          renderIdmlElement("Properties", {}, [
            renderIdmlElement("AppliedFont", { type: "string" }, baseFontFamily),
            renderIdmlElement("Leading", { type: "enumeration" }, "Auto"),
          ]),
        ),
        renderIdmlElement(
          "ParagraphStyle",
          {
            Self: "ParagraphStyle/$ID/NormalParagraphStyle",
            Name: "$ID/NormalParagraphStyle",
            Imported: false,
            NextStyle: "ParagraphStyle/$ID/NormalParagraphStyle",
            SplitDocument: false,
            EmitCss: true,
            IncludeClass: true,
          },
          renderIdmlElement("Properties", {}, [
            renderIdmlElement("BasedOn", { type: "string" }, "$ID/[No paragraph style]"),
            renderIdmlElement("PreviewColor", { type: "enumeration" }, "Nothing"),
          ]),
        ),
        ...paragraphStyleKeys.map((styleKey) => renderIdmlElement(
          "ParagraphStyle",
          {
            Self: buildParagraphStyleId(styleKey),
            Name: `SGG ${styleKey.replace(/(^|[_-])(\w)/g, (_, prefix, char) => `${prefix}${String(char).toUpperCase()}`)}`,
            Imported: false,
            SplitDocument: false,
            EmitCss: true,
            IncludeClass: true,
            Justification: "LeftAlign",
            SpaceBefore: 0,
            SpaceAfter: 0,
            LeftIndent: 0,
            RightIndent: 0,
            FirstLineIndent: 0,
          },
          renderIdmlElement("Properties", {}, [
            renderIdmlElement("BasedOn", { type: "string" }, "$ID/NormalParagraphStyle"),
            renderIdmlElement("PreviewColor", { type: "enumeration" }, "Nothing"),
          ]),
        )),
      ],
    ),
    renderIdmlElement(
      "RootObjectStyleGroup",
      { Self: "sggObjectRoot" },
      renderIdmlElement("ObjectStyle", {
        Self: "ObjectStyle/$ID/[None]",
        Name: "$ID/[None]",
        AppliedParagraphStyle: "ParagraphStyle/$ID/[No paragraph style]",
        FillColor: SWATCH_NONE_ID,
        FillTint: -1,
        StrokeWeight: 0,
        StrokeColor: SWATCH_NONE_ID,
        Nonprinting: false,
      }),
    ),
    `</idPkg:Styles>`,
  ].join("")
}

function buildPreferencesXml(document: SwissGridIdmlDocument): string {
  const firstPage = document.pages[0]
  const documentBleed = normalizeExportBleedOptions({
    enabled: (document.bleedMm ?? 0) > 0,
    widthMm: document.bleedMm ?? 0,
  })
  const baselineStart = firstPage ? firstPage.result.grid.margins.top : 36
  const baselineDivision = firstPage ? firstPage.result.grid.gridUnit : 12
  const firstWidth = firstPage ? firstPage.exportPlan.pageWidth : 595.276
  const firstHeight = firstPage ? firstPage.exportPlan.pageHeight : 841.89
  const exportBox = buildExportBox({
    width: firstWidth,
    height: firstHeight,
    bleed: documentBleed,
  })

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement("PageItemDefault", {
      AppliedGraphicObjectStyle: "ObjectStyle/$ID/[None]",
      AppliedTextObjectStyle: "ObjectStyle/$ID/[None]",
      AppliedGridObjectStyle: "ObjectStyle/$ID/[None]",
      FillColor: SWATCH_NONE_ID,
      StrokeWeight: 0,
      StrokeColor: SWATCH_NONE_ID,
      Nonprinting: false,
    }),
    renderIdmlElement("TextFramePreference", {
      TextColumnCount: 1,
      TextColumnGutter: 12,
      TextColumnFixedWidth: formatIdmlNumber(firstWidth),
      UseFixedColumnWidth: false,
      FirstBaselineOffset: "LeadingOffset",
      MinimumFirstBaselineOffset: 0,
      VerticalJustification: "TopAlign",
    }, renderIdmlElement(
      "Properties",
      {},
      renderIdmlElement(
        "InsetSpacing",
        { type: "list" },
        [
          renderIdmlElement("ListItem", { type: "unit" }, "0"),
          renderIdmlElement("ListItem", { type: "unit" }, "0"),
          renderIdmlElement("ListItem", { type: "unit" }, "0"),
          renderIdmlElement("ListItem", { type: "unit" }, "0"),
        ],
      ),
    )),
    renderIdmlElement("DocumentPreference", {
      PageHeight: formatIdmlNumber(firstHeight),
      PageWidth: formatIdmlNumber(firstWidth),
      FacingPages: false,
      DocumentBleedTopOffset: formatIdmlNumber(exportBox.bleedPt),
      DocumentBleedBottomOffset: formatIdmlNumber(exportBox.bleedPt),
      DocumentBleedInsideOrLeftOffset: formatIdmlNumber(exportBox.bleedPt),
      DocumentBleedOutsideOrRightOffset: formatIdmlNumber(exportBox.bleedPt),
      DocumentBleedUniformSize: true,
      DocumentSlugTopOffset: formatIdmlNumber(exportBox.exportCanvasMarginPt),
      DocumentSlugBottomOffset: formatIdmlNumber(exportBox.exportCanvasMarginPt),
      DocumentSlugInsideOrLeftOffset: formatIdmlNumber(exportBox.exportCanvasMarginPt),
      DocumentSlugOutsideOrRightOffset: formatIdmlNumber(exportBox.exportCanvasMarginPt),
      DocumentSlugUniformSize: true,
      PreserveLayoutWhenShuffling: true,
      AllowPageShuffle: true,
      OverprintBlack: true,
      PageBinding: "LeftToRight",
      ColumnDirection: "Horizontal",
      Intent: "PrintIntent",
      CreatePrimaryTextFrame: false,
      ColumnGuideLocked: true,
      MasterTextFrame: false,
      SnippetImportUsesOriginalLocation: false,
    }),
    renderIdmlElement(
      "GridPreference",
      {
        DocumentGridShown: false,
        DocumentGridSnapto: false,
        HorizontalGridlineDivision: 72,
        VerticalGridlineDivision: 72,
        HorizontalGridSubdivision: 8,
        VerticalGridSubdivision: 8,
        GridsInBack: true,
        BaselineGridShown: false,
        BaselineStart: formatIdmlNumber(baselineStart),
        BaselineDivision: formatIdmlNumber(baselineDivision),
        BaselineViewThreshold: 75,
        BaselineGridRelativeOption: "TopOfPageOfBaselineGridRelativeOption",
      },
      renderIdmlElement("Properties", {}, [
        renderIdmlElement("GridColor", { type: "enumeration" }, "LightGray"),
        renderIdmlElement("BaselineColor", { type: "enumeration" }, "LightBlue"),
      ]),
    ),
    renderIdmlElement(
      "GuidePreference",
      {
        GuidesInBack: false,
        GuidesShown: true,
        GuidesLocked: false,
        GuidesSnapto: true,
        RulerGuidesViewThreshold: 5,
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("RulerGuidesColor", { type: "enumeration" }, "Cyan")),
    ),
    `</idPkg:Preferences>`,
  ].join("")
}

function buildMasterSpreadXml(document: SwissGridIdmlDocument): string {
  const firstPage = document.pages[0]
  const pageWidth = firstPage ? firstPage.exportPlan.pageWidth : 595.276
  const pageHeight = firstPage ? firstPage.exportPlan.pageHeight : 841.89
  const margins = firstPage ? firstPage.result.grid.margins : { top: 36, bottom: 36, left: 36, right: 36 }
  const contentWidth = Math.max(0, pageWidth - margins.left - margins.right)
  const baseFont = firstPage?.baseFont ?? "Inter"
  const unit = firstPage?.result.grid.gridUnit ?? 12

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement(
      "MasterSpread",
      {
        Self: MASTER_SPREAD_ID,
        Name: "A-Parent",
        NamePrefix: "A",
        BaseName: "Parent",
        ShowMasterItems: true,
        PageCount: 1,
        OverriddenPageItemProps: "",
        PrimaryTextFrame: "n",
        ItemTransform: formatMatrix(IDENTITY_MATRIX),
      },
      [
        renderIdmlElement(
          "Properties",
          {},
          renderIdmlElement("PageColor", { type: "enumeration" }, "UseMasterColor"),
        ),
        renderIdmlElement(
          "Page",
          {
            Self: MASTER_PAGE_ID,
            TabOrder: "",
            AppliedMaster: "n",
            OverrideList: "",
            MasterPageTransform: formatMatrix(IDENTITY_MATRIX),
            Name: "A",
            AppliedTrapPreset: "TrapPreset/$ID/kDefaultTrapStyleName",
            GeometricBounds: `0 0 ${formatIdmlNumber(pageHeight)} ${formatIdmlNumber(pageWidth)}`,
            ItemTransform: formatMatrix(buildPageCoordinateTransform(pageHeight)),
            AppliedAlternateLayout: "n",
            LayoutRule: "Off",
            SnapshotBlendingMode: "IgnoreLayoutSnapshots",
            OptionalPage: false,
            GridStartingPoint: "TopOutside",
            UseMasterGrid: true,
          },
          [
            renderIdmlElement(
              "Properties",
              {},
              renderIdmlElement("PageColor", { type: "enumeration" }, "UseMasterColor"),
            ),
            renderIdmlElement("MarginPreference", {
              ColumnCount: 1,
              ColumnGutter: formatIdmlNumber(firstPage?.result.grid.gridMarginHorizontal ?? 12),
              Top: formatIdmlNumber(margins.top),
              Bottom: formatIdmlNumber(margins.bottom),
              Left: formatIdmlNumber(margins.left),
              Right: formatIdmlNumber(margins.right),
              ColumnDirection: "Horizontal",
              ColumnsPositions: `0 ${formatIdmlNumber(contentWidth)}`,
            }),
            renderIdmlElement(
              "GridDataInformation",
              {
                FontStyle: "Regular",
                PointSize: formatIdmlNumber(unit),
                CharacterAki: 0,
                LineAki: formatIdmlNumber(Math.max(0, unit * 0.75)),
                HorizontalScale: 100,
                VerticalScale: 100,
                LineAlignment: "LeftOrTopLineJustify",
                GridAlignment: "AlignEmCenter",
                CharacterAlignment: "AlignEmCenter",
              },
              renderIdmlElement(
                "Properties",
                {},
                renderIdmlElement("AppliedFont", { type: "string" }, baseFont),
              ),
            ),
          ],
        ),
      ],
    ),
    `</idPkg:MasterSpread>`,
  ].join("")
}

function buildBackingStoryXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:BackingStory xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement(
      "XmlStory",
      {
        Self: BACKING_STORY_ID,
        UserText: true,
        IsEndnoteStory: false,
        AppliedTOCStyle: "n",
        TrackChanges: false,
        StoryTitle: "$ID/",
        AppliedNamedGrid: "n",
      },
      renderIdmlElement(
        "ParagraphStyleRange",
        { AppliedParagraphStyle: "ParagraphStyle/$ID/NormalParagraphStyle" },
        renderIdmlElement(
          "CharacterStyleRange",
          { AppliedCharacterStyle: "CharacterStyle/$ID/[No character style]" },
          [
            renderIdmlElement("Content", {}, "\uFEFF"),
            renderIdmlElement("XMLElement", {
              Self: "sggXmlRoot",
              MarkupTag: "XMLTag/Root",
            }),
            renderIdmlElement("Content", {}, "\uFEFF"),
          ],
        ),
      ),
    ),
    `</idPkg:BackingStory>`,
  ].join("")
}

function buildTagsXml(): string {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Tags xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0">`,
    renderIdmlElement(
      "XMLTag",
      {
        Self: "XMLTag/Root",
        Name: "Root",
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("TagColor", { type: "enumeration" }, "LightBlue")),
    ),
    `</idPkg:Tags>`,
  ].join("")
}

function buildMetadataXml(document: SwissGridIdmlDocument): string {
  const createdAt = document.metadata.createdAt ?? new Date().toISOString()
  const modifiedAt = new Date().toISOString()
  const title = document.metadata.title.trim() || translateMessage("ui.export.metadata.documentTitle")
  const author = document.metadata.author.trim()
  const description = document.metadata.description.trim()
  const seed = `${title}:${author}:${createdAt}:${document.pages.length}`

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
    `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="${escapeIdmlXml(translateMessage("ui.export.metadata.creatorTool"))}">`,
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
    `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">`,
    `<dc:format>application/x-indesign</dc:format>`,
    `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeIdmlXml(title)}</rdf:li></rdf:Alt></dc:title>`,
    author
      ? `<dc:creator><rdf:Seq><rdf:li>${escapeIdmlXml(author)}</rdf:li></rdf:Seq></dc:creator>`
      : "",
    description
      ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeIdmlXml(description)}</rdf:li></rdf:Alt></dc:description>`
      : "",
    `<xmp:CreateDate>${escapeIdmlXml(createdAt)}</xmp:CreateDate>`,
    `<xmp:ModifyDate>${escapeIdmlXml(modifiedAt)}</xmp:ModifyDate>`,
    `<xmp:MetadataDate>${escapeIdmlXml(modifiedAt)}</xmp:MetadataDate>`,
    `<xmp:CreatorTool>${escapeIdmlXml(translateMessage("ui.export.metadata.creatorTool"))}</xmp:CreatorTool>`,
    `<xmpMM:DocumentID>${escapeIdmlXml(createDocumentUuid("xmp.did", seed))}</xmpMM:DocumentID>`,
    `<xmpMM:InstanceID>${escapeIdmlXml(createDocumentUuid("xmp.iid", `${seed}:instance`))}</xmpMM:InstanceID>`,
    `</rdf:Description>`,
    `</rdf:RDF>`,
    `</x:xmpmeta>`,
    `<?xpacket end="w"?>`,
  ].join("")
}

function buildDesignMapXml(
  document: SwissGridIdmlDocument,
  customSwatches: ColorSwatch[],
  spreads: Array<Pick<SpreadExportRecord, "filePath" | "pageId">>,
  stories: Array<Pick<StoryExportRecord, "id" | "filePath">>,
): string {
  const firstPage = document.pages[0]
  const docName = document.metadata.title.trim() || translateMessage("ui.export.metadata.documentTitle")
  const baseFont = firstPage?.baseFont ?? "Inter"
  const unit = firstPage?.result.grid.gridUnit ?? 12
  const storyList = [...stories.map((story) => story.id), BACKING_STORY_ID].join(" ")
  const sectionPageStart = spreads[0]?.pageId ?? MASTER_PAGE_ID

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="20.0(95)" ?>`,
    `<Document xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="20.0" Self="${DOCUMENT_ID}" StoryList="${escapeIdmlXml(storyList)}" Name="${escapeIdmlXml(docName)}" ZeroPoint="0 0" ActiveLayer="${LAYER_TYPOGRAPHY_ID}" CMYKProfile="U.S. Web Coated (SWOP) v2" RGBProfile="sRGB IEC61966-2.1" SolidColorIntent="UseColorSettings" AfterBlendingIntent="UseColorSettings" DefaultImageIntent="UseColorSettings" RGBPolicy="PreserveEmbeddedProfiles" CMYKPolicy="CombinationOfPreserveAndSafeCmyk" AccurateLABSpots="false" AppliedMathMLFontSize="10" AppliedMathMLRgbColor="0 0 0" TintValue="100">`,
    renderIdmlElement(
      "Properties",
      {},
      renderIdmlElement("AppliedMathMLSwatch", { type: "enumeration" }, "Nothing"),
    ),
    renderIdmlElement("Language", {
      Self: "Language/$ID/English%3a USA",
      Name: "$ID/English: USA",
      SingleQuotes: "‘’",
      DoubleQuotes: "“”",
      PrimaryLanguageName: "$ID/English",
      SublanguageName: "$ID/USA",
      Id: 269,
      HyphenationVendor: "Hunspell",
      SpellingVendor: "Hunspell",
    }),
    renderIdmlElement("idPkg:Graphic", { src: "Resources/Graphic.xml" }),
    renderIdmlElement("idPkg:Fonts", { src: "Resources/Fonts.xml" }),
    renderIdmlElement("idPkg:Styles", { src: "Resources/Styles.xml" }),
    renderIdmlElement("NumberingList", {
      Self: "NumberingList/$ID/[Default]",
      Name: "$ID/[Default]",
      ContinueNumbersAcrossStories: false,
      ContinueNumbersAcrossDocuments: false,
    }),
    renderIdmlElement(
      "NamedGrid",
      {
        Self: "NamedGrid/$ID/[Page Grid]",
        Name: "$ID/[Page Grid]",
      },
      renderIdmlElement(
        "GridDataInformation",
        {
          FontStyle: "Regular",
          PointSize: formatIdmlNumber(unit),
          CharacterAki: 0,
          LineAki: formatIdmlNumber(Math.max(0, unit * 0.75)),
          HorizontalScale: 100,
          VerticalScale: 100,
          LineAlignment: "LeftOrTopLineJustify",
          GridAlignment: "AlignEmCenter",
          CharacterAlignment: "AlignEmCenter",
        },
        renderIdmlElement(
          "Properties",
          {},
          renderIdmlElement("AppliedFont", { type: "string" }, baseFont),
        ),
      ),
    ),
    renderIdmlElement("idPkg:Preferences", { src: "Resources/Preferences.xml" }),
    renderIdmlElement("idPkg:Tags", { src: "XML/Tags.xml" }),
    renderIdmlElement(
      "Layer",
      {
        Self: LAYER_PLACEHOLDERS_ID,
        Name: "Placeholders",
        Visible: true,
        Locked: false,
        IgnoreWrap: false,
        ShowGuides: false,
        LockGuides: false,
        UI: true,
        Expendable: true,
        Printable: true,
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("LayerColor", { type: "enumeration" }, "GrassGreen")),
    ),
    renderIdmlElement(
      "Layer",
      {
        Self: LAYER_TYPOGRAPHY_ID,
        Name: "Typography",
        Visible: true,
        Locked: false,
        IgnoreWrap: false,
        ShowGuides: false,
        LockGuides: false,
        UI: true,
        Expendable: true,
        Printable: true,
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("LayerColor", { type: "enumeration" }, "Magenta")),
    ),
    renderIdmlElement(
      "Layer",
      {
        Self: LAYER_GUIDES_ID,
        Name: "Guides",
        Visible: true,
        Locked: false,
        IgnoreWrap: false,
        ShowGuides: true,
        LockGuides: false,
        UI: true,
        Expendable: true,
        Printable: false,
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("LayerColor", { type: "enumeration" }, "LightBlue")),
    ),
    renderIdmlElement("idPkg:MasterSpread", { src: "MasterSpreads/MasterSpread_sggMaster.xml" }),
    renderIdmlElement(
      "ColorGroup",
      {
        Self: "ColorGroup/[Root Color Group]",
        Name: "[Root Color Group]",
        IsRootColorGroup: true,
      },
      [
        renderIdmlElement("ColorGroupSwatch", {
          Self: "sggColorGroupSwatch000",
          SwatchItemRef: SWATCH_NONE_ID,
        }),
        renderIdmlElement("ColorGroupSwatch", {
          Self: "sggColorGroupSwatch001",
          SwatchItemRef: COLOR_BLACK_ID,
        }),
        renderIdmlElement("ColorGroupSwatch", {
          Self: "sggColorGroupSwatch002",
          SwatchItemRef: COLOR_PAPER_ID,
        }),
        ...customSwatches.map((swatch, index) => renderIdmlElement("ColorGroupSwatch", {
          Self: `sggColorGroupSwatch${String(index + 3).padStart(3, "0")}`,
          SwatchItemRef: swatch.id,
        })),
      ],
    ),
    ...spreads.map((spread) => renderIdmlElement("idPkg:Spread", { src: spread.filePath })),
    renderIdmlElement(
      "Section",
      {
        Self: "sggSection",
        Length: document.pages.length,
        Name: "",
        ContinueNumbering: false,
        IncludeSectionPrefix: false,
        PageNumberStart: 1,
        Marker: "",
        PageStart: sectionPageStart,
        SectionPrefix: "",
      },
      renderIdmlElement("Properties", {}, renderIdmlElement("PageNumberStyle", { type: "enumeration" }, "Arabic")),
    ),
    renderIdmlElement("idPkg:BackingStory", { src: "XML/BackingStory.xml" }),
    ...stories.map((story) => renderIdmlElement("idPkg:Story", { src: story.filePath })),
    `</Document>`,
  ].join("")
}

function normalizeIdmlZipCompressionLevel(level: number | undefined): IdmlZipCompressionLevel {
  if (level === undefined) return IDML_ZIP_COMPRESSION_LEVEL
  if (!Number.isFinite(level)) return IDML_ZIP_COMPRESSION_LEVEL
  return Math.max(0, Math.min(9, Math.round(level))) as IdmlZipCompressionLevel
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < table.length; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ (bytes[index] ?? 0)) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function getDosDateTime(date = new Date()): { date: number; time: number } {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()))
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  }
}

function isNodeRuntime(): boolean {
  return typeof (globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node === "string"
}

async function tryZipIdmlEntriesWithNodeZlib(
  zipEntries: readonly IdmlZipEntry[],
  compressionLevel: IdmlZipCompressionLevel,
): Promise<{ bytes: Uint8Array; engine: "node-zlib" } | null> {
  if (!isNodeRuntime()) return null

  const loadNodeZlib = new Function("return import('node:zlib')") as () => Promise<{
    deflateRawSync: (bytes: Uint8Array, options: { level: number }) => Uint8Array
  }>
  const { deflateRawSync } = await loadNodeZlib()
  const chunks: Uint8Array[] = []
  const centralDirectory: Uint8Array[] = []
  const { date, time } = getDosDateTime()
  let offset = 0

  for (const entry of zipEntries) {
    const entryLevel = entry.level ?? compressionLevel
    const compressionMethod = entryLevel === 0 ? 0 : 8
    const pathBytes = strToU8(entry.path)
    const compressedBytes = compressionMethod === 0
      ? entry.bytes
      : deflateRawSync(entry.bytes, { level: entryLevel })
    const crc = computeCrc32(entry.bytes)
    const localHeader = new Uint8Array(30 + pathBytes.length)
    const local = new DataView(localHeader.buffer)
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, pathBytes.length === entry.path.length ? 0 : 0x0800, true)
    local.setUint16(8, compressionMethod, true)
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, compressedBytes.byteLength, true)
    local.setUint32(22, entry.bytes.byteLength, true)
    local.setUint16(26, pathBytes.length, true)
    localHeader.set(pathBytes, 30)
    chunks.push(localHeader, compressedBytes)

    const centralHeader = new Uint8Array(46 + pathBytes.length)
    const central = new DataView(centralHeader.buffer)
    central.setUint32(0, 0x02014b50, true)
    central.setUint16(4, 20, true)
    central.setUint16(6, 20, true)
    central.setUint16(8, pathBytes.length === entry.path.length ? 0 : 0x0800, true)
    central.setUint16(10, compressionMethod, true)
    central.setUint16(12, time, true)
    central.setUint16(14, date, true)
    central.setUint32(16, crc, true)
    central.setUint32(20, compressedBytes.byteLength, true)
    central.setUint32(24, entry.bytes.byteLength, true)
    central.setUint16(28, pathBytes.length, true)
    central.setUint32(42, offset, true)
    centralHeader.set(pathBytes, 46)
    centralDirectory.push(centralHeader)
    offset += localHeader.byteLength + compressedBytes.byteLength
  }

  const centralDirectorySize = centralDirectory.reduce((total, chunk) => total + chunk.byteLength, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, zipEntries.length, true)
  endView.setUint16(10, zipEntries.length, true)
  endView.setUint32(12, centralDirectorySize, true)
  endView.setUint32(16, offset, true)
  const totalSize = offset + centralDirectorySize + end.byteLength

  if (typeof Buffer !== "undefined") {
    const buffers = new Array<Buffer>(chunks.length + centralDirectory.length + 1)
    let bufferIndex = 0
    for (const chunk of chunks) {
      buffers[bufferIndex] = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
      bufferIndex += 1
    }
    for (const chunk of centralDirectory) {
      buffers[bufferIndex] = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
      bufferIndex += 1
    }
    buffers[bufferIndex] = Buffer.from(end.buffer, end.byteOffset, end.byteLength)
    return {
      bytes: Buffer.concat(buffers, totalSize),
      engine: "node-zlib",
    }
  }

  const output = new Uint8Array(totalSize)
  let writeOffset = 0
  for (const chunk of chunks) {
    output.set(chunk, writeOffset)
    writeOffset += chunk.byteLength
  }
  for (const chunk of centralDirectory) {
    output.set(chunk, writeOffset)
    writeOffset += chunk.byteLength
  }
  output.set(end, writeOffset)
  return { bytes: output, engine: "node-zlib" }
}

export async function buildSwissGridIdmlPackage(
  document: SwissGridIdmlDocument,
  options: SwissGridIdmlPackageOptions = {},
): Promise<Uint8Array> {
  if (!document.pages.length) {
    throw new Error("Cannot export IDML without project pages.")
  }

  const pageSet = await buildSwissGridIdmlPageSetArtifacts(document)
  return buildSwissGridIdmlPackageFromPageSets(document, [pageSet], options)
}

export async function buildSwissGridIdmlPageSetArtifacts(
  document: SwissGridIdmlDocument,
  options: { startPageIndex?: number; outlineResolver?: VectorTextOutlineResolver } = {},
): Promise<IdmlPageSetArtifacts> {
  if (!document.pages.length) {
    return {
      startPageIndex: options.startPageIndex ?? 0,
      pageCount: 0,
      spreads: [],
      stories: [],
    }
  }

  const customSwatches = buildColorSwatches(document)
  const colorIdBySignature = new Map<string, string>([
    ["0,0,0", COLOR_BLACK_ID],
    ["255,255,255", COLOR_PAPER_ID],
  ])
  for (const swatch of customSwatches) {
    colorIdBySignature.set(`${swatch.color.r},${swatch.color.g},${swatch.color.b}`, swatch.id)
  }
  const xmlStartedAt = nowMs()
  const { spreads, stories } = await buildSpreadAndStories(
    document,
    colorIdBySignature,
    options.startPageIndex ?? 0,
    options.outlineResolver,
  )
  const xmlGenerationMs = nowMs() - xmlStartedAt
  const encodeStartedAt = nowMs()
  const artifacts: IdmlPageSetArtifacts = {
    startPageIndex: options.startPageIndex ?? 0,
    pageCount: document.pages.length,
    spreads: spreads.map((spread): IdmlSpreadArtifact => ({
      filePath: spread.filePath,
      pageId: spread.pageId,
      bytes: strToU8(spread.xml),
    })),
    stories: stories.map((story): IdmlStoryArtifact => ({
      id: story.id,
      filePath: story.filePath,
      bytes: strToU8(story.xml),
    })),
  }
  const encodeMs = nowMs() - encodeStartedAt
  artifacts.diagnostics = {
    xmlGenerationMs,
    encodeMs,
    spreadBytes: artifacts.spreads.reduce((total, spread) => total + spread.bytes.byteLength, 0),
    storyBytes: artifacts.stories.reduce((total, story) => total + story.bytes.byteLength, 0),
    spreadCount: artifacts.spreads.length,
    storyCount: artifacts.stories.length,
  }
  return artifacts
}

export async function buildSwissGridIdmlPackageFromPageSets(
  document: SwissGridIdmlDocument,
  pageSets: readonly IdmlPageSetArtifacts[],
  options: SwissGridIdmlPackageOptions = {},
): Promise<Uint8Array> {
  if (!document.pages.length) {
    throw new Error("Cannot export IDML without project pages.")
  }

  const resourceStartedAt = nowMs()
  const customSwatches = buildColorSwatches(document)
  const fontCatalog = await buildFontCatalog(document)
  const fontBySignature = new Map<string, IdmlFontMetadata>()
  for (const font of fontCatalog.values()) {
    fontBySignature.set(`${font.family}|${font.styleName}`, font)
  }
  const fonts = Array.from(fontBySignature.values())
  const colorIdBySignature = new Map<string, string>([
    ["0,0,0", COLOR_BLACK_ID],
    ["255,255,255", COLOR_PAPER_ID],
  ])
  for (const swatch of customSwatches) {
    colorIdBySignature.set(`${swatch.color.r},${swatch.color.g},${swatch.color.b}`, swatch.id)
  }
  const { styles: characterStyles } = await buildCharacterStyles(
    document,
    colorIdBySignature,
    fontCatalog,
  )
  const paragraphStyleKeys = buildParagraphStyleKeys(document)
  const orderedPageSets = [...pageSets].sort((left, right) => left.startPageIndex - right.startPageIndex)
  const spreads = orderedPageSets.flatMap((set) => set.spreads)
  const stories = orderedPageSets.flatMap((set) => set.stories)
  const designMapXml = buildDesignMapXml(document, customSwatches, spreads, stories)
  const resources: Array<{ path: string; bytes: Uint8Array }> = [
    {
      path: "META-INF/container.xml",
      bytes: strToU8([
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
        `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">`,
        `<rootfiles>`,
        `<rootfile full-path="designmap.xml" media-type="text/xml"></rootfile>`,
        `</rootfiles>`,
        `</container>`,
      ].join("")),
    },
    { path: "META-INF/metadata.xml", bytes: strToU8(buildMetadataXml(document)) },
    { path: "Resources/Graphic.xml", bytes: strToU8(buildGraphicXml(customSwatches)) },
    { path: "Resources/Fonts.xml", bytes: strToU8(buildFontsXml(fonts)) },
    {
      path: "Resources/Styles.xml",
      bytes: strToU8(buildStylesXml(
        paragraphStyleKeys,
        characterStyles,
        fonts[0]?.family ?? document.pages[0]?.baseFont ?? "Inter",
      )),
    },
    { path: "Resources/Preferences.xml", bytes: strToU8(buildPreferencesXml(document)) },
    { path: "MasterSpreads/MasterSpread_sggMaster.xml", bytes: strToU8(buildMasterSpreadXml(document)) },
    { path: "XML/BackingStory.xml", bytes: strToU8(buildBackingStoryXml()) },
    { path: "XML/Tags.xml", bytes: strToU8(buildTagsXml()) },
    { path: "designmap.xml", bytes: strToU8(designMapXml) },
  ]
  const resourceXmlMs = nowMs() - resourceStartedAt
  const zipEntries: IdmlZipEntry[] = [
    { path: "mimetype", bytes: strToU8(IDML_MIMETYPE), level: 0 },
  ]
  const components = [
    { path: "mimetype", bytes: IDML_MIMETYPE.length },
    ...resources.map((resource) => ({ path: resource.path, bytes: resource.bytes.byteLength })),
    ...spreads.map((spread) => ({ path: spread.filePath, bytes: spread.bytes.byteLength })),
    ...stories.map((story) => ({ path: story.filePath, bytes: story.bytes.byteLength })),
  ]
  for (const resource of resources) zipEntries.push({ path: resource.path, bytes: resource.bytes })
  for (const spread of spreads) zipEntries.push({ path: spread.filePath, bytes: spread.bytes })
  for (const story of stories) zipEntries.push({ path: story.filePath, bytes: story.bytes })

  const compressionLevel = normalizeIdmlZipCompressionLevel(options.compressionLevel)
  const zipStartedAt = nowMs()
  const nativeZip = await tryZipIdmlEntriesWithNodeZlib(zipEntries, compressionLevel)
  const fflateEntries: Record<string, Uint8Array | [Uint8Array, { level: IdmlZipCompressionLevel }]> = {}
  if (!nativeZip) {
    for (const entry of zipEntries) {
      fflateEntries[entry.path] = entry.level === undefined ? entry.bytes : [entry.bytes, { level: entry.level }]
    }
  }
  const zipResult = nativeZip ?? {
    bytes: zipSync(
      fflateEntries,
      { level: compressionLevel },
    ),
    engine: "fflate" as const,
  }
  const bytes = zipResult.bytes
  options.onDiagnostics?.({
    resourceXmlMs,
    zipMs: nowMs() - zipStartedAt,
    zipEngine: zipResult.engine,
    components,
    pageSets: orderedPageSets.flatMap((set) => set.diagnostics ? [set.diagnostics] : []),
  })
  return bytes
}
