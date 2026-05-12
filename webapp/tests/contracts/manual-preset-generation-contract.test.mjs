import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const MANUAL_GENERATOR_PATH = path.join(ROOT, "scripts", "generate-manual-preset.mjs")
const MANUAL_PRESET_PATH = path.join(ROOT, "lib", "presets", "data", "100 Swiss Grid Generator Manual.json")
const PRESET_MANIFEST_PATH = path.join(ROOT, "lib", "presets", "generated-manifest.ts")

function readManifestEntries() {
  const manifestSource = fs.readFileSync(PRESET_MANIFEST_PATH, "utf8")
  return Array.from(
    manifestSource.matchAll(/path: "([^"]+)",\n\s+sourceJson: "((?:\\.|[^"\\])*)"/g),
    (match) => ({
      path: match[1],
      sourceJson: JSON.parse(`"${match[2]}"`),
    }),
  )
}

function readMinifiedPresetJson(entryPath) {
  const presetPath = path.join(ROOT, "lib", "presets", entryPath)
  return JSON.stringify(JSON.parse(fs.readFileSync(presetPath, "utf8")))
}

test("manual preset generation preserves exportedAt across routine regeneration", () => {
  const generatorSource = fs.readFileSync(MANUAL_GENERATOR_PATH, "utf8")
  const manualPreset = JSON.parse(fs.readFileSync(MANUAL_PRESET_PATH, "utf8"))

  assert.match(generatorSource, /async function readExistingExportedAt\(\)/)
  assert.match(generatorSource, /const exportedAt = await readExistingExportedAt\(\)/)
  assert.doesNotMatch(generatorSource, /exportedAt:\s*new Date\(/)
  assert.doesNotMatch(generatorSource, /new Date\(\)\.toISOString\(\)/)
  assert.equal(typeof manualPreset.exportedAt, "string")
  assert.ok(Number.isFinite(Date.parse(manualPreset.exportedAt)), "manual preset exportedAt should be a valid date")
})

test("manual preset exportedAt matches the generated manifest entry", () => {
  const manualPreset = JSON.parse(fs.readFileSync(MANUAL_PRESET_PATH, "utf8"))
  const manualManifestEntry = readManifestEntries()
    .find((entry) => entry.path === "./data/100 Swiss Grid Generator Manual.json")

  assert.ok(manualManifestEntry, "Expected manual preset to be present in generated manifest")
  assert.equal(JSON.parse(manualManifestEntry.sourceJson).exportedAt, manualPreset.exportedAt)
})

test("generated preset manifest order and embedded source stay deterministic", () => {
  const entries = readManifestEntries()
  const paths = entries.map((entry) => entry.path)

  assert.deepEqual(paths, [...paths].sort((a, b) => a.localeCompare(b)))
  for (const entry of entries) {
    assert.equal(entry.sourceJson, readMinifiedPresetJson(entry.path), `${entry.path} should match minified preset JSON`)
  }
})
