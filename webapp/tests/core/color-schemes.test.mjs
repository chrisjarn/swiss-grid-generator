import test from "node:test"
import assert from "node:assert/strict"

import {
  IMAGE_COLOR_SCHEMES,
  getDefaultImagePlaceholderColor,
  getDefaultTextSchemeColor,
  getImageColorScheme,
  getImageSchemeColorReference,
  normalizeImageColorSchemeId,
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

test("removed scheme ids normalize to retained schemes", () => {
  assert.equal(normalizeImageColorSchemeId("coral-bay"), "fresh-contrast")
  assert.equal(normalizeImageColorSchemeId("industrial-ember"), "signal-cyan")
  assert.equal(normalizeImageColorSchemeId("swiss-classic"), "sgg-core")
})

test("Braun Classic keeps warm black as the default text and image color", () => {
  assert.equal(getImageSchemeColorReference(undefined, "braun-classic"), "scheme:2")
  assert.equal(getDefaultImagePlaceholderColor("braun-classic"), "#1a1a18")
  assert.equal(getDefaultTextSchemeColor("braun-classic"), "#1a1a18")
})

test("text defaults keep the final scheme swatch", () => {
  const scheme = getImageColorScheme("swiss-modern")

  assert.equal(getDefaultTextSchemeColor("swiss-modern"), scheme.colors[3])
})
