"use client"

import { useEffect, useRef } from "react"

import type { LayoutPresetBrowserPage } from "@/lib/presets/types"
import {
  collectPresetThumbnailFontLoadSpecs,
  collectPresetThumbnailFontMetricFaces,
  drawPresetThumbnailToCanvas,
} from "@/lib/preset-thumbnail-render"
import { preloadFontFileMetricFaces } from "@/lib/font-file-text-metrics-engine"

type Props = {
  page: LayoutPresetBrowserPage
}

export function PresetPageThumbnail({ page }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    let frameId = 0
    let cancelled = false
    let visible = typeof IntersectionObserver === "undefined"
    let readyToDraw = false
    let preloadStarted = false

    const draw = () => {
      frameId = 0
      if (cancelled || !readyToDraw || !visible) return
      const rect = host.getBoundingClientRect()
      try {
        drawPresetThumbnailToCanvas(
          canvas,
          page,
          rect.width,
          rect.height,
          window.devicePixelRatio || 1,
        )
      } catch (error) {
        console.error(error)
      }
    }

    const scheduleDraw = () => {
      if (!visible) return
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(draw)
    }

    const startPreload = () => {
      if (preloadStarted) return
      preloadStarted = true
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
          if (cancelled) return
          readyToDraw = true
          scheduleDraw()
        })
        .catch((error) => {
          console.error(error)
          if (cancelled) return
          readyToDraw = true
          scheduleDraw()
        })
    }

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => scheduleDraw())
      : null
    resizeObserver?.observe(host)

    const handleWindowResize = () => scheduleDraw()
    window.addEventListener("resize", handleWindowResize)

    const visibilityObserver = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting)
          if (!visible) return
          startPreload()
          scheduleDraw()
        }, { root: null, rootMargin: "160px" })
      : null
    visibilityObserver?.observe(host)
    if (visible) startPreload()

    return () => {
      cancelled = true
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      visibilityObserver?.disconnect()
      window.removeEventListener("resize", handleWindowResize)
    }
  }, [page])

  return (
    <div ref={hostRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-full w-full"
      />
    </div>
  )
}
