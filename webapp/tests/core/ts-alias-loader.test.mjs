import test from "node:test"
import assert from "node:assert/strict"

test("ts alias loader resolves directory aliases through index files", async () => {
  const coreTypes = await import("@/core/types")
  assert.equal(typeof coreTypes, "object")
})
