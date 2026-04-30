import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import { resolveScaledCanvasFontSize } from "../lib/canvas-render-math.ts"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

function extractFunctionBody(source, functionName) {
  const start = source.indexOf(`function ${functionName}`)
  assert.notEqual(start, -1, `${functionName} should exist`)
  const bodyStart = source.indexOf("{", start)
  assert.notEqual(bodyStart, -1, `${functionName} should have a body`)
  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === "{") depth += 1
    if (char === "}") depth -= 1
    if (depth === 0) return source.slice(bodyStart, index + 1)
  }
  assert.fail(`${functionName} body should close`)
}

test("resolveScaledCanvasFontSize scales explicit block overrides with the canvas scale", () => {
  assert.equal(resolveScaledCanvasFontSize(400, 0.25, 12), 100)
  assert.equal(resolveScaledCanvasFontSize(96, 0.5, 12), 48)
})

test("resolveScaledCanvasFontSize falls back to the default size for invalid overrides", () => {
  assert.equal(resolveScaledCanvasFontSize(0, 0.25, 12), 12)
  assert.equal(resolveScaledCanvasFontSize(Number.NaN, 0.25, 12), 12)
})

test("canvas preview and export share image placeholder geometry planning", () => {
  const canvasSource = readText("lib/canvas-page-renderer.ts")
  const exportSource = readText("lib/page-export-plan.ts")
  const plannerSource = readText("lib/image-placeholder-plan.ts")

  assert.match(canvasSource, /buildImagePlaceholderGeometryPlan/)
  assert.match(exportSource, /buildImagePlaceholderGeometryPlan/)
  assert.match(plannerSource, /clampLayerColumn/)
  assert.match(plannerSource, /clampFreePlacementRow/)
  assert.match(plannerSource, /resolveBlockHeight/)
  assert.match(plannerSource, /sumGridColumnSpan/)
})

test("canvas rendered-line metadata derives from positioned glyph plans", () => {
  const canvasSource = readText("lib/canvas-page-renderer.ts")
  const renderedLineBuilder = extractFunctionBody(canvasSource, "buildRenderedTextLines")

  assert.match(renderedLineBuilder, /segment\.width/)
  assert.match(renderedLineBuilder, /segment\.ascent/)
  assert.match(renderedLineBuilder, /segment\.descent/)
  assert.doesNotMatch(
    renderedLineBuilder,
    /measureText|measureCanvasTextWidth|measureTextPairAdvance/,
    "inline editor hit boxes and caret stops must not remeasure browser canvas text after planning",
  )
})

test("canvas text drawing consumes positioned glyph plans without measuring", () => {
  const canvasSource = readText("lib/canvas-page-renderer.ts")
  const drawPlan = extractFunctionBody(canvasSource, "drawCanvasTextPlan")

  assert.match(drawPlan, /ctx\.fillText/)
  assert.match(drawPlan, /segment\.x/)
  assert.match(drawPlan, /segment\.y/)
  assert.doesNotMatch(
    drawPlan,
    /drawCanvasText|measureText|measureCanvasTextWidth|measureTextPairAdvance/,
    "canvas output should paint prepositioned glyphs instead of measuring text while drawing",
  )
})
