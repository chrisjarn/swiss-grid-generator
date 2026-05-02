import test from "node:test"
import assert from "node:assert/strict"

import { resolvePreviewHoverTarget } from "../lib/preview-hover-target.ts"

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
