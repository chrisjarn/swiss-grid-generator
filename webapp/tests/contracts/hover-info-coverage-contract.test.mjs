import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  DOCUMENTATION_HOVER_INFO_BY_ID,
  LAYOUT_OPEN_TOOLTIP_IDS,
  LAYOUT_OPEN_TOOLTIP_ITEMS,
} from "../../gui/preview/lib/generated-tooltip-content.ts"
import { GUI_HOVER_INFO_COVERAGE } from "../../gui/hover-info/coverage.ts"

const ROOT = process.cwd()
const EXPECTED_LAYOUT_OPEN_TOOLTIP_COUNT = 36
const REQUIRED_COVERAGE_KEYS = [
  "header.presets",
  "header.import",
  "header.save",
  "header.export",
  "header.undo",
  "header.redo",
  "header.smart-text-zoom",
  "header.baselines",
  "header.margins",
  "header.modules",
  "header.typography",
  "header.image-placeholders",
  "header.layers",
  "header.account",
  "header.support-menu",
  "settings.canvas",
  "settings.baseline",
  "settings.margins",
  "settings.grid",
  "settings.typography",
  "settings.color",
  "editor.paragraph",
  "editor.typography",
  "editor.symbols",
  "editor.placeholders",
  "editor.paragraph-info",
  "editor.image-geometry",
  "editor.image-color",
  "editor.image-info",
  "preview.create-page",
  "preview.layer-affordances",
  "project.pages",
  "project.layers",
  "project.metadata",
  "project.facing-pages",
  "presets.browser",
  "presets.user-library",
  "export.dialog",
  "export.format",
  "export.visibility",
  "export.bleed",
  "export.page-range",
  "export.metadata",
  "export.progress-log",
  "account.cloud",
  "feedback.panel",
  "legal.panel",
]

function listSourceFiles(dir) {
  const absoluteDir = path.join(ROOT, dir)
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listSourceFiles(relPath)
    if (!/\.(ts|tsx)$/.test(entry.name)) return []
    if (relPath.includes("generated-tooltip-content.ts")) return []
    return [relPath]
  })
}

function collectReferencedHelpIds() {
  return listSourceFiles("gui")
    .concat(listSourceFiles("shared"))
    .flatMap((relPath) => {
      const source = fs.readFileSync(path.join(ROOT, relPath), "utf8")
      return [...source.matchAll(/\bhelpId(?:=|:)\s*["']([^"']+)["']/g)]
        .map((match) => ({ relPath, helpId: match[1] }))
    })
}

test("referenced hover help ids exist in generated documentation help content", () => {
  const missing = collectReferencedHelpIds()
    .filter(({ helpId }) => !DOCUMENTATION_HOVER_INFO_BY_ID[helpId])
    .map(({ relPath, helpId }) => `${relPath}: ${helpId}`)

  assert.deepEqual(missing, [])
})

test("layout-open tooltip rotation stays limited to the curated ids", () => {
  assert.equal(LAYOUT_OPEN_TOOLTIP_IDS.length, EXPECTED_LAYOUT_OPEN_TOOLTIP_COUNT)
  assert.equal(LAYOUT_OPEN_TOOLTIP_ITEMS.length, EXPECTED_LAYOUT_OPEN_TOOLTIP_COUNT)
  assert.deepEqual(
    LAYOUT_OPEN_TOOLTIP_ITEMS.map((item) => item.id),
    [...LAYOUT_OPEN_TOOLTIP_IDS],
  )
})

test("user-facing GUI interactions have hover-info coverage or an explicit short-only entry", () => {
  const entriesByKey = new Map(GUI_HOVER_INFO_COVERAGE.map((entry) => [entry.key, entry]))
  const missingKeys = REQUIRED_COVERAGE_KEYS.filter((key) => !entriesByKey.has(key))
  const missingHelp = GUI_HOVER_INFO_COVERAGE
    .filter((entry) => "helpId" in entry && !DOCUMENTATION_HOVER_INFO_BY_ID[entry.helpId])
    .map((entry) => `${entry.key}: ${entry.helpId}`)
  const invalidShortOnly = GUI_HOVER_INFO_COVERAGE
    .filter((entry) => "shortOnly" in entry && entry.shortOnly !== true)
    .map((entry) => entry.key)

  assert.deepEqual(missingKeys, [])
  assert.deepEqual(missingHelp, [])
  assert.deepEqual(invalidShortOnly, [])
})
