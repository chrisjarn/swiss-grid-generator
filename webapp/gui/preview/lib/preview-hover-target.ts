export type PreviewHoverTarget<Key extends string> =
  | { kind: "text"; key: Key }
  | { kind: "image"; key: Key }

type Args<Key extends string> = {
  pageX: number
  pageY: number
  currentTextKey: Key | null
  currentImageKey: Key | null
  findTopmostHoverTargetAtPoint?: (
    pageX: number,
    pageY: number,
    currentTextKey: Key | null,
    currentImageKey: Key | null,
  ) => PreviewHoverTarget<Key> | null
  findTopmostBlockAtPoint: (pageX: number, pageY: number) => Key | null
  findTopmostImageAtPoint: (pageX: number, pageY: number) => Key | null
  isPointWithinHoverTarget: (key: Key, pageX: number, pageY: number) => boolean
  isPointWithinHoverAffordanceTarget?: (key: Key, pageX: number, pageY: number) => boolean
}

export function resolvePreviewHoverTarget<Key extends string>({
  pageX,
  pageY,
  currentTextKey,
  currentImageKey,
  findTopmostHoverTargetAtPoint,
  findTopmostBlockAtPoint,
  findTopmostImageAtPoint,
  isPointWithinHoverTarget,
  isPointWithinHoverAffordanceTarget,
}: Args<Key>): PreviewHoverTarget<Key> | null {
  if (
    currentTextKey
    && isPointWithinHoverAffordanceTarget?.(currentTextKey, pageX, pageY)
  ) {
    return { kind: "text", key: currentTextKey }
  }

  if (
    currentImageKey
    && isPointWithinHoverAffordanceTarget?.(currentImageKey, pageX, pageY)
  ) {
    return { kind: "image", key: currentImageKey }
  }

  const topmostHoverTarget = findTopmostHoverTargetAtPoint?.(
    pageX,
    pageY,
    currentTextKey,
    currentImageKey,
  )
  if (topmostHoverTarget) return topmostHoverTarget

  const topmostTextKey = findTopmostBlockAtPoint(pageX, pageY)
  if (topmostTextKey) return { kind: "text", key: topmostTextKey }

  const topmostImageKey = findTopmostImageAtPoint(pageX, pageY)
  if (topmostImageKey) return { kind: "image", key: topmostImageKey }

  if (currentTextKey && isPointWithinHoverTarget(currentTextKey, pageX, pageY)) {
    return { kind: "text", key: currentTextKey }
  }

  if (currentImageKey && isPointWithinHoverTarget(currentImageKey, pageX, pageY)) {
    return { kind: "image", key: currentImageKey }
  }

  return null
}
