export const EDITOR_OWNED_TARGET_SELECTOR = [
  '[data-editor-interactive-root="true"]',
  '[data-editor-mode-preserve-root="true"]',
  '[data-editor-retarget-root="true"]',
  '[data-preview-edit-affordance="true"]',
].join(", ")

export function isEditorOwnedEventTarget(
  target: EventTarget | null,
  ownedNodes: readonly (Node | null | undefined)[] = [],
): boolean {
  if (typeof Node !== "undefined" && target instanceof Node) {
    for (const node of ownedNodes) {
      if (node?.contains(target)) return true
    }
  }

  if (typeof Element === "undefined" || !(target instanceof Element)) return false
  return Boolean(target.closest(EDITOR_OWNED_TARGET_SELECTOR))
}

export function eventPathHasEditorOwnedTarget(
  event: Event,
  ownedNodes: readonly (Node | null | undefined)[] = [],
): boolean {
  if (isEditorOwnedEventTarget(event.target, ownedNodes)) return true

  const composedPath = typeof event.composedPath === "function"
    ? event.composedPath()
    : []

  return composedPath.some((target) => isEditorOwnedEventTarget(target, ownedNodes))
}
