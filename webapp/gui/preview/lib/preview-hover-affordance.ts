import type { BlockRect } from "@/gui/preview/lib/preview-types"

const ACTION_BUTTON_SIZE = 22
const ACTION_BUTTON_GAP = 4
const ACTION_EDGE_INSET = 0
const RESIZE_HANDLE_SIZE = 10
const RESIZE_HANDLE_HIT_PADDING = 6
const PARAGRAPH_MENU_FALLBACK_WIDTH = 224
const PARAGRAPH_MENU_MIN_WIDTH = 180
const PARAGRAPH_MENU_MAX_WIDTH = 240

export function isPointWithinRect(pageX: number, pageY: number, rect: BlockRect | null | undefined): boolean {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false
  return (
    pageX >= rect.x
    && pageX <= rect.x + rect.width
    && pageY >= rect.y
    && pageY <= rect.y + rect.height
  )
}

export function resolvePreviewHoverBandRect({
  targetRect,
  pageWidth,
  pageHeight,
}: {
  targetRect: BlockRect
  pageWidth: number
  pageHeight: number
}): BlockRect {
  const pageRectLeft = 0
  const pageRectTop = 0
  const pageRectRight = Math.max(0, pageWidth)
  const pageRectBottom = Math.max(0, pageHeight)
  const visibleLeft = Math.max(targetRect.x, pageRectLeft)
  const visibleTop = Math.max(targetRect.y, pageRectTop)
  const visibleRight = Math.min(targetRect.x + targetRect.width, pageRectRight)
  const visibleBottom = Math.min(targetRect.y + targetRect.height, pageRectBottom)
  const fallbackWidth = Math.max(1, Math.min(targetRect.width, Math.max(0, pageRectRight - pageRectLeft), pageWidth))
  const width = Math.max(1, visibleRight - visibleLeft || fallbackWidth)
  const bandHeight = Math.max(
    1,
    Math.min(
      ACTION_BUTTON_SIZE + ACTION_EDGE_INSET * 2,
      targetRect.height,
      Math.max(0, visibleBottom - visibleTop) || targetRect.height,
    ),
  )
  const minX = pageRectLeft
  const maxX = Math.min(pageWidth - width, pageRectRight - width)
  const minY = pageRectTop
  const maxY = Math.min(pageHeight - bandHeight, pageRectBottom - bandHeight)
  const anchorX = visibleRight > visibleLeft
    ? visibleLeft
    : targetRect.x < pageRectLeft
      ? pageRectLeft
      : Math.max(pageRectLeft, pageRectRight - width)
  const anchorY = visibleBottom > visibleTop
    ? visibleTop
    : targetRect.y < pageRectTop
      ? pageRectTop
      : Math.max(pageRectTop, pageRectBottom - bandHeight)
  const x = maxX >= minX
    ? Math.max(minX, Math.min(maxX, anchorX))
    : Math.max(0, Math.min(pageWidth - width, anchorX))
  const y = maxY >= minY
    ? Math.max(minY, Math.min(maxY, anchorY))
    : Math.max(0, Math.min(pageHeight - bandHeight, anchorY))

  return {
    x,
    y,
    width,
    height: bandHeight,
  }
}

export function resolvePreviewHoverPrimaryActionLeft(bandRect: BlockRect): number {
  return bandRect.x + ACTION_EDGE_INSET
}

export function resolvePreviewHoverDeleteActionLeft(
  bandRect: BlockRect,
  locked: boolean,
  leftActionCount = 2,
): number {
  const safeLeftActionCount = Math.max(1, Math.round(leftActionCount))
  const leftActionGroupWidth = ACTION_BUTTON_SIZE * safeLeftActionCount
    + ACTION_BUTTON_GAP * Math.max(0, safeLeftActionCount - 1)
  if (locked) return bandRect.x + ACTION_EDGE_INSET

  const preferredLeft = bandRect.x + bandRect.width - ACTION_BUTTON_SIZE - ACTION_EDGE_INSET
  return Math.max(
    resolvePreviewHoverPrimaryActionLeft(bandRect) + leftActionGroupWidth + ACTION_BUTTON_GAP,
    preferredLeft,
  )
}

export function resolvePreviewHoverActionTop(bandRect: BlockRect): number {
  return bandRect.y + ACTION_EDGE_INSET
}

export function resolvePreviewResizeHandleHitRect({
  targetRect,
}: {
  targetRect: BlockRect
}): BlockRect {
  const hitSize = RESIZE_HANDLE_SIZE + RESIZE_HANDLE_HIT_PADDING * 2
  return {
    x: targetRect.x + targetRect.width - hitSize / 2,
    y: targetRect.y + targetRect.height - hitSize / 2,
    width: hitSize,
    height: hitSize,
  }
}

export function shouldUseCompactParagraphActions(targetWidth: number): boolean {
  const fullActionWidth = ACTION_BUTTON_SIZE * 4
    + ACTION_BUTTON_GAP * 3
    + ACTION_EDGE_INSET * 2
  return !Number.isFinite(targetWidth) || targetWidth < fullActionWidth
}

export function resolvePreviewParagraphMenuWidth({
  left,
  verticalEdges,
  minWidth = PARAGRAPH_MENU_MIN_WIDTH,
  maxWidth = PARAGRAPH_MENU_MAX_WIDTH,
  fallbackWidth = PARAGRAPH_MENU_FALLBACK_WIDTH,
}: {
  left: number
  verticalEdges: readonly number[]
  minWidth?: number
  maxWidth?: number
  fallbackWidth?: number
}): number {
  const safeMin = Number.isFinite(minWidth) && minWidth > 0 ? minWidth : PARAGRAPH_MENU_MIN_WIDTH
  const safeMax = Number.isFinite(maxWidth) && maxWidth >= safeMin ? maxWidth : Math.max(safeMin, PARAGRAPH_MENU_MAX_WIDTH)
  const safeFallback = Math.min(
    safeMax,
    Math.max(safeMin, Number.isFinite(fallbackWidth) && fallbackWidth > 0 ? fallbackWidth : PARAGRAPH_MENU_FALLBACK_WIDTH),
  )
  if (!Number.isFinite(left)) return safeFallback

  const distances = verticalEdges
    .map((edge) => edge - left)
    .filter((distance) => Number.isFinite(distance) && distance > 0.5)
    .sort((a, b) => a - b)
  const inRange = distances.find((distance) => distance >= safeMin && distance <= safeMax)
  if (inRange !== undefined) return inRange
  const wider = distances.find((distance) => distance > safeMax)
  if (wider !== undefined) return safeMax
  if (distances.length > 0) return safeMin
  return safeFallback
}
