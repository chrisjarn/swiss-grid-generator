import type { BlockRect, BlockRenderPlan } from "@/gui/preview/lib/preview-types"

export type PreviewTextGuideGeometry = {
  horizontalX: number
  verticalX: number
  y: number
  width: number
  height: number
}

function getFallbackPreviewTextGuideRect<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "rect" | "rotationOriginX" | "rotationOriginY">,
): BlockRect {
  return {
    x: plan.rotationOriginX,
    y: plan.rotationOriginY,
    width: plan.rect.width,
    height: plan.rect.height,
  }
}

export function getPreviewTextGuideRects<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY">,
): BlockRect[] {
  if (plan.guideRects.length > 0) return plan.guideRects
  return [getFallbackPreviewTextGuideRect(plan)]
}

export function getPreviewTextGuideBounds<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY">,
): BlockRect {
  const guideRects = getPreviewTextGuideRects(plan)
  const left = Math.min(...guideRects.map((rect) => rect.x))
  const top = Math.min(...guideRects.map((rect) => rect.y))
  const right = Math.max(...guideRects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...guideRects.map((rect) => rect.y + rect.height))

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }
}

export function getPreviewTextGuideRect<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY">,
): BlockRect {
  return getPreviewTextGuideRects(plan)[0]
}

export function getPreviewTextGuideGeometry<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY" | "textAlign"> & {
    renderedLines: { left: number; top: number; width: number; baselineY: number }[]
    commands: { x: number; y: number }[]
  },
  targetGuideRect?: BlockRect | null,
): PreviewTextGuideGeometry {
  const guideRect = targetGuideRect ?? getPreviewTextGuideRect(plan)

  return {
    horizontalX: guideRect.x,
    verticalX: guideRect.x,
    y: guideRect.y,
    width: guideRect.width,
    height: guideRect.height,
  }
}
