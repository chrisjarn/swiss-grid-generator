import type { BlockRect } from "@/core/layout/typography-layout-plan"

export type PreviewHitTestLayerKind = "text" | "image"

export type PreviewHitTestLayer<Key extends string> = {
  key: Key
  kind: PreviewHitTestLayerKind
  locked?: boolean
  rects: readonly BlockRect[]
}

export type PreviewHitTestTarget<Key extends string> = {
  key: Key
  kind: PreviewHitTestLayerKind
}

type ResolvePreviewHitTestTargetArgs<Key extends string> = {
  pageX: number
  pageY: number
  layers: readonly PreviewHitTestLayer<Key>[]
  selectedKey?: Key | null
  currentTextKey?: Key | null
  currentImageKey?: Key | null
  includeLocked?: boolean
  imagePriority?: "afterText" | "visual"
}

function isPointInsidePreviewHitRect(pageX: number, pageY: number, rect: BlockRect): boolean {
  if (rect.width <= 0 || rect.height <= 0) return false
  return (
    pageX >= rect.x
    && pageX <= rect.x + rect.width
    && pageY >= rect.y
    && pageY <= rect.y + rect.height
  )
}

function isPointInsidePreviewHitRects(
  pageX: number,
  pageY: number,
  rects: readonly BlockRect[],
): boolean {
  for (const rect of rects) {
    if (isPointInsidePreviewHitRect(pageX, pageY, rect)) return true
  }
  return false
}

function isLayerAllowedForHit<Key extends string>(
  layer: PreviewHitTestLayer<Key>,
  selectedKey: Key | null | undefined,
  includeLocked: boolean,
): boolean {
  if (layer.locked && layer.key === selectedKey) return false
  if (!includeLocked && layer.locked) return false
  return layer.rects.length > 0
}

function isLayerHit<Key extends string>(
  layer: PreviewHitTestLayer<Key>,
  pageX: number,
  pageY: number,
  selectedKey: Key | null | undefined,
  includeLocked: boolean,
): boolean {
  return (
    isLayerAllowedForHit(layer, selectedKey, includeLocked)
    && isPointInsidePreviewHitRects(pageX, pageY, layer.rects)
  )
}

function findLayerByKey<Key extends string>(
  layers: readonly PreviewHitTestLayer<Key>[],
  key: Key | null | undefined,
): PreviewHitTestLayer<Key> | null {
  if (!key) return null
  for (const layer of layers) {
    if (layer.key === key) return layer
  }
  return null
}

function findTopmostHitLayer<Key extends string>(
  layers: readonly PreviewHitTestLayer<Key>[],
  pageX: number,
  pageY: number,
  selectedKey: Key | null | undefined,
  includeLocked: boolean,
  kind?: PreviewHitTestLayerKind,
): PreviewHitTestLayer<Key> | null {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index]
    if (kind && layer.kind !== kind) continue
    if (layer.key === selectedKey) continue
    if (isLayerHit(layer, pageX, pageY, selectedKey, includeLocked)) return layer
  }
  return null
}

function toTarget<Key extends string>(
  layer: PreviewHitTestLayer<Key> | null,
): PreviewHitTestTarget<Key> | null {
  return layer ? { key: layer.key, kind: layer.kind } : null
}

export function resolvePreviewHitTestTarget<Key extends string>({
  pageX,
  pageY,
  layers,
  selectedKey = null,
  currentTextKey = null,
  currentImageKey = null,
  includeLocked = false,
  imagePriority = "visual",
}: ResolvePreviewHitTestTargetArgs<Key>): PreviewHitTestTarget<Key> | null {
  const selectedLayer = findLayerByKey(layers, selectedKey)
  if (selectedLayer && isLayerHit(selectedLayer, pageX, pageY, selectedKey, includeLocked)) {
    return toTarget(selectedLayer)
  }

  const currentTextLayer = findLayerByKey(layers, currentTextKey)
  if (
    currentTextLayer
    && currentTextLayer.kind === "text"
    && isLayerHit(currentTextLayer, pageX, pageY, selectedKey, includeLocked)
  ) {
    return toTarget(currentTextLayer)
  }

  if (imagePriority === "afterText") {
    const textLayer = findTopmostHitLayer(layers, pageX, pageY, selectedKey, includeLocked, "text")
    if (textLayer) return toTarget(textLayer)

    const currentImageLayer = findLayerByKey(layers, currentImageKey)
    if (
      currentImageLayer
      && currentImageLayer.kind === "image"
      && isLayerHit(currentImageLayer, pageX, pageY, selectedKey, includeLocked)
    ) {
      return toTarget(currentImageLayer)
    }

    return toTarget(findTopmostHitLayer(layers, pageX, pageY, selectedKey, includeLocked, "image"))
  }

  return toTarget(findTopmostHitLayer(layers, pageX, pageY, selectedKey, includeLocked))
}
