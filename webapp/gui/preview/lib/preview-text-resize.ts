export type PreviewTextResizeMetrics = {
  contentLeft: number
  contentTop: number
  gridCols: number
  gridRows: number
  moduleWidths: readonly number[]
  moduleHeights: readonly number[]
  colStarts: readonly number[]
  rowStarts: readonly number[]
  scale: number
  baselineStep: number
}

export type PreviewTextResizeGeometry = {
  columns: number
  rows: number
  heightBaselines: number
}

export type PreviewTextResizeRect = {
  x: number
  y: number
  width: number
  height: number
}

export type PreviewLayerResizeMetrics = PreviewTextResizeMetrics
export type PreviewLayerResizeGeometry = PreviewTextResizeGeometry
export type PreviewLayerResizeRect = PreviewTextResizeRect

type ResolveTextResizeGeometryArgs = {
  metrics: PreviewTextResizeMetrics
  startColumn: number
  startRow: number
  pageX: number
  pageY: number
  baselineMode: boolean
  maxHeightBaselines: number
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

function findNearestCandidate<T>(
  candidates: readonly T[],
  getDistance: (candidate: T) => number,
): T | null {
  let nearest: T | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const distance = getDistance(candidate)
    if (distance < nearestDistance) {
      nearest = candidate
      nearestDistance = distance
    }
  }
  return nearest
}

function findNearestHeightCandidate(
  candidates: readonly PreviewTextResizeGeometry[],
  getDistance: (candidate: PreviewTextResizeGeometry) => number,
): PreviewTextResizeGeometry | null {
  let nearest: PreviewTextResizeGeometry | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  const epsilon = 0.000001
  for (const candidate of candidates) {
    const distance = getDistance(candidate)
    const isCloser = distance < nearestDistance - epsilon
    const isBetterTie = Math.abs(distance - nearestDistance) <= epsilon
      && nearest !== null
      && (
        candidate.rows > nearest.rows
        || (candidate.rows === nearest.rows && candidate.heightBaselines < nearest.heightBaselines)
      )
    if (isCloser || isBetterTie) {
      nearest = candidate
      nearestDistance = distance
    }
  }
  return nearest
}

function getColumnRightEdge({
  metrics,
  startColumn,
  columns,
}: {
  metrics: PreviewTextResizeMetrics
  startColumn: number
  columns: number
}): number {
  const rightColumn = startColumn + columns - 1
  const start = metrics.colStarts[rightColumn] ?? 0
  const width = metrics.moduleWidths[rightColumn] ?? metrics.moduleWidths[metrics.moduleWidths.length - 1] ?? 0
  return metrics.contentLeft + (start + width) * metrics.scale
}

function getRowBottomEdge({
  metrics,
  startRow,
  rows,
  heightBaselines,
}: {
  metrics: PreviewTextResizeMetrics
  startRow: number
  rows: number
  heightBaselines: number
}): number {
  if (rows <= 0) {
    return metrics.contentTop + (metrics.rowStarts[startRow] ?? 0) * metrics.scale + heightBaselines * metrics.baselineStep
  }
  const bottomRow = startRow + rows - 1
  const start = metrics.rowStarts[bottomRow] ?? 0
  const height = metrics.moduleHeights[bottomRow] ?? metrics.moduleHeights[metrics.moduleHeights.length - 1] ?? 0
  return metrics.contentTop + (start + height) * metrics.scale + heightBaselines * metrics.baselineStep
}

export function resolveTextResizeRect({
  metrics,
  startColumn,
  startRow,
  geometry,
}: {
  metrics: PreviewTextResizeMetrics
  startColumn: number
  startRow: number
  geometry: PreviewTextResizeGeometry
}): PreviewTextResizeRect {
  const safeStartColumn = clampInteger(startColumn, 0, Math.max(0, metrics.gridCols - 1))
  const safeStartRow = clampInteger(startRow, 0, Math.max(0, metrics.gridRows - 1))
  const safeColumns = clampInteger(geometry.columns, 1, Math.max(1, metrics.gridCols - safeStartColumn))
  const left = metrics.contentLeft + (metrics.colStarts[safeStartColumn] ?? 0) * metrics.scale
  const top = metrics.contentTop + (metrics.rowStarts[safeStartRow] ?? 0) * metrics.scale
  const right = getColumnRightEdge({
    metrics,
    startColumn: safeStartColumn,
    columns: safeColumns,
  })
  const bottom = getRowBottomEdge({
    metrics,
    startRow: safeStartRow,
    rows: geometry.rows,
    heightBaselines: geometry.heightBaselines,
  })
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

export function resolveTextResizeGuideRects({
  metrics,
  startColumn,
  rect,
  columns,
}: {
  metrics: PreviewTextResizeMetrics
  startColumn: number
  rect: PreviewTextResizeRect
  columns: number
}): PreviewTextResizeRect[] {
  const safeStartColumn = clampInteger(startColumn, 0, Math.max(0, metrics.gridCols - 1))
  const safeColumns = clampInteger(columns, 1, Math.max(1, metrics.gridCols - safeStartColumn))
  return Array.from({ length: safeColumns }, (_, index) => {
    const column = safeStartColumn + index
    return {
      x: metrics.contentLeft + (metrics.colStarts[column] ?? 0) * metrics.scale,
      y: rect.y,
      width: (metrics.moduleWidths[column] ?? 0) * metrics.scale,
      height: rect.height,
    }
  })
}

export function resolveTextResizePreviewGuideRects({
  metrics,
  startColumn,
  rect,
  columns,
  columnReflowActive,
}: {
  metrics: PreviewTextResizeMetrics
  startColumn: number
  rect: PreviewTextResizeRect
  columns: number
  columnReflowActive: boolean
}): PreviewTextResizeRect[] {
  if (!columnReflowActive || columns <= 1) return [rect]
  return resolveTextResizeGuideRects({
    metrics,
    startColumn,
    rect,
    columns,
  })
}

export function resolveTextResizeGeometry({
  metrics,
  startColumn,
  startRow,
  pageX,
  pageY,
  baselineMode,
  maxHeightBaselines,
}: ResolveTextResizeGeometryArgs): PreviewTextResizeGeometry {
  const safeStartColumn = clampInteger(startColumn, 0, Math.max(0, metrics.gridCols - 1))
  const safeStartRow = clampInteger(startRow, 0, Math.max(0, metrics.gridRows - 1))
  const maxColumns = Math.max(1, metrics.gridCols - safeStartColumn)
  const maxRows = Math.max(1, metrics.gridRows - safeStartRow)
  const maxBaselines = Math.max(0, Math.round(maxHeightBaselines))

  const columnCandidates = Array.from({ length: maxColumns }, (_, index) => index + 1)
  const columns = findNearestCandidate(columnCandidates, (candidate) => Math.abs(
    pageX - getColumnRightEdge({
      metrics,
      startColumn: safeStartColumn,
      columns: candidate,
    }),
  )) ?? 1

  if (!baselineMode) {
    const rowCandidates = Array.from({ length: maxRows }, (_, index) => index + 1)
    const rows = findNearestCandidate(rowCandidates, (candidate) => Math.abs(
      pageY - getRowBottomEdge({
        metrics,
        startRow: safeStartRow,
        rows: candidate,
        heightBaselines: 0,
      }),
    )) ?? 1

    return {
      columns,
      rows,
      heightBaselines: 0,
    }
  }

  const heightCandidates: PreviewTextResizeGeometry[] = []
  for (let rows = 0; rows <= maxRows; rows += 1) {
    for (let heightBaselines = 0; heightBaselines <= maxBaselines; heightBaselines += 1) {
      if (rows === 0 && heightBaselines === 0) continue
      heightCandidates.push({ columns, rows, heightBaselines })
    }
  }
  const height = findNearestHeightCandidate(heightCandidates, (candidate) => Math.abs(
    pageY - getRowBottomEdge({
      metrics,
      startRow: safeStartRow,
      rows: candidate.rows,
      heightBaselines: candidate.heightBaselines,
    }),
  )) ?? { columns, rows: 1, heightBaselines: 0 }

  return {
    columns,
    rows: height.rows,
    heightBaselines: height.heightBaselines,
  }
}

export const resolveLayerResizeGeometry = resolveTextResizeGeometry
export const resolveLayerResizeRect = resolveTextResizeRect
export const resolveLayerResizeGuideRects = resolveTextResizeGuideRects
export const resolveLayerResizePreviewGuideRects = resolveTextResizePreviewGuideRects
