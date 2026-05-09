import {
  parseProjectTour,
  type ProjectTour,
} from "@/lib/project-tour"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  parseLayoutEngineContract,
  type LayoutEngineContract,
} from "@/lib/layout-engine-contract"
import { resolveFontFamily, type FontFamily } from "@/lib/config/fonts"

export type ProjectMetadata = {
  title: string
  description: string
  author: string
  createdAt?: string
}

export type ProjectPageLayoutMode = "single" | "facing"
export type ProjectVisibilitySettings = {
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
}

export const DEFAULT_PROJECT_VISIBILITY_SETTINGS: ProjectVisibilitySettings = {
  showBaselines: true,
  showModules: true,
  showMargins: true,
  showImagePlaceholders: true,
  showTypography: true,
}

// NEW: Project/Pages/Layers architecture
export type ProjectPage<Layout> = {
  id: string
  name: string
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  layoutMode?: ProjectPageLayoutMode
}

export type LoadedProject<Layout> = {
  activePageId: string
  pages: ProjectPage<Layout>[]
  metadata: ProjectMetadata
  layoutEngine: LayoutEngineContract
  visibilitySettings: ProjectVisibilitySettings
  tour?: ProjectTour | null
}

export const EMPTY_PROJECT_METADATA: ProjectMetadata = {
  title: "",
  description: "",
  author: "",
}

const DEFAULT_PAGE_NAME = "Page 1"
let projectPageSequence = 0

function createProjectPageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `page-${crypto.randomUUID()}`
  }
  projectPageSequence += 1
  return `page-${Date.now()}-${projectPageSequence}`
}

function toNormalizedIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed).toISOString()
}

function toDocumentText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function extractProjectMetadata(source: unknown): ProjectMetadata {
  if (typeof source !== "object" || source === null) {
    return EMPTY_PROJECT_METADATA
  }
  const payload = source as Record<string, unknown>
  return {
    title: toDocumentText(payload.title),
    description: toDocumentText(payload.description),
    author: toDocumentText(payload.author),
    createdAt: toNormalizedIsoDate(payload.createdAt) ?? toNormalizedIsoDate(payload.exportedAt),
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function sanitizeProjectUiSettingsFonts(source: Record<string, unknown>): Record<string, unknown> {
  return {
    ...source,
    baseFont: resolveFontFamily(source.baseFont),
  }
}

function sanitizeProjectTextFormatRuns(
  source: unknown,
  fallbackFontFamily: FontFamily,
): unknown {
  if (!isObjectRecord(source)) return source
  let changed = false
  const nextRunsByBlock: Record<string, unknown> = {}

  for (const [blockKey, runs] of Object.entries(source)) {
    if (!Array.isArray(runs)) {
      nextRunsByBlock[blockKey] = runs
      continue
    }
    nextRunsByBlock[blockKey] = runs.map((run) => {
      if (!isObjectRecord(run) || run.fontFamily === undefined) return run
      const fontFamily = resolveFontFamily(run.fontFamily, fallbackFontFamily)
      if (fontFamily === run.fontFamily) return run
      changed = true
      return { ...run, fontFamily }
    })
  }

  return changed ? nextRunsByBlock : source
}

function sanitizeProjectPreviewLayoutFonts<Layout>(
  source: unknown,
  fallbackFontFamily: FontFamily,
): Layout | null {
  if (!isObjectRecord(source)) return null

  let changed = false
  let nextBlockFontFamilies = source.blockFontFamilies
  if (isObjectRecord(source.blockFontFamilies)) {
    const resolvedFonts: Record<string, unknown> = {}
    for (const [blockKey, fontFamily] of Object.entries(source.blockFontFamilies)) {
      const resolvedFontFamily = resolveFontFamily(fontFamily, fallbackFontFamily)
      resolvedFonts[blockKey] = resolvedFontFamily
      if (resolvedFontFamily !== fontFamily) changed = true
    }
    nextBlockFontFamilies = resolvedFonts
  }

  const nextBlockTextFormatRuns = sanitizeProjectTextFormatRuns(
    source.blockTextFormatRuns,
    fallbackFontFamily,
  )
  if (nextBlockTextFormatRuns !== source.blockTextFormatRuns) changed = true

  return (
    changed
      ? {
          ...source,
          blockFontFamilies: nextBlockFontFamilies,
          blockTextFormatRuns: nextBlockTextFormatRuns,
        }
      : source
  ) as Layout
}

function resolveBooleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

export function resolveProjectVisibilitySettings(
  source: unknown,
  fallback: ProjectVisibilitySettings = DEFAULT_PROJECT_VISIBILITY_SETTINGS,
): ProjectVisibilitySettings {
  const payload = isObjectRecord(source) ? source : {}
  return {
    showBaselines: resolveBooleanSetting(payload.showBaselines, fallback.showBaselines),
    showModules: resolveBooleanSetting(payload.showModules, fallback.showModules),
    showMargins: resolveBooleanSetting(payload.showMargins, fallback.showMargins),
    showImagePlaceholders: resolveBooleanSetting(payload.showImagePlaceholders, fallback.showImagePlaceholders),
    showTypography: resolveBooleanSetting(payload.showTypography, fallback.showTypography),
  }
}

function toPageName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function createProjectPage<Layout>({
  id,
  name = DEFAULT_PAGE_NAME,
  uiSettings,
  previewLayout,
  layoutMode = "single",
}: {
  id?: string
  name?: string
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  layoutMode?: ProjectPageLayoutMode
}): ProjectPage<Layout> {
  const trimmedId = typeof id === "string" ? id.trim() : ""

  return {
    id: trimmedId.length > 0 ? trimmedId : createProjectPageId(),
    name: toPageName(name, DEFAULT_PAGE_NAME),
    uiSettings,
    previewLayout,
    layoutMode,
  }
}

export function createDefaultProject<Layout>({
  uiSettings,
  previewLayout,
  metadata = EMPTY_PROJECT_METADATA,
  layoutEngine = CURRENT_LAYOUT_ENGINE_CONTRACT,
  visibilitySettings = DEFAULT_PROJECT_VISIBILITY_SETTINGS,
  defaultPageName = DEFAULT_PAGE_NAME,
  tour = null,
}: {
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  metadata?: ProjectMetadata
  layoutEngine?: LayoutEngineContract
  visibilitySettings?: ProjectVisibilitySettings
  defaultPageName?: string
  tour?: ProjectTour | null
}): LoadedProject<Layout> {
  const page = createProjectPage({
    name: defaultPageName,
    uiSettings,
    previewLayout,
  })

  return {
    activePageId: page.id,
    pages: [page],
    metadata,
    layoutEngine,
    visibilitySettings,
    tour,
  }
}

function parseProjectPages<Layout>(value: unknown): ProjectPage<Layout>[] {
  if (!Array.isArray(value)) return []

  const seenIds = new Set<string>()
  const pages: ProjectPage<Layout>[] = []

  value.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null) return
    const payload = entry as Record<string, unknown>
    if (!payload.uiSettings || typeof payload.uiSettings !== "object") return

    const rawId = typeof payload.id === "string" ? payload.id.trim() : ""
    const id = rawId.length > 0 && !seenIds.has(rawId) ? rawId : undefined
    const layoutMode = payload.layoutMode === "facing" ? "facing" : "single"
    const uiSettings = sanitizeProjectUiSettingsFonts(payload.uiSettings as Record<string, unknown>)
    const baseFont = resolveFontFamily(uiSettings.baseFont)
    const page = createProjectPage<Layout>({
      id,
      name: toPageName(payload.name, `Page ${index + 1}`),
      uiSettings,
      previewLayout: sanitizeProjectPreviewLayoutFonts<Layout>(payload.previewLayout, baseFont),
      layoutMode,
    })

    seenIds.add(page.id)
    pages.push(page)
  })

  return pages
}

export function parseLoadedProject<Layout>(source: unknown): LoadedProject<Layout> {
  if (typeof source !== "object" || source === null) {
    throw new Error("Invalid project JSON: expected an object payload.")
  }

  const payload = source as Record<string, unknown>
  const metadata = extractProjectMetadata(payload)
  const layoutEngine = parseLayoutEngineContract(payload.layoutEngine)
  const tour = parseProjectTour(payload.tour)
  const parsedPages = parseProjectPages<Layout>(payload.pages)
  const legacyPageVisibilitySettings = parsedPages[0]?.uiSettings ?? null
  const visibilitySettings = resolveProjectVisibilitySettings(
    payload.visibilitySettings,
    resolveProjectVisibilitySettings(legacyPageVisibilitySettings),
  )

  if (parsedPages.length > 0) {
    const activePageId = typeof payload.activePageId === "string"
      && parsedPages.some((page) => page.id === payload.activePageId)
      ? payload.activePageId
      : parsedPages[0].id

    return {
      activePageId,
      pages: parsedPages,
      metadata,
      layoutEngine,
      visibilitySettings,
      tour,
    }
  }

  throw new Error("Invalid project JSON: missing pages array.")
}

export function getPreviewLayoutSeed<Layout>(layout: Layout | null, defaultLayout: Layout | null): Layout {
  if (layout) return layout
  if (defaultLayout) return defaultLayout
  throw new Error("Default preview layout is unavailable.")
}
