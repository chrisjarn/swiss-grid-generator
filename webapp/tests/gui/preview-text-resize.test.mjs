import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveLayerResizeGeometry,
  resolveLayerResizePreviewGuideRects,
  resolveLayerResizeRect,
} from "@/gui/preview/lib/preview-text-resize"

const metrics = {
  contentLeft: 0,
  contentTop: 0,
  gridCols: 4,
  gridRows: 5,
  moduleWidths: [40, 40, 40, 40],
  moduleHeights: [24, 24, 24, 24, 24],
  colStarts: [0, 50, 100, 150],
  rowStarts: [0, 36, 72, 108, 144],
  scale: 1,
  baselineStep: 6,
}

test("shared resize handle snaps columns and rows to the modular field", () => {
  assert.deepEqual(
    resolveLayerResizeGeometry({
      metrics,
      startColumn: 0,
      startRow: 0,
      pageX: 142,
      pageY: 101,
      baselineMode: false,
      maxHeightBaselines: 4,
    }),
    {
      columns: 3,
      rows: 3,
      heightBaselines: 0,
    },
  )
})

test("shared resize handle resolves shift height by baseline steps", () => {
  assert.deepEqual(
    resolveLayerResizeGeometry({
      metrics,
      startColumn: 0,
      startRow: 0,
      pageX: 142,
      pageY: 48,
      baselineMode: true,
      maxHeightBaselines: 4,
    }),
    {
      columns: 3,
      rows: 1,
      heightBaselines: 4,
    },
  )
})

test("shared resize handle prefers full rows at exact module boundaries", () => {
  assert.deepEqual(
    resolveLayerResizeGeometry({
      metrics,
      startColumn: 0,
      startRow: 0,
      pageX: 142,
      pageY: 24,
      baselineMode: true,
      maxHeightBaselines: 4,
    }),
    {
      columns: 3,
      rows: 1,
      heightBaselines: 0,
    },
  )
})

test("shared resize preview resolves frame and optional column guide rects without text layout", () => {
  const geometry = {
    columns: 3,
    rows: 2,
    heightBaselines: 1,
  }
  const rect = resolveLayerResizeRect({
    metrics,
    startColumn: 1,
    startRow: 1,
    geometry,
  })

  assert.deepEqual(rect, {
    x: 50,
    y: 36,
    width: 140,
    height: 66,
  })
  assert.deepEqual(
    resolveLayerResizePreviewGuideRects({
      metrics,
      startColumn: 1,
      rect,
      columns: geometry.columns,
      columnReflowActive: true,
    }),
    [
      { x: 50, y: 36, width: 40, height: 66 },
      { x: 100, y: 36, width: 40, height: 66 },
      { x: 150, y: 36, width: 40, height: 66 },
    ],
  )
  assert.deepEqual(
    resolveLayerResizePreviewGuideRects({
      metrics,
      startColumn: 1,
      rect,
      columns: geometry.columns,
      columnReflowActive: false,
    }),
    [rect],
  )
})
