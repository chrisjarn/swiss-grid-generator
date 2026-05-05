import {
  PROJECT_JSON_EXTENSION,
} from "@/lib/project-transfer"

export type ExportFormat = "pdf" | "svg" | "idml" | "json"
export type VectorExportFormat = Exclude<ExportFormat, "json">

export type ExportBleedOptions = {
  enabled: boolean
  widthMm: number
}

type ExportFormatOption = {
  label: string
  extension: string
  multiPageExtension?: string
  supportsBleed: boolean
}

export const DEFAULT_EXPORT_BLEED_OPTIONS: ExportBleedOptions = {
  enabled: false,
  widthMm: 3,
}

export const EXPORT_CROP_MARK_OFFSET_MM = 2
export const EXPORT_CROP_MARK_LENGTH_MM = 5
export const EXPORT_CROP_MARK_CANVAS_MARGIN_MM = EXPORT_CROP_MARK_OFFSET_MM + EXPORT_CROP_MARK_LENGTH_MM
export const EXPORT_VECTOR_FORMATS = ["pdf", "svg", "idml"] as const
export const EXPORT_FORMATS = ["json", ...EXPORT_VECTOR_FORMATS] as const

export const EXPORT_FORMAT_OPTIONS: Record<ExportFormat, ExportFormatOption> = {
  json: {
    label: "JSON",
    extension: PROJECT_JSON_EXTENSION,
    supportsBleed: false,
  },
  pdf: {
    label: "PDF",
    extension: ".pdf",
    supportsBleed: true,
  },
  svg: {
    label: "SVG",
    extension: ".svg",
    multiPageExtension: ".zip",
    supportsBleed: true,
  },
  idml: {
    label: "IDML",
    extension: ".idml",
    supportsBleed: true,
  },
}

export const EXPORT_DOWNLOAD_EXTENSION_PATTERN = /\.(pdf|svg|idml|json|zip|swissgridgenerator)$/i

export function supportsExportBleed(format: ExportFormat): format is VectorExportFormat {
  return EXPORT_FORMAT_OPTIONS[format].supportsBleed
}

export function resolveExportDownloadExtension(
  format: ExportFormat,
  selectedPageCount: number,
): string {
  const option = EXPORT_FORMAT_OPTIONS[format]
  if (selectedPageCount > 1 && option.multiPageExtension) return option.multiPageExtension
  return option.extension
}

export function resolveExportBaseName(filename: string): string {
  return filename.trim().replace(EXPORT_DOWNLOAD_EXTENSION_PATTERN, "")
}

export function normalizeExportBleedOptions({
  enabled,
  widthMm,
  fallbackWidthMm = DEFAULT_EXPORT_BLEED_OPTIONS.widthMm,
}: {
  enabled: boolean
  widthMm: number
  fallbackWidthMm?: number
}): ExportBleedOptions {
  const resolvedWidthMm = Number.isFinite(widthMm) && widthMm >= 0
    ? widthMm
    : fallbackWidthMm
  return {
    enabled: enabled && resolvedWidthMm > 0,
    widthMm: Math.max(0, resolvedWidthMm),
  }
}
