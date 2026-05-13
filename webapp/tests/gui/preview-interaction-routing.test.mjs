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

test("rollover info tooltip delay is centralized", () => {
  const timingSource = readSource("shared/ui/hover-tooltip-timing.ts")
  const tooltipSource = readSource("shared/ui/hover-tooltip.tsx")

  assert.match(timingSource, /HOVER_TOOLTIP_OPEN_DELAY_MS\s*=\s*1000/)
  assert.match(tooltipSource, /HOVER_TOOLTIP_OPEN_DELAY_MS/)
  assert.match(tooltipSource, /window\.setTimeout\([\s\S]*HOVER_TOOLTIP_OPEN_DELAY_MS/)
})

test("paragraph alignment rollover previews stay separate from committed changes", () => {
  const overlaySource = readSource("gui/preview/GridPreviewOverlays.tsx")
  const gridPreviewSource = readSource("gui/preview/GridPreview.tsx")
  const previewHandlerStart = overlaySource.indexOf("const previewParagraphAlignmentChange = (")
  const previewHandlerEnd = overlaySource.indexOf("const handleImageToggleChange", previewHandlerStart)
  const previewHandlerSource = overlaySource.slice(previewHandlerStart, previewHandlerEnd)

  assert.ok(previewHandlerStart >= 0, "Expected a dedicated alignment preview handler")
  assert.match(previewHandlerSource, /onParagraphRolloverControlPreview\(hoveredEditTarget\.key, patch\)/)
  assert.doesNotMatch(previewHandlerSource, /onParagraphRolloverControlStart/)
  assert.doesNotMatch(previewHandlerSource, /onParagraphRolloverControlChange/)
  assert.match(gridPreviewSource, /const \[paragraphRolloverPreview, setParagraphRolloverPreview\]/)
  assert.match(gridPreviewSource, /buildPreviewRenderSnapshot/)
  assert.match(gridPreviewSource, /buildLayoutSnapshot: buildPreviewRenderSnapshot/)
})

test("image shortcut creation inserts and hovers without entering edit mode", () => {
  const imageInteractionSource = readSource("gui/preview/hooks/usePreviewImagePlaceholderInteractions.ts")
  const handlerStart = imageInteractionSource.indexOf("const handleImageDoubleClick = useCallback")
  const creationStart = imageInteractionSource.indexOf("const newKey = getNextImagePlaceholderId()", handlerStart)
  const creationEnd = imageInteractionSource.indexOf("return true", creationStart)
  const creationSource = imageInteractionSource.slice(creationStart, creationEnd)

  assert.ok(handlerStart >= 0, "Expected image double-click handler")
  assert.ok(creationStart >= 0, "Expected a new image-placeholder creation branch")
  assert.match(creationSource, /color: shortcutColor \?\? undefined/)
  assert.match(creationSource, /onImagePlaceholderCreated\?\.\(newKey, pagePoint\)/)
  assert.doesNotMatch(creationSource, /openImageEditor/)
})

test("preview smoke uses the authored inline editor aria-label casing", () => {
  const smokeSource = readSource("scripts/run-preview-interaction-smoke.mjs")

  assert.match(smokeSource, /textarea\[aria-label\^="Inline edit"\]/)
  assert.doesNotMatch(smokeSource, /textarea\[aria-label\^="inline edit"\]/)
})
