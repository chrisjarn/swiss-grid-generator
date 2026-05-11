import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const CORE_ROOT = path.join(ROOT, "core")
const FORBIDDEN_ALIAS_RE = /from\s+["']@\/(?:lib|gui|app|shared)(?:\/|["'])/
const SOURCE_EXTENSIONS = new Set([".mjs", ".ts", ".tsx"])
const PROJECT_SOURCE_ROOTS = ["app", "core", "gui", "lib", "scripts", "shared", "tests", "workers"]
const MIGRATED_CORE_LIB_ALIASES = [
  "@/lib/autofit-planner",
  "@/lib/block-constraints",
  "@/lib/block-height",
  "@/lib/config/color-schemes",
  "@/lib/config/defaults",
  "@/lib/config/fonts",
  "@/lib/config/ui-defaults",
  "@/lib/default-column-span",
  "@/lib/document-defaults",
  "@/lib/document-page-numbering",
  "@/lib/document-session",
  "@/lib/document-variable-definitions",
  "@/lib/document-variable-lorem",
  "@/lib/document-variable-text",
  "@/lib/english-hyphenation",
  "@/lib/export-colors",
  "@/lib/font-file-text-metrics-engine",
  "@/lib/font-outline",
  "@/lib/grid-calculator",
  "@/lib/grid-column-layout",
  "@/lib/grid-reduction-validation",
  "@/lib/grid-rhythm",
  "@/lib/help-registry",
  "@/lib/image-placeholder-opacity",
  "@/lib/image-placeholder-plan",
  "@/lib/layer-placement",
  "@/lib/layout-engine-contract",
  "@/lib/layout-performance",
  "@/lib/optical-margin",
  "@/lib/page-export-plan",
  "@/lib/planned-page-export-source",
  "@/lib/preview-column-snap",
  "@/lib/project-page-export-source",
  "@/lib/project-tour",
  "@/lib/reflow-planner",
  "@/lib/text-block-position",
  "@/lib/text-draw-command",
  "@/lib/text-format-runs",
  "@/lib/text-layout",
  "@/lib/text-metrics-engine",
  "@/lib/text-metrics-service",
  "@/lib/text-rendering",
  "@/lib/text-tracking-runs",
  "@/lib/types/layout-primitives",
  "@/lib/types/preview-layout",
  "@/lib/typography-behavior",
  "@/lib/typography-layout-plan",
  "@/lib/ui-settings-resolver",
  "@/lib/workspace-ui-schema",
]

function listSourceFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(entryPath)
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [entryPath] : []
  })
}

test("core modules do not import legacy app, gui, shared, or lib modules", () => {
  const offenders = listSourceFiles(CORE_ROOT).filter((filePath) => (
    FORBIDDEN_ALIAS_RE.test(fs.readFileSync(filePath, "utf8"))
  ))

  assert.deepEqual(offenders.map((filePath) => path.relative(ROOT, filePath)), [])
})

test("migrated core modules are not imported through legacy lib aliases", () => {
  const sourceFiles = PROJECT_SOURCE_ROOTS
    .map((sourceRoot) => path.join(ROOT, sourceRoot))
    .filter((sourceRoot) => fs.existsSync(sourceRoot))
    .flatMap(listSourceFiles)

  const offenders = []
  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, "utf8")
    for (const alias of MIGRATED_CORE_LIB_ALIASES) {
      const importPattern = new RegExp(`from\\s+["']${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:["'/])`)
      if (importPattern.test(source)) {
        offenders.push(`${path.relative(ROOT, filePath)} imports ${alias}`)
      }
    }
  }

  assert.deepEqual(offenders, [])
})

test("migrated core compatibility shims are removed from lib", () => {
  const remainingShimPaths = MIGRATED_CORE_LIB_ALIASES
    .map((alias) => path.join(ROOT, alias.replace("@/", "")))
    .filter((shimPath) => (
      fs.existsSync(`${shimPath}.ts`)
      || fs.existsSync(`${shimPath}.tsx`)
      || fs.existsSync(`${shimPath}.json`)
    ))
    .map((shimPath) => path.relative(ROOT, shimPath))

  assert.deepEqual(remainingShimPaths, [])
})
