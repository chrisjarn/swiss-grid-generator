import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readSource(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("preview double-click keeps the drag-end click guard deliberate", () => {
  const routingSource = readSource("gui/preview/hooks/usePreviewPointerSelectionRouting.ts")
  const editorSource = readSource("gui/editors/hooks/useBlockEditorCanvasDoubleClick.ts")

  assert.match(routingSource, /PREVIEW_DRAG_CLICK_GUARD_MS/)
  assert.match(routingSource, /Date\.now\(\) - dragEndedAtRef\.current < PREVIEW_DRAG_CLICK_GUARD_MS/)
  assert.match(editorSource, /PREVIEW_DRAG_CLICK_GUARD_MS/)
  assert.match(editorSource, /Date\.now\(\) - \(dragEndedAtRef\.current \?\? 0\) < PREVIEW_DRAG_CLICK_GUARD_MS/)
})

test("preview double-click opens existing text layers before creating new ones", () => {
  const source = readSource("gui/editors/hooks/useBlockEditorCanvasDoubleClick.ts")
  const existingLayerIndex = source.indexOf("const key = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)")
  const existingEditorIndex = source.indexOf("setEditorState(buildExistingBlockEditorState({")
  const newLayerIndex = source.indexOf("const newKey = getNextCustomBlockId()")

  assert.ok(existingLayerIndex >= 0, "Expected double-click routing to resolve an existing text layer first")
  assert.ok(existingEditorIndex > existingLayerIndex, "Expected existing text layers to open the editor")
  assert.ok(newLayerIndex > existingEditorIndex, "Expected new paragraph creation to remain the fallback path")
})

test("preview interaction routing stays delegated through preview hooks", () => {
  const gridPreviewSource = readSource("gui/preview/GridPreview.tsx")
  const routingSource = readSource("gui/preview/hooks/usePreviewPointerSelectionRouting.ts")
  const textLayerSource = readSource("gui/preview/hooks/usePreviewTextLayerInteractions.ts")

  assert.match(gridPreviewSource, /usePreviewCanvasInteractions/)
  assert.doesNotMatch(gridPreviewSource, /const handleCanvasDoubleClick\s*=\s*useCallback/)
  assert.match(routingSource, /openTextEditorFromCanvas\(event\)/)
  assert.match(textLayerSource, /handleTextCanvasDoubleClick\(event\)/)
})

test("preview smoke uses the authored inline editor aria-label casing", () => {
  const smokeSource = readSource("scripts/run-preview-interaction-smoke.mjs")

  assert.match(smokeSource, /textarea\[aria-label\^="Inline edit"\]/)
  assert.doesNotMatch(smokeSource, /textarea\[aria-label\^="inline edit"\]/)
})
