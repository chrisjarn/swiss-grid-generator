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

test("newly created layer hover suppresses the transient guide fill", () => {
  const gridPreviewSource = readSource("gui/preview/GridPreview.tsx")
  const overlayCanvasSource = readSource("gui/preview/hooks/usePreviewOverlayCanvas.ts")

  assert.match(gridPreviewSource, /hoverGuideFillSuppressedLayerKey/)
  assert.match(gridPreviewSource, /setHoverGuideFillSuppressedLayerKey\(key\)/)
  assert.match(gridPreviewSource, /hideHoveredGuideFill/)
  assert.match(overlayCanvasSource, /hideHoveredGuideFill = false/)
  assert.match(overlayCanvasSource, /if \(!hideHoveredGuideFill\) \{[\s\S]*drawTextGuideFill/)
  assert.match(overlayCanvasSource, /if \(!hideHoveredGuideFill\) \{[\s\S]*drawPreviewGuideFill/)
})

test("rollover submenu opens directly on edit actions", () => {
  const overlaySource = readSource("gui/preview/GridPreviewOverlays.tsx")
  const actionStart = overlaySource.indexOf("const renderRolloverMenuActions = () => (")
  const actionEnd = overlaySource.indexOf("const rolloverMenu = ", actionStart)
  const actionSource = overlaySource.slice(actionStart, actionEnd)
  const globalStylesSource = readSource("app/globals.css")

  assert.ok(actionStart >= 0, "Expected rollover action renderer")
  assert.match(actionSource, /renderRolloverIconRow\([\s\S]*Icon: SquarePen[\s\S]*Icon: Copy[\s\S]*Icon: Trash2/)
  assert.doesNotMatch(actionSource, /renderRolloverMenuButton/)
  assert.doesNotMatch(actionSource, /renderRolloverMenuEditButton/)
  assert.doesNotMatch(actionSource, /renderDuplicateButton/)
  assert.doesNotMatch(actionSource, /renderDeleteButton/)
  assert.doesNotMatch(overlaySource, /paragraphMenuTriggerRowStyle/)
  assert.doesNotMatch(overlaySource, /paragraphMenuTriggerColumnWidth/)
  assert.doesNotMatch(overlaySource, /paragraphMenuContentInsetStyle/)
  assert.doesNotMatch(overlaySource, /rolloverMenuContentInsetStyle/)
  assert.doesNotMatch(overlaySource, /PARAGRAPH_ROLLOVER_BUTTON_HEIGHT/)
  assert.doesNotMatch(overlaySource, /PREVIEW_AFFORDANCE_DEBUG_BACKGROUND/)
  assert.doesNotMatch(overlaySource, /data-preview-affordance-debug/)
  assert.doesNotMatch(overlaySource, /data-preview-menu-icon/)
  assert.doesNotMatch(globalStylesSource, /data-preview-menu-icon/)
  assert.match(overlaySource, /PREVIEW_LAYER_AFFORDANCE_SIZE = 32/)
  assert.match(overlaySource, /PREVIEW_ROLLOVER_MENU_BUTTON_WIDTH = 24/)
  assert.match(overlaySource, /PREVIEW_ROLLOVER_MENU_BUTTON_HEIGHT = 32/)
  assert.match(overlaySource, /PREVIEW_ROLLOVER_MENU_SYMBOL_SIZE = 14/)
  assert.match(overlaySource, /PREVIEW_RESIZE_HANDLE_SIZE = PREVIEW_LAYER_AFFORDANCE_SIZE/)
  assert.match(overlaySource, /ROLLOVER_MENU_BODY_INSET = \(PREVIEW_LAYER_AFFORDANCE_SIZE - PREVIEW_ROLLOVER_ICON_SIZE\) \/ 2/)
  assert.match(overlaySource, /style=\{rolloverMenuIconButtonStyle\}/)
  assert.match(overlaySource, /style=\{rolloverMenuIconStyle\}/)
  assert.match(overlaySource, /<div className="space-y-2" style=\{rolloverMenuBodyStyle\}>\s*\{renderRolloverMenuActions\(\)\}/)
  assert.match(overlaySource, /renderRolloverIconRow\(/)
  assert.match(overlaySource, /renderRolloverIconButton\(/)
  assert.match(overlaySource, /renderRolloverRotationSlider\(/)
  assert.match(overlaySource, /renderRolloverToggleList\(/)
})

test("preview smoke uses the authored inline editor aria-label casing", () => {
  const smokeSource = readSource("scripts/run-preview-interaction-smoke.mjs")

  assert.match(smokeSource, /textarea\[aria-label\^="Inline edit"\]/)
  assert.doesNotMatch(smokeSource, /textarea\[aria-label\^="inline edit"\]/)
})
