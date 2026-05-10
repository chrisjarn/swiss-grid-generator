import test from "node:test"
import assert from "node:assert/strict"

import * as InlineEditor from "../../lib/inline-editor.ts"

test("computeInlineEditorSpecialCharMarkers emits one marker per source whitespace and paragraph break", () => {
  const markers = InlineEditor.computeInlineEditorSpecialCharMarkers({
    text: "A B\nC",
    textAlign: "left",
    commands: [
      { text: "A B", x: 40, y: 120, sourceStart: 0, sourceEnd: 3 },
      { text: "C", x: 40, y: 144, sourceStart: 4, sourceEnd: 5 },
    ],
    renderedLines: [
      {
        sourceStart: 0,
        sourceEnd: 3,
        left: 40,
        top: 96,
        width: 60,
        height: 24,
        baselineY: 120,
        caretStops: [
          { index: 0, x: 40 },
          { index: 1, x: 60 },
          { index: 2, x: 80 },
          { index: 3, x: 100 },
        ],
      },
      {
        sourceStart: 4,
        sourceEnd: 5,
        left: 40,
        top: 120,
        width: 20,
        height: 24,
        baselineY: 144,
        caretStops: [
          { index: 4, x: 40 },
          { index: 5, x: 60 },
        ],
      },
    ],
    textAscent: 10,
    lineHeight: 24,
    markerFontSize: 12,
    measureText: (text) => text.length * 20,
  })

  assert.deepEqual(markers, [
    { glyph: "·", x: 70, baselineY: 120, fontSize: 12 },
    { glyph: "¶", x: 106, baselineY: 120, fontSize: 12 },
  ])
})

test("computeInlineEditorSpecialCharMarkers avoids duplicating wrapped boundary spaces", () => {
  const markers = InlineEditor.computeInlineEditorSpecialCharMarkers({
    text: "Swiss Style",
    textAlign: "left",
    commands: [
      { text: "Swiss ", x: 40, y: 120, sourceStart: 0, sourceEnd: 6, trailingBoundaryWhitespace: 1 },
      { text: "Style", x: 40, y: 144, sourceStart: 5, sourceEnd: 11, leadingBoundaryWhitespace: 1 },
    ],
    renderedLines: [
      {
        sourceStart: 0,
        sourceEnd: 6,
        left: 40,
        top: 96,
        width: 100,
        height: 24,
        baselineY: 120,
        caretStops: [
          { index: 0, x: 40 },
          { index: 1, x: 60 },
          { index: 2, x: 80 },
          { index: 3, x: 100 },
          { index: 4, x: 120 },
          { index: 5, x: 140 },
          { index: 6, x: 140 },
        ],
      },
      {
        sourceStart: 5,
        sourceEnd: 11,
        left: 40,
        top: 120,
        width: 100,
        height: 24,
        baselineY: 144,
        caretStops: [
          { index: 5, x: 40 },
          { index: 6, x: 40 },
          { index: 7, x: 60 },
          { index: 8, x: 80 },
          { index: 9, x: 100 },
          { index: 10, x: 120 },
          { index: 11, x: 140 },
        ],
      },
    ],
    textAscent: 10,
    lineHeight: 24,
    markerFontSize: 12,
    measureText: (text) => text.length * 20,
  })

  assert.deepEqual(markers, [
    { glyph: "·", x: 140, baselineY: 120, fontSize: 12 },
  ])
})

test("resolveInlineEditorWordSelection expands a click index to the containing word", () => {
  const text = "Swiss grid system"
  const range = InlineEditor.resolveInlineEditorWordSelection(text, 8)

  assert.deepEqual(range, { start: 6, end: 10 })
  assert.equal(text.slice(range.start, range.end), "grid")
})

test("resolveInlineEditorSentenceSelection expands a click index to the containing sentence", () => {
  const text = "Swiss grids are precise. Editorial rhythm matters."
  const range = InlineEditor.resolveInlineEditorSentenceSelection(text, 32)

  assert.deepEqual(range, { start: 25, end: 50 })
  assert.equal(text.slice(range.start, range.end), "Editorial rhythm matters.")
})
