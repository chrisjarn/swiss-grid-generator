import { performance } from "node:perf_hooks"

import { buildPageExportPlan } from "../lib/page-export-plan.ts"
import { createStressPagePlanArgs } from "../tests/helpers/page-export-plan-fixtures.mjs"

const PAGE_COUNTS = [10, 100, 500, 1000]

function formatMs(value) {
  return `${value.toFixed(2)}ms`
}

function formatMemory(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

for (const pageCount of PAGE_COUNTS) {
  const args = Array.from({ length: pageCount }, (_, pageIndex) => createStressPagePlanArgs(pageIndex))
  const before = process.memoryUsage().heapUsed
  const startedAt = performance.now()
  let textPlanCount = 0
  let imagePlanCount = 0

  for (const entry of args) {
    const plan = buildPageExportPlan(entry)
    textPlanCount += plan.textPlans.length
    imagePlanCount += plan.imagePlans.length
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
}
