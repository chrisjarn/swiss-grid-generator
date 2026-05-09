import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { runProjectExport } from "@/lib/project-export-runner"
import {
  DEFAULT_EXPORT_BLEED_OPTIONS,
  EXPORT_VECTOR_FORMATS,
  normalizeExportBleedOptions,
} from "@/lib/export-format-options"

const WEBAPP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC_ROOT = path.join(WEBAPP_ROOT, "public")
const DEFAULT_OUT_DIR = path.resolve(WEBAPP_ROOT, "..", "tmp", "export-debug")
const DEFAULT_VISIBILITY = {
  showBaselines: true,
  showModules: true,
  showMargins: true,
  showImagePlaceholders: true,
  showTypography: true,
}
const DEFAULT_LOG_EVERY = 25

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

function readArgs(argv) {
  const args = new Map()
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index]
    if (!entry.startsWith("--")) continue
    const key = entry.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith("--")) {
      args.set(key, "true")
      continue
    }
    args.set(key, next)
    index += 1
  }
  return args
}

function usage() {
  return [
    "Usage:",
    "  npm run export -- --layout tests/fixtures/performance-1000-pages-placeholder.json --range 1-1000",
    "  npm run export -- --layout tests/fixtures/performance-1000-pages-placeholder.json --range 1,5-10 --format pdf,svg,idml --out ../tmp/export-debug",
    "",
    "Options:",
    "  --layout   Path to a Swiss Grid Generator layout JSON.",
    "  --range    1-based page range. Supports comma lists and spans. Default: all pages.",
    "  --format   Comma-separated formats: pdf, svg, idml. Omit to run planning only.",
    `  --bleed-mm Optional vector bleed width in millimeters. Default: ${DEFAULT_EXPORT_BLEED_OPTIONS.widthMm}.`,
    "  --idml-compression-level Optional IDML ZIP compression level 0-9. Default: production fast level.",
    "  --out      Output directory for generated formats. Default: ../tmp/export-debug.",
    "  --log-every  Progress interval in pages. Default: 25.",
  ].join("\n")
}

function parseFormats(value) {
  if (value === undefined) return []
  const formats = String(value)
    .split(",")
    .map((format) => format.trim().toLowerCase())
    .filter(Boolean)
  const invalid = formats.filter((format) => !EXPORT_VECTOR_FORMATS.includes(format))
  if (invalid.length > 0) throw new Error(`Unsupported format: ${invalid.join(", ")}`)
  return [...new Set(formats)]
}

function parsePageNumbers(value, pageCount) {
  if (!value || value === "all") {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const pageNumbers = new Set()
  for (const part of String(value).split(",")) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^(\d+)(?:-(\d+))?$/)
    if (!match) throw new Error(`Invalid page range part: ${trimmed}`)
    const from = Number(match[1])
    const to = Number(match[2] ?? match[1])
    const start = Math.min(from, to)
    const end = Math.max(from, to)
    for (let page = start; page <= end; page += 1) {
      if (page < 1 || page > pageCount) {
        throw new Error(`Page ${page} is outside the document range 1-${pageCount}`)
      }
      pageNumbers.add(page)
    }
  }

  return [...pageNumbers].sort((left, right) => left - right)
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseNonNegativeNumber(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parseOptionalCompressionLevel(value) {
  if (value === undefined) return undefined
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9) {
    throw new Error("--idml-compression-level must be an integer from 0 to 9")
  }
  return parsed
}

function createLogger() {
  const start = performance.now()
  return (message) => {
    const seconds = ((performance.now() - start) / 1000).toFixed(1).padStart(6, " ")
    console.log(`[+${seconds}s] ${message}`)
  }
}

function shouldLogPage(completed, total, interval) {
  return completed === 1 || completed === total || completed % interval === 0
}

function normalizeFilenameSegment(value) {
  const normalized = String(value || "export")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized || "export"
}

function getProjectMetadata(project) {
  const metadata = project.metadata && typeof project.metadata === "object" ? project.metadata : project
  return {
    title: String(metadata.title ?? "").trim(),
    description: String(metadata.description ?? metadata.subject ?? "").trim(),
    author: String(metadata.author ?? "").trim(),
    createdAt: typeof metadata.createdAt === "string" ? metadata.createdAt : "",
  }
}

function buildMetadata(project, layoutPath) {
  const fileBase = path.basename(layoutPath, path.extname(layoutPath))
  const metadata = getProjectMetadata(project)
  return {
    title: metadata.title || fileBase,
    description: metadata.description,
    author: metadata.author,
    createdAt: metadata.createdAt,
  }
}

async function main() {
  installLocalAssetFetch()
  const args = readArgs(process.argv.slice(2))
  const layoutArg = args.get("layout")
  if (!layoutArg) {
    console.error(usage())
    process.exitCode = 1
    return
  }

  const layoutPath = path.resolve(process.cwd(), layoutArg)
  const outDir = path.resolve(process.cwd(), args.get("out") || DEFAULT_OUT_DIR)
  const project = JSON.parse(await fs.promises.readFile(layoutPath, "utf8"))
  if (!Array.isArray(project.pages) || project.pages.length === 0) {
    throw new Error("Layout JSON does not contain project pages")
  }

  const formats = parseFormats(args.get("format"))
  const planningOnly = formats.length === 0
  const pageNumbers = parsePageNumbers(args.get("range"), project.pages.length)
  const logEvery = parsePositiveInteger(args.get("log-every"), DEFAULT_LOG_EVERY)
  const bleed = normalizeExportBleedOptions({
    enabled: args.has("bleed-mm") ? true : DEFAULT_EXPORT_BLEED_OPTIONS.enabled,
    widthMm: parseNonNegativeNumber(args.get("bleed-mm"), DEFAULT_EXPORT_BLEED_OPTIONS.widthMm),
    fallbackWidthMm: DEFAULT_EXPORT_BLEED_OPTIONS.widthMm,
  })
  const idmlCompressionLevel = parseOptionalCompressionLevel(args.get("idml-compression-level"))
  const log = createLogger()
  const metadata = buildMetadata(project, layoutPath)
  const baseName = normalizeFilenameSegment(metadata.title || path.basename(layoutPath, path.extname(layoutPath)))
  log(`layout: ${layoutPath}`)
  if (!planningOnly) log(`output: ${outDir}`)
  log(planningOnly ? "mode: planning only" : `formats: ${formats.join(", ")}`)
  log(`bleed: ${bleed.enabled ? `${bleed.widthMm} mm` : "off"}`)
  if (formats.includes("idml")) {
    log(`idml compression: ${idmlCompressionLevel ?? "production default"}`)
  }
  log(`pages: ${pageNumbers.length} selected from ${project.pages.length}`)

  if (!planningOnly) {
    await fs.promises.mkdir(outDir, { recursive: true })
  }

  const totalStartedAt = performance.now()
  const result = await runProjectExport({
    project,
    formats,
    metadata,
    baseName,
    pageNumbers,
    visibilitySettings: DEFAULT_VISIBILITY,
    bleed,
    idmlCompressionLevel,
    svgPackaging: "files",
    onLog: log,
    shouldLogPage: (completed, total) => shouldLogPage(completed, total, logEvery),
  })

  if (!planningOnly) {
    for (const output of result.outputs) {
      if (output.format === "svg" && output.packaging === "files") {
        const svgDir = path.join(outDir, output.directoryName)
        const startedAt = performance.now()
        await fs.promises.mkdir(svgDir, { recursive: true })
        for (const file of output.files) {
          await fs.promises.writeFile(path.join(svgDir, file.filename), file.text, "utf8")
        }
        result.timings.push({
          label: "svg write files",
          durationMs: performance.now() - startedAt,
          extra: `files=${output.files.length}`,
        })
        log(`svg: done ${svgDir}`)
        continue
      }
      const outputPath = path.join(outDir, output.filename)
      const startedAt = performance.now()
      await fs.promises.writeFile(outputPath, Buffer.from(output.bytes))
      const stat = await fs.promises.stat(outputPath)
      result.timings.push({
        label: `${output.format} write`,
        durationMs: performance.now() - startedAt,
        extra: `size=${(stat.size / 1024 / 1024).toFixed(2)}MB`,
      })
      log(`${output.format}: done ${outputPath}`)
    }
  }

  log("performance summary:")
  for (const entry of result.timings) {
    const seconds = (entry.durationMs / 1000).toFixed(2).padStart(7, " ")
    log(`  ${entry.label.padEnd(22)} ${seconds}s${entry.extra ? ` ${entry.extra}` : ""}`)
  }
  log(`  ${"total".padEnd(22)} ${((performance.now() - totalStartedAt) / 1000).toFixed(2).padStart(7, " ")}s`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exitCode = 1
})
