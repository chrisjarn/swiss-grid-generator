import test from "node:test"
import assert from "node:assert/strict"

import * as InlineEditor from "../../lib/inline-editor.ts"

test("resolveInlineEditorHorizontalNavigation moves a collapsed caret left and right", () => {
  assert.deepEqual(
    InlineEditor.resolveInlineEditorHorizontalNavigation({
      text: "Swiss",
      anchor: 2,
      focusIndex: 2,
      direction: "left",
      extendSelection: false,
    }),
    { anchor: 1, focusIndex: 1 },
  )

  assert.deepEqual(
    InlineEditor.resolveInlineEditorHorizontalNavigation({
      text: "Swiss",
      anchor: 2,
      focusIndex: 2,
      direction: "right",
      extendSelection: false,
    }),
    { anchor: 3, focusIndex: 3 },
  )
})

test("resolveInlineEditorHorizontalNavigation collapses ranges toward the travel direction", () => {
  assert.deepEqual(
    InlineEditor.resolveInlineEditorHorizontalNavigation({
      text: "Swiss Grid",
      anchor: 8,
      focusIndex: 3,
      direction: "left",
      extendSelection: false,
    }),
    { anchor: 3, focusIndex: 3 },
  )

  assert.deepEqual(
    InlineEditor.resolveInlineEditorHorizontalNavigation({
      text: "Swiss Grid",
      anchor: 8,
      focusIndex: 3,
      direction: "right",
      extendSelection: false,
    }),
    { anchor: 8, focusIndex: 8 },
  )
})

test("resolveInlineEditorHorizontalNavigation extends selection from the current anchor", () => {
  assert.deepEqual(
    InlineEditor.resolveInlineEditorHorizontalNavigation({
      text: "Swiss Grid",
      anchor: 4,
      focusIndex: 6,
      direction: "left",
      extendSelection: true,
    }),
    { anchor: 4, focusIndex: 5 },
  )

  assert.deepEqual(
    InlineEditor.resolveInlineEditorHorizontalNavigation({
      text: "Swiss Grid",
      anchor: 4,
      focusIndex: 2,
      direction: "right",
      extendSelection: true,
    }),
    { anchor: 4, focusIndex: 3 },
  )
})

test("resolveInlineEditorKeyboardSelectionTransition handles select-all and horizontal keys", () => {
  assert.deepEqual(
    InlineEditor.resolveInlineEditorKeyboardSelectionTransition({
      text: "Swiss Grid",
      textAlign: "left",
      commands: [
        { text: "Swiss Grid", x: 40, y: 136 },
      ],
      selection: { anchor: 2, focusIndex: 2 },
      key: "a",
      shiftKey: false,
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      isAltGraph: false,
      desiredX: 120,
      textAscent: 10,
      lineHeight: 24,
      measureText: (text) => text.length * 10,
    }),
    {
      handled: true,
      selection: { anchor: 0, focusIndex: 10 },
      desiredX: null,
    },
  )

  assert.deepEqual(
    InlineEditor.resolveInlineEditorKeyboardSelectionTransition({
      text: "Swiss Grid",
      textAlign: "left",
      commands: [
        { text: "Swiss Grid", x: 40, y: 136 },
      ],
      selection: { anchor: 5, focusIndex: 5 },
      key: "ArrowLeft",
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      desiredX: 120,
      textAscent: 10,
      lineHeight: 24,
      measureText: (text) => text.length * 10,
    }),
    {
      handled: true,
      selection: { anchor: 4, focusIndex: 4 },
      desiredX: null,
    },
  )
})

test("resolveInlineEditorKeyboardSelectionTransition handles vertical line navigation", () => {
  assert.deepEqual(
    InlineEditor.resolveInlineEditorKeyboardSelectionTransition({
      text: "Hello world\nSecond line",
      textAlign: "left",
      commands: [
        { text: "Hello world", x: 40, y: 136 },
        { text: "Second line", x: 40, y: 160 },
      ],
      selection: { anchor: 7, focusIndex: 7 },
      key: "ArrowDown",
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      desiredX: null,
      textAscent: 10,
      lineHeight: 24,
      measureText: (text) => text.length * 10,
    }),
    {
      handled: true,
      selection: { anchor: 19, focusIndex: 19 },
      desiredX: 110,
    },
  )
})

test("resolveInlineEditorLineNavigation moves Home and End within the visual wrapped line", () => {
  const home = InlineEditor.resolveInlineEditorLineNavigation({
    text: "Hello world\nSecond line",
    textAlign: "left",
    commands: [
      { text: "Hello world", x: 40, y: 120 },
      { text: "Second line", x: 40, y: 144 },
    ],
    selectionIndex: 18,
    direction: "home",
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  const end = InlineEditor.resolveInlineEditorLineNavigation({
    text: "Hello world\nSecond line",
    textAlign: "left",
    commands: [
      { text: "Hello world", x: 40, y: 120 },
      { text: "Second line", x: 40, y: 144 },
    ],
    selectionIndex: 3,
    direction: "end",
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(home, {
    index: 12,
    desiredX: 40,
  })
  assert.deepEqual(end, {
    index: 11,
    desiredX: 150,
  })
})

test("resolveInlineEditorLineNavigation keeps the visual x-column when moving down", () => {
  const result = InlineEditor.resolveInlineEditorLineNavigation({
    text: "Hello\nSecond",
    textAlign: "left",
    commands: [
      { text: "Hello", x: 40, y: 120 },
      { text: "Second", x: 40, y: 144 },
    ],
    selectionIndex: 4,
    direction: "down",
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(result, {
    index: 10,
    desiredX: 80,
  })
})

test("resolveInlineEditorLineNavigation clamps upward movement to the nearest caret on the previous visual line", () => {
  const result = InlineEditor.resolveInlineEditorLineNavigation({
    text: "Hello\nSecond",
    textAlign: "left",
    commands: [
      { text: "Hello", x: 40, y: 120 },
      { text: "Second", x: 40, y: 144 },
    ],
    selectionIndex: 12,
    direction: "up",
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(result, {
    index: 5,
    desiredX: 100,
  })
})
