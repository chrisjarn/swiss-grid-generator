import { useCallback } from "react"

import { clampRotation } from "@/core/layout/block-constraints"
import {
  getImageSchemeColorToken,
  isImageColorInScheme,
  isImageSchemeColorToken,
  type ImageColorSchemeId,
} from "@/core/config/color-schemes"
import type { FontFamily } from "@/core/config/fonts"
import type {
  GridRhythm,
  GridRhythmColsDirection,
  GridRhythmRowsDirection,
  TypographyScale,
} from "@/core/config/defaults"
import type { CanvasRatioKey } from "@/core/layout/grid-calculator"
import type { UiAction } from "@/lib/workspace-ui-state"

type Args = {
  dispatch: (action: UiAction) => void
  canvasBackground: string | null
}

export function useWorkspaceUiActions({
  dispatch,
  canvasBackground,
}: Args) {
  const setCanvasRatio = useCallback((value: CanvasRatioKey) => {
    dispatch({ type: "SET", key: "canvasRatio", value })
  }, [dispatch])

  const setCustomRatioWidth = useCallback((value: number) => {
    dispatch({ type: "SET", key: "customRatioWidth", value })
  }, [dispatch])

  const setCustomRatioHeight = useCallback((value: number) => {
    dispatch({ type: "SET", key: "customRatioHeight", value })
  }, [dispatch])

  const setOrientation = useCallback((value: "portrait" | "landscape") => {
    dispatch({ type: "SET", key: "orientation", value })
  }, [dispatch])

  const setRotation = useCallback((value: number) => {
    dispatch({ type: "SET", key: "rotation", value: clampRotation(value) })
  }, [dispatch])

  const setMarginMethod = useCallback((value: 1 | 2 | 3) => {
    dispatch({ type: "SET", key: "marginMethod", value })
  }, [dispatch])

  const setGridCols = useCallback((value: number) => {
    dispatch({ type: "SET", key: "gridCols", value })
  }, [dispatch])

  const setGridRows = useCallback((value: number) => {
    dispatch({ type: "SET", key: "gridRows", value })
  }, [dispatch])

  const setGutterMultiple = useCallback((value: number) => {
    dispatch({ type: "SET", key: "gutterMultiple", value })
  }, [dispatch])

  const setRhythm = useCallback((value: GridRhythm) => {
    dispatch({ type: "SET", key: "rhythm", value })
  }, [dispatch])

  const setRhythmRowsEnabled = useCallback((value: boolean) => {
    dispatch({ type: "SET", key: "rhythmRowsEnabled", value })
  }, [dispatch])

  const setRhythmRowsDirection = useCallback((value: GridRhythmRowsDirection) => {
    dispatch({ type: "SET", key: "rhythmRowsDirection", value })
  }, [dispatch])

  const setRhythmColsEnabled = useCallback((value: boolean) => {
    dispatch({ type: "SET", key: "rhythmColsEnabled", value })
  }, [dispatch])

  const setRhythmColsDirection = useCallback((value: GridRhythmColsDirection) => {
    dispatch({ type: "SET", key: "rhythmColsDirection", value })
  }, [dispatch])

  const setTypographyScale = useCallback((value: TypographyScale) => {
    dispatch({ type: "SET", key: "typographyScale", value })
  }, [dispatch])

  const setFibonacciSequenceStartIndex = useCallback((value: number) => {
    dispatch({ type: "SET", key: "fibonacciSequenceStartIndex", value })
  }, [dispatch])

  const setBaseFont = useCallback((value: FontFamily) => {
    dispatch({ type: "SET", key: "baseFont", value })
  }, [dispatch])

  const setImageColorScheme = useCallback((value: ImageColorSchemeId) => {
    const actions: UiAction[] = [{ type: "SET", key: "imageColorScheme", value }]
    if (
      canvasBackground
      && !isImageSchemeColorToken(canvasBackground)
      && !isImageColorInScheme(canvasBackground, value)
    ) {
      actions.push({ type: "SET", key: "canvasBackground", value: getImageSchemeColorToken(0) })
    }
    dispatch(actions.length === 1 ? actions[0] : { type: "BATCH", actions })
  }, [canvasBackground, dispatch])

  const setCanvasBackground = useCallback((value: string | null) => {
    dispatch({ type: "SET", key: "canvasBackground", value })
  }, [dispatch])

  const setCustomBaseline = useCallback((value: number) => {
    dispatch({ type: "SET", key: "customBaseline", value })
  }, [dispatch])

  const setUseCustomMargins = useCallback((value: boolean) => {
    dispatch({ type: "SET", key: "useCustomMargins", value })
  }, [dispatch])

  const setCustomMarginMultipliers = useCallback((value: { top: number; left: number; right: number; bottom: number }) => {
    dispatch({ type: "SET", key: "customMarginMultipliers", value })
  }, [dispatch])

  const setShowLayers = useCallback((value: boolean) => {
    dispatch({ type: "SET", key: "showLayers", value })
  }, [dispatch])

  const setShowImagePlaceholders = useCallback((value: boolean) => {
    dispatch({ type: "SET", key: "showImagePlaceholders", value })
  }, [dispatch])

  const toggleShowBaselines = useCallback(() => {
    dispatch({ type: "TOGGLE", key: "showBaselines" })
  }, [dispatch])

  const toggleShowMargins = useCallback(() => {
    dispatch({ type: "TOGGLE", key: "showMargins" })
  }, [dispatch])

  const toggleShowModules = useCallback(() => {
    dispatch({ type: "TOGGLE", key: "showModules" })
  }, [dispatch])

  const toggleShowImagePlaceholders = useCallback(() => {
    dispatch({ type: "TOGGLE", key: "showImagePlaceholders" })
  }, [dispatch])

  const toggleShowTypography = useCallback(() => {
    dispatch({ type: "TOGGLE", key: "showTypography" })
  }, [dispatch])

  return {
    setCanvasRatio,
    setCustomRatioWidth,
    setCustomRatioHeight,
    setOrientation,
    setRotation,
    setMarginMethod,
    setGridCols,
    setGridRows,
    setGutterMultiple,
    setRhythm,
    setRhythmRowsEnabled,
    setRhythmRowsDirection,
    setRhythmColsEnabled,
    setRhythmColsDirection,
    setTypographyScale,
    setFibonacciSequenceStartIndex,
    setBaseFont,
    setImageColorScheme,
    setCanvasBackground,
    setCustomBaseline,
    setUseCustomMargins,
    setCustomMarginMultipliers,
    setShowLayers,
    setShowImagePlaceholders,
    toggleShowBaselines,
    toggleShowMargins,
    toggleShowModules,
    toggleShowImagePlaceholders,
    toggleShowTypography,
  }
}
