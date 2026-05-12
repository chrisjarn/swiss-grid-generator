import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, "..")

function readRepoText(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8")
}

function existsRepo(relPath) {
  return fs.existsSync(path.join(REPO_ROOT, relPath))
}

test("root documentation is the user documentation source", () => {
  const documentation = readRepoText("DOCUMENTATION.md")
  const packageJson = JSON.parse(readRepoText("package.json"))

  assert.match(documentation, /^# Swiss Grid Generator Documentation/m)
  assert.match(documentation, /## Getting Started/)
  assert.match(documentation, /## Core Concepts/)
  assert.match(documentation, /## Placeholder Reference/)
  assert.match(documentation, /## Keyboard Shortcuts/)
  assert.match(documentation, /## Export Options/)
  assert.equal(packageJson.scripts["docs:dev"], "vitepress dev docs-site --host 0.0.0.0")
  assert.equal(packageJson.scripts["docs:build"], "vitepress build docs-site")
  assert.equal(packageJson.scripts["predocs:build"], "node scripts/sync-docs-site.mjs")
  const docsConfig = readRepoText("docs-site/.vitepress/config.mts")
  assert.match(docsConfig, /base: "\/doc\/"/)
  assert.match(docsConfig, /outDir: "\.\.\/webapp\/public\/doc"/)
  const docsRoute = readRepoText("webapp/app/docs/page.tsx")
  assert.match(docsRoute, /DOCUMENTATION_ENTRY = "\/doc\/index\.html"/)
  assert.match(docsRoute, /<iframe/)
})

test("full help panel surface is removed from the app", () => {
  assert.equal(existsRepo("HELP.md"), false)
  assert.equal(existsRepo("webapp/gui/panels/sidebar/HelpPanel.tsx"), false)
  assert.equal(existsRepo("webapp/core/document/generated-help-content.ts"), false)
  assert.equal(existsRepo("webapp/scripts/generate-help-content.mjs"), false)
  assert.equal(existsRepo("webapp/messages/en/content/help.md"), false)

  const topBar = readRepoText("webapp/gui/shell/TopBar.tsx")
  const shellMessages = readRepoText("webapp/messages/en/ui/shell.json")
  assert.doesNotMatch(topBar, /onToggleHelpPanel/)
  assert.doesNotMatch(shellMessages, /"toggleHelp"|"help": "Help"/)
})

test("app exposes a discreet external documentation entry point", () => {
  const documentationLib = readRepoText("webapp/lib/documentation.ts")
  const topBar = readRepoText("webapp/gui/shell/TopBar.tsx")
  const shortcuts = readRepoText("webapp/gui/shell/lib/preview-header-shortcuts.ts")

  assert.match(documentationLib, /DOCUMENTATION_URL = "\/docs"/)
  assert.doesNotMatch(topBar, /CircleHelp/)
  assert.match(topBar, /onOpenDocumentation/)
  assert.match(topBar, /supportMenu\.documentation/)
  assert.match(shortcuts, /open_documentation/)
  assert.match(shortcuts, /Shift\+\?/)
})

test("hover info remains a shell-owned toggle in the more menu", () => {
  const topBar = readRepoText("webapp/gui/shell/TopBar.tsx")
  const shellModel = readRepoText("webapp/gui/shell/useShellModel.tsx")
  const shellMessages = readRepoText("webapp/messages/en/ui/shell.json")

  assert.match(topBar, /onToggleHoverInfo/)
  assert.match(topBar, /showHoverInfo/)
  assert.match(shellModel, /informationVisible/)
  assert.match(shellModel, /showRolloverInfo=\{showHoverInfo\}/)
  assert.match(shellMessages, /"showHoverInfo": "Show hover info"/)
  assert.match(shellMessages, /"hideHoverInfo": "Hide hover info"/)
})
