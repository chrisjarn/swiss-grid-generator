import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readSource(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

function collectImportedSpecifiers(source) {
  return Array.from(source.matchAll(/^\s*import(?:[\s\S]*?)from\s+["']([^"']+)["']/gm), (match) => match[1])
}

test("GridPreview remains a preview orchestrator, not an export engine entry point", () => {
  const imports = collectImportedSpecifiers(readSource("gui/preview/GridPreview.tsx"))
  const forbidden = imports.filter((specifier) => (
    /pdf|svg|idml|export-engine|project-export-runner|vector-export/i.test(specifier)
  ))

  assert.deepEqual(forbidden, [])
})

test("useShellModel delegates export, cloud sync, and keyboard ownership to shell hooks", () => {
  const source = readSource("gui/shell/useShellModel.tsx")
  const imports = collectImportedSpecifiers(source)

  assert.match(source, /useExportActions/)
  assert.match(source, /useCloudProjectSync/)
  assert.match(source, /useShellKeyboardShortcuts/)
  assert.ok(imports.includes("@/gui/shell/hooks/useExportActions"))
  assert.ok(imports.includes("@/gui/shell/hooks/useCloudProjectSync"))
  assert.ok(imports.includes("@/gui/shell/hooks/useShellKeyboardShortcuts"))

  const forbiddenDirectExports = imports.filter((specifier) => (
    /pdf-vector-export|svg-vector-export|idml|export-engine|project-export-runner/i.test(specifier)
  ))
  assert.deepEqual(forbiddenDirectExports, [])
})
