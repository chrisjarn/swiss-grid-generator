"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { LoadedProject } from "@/lib/document-session"
import {
  collectPresetThumbnailFontLoadSpecs,
  collectPresetThumbnailFontMetricFaces,
  drawPresetThumbnailToCanvas,
} from "@/lib/preset-thumbnail-render"
import type { LayoutPresetBrowserPage } from "@/lib/presets/types"
import {
  buildResolvedProjectPageExportSources,
  type ProjectPageVisibilitySettings,
} from "@/lib/project-page-export-source"
import { preloadFontFileMetricFaces } from "@/lib/font-file-text-metrics-engine"
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
        error: cause instanceof Error ? cause.message : "Could not build preview.",
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
        setDrawError(cause instanceof Error ? cause.message : "Could not draw preview.")
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
        setDrawError(cause instanceof Error ? cause.message : "Could not prepare preview.")
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

  const error = thumbnailPage.error ?? (thumbnailPage.page ? drawError : "No page available for preview.")

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative h-36 overflow-hidden border",
        isDarkUi ? "border-[#313A47] bg-[#232A35]" : "border-gray-200 bg-white",
      )}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Selected export page preview" />
      {error ? (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] leading-tight",
          isDarkUi ? "bg-[#232A35] text-[#D7DEE8]" : "bg-white text-gray-600",
        )}>
          {error}
        </div>
      ) : null}
    </div>
  )
}
