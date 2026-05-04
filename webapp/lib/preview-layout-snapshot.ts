import type { SnapshotState } from "@/hooks/useLayoutSnapshot"
import type { TextVerticalAlignMode } from "./types/layout-primitives.ts"
import { clampRotation, hasSignificantRotation } from "./block-constraints.ts"
import {
  normalizeOpticalKerning,
  normalizeTrackingScale,
} from "./text-rendering.ts"
import { normalizeTextTrackingRuns } from "./text-tracking-runs.ts"

type ResolvedSnapshotState<
  Key extends string,
  StyleKey extends string,
  FontFamily extends string,
  TextAlignMode extends string,
  Position,
> = SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position> & {
  blockColumnSpans: Record<Key, number>
  blockRowSpans: Record<Key, number>
  blockHeightBaselines: Record<Key, number>
  blockTextAlignments: Record<Key, TextAlignMode>
  blockVerticalAlignments: Record<Key, TextVerticalAlignMode>
  blockTextReflow: Record<Key, boolean>
  blockSyllableDivision: Record<Key, boolean>
  blockSnapToColumns: Record<Key, boolean>
  blockSnapToBaseline: Record<Key, boolean>
  blockFontWeights: Record<Key, number>
  blockOpticalKerning: Record<Key, boolean>
  blockTrackingScales: Record<Key, number>
  blockTrackingRuns: Partial<Record<Key, ReturnType<typeof normalizeTextTrackingRuns>>>
  blockTextFormatRuns: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>["blockTextFormatRuns"]
  blockItalic: Record<Key, boolean>
  blockRotations: Record<Key, number>
}

export function buildResolvedSnapshotState<
  Key extends string,
  StyleKey extends string,
  FontFamily extends string,
  TextAlignMode extends string,
  Position,
>(
  state: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>,
  {
    gridCols,
    getDefaultColumnSpan,
    getBlockRows,
    getBlockHeightBaselines,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    getBlockFontWeight,
    isBlockOpticalKerningEnabled,
    getBlockTrackingScale,
    isBlockItalic,
    getBlockRotation,
    defaultTextAlign,
  }: {
    gridCols: number
    getDefaultColumnSpan: (key: Key, gridCols: number) => number
    getBlockRows: (key: Key) => number
    getBlockHeightBaselines: (key: Key) => number
    isTextReflowEnabled: (key: Key) => boolean
    isSyllableDivisionEnabled: (key: Key) => boolean
    isSnapToColumnsEnabled: (key: Key) => boolean
    isSnapToBaselineEnabled: (key: Key) => boolean
    getBlockFontWeight: (key: Key) => number
    isBlockOpticalKerningEnabled: (key: Key) => boolean
    getBlockTrackingScale: (key: Key) => number
    isBlockItalic: (key: Key) => boolean
    getBlockRotation: (key: Key) => number
    defaultTextAlign: TextAlignMode
  },
): ResolvedSnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position> {
  const resolvedSpans = {} as Record<Key, number>
  const resolvedAlignments = {} as Record<Key, TextAlignMode>
  const resolvedVerticalAlignments = {} as Record<Key, TextVerticalAlignMode>
  const resolvedRows = {} as Record<Key, number>
  const resolvedHeightBaselines = {} as Record<Key, number>
  const resolvedReflow = {} as Record<Key, boolean>
  const resolvedSyllableDivision = {} as Record<Key, boolean>
  const resolvedSnapToColumns = {} as Record<Key, boolean>
  const resolvedSnapToBaseline = {} as Record<Key, boolean>
  const resolvedFontWeights = {} as Record<Key, number>
  const resolvedOpticalKerning = {} as Record<Key, boolean>
  const resolvedTrackingScales = {} as Record<Key, number>
  const resolvedTrackingRuns = {} as Partial<Record<Key, ReturnType<typeof normalizeTextTrackingRuns>>>
  const resolvedItalic = {} as Record<Key, boolean>
  const resolvedRotations = {} as Record<Key, number>

  for (const key of state.blockOrder) {
    const rawSpan = state.blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)
    const resolvedTrackingScale = getBlockTrackingScale(key)
    const nextRuns = normalizeTextTrackingRuns(
      state.textContent[key] ?? "",
      state.blockTrackingRuns?.[key],
      resolvedTrackingScale,
    )

    resolvedSpans[key] = Math.max(1, Math.min(gridCols, rawSpan))
    resolvedAlignments[key] = state.blockTextAlignments?.[key] ?? defaultTextAlign
    resolvedVerticalAlignments[key] = state.blockVerticalAlignments?.[key] ?? "top"
    resolvedRows[key] = getBlockRows(key)
    resolvedHeightBaselines[key] = getBlockHeightBaselines(key)
    resolvedReflow[key] = isTextReflowEnabled(key)
    resolvedSyllableDivision[key] = isSyllableDivisionEnabled(key)
    resolvedSnapToColumns[key] = isSnapToColumnsEnabled(key)
    resolvedSnapToBaseline[key] = isSnapToBaselineEnabled(key)
    resolvedFontWeights[key] = getBlockFontWeight(key)
    resolvedOpticalKerning[key] = isBlockOpticalKerningEnabled(key)
    resolvedTrackingScales[key] = resolvedTrackingScale
    if (nextRuns.length > 0) {
      resolvedTrackingRuns[key] = nextRuns
    }
    resolvedItalic[key] = isBlockItalic(key)
    resolvedRotations[key] = getBlockRotation(key)
  }

  return {
    ...state,
    blockOrder: [...state.blockOrder],
    textContent: { ...state.textContent },
    blockTextEdited: { ...state.blockTextEdited },
    styleAssignments: { ...state.styleAssignments },
    blockFontFamilies: { ...(state.blockFontFamilies ?? {}) },
    blockFontWeights: resolvedFontWeights,
    blockOpticalKerning: resolvedOpticalKerning,
    blockTrackingScales: resolvedTrackingScales,
    blockTrackingRuns: resolvedTrackingRuns,
    blockTextFormatRuns: { ...(state.blockTextFormatRuns ?? {}) },
    blockColumnSpans: resolvedSpans,
    blockRowSpans: resolvedRows,
    blockHeightBaselines: resolvedHeightBaselines,
    blockTextAlignments: resolvedAlignments,
    blockVerticalAlignments: resolvedVerticalAlignments,
    blockTextReflow: resolvedReflow,
    blockSyllableDivision: resolvedSyllableDivision,
    blockSnapToColumns: resolvedSnapToColumns,
    blockSnapToBaseline: resolvedSnapToBaseline,
    blockItalic: resolvedItalic,
    blockRotations: resolvedRotations,
    blockModulePositions: { ...(state.blockModulePositions ?? {}) },
  }
}

export function normalizeSnapshotStateForApply<
  Key extends string,
  StyleKey extends string,
  FontFamily extends string,
  TextAlignMode extends string,
  Position,
>(
  state: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>,
  {
    baseFont,
    isFontFamily,
  }: {
    baseFont: FontFamily
    isFontFamily: (value: unknown) => value is FontFamily
  },
) {
  const nextFonts = {} as Partial<Record<Key, FontFamily>>
  const nextFontWeights = {} as Partial<Record<Key, number>>
  const nextOpticalKerning = {} as Partial<Record<Key, boolean>>
  const nextTrackingScales = {} as Partial<Record<Key, number>>
  const nextTrackingRuns = {} as Partial<Record<Key, ReturnType<typeof normalizeTextTrackingRuns>>>
  const nextItalic = {} as Partial<Record<Key, boolean>>
  const nextRotations = {} as Partial<Record<Key, number>>

  for (const key of state.blockOrder) {
    const rawFont = state.blockFontFamilies?.[key]
    if (isFontFamily(rawFont) && rawFont !== baseFont) {
      nextFonts[key] = rawFont
    }

    const rawWeight = state.blockFontWeights?.[key]
    if (typeof rawWeight === "number" && Number.isFinite(rawWeight) && rawWeight > 0) {
      nextFontWeights[key] = rawWeight
    }

    const rawOpticalKerning = state.blockOpticalKerning?.[key]
    if (rawOpticalKerning === true || rawOpticalKerning === false) {
      nextOpticalKerning[key] = normalizeOpticalKerning(rawOpticalKerning)
    }

    const rawTrackingScale = state.blockTrackingScales?.[key]
    const normalizedTrackingScale = typeof rawTrackingScale === "number" && Number.isFinite(rawTrackingScale) && rawTrackingScale !== 0
      ? normalizeTrackingScale(rawTrackingScale)
      : 0
    if (normalizedTrackingScale !== 0) {
      nextTrackingScales[key] = normalizedTrackingScale
    }

    const runs = normalizeTextTrackingRuns(
      state.textContent[key] ?? "",
      state.blockTrackingRuns?.[key],
      normalizedTrackingScale,
    )
    if (runs.length > 0) {
      nextTrackingRuns[key] = runs
    }

    const rawItalic = state.blockItalic?.[key]
    if (rawItalic === true || rawItalic === false) {
      nextItalic[key] = rawItalic
    }

    const rawRotation = state.blockRotations?.[key]
    if (typeof rawRotation === "number" && Number.isFinite(rawRotation) && hasSignificantRotation(rawRotation)) {
      nextRotations[key] = clampRotation(rawRotation)
    }
  }

  return {
    ...state,
    blockOrder: [...state.blockOrder],
    textContent: { ...state.textContent },
    blockTextEdited: { ...state.blockTextEdited },
    styleAssignments: { ...state.styleAssignments },
    blockFontFamilies: nextFonts,
    blockFontWeights: nextFontWeights,
    blockOpticalKerning: nextOpticalKerning,
    blockTrackingScales: nextTrackingScales,
    blockTrackingRuns: nextTrackingRuns,
    blockTextFormatRuns: { ...(state.blockTextFormatRuns ?? {}) },
    blockItalic: nextItalic,
    blockRotations: nextRotations,
    blockColumnSpans: { ...state.blockColumnSpans },
    blockRowSpans: { ...(state.blockRowSpans ?? {}) },
    blockHeightBaselines: { ...(state.blockHeightBaselines ?? {}) },
    blockTextAlignments: { ...state.blockTextAlignments },
    blockVerticalAlignments: { ...(state.blockVerticalAlignments ?? {}) },
    blockTextReflow: { ...state.blockTextReflow },
    blockSyllableDivision: { ...state.blockSyllableDivision },
    blockSnapToColumns: { ...state.blockSnapToColumns },
    blockSnapToBaseline: { ...state.blockSnapToBaseline },
    blockModulePositions: { ...state.blockModulePositions },
  }
}
