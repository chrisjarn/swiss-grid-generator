import { DEFAULT_BASE_FONT } from "@/core/config/fonts"
import type { LoadedProject } from "@/core/document/session"
import {
  collectExportTextMetricFaces,
  collectPdfFontFaces,
} from "@/lib/export-engine"
import {
  preloadFontFileMetricFaces,
  type FontFileMetricFace,
} from "@/core/layout/font-file-text-metrics-engine"
import { preloadPdfFontFaces } from "@/lib/pdf-font-registry"
import {
  buildProjectExportSources,
  resolveProjectExportPageNumbers,
} from "@/lib/project-export-runner"
import type {
  ProjectExportPageRange,
  ProjectPageVisibilitySettings,
} from "@/core/export/project-page-export-source"

let defaultExportFontWarmup: Promise<void> | null = null
const projectExportFontWarmupCache = new Map<string, Promise<void>>()
const PROJECT_FONT_WARMUP_CACHE_LIMIT = 16

function warmExportFontFaces(faces: readonly FontFileMetricFace[]): Promise<void> {
  return Promise.allSettled([
    preloadFontFileMetricFaces(faces),
    preloadPdfFontFaces(faces),
  ]).then(() => undefined)
}

function setProjectWarmupCacheValue(signature: string, task: Promise<void>): void {
  projectExportFontWarmupCache.set(signature, task)
  if (projectExportFontWarmupCache.size > PROJECT_FONT_WARMUP_CACHE_LIMIT) {
    const firstKey = projectExportFontWarmupCache.keys().next().value
    if (typeof firstKey === "string") projectExportFontWarmupCache.delete(firstKey)
  }
}

function getFaceSignature(faces: readonly FontFileMetricFace[]): string {
  return [...new Set(faces.map((face) => (
    `${face.fontFamily}:${face.fontWeight}:${face.italic ? "italic" : "normal"}`
  )))].sort().join("|")
}

function resolveProjectExportFontFaces({
  project,
  range,
  visibilitySettings,
}: {
  project: LoadedProject<Record<string, unknown>>
  range: ProjectExportPageRange
  visibilitySettings: ProjectPageVisibilitySettings
}): {
  metricFaces: FontFileMetricFace[]
  pdfFaces: FontFileMetricFace[]
} {
  const pageNumbers = resolveProjectExportPageNumbers(project, { range })
  const { sources } = buildProjectExportSources(project, pageNumbers, visibilitySettings)
  return {
    metricFaces: collectExportTextMetricFaces(sources),
    pdfFaces: collectPdfFontFaces(sources),
  }
}

export function warmDefaultExportFonts(): Promise<void> {
  if (defaultExportFontWarmup) return defaultExportFontWarmup
  defaultExportFontWarmup = warmExportFontFaces([
    { fontFamily: DEFAULT_BASE_FONT, fontWeight: 400, italic: false },
    { fontFamily: DEFAULT_BASE_FONT, fontWeight: 400, italic: true },
    { fontFamily: DEFAULT_BASE_FONT, fontWeight: 700, italic: false },
  ])
  return defaultExportFontWarmup
}

export function getProjectExportFontWarmupSignature(options: {
  project: LoadedProject<Record<string, unknown>>
  range: ProjectExportPageRange
  visibilitySettings: ProjectPageVisibilitySettings
}): string {
  const { metricFaces, pdfFaces } = resolveProjectExportFontFaces(options)
  return getFaceSignature([...metricFaces, ...pdfFaces])
}

export function warmProjectExportFonts({
  project,
  range,
  visibilitySettings,
}: {
  project: LoadedProject<Record<string, unknown>>
  range: ProjectExportPageRange
  visibilitySettings: ProjectPageVisibilitySettings
}): Promise<void> {
  const faces = resolveProjectExportFontFaces({ project, range, visibilitySettings })
  const signature = getFaceSignature([...faces.metricFaces, ...faces.pdfFaces])
  const cached = projectExportFontWarmupCache.get(signature)
  if (cached) return cached
  const task = Promise.allSettled([
    preloadFontFileMetricFaces(faces.metricFaces),
    preloadPdfFontFaces(faces.pdfFaces),
  ]).then(() => undefined)
  setProjectWarmupCacheValue(signature, task)
  return task
}
