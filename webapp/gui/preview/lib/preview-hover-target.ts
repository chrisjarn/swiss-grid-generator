export type PreviewHoverTarget<Key extends string> =
  | { kind: "text"; key: Key }
  | { kind: "image"; key: Key }

type Args<Key extends string> = {
  pageX: number
  pageY: number
  currentTextKey: Key | null
  currentImageKey: Key | null
  findTopmostBlockAtPoint: (pageX: number, pageY: number) => Key | null
  findTopmostImageAtPoint: (pageX: number, pageY: number) => Key | null
  isPointWithinHoverTarget: (key: Key, pageX: number, pageY: number) => boolean
}

export function resolvePreviewHoverTarget<Key extends string>({
  pageX,
  pageY,
  currentTextKey,
  currentImageKey,
  findTopmostBlockAtPoint,
  findTopmostImageAtPoint,
  isPointWithinHoverTarget,
}: Args<Key>): PreviewHoverTarget<Key> | null {
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
