import fs from "node:fs"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { fileURLToPath } from "node:url"

import {
  DEFAULT_BASE_FONT,
  getStyleDefaultFontWeight,
  resolveFontFamily,
} from "../core/config/fonts.ts"
import { buildResolvedProjectPageExportSources } from "../core/export/project-page-export-source.ts"
import { buildPlannedProjectPageExportSource } from "../core/export/planned-page-export-source.ts"
import { preloadFontFileMetricFaces } from "../core/layout/font-file-text-metrics-engine.ts"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  resolveLayoutTextMetricsEngineFactory,
} from "../core/layout/layout-engine-contract.ts"
import { createTextMetricsService } from "../core/layout/text-metrics-service.ts"

const WEBAPP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC_ROOT = path.join(WEBAPP_ROOT, "public")
const FIXTURE_PATH = path.join(WEBAPP_ROOT, "tests/fixtures/performance-1000-pages.json")
const TEXT_METRICS_CACHE_LIMIT = 50000

function installLocalAssetFetch() {
  const originalFetch = globalThis.fetch?.bind(globalThis)
  if (typeof globalThis.btoa !== "function") {
    globalThis.btoa = (value) => Buffer.from(value, "binary").toString("base64")
  }

  globalThis.fetch = async (input, init) => {
    const rawUrl = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input?.url

    if (typeof rawUrl === "string" && rawUrl.startsWith("/")) {
      const localPath = path.resolve(PUBLIC_ROOT, `.${rawUrl}`)
      if (!localPath.startsWith(PUBLIC_ROOT + path.sep) && localPath !== PUBLIC_ROOT) {
        return new Response("Forbidden", { status: 403 })
      }
      try {
        const bytes = await fs.promises.readFile(localPath)
        return new Response(bytes, { status: 200 })
      } catch {
        return new Response("Not found", { status: 404 })
      }
    }

    if (typeof originalFetch === "function") return originalFetch(input, init)
    throw new Error(`No fetch implementation available for ${String(rawUrl ?? input)}`)
  }
}

function addFontMetricFace(faces, face) {
  const key = `${face.fontFamily}:${face.fontWeight}:${face.italic ? "italic" : "normal"}`
  faces.set(key, face)
}

function collectProjectFontMetricFaces(project) {
  const faces = new Map()
  for (const page of project.pages ?? []) {
    const layout = page.previewLayout
    const baseFont = page.uiSettings?.baseFont ?? DEFAULT_BASE_FONT
    addFontMetricFace(faces, { fontFamily: baseFont, fontWeight: 400, italic: false })

    const blockKeys = Array.isArray(layout?.blockOrder) && layout.blockOrder.length > 0
      ? layout.blockOrder
      : Object.keys(layout?.textContent ?? {})
    for (const key of blockKeys) {
      const styleKey = layout?.styleAssignments?.[key] ?? "body"
      const style = page.uiSettings?.typography?.styles?.[styleKey]
      const fontFamily = resolveFontFamily(layout?.blockFontFamilies?.[key], baseFont)
      const fontWeight = typeof layout?.blockFontWeights?.[key] === "number" && Number.isFinite(layout.blockFontWeights[key])
        ? layout.blockFontWeights[key]
        : getStyleDefaultFontWeight(style?.weight)
      const italic = typeof layout?.blockItalic?.[key] === "boolean"
        ? layout.blockItalic[key]
        : style?.blockItalic === true
      addFontMetricFace(faces, { fontFamily, fontWeight, italic })

      for (const run of layout?.blockTextFormatRuns?.[key] ?? []) {
        addFontMetricFace(faces, {
          fontFamily: resolveFontFamily(run.fontFamily, fontFamily),
          fontWeight: typeof run.fontWeight === "number" && Number.isFinite(run.fontWeight)
            ? run.fontWeight
            : fontWeight,
          italic: typeof run.italic === "boolean" ? run.italic : italic,
        })
      }
    }
  }
  return [...faces.values()]
}

function normalizeFixtureMetadata(project) {
  if (project.metadata) return project
  return {
    ...project,
    metadata: {
      title: project.title ?? "",
      author: project.author ?? "",
      description: project.description ?? "",
      createdAt: project.createdAt ?? "",
    },
  }
}

function formatMs(value) {
  return `${value.toFixed(2)}ms`
}

function runPass(name, sources, textMetricsService) {
  const phaseTotals = new Map()
  const startedAt = performance.now()
  let textPlanCount = 0
  let loremPlanCount = 0

  for (const source of sources) {
    const planned = buildPlannedProjectPageExportSource(
      source,
      CURRENT_LAYOUT_ENGINE_CONTRACT,
      textMetricsService,
      (label, durationMs) => {
        phaseTotals.set(label, (phaseTotals.get(label) ?? 0) + durationMs)
      },
    )
    for (const textPlan of planned.exportPlan.textPlans) {
      textPlanCount += 1
      if (textPlan.sourceText.includes("Lorem ipsum")) loremPlanCount += 1
      if (textPlan.sourceText.includes("<%")) {
        throw new Error(`Raw document variable leaked into ${source.id}:${textPlan.key}`)
      }
    }
  }

  const durationMs = performance.now() - startedAt
  return {
    name,
    durationMs,
    textPlanCount,
    loremPlanCount,
    documentVariablesMs: phaseTotals.get("buildPageExportPlan.documentVariables") ?? 0,
    typographyLayoutMs: phaseTotals.get("buildPageExportPlan.typographyLayout") ?? 0,
    wrapTextMs: phaseTotals.get("buildPageExportPlan.wrapText") ?? 0,
    positionedGlyphsMs: phaseTotals.get("buildPageExportPlan.positionedGlyphs") ?? 0,
  }
}

function printPass(pass, pageCount) {
  console.log([
    `pass=${pass.name}`,
    `pages=${pageCount}`,
    `buildPageExportPlan=${formatMs(pass.durationMs)}`,
    `avg=${formatMs(pass.durationMs / pageCount)}`,
    `textPlans=${pass.textPlanCount}`,
    `loremPlans=${pass.loremPlanCount}`,
  ].join(" "))
  console.log(`  documentVariables       ${formatMs(pass.documentVariablesMs).padStart(10)}`)
  console.log(`  typographyLayout        ${formatMs(pass.typographyLayoutMs).padStart(10)}`)
  console.log(`  wrapText                ${formatMs(pass.wrapTextMs).padStart(10)}`)
  console.log(`  positionedGlyphs        ${formatMs(pass.positionedGlyphsMs).padStart(10)}`)
}

installLocalAssetFetch()

const project = normalizeFixtureMetadata(JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")))
await preloadFontFileMetricFaces(collectProjectFontMetricFaces(project))

const sources = buildResolvedProjectPageExportSources(project, {
  fromPage: 1,
  toPage: project.pages.length,
})
const textMetricsService = createTextMetricsService({
  cacheLimit: TEXT_METRICS_CACHE_LIMIT,
  metricsEngineFactory: resolveLayoutTextMetricsEngineFactory(CURRENT_LAYOUT_ENGINE_CONTRACT),
})

const coldPass = runPass("cold", sources, textMetricsService)
const warmPass = runPass("warm", sources, textMetricsService)

printPass(coldPass, sources.length)
printPass(warmPass, sources.length)
