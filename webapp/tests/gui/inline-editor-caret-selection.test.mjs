import test from "node:test"
import assert from "node:assert/strict"

import * as InlineEditor from "../../lib/inline-editor.ts"

test("inline editor selection helpers preserve anchor, focus, and direction", () => {
  const backward = InlineEditor.buildInlineEditorSelectionStateFromRange(8, 3, true, "backward")
  assert.deepEqual(backward, {
    start: 3,
    end: 8,
    anchor: 8,
    focusIndex: 3,
    focused: true,
  })
  assert.equal(InlineEditor.getInlineEditorSelectionDirection(backward), "backward")

  const forward = InlineEditor.buildInlineEditorSelectionStateFromAnchorFocus(2, 5, false)
  assert.deepEqual(forward, {
    start: 2,
    end: 5,
    anchor: 2,
    focusIndex: 5,
    focused: false,
  })
  assert.equal(InlineEditor.getInlineEditorSelectionDirection(forward), "forward")
})

test("computeInlineEditorCaret returns the visual caret at the right-aligned line end", () => {
  const caret = InlineEditor.computeInlineEditorCaret({
    text: "Hello world",
    textAlign: "right",
    commands: [
      { text: "Hello world", x: 240, y: 136 },
    ],
    selectionStart: 11,
    textAscent: 10,
    textBoxTop: 110,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 240,
    top: 16,
    height: 24,
  })
})

test("computeInlineEditorSelectionRects matches the visual segment on a right-aligned line", () => {
  const rects = InlineEditor.computeInlineEditorSelectionRects({
    text: "Hello world",
    textAlign: "right",
    commands: [
      { text: "Hello world", x: 240, y: 136 },
    ],
    selectionStart: 6,
    selectionEnd: 11,
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(rects, [{
    left: 190,
    top: 126,
    width: 50,
    height: 24,
  }])
})

test("hitTestInlineEditorIndex returns the nearest character index on a right-aligned line", () => {
  const index = InlineEditor.hitTestInlineEditorIndex({
    text: "Hello world",
    textAlign: "right",
    commands: [
      { text: "Hello world", x: 240, y: 136 },
    ],
    x: 191,
    y: 130,
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.equal(index, 6)
})

test("computeInlineEditorCaret returns the visual caret at the centered line midpoint", () => {
  const caret = InlineEditor.computeInlineEditorCaret({
    text: "Hello world",
    textAlign: "center",
    commands: [
      { text: "Hello world", x: 200, y: 136 },
    ],
    selectionStart: 5,
    textAscent: 10,
    textBoxTop: 110,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 195,
    top: 16,
    height: 24,
  })
})

test("computeInlineEditorCaret uses positioned segment geometry for mixed formatting", () => {
  const caret = InlineEditor.computeInlineEditorCaret({
    text: "ABCD",
    textAlign: "left",
    commands: [
      { text: "ABCD", x: 40, y: 136, sourceStart: 0, sourceEnd: 4 },
    ],
    segmentLines: [[
      {
        text: "A",
        start: 0,
        end: 1,
        trackingScale: 0,
        fontFamily: "Inter",
        fontWeight: 400,
        italic: false,
        styleKey: "body",
        color: "#000000",
        fontSize: 20,
        x: 40,
        y: 136,
      },
      {
        text: "BCD",
        start: 1,
        end: 4,
        trackingScale: 0,
        fontFamily: "Inter",
        fontWeight: 400,
        italic: false,
        styleKey: "display",
        color: "#000000",
        fontSize: 40,
        x: 70,
        y: 136,
      },
    ]],
    selectionStart: 1,
    textAscent: 10,
    textBoxTop: 110,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 70,
    top: 16,
    height: 24,
  })
})

test("computeInlineEditorCaret prefers rendered line geometry when available", () => {
  const caret = InlineEditor.computeInlineEditorCaret({
    text: "Swiss",
    textAlign: "left",
    commands: [
      { text: "Swiss", x: 40, y: 136, sourceStart: 0, sourceEnd: 5 },
    ],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 5,
      left: 52,
      top: 84,
      width: 118,
      height: 48,
      baselineY: 120,
      caretStops: [
        { index: 0, x: 52 },
        { index: 1, x: 74 },
        { index: 2, x: 96 },
        { index: 3, x: 118 },
        { index: 4, x: 142 },
        { index: 5, x: 170 },
      ],
    }],
    selectionStart: 3,
    textAscent: 10,
    textBoxTop: 84,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 118,
    top: 0,
    height: 48,
  })
})

test("computeInlineEditorSelectionRects prefers rendered line geometry when available", () => {
  const rects = InlineEditor.computeInlineEditorSelectionRects({
    text: "Swiss",
    textAlign: "left",
    commands: [
      { text: "Swiss", x: 40, y: 136, sourceStart: 0, sourceEnd: 5 },
    ],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 5,
      left: 52,
      top: 84,
      width: 118,
      height: 48,
      baselineY: 120,
      caretStops: [
        { index: 0, x: 52 },
        { index: 1, x: 74 },
        { index: 2, x: 96 },
        { index: 3, x: 118 },
        { index: 4, x: 142 },
        { index: 5, x: 170 },
      ],
    }],
    selectionStart: 1,
    selectionEnd: 3,
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(rects, [{
    left: 74,
    top: 84,
    width: 44,
    height: 48,
  }])
})

test("computeInlineEditorCaret keeps the terminal caret on the rendered line end when the logical line range extends further", () => {
  const caret = InlineEditor.computeInlineEditorCaret({
    text: "Swiss ",
    textAlign: "left",
    commands: [
      { text: "Swiss", x: 40, y: 136, sourceStart: 0, sourceEnd: 6 },
    ],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 6,
      left: 40,
      top: 112,
      width: 100,
      height: 24,
      baselineY: 136,
      caretStops: [
        { index: 0, x: 40 },
        { index: 1, x: 60 },
        { index: 2, x: 80 },
        { index: 3, x: 100 },
        { index: 4, x: 120 },
        { index: 5, x: 140 },
        { index: 6, x: 140 },
      ],
    }],
    selectionStart: 6,
    textAscent: 10,
    textBoxTop: 112,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 140,
    top: 0,
    height: 24,
  })
})

test("computeInlineEditorCaret preserves repeated spaces in fallback prefix measurement", () => {
  const caret = InlineEditor.computeInlineEditorCaret({
    text: "A   B",
    textAlign: "left",
    commands: [
      { text: "A   B", x: 40, y: 136, sourceStart: 0, sourceEnd: 5 },
    ],
    selectionStart: 4,
    textAscent: 10,
    textBoxTop: 110,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 80,
    top: 16,
    height: 24,
  })
})

test("hitTestInlineEditorIndex prefers the visible line-end caret over hidden wrap whitespace", () => {
  const index = InlineEditor.hitTestInlineEditorIndex({
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
    x: 140,
    y: 108,
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.equal(index, 5)
})
