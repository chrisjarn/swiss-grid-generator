import test from "node:test"
import assert from "node:assert/strict"

import { resolveTextCopyAffordanceAction } from "../lib/preview-copy-affordance.ts"

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
