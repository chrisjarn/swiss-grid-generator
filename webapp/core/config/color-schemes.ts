type ImageColorSlotIndex = 0 | 1 | 2 | 3

export type ImageColorScheme = {
  id: string
  label: string
  colors: readonly [string, string, string, string]
  defaultTextSlotIndex?: ImageColorSlotIndex
}

const IMAGE_COLOR_SLOT_COUNT = 4
const IMAGE_COLOR_REFERENCE_PREFIX = "scheme:"
const DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX = 2
const DEFAULT_TEXT_SCHEME_SLOT_INDEX = IMAGE_COLOR_SLOT_COUNT - 1

function clampImageColorSlotIndex(index: number): ImageColorSlotIndex {
  return Math.max(0, Math.min(IMAGE_COLOR_SLOT_COUNT - 1, Math.round(index))) as ImageColorSlotIndex
}

function getChannelLuminance(channel: number): number {
  const value = channel / 255
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
}

function getHexRelativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "")
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return (
    0.2126 * getChannelLuminance(red)
    + 0.7152 * getChannelLuminance(green)
    + 0.0722 * getChannelLuminance(blue)
  )
}

export const IMAGE_COLOR_SCHEMES = [
  {
    id: "braun-classic",
    label: "BRAUN Classic",
    colors: ["#f0ede5", "#8a8a87", "#1a1a18", "#c02820"],
    defaultTextSlotIndex: 2,
  },
  {
    id: "coral-bay",
    label: "Coral Bay",
    colors: ["#dddddd", "#fbae17", "#fe9f97", "#0095a3"],
  },
  {
    id: "fresh-contrast",
    label: "Fresh Contrast",
    colors: ["#fef9f7", "#ffeb00", "#1aa9bc", "#457c39"],
  },
  {
    id: "industrial-ember",
    label: "Industrial Ember",
    colors: ["#ec6b2d", "#777870", "#333333", "#0d0f05"],
  },
  {
    id: "mono",
    label: "Mono",
    colors: ["#ffffff", "#c0c0c0", "#808080", "#404040"],
  },
  {
    id: "patina-clay",
    label: "Patina Clay",
    colors: ["#f1f2f0", "#bfbabe", "#558a86", "#a63e14"],
  },
  {
    id: "sage-pop",
    label: "Sage Pop",
    colors: ["#e0e5db", "#e4bd0b", "#00b8b8", "#de3d83"],
  },
  {
    id: "sgg-core",
    label: "SGG Core",
    colors: ["#e5e7de", "#0098d8", "#2979c8", "#0b3536"],
  },
  {
    id: "signal-cyan",
    label: "Signal Cyan",
    colors: ["#e0e5da", "#00aabb", "#f43530", "#46454b"],
  },
  {
    id: "stone-cyan",
    label: "Stone Cyan",
    colors: ["#f1f2f0", "#e1e0dd", "#37bbe4", "#35342f"],
  },
  {
    id: "swiss-modern",
    label: "Swiss Modern",
    colors: ["#e5e7de", "#fd8b7b", "#0098d8", "#0b3536"],
  },
  // --- MICE brand themes (additive; slots map to primitive colour roles: paper, muted, ink, brand) ---
  {
    id: "brand-ibis",
    label: "ibis",
    colors: ["#ffffff", "#9b9b9b", "#1a1a1a", "#e10025"],
    defaultTextSlotIndex: 2,
  },
  {
    id: "brand-holiday-inn",
    label: "Holiday Inn",
    colors: ["#ffffff", "#8a8a87", "#1a1a1a", "#1c5c45"],
    defaultTextSlotIndex: 2,
  },
] as const satisfies readonly ImageColorScheme[]

export type ImageColorSchemeId = (typeof IMAGE_COLOR_SCHEMES)[number]["id"]
export type CanvasBackgroundColor = string | null

const LEGACY_IMAGE_COLOR_SCHEME_ALIASES: Record<string, ImageColorSchemeId> = {
  s1: "swiss-modern",
  s2: "stone-cyan",
  s3: "fresh-contrast",
  s4: "swiss-modern",
  "swiss-classic": "sgg-core",
}

const IMAGE_COLOR_SCHEME_IDS = new Set<ImageColorSchemeId>(
  IMAGE_COLOR_SCHEMES.map((scheme) => scheme.id),
)

const IMAGE_PLACEHOLDER_COLORS = new Set<string>(
  IMAGE_COLOR_SCHEMES.flatMap((scheme) => [...scheme.colors].map((color) => color.toLowerCase())),
)

export const DEFAULT_IMAGE_COLOR_SCHEME_ID: ImageColorSchemeId = "swiss-modern"

export function isImageColorSchemeId(value: unknown): value is ImageColorSchemeId {
  return typeof value === "string" && IMAGE_COLOR_SCHEME_IDS.has(value as ImageColorSchemeId)
}

export function normalizeImageColorSchemeId(value: unknown): ImageColorSchemeId | null {
  if (typeof value !== "string") return null
  if (isImageColorSchemeId(value)) return value
  return LEGACY_IMAGE_COLOR_SCHEME_ALIASES[value] ?? null
}

export function getImageColorScheme(id: ImageColorSchemeId): (typeof IMAGE_COLOR_SCHEMES)[number] {
  return (
    IMAGE_COLOR_SCHEMES.find((scheme) => scheme.id === id)
    ?? IMAGE_COLOR_SCHEMES.find((scheme) => scheme.id === DEFAULT_IMAGE_COLOR_SCHEME_ID)
    ?? IMAGE_COLOR_SCHEMES[0]
  )
}

export function getDefaultImagePlaceholderColor(id: ImageColorSchemeId): string {
  return getImageColorScheme(id).colors[DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX]
}

export function getDefaultTextSchemeColor(id: ImageColorSchemeId): string {
  const scheme = getImageColorScheme(id)
  return scheme.colors[(scheme as ImageColorScheme).defaultTextSlotIndex ?? DEFAULT_TEXT_SCHEME_SLOT_INDEX]
}

export function getImageSchemeColorByIndex(id: ImageColorSchemeId, index: number): string {
  const scheme = getImageColorScheme(id)
  return scheme.colors[clampImageColorSlotIndex(index)] ?? scheme.colors[0]
}

export function getImageSchemeColorToken(index: number): string {
  return `${IMAGE_COLOR_REFERENCE_PREFIX}${clampImageColorSlotIndex(index)}`
}

export function getImageSchemeColorIndex(value: unknown): ImageColorSlotIndex | null {
  if (typeof value !== "string" || !value.startsWith(IMAGE_COLOR_REFERENCE_PREFIX)) return null
  const rawIndex = Number.parseInt(value.slice(IMAGE_COLOR_REFERENCE_PREFIX.length), 10)
  if (!Number.isFinite(rawIndex)) return null
  return clampImageColorSlotIndex(rawIndex)
}

export function isImageSchemeColorToken(value: unknown): value is string {
  return getImageSchemeColorIndex(value) !== null
}

export function resolveImageSchemeColor(value: unknown, schemeId: ImageColorSchemeId): string {
  const colorIndex = getImageSchemeColorIndex(value)
  if (colorIndex !== null) {
    return getImageSchemeColorByIndex(schemeId, colorIndex)
  }
  if (typeof value === "string" && isImagePlaceholderColor(value)) {
    return value.toLowerCase()
  }
  return getDefaultImagePlaceholderColor(schemeId)
}

export function resolveTextSchemeColor(value: unknown, schemeId: ImageColorSchemeId): string {
  const colorIndex = getImageSchemeColorIndex(value)
  if (colorIndex !== null) {
    return getImageSchemeColorByIndex(schemeId, colorIndex)
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length === 0) return getDefaultTextSchemeColor(schemeId)
    if (isImagePlaceholderColor(trimmed)) {
      return trimmed.toLowerCase()
    }
    return trimmed
  }
  return getDefaultTextSchemeColor(schemeId)
}

export function getImageSchemeColorReference(value: unknown, schemeId: ImageColorSchemeId): string {
  const colorIndex = getImageColorScheme(schemeId)
    .colors
    .findIndex((color) => typeof value === "string" && color.toLowerCase() === value.toLowerCase())
  if (colorIndex >= 0) {
    return getImageSchemeColorToken(colorIndex)
  }
  if (isImageSchemeColorToken(value)) {
    return value
  }
  return typeof value === "string" ? value.toLowerCase() : getImageSchemeColorToken(DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX)
}

export function getClosestImageSchemeColorToken(value: unknown, schemeId: ImageColorSchemeId): string {
  const colorIndex = getImageSchemeColorIndex(value)
  if (colorIndex !== null) {
    return getImageSchemeColorToken(colorIndex)
  }
  if (typeof value !== "string" || !isImagePlaceholderColor(value)) {
    return getImageSchemeColorToken(DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX)
  }
  const normalized = value.toLowerCase()
  const exactIndex = getImageColorScheme(schemeId)
    .colors
    .findIndex((color) => color.toLowerCase() === normalized)
  if (exactIndex >= 0) {
    return getImageSchemeColorToken(exactIndex)
  }
  const targetLuminance = getHexRelativeLuminance(normalized)
  const nearestIndex = getImageColorScheme(schemeId)
    .colors
    .reduce((bestIndex, color, index, colors) => {
      const bestDistance = Math.abs(getHexRelativeLuminance(colors[bestIndex]) - targetLuminance)
      const nextDistance = Math.abs(getHexRelativeLuminance(color) - targetLuminance)
      return nextDistance < bestDistance ? index : bestIndex
    }, 0)
  return getImageSchemeColorToken(nearestIndex)
}

export function isImagePlaceholderColor(value: unknown): value is string {
  return typeof value === "string" && IMAGE_PLACEHOLDER_COLORS.has(value.toLowerCase())
}

export function isImageColorInScheme(value: unknown, schemeId: ImageColorSchemeId): value is string {
  if (typeof value !== "string") return false
  const normalized = value.toLowerCase()
  return getImageColorScheme(schemeId).colors.some((color) => color.toLowerCase() === normalized)
}
