import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  buildExportBox,
  clipExportLineToRect,
  getExportGuideClipRect,
} from "../lib/export-box.ts"
import { DEFAULT_EXPORT_BLEED_OPTIONS } from "../lib/export-format-options.ts"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

function round(value) {
  return Number(value.toFixed(3))
}

function roundedRect(rect) {
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
  }
}

function roundedLine(line) {
  return {
    x1: round(line.x1),
    y1: round(line.y1),
    x2: round(line.x2),
    y2: round(line.y2),
  }
}

test("export box centralizes trim, bleed, media, origin, and crop mark geometry", () => {
  const exportBox = buildExportBox({
    width: 700,
    height: 700,
    bleed: DEFAULT_EXPORT_BLEED_OPTIONS,
  })

  assert.deepEqual(roundedRect(exportBox.trim), { x: 0, y: 0, width: 700, height: 700 })
  assert.deepEqual(roundedRect(exportBox.bleed), { x: -8.504, y: -8.504, width: 717.008, height: 717.008 })
  assert.deepEqual(roundedRect(exportBox.media), { x: -28.346, y: -28.346, width: 756.693, height: 756.693 })
  assert.deepEqual({ x: round(exportBox.origin.x), y: round(exportBox.origin.y) }, { x: 28.346, y: 28.346 })
  assert.equal(exportBox.cropMarkLines.length, 8)
  assert.deepEqual(roundedLine(exportBox.cropMarkLines[0]), { x1: -28.346, y1: 0, x2: -14.173, y2: 0 })
  assert.deepEqual(roundedLine(exportBox.cropMarkLines[7]), { x1: 700, y1: 714.173, x2: 700, y2: 728.346 })
})

test("export guide clipping uses the same bleed rectangle and preserves stroked edge guides", () => {
  const exportBox = buildExportBox({
    width: 700,
    height: 700,
    bleed: DEFAULT_EXPORT_BLEED_OPTIONS,
  })
  const guideClipRect = getExportGuideClipRect(exportBox, true)

  assert.deepEqual(roundedRect(guideClipRect), roundedRect(exportBox.bleed))
  assert.equal(getExportGuideClipRect(exportBox, false), null)
  assert.deepEqual(
    roundedLine(clipExportLineToRect({ x1: -500, y1: 24, x2: 1200, y2: 24 }, guideClipRect, 0.3)),
    { x1: -8.504, y1: 24, x2: 708.504, y2: 24 },
  )
  assert.deepEqual(
    roundedLine(clipExportLineToRect({ x1: -500, y1: -8.604, x2: 1200, y2: -8.604 }, guideClipRect, 0.3)),
    { x1: -8.504, y1: -8.604, x2: 708.504, y2: -8.604 },
  )
  assert.equal(clipExportLineToRect({ x1: -500, y1: -9, x2: 1200, y2: -9 }, guideClipRect, 0.3), null)
})

test("pdf svg and idml all consume shared export box and guide clipping geometry", () => {
  const engineSource = readText("lib/export-engine.ts")
  const pdfSource = readText("lib/pdf-vector-export.ts")
  const svgSource = readText("lib/svg-vector-export.ts")
  const idmlSource = readText("lib/idml/builder.ts")

  assert.match(engineSource, /buildExportBox\(\{[\s\S]*?bleed:\s*bleedConfig/)
  assert.match(engineSource, /renderSwissGridVectorPdf\(\{[\s\S]*?exportBox,/)
  assert.match(engineSource, /renderSwissGridVectorSvg\(\{[\s\S]*?exportBox,/)
  assert.match(engineSource, /buildSwissGridIdmlPackage\(\{[\s\S]*?bleedMm:/)
  assert.match(pdfSource, /getExportGuideClipRect\(exportBox,\s*guideGroup\.clipToPage\)/)
  assert.match(svgSource, /getExportGuideClipRect\(exportBox,\s*true\)\s*\?\?\s*exportBox\.trim/)
  assert.match(idmlSource, /buildExportBox\(\{[\s\S]*?bleed:\s*documentBleed/)
  assert.match(idmlSource, /clipExportLineToRect\(line,\s*guideClipRect,\s*guideGroup\.strokeWidth\)/)
})
