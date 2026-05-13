import test from "node:test"
import assert from "node:assert/strict"

import {
  IMAGE_COLOR_SCHEMES,
  getDefaultImagePlaceholderColor,
  getDefaultTextSchemeColor,
  getImageColorScheme,
  getImageSchemeColorReference,
} from "../../core/config/color-schemes.ts"

test("image color schemes are ordered alphabetically", () => {
  const labels = IMAGE_COLOR_SCHEMES.map((scheme) => scheme.label)
  const sortedLabels = [...labels].sort((left, right) => left.localeCompare(right))

  assert.deepEqual(labels, sortedLabels)
})

test("new image placeholders default to the third swatch", () => {
  const scheme = getImageColorScheme("swiss-modern")

  assert.equal(getImageSchemeColorReference(undefined, "swiss-modern"), "scheme:2")
  assert.equal(getDefaultImagePlaceholderColor("swiss-modern"), scheme.colors[2])
})

test("text defaults keep the final scheme swatch", () => {
  const scheme = getImageColorScheme("swiss-modern")

  assert.equal(getDefaultTextSchemeColor("swiss-modern"), scheme.colors[3])
})
