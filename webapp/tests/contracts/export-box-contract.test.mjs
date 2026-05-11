import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { unzipSync, strFromU8 } from "fflate"

import {
  buildExportBox,
  clipExportLineToRect,
  getExportGuideClipRect,
} from "../../lib/export-box.ts"
import { DEFAULT_EXPORT_BLEED_OPTIONS } from "../../lib/export-format-options.ts"
import { runProjectExport } from "../../lib/project-export-runner.ts"

const ROOT = process.cwd()
const PUBLIC_ROOT = path.join(ROOT, "public")
const DEFAULT_VISIBILITY = {
  showBaselines: true,
  showModules: true,
  showMargins: true,
  showImagePlaceholders: true,
  showTypography: true,
}

const ENABLED_3MM_BLEED = {
  ...DEFAULT_EXPORT_BLEED_OPTIONS,
  enabled: true,
}

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

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

function formatExportNumber(value) {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value * 1000) / 1000
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "")
}

function svgLineMarkup(line) {
  return `<line x1="${formatExportNumber(line.x1)}" y1="${formatExportNumber(line.y1)}" x2="${formatExportNumber(line.x2)}" y2="${formatExportNumber(line.y2)}" />`
}

function idmlAnchorMarkup(x, y) {
  const point = `${formatExportNumber(x)} ${formatExportNumber(y)}`
  return `Anchor="${point}" LeftDirection="${point}" RightDirection="${point}"`
}

test("export box centralizes trim, bleed, media, origin, and crop mark geometry", () => {
  const exportBox = buildExportBox({
    width: 700,
    height: 700,
    bleed: ENABLED_3MM_BLEED,
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
    bleed: ENABLED_3MM_BLEED,
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
  const svgPageSetSource = readText("lib/svg-page-set-export.ts")
  const idmlSource = readText("lib/idml/builder.ts")

  assert.match(engineSource, /buildExportBox\(\{[\s\S]*?bleed:\s*bleedConfig/)
  assert.match(engineSource, /renderSwissGridVectorPdf\(\{[\s\S]*?exportBox,/)
  assert.match(svgPageSetSource, /renderSwissGridVectorSvg\(\{[\s\S]*?exportBox,/)
  assert.match(engineSource, /packageIdml\(options,\s*plannedPages,\s*pageSets/)
  assert.match(pdfSource, /getExportGuideClipRect\(exportBox,\s*guideGroup\.clipToPage\)/)
  assert.match(svgSource, /getExportGuideClipRect\(exportBox,\s*true\)\s*\?\?\s*exportBox\.trim/)
  assert.match(idmlSource, /buildExportBox\(\{[\s\S]*?bleed:\s*documentBleed/)
  assert.match(idmlSource, /clipExportLineToRect\(line,\s*guideClipRect,\s*guideGroup\.strokeWidth\)/)
})

test("real export fixture keeps shared box geometry, page identity, and metadata across outputs", async () => {
  installLocalAssetFetch()
  const project = JSON.parse(readText("tests/fixtures/110 Square Poster Example.json"))
  const metadata = {
    title: project.title,
    description: project.description,
    author: project.author,
    createdAt: project.createdAt,
  }

  const result = await runProjectExport({
    project,
    formats: ["pdf", "svg", "idml"],
    metadata,
    baseName: "export-parity-fixture",
    pageNumbers: [1],
    visibilitySettings: DEFAULT_VISIBILITY,
    bleed: ENABLED_3MM_BLEED,
    svgPackaging: "files",
    idmlCompressionLevel: 0,
  })

  const source = result.selectedSources[0]
  const exportBox = buildExportBox({
    width: source.result.pageSizePt.width,
    height: source.result.pageSizePt.height,
    bleed: ENABLED_3MM_BLEED,
  })
  const pdfOutput = result.outputs.find((output) => output.format === "pdf")
  const svgOutput = result.outputs.find((output) => output.format === "svg")
  const idmlOutput = result.outputs.find((output) => output.format === "idml")
  assert.ok(pdfOutput?.bytes.byteLength > 0)
  assert.equal(svgOutput?.packaging, "files")
  assert.ok(idmlOutput?.bytes.byteLength > 0)
  assert.deepEqual(result.selectedPageNumbers, [1])
  assert.deepEqual(result.selectedPhysicalPageNumbers, [1])

  const svg = svgOutput.files[0].text
  assert.match(svg, /<title id="title">Square Poster Example - Page 1<\/title>/)
  assert.match(svg, /<dc:creator><rdf:Seq><rdf:li>Swiss Grid Generator<\/rdf:li><\/rdf:Seq><\/dc:creator>/)
  assert.ok(svg.includes(
    `viewBox="${formatExportNumber(exportBox.media.x)} ${formatExportNumber(exportBox.media.y)} ${formatExportNumber(exportBox.media.width)} ${formatExportNumber(exportBox.media.height)}"`,
  ))
  assert.ok(svg.includes(
    `<rect x="${formatExportNumber(exportBox.media.x)}" y="${formatExportNumber(exportBox.media.y)}" width="${formatExportNumber(exportBox.media.width)}" height="${formatExportNumber(exportBox.media.height)}" fill="#ffffff" />`,
  ))
  assert.ok(svg.includes(
    `<clipPath id="swiss-page-clip"><rect x="${formatExportNumber(exportBox.bleed.x)}" y="${formatExportNumber(exportBox.bleed.y)}" width="${formatExportNumber(exportBox.bleed.width)}" height="${formatExportNumber(exportBox.bleed.height)}" /></clipPath>`,
  ))
  assert.ok(svg.includes(svgLineMarkup(exportBox.cropMarkLines[0])))

  const idmlFiles = unzipSync(idmlOutput.bytes)
  const designmap = strFromU8(idmlFiles["designmap.xml"])
  const metadataXml = strFromU8(idmlFiles["META-INF/metadata.xml"])
  const spread = strFromU8(idmlFiles["Spreads/Spread_001.xml"])
  assert.match(designmap, /<Section Self="sggSection" Length="1"[\s\S]*?PageNumberStart="1" PageStart="sggPage001"/)
  assert.match(metadataXml, /<dc:title><rdf:Alt><rdf:li xml:lang="x-default">Square Poster Example<\/rdf:li><\/rdf:Alt><\/dc:title>/)
  assert.match(metadataXml, /<dc:creator><rdf:Seq><rdf:li>Swiss Grid Generator<\/rdf:li><\/rdf:Seq><\/dc:creator>/)
  assert.ok(spread.includes(
    `Name="Export Canvas" ItemLayer="sggLayerPlaceholders" ItemTransform="1 0 0 1 0 ${formatExportNumber(-source.result.pageSizePt.height / 2)}" Visible="true" FillColor="Color/Paper"`,
  ))
  assert.ok(spread.includes(idmlAnchorMarkup(exportBox.media.x, exportBox.media.y)))
  assert.ok(spread.includes(idmlAnchorMarkup(exportBox.media.x + exportBox.media.width, exportBox.media.y + exportBox.media.height)))
  assert.match(spread, /Name="Crop mark 1"[\s\S]*?PathOpen="true"/)
  assert.ok(spread.includes(idmlAnchorMarkup(exportBox.cropMarkLines[0].x1, exportBox.cropMarkLines[0].y1)))
  assert.ok(spread.includes(idmlAnchorMarkup(exportBox.cropMarkLines[0].x2, exportBox.cropMarkLines[0].y2)))

  assert.ok(result.timings.some((entry) => entry.label === "planning" && entry.extra === "pages=1"))
  assert.ok(result.timings.some((entry) => entry.label === "resolve export source pages" && entry.extra === "pages=1"))
  assert.ok(result.timings.some((entry) => entry.label === "planning buildPageExportPlan" && entry.extra.includes("pages=1")))
  assert.ok(result.timings.some((entry) => entry.label === "planning typography layout" && entry.extra.includes("pages=1")))
  assert.ok(result.timings.some((entry) => entry.label === "planning text wrapping" && entry.extra.includes("pages=1")))
  assert.ok(result.timings.some((entry) => entry.label === "planning font metric lookup" && entry.extra.includes("pages=1")))
  assert.ok(result.timings.some((entry) => entry.label === "planning image plans" && entry.extra.includes("pages=1")))
  assert.ok(result.timings.some((entry) => entry.label === "planning guide plans" && entry.extra.includes("pages=1")))
  assert.ok(result.timings.some((entry) => entry.label === "pdf render pages" && entry.extra === "pages=1"))
  assert.ok(result.timings.some((entry) => entry.label === "svg render pages" && entry.extra === "pages=1"))
  assert.ok(result.timings.some((entry) => entry.label === "idml render page sets" && entry.extra === "sets=1"))
})
