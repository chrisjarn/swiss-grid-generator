import { useCallback, useState } from "react"

import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import { isImagePlaceholderColor } from "@/lib/config/color-schemes"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"

type TypographyStyleDefinition = {
  baselineMultiplier?: number
}

type Args<Key extends string, StyleKey extends string> = {
  blockOrder: Key[]
  styleAssignments: Record<Key, StyleKey>
  defaultTextColor: string
  gridUnit: number
  getStyleSize: (styleKey: StyleKey) => number
  getStyleLeading: (styleKey: StyleKey) => number
  typographyStyles: Record<StyleKey, TypographyStyleDefinition>
}

export function usePreviewTextBlockOverrides<Key extends string, StyleKey extends string>({
  blockOrder,
  styleAssignments,
  defaultTextColor,
  gridUnit,
  getStyleSize,
  getStyleLeading,
  typographyStyles,
}: Args<Key, StyleKey>) {
  const [blockCustomSizes, setBlockCustomSizes] = useState<Partial<Record<Key, number>>>({})
  const [blockCustomLeadings, setBlockCustomLeadings] = useState<Partial<Record<Key, number>>>({})
  const [blockTextColors, setBlockTextColors] = useState<Partial<Record<Key, string>>>({})

  const getBlockFontSize = useCallback((key: Key, styleKey: StyleKey): number => {
    const defaultSize = getStyleSize(styleKey)
    if (styleKey !== "fx") return defaultSize
    const raw = blockCustomSizes[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultSize
    return clampFxSize(raw)
  }, [blockCustomSizes, getStyleSize])

  const getBlockBaselineMultiplier = useCallback((key: Key, styleKey: StyleKey): number => {
    const defaultLeading = getStyleLeading(styleKey)
    const defaultMultiplier = typographyStyles[styleKey]?.baselineMultiplier
      ?? Math.max(0.01, defaultLeading / gridUnit)
    if (styleKey !== "fx") return defaultMultiplier
    const raw = blockCustomLeadings[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultMultiplier
    return Math.max(0.01, Math.min(800, raw) / gridUnit)
  }, [blockCustomLeadings, getStyleLeading, gridUnit, typographyStyles])

  const getBlockTextColor = useCallback((key: Key): string => {
    const raw = blockTextColors[key]
    if (isImagePlaceholderColor(raw)) return raw
    return defaultTextColor
  }, [blockTextColors, defaultTextColor])

  const buildTextOverridesSnapshot = useCallback(() => {
    const nextSizes = {} as Partial<Record<Key, number>>
    const nextLeadings = {} as Partial<Record<Key, number>>
    const nextTextColors = {} as Partial<Record<Key, string>>

    for (const key of blockOrder) {
      const styleKey = styleAssignments[key] ?? ("body" as StyleKey)
      if (styleKey === "fx") {
        const rawSize = blockCustomSizes[key]
        if (typeof rawSize === "number" && Number.isFinite(rawSize) && rawSize > 0) {
          nextSizes[key] = clampFxSize(rawSize)
        }

        const rawLeading = blockCustomLeadings[key]
        if (typeof rawLeading === "number" && Number.isFinite(rawLeading) && rawLeading > 0) {
          nextLeadings[key] = clampFxLeading(rawLeading)
        }
      }

      const rawColor = blockTextColors[key]
      if (isImagePlaceholderColor(rawColor)) {
        nextTextColors[key] = rawColor
      }
    }

    return {
      blockCustomSizes: nextSizes,
      blockCustomLeadings: nextLeadings,
      blockTextColors: nextTextColors,
    }
  }, [
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextColors,
    styleAssignments,
  ])

  const applyTextOverridesSnapshot = useCallback((snapshot: PreviewLayoutState<StyleKey, string, Key>) => {
    const normalizedOrder = (Array.isArray(snapshot.blockOrder) ? snapshot.blockOrder : [])
      .filter((key): key is Key => typeof key === "string" && key.length > 0)
    const nextSizes = {} as Partial<Record<Key, number>>
    const nextLeadings = {} as Partial<Record<Key, number>>
    const nextTextColors = {} as Partial<Record<Key, string>>

    for (const key of normalizedOrder) {
      const styleKey = snapshot.styleAssignments?.[key] ?? ("body" as StyleKey)
      if (styleKey === "fx") {
        const rawSize = snapshot.blockCustomSizes?.[key]
        if (typeof rawSize === "number" && Number.isFinite(rawSize) && rawSize > 0) {
          nextSizes[key] = clampFxSize(rawSize)
        }

        const rawLeading = snapshot.blockCustomLeadings?.[key]
        if (typeof rawLeading === "number" && Number.isFinite(rawLeading) && rawLeading > 0) {
          nextLeadings[key] = clampFxLeading(rawLeading)
        }
      }

      const rawColor = snapshot.blockTextColors?.[key]
      if (isImagePlaceholderColor(rawColor)) {
        nextTextColors[key] = rawColor
      }
    }
    setBlockCustomSizes(nextSizes)
    setBlockCustomLeadings(nextLeadings)
    setBlockTextColors(nextTextColors)
  }, [])

  return {
    blockCustomSizes,
    setBlockCustomSizes,
    blockCustomLeadings,
    setBlockCustomLeadings,
    blockTextColors,
    setBlockTextColors,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    buildTextOverridesSnapshot,
    applyTextOverridesSnapshot,
  }
}
