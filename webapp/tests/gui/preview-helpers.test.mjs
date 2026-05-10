import test from "node:test"
import assert from "node:assert/strict"

import { resolveCurrentPreviewLayout } from "../../lib/current-preview-layout.ts"
import { PREVIEW_STYLE_OPTIONS, resolveCustomStyleSeedMetrics } from "../../lib/preview-text-config.ts"
import { resolveNearestPreviewColumn } from "../../lib/preview-column-snap.ts"
import { resolveTextCopyAffordanceAction } from "../../lib/preview-copy-affordance.ts"
import { resolvePreviewHoverTarget } from "../../lib/preview-hover-target.ts"
import { getPreviewTextGuideGeometry } from "../../lib/preview-guide-rect.ts"
import { resolveAdjacentProjectPageId } from "../../lib/project-page-navigation.ts"
import { buildSmartTextZoomGeometrySignature } from "../../lib/preview-smart-text-zoom.ts"

test("resolveCurrentPreviewLayout prefers the committed layout while sidebar changes are ahead of the live preview", () => {
  const committedLayout = { layerOrder: ["caption", "body", "image-1"] }
  const staleLiveLayout = { layerOrder: ["body", "caption", "image-1"] }

  const resolved = resolveCurrentPreviewLayout({
    preferCommittedLayout: true,
    committedLayout,
    getLivePreviewLayout: () => staleLiveLayout,
  })

  assert.equal(resolved, committedLayout)
})

test("resolveCurrentPreviewLayout still uses the live preview snapshot for unsaved canvas edits", () => {
  const committedLayout = { layerOrder: ["body", "caption"] }
  const liveLayout = { layerOrder: ["caption", "body"] }

  const resolved = resolveCurrentPreviewLayout({
    preferCommittedLayout: false,
    committedLayout,
    getLivePreviewLayout: () => liveLayout,
  })

  assert.equal(resolved, liveLayout)
})

test("resolveCurrentPreviewLayout falls back to the committed layout when no live snapshot is available", () => {
  const committedLayout = { layerOrder: ["image-1"] }

  const resolved = resolveCurrentPreviewLayout({
    preferCommittedLayout: false,
    committedLayout,
    getLivePreviewLayout: null,
  })

  assert.equal(resolved, committedLayout)
})

test("preview style options list custom after caption", () => {
  assert.deepEqual(
    PREVIEW_STYLE_OPTIONS.map((option) => `${option.value}:${option.label}`),
    [
      "display:display",
      "headline:headline",
      "subhead:subhead",
      "body:body",
      "caption:caption",
      "fx:custom",
    ],
  )
})

test("entering Custom seeds the current style size and leading", () => {
  const metrics = resolveCustomStyleSeedMetrics({
    currentStyle: "body",
    currentCustomSize: 96,
    currentCustomLeading: 96,
    isCustomStyle: (styleKey) => styleKey === "fx",
    getStyleSize: (styleKey) => ({ body: 10, fx: 96 })[styleKey] ?? 0,
    getStyleLeading: (styleKey) => ({ body: 12, fx: 96 })[styleKey] ?? 0,
  })

  assert.deepEqual(metrics, { size: 10, leading: 12 })
})

test("re-entering Custom preserves the current custom overrides", () => {
  const metrics = resolveCustomStyleSeedMetrics({
    currentStyle: "fx",
    currentCustomSize: 43.5,
    currentCustomLeading: 51,
    isCustomStyle: (styleKey) => styleKey === "fx",
    getStyleSize: () => 0,
    getStyleLeading: () => 0,
  })

  assert.deepEqual(metrics, { size: 43.5, leading: 51 })
})

test("resolveNearestPreviewColumn snaps left of the page into negative overhang columns", () => {
  const colStarts = [0, 100, 200, 300]
  const firstColumnStep = 100

  assert.equal(resolveNearestPreviewColumn(-20, colStarts, firstColumnStep), 0)
  assert.equal(resolveNearestPreviewColumn(-60, colStarts, firstColumnStep), -1)
  assert.equal(resolveNearestPreviewColumn(-260, colStarts, firstColumnStep), -3)
})

test("resolveNearestPreviewColumn keeps in-grid snapping unchanged", () => {
  const colStarts = [0, 100, 200, 300]
  const firstColumnStep = 100

  assert.equal(resolveNearestPreviewColumn(20, colStarts, firstColumnStep), 0)
  assert.equal(resolveNearestPreviewColumn(160, colStarts, firstColumnStep), 2)
  assert.equal(resolveNearestPreviewColumn(340, colStarts, firstColumnStep), 3)
})

test("text plus duplicates by default and reserves modifiers for settings transfer", () => {
  assert.deepEqual(resolveTextCopyAffordanceAction({ altKey: false, shiftKey: false }), {
    kind: "duplicate",
  })
  assert.deepEqual(resolveTextCopyAffordanceAction({ altKey: false, shiftKey: true }), {
    kind: "transfer",
    mode: "paragraph",
  })
  assert.deepEqual(resolveTextCopyAffordanceAction({ altKey: true, shiftKey: false }), {
    kind: "transfer",
    mode: "typo",
  })
  assert.deepEqual(resolveTextCopyAffordanceAction({ altKey: true, shiftKey: true }), {
    kind: "transfer",
    mode: "both",
  })
})

test("topmost text target wins over the current overlapping paragraph", () => {
  const resolved = resolvePreviewHoverTarget({
    pageX: 120,
    pageY: 80,
    currentTextKey: "large-paragraph",
    currentImageKey: null,
    findTopmostBlockAtPoint: () => "small-paragraph",
    findTopmostImageAtPoint: () => null,
    isPointWithinHoverTarget: (key) => key === "large-paragraph",
  })

  assert.deepEqual(resolved, { kind: "text", key: "small-paragraph" })
})

test("current text target is preserved when nothing else resolves but the pointer is still inside it", () => {
  const resolved = resolvePreviewHoverTarget({
    pageX: 120,
    pageY: 80,
    currentTextKey: "paragraph",
    currentImageKey: null,
    findTopmostBlockAtPoint: () => null,
    findTopmostImageAtPoint: () => null,
    isPointWithinHoverTarget: (key) => key === "paragraph",
  })

  assert.deepEqual(resolved, { kind: "text", key: "paragraph" })
})

test("hover clears when no topmost or current target matches the pointer", () => {
  const resolved = resolvePreviewHoverTarget({
    pageX: 120,
    pageY: 80,
    currentTextKey: "paragraph",
    currentImageKey: "image",
    findTopmostBlockAtPoint: () => null,
    findTopmostImageAtPoint: () => null,
    isPointWithinHoverTarget: () => false,
  })

  assert.equal(resolved, null)
})

test("left-aligned text guides keep horizontal and vertical anchors matched", () => {
  const guide = getPreviewTextGuideGeometry({
    guideRects: [{ x: 100, y: 200, width: 240, height: 120 }],
    rect: { x: 100, y: 176, width: 240, height: 144 },
    rotationOriginX: 100,
    rotationOriginY: 188,
    textAlign: "left",
    commands: [{ x: 92, y: 212 }],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 12,
      left: 92,
      top: 196,
      width: 140,
      height: 18,
      baselineY: 212,
      caretStops: [],
    }],
  })

  assert.equal(guide.verticalX, 100)
  assert.equal(guide.horizontalX, 100)
  assert.equal(guide.width, 240)
})

test("right-aligned text guides keep horizontal and vertical anchors matched", () => {
  const guide = getPreviewTextGuideGeometry({
    guideRects: [{ x: 160, y: 260, width: 180, height: 80 }],
    rect: { x: 160, y: 236, width: 180, height: 104 },
    rotationOriginX: 160,
    rotationOriginY: 248,
    textAlign: "right",
    commands: [{ x: 340, y: 272 }],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 6,
      left: 240,
      top: 256,
      width: 100,
      height: 16,
      baselineY: 272,
      caretStops: [],
    }],
  })

  assert.equal(guide.verticalX, 160)
  assert.equal(guide.horizontalX, 160)
  assert.equal(guide.width, 180)
})

test("resolveAdjacentProjectPageId moves to the previous and next page", () => {
  const pageIds = ["page-1", "page-2", "page-3"]

  assert.equal(resolveAdjacentProjectPageId(pageIds, "page-2", "previous"), "page-1")
  assert.equal(resolveAdjacentProjectPageId(pageIds, "page-2", "next"), "page-3")
})

test("resolveAdjacentProjectPageId clamps at the document edges", () => {
  const pageIds = ["page-1", "page-2", "page-3"]

  assert.equal(resolveAdjacentProjectPageId(pageIds, "page-1", "previous"), null)
  assert.equal(resolveAdjacentProjectPageId(pageIds, "page-3", "next"), null)
})

test("resolveAdjacentProjectPageId returns null for single-page and unknown-page cases", () => {
  assert.equal(resolveAdjacentProjectPageId(["page-1"], "page-1", "next"), null)
  assert.equal(resolveAdjacentProjectPageId(["page-1", "page-2"], "page-x", "next"), null)
})

test("smart text zoom geometry signature changes when the text frame geometry changes", () => {
  const base = buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 4,
    heightBaselines: 1,
  })

  assert.notEqual(base, buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 3,
    rows: 4,
    heightBaselines: 1,
  }))

  assert.notEqual(base, buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 5,
    heightBaselines: 1,
  }))

  assert.notEqual(base, buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 4,
    heightBaselines: 2,
  }))
})

test("smart text zoom geometry signature is stable for the same frame geometry", () => {
  const first = buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 4,
    heightBaselines: 1,
  })
  const second = buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 4,
    heightBaselines: 1,
  })

  assert.equal(first, second)
})
