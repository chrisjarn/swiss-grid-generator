"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { LoadedProject } from "@/core/document/session"
import { translateMessage, useTranslation } from "@/lib/i18n"
import {
  collectPresetThumbnailFontLoadSpecs,
  collectPresetThumbnailFontMetricFaces,
  drawPresetThumbnailToCanvas,
} from "@/gui/preview/lib/preset-thumbnail-render"
import type { LayoutPresetBrowserPage } from "@/lib/presets/types"
import {
  buildResolvedProjectPageExportSources,
  type ProjectPageVisibilitySettings,
} from "@/core/export/project-page-export-source"
import { preloadFontFileMetricFaces } from "@/core/layout/font-file-text-metrics-engine"
import { cn } from "@/lib/utils"

type Props = {
  project: LoadedProject<Record<string, unknown>>
  pageNumber: number
  visibilitySettings: ProjectPageVisibilitySettings
  isDarkUi: boolean
}

function buildExportThumbnailPage(
  project: LoadedProject<Record<string, unknown>>,
  pageNumber: number,
  visibilitySettings: ProjectPageVisibilitySettings,
): LayoutPresetBrowserPage | null {
  const source = buildResolvedProjectPageExportSources(
    project,
    { fromPage: pageNumber, toPage: pageNumber },
    visibilitySettings,
  )[0]
  if (!source) return null
  const projectPage = project.pages[pageNumber - 1]
  return {
    id: source.id,
    name: source.name,
    layoutMode: projectPage?.layoutMode === "facing" ? "facing" : "single",
    uiSettings: source.uiSettings,
    previewLayout: source.previewLayout,
    result: source.result,
    baseFont: source.baseFont,
    imageColorScheme: source.imageColorScheme,
    resolvedCanvasBackground: source.resolvedCanvasBackground,
    layoutEngine: project.layoutEngine,
  }
}

export function ExportPreviewCanvas({
  project,
  pageNumber,
  visibilitySettings,
  isDarkUi,
}: Props) {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [drawError, setDrawError] = useState<string | null>(null)
  const {
    showBaselines,
    showImagePlaceholders,
    showMargins,
    showModules,
    showTypography,
  } = visibilitySettings
  const resolvedVisibilitySettings = useMemo(() => ({
    showBaselines,
    showImagePlaceholders,
    showMargins,
    showModules,
    showTypography,
  }), [showBaselines, showImagePlaceholders, showMargins, showModules, showTypography])
  const thumbnailRenderOptions = useMemo(() => ({
    showBaselines,
    showImagePlaceholders,
    showMargins,
    showModules,
    showTypography,
  }), [showBaselines, showImagePlaceholders, showMargins, showModules, showTypography])

  const thumbnailPage = useMemo(() => {
    try {
      return {
        error: null,
        page: buildExportThumbnailPage(project, pageNumber, resolvedVisibilitySettings),
      }
    } catch (cause) {
      return {
        error: cause instanceof Error ? cause.message : translateMessage("ui.export.dialog.previewBuildError"),
        page: null,
      }
    }
  }, [pageNumber, project, resolvedVisibilitySettings])

  useEffect(() => {
    setDrawError(null)
    const host = hostRef.current
    const canvas = canvasRef.current
    const page = thumbnailPage.page
    if (!host || !canvas || !page) return

    let frameId = 0
    let cancelled = false

    const draw = () => {
      frameId = 0
      if (cancelled) return
      const rect = host.getBoundingClientRect()
      try {
        drawPresetThumbnailToCanvas(
          canvas,
          page,
          rect.width,
          rect.height,
          window.devicePixelRatio || 1,
          thumbnailRenderOptions,
        )
      } catch (cause) {
        setDrawError(cause instanceof Error ? cause.message : translateMessage("ui.export.dialog.previewDrawError"))
      }
    }

    const scheduleDraw = () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(draw)
    }

    const fontSpecs = collectPresetThumbnailFontLoadSpecs(page)
    const metricFaces = collectPresetThumbnailFontMetricFaces(page)
    void Promise
      .all([
        fontSpecs.length > 0 && typeof document !== "undefined" && "fonts" in document
          ? Promise.allSettled(fontSpecs.map((spec) => document.fonts.load(spec)))
          : Promise.resolve(),
        preloadFontFileMetricFaces(metricFaces),
      ])
      .then(() => {
        if (!cancelled) scheduleDraw()
      })
      .catch((cause) => {
        setDrawError(cause instanceof Error ? cause.message : translateMessage("ui.export.dialog.previewPrepareError"))
        if (!cancelled) scheduleDraw()
      })

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => scheduleDraw())
      : null
    resizeObserver?.observe(host)

    return () => {
      cancelled = true
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [thumbnailPage.page, thumbnailRenderOptions])

  const error = thumbnailPage.error ?? (thumbnailPage.page ? drawError : t("ui.export.dialog.previewNoPage"))

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative h-36 overflow-hidden border",
        isDarkUi ? "border-border bg-surface" : "border-divider bg-page",
      )}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-label={t("ui.export.dialog.previewCanvas")} />
      {error ? (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] leading-tight",
          isDarkUi ? "bg-surface text-muted-foreground" : "bg-page text-muted-foreground",
        )}>
          {error}
        </div>
      ) : null}
    </div>
  )
}
