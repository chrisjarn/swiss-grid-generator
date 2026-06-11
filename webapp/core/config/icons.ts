/**
 * Loadable icon packs (additive).
 *
 * Icons are SVG assets under /public/icons/<pack>/<id>.svg, rendered through the existing
 * image pipeline (an image block whose `imageSources[key]` points at the icon `src`).
 * New packs (dietary, amenity/AV) follow the same shape.
 */
export type IconAsset = {
  id: string
  label: string
  src: string
}

export type IconPack = {
  id: string
  label: string
  icons: readonly IconAsset[]
}

export const SEATING_ICONS = [
  { id: "theatre", label: "Theatre", src: "/icons/seating/theatre.svg" },
  { id: "classroom", label: "Classroom", src: "/icons/seating/classroom.svg" },
  { id: "boardroom", label: "Boardroom", src: "/icons/seating/boardroom.svg" },
  { id: "ushape", label: "U-Shape", src: "/icons/seating/ushape.svg" },
  { id: "cocktail", label: "Cocktail", src: "/icons/seating/cocktail.svg" },
  { id: "cabaret", label: "Cabaret", src: "/icons/seating/cabaret.svg" },
  { id: "banquet", label: "Banquet", src: "/icons/seating/banquet.svg" },
] as const satisfies readonly IconAsset[]

export type SeatingIconId = (typeof SEATING_ICONS)[number]["id"]

export const ICON_PACKS = {
  seating: {
    id: "seating",
    label: "Seating layouts",
    icons: SEATING_ICONS,
  },
} as const satisfies Record<string, IconPack>

export type IconPackId = keyof typeof ICON_PACKS

export function getIconPack(packId: IconPackId): IconPack {
  return ICON_PACKS[packId]
}

export function getIconAsset(packId: IconPackId, iconId: string): IconAsset | null {
  return ICON_PACKS[packId].icons.find((icon) => icon.id === iconId) ?? null
}

/** Convenience: resolve a seating icon's public src by id. */
export function getSeatingIconSrc(iconId: SeatingIconId): string {
  return SEATING_ICONS.find((icon) => icon.id === iconId)?.src ?? ""
}
