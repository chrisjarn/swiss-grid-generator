import fs from "node:fs"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { fileURLToPath } from "node:url"

import {
  DEFAULT_BASE_FONT,
  getStyleDefaultFontWeight,
  resolveFontFamily,
} from "../core/config/fonts.ts"
import { preloadFontFileMetricFaces } from "../core/layout/font-file-text-metrics-engine.ts"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  resolveLayoutTextMetricsEngineFactory,
} from "../core/layout/layout-engine-contract.ts"
import { addLayoutPerformanceMetricListener } from "../core/layout/layout-performance.ts"
import { buildPageExportPlan } from "../core/layout/page-export-plan.ts"
import { createTextMetricsService } from "../core/layout/text-metrics-service.ts"
import { createStressPagePlanArgs } from "../tests/helpers/page-export-plan-fixtures.mjs"

const PAGE_COUNTS = [10, 100, 500, 1000]
const BENCHMARK_TEXT_METRICS_CACHE_LIMIT = 50000
const PLANNER_PHASE_LABELS = [
  "buildPageExportPlan.documentVariables",
  "buildPageExportPlan.typographyLayout",
  "buildPageExportPlan.positionedGlyphs",
  "buildPageExportPlan.wrapText",
  "buildPageExportPlan.lineCommands",
  "buildPageExportPlan.glyphGraphemes",
  "buildPageExportPlan.glyphSegments",
  "buildPageExportPlan.opticalOffsets",
  "buildPageExportPlan.graphemeAdvance",
  "buildPageExportPlan.graphemeMetrics",
  "buildPageExportPlan.resolveBlocks",
  "buildPageExportPlan.images",
  "buildPageExportPlan.guides",
  "buildPageExportPlan.geometry",
  "buildPageExportPlan.layerOrder",
]
const WEBAPP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC_ROOT = path.join(WEBAPP_ROOT, "public")

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

function collectBenchmarkFontMetricFaces(args) {
  const faces = new Map()
  for (const entry of args) {
    const layout = entry.layout
    const baseFont = entry.baseFont ?? DEFAULT_BASE_FONT
    if (!layout) {
      addFontMetricFace(faces, { fontFamily: baseFont, fontWeight: 400, italic: false })
      continue
    }

    const blockKeys = Array.isArray(layout.blockOrder) && layout.blockOrder.length > 0
      ? layout.blockOrder
      : Object.keys(layout.textContent ?? {})

    for (const key of blockKeys) {
      const styleKey = layout.styleAssignments?.[key] ?? "body"
      const style = entry.result.typography.styles[styleKey]
      const fontFamily = resolveFontFamily(layout.blockFontFamilies?.[key], baseFont)
      const fontWeight = typeof layout.blockFontWeights?.[key] === "number" && Number.isFinite(layout.blockFontWeights[key])
        ? layout.blockFontWeights[key]
        : getStyleDefaultFontWeight(style?.weight)
      const italic = typeof layout.blockItalic?.[key] === "boolean"
        ? layout.blockItalic[key]
        : style?.blockItalic === true
      addFontMetricFace(faces, { fontFamily, fontWeight, italic })

      for (const run of layout.blockTextFormatRuns?.[key] ?? []) {
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

function formatMs(value) {
  return `${value.toFixed(2)}ms`
}

function formatMemory(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatPhaseLine(label, durationMs, pageCount, totalMs) {
  const shortLabel = label.replace("buildPageExportPlan.", "")
  const percent = totalMs > 0 ? `${((durationMs / totalMs) * 100).toFixed(1)}%` : "0.0%"
  return `  ${shortLabel.padEnd(32)} ${formatMs(durationMs).padStart(10)} avg=${formatMs(durationMs / pageCount).padStart(9)} share=${percent.padStart(6)}`
}

installLocalAssetFetch()
process.env.NEXT_PUBLIC_LAYOUT_PROFILING = "1"
process.env.SGG_LAYOUT_PROFILING_SILENT = "1"

for (const pageCount of PAGE_COUNTS) {
  const args = Array.from({ length: pageCount }, (_, pageIndex) => createStressPagePlanArgs(pageIndex))
  await preloadFontFileMetricFaces(collectBenchmarkFontMetricFaces(args))
  const textMetricsService = createTextMetricsService({
    cacheLimit: BENCHMARK_TEXT_METRICS_CACHE_LIMIT,
    metricsEngineFactory: resolveLayoutTextMetricsEngineFactory(CURRENT_LAYOUT_ENGINE_CONTRACT),
  })
  const phaseTotals = new Map()
  const removeMetricListener = addLayoutPerformanceMetricListener((metric) => {
    if (!PLANNER_PHASE_LABELS.includes(metric.label)) return
    phaseTotals.set(metric.label, (phaseTotals.get(metric.label) ?? 0) + metric.durationMs)
  })
  const before = process.memoryUsage().heapUsed
  const startedAt = performance.now()
  let textPlanCount = 0
  let imagePlanCount = 0

  try {
    for (const entry of args) {
      const plan = buildPageExportPlan({
        ...entry,
        textMetricsService,
      })
      textPlanCount += plan.textPlans.length
      imagePlanCount += plan.imagePlans.length
    }
  } finally {
    removeMetricListener()
  }

  const duration = performance.now() - startedAt
  const after = process.memoryUsage().heapUsed
  console.log([
    `pages=${pageCount}`,
    `buildPageExportPlan=${formatMs(duration)}`,
    `avg=${formatMs(duration / pageCount)}`,
    `textPlans=${textPlanCount}`,
    `imagePlans=${imagePlanCount}`,
    `heapDelta=${formatMemory(after - before)}`,
    `heapUsed=${formatMemory(after)}`,
  ].join(" "))
  for (const label of PLANNER_PHASE_LABELS) {
    const phaseDuration = phaseTotals.get(label) ?? 0
    if (phaseDuration <= 0) continue
    console.log(formatPhaseLine(label, phaseDuration, pageCount, duration))
  }
}
