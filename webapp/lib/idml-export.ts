import type { LoadedProject } from "@/core/document/session"
import { getFontVariants, isFontFamily, type FontFamily } from "@/core/config/fonts"
import {
  preloadFontFileMetricFaces,
  type FontFileMetricFace,
} from "@/core/layout/font-file-text-metrics-engine"
import { buildSwissGridIdmlPackage } from "@/lib/idml/builder"
import { measureLayoutPerformanceAsync } from "@/core/layout/layout-performance"
import type { SwissGridIdmlDocument } from "@/lib/idml/types"
import { buildResolvedProjectPageExportSource } from "@/core/export/project-page-export-source"
import type { ProjectPageVisibilitySettings } from "@/core/export/project-page-export-source"
import { buildPlannedProjectPageExportSource } from "@/core/export/planned-page-export-source"
import {
  getProjectPagePhysicalPageNumberAtIndex,
  getProjectPhysicalPageCount,
} from "@/core/document/page-numbering"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/core/layout/layout-engine-contract"

type IdmlExportProgress = {
  completedSteps: number
  totalSteps: number
  pageNumber: number
  pageName: string
}

function collectIdmlTextMetricFaces(project: LoadedProject<Record<string, unknown>>): FontFileMetricFace[] {
  const families = new Set<FontFamily>()
  for (const page of project.pages) {
    if (isFontFamily(page.uiSettings.baseFont)) families.add(page.uiSettings.baseFont)
    Object.values(page.previewLayout?.blockFontFamilies ?? {}).forEach((family) => {
      if (isFontFamily(family)) families.add(family)
    })
    Object.values(page.previewLayout?.blockTextFormatRuns ?? {}).forEach((runs) => {
      if (!Array.isArray(runs)) return
      runs.forEach((run) => {
        if (isFontFamily(run.fontFamily)) families.add(run.fontFamily)
      })
    })
  }

  return [...families].flatMap((fontFamily) => (
    getFontVariants(fontFamily).map((variant) => ({
      fontFamily,
      fontWeight: variant.weight,
      italic: variant.italic,
    }))
  ))
}

async function renderSwissGridIdmlProjectInternal(
  project: LoadedProject<Record<string, unknown>>,
  layoutEngine: LayoutEngineContract = project.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
  onProgress?: (progress: IdmlExportProgress) => void | Promise<void>,
  assertNotCancelled?: () => void,
  visibilitySettings?: ProjectPageVisibilitySettings,
): Promise<Uint8Array> {
  const now = new Date()
  const pageCount = getProjectPhysicalPageCount(project.pages)
  const pages: SwissGridIdmlDocument["pages"] = []
  await preloadFontFileMetricFaces(collectIdmlTextMetricFaces(project))

  for (const [index, page] of project.pages.entries()) {
    assertNotCancelled?.()
    const pageNumber = getProjectPagePhysicalPageNumberAtIndex(project.pages, index)
    const sourcePath = `${page.name || `Page ${pageNumber}`} (${page.id})`
    const resolved = buildResolvedProjectPageExportSource(page, sourcePath, {
      projectTitle: project.metadata.title,
      pageTitle: page.name || `Page ${pageNumber}`,
      pageNumber,
      pageCount,
      now,
    }, visibilitySettings)
    const plannedPage = buildPlannedProjectPageExportSource(resolved, layoutEngine)
    pages.push(plannedPage)
    await onProgress?.({
      completedSteps: index + 1,
      totalSteps: project.pages.length,
      pageNumber,
      pageName: page.name || `Page ${pageNumber}`,
    })
  }

  assertNotCancelled?.()
  await onProgress?.({
    completedSteps: project.pages.length,
    totalSteps: project.pages.length,
    pageNumber: project.pages.length,
    pageName: "Packaging IDML",
  })
  assertNotCancelled?.()

  return buildSwissGridIdmlPackage({
    metadata: project.metadata,
    pages,
  } satisfies SwissGridIdmlDocument)
}

export async function renderSwissGridIdmlProject(
  project: LoadedProject<Record<string, unknown>>,
  layoutEngine: LayoutEngineContract = project.layoutEngine ?? CURRENT_LAYOUT_ENGINE_CONTRACT,
  onProgress?: (progress: IdmlExportProgress) => void | Promise<void>,
  assertNotCancelled?: () => void,
  visibilitySettings?: ProjectPageVisibilitySettings,
): Promise<Uint8Array> {
  return measureLayoutPerformanceAsync(
    "idml.renderSwissGridIdmlProject",
    () => renderSwissGridIdmlProjectInternal(project, layoutEngine, onProgress, assertNotCancelled, visibilitySettings),
    {
      pages: project.pages.length,
    },
  )
}
