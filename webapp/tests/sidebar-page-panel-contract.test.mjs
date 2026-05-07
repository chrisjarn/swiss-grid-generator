import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("page keyboard navigation centralizes the settled GUI page separately from immediate preview selection", () => {
  const hookSource = readText("hooks/useSettledPageKeyboardNavigation.ts")
  const pageSource = readText("app/page.tsx")
  const workspaceSource = readText("components/preview/PreviewWorkspace.tsx")
  const panelSource = readText("components/sidebar/PagesPanel.tsx")

  assert.match(hookSource, /export\s+const\s+PAGE_KEYBOARD_GUI_SETTLE_DELAY_MS\s*=\s*160/)
  assert.match(hookSource, /pendingKeyboardTargetRef/)
  assert.match(hookSource, /requestKeyboardPageFocus/)
  assert.match(hookSource, /window\.setTimeout\([\s\S]*?setSettledPageId\(pageId\)[\s\S]*?settleDelayMs/)
  assert.match(hookSource, /settleGuiPageNow/)

  assert.match(pageSource, /useSettledPageKeyboardNavigation\(\{[\s\S]*?activePageId,[\s\S]*?pages:\s*projectPages/)
  assert.match(pageSource, /requestKeyboardPageFocus\(nextPageId\)[\s\S]*?selectPage\(nextPageId\)/)
  assert.match(pageSource, /const\s+handleDirectProjectPageSelect\s*=\s*useCallback\(\(pageId:\s*string\)/)
  assert.match(pageSource, /settleGuiPageNow\(pageId\)[\s\S]*?selectPage\(pageId\)/)
  assert.match(pageSource, /const\s+sidebarControlsUseLivePage\s*=\s*sidebarActivePageId\s*===\s*activePageId\s*&&\s*!isPageKeyboardGuiSettling/)
  assert.match(pageSource, /const\s+sidebarControlUi\s*=\s*useMemo<UiSettingsSnapshot>/)
  assert.match(pageSource, /resolveUiSettingsSnapshot\(sidebarActivePage\.uiSettings\)/)
  assert.match(pageSource, /interactionsDisabled=\{showPresetsBrowser\s*\|\|\s*!sidebarControlsUseLivePage\}/)
  assert.match(pageSource, /sidebarActiveProjectPage=\{sidebarActivePage\}/)
  assert.match(pageSource, /sidebarActivePageId=\{sidebarActivePageId\}/)

  assert.match(workspaceSource, /sidebarActiveProjectPage:\s*PreviewProjectPage\s*\|\s*null/)
  assert.match(workspaceSource, /sidebarActivePageId:\s*string/)
  assert.match(workspaceSource, /activePage=\{sidebarActiveProjectPage\}/)
  assert.match(workspaceSource, /activePageId=\{sidebarActivePageId\}/)

  assert.match(panelSource, /import\s+\{\s*PAGE_KEYBOARD_GUI_SETTLE_DELAY_MS\s*\}\s+from\s+"@\/hooks\/useSettledPageKeyboardNavigation"/)
  assert.match(panelSource, /const\s+KEYBOARD_PAGE_SETTLE_DELAY_MS\s*=\s*PAGE_KEYBOARD_GUI_SETTLE_DELAY_MS/)
  assert.doesNotMatch(panelSource, /deferredKeyboardActivePageId/)
})
