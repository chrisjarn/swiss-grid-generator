import type { ProjectPage } from "@/lib/document-session"
import {
  buildResolvedProjectPageExportSource,
  resolveProjectPageUiSettings,
} from "@/lib/project-page-export-source"
import type { LayoutPresetBrowserPage, LayoutPresetUiSettings } from "@/lib/presets/types"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  type LayoutEngineContract,
} from "@/lib/layout-engine-contract"

export function toPresetUiSettings(source: Record<string, unknown>, sourcePath: string): LayoutPresetUiSettings {
  return resolveProjectPageUiSettings(source, sourcePath) as LayoutPresetUiSettings
}

export function buildPresetBrowserPage(
  page: ProjectPage<Record<string, unknown>>,
  sourcePath: string,
  layoutEngine: LayoutEngineContract = CURRENT_LAYOUT_ENGINE_CONTRACT,
): LayoutPresetBrowserPage {
  const resolved = buildResolvedProjectPageExportSource(page, sourcePath)

  return {
    id: resolved.id,
    name: resolved.name,
    uiSettings: resolved.uiSettings as LayoutPresetUiSettings,
    previewLayout: resolved.previewLayout,
    result: resolved.result,
    baseFont: resolved.baseFont,
    imageColorScheme: resolved.imageColorScheme,
    resolvedCanvasBackground: resolved.resolvedCanvasBackground,
    layoutEngine,
  }
}
