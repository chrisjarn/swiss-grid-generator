import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { type FontFamily } from "@/lib/config/fonts"
import {
  collectBrowserFontLoadSpecs,
  preloadBrowserFontSpecs,
} from "@/lib/browser-font-loading"
import {
  areFontFileMetricFacesLoaded,
  collectFontFileMetricFacesFromBlocks,
  preloadFontFileMetricFaces,
} from "@/lib/font-file-text-metrics-engine"
import {
  CURRENT_LAYOUT_ENGINE_CONTRACT,
  resolveLayoutTextMetricsEngineFactory,
  type LayoutEngineContract,
} from "@/lib/layout-engine-contract"
import type { TextFormatRun } from "@/lib/text-format-runs"
import { createTextMetricsService } from "@/lib/text-metrics-service"

type Args<Key extends string, StyleKey extends string> = {
  showTypography: boolean
  blockOrder: Key[]
  typographyStyles: Record<StyleKey, unknown>
  getStyleKeyForBlock: (key: Key) => StyleKey
  getBlockFont: (key: Key) => FontFamily
  getBlockFontWeight: (key: Key) => number
  isBlockItalic: (key: Key) => boolean
  getBlockFontSize: (key: Key, styleKey: StyleKey) => number
  getBlockTextColor: (key: Key) => string
  getBlockTextFormatRuns: (key: Key, color: string) => TextFormatRun<StyleKey, FontFamily>[]
  layoutEngine?: LayoutEngineContract
  scale: number
}

export function usePreviewTypographyMetrics<Key extends string, StyleKey extends string>({
  showTypography,
  blockOrder,
  typographyStyles,
  getStyleKeyForBlock,
  getBlockFont,
  getBlockFontWeight,
  isBlockItalic,
  getBlockFontSize,
  getBlockTextColor,
  getBlockTextFormatRuns,
  layoutEngine = CURRENT_LAYOUT_ENGINE_CONTRACT,
  scale,
}: Args<Key, StyleKey>) {
  const textMetricsRef = useRef(createTextMetricsService<StyleKey, FontFamily>({
    metricsEngineFactory: resolveLayoutTextMetricsEngineFactory(layoutEngine),
  }))
  const [fontRenderEpoch, setFontRenderEpoch] = useState(0)

  const clearCaches = useCallback(() => {
    textMetricsRef.current.clearCaches()
  }, [])

  const fontBlocks = useMemo(() => {
    if (!showTypography) return []
    return blockOrder.flatMap((key) => {
      const styleKey = getStyleKeyForBlock(key)
      const style = typographyStyles[styleKey]
      if (!style) return []
      const textColor = getBlockTextColor(key)
      return [{
        key,
        styleKey,
        fontFamily: getBlockFont(key),
        fontWeight: getBlockFontWeight(key),
        italic: isBlockItalic(key),
        fontSize: getBlockFontSize(key, styleKey) * scale,
        textFormatRuns: getBlockTextFormatRuns(key, textColor),
        resolveRunFontSize: (runStyleKey: StyleKey) => getBlockFontSize(key, runStyleKey) * scale,
      }]
    })
  }, [
    blockOrder,
    getBlockFont,
    getBlockFontWeight,
    getBlockFontSize,
    getBlockTextColor,
    getBlockTextFormatRuns,
    getStyleKeyForBlock,
    isBlockItalic,
    scale,
    showTypography,
    typographyStyles,
  ])

  const specs = useMemo(() => collectBrowserFontLoadSpecs(fontBlocks), [fontBlocks])
  const metricFaces = useMemo(() => collectFontFileMetricFacesFromBlocks(fontBlocks), [fontBlocks])
  const metricFacesReady = !showTypography || areFontFileMetricFacesLoaded(metricFaces)

  useEffect(() => {
    if (!showTypography) return
    textMetricsRef.current = createTextMetricsService<StyleKey, FontFamily>({
      metricsEngineFactory: resolveLayoutTextMetricsEngineFactory(layoutEngine),
    })
    clearCaches()
  }, [
    blockOrder,
    clearCaches,
    getBlockFont,
    getBlockFontWeight,
    getBlockFontSize,
    getBlockTextColor,
    getBlockTextFormatRuns,
    getStyleKeyForBlock,
    isBlockItalic,
    layoutEngine,
    scale,
    showTypography,
    typographyStyles,
  ])

  useEffect(() => {
    if (!showTypography) return

    let cancelled = false

    if (!specs.length && !metricFaces.length) return

    void Promise
      .all([
        preloadBrowserFontSpecs(specs),
        preloadFontFileMetricFaces(metricFaces),
      ])
      .then(() => {
        if (cancelled) return
        clearCaches()
        setFontRenderEpoch((value) => value + 1)
      })

    return () => {
      cancelled = true
    }
  }, [
    clearCaches,
    metricFaces,
    specs,
    showTypography,
  ])

  return {
    fontRenderEpoch,
    metricFacesReady,
    getWrappedText: textMetricsRef.current.getWrappedText,
    getOpticalOffset: textMetricsRef.current.getOpticalOffset,
    getTextAscent: textMetricsRef.current.getTextAscent,
    getTextDescent: textMetricsRef.current.getTextDescent,
  }
}
