import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../..")
const documentationSourcePath = path.join(repoRoot, "DOCUMENTATION.md")
const outputPath = path.join(repoRoot, "webapp/gui/preview/lib/generated-tooltip-content.ts")
const tooltipSourceStart = "<!-- tooltip-source:start -->"
const tooltipSourceEnd = "<!-- tooltip-source:end -->"
const layoutOpenTooltipIds = [
  "tooltip-start-with-system",
  "tooltip-structure-before-styling",
  "tooltip-repetitive-reference",
  "tooltip-create-text",
  "tooltip-create-hierarchy",
  "tooltip-create-image",
  "tooltip-lorem-frame-test",
  "tooltip-drag-and-nudge",
  "tooltip-cursor-nudge",
  "tooltip-duplicate-layer",
  "tooltip-free-placement",
  "tooltip-smart-text-zoom",
  "tooltip-turbo-edit",
  "tooltip-layer-card-retarget",
  "tooltip-rendered-text-editing",
  "tooltip-placeholder-editing",
  "tooltip-rows-plus-baselines",
  "tooltip-columns-before-reflow",
  "tooltip-frame-alignment",
  "tooltip-custom-type",
  "tooltip-select-before-nudge",
  "tooltip-lock-finished-layers",
  "tooltip-page-cards",
  "tooltip-facing-pages",
  "tooltip-preview-guides",
  "tooltip-rollover-guides",
  "tooltip-documentation-link",
  "tooltip-export-readiness",
  "tooltip-export-format",
  "tooltip-export-bleed",
  "tooltip-export-visibility",
  "tooltip-export-progress",
  "tooltip-fix-loose-page",
  "tooltip-fix-weak-type",
  "tooltip-grid-reduction",
  "tooltip-faster-editing",
]

function extractTaggedSource(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker)
  if (startIndex === -1) throw new Error(`Missing marker "${startMarker}"`)
  const contentStart = startIndex + startMarker.length
  const endIndex = source.indexOf(endMarker, contentStart)
  if (endIndex === -1) throw new Error(`Missing marker "${endMarker}"`)
  return source.slice(contentStart, endIndex).trim()
}

function parseHeading(line, level) {
  const match = line.match(new RegExp(`^${"#".repeat(level)}\\s+(.+?)\\s+\\{#([A-Za-z0-9_-]+)\\}\\s*$`))
  if (!match) return null
  return {
    title: match[1].trim(),
    id: match[2],
  }
}

function flushParagraph(buffer, blocks) {
  if (buffer.length === 0) return
  blocks.push({
    type: "paragraph",
    text: buffer.join(" ").trim(),
  })
  buffer.length = 0
}

function flushList(items, blocks) {
  if (items.length === 0) return
  blocks.push({
    type: "list",
    items: [...items],
  })
  items.length = 0
}

async function main() {
  const documentationSource = await fs.readFile(documentationSourcePath, "utf8")
  const source = extractTaggedSource(documentationSource, tooltipSourceStart, tooltipSourceEnd)
  const lines = source.replace(/\r\n/g, "\n").split("\n")

  /** @type {{ title: string; topics: { id: string; title: string; blocks: any[] }[] }[]} */
  const groups = []
  let currentGroup = null
  let currentTopic = null
  let paragraphBuffer = []
  let listBuffer = []

  const finalizeTopic = () => {
    if (!currentTopic) return
    flushParagraph(paragraphBuffer, currentTopic.blocks)
    flushList(listBuffer, currentTopic.blocks)
    currentGroup?.topics.push(currentTopic)
    currentTopic = null
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "")
    if (line.startsWith("# ")) continue

    if (line.startsWith("### ")) {
      finalizeTopic()
      currentGroup = {
        title: line.slice(4).trim(),
        topics: [],
      }
      groups.push(currentGroup)
      continue
    }

    const topicHeading = parseHeading(line, 4)
    if (topicHeading) {
      finalizeTopic()
      if (!currentGroup) {
        throw new Error(`Tooltip "${topicHeading.id}" appears before any group heading`)
      }
      currentTopic = {
        ...topicHeading,
        blocks: [],
      }
      continue
    }

    const listMatch = line.match(/^- (.+)$/)
    if (listMatch) {
      if (!currentTopic) continue
      flushParagraph(paragraphBuffer, currentTopic.blocks)
      listBuffer.push(listMatch[1].trim())
      continue
    }

    if (/^\s{2,}\S/.test(rawLine) && listBuffer.length > 0) {
      listBuffer[listBuffer.length - 1] = `${listBuffer[listBuffer.length - 1]} ${rawLine.trim()}`
      continue
    }

    if (line.trim() === "") {
      if (currentTopic) {
        flushParagraph(paragraphBuffer, currentTopic.blocks)
        flushList(listBuffer, currentTopic.blocks)
      }
      continue
    }

    if (!currentTopic) continue
    flushList(listBuffer, currentTopic.blocks)
    paragraphBuffer.push(line.trim())
  }

  finalizeTopic()

  const seenIds = new Set()
  const flattenedTopics = []

  for (const group of groups) {
    for (const topic of group.topics) {
      if (seenIds.has(topic.id)) throw new Error(`Duplicate tooltip id "${topic.id}"`)
      seenIds.add(topic.id)
      flattenedTopics.push({
        id: topic.id,
        title: topic.title,
        blocks: topic.blocks,
      })
    }
  }

  const topicById = new Map(flattenedTopics.map((topic) => [topic.id, topic]))
  const layoutOpenTooltipItems = layoutOpenTooltipIds.map((id) => {
    const item = topicById.get(id)
    if (!item) throw new Error(`Layout-open tooltip id "${id}" is missing from DOCUMENTATION.md`)
    return item
  })

  const output = `/* eslint-disable */
// This file is generated by webapp/scripts/generate-tooltip-content.mjs from DOCUMENTATION.md.
// Do not edit this file directly.

export type TooltipBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }

export type DocumentationHoverInfoItem = {
  id: string
  title: string
  blocks: TooltipBlock[]
}

export type LayoutOpenTooltipItem = DocumentationHoverInfoItem

export const DOCUMENTATION_HOVER_INFO_ITEMS = ${JSON.stringify(flattenedTopics, null, 2)} as const satisfies readonly DocumentationHoverInfoItem[]

export const DOCUMENTATION_HOVER_INFO_BY_ID = Object.fromEntries(
  DOCUMENTATION_HOVER_INFO_ITEMS.map((item) => [item.id, item]),
) as Record<(typeof DOCUMENTATION_HOVER_INFO_ITEMS)[number]["id"], (typeof DOCUMENTATION_HOVER_INFO_ITEMS)[number]>

export type DocumentationHoverInfoId = keyof typeof DOCUMENTATION_HOVER_INFO_BY_ID

export const LAYOUT_OPEN_TOOLTIP_IDS = ${JSON.stringify(layoutOpenTooltipIds, null, 2)} as const

export const LAYOUT_OPEN_TOOLTIP_ITEMS = ${JSON.stringify(layoutOpenTooltipItems, null, 2)} as const satisfies readonly LayoutOpenTooltipItem[]
`

  await fs.writeFile(outputPath, output)
  process.stdout.write(`Generated tooltip content from ${path.relative(repoRoot, documentationSourcePath)}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
