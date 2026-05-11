import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/core/layout/layout-engine-contract"
import { buildPageExportPlan, type PageExportPlan } from "@/core/layout/page-export-plan"
import type { ResolvedProjectPageExportSource } from "@/core/export/project-page-export-source"

type PlannerTextMetricsService = NonNullable<Parameters<typeof buildPageExportPlan>[0]["textMetricsService"]>

export type PlannedProjectPageExportSource = ResolvedProjectPageExportSource & {
  exportPlan: PageExportPlan
}

export function buildPlannedProjectPageExportSource(
  source: ResolvedProjectPageExportSource,
  layoutEngine: LayoutEngineContract = CURRENT_LAYOUT_ENGINE_CONTRACT,
  textMetricsService?: PlannerTextMetricsService,
): PlannedProjectPageExportSource {
  return {
    ...source,
    exportPlan: buildPageExportPlan({
      result: source.result,
      layout: source.previewLayout,
      documentVariableContext: source.documentVariableContext,
      baseFont: source.baseFont,
      imageColorScheme: source.imageColorScheme,
      canvasBackground: source.resolvedCanvasBackground,
      rotation: source.uiSettings.rotation,
      showBaselines: source.uiSettings.showBaselines,
      showModules: source.uiSettings.showModules,
      showMargins: source.uiSettings.showMargins,
      showImagePlaceholders: source.uiSettings.showImagePlaceholders,
      showTypography: source.uiSettings.showTypography,
      layoutEngine,
      textMetricsService,
    }),
  }
}

export function buildPlannedProjectPageExportSources(
  sources: readonly ResolvedProjectPageExportSource[],
  layoutEngine: LayoutEngineContract = CURRENT_LAYOUT_ENGINE_CONTRACT,
  onPagePlanned?: (source: PlannedProjectPageExportSource, index: number, total: number) => void,
): PlannedProjectPageExportSource[] {
  const total = sources.length
  return sources.map((source, index) => {
    const planned = buildPlannedProjectPageExportSource(source, layoutEngine)
    onPagePlanned?.(planned, index, total)
    return planned
  })
}
