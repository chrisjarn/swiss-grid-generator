import { resolveBlockHeight } from "@/core/layout/block-height"
import { clampRotation } from "@/core/layout/block-constraints"
import { sumGridColumnSpan } from "@/core/layout/grid-column-layout"
import { findNearestAxisIndex } from "@/core/layout/grid-rhythm"
import { clampFreePlacementRow, clampLayerColumn, resolveLayerColumnBounds } from "@/core/layout/layer-placement"
import type { ModulePosition } from "@/core/types/layout-primitives"

export type ImagePlaceholderGeometryPlan<Key extends string> = {
  key: Key
  x: number
  y: number
  width: number
  height: number
  rotation: number
  rotationOriginX: number
  rotationOriginY: number
}

export type BuildImagePlaceholderGeometryPlanArgs<Key extends string> = {
  key: Key
  position: ModulePosition
  getImageSpan: (key: Key) => number
  getImageRows: (key: Key) => number
  getImageHeightBaselines: (key: Key) => number
  getImageRotation: (key: Key) => number
  isImageSnapToColumnsEnabled: (key: Key) => boolean
  isImageSnapToBaselineEnabled: (key: Key) => boolean
  toColumnX: (col: number) => number
  baselineOriginTop: number
  baselineStep: number
  baselineStepForHeight: number
  maxBaselineRow: number
  gridCols: number
  rowStartsInBaselines: readonly number[]
  gridRows: number
  moduleWidths: readonly number[]
  moduleHeights: readonly number[]
  columnStarts: readonly number[]
  gutterX: number
  gutterY: number
  fallbackModuleHeight: number
  outputScale?: number
}

export function buildImagePlaceholderGeometryPlan<Key extends string>({
  key,
  position,
  getImageSpan,
  getImageRows,
  getImageHeightBaselines,
  getImageRotation,
  isImageSnapToColumnsEnabled,
  isImageSnapToBaselineEnabled,
  toColumnX,
  baselineOriginTop,
  baselineStep,
  baselineStepForHeight,
  maxBaselineRow,
  gridCols,
  rowStartsInBaselines,
  gridRows,
  moduleWidths,
  moduleHeights,
  columnStarts,
  gutterX,
  gutterY,
  fallbackModuleHeight,
  outputScale = 1,
}: BuildImagePlaceholderGeometryPlanArgs<Key>): ImagePlaceholderGeometryPlan<Key> {
  const span = Math.max(1, Math.min(gridCols, getImageSpan(key)))
  const rows = getImageRows(key)
  const heightBaselines = getImageHeightBaselines(key)
  const snapToColumns = isImageSnapToColumnsEnabled(key)
  const snapToBaseline = isImageSnapToBaselineEnabled(key)
  const col = clampLayerColumn(snapToColumns ? Math.round(position.col) : position.col, {
    span,
    gridCols,
    snapToColumns,
  })
  const row = clampFreePlacementRow(
    snapToBaseline ? Math.round(position.row) : position.row,
    maxBaselineRow,
  )
  const rowStartIndex = Math.max(
    0,
    Math.min(Math.max(0, gridRows - 1), findNearestAxisIndex(rowStartsInBaselines, row)),
  )
  const { minCol } = resolveLayerColumnBounds({ span, gridCols, snapToColumns })
  const snappedStartCol = Math.max(minCol, Math.min(Math.max(0, gridCols - 1), Math.round(col)))
  const x = toColumnX(col)
  const y = baselineOriginTop + row * baselineStep + baselineStep

  return {
    key,
    x,
    y,
    width: sumGridColumnSpan(
      moduleWidths,
      columnStarts,
      snappedStartCol,
      span,
      gutterX,
    ) * outputScale,
    height: resolveBlockHeight({
      rowStart: rowStartIndex,
      rows,
      baselines: heightBaselines,
      gridRows,
      moduleHeights,
      fallbackModuleHeight: moduleHeights[rowStartIndex] ?? fallbackModuleHeight,
      gutterY,
      baselineStep: baselineStepForHeight,
    }) * outputScale,
    rotation: clampRotation(getImageRotation(key)),
    rotationOriginX: x,
    rotationOriginY: y,
  }
}
