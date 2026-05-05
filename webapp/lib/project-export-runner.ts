import type { LoadedProject } from "@/lib/document-session"
import {
  getProjectPagePhysicalPageNumberAtIndex,
  getProjectPhysicalPageCount,
} from "@/lib/document-page-numbering"
import {
  runExportEngine,
  type ExportEngineFormat,
  type ExportEngineBleedConfig,
  type ExportEngineMetadata,
  type ExportEngineOptions,
  type ExportEngineResult,
  type ExportEngineSvgPackaging,
} from "@/lib/export-engine"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/lib/layout-engine-contract"
import {
  buildResolvedProjectPageExportSource,
  normalizeProjectExportPageRange,
  type ProjectExportPageRange,
  type ProjectPageVisibilitySettings,
  type ResolvedProjectPageExportSource,
} from "@/lib/project-page-export-source"

export type ProjectExportRunnerOptions = {
  project: LoadedProject<Record<string, unknown>>
  formats: readonly ExportEngineFormat[]
  metadata: ExportEngineMetadata
  baseName: string
  filenames?: Partial<Record<ExportEngineFormat, string>>
  range?: ProjectExportPageRange
  pageNumbers?: readonly number[]
  visibilitySettings: ProjectPageVisibilitySettings
  layoutEngine?: LayoutEngineContract
  bleed?: ExportEngineBleedConfig
  svgPackaging?: ExportEngineSvgPackaging
  onProgress?: ExportEngineOptions["onProgress"]
  onLog?: ExportEngineOptions["onLog"]
  shouldLogPage?: ExportEngineOptions["shouldLogPage"]
  assertNotCancelled?: ExportEngineOptions["assertNotCancelled"]
}

export type ProjectExportRunnerResult = ExportEngineResult & {
  selectedPageNumbers: number[]
  selectedPhysicalPageNumbers: number[]
  selectedSources: ResolvedProjectPageExportSource[]
}

function uniqueSortedPageNumbers(pageNumbers: readonly number[], pageCount: number): number[] {
  const selected = new Set<number>()
  pageNumbers.forEach((pageNumber) => {
    if (!Number.isFinite(pageNumber)) return
    const normalized = Math.round(pageNumber)
    if (normalized < 1 || normalized > pageCount) return
    selected.add(normalized)
  })
  return [...selected].sort((left, right) => left - right)
}

export function resolveProjectExportPageNumbers(
  project: LoadedProject<Record<string, unknown>>,
  options: Pick<ProjectExportRunnerOptions, "range" | "pageNumbers">,
): number[] {
  if (project.pages.length === 0) return []
  if (options.pageNumbers?.length) {
    return uniqueSortedPageNumbers(options.pageNumbers, project.pages.length)
  }
  if (options.range) {
    const normalized = normalizeProjectExportPageRange(
      project.pages.length,
      options.range.fromPage,
      options.range.toPage,
    )
    return Array.from(
      { length: normalized.endIndex - normalized.startIndex + 1 },
      (_, index) => normalized.startIndex + index + 1,
    )
  }
  return Array.from({ length: project.pages.length }, (_, index) => index + 1)
}

export function buildProjectExportSources(
  project: LoadedProject<Record<string, unknown>>,
  pageNumbers: readonly number[],
  visibilitySettings: ProjectPageVisibilitySettings,
): {
  sources: ResolvedProjectPageExportSource[]
  physicalPageNumbers: number[]
} {
  const now = new Date()
  const pageCount = getProjectPhysicalPageCount(project.pages)
  const projectTitle = project.metadata?.title ?? ""
  const sources: ResolvedProjectPageExportSource[] = []
  const physicalPageNumbers: number[] = []

  pageNumbers.forEach((pageNumber) => {
    const pageIndex = pageNumber - 1
    const page = project.pages[pageIndex]
    if (!page) return
    const physicalPageNumber = getProjectPagePhysicalPageNumberAtIndex(project.pages, pageIndex)
    const sourcePath = `${page.name || `Page ${physicalPageNumber}`} (${page.id})`
    physicalPageNumbers.push(physicalPageNumber)
    sources.push(buildResolvedProjectPageExportSource(
      page,
      sourcePath,
      {
        projectTitle,
        pageTitle: page.name || `Page ${physicalPageNumber}`,
        pageNumber: physicalPageNumber,
        pageCount,
        now,
      },
      visibilitySettings,
    ))
  })

  return { sources, physicalPageNumbers }
}

export async function runProjectExport(options: ProjectExportRunnerOptions): Promise<ProjectExportRunnerResult> {
  const sourceStartedAt = performance.now()
  const selectedPageNumbers = resolveProjectExportPageNumbers(options.project, options)
  const { sources, physicalPageNumbers } = buildProjectExportSources(
    options.project,
    selectedPageNumbers,
    options.visibilitySettings,
  )
  const sourceDurationMs = performance.now() - sourceStartedAt
  const result = await runExportEngine({
    formats: options.formats,
    pages: sources,
    metadata: options.metadata,
    baseName: options.baseName,
    filenames: options.filenames,
    startPageNumber: physicalPageNumbers[0] ?? selectedPageNumbers[0] ?? 1,
    pageNumbers: physicalPageNumbers,
    layoutEngine: options.layoutEngine ?? options.project.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
    bleed: options.bleed,
    svgPackaging: options.svgPackaging,
    onProgress: options.onProgress,
    onLog: options.onLog,
    shouldLogPage: options.shouldLogPage,
    assertNotCancelled: options.assertNotCancelled,
  })
  result.timings.unshift({
    label: "resolve export sources",
    durationMs: sourceDurationMs,
    extra: `pages=${sources.length}`,
  })

  return {
    ...result,
    selectedPageNumbers,
    selectedPhysicalPageNumbers: physicalPageNumbers,
    selectedSources: sources,
  }
}
