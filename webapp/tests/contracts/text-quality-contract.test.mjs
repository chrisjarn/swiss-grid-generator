import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const PRODUCT_TEXT_FILES = [
  "messages/en.json",
  "messages/en/content/help.md",
  "messages/en/content/tooltips.md",
  "messages/en/content/manual.md",
  "lib/generated-help-content.ts",
  "lib/generated-tooltip-content.ts",
]

const PRESET_METADATA_FILES = [
  "lib/presets/data/000 Poster Template portrait 4x5 12pt.json",
  "lib/presets/data/010 Book Template - Van de Graaf 4x5 12pt.json",
  "lib/presets/data/100 Swiss Grid Generator Manual.json",
  "lib/presets/data/110 Square Poster Example.json",
  "lib/presets/data/120 Swiss Style Poster Example 001.json",
  "lib/presets/data/130 Classic Poster Lookalike.json",
  "lib/presets/data/140 Classic Book Cover Lookalike.json",
]

const CASUAL_OR_MARKETING_PATTERNS = [
  /\bawesome\b/i,
  /\bamazing\b/i,
  /\bbeautiful\b/i,
  /\beasy\b/i,
  /\bgreat\b/i,
  /\bjust\b/i,
  /\bnothing here\b/i,
  /\boops\b/i,
  /\bplease\b/i,
  /\bseamless\b/i,
  /\bsimply\b/i,
  /\bstunning\b/i,
  /\bsuccessfully\b/i,
  /\btry again\b/i,
  /\byour\b/i,
]

const APPROVED_UPPERCASE_STARTS = [
  "A0",
  "A4",
  "ANSI",
  "Besley",
  "Bodoni Moda",
  "CALCULATIONS.md",
  "DIN",
  "EB Garamond",
  "FEATURES.md",
  "IBM Plex Mono",
  "IBM Plex Sans",
  "IDML",
  "InDesign",
  "Inter",
  "JSON",
  "Jost",
  "Libre Baskerville",
  "Noto Sans Symbols 2",
  "PDF",
  "SETTINGS.md",
  "SVG",
  "Space Grotesk",
  "Supabase",
  "Swiss Grid Generator",
  "Work Sans",
]

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

function listFiles(dir, predicate) {
  const absoluteDir = path.join(ROOT, dir)
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(relPath, predicate)
    return predicate(relPath) ? [relPath] : []
  })
}

function collectJsonStrings(value, source, pointer = "$") {
  if (typeof value === "string") return [{ source, pointer, value }]
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectJsonStrings(entry, source, `${pointer}[${index}]`))
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => collectJsonStrings(entry, source, `${pointer}.${key}`))
  }
  return []
}

function collectMarkdownLines(relPath) {
  return readText(relPath)
    .split("\n")
    .map((line, index) => ({ source: relPath, pointer: `line ${index + 1}`, value: line.trim() }))
    .filter((entry) => entry.value.length > 0)
}

function collectPresetMetadataStrings(relPath) {
  const preset = JSON.parse(readText(relPath))
  const entries = []
  for (const key of ["title", "description"]) {
    if (typeof preset[key] === "string") {
      entries.push({ source: relPath, pointer: `$.${key}`, value: preset[key] })
    }
  }
  for (const [index, page] of (preset.pages ?? []).entries()) {
    if (typeof page.name === "string") {
      entries.push({ source: relPath, pointer: `$.pages[${index}].name`, value: page.name })
    }
  }
  if (relPath.includes("100 Swiss Grid Generator Manual.json")) {
    for (const [pageIndex, page] of (preset.pages ?? []).entries()) {
      for (const [key, value] of Object.entries(page.previewLayout?.textContent ?? {})) {
        entries.push({ source: relPath, pointer: `$.pages[${pageIndex}].previewLayout.textContent.${key}`, value })
      }
    }
  }
  return entries
}

function stripInlineSyntax(value) {
  return value
    .replace(/\{\{[A-Z_]+\}\}/g, "")
    .replace(/<%[a-z_]+%>/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
}

function sentenceFragments(value) {
  return stripInlineSyntax(value)
    .split(/\n|(?<=[.!?])\s+/u)
    .map((fragment) => fragment
      .replace(/^#+\s*/, "")
      .replace(/^[-*]\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/^[\s"'([{]+/, "")
      .trim())
    .filter(Boolean)
}

function startsWithApprovedUppercase(fragment) {
  return APPROVED_UPPERCASE_STARTS.some((term) => fragment === term || fragment.startsWith(`${term} `) || fragment.startsWith(`${term},`))
}

function hasDisallowedUppercaseStart(value) {
  if (value.replace(/\s+/g, " ").trim() === "Swiss Grid Generator") return false
  return sentenceFragments(value).some((fragment) => {
    if (startsWithApprovedUppercase(fragment)) return false
    const firstLetter = fragment.match(/\p{L}/u)?.[0]
    return Boolean(firstLetter && firstLetter.toLocaleLowerCase("en-US") !== firstLetter)
  })
}

function isIntentionalSpecimenText(entry) {
  return entry.source.endsWith("150 Fonts.json") || entry.pointer.includes("author")
}

function formatViolation(entry, reason) {
  return `${entry.source} ${entry.pointer}: ${reason}: ${JSON.stringify(entry.value)}`
}

test("product text stays calm, lowercase, and non-marketing", () => {
  const jsonEntries = collectJsonStrings(JSON.parse(readText("messages/en.json")), "messages/en.json")
  const markdownEntries = [
    ...collectMarkdownLines("messages/en/content/help.md"),
    ...collectMarkdownLines("messages/en/content/tooltips.md"),
    ...collectMarkdownLines("messages/en/content/manual.md"),
  ]
  const presetEntries = PRESET_METADATA_FILES.flatMap(collectPresetMetadataStrings)
  const entries = [
    ...jsonEntries,
    ...markdownEntries,
    ...presetEntries,
  ].filter((entry) => !isIntentionalSpecimenText(entry))

  const violations = []
  for (const entry of entries) {
    if (entry.value.includes("!")) {
      violations.push(formatViolation(entry, "exclamation mark"))
    }
    if (/\p{Extended_Pictographic}/u.test(entry.value)) {
      violations.push(formatViolation(entry, "emoji or pictographic symbol"))
    }
    for (const pattern of CASUAL_OR_MARKETING_PATTERNS) {
      if (pattern.test(entry.value)) {
        violations.push(formatViolation(entry, `casual or marketing term ${pattern}`))
      }
    }
    if (hasDisallowedUppercaseStart(entry.value)) {
      violations.push(formatViolation(entry, "sentence starts uppercase"))
    }
  }

  assert.deepEqual(violations, [])
})

test("generated content does not reintroduce casual tone", () => {
  const violations = []
  for (const relPath of PRODUCT_TEXT_FILES.filter((entry) => entry.endsWith(".ts"))) {
    const source = readText(relPath)
    if (source.includes("!")) {
      violations.push(`${relPath}: exclamation mark`)
    }
    if (/\p{Extended_Pictographic}/u.test(source)) {
      violations.push(`${relPath}: emoji or pictographic symbol`)
    }
    for (const pattern of CASUAL_OR_MARKETING_PATTERNS) {
      if (pattern.test(source)) {
        violations.push(`${relPath}: casual or marketing term ${pattern}`)
      }
    }
  }

  assert.deepEqual(violations, [])
})

test("application code keeps message access behind the typed i18n boundary", () => {
  const sourceFiles = listFiles(".", (relPath) => /\.(ts|tsx|mjs)$/.test(relPath))
  const directImportViolations = []
  const hardcodedCapitalizationViolations = []

  for (const relPath of sourceFiles) {
    if (relPath === "lib/i18n/messages.ts" || relPath.startsWith("tests/")) continue
    const source = readText(relPath)
    if (source.includes("@/messages/en.json") || source.includes("messages/en.json")) {
      directImportViolations.push(relPath)
    }
    if (/draft(?:Vertical)?Align[\s\S]{0,120}\.toUpperCase\(/.test(source)) {
      hardcodedCapitalizationViolations.push(relPath)
    }
  }

  assert.deepEqual(directImportViolations, [])
  assert.deepEqual(hardcodedCapitalizationViolations, [])
})
