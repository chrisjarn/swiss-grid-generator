import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import { unzipSync, strFromU8 } from "fflate"

import { buildPlannedProjectPageExportSource } from "../lib/planned-page-export-source.ts"
import { runProjectExport } from "../lib/project-export-runner.ts"
import {
  convertOpenTypeCommandsToGeometryPaths,
  preloadTextPlanOutlineFonts,
  resolveTextPlanVectorShapes,
  transformOpenTypeCommandsToCubicCommands,
} from "../lib/vector-text-outline.ts"

const ROOT = process.cwd()
const PUBLIC_ROOT = path.join(ROOT, "public")
const DEFAULT_VISIBILITY = {
  showBaselines: true,
  showModules: true,
  showMargins: true,
  showImagePlaceholders: true,
  showTypography: true,
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

function isNumberToken(token) {
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(token)
}

function assertClose(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`,
  )
}

function assertPointClose(actual, expected, tolerance, label) {
  assertClose(actual.x, expected.x, tolerance, `${label}.x`)
  assertClose(actual.y, expected.y, tolerance, `${label}.y`)
}

function assertCommandsClose(actual, expected, tolerance, label) {
  assert.equal(actual.length, expected.length, `${label} command count`)
  for (const [index, expectedCommand] of expected.entries()) {
    const actualCommand = actual[index]
    assert.equal(actualCommand.type, expectedCommand.type, `${label}[${index}] type`)
    if (expectedCommand.type === "Z") continue
    assertClose(actualCommand.x, expectedCommand.x, tolerance, `${label}[${index}].x`)
    assertClose(actualCommand.y, expectedCommand.y, tolerance, `${label}[${index}].y`)
    if (expectedCommand.type === "C") {
      assertClose(actualCommand.x1, expectedCommand.x1, tolerance, `${label}[${index}].x1`)
      assertClose(actualCommand.y1, expectedCommand.y1, tolerance, `${label}[${index}].y1`)
      assertClose(actualCommand.x2, expectedCommand.x2, tolerance, `${label}[${index}].x2`)
      assertClose(actualCommand.y2, expectedCommand.y2, tolerance, `${label}[${index}].y2`)
    } else if (expectedCommand.type === "Q") {
      assertClose(actualCommand.x1, expectedCommand.x1, tolerance, `${label}[${index}].x1`)
      assertClose(actualCommand.y1, expectedCommand.y1, tolerance, `${label}[${index}].y1`)
    }
  }
}

function extractPdfFlateStreams(bytes) {
  const source = Buffer.from(bytes).toString("latin1")
  const streams = []
  const streamPattern = /<<(?:.|\n|\r)*?\/Filter \/FlateDecode(?:.|\n|\r)*?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g
  for (const match of source.matchAll(streamPattern)) {
    try {
      streams.push(zlib.inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"))
    } catch {
      // Non-page streams, such as binary color profiles, are irrelevant for geometry checks.
    }
  }
  return streams
}

function parsePdfFilledPaths(bytes) {
  const paths = []
  const tokens = extractPdfFlateStreams(bytes).join("\n").match(/\[[^\]]*\]|\/[^\s]+|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?|[A-Za-z*]+/g) ?? []
  let stack = []
  let currentPath = []
  const resetOperands = () => {
    stack = []
  }

  for (const token of tokens) {
    if (isNumberToken(token)) {
      stack.push(Number(token))
      continue
    }

    switch (token) {
      case "m": {
        if (stack.length < 2) {
          resetOperands()
          break
        }
        const y = stack.pop()
        const x = stack.pop()
        currentPath.push({ type: "M", x, y })
        resetOperands()
        break
      }
      case "l": {
        if (stack.length < 2) {
          resetOperands()
          break
        }
        const y = stack.pop()
        const x = stack.pop()
        currentPath.push({ type: "L", x, y })
        resetOperands()
        break
      }
      case "c": {
        if (stack.length < 6) {
          resetOperands()
          break
        }
        const y = stack.pop()
        const x = stack.pop()
        const y2 = stack.pop()
        const x2 = stack.pop()
        const y1 = stack.pop()
        const x1 = stack.pop()
        currentPath.push({ type: "C", x1, y1, x2, y2, x, y })
        resetOperands()
        break
      }
      case "h":
        currentPath.push({ type: "Z" })
        resetOperands()
        break
      case "f":
      case "f*":
        if (currentPath.length > 0) {
          paths.push(currentPath)
          currentPath = []
        }
        resetOperands()
        break
      case "S":
      case "s":
      case "n":
        currentPath = []
        resetOperands()
        break
      default:
        resetOperands()
        break
    }
  }

  return paths
}

function parseSvgPathData(pathData) {
  const tokens = pathData.match(/[MLCQZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []
  const commands = []
  let index = 0
  const readNumber = () => Number(tokens[index++])

  while (index < tokens.length) {
    const type = tokens[index++].toUpperCase()
    if (type === "M" || type === "L") {
      commands.push({ type, x: readNumber(), y: readNumber() })
    } else if (type === "C") {
      commands.push({
        type,
        x1: readNumber(),
        y1: readNumber(),
        x2: readNumber(),
        y2: readNumber(),
        x: readNumber(),
        y: readNumber(),
      })
    } else if (type === "Q") {
      commands.push({
        type,
        x1: readNumber(),
        y1: readNumber(),
        x: readNumber(),
        y: readNumber(),
      })
    } else if (type === "Z") {
      commands.push({ type })
    } else {
      throw new Error(`Unsupported SVG path command ${type}`)
    }
  }

  return commands
}

function parsePoint(value) {
  const [x, y] = value.split(/\s+/).map(Number)
  return { x, y }
}

function parseFirstIdmlGlyphGeometryPath(spreadXml) {
  const firstGlyphIndex = spreadXml.indexOf('Self="sggGlyph_001_0001"')
  assert.ok(firstGlyphIndex >= 0, "IDML spread should include the first planned glyph polygon")
  const glyphXml = spreadXml.slice(firstGlyphIndex)
  const firstGeometryMatch = glyphXml.match(/<GeometryPathType\b[^>]*><PathPointArray>([\s\S]*?)<\/PathPointArray><\/GeometryPathType>/)
  assert.ok(firstGeometryMatch, "IDML glyph polygon should include path geometry")
  const pointPattern = /<PathPointType Anchor="([^"]+)" LeftDirection="([^"]+)" RightDirection="([^"]+)" \/>/g
  return Array.from(firstGeometryMatch[1].matchAll(pointPattern), (match) => ({
    anchor: parsePoint(match[1]),
    left: parsePoint(match[2]),
    right: parsePoint(match[3]),
  }))
}

function findMatchingPdfPath(pdfPaths, expectedPdfCommands) {
  return pdfPaths.find((pathCommands) => {
    if (pathCommands.length !== expectedPdfCommands.length) return false
    const firstActual = pathCommands[0]
    const firstExpected = expectedPdfCommands[0]
    return firstActual?.type === "M"
      && firstExpected?.type === "M"
      && Math.abs(firstActual.x - firstExpected.x) <= 0.0001
      && Math.abs(firstActual.y - firstExpected.y) <= 0.0001
  })
}

test("PDF SVG and IDML serialize typography from the same planned outline coordinates", async () => {
  installLocalAssetFetch()
  const project = JSON.parse(readText("tests/fixtures/150 Fonts.json"))
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
    baseName: "geometry-parity-fixture",
    pageNumbers: [1],
    visibilitySettings: DEFAULT_VISIBILITY,
    svgPackaging: "files",
    idmlCompressionLevel: 0,
  })
  const plannedPage = buildPlannedProjectPageExportSource(result.selectedSources[0])
  const textPlan = plannedPage.exportPlan.textPlans[0]
  await preloadTextPlanOutlineFonts([textPlan])
  const { outlineShapes, fallbackTextShapes } = await resolveTextPlanVectorShapes(textPlan)
  assert.equal(fallbackTextShapes.length, 0)
  const sourceShape = outlineShapes[0]
  assert.ok(sourceShape?.commands.length > 0)

  const pdfOutput = result.outputs.find((output) => output.format === "pdf")
  const svgOutput = result.outputs.find((output) => output.format === "svg")
  const idmlOutput = result.outputs.find((output) => output.format === "idml")
  assert.ok(pdfOutput?.bytes.byteLength > 0)
  assert.equal(svgOutput?.packaging, "files")
  assert.ok(idmlOutput?.bytes.byteLength > 0)

  const expectedPdfCommands = transformOpenTypeCommandsToCubicCommands(
    sourceShape.commands,
    (point) => ({ x: point.x, y: plannedPage.exportPlan.pageHeight - point.y }),
  )
  const matchingPdfPath = findMatchingPdfPath(parsePdfFilledPaths(pdfOutput.bytes), expectedPdfCommands)
  assert.ok(matchingPdfPath, "PDF should contain the planned first glyph outline path")
  assertCommandsClose(matchingPdfPath, expectedPdfCommands, 0.0001, "pdf outline")

  const svg = svgOutput.files[0].text
  const textGroupPattern = new RegExp(`<g id="text-${textPlan.key}"[^>]*data-text-rendering="glyph-outline"[^>]*>([\\s\\S]*?)<\\/g>`)
  const textGroupMatch = svg.match(textGroupPattern)
  assert.ok(textGroupMatch, "SVG should contain the planned text group")
  const firstSvgPathMatch = textGroupMatch[1].match(/<path d="([^"]+)"/)
  assert.ok(firstSvgPathMatch, "SVG text group should contain an outline path")
  assertCommandsClose(parseSvgPathData(firstSvgPathMatch[1]), sourceShape.commands, 0.001, "svg outline")

  const idmlFiles = unzipSync(idmlOutput.bytes)
  const spread = strFromU8(idmlFiles["Spreads/Spread_001.xml"])
  const expectedGeometryPath = convertOpenTypeCommandsToGeometryPaths(sourceShape.commands)[0]
  const idmlGeometryPath = parseFirstIdmlGlyphGeometryPath(spread)
  assert.equal(idmlGeometryPath.length, expectedGeometryPath.points.length, "idml point count")
  for (const [index, expectedPoint] of expectedGeometryPath.points.entries()) {
    const actualPoint = idmlGeometryPath[index]
    assertPointClose(actualPoint.anchor, expectedPoint.anchor, 0.001, `idml point ${index}.anchor`)
    assertPointClose(actualPoint.left, expectedPoint.left, 0.001, `idml point ${index}.left`)
    assertPointClose(actualPoint.right, expectedPoint.right, 0.001, `idml point ${index}.right`)
  }
})
