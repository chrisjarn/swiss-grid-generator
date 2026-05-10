import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUTPUT_DIR = path.join(ROOT, "tests", "fixtures")
const SOURCE_PATH = path.join(OUTPUT_DIR, "performance-100-pages.json")
const PERFORMANCE_OUTPUT_PATH = path.join(OUTPUT_DIR, "performance-1000-pages.json")
const STATIC_TEXT_OUTPUT_PATH = path.join(OUTPUT_DIR, "performance-1000-pages-static-text.json")

const TARGET_PAGE_COUNT = 1000
const PERFORMANCE_LOREM_PLACEHOLDER_TEXT = "\u00fclacegolder <%lorem%>"
const STATIC_LOREM_TEXT = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
].join(" ")
const BASELINE_CYCLE = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28]
const RHYTHM_PROFILES = [
  {
    rhythm: "repetitive",
    rhythmRowsEnabled: false,
    rhythmRowsDirection: "ltr",
    rhythmColsEnabled: false,
    rhythmColsDirection: "btt",
  },
  {
    rhythm: "fibonacci",
    rhythmRowsEnabled: true,
    rhythmRowsDirection: "ltr",
    rhythmColsEnabled: true,
    rhythmColsDirection: "ttb",
  },
  {
    rhythm: "fibonacci",
    rhythmRowsEnabled: true,
    rhythmRowsDirection: "rtl",
    rhythmColsEnabled: true,
    rhythmColsDirection: "btt",
  },
  {
    rhythm: "golden",
    rhythmRowsEnabled: true,
    rhythmRowsDirection: "ltr",
    rhythmColsEnabled: true,
    rhythmColsDirection: "ttb",
  },
  {
    rhythm: "golden",
    rhythmRowsEnabled: true,
    rhythmRowsDirection: "rtl",
    rhythmColsEnabled: true,
    rhythmColsDirection: "btt",
  },
  {
    rhythm: "fourth",
    rhythmRowsEnabled: true,
    rhythmRowsDirection: "ltr",
    rhythmColsEnabled: false,
    rhythmColsDirection: "ttb",
  },
  {
    rhythm: "fourth",
    rhythmRowsEnabled: false,
    rhythmRowsDirection: "rtl",
    rhythmColsEnabled: true,
    rhythmColsDirection: "btt",
  },
  {
    rhythm: "fifth",
    rhythmRowsEnabled: true,
    rhythmRowsDirection: "ltr",
    rhythmColsEnabled: true,
    rhythmColsDirection: "btt",
  },
  {
    rhythm: "fifth",
    rhythmRowsEnabled: true,
    rhythmRowsDirection: "rtl",
    rhythmColsEnabled: false,
    rhythmColsDirection: "ttb",
  },
  {
    rhythm: "fifth",
    rhythmRowsEnabled: false,
    rhythmRowsDirection: "ltr",
    rhythmColsEnabled: true,
    rhythmColsDirection: "ttb",
  },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getSourcePageSerial(page) {
  const match = page.id.match(/page-performance-(\d{3,4})$/)
  if (!match) {
    throw new Error(`Unexpected performance page id: ${page.id}`)
  }
  return match[1]
}

function replaceLayoutPageSerial(previewLayout, sourceSerial, targetSerial) {
  const sourceParagraphToken = `p${sourceSerial}`
  const targetParagraphToken = `p${targetSerial}`
  const sourcePageLabel = `Page ${sourceSerial}`
  const targetPageLabel = `Page ${targetSerial}`

  return JSON.parse(
    JSON.stringify(previewLayout)
      .replaceAll(sourceParagraphToken, targetParagraphToken)
      .replaceAll(sourcePageLabel, targetPageLabel),
  )
}

function applyPerformanceLoremPlaceholder(previewLayout, pageSerial) {
  const textContent = previewLayout?.textContent
  const placeholderKey = `paragraph-p${pageSerial}-m19`
  if (!textContent || typeof textContent !== "object" || typeof textContent[placeholderKey] !== "string") {
    throw new Error(`Missing performance lorem placeholder block: ${placeholderKey}`)
  }
  textContent[placeholderKey] = PERFORMANCE_LOREM_PLACEHOLDER_TEXT
}

function buildPage(templatePage, pageIndex) {
  const pageSerial = String(pageIndex + 1).padStart(4, "0")
  const sourceSerial = getSourcePageSerial(templatePage)
  const baseline = BASELINE_CYCLE[Math.floor(pageIndex / RHYTHM_PROFILES.length) % BASELINE_CYCLE.length]
  const rhythmProfile = RHYTHM_PROFILES[pageIndex % RHYTHM_PROFILES.length]
  const uiSettings = clone(templatePage.uiSettings)

  uiSettings.customBaseline = baseline
  uiSettings.rhythm = rhythmProfile.rhythm
  uiSettings.rhythmRowsEnabled = rhythmProfile.rhythmRowsEnabled
  uiSettings.rhythmRowsDirection = rhythmProfile.rhythmRowsDirection
  uiSettings.rhythmColsEnabled = rhythmProfile.rhythmColsEnabled
  uiSettings.rhythmColsDirection = rhythmProfile.rhythmColsDirection

  const previewLayout = replaceLayoutPageSerial(templatePage.previewLayout, sourceSerial, pageSerial)
  applyPerformanceLoremPlaceholder(previewLayout, pageSerial)

  return {
    ...clone(templatePage),
    id: `page-performance-${pageSerial}`,
    name: `Performance ${pageSerial}`,
    uiSettings,
    previewLayout,
  }
}

function replaceLoremPlaceholdersWithStaticText(page) {
  const staticPage = clone(page)
  const textContent = staticPage.previewLayout?.textContent
  if (!textContent || typeof textContent !== "object") return staticPage

  for (const [key, value] of Object.entries(textContent)) {
    if (typeof value !== "string" || !value.includes("<%lorem%>")) continue
    textContent[key] = value.replaceAll("<%lorem%>", STATIC_LOREM_TEXT)
  }

  return staticPage
}

async function writeFixture(outputPath, payload) {
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  console.log(`Generated ${outputPath}`)
}

async function readFixtureExportedAt(outputPath, fallback) {
  try {
    const existing = JSON.parse(await fs.readFile(outputPath, "utf8"))
    if (typeof existing.exportedAt === "string" && existing.exportedAt.length > 0) return existing.exportedAt
  } catch {
    // Deterministic fixture generation should not fail when the output does not exist yet.
  }
  return fallback
}

async function main() {
  const source = JSON.parse(await fs.readFile(SOURCE_PATH, "utf8"))
  if (!Array.isArray(source.pages) || source.pages.length === 0) {
    throw new Error("Source performance preset must include pages[]")
  }

  const pages = Array.from({ length: TARGET_PAGE_COUNT }, (_, pageIndex) => {
    const templatePage = source.pages[pageIndex % source.pages.length]
    if (!templatePage) {
      throw new Error(`Missing template page for index ${pageIndex}`)
    }
    return buildPage(templatePage, pageIndex)
  })
  const exportedAt = await readFixtureExportedAt(
    PERFORMANCE_OUTPUT_PATH,
    typeof source.exportedAt === "string" ? source.exportedAt : "1970-01-01T00:00:00.000Z",
  )

  const placeholderPayload = {
    ...source,
    exportedAt,
    title: "Performance 1000 Pages Placeholder",
    description: "Performance test fixture with 1000 pages, 20 alternating body text/image layers per page, lorem document-variable placeholders, and systematic baseline + grid-rhythm variation across the document.",
    pages,
  }
  const staticTextPayload = {
    ...placeholderPayload,
    title: "Performance 1000 Pages Static Text",
    description: "Performance test fixture with 1000 pages, 20 alternating body text/image layers per page, static lorem text blocks, and systematic baseline + grid-rhythm variation across the document.",
    pages: pages.map(replaceLoremPlaceholdersWithStaticText),
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await writeFixture(PERFORMANCE_OUTPUT_PATH, placeholderPayload)
  await writeFixture(STATIC_TEXT_OUTPUT_PATH, staticTextPayload)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
