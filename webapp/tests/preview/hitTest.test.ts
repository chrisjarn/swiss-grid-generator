import test from "node:test"
import assert from "node:assert/strict"

import {
  resolvePreviewHitTestTarget,
  type PreviewHitTestLayer,
} from "../../core/preview/hitTest.ts"

const layers = [
  {
    key: "image-a",
    kind: "image",
    rects: [{ x: 0, y: 0, width: 120, height: 120 }],
  },
  {
    key: "text-a",
    kind: "text",
    rects: [{ x: 20, y: 20, width: 80, height: 80 }],
  },
  {
    key: "text-b",
    kind: "text",
    rects: [{ x: 40, y: 40, width: 80, height: 80 }],
  },
] satisfies PreviewHitTestLayer<string>[]

test("current paragraph background stays active while another paragraph overlaps it", () => {
  const target = resolvePreviewHitTestTarget({
    pageX: 60,
    pageY: 60,
    layers,
    currentTextKey: "text-a",
    includeLocked: true,
    imagePriority: "afterText",
  })

  assert.deepEqual(target, { kind: "text", key: "text-a" })
})

test("topmost paragraph background wins when no current paragraph is active", () => {
  const target = resolvePreviewHitTestTarget({
    pageX: 60,
    pageY: 60,
    layers,
    includeLocked: true,
    imagePriority: "afterText",
  })

  assert.deepEqual(target, { kind: "text", key: "text-b" })
})

test("selected unlocked layer has highest priority even when it is an image", () => {
  const target = resolvePreviewHitTestTarget({
    pageX: 60,
    pageY: 60,
    layers,
    selectedKey: "image-a",
    includeLocked: true,
    imagePriority: "afterText",
  })

  assert.deepEqual(target, { kind: "image", key: "image-a" })
})

test("selected locked layer is not hoverable", () => {
  const target = resolvePreviewHitTestTarget({
    pageX: 10,
    pageY: 10,
    layers: [{
      key: "text-locked",
      kind: "text",
      locked: true,
      rects: [{ x: 0, y: 0, width: 80, height: 80 }],
    }],
    selectedKey: "text-locked",
    includeLocked: true,
    imagePriority: "afterText",
  })

  assert.equal(target, null)
})

test("images are lower priority than text and win only when no text is hit", () => {
  assert.deepEqual(
    resolvePreviewHitTestTarget({
      pageX: 60,
      pageY: 60,
      layers,
      includeLocked: true,
      imagePriority: "afterText",
    }),
    { kind: "text", key: "text-b" },
  )

  assert.deepEqual(
    resolvePreviewHitTestTarget({
      pageX: 10,
      pageY: 10,
      layers,
      includeLocked: true,
      imagePriority: "afterText",
    }),
    { kind: "image", key: "image-a" },
  )
})
