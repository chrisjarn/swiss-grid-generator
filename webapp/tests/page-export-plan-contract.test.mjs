import test from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import { buildPageExportPlan } from "../lib/page-export-plan.ts"
import { createStressPagePlanArgs } from "./helpers/page-export-plan-fixtures.mjs"

const ROOT = process.cwd()
const EXPECTED_STRESS_PLAN_HASH = "a9cc1cab1b4f463ee82ab4f842b6ff297a6ffb7fcc43be04c56c15d38bc84526"

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
  assert.ok(first.orderedLayerKeys.length >= first.imagePlans.length + first.textPlans.length)
  assert.equal(hashPlan(first), EXPECTED_STRESS_PLAN_HASH)
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
