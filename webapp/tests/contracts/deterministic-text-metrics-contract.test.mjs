import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  resolveLayoutTextMetricsEngineFactory,
} from "../../lib/layout-engine-contract.ts"
import {
  createDeterministicFontFileOpticalMarginTextMetricsEngine,
} from "../../lib/font-file-text-metrics-engine.ts"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

function collectSourceFiles(dirPath) {
  const files = []
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath))
      continue
    }
    if (/\.(ts|tsx)$/.test(entry.name)) files.push(entryPath)
  }
  return files
}

test("current layout contract resolves to deterministic font-file metrics", () => {
  const factory = resolveLayoutTextMetricsEngineFactory(CURRENT_LAYOUT_ENGINE_CONTRACT)
  assert.equal(factory, createDeterministicFontFileOpticalMarginTextMetricsEngine)

  const engine = factory({
    font: "400 12px Inter",
    measureText() {
      throw new Error("browser measureText should not be used by deterministic planning")
    },
  })

  assert.equal(engine.id, "font-file-deterministic-optical-margin-v1")
  assert.throws(
    () => engine.measureWidth({
      text: "Swiss",
      canvasFont: "400 12px Inter",
      trackingScale: 0,
      opticalKerning: true,
      sourceText: "Swiss",
      trackingRuns: [],
    }),
    /Deterministic font-file width unavailable/,
  )
})

test("canonical planning and preview paths do not use browser text metrics", () => {
  const sourceRoots = ["lib", "workers", "gui", "shared"]
    .map((dir) => path.join(ROOT, dir))
  const metricFiles = sourceRoots
    .flatMap((dir) => collectSourceFiles(dir))
    .filter((filePath) => readText(path.relative(ROOT, filePath)).includes(".measureText("))
    .map((filePath) => path.relative(ROOT, filePath))
    .sort()

  assert.deepEqual(metricFiles, [
    "lib/optical-margin.ts",
    "lib/text-format-runs.ts",
    "lib/text-rendering.ts",
    "lib/text-tracking-runs.ts",
  ])

  const pageExportSource = readText("lib/page-export-plan.ts")
  const canvasRendererSource = readText("lib/canvas-page-renderer.ts")
  const typographyRendererSource = readText("gui/preview/hooks/useTypographyRenderer.ts")

  assert.match(
    pageExportSource,
    /textMetricsEngineFactory\s*\?\?\s*resolveLayoutTextMetricsEngineFactory\(layoutEngine\)/,
  )
  assert.doesNotMatch(canvasRendererSource, /\.measureText\(/)
  assert.match(canvasRendererSource, /textPlan\.graphemeLines\.length > 0[\s\S]*?textPlan\.graphemeLines/)
  assert.match(typographyRendererSource, /buildPageExportPlan\(\{[\s\S]*?layoutEngine/)
  assert.match(typographyRendererSource, /buildCanvasRenderPlansFromPageExportPlan\(exportPlan/)
})

test("obsolete browser parity diagnostics are not part of the app or test scripts", () => {
  const removedPaths = [
    "app/dev/text-metrics/page.tsx",
    "scripts/run-text-metrics-parity.mjs",
    "lib/diagnostic-browser-canvas-text-metrics-engine.ts",
    "lib/text-metrics-browser-diagnostics.ts",
    "lib/text-metrics-dev-report.ts",
    "lib/text-metrics-parity.ts",
    "lib/text-metrics-parity-thresholds.ts",
    "lib/text-metrics-preset-samples.ts",
  ]

  for (const relPath of removedPaths) {
    assert.equal(fs.existsSync(path.join(ROOT, relPath)), false, `${relPath} should stay removed`)
  }

  const pkg = JSON.parse(readText("package.json"))
  assert.equal(pkg.scripts["test:text-metrics:browser"], undefined)
  assert.match(pkg.scripts["test:text-metrics"], /deterministic-text-metrics-contract\.test\.mjs/)

  const shellSource = readText("gui/shell/useShellModel.tsx")
  assert.doesNotMatch(shellSource, /__sggTextMetricsParity|text-metrics-dev-report/)

  const fontFileSource = readText("lib/font-file-text-metrics-engine.ts")
  assert.doesNotMatch(
    fontFileSource,
    /createDiagnosticBrowserCanvasTextMetricsEngine|allowDiagnosticBrowserFallback|createFontFileRangeCalibrationTextMetricsEngine/,
  )
})
