import test from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import { preloadFontFileMetricFaces } from "../lib/font-file-text-metrics-engine.ts"
import { buildPageExportPlan } from "../lib/page-export-plan.ts"
import { buildResolvedProjectPageExportSource } from "../lib/project-page-export-source.ts"
import { createStressPagePlanArgs } from "./helpers/page-export-plan-fixtures.mjs"

const ROOT = process.cwd()
const PUBLIC_ROOT = path.join(ROOT, "public")
const EXPECTED_STRESS_PLAN_HASH = "f1018c0932f58f10391d786b1350e007db0b3e3af046e1dd8dfa1630985b1898"

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

installLocalAssetFetch()
await preloadFontFileMetricFaces([
  { fontFamily: "Inter", fontWeight: 100, italic: false },
  { fontFamily: "Inter", fontWeight: 200, italic: false },
  { fontFamily: "Inter", fontWeight: 400, italic: false },
  { fontFamily: "Inter", fontWeight: 400, italic: true },
  { fontFamily: "Inter", fontWeight: 700, italic: false },
  { fontFamily: "Inter", fontWeight: 700, italic: true },
])

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

function normalizePlanForSnapshot(value) {
  if (typeof value === "number") return Number(value.toFixed(6))
  if (Array.isArray(value)) return value.map(normalizePlanForSnapshot)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      normalizePlanForSnapshot(entry),
    ]))
  }
  return value
}

function hashPlan(plan) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizePlanForSnapshot(plan)))
    .digest("hex")
}

test("page export plan is deterministic for the stress fixture", () => {
  const args = createStressPagePlanArgs(3)
  const first = buildPageExportPlan(args)
  const second = buildPageExportPlan(args)

  assert.deepEqual(normalizePlanForSnapshot(second), normalizePlanForSnapshot(first))
  assert.equal(first.pageWidth, args.result.pageSizePt.width)
  assert.equal(first.pageHeight, args.result.pageSizePt.height)
  assert.ok(first.guideGroups.some((group) => group.id === "margins"))
  assert.ok(first.guideGroups.some((group) => group.id === "modules"))
  assert.ok(first.guideGroups.some((group) => group.id === "baselines"))
  assert.ok(first.imagePlans.length >= 5)
  assert.ok(first.textPlans.length >= 10)
  assert.ok(first.textPlans.every((plan) => plan.graphemeLines.length === plan.commands.length))
  assert.ok(first.textPlans.some((plan) => plan.graphemeLines.some((line) => line.length > 1)))
  assert.ok(first.textPlans.some((plan) => plan.segmentLines.some((line) => line.length > 0)))
  assert.ok(first.orderedLayerKeys.length >= first.imagePlans.length + first.textPlans.length)
  assert.equal(hashPlan(first), EXPECTED_STRESS_PLAN_HASH)
})

test("row-based reflow uses the final module row for 150 Fonts display paragraphs", () => {
  const project = JSON.parse(readText("tests/fixtures/150 Fonts.json"))
  const page = project.pages[2]
  const source = buildResolvedProjectPageExportSource(page, "150 Fonts page 3", {
    projectTitle: project.title,
    pageTitle: page.name,
    pageNumber: 3,
    pageCount: project.pages.length,
  })
  const plan = buildPageExportPlan({
    result: source.result,
    layout: source.previewLayout,
    documentVariableContext: source.documentVariableContext,
    baseFont: source.baseFont,
    imageColorScheme: source.imageColorScheme,
    canvasBackground: source.resolvedCanvasBackground,
    rotation: source.uiSettings.rotation,
    showBaselines: true,
    showModules: true,
    showMargins: true,
    showImagePlaceholders: true,
    showTypography: true,
    includeGraphemeLines: false,
  })
  const displayBlockKey = "paragraph-1776958426433-3"
  const displayPlan = plan.textPlans.find((entry) => entry.key === displayBlockKey)

  assert.equal(plan.overflowByBlock[displayBlockKey], 0)
  assert.equal(displayPlan?.commands.length, 60)
  assert.equal(displayPlan?.commands.at(-1)?.text, "9")
})

test("page export plan replaces removed Libre Franklin layout references", () => {
  const args = createStressPagePlanArgs(7)
  const key = args.layout.blockOrder[0]
  args.layout.blockFontFamilies = { ...(args.layout.blockFontFamilies ?? {}) }
  args.layout.blockTextFormatRuns = { ...(args.layout.blockTextFormatRuns ?? {}) }
  args.layout.blockFontFamilies[key] = "Libre Franklin"
  args.layout.blockTextFormatRuns[key] = [{
    start: 0,
    end: Math.min(8, args.layout.textContent[key]?.length ?? 0),
    fontFamily: "Libre Franklin",
  }]

  const plan = buildPageExportPlan(args)
  const textPlan = plan.textPlans.find((entry) => entry.key === key)

  assert.equal(textPlan?.fontFamily, "Inter")
  assert.ok(textPlan?.graphemeLines.flat().every((grapheme) => grapheme.fontFamily !== "Libre Franklin"))
})

test("layout profiling is dev-only instrumentation around existing planning and drawing calls", () => {
  const profilerSource = readText("lib/layout-performance.ts")
  const planSource = readText("lib/page-export-plan.ts")
  const rendererSource = readText("hooks/useTypographyRenderer.ts")

  assert.match(profilerSource, /NEXT_PUBLIC_LAYOUT_PROFILING/)
  assert.match(profilerSource, /console\.info/)
  assert.match(profilerSource, /measureLayoutPerformance/)
  assert.match(planSource, /function\s+buildPageExportGuidePlan\(/)
  assert.match(planSource, /function\s+buildPageExportImagePlans\(/)
  assert.match(planSource, /function\s+buildPageExportPlanInternal\(/)
  assert.match(planSource, /export\s+function\s+buildPageExportPlan\(args:\s*BuildPageExportPlanArgs\):\s*PageExportPlan/)
  assert.match(planSource, /if\s*\(!isLayoutProfilingEnabled\(\)\)\s*return\s+buildPageExportPlanInternal\(args\)/)
  assert.match(planSource, /measureLayoutPerformance\(\s*"buildPageExportPlan"/)
  assert.match(planSource, /measureLayoutPerformance\(\s*"buildPageExportPlan\.geometry"/)
  assert.match(planSource, /measureLayoutPerformance\(\s*"buildPageExportPlan\.guides"/)
  assert.match(planSource, /measureLayoutPerformance\(\s*"buildPageExportPlan\.images"/)
  assert.match(planSource, /measureLayoutPerformance\(\s*"buildPageExportPlan\.typographyLayout"/)
  assert.match(planSource, /measureLayoutPerformance\(\s*"buildPageExportPlan\.positionedGlyphs"/)
  assert.match(rendererSource, /measureLayoutPerformance\(\s*"canvas\.buildRenderPlansFromPageExportPlan"/)
  assert.match(rendererSource, /measureLayoutPerformance\(\s*"canvas\.drawLayerStack"/)
})
