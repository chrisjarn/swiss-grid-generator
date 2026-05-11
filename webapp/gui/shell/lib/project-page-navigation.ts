export type ProjectPageStepDirection = "previous" | "next"
export type ProjectPageBoundary = "first" | "last"

export function resolveAdjacentProjectPageId(
  pageIds: readonly string[],
  activePageId: string,
  direction: ProjectPageStepDirection,
  step = 1,
): string | null {
  if (pageIds.length <= 1) return null
  const activeIndex = pageIds.indexOf(activePageId)
  if (activeIndex === -1) return null
  const normalizedStep = Math.max(1, Math.floor(step))

  const nextIndex = direction === "previous"
    ? Math.max(0, activeIndex - normalizedStep)
    : Math.min(pageIds.length - 1, activeIndex + normalizedStep)

  if (nextIndex === activeIndex) return null
  return pageIds[nextIndex] ?? null
}

export function resolveProjectPageBoundaryId(
  pageIds: readonly string[],
  activePageId: string,
  boundary: ProjectPageBoundary,
): string | null {
  if (pageIds.length <= 1) return null
  const activeIndex = pageIds.indexOf(activePageId)
  if (activeIndex === -1) return null

  const targetIndex = boundary === "first" ? 0 : pageIds.length - 1
  if (targetIndex === activeIndex) return null
  return pageIds[targetIndex] ?? null
}
