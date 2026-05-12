import test from "node:test"
import assert from "node:assert/strict"

import * as InlineEditor from "../../gui/editors/lib/inline-editor.ts"

test("buildInlineEditorTransform composes page and block rotations with explicit origins", () => {
  const output = InlineEditor.buildInlineEditorTransform({
    pageWidth: 400,
    pageHeight: 600,
    pageRotation: 12,
    blockRotation: -18,
    rectX: 40,
    rectY: 80,
    rotationOriginX: 130,
    rotationOriginY: 200,
  })

  assert.equal(output.pageTransform, "rotate(12deg)")
  assert.equal(output.pageTransformOrigin, "200px 300px")
  assert.equal(output.blockTransform, "rotate(-18deg)")
  assert.equal(output.blockTransformOrigin, "90px 120px")
})

test("computeSidebarWithEditorSession restores prior sidebar after text-editor closes", () => {
  const opened = InlineEditor.computeSidebarWithEditorSession("legal", null, true)
  assert.equal(opened.nextPanel, "text-editor")
  assert.equal(opened.nextPreviousPanelBeforeEditor, "legal")

  const closed = InlineEditor.computeSidebarWithEditorSession(opened.nextPanel, opened.nextPreviousPanelBeforeEditor, false)
  assert.equal(closed.nextPanel, "legal")
  assert.equal(closed.nextPreviousPanelBeforeEditor, "legal")
})

test("computeInlineEditorTextBox preserves right-aligned editor width and adds optical hang room", () => {
  const textBox = InlineEditor.computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "right",
    commands: [
      { text: "Right aligned.", x: 244, y: 140 },
    ],
    measureText: (text) => text.length * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 204)
})

test("computeInlineEditorTextBox keeps centered text symmetric around its anchor", () => {
  const textBox = InlineEditor.computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "center",
    commands: [
      { text: "Center", x: 140, y: 140 },
    ],
    measureText: (text) => text.length * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 200)
})

test("computeInlineEditorTextBox measures centered lines against the visible source range", () => {
  const textBox = InlineEditor.computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "center",
    commands: [
      { text: "  Swiss", x: 140, y: 140, sourceStart: 0, sourceEnd: 7, leadingBoundaryWhitespace: 2 },
    ],
    measureText: (_text, range) => ((range?.end ?? 0) - (range?.start ?? 0)) * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 200)
})

test("computeInlineEditorTextBox ignores trailing boundary whitespace on right-aligned lines", () => {
  const textBox = InlineEditor.computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "right",
    commands: [
      { text: "Swiss ", x: 240, y: 140, sourceStart: 0, sourceEnd: 6, trailingBoundaryWhitespace: 1 },
    ],
    measureText: (text) => text.length * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 200)
})

test("computeInlineEditorTextBox measures right-aligned lines against the visible source range", () => {
  const textBox = InlineEditor.computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "right",
    commands: [
      { text: "Cherubini ", x: 240, y: 140, sourceStart: 0, sourceEnd: 10, trailingBoundaryWhitespace: 1 },
    ],
    measureText: (_text, range) => ((range?.end ?? 0) - (range?.start ?? 0)) * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 200)
})

test("resolveInlineEditorLineMatches keeps sequential line ranges for wrapped text", () => {
  const lines = InlineEditor.resolveInlineEditorLineMatches("Hello world\nSecond line", [
    { text: "Hello world", x: 40, y: 120 },
    { text: "Second line", x: 40, y: 144 },
  ])

  assert.deepEqual(lines.map((line) => [line.sourceStart, line.sourceEnd]), [
    [0, 11],
    [12, 23],
  ])
})

test("resolveInlineEditorLineMatches prefers explicit renderer source ranges when present", () => {
  const lines = InlineEditor.resolveInlineEditorLineMatches("Swiss Grid Swiss", [
    { text: "Swiss", x: 40, y: 120, sourceStart: 11, sourceEnd: 16 },
    { text: "Swiss Grid", x: 40, y: 144, sourceStart: 0, sourceEnd: 10 },
  ])

  assert.deepEqual(lines.map((line) => [line.sourceStart, line.sourceEnd]), [
    [11, 16],
    [0, 10],
  ])
})
