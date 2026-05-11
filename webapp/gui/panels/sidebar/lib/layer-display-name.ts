export function getTextLayerDisplayName(value: string, emptyLabel = "empty"): string {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return emptyLabel
  return normalized.length > 75 ? `${normalized.slice(0, 75)}...` : normalized
}
