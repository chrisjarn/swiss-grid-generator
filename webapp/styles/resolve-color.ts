export function readUiColor(name: string, fallback = "transparent"): string {
  if (typeof document === "undefined") return fallback
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function withColorAlpha(color: string, alpha: number): string {
  const normalized = color.trim()
  const hex = normalized.match(/^#([0-9a-f]{6})$/i)
  if (!hex) return normalized
  const value = hex[1]
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
