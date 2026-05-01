import test from "node:test"
import assert from "node:assert/strict"

import {
  EDITOR_OWNED_TARGET_SELECTOR,
  eventPathHasEditorOwnedTarget,
  isEditorOwnedEventTarget,
} from "../lib/editor-interaction-ownership.ts"

class FakeNode {
  constructor(parent = null) {
    this.parent = parent
  }

  contains(target) {
    let current = target
    while (current) {
      if (current === this) return true
      current = current.parent
    }
    return false
  }
}

class FakeElement extends FakeNode {
  constructor(selectors = [], parent = null) {
    super(parent)
    this.selectors = new Set(selectors)
  }

  closest(selectorText) {
    const selectors = selectorText.split(",").map((selector) => selector.trim())
    let current = this
    while (current) {
      if (selectors.some((selector) => current.selectors?.has(selector))) return current
      current = current.parent
    }
    return null
  }
}

test("editor-owned selector includes the left sidebar preserve root", () => {
  assert.match(EDITOR_OWNED_TARGET_SELECTOR, /data-editor-mode-preserve-root/)
})

test("left sidebar descendants are treated as editor-owned targets", () => {
  const previousNode = globalThis.Node
  const previousElement = globalThis.Element
  globalThis.Node = FakeNode
  globalThis.Element = FakeElement

  try {
    const sidebar = new FakeElement(['[data-editor-mode-preserve-root="true"]'])
    const input = new FakeElement([], sidebar)
    assert.equal(isEditorOwnedEventTarget(input), true)
  } finally {
    globalThis.Node = previousNode
    globalThis.Element = previousElement
  }
})

test("outside pointer ownership checks the composed path and owned host nodes", () => {
  const previousNode = globalThis.Node
  const previousElement = globalThis.Element
  globalThis.Node = FakeNode
  globalThis.Element = FakeElement

  try {
    const host = new FakeElement()
    const hostInput = new FakeElement([], host)
    const portalRoot = new FakeElement(['[data-editor-interactive-root="true"]'])
    const portalItem = new FakeElement([], portalRoot)

    assert.equal(
      eventPathHasEditorOwnedTarget(
        { target: hostInput, composedPath: () => [hostInput, host] },
        [host],
      ),
      true,
    )
    assert.equal(
      eventPathHasEditorOwnedTarget(
        { target: portalItem, composedPath: () => [portalItem, portalRoot] },
        [],
      ),
      true,
    )
  } finally {
    globalThis.Node = previousNode
    globalThis.Element = previousElement
  }
})
