import { useEffect, useMemo, useRef, useState } from "react"

import { type FontFamily } from "@/lib/config/fonts"
import {
  collectBrowserFontLoadSpecs,
  preloadBrowserFontSpecs,
} from "@/lib/browser-font-loading"
import {
  areFontFileMetricFacesLoaded,
  collectFontFileMetricFacesFromBlocks,
  type FontFileMetricFace,
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

function makeFontMetricFaceSignature(face: FontFileMetricFace): string {
  return `${face.fontFamily}:${face.fontWeight}:${face.italic ? 1 : 0}`
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
  const layoutEngineKey = [
    layoutEngine.id,
    layoutEngine.version,
    layoutEngine.textMetricsEngine,
    layoutEngine.opticalMarginModel,
    layoutEngine.verticalTextBoxModel,
    layoutEngine.wrapModel,
    layoutEngine.layerOrderModel,
  ].join("|")
  const textMetricsRef = useRef({
    layoutEngineKey,
    service: createTextMetricsService<StyleKey, FontFamily>({
      metricsEngineFactory: resolveLayoutTextMetricsEngineFactory(layoutEngine),
    }),
  })
  if (textMetricsRef.current.layoutEngineKey !== layoutEngineKey) {
    textMetricsRef.current = {
      layoutEngineKey,
      service: createTextMetricsService<StyleKey, FontFamily>({
        metricsEngineFactory: resolveLayoutTextMetricsEngineFactory(layoutEngine),
      }),
    }
  }
  const textMetrics = textMetricsRef.current.service
  const [fontRenderEpoch, setFontRenderEpoch] = useState(0)

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
  const fontLoadSignature = useMemo(() => {
    if (!specs.length && !metricFaces.length) return ""
    return [
      specs.slice().sort().join("\n"),
      metricFaces.map(makeFontMetricFaceSignature).sort().join("\n"),
    ].join("\n--\n")
  }, [metricFaces, specs])
  const latestFontLoadInputsRef = useRef({ specs, metricFaces })
  latestFontLoadInputsRef.current = { specs, metricFaces }
  const completedFontLoadSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!showTypography) return
    if (!fontLoadSignature) return
    if (completedFontLoadSignatureRef.current === fontLoadSignature) return

    let cancelled = false

    const { specs: pendingSpecs, metricFaces: pendingMetricFaces } = latestFontLoadInputsRef.current

    void Promise
      .all([
        preloadBrowserFontSpecs(pendingSpecs),
        preloadFontFileMetricFaces(pendingMetricFaces),
      ])
      .then(() => {
        if (cancelled) return
        completedFontLoadSignatureRef.current = fontLoadSignature
        setFontRenderEpoch((value) => value + 1)
      })

    return () => {
      cancelled = true
    }
  }, [
    fontLoadSignature,
    showTypography,
  ])

  return {
    fontRenderEpoch,
    metricFacesReady,
    getWrappedText: textMetrics.getWrappedText,
    getOpticalOffset: textMetrics.getOpticalOffset,
    getTextAscent: textMetrics.getTextAscent,
    getTextDescent: textMetrics.getTextDescent,
  }
}
