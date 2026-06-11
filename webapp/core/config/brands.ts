import type { ImageColorSchemeId } from "@/core/config/color-schemes"
import type { FontFamily } from "@/core/config/fonts"

/**
 * MICE brand themes (additive).
 *
 * A brand binds together the three things a kit needs to look on-brand without guessing:
 *  - `colorSchemeId` — the 4-slot palette (paper / muted / ink / brand) from color-schemes.ts
 *  - `defaultFont`   — the brand's default typeface (a registered FontFamily)
 *  - `logoSrc`       — the brand logomark asset under /public (null until supplied)
 *
 * This registry is consumed by the Brand selector panel and the kit generator. It does not
 * modify any existing engine behaviour; selecting a brand simply sets the active colour scheme
 * and base font and exposes the logo asset.
 */
export type BrandTheme = {
  id: string
  label: string
  colorSchemeId: ImageColorSchemeId
  defaultFont: FontFamily
  /** Public asset path to the brand logomark, or null if not yet supplied. */
  logoSrc: string | null
  /** Locked width/height aspect ratio for the logo, or null when no logo. */
  logoAspectRatio: number | null
}

export const BRAND_THEMES = [
  {
    id: "ibis",
    label: "ibis",
    colorSchemeId: "brand-ibis",
    defaultFont: "Lato",
    logoSrc: "/brands/ibis-logo.svg",
    logoAspectRatio: 157.05241 / 156.62823,
  },
  {
    id: "holiday-inn",
    label: "Holiday Inn",
    colorSchemeId: "brand-holiday-inn",
    // Placeholder until the licensed Holiday Inn typeface is supplied; Inter is the closest
    // already-registered grotesque. Swap to the brand font in one line when available.
    defaultFont: "Inter",
    logoSrc: null,
    logoAspectRatio: null,
  },
] as const satisfies readonly BrandTheme[]

export type BrandId = (typeof BRAND_THEMES)[number]["id"]

export const DEFAULT_BRAND_ID: BrandId = "ibis"

const BRAND_THEME_MAP = new Map<BrandId, BrandTheme>(
  BRAND_THEMES.map((brand) => [brand.id, brand]),
)

export function isBrandId(value: unknown): value is BrandId {
  return typeof value === "string" && BRAND_THEME_MAP.has(value as BrandId)
}

export function getBrandTheme(id: BrandId): BrandTheme {
  return BRAND_THEME_MAP.get(id) ?? BRAND_THEME_MAP.get(DEFAULT_BRAND_ID) ?? BRAND_THEMES[0]
}
