import test from "node:test"
import assert from "node:assert/strict"

import { resolveCurrentPreviewLayout } from "../../gui/preview/lib/current-preview-layout.ts"
import { buildNewBlockEditorState } from "../../gui/preview/lib/preview-block-editor-state.ts"
import { PREVIEW_STYLE_OPTIONS, resolveCustomStyleSeedMetrics } from "../../gui/preview/lib/preview-text-config.ts"
import { insertTextLayerIntoCollections } from "../../gui/preview/lib/preview-text-layer-state.ts"
import { resolveNearestPreviewColumn } from "../../core/layout/preview-column-snap.ts"
import { resolveTextCopyAffordanceAction } from "../../gui/preview/lib/preview-copy-affordance.ts"
import { resolvePreviewHoverTarget } from "../../gui/preview/lib/preview-hover-target.ts"
import {
  resolvePreviewHoverDeleteActionLeft,
  resolvePreviewParagraphMenuWidth,
  resolvePreviewResizeHandleHitRect,
  shouldUseCompactParagraphActions,
} from "../../gui/preview/lib/preview-hover-affordance.ts"
import {
  getPreviewTextGuideBounds,
  getPreviewTextGuideGeometry,
  getPreviewTextGuideRects,
} from "../../gui/preview/lib/preview-guide-rect.ts"
import { resolveAdjacentProjectPageId } from "../../gui/shell/lib/project-page-navigation.ts"
import { buildSmartTextZoomGeometrySignature } from "../../gui/preview/lib/preview-smart-text-zoom.ts"

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
      "display:Display",
      "headline:Headline",
      "subhead:Subhead",
      "body:Body",
      "caption:Caption",
      "fx:Custom",
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

test("new text paragraphs default to hyphenation off", () => {
  const inserted = insertTextLayerIntoCollections({
    blockOrder: [],
    textContent: {},
    blockTextEdited: {},
    styleAssignments: {},
    blockColumnSpans: {},
    blockRowSpans: {},
    blockHeightBaselines: {},
    blockTextAlignments: {},
    blockVerticalAlignments: {},
    blockTextReflow: {},
    blockSyllableDivision: {},
    blockSnapToColumns: {},
    blockSnapToBaseline: {},
    blockTrackingRuns: {},
    blockTextFormatRuns: {},
    blockModulePositions: {},
  }, {
    newKey: "paragraph-new",
    text: "Body",
    styleKey: "body",
    gridCols: 4,
    gridRows: 4,
    columns: 1,
    rows: 1,
    heightBaselines: 0,
    position: { column: 0, row: 0, baselineOffset: 0 },
    rowStartBaselines: [0, 8, 16, 24],
  })

  assert.equal(inserted.blockSyllableDivision["paragraph-new"], false)

  const editorState = buildNewBlockEditorState({
    key: "paragraph-new",
    style: "body",
    text: "Body",
    columns: 1,
    rows: 1,
    baseFont: "Inter",
    defaultTextColor: "#111111",
    getStyleLeading: () => 12,
    getStyleSize: () => 10,
    fxStyle: "fx",
  })

  assert.equal(editorState.draftSyllableDivision, false)
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

test("current resize handle hit zone preserves the hovered paragraph over adjacent targets", () => {
  const resolved = resolvePreviewHoverTarget({
    pageX: 206,
    pageY: 156,
    currentTextKey: "marked-paragraph",
    currentImageKey: null,
    findTopmostBlockAtPoint: () => "right-paragraph",
    findTopmostImageAtPoint: () => null,
    isPointWithinHoverTarget: () => false,
    isPointWithinHoverAffordanceTarget: (key, pageX, pageY) => (
      key === "marked-paragraph"
      && pageX >= 189
      && pageX <= 211
      && pageY >= 139
      && pageY <= 161
    ),
  })

  assert.deepEqual(resolved, { kind: "text", key: "marked-paragraph" })
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

test("resize handle hit rect expands around the bottom-right frame corner", () => {
  assert.deepEqual(
    resolvePreviewResizeHandleHitRect({
      targetRect: { x: 10, y: 20, width: 190, height: 130 },
    }),
    { x: 189, y: 139, width: 22, height: 22 },
  )
})

test("paragraph rollover actions compact before four icons would collide", () => {
  assert.equal(shouldUseCompactParagraphActions(99), true)
  assert.equal(shouldUseCompactParagraphActions(100), false)
})

test("delete affordance accounts for the visible left action group", () => {
  assert.equal(
    resolvePreviewHoverDeleteActionLeft({ x: 0, y: 0, width: 130, height: 30 }, false, 3),
    108,
  )
  assert.equal(
    resolvePreviewHoverDeleteActionLeft({ x: 0, y: 0, width: 98, height: 30 }, false, 3),
    78,
  )
})

test("paragraph submenu width follows module edges inside the usable range", () => {
  assert.equal(
    resolvePreviewParagraphMenuWidth({
      left: 100,
      verticalEdges: [140, 292, 380],
    }),
    192,
  )
  assert.equal(
    resolvePreviewParagraphMenuWidth({
      left: 100,
      verticalEdges: [120, 140],
    }),
    180,
  )
  assert.equal(
    resolvePreviewParagraphMenuWidth({
      left: 100,
      verticalEdges: [380],
    }),
    240,
  )
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

test("reflow text guides preserve every occupied module", () => {
  const plan = {
    guideRects: [
      { x: 10, y: 20, width: 30, height: 40 },
      { x: 50, y: 20, width: 30, height: 40 },
      { x: 90, y: 20, width: 30, height: 40 },
      { x: 130, y: 20, width: 30, height: 40 },
    ],
    rect: { x: 10, y: 8, width: 150, height: 52 },
    rotationOriginX: 10,
    rotationOriginY: 20,
  }

  assert.deepEqual(getPreviewTextGuideRects(plan), plan.guideRects)
  assert.deepEqual(getPreviewTextGuideBounds(plan), {
    x: 10,
    y: 20,
    width: 150,
    height: 40,
  })
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
