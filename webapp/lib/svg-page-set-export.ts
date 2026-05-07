import { buildExportBox } from "@/lib/export-box"
import {
  DEFAULT_EXPORT_BLEED_OPTIONS,
  type ExportBleedOptions,
} from "@/lib/export-format-options"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/lib/layout-engine-contract"
import type { PlannedProjectPageExportSource } from "@/lib/planned-page-export-source"
import { renderSwissGridVectorSvg } from "@/lib/svg-vector-export"
import type { VectorTextOutlineResolver } from "@/lib/vector-text-outline"

export type SvgPageSetMetadata = {
  title: string
  description: string
  author: string
  createdAt: string
}

export type SvgExportFile = {
  filename: string
  text: string
}

export type SvgPageSetRenderOptions = {
  pages: readonly PlannedProjectPageExportSource[]
  metadata: SvgPageSetMetadata
  baseName: string
  startPageNumber?: number
  pageNumbers?: readonly number[]
  bleed?: ExportBleedOptions
  layoutEngine?: LayoutEngineContract
  outlineResolver?: VectorTextOutlineResolver
}

function normalizeFilenameSegment(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return "page"
  return trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "page"
}

export async function renderSvgPageSetFiles({
  pages,
  metadata,
  baseName,
  startPageNumber = 1,
  pageNumbers,
  bleed = DEFAULT_EXPORT_BLEED_OPTIONS,
  layoutEngine = CURRENT_LAYOUT_ENGINE_CONTRACT,
  outlineResolver,
}: SvgPageSetRenderOptions): Promise<SvgExportFile[]> {
  const files: SvgExportFile[] = []
  for (const [index, page] of pages.entries()) {
    const pageNumber = pageNumbers?.[index] ?? startPageNumber + index
    const pageSlug = normalizeFilenameSegment(page.name || `page-${pageNumber}`)
    const exportBox = buildExportBox({
      width: page.result.pageSizePt.width,
      height: page.result.pageSizePt.height,
      bleed,
    })
    const svg = await renderSwissGridVectorSvg({
      width: page.result.pageSizePt.width,
      height: page.result.pageSizePt.height,
      result: page.result,
      layout: page.previewLayout,
      documentVariableContext: page.documentVariableContext,
      baseFont: page.baseFont,
      imageColorScheme: page.imageColorScheme,
      canvasBackground: page.resolvedCanvasBackground,
      rotation: page.uiSettings.rotation,
      showBaselines: page.uiSettings.showBaselines,
      showModules: page.uiSettings.showModules,
      showMargins: page.uiSettings.showMargins,
      showImagePlaceholders: page.uiSettings.showImagePlaceholders,
      showTypography: page.uiSettings.showTypography,
      layoutEngine,
      title: metadata.title.trim()
        ? `${metadata.title.trim()} - Page ${pageNumber}`
        : `${baseName} - Page ${pageNumber}`,
      description: metadata.description.trim() || `Swiss Grid Vector Export - Page ${pageNumber}`,
      author: metadata.author.trim(),
      createdAt: metadata.createdAt,
      creatorTool: "Swiss Grid Generator",
      exportPlan: page.exportPlan,
      exportBox,
      outlineResolver,
    })
    files.push({
      filename: `${baseName}_page_${String(pageNumber).padStart(3, "0")}_${pageSlug}.svg`,
      text: svg,
    })
  }
  return files
}
