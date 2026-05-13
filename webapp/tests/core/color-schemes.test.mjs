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

test("image color schemes expose the restored palette set", () => {
  assert.deepEqual(
    IMAGE_COLOR_SCHEMES.map((scheme) => [scheme.label, scheme.colors]),
    [
      ["BRAUN Classic", ["#f0ede5", "#8a8a87", "#1a1a18", "#c02820"]],
      ["Coral Bay", ["#dddddd", "#fbae17", "#fe9f97", "#0095a3"]],
      ["Fresh Contrast", ["#fef9f7", "#ffeb00", "#1aa9bc", "#457c39"]],
      ["Industrial Ember", ["#ec6b2d", "#777870", "#333333", "#0d0f05"]],
      ["Mono", ["#ffffff", "#c0c0c0", "#808080", "#404040"]],
      ["Patina Clay", ["#f1f2f0", "#bfbabe", "#558a86", "#a63e14"]],
      ["Sage Pop", ["#e0e5db", "#e4bd0b", "#00b8b8", "#de3d83"]],
      ["SGG Core", ["#e5e7de", "#0098d8", "#2979c8", "#0b3536"]],
      ["Signal Cyan", ["#e0e5da", "#00aabb", "#f43530", "#46454b"]],
      ["Stone Cyan", ["#f1f2f0", "#e1e0dd", "#37bbe4", "#35342f"]],
      ["Swiss Modern", ["#e5e7de", "#fd8b7b", "#0098d8", "#0b3536"]],
    ],
  )
})

test("new image placeholders default to the third swatch", () => {
  const scheme = getImageColorScheme("swiss-modern")

  assert.equal(getImageSchemeColorReference(undefined, "swiss-modern"), "scheme:2")
  assert.equal(getDefaultImagePlaceholderColor("swiss-modern"), scheme.colors[2])
})

test("restored scheme ids normalize to themselves", () => {
  assert.equal(normalizeImageColorSchemeId("coral-bay"), "coral-bay")
  assert.equal(normalizeImageColorSchemeId("industrial-ember"), "industrial-ember")
})

test("legacy Swiss Classic id normalizes to SGG Core", () => {
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
