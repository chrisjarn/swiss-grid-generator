import test from "node:test"
import assert from "node:assert/strict"

import { buildTypographyLayoutPlan } from "../lib/typography-layout-plan.ts"

test("newspaper reflow advances to the next column before using the bottom gutter as line space", () => {
  const lines = ["L1", "L2", "L3", "L4", "L5"].map((text, index) => ({
    text,
    sourceStart: index * 2,
    sourceEnd: index * 2 + 2,
  }))

  const { plans } = buildTypographyLayoutPlan({
    blockOrder: ["body"],
    textContent: { body: "ignored" },
    styleAssignments: { body: "body" },
    styles: {
      body: {
        size: 10,
        baselineMultiplier: 1,
      },
    },
    blockTextAlignments: {},
    blockVerticalAlignments: {},
    contentTop: 0,
    contentLeft: 0,
    pageHeight: 400,
    marginsBottom: 0,
    baselineStep: 10,
    moduleWidth: 50,
    moduleHeight: 40,
    gutterX: 10,
    gutterY: 10,
    gridRows: 1,
    gridCols: 2,
    fontScale: 1,
    bodyKey: "body",
    displayKey: "display",
    captionKey: "caption",
    defaultBodyStyleKey: "body",
    defaultCaptionStyleKey: "body",
    getBlockSpan: () => 2,
    getBlockRows: () => 1,
    getBlockHeightBaselines: () => 0,
    getBlockRotation: () => 0,
    isTextReflowEnabled: () => true,
    isSyllableDivisionEnabled: () => false,
    getOriginForBlock: (_key, fallbackX, fallbackY) => ({ x: fallbackX, y: fallbackY }),
    createTextContext: () => ({}),
    wrapText: () => lines,
    textAscent: () => 8,
    textDescent: () => 2,
    opticalOffset: () => 0,
  })

  assert.equal(plans.length, 1)
  const plan = plans[0]
  assert.equal(plan.commands.length, 5)
  assert.deepEqual(
    plan.commands.map((command) => command.x),
    [0, 0, 0, 0, 60],
  )
})

test("empty paragraphs still produce a planned frame and guide geometry", () => {
  const { plans, rects, overflowByBlock } = buildTypographyLayoutPlan({
    blockOrder: ["body"],
    textContent: { body: "" },
    styleAssignments: { body: "body" },
    styles: {
      body: {
        size: 10,
        baselineMultiplier: 1,
      },
    },
    blockTextAlignments: {},
    blockVerticalAlignments: {},
    contentTop: 0,
    contentLeft: 0,
    pageHeight: 400,
    marginsBottom: 0,
    baselineStep: 10,
    moduleWidth: 50,
    moduleHeight: 40,
    gutterX: 10,
    gutterY: 10,
    gridRows: 1,
    gridCols: 1,
    fontScale: 1,
    bodyKey: "body",
    displayKey: "display",
    captionKey: "caption",
    defaultBodyStyleKey: "body",
    defaultCaptionStyleKey: "body",
    getBlockSpan: () => 1,
    getBlockRows: () => 1,
    getBlockHeightBaselines: () => 0,
    getBlockRotation: () => 0,
    isTextReflowEnabled: () => false,
    isSyllableDivisionEnabled: () => false,
    getOriginForBlock: (_key, fallbackX, fallbackY) => ({ x: fallbackX, y: fallbackY }),
    createTextContext: () => ({}),
    wrapText: () => [{
      text: "",
      sourceStart: 0,
      sourceEnd: 0,
    }],
    textAscent: () => 8,
    textDescent: () => 2,
    opticalOffset: () => 0,
  })

  assert.equal(plans.length, 1)
  assert.deepEqual(rects.body, {
    x: 0,
    y: 0,
    width: 50,
    height: 50,
  })
  assert.deepEqual(plans[0].guideRects, [{
    x: 0,
    y: 20,
    width: 50,
    height: 40,
  }])
  assert.equal(plans[0].commands.length, 1)
  assert.equal(plans[0].commands[0].text, "")
  assert.equal(plans[0].commands[0].x, 0)
  assert.equal(plans[0].commands[0].y, 28)
  assert.equal(plans[0].commands[0].sourceStart, 0)
  assert.equal(plans[0].commands[0].sourceEnd, 0)
  assert.equal(overflowByBlock.body, 0)
})
