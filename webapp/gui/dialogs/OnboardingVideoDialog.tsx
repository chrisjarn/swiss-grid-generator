"use client"

import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { useTranslation } from "@/lib/i18n"
import type { OnboardingVideoId } from "@/lib/onboarding/videos"
import { getOnboardingVideoConfig } from "@/lib/onboarding/videos"
import { exitFullscreenIfActive, getFullscreenElement, requestElementFullscreen } from "@/shared/dom/fullscreen"

type Props = {
  videoId: OnboardingVideoId | null
  onClose: () => void
}

function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"
  const wholeSeconds = Math.floor(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainingSeconds = wholeSeconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function OnboardingVideoDialog({ videoId, onClose }: Props) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoConfig = getOnboardingVideoConfig(videoId)

  const closeDialog = useCallback(() => {
    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.pause()
      videoElement.currentTime = 0
    }
    void exitFullscreenIfActive().catch(() => undefined)
    onClose()
  }, [onClose])

  const toggleFullscreen = useCallback(() => {
    const fullscreenElement = getFullscreenElement()
    if (fullscreenElement) {
      void exitFullscreenIfActive().catch(() => undefined)
      return
    }

    void requestElementFullscreen(dialogRef.current).catch(() => undefined)
  }, [])

  const togglePlayback = useCallback(() => {
    const videoElement = videoRef.current
    if (!videoElement) return
    if (videoElement.paused) {
      void videoElement.play().catch(() => setIsPaused(videoElement.paused))
      return
    }
    videoElement.pause()
  }, [])

  const toggleMuted = useCallback(() => {
    const videoElement = videoRef.current
    if (!videoElement) return
    videoElement.muted = !videoElement.muted
    setIsMuted(videoElement.muted)
  }, [])

  useEffect(() => {
    if (!videoConfig) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      if (getFullscreenElement()) {
        void exitFullscreenIfActive().catch(() => undefined)
        return
      }
      closeDialog()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeDialog, videoConfig])

  useEffect(() => {
    if (!videoConfig || typeof document === "undefined") return
    const handleFullscreenChange = () => {
      setIsFullscreen(getFullscreenElement() === dialogRef.current)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    handleFullscreenChange()
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [videoConfig])

  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setIsPaused(false)
    setIsMuted(true)
    setIsFullscreen(false)
  }, [videoConfig?.id])

  if (!videoConfig) return null

  const title = t(videoConfig.titleKey)
  const closeLabel = t(videoConfig.closeLabelKey)
  const playLabel = t("ui.preview.onboarding.play")
  const pauseLabel = t("ui.preview.onboarding.pause")
  const muteLabel = t("ui.preview.onboarding.mute")
  const unmuteLabel = t("ui.preview.onboarding.unmute")
  const enterFullscreenLabel = t("ui.preview.onboarding.enterFullscreen")
  const exitFullscreenLabel = t("ui.preview.onboarding.exitFullscreen")
  const playbackLabel = isPaused ? playLabel : pauseLabel
  const mutedLabel = isMuted ? unmuteLabel : muteLabel
  const fullscreenLabel = isFullscreen ? exitFullscreenLabel : enterFullscreenLabel

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f3f4f6]"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        closeDialog()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-video-title"
        className="relative flex h-[100dvh] w-[100vw] flex-col overflow-hidden bg-[#f3f4f6] text-gray-900"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-end px-4">
          <h2
            id="onboarding-video-title"
            className="sr-only"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={closeDialog}
            className="pointer-events-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-transparent text-gray-700 transition-colors hover:bg-gray-200/70 hover:text-gray-900"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#f3f4f6] py-6">
          <div aria-hidden="true" className="absolute inset-0 bg-[#f3f4f6]" />
          <div className="relative flex h-full max-h-full w-auto max-w-full items-center justify-center overflow-hidden bg-[#f3f4f6] shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              preload="metadata"
              poster={videoConfig.poster}
              className="block h-full max-h-full w-auto max-w-full bg-transparent object-contain"
              onLoadedMetadata={(event) => {
                const videoElement = event.currentTarget
                setDuration(videoElement.duration)
                setCurrentTime(videoElement.currentTime)
                setIsPaused(videoElement.paused)
                setIsMuted(videoElement.muted)
              }}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => setIsPaused(false)}
              onPause={() => setIsPaused(true)}
              onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
            >
              {videoConfig.sources.map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
              {t(videoConfig.fallbackKey)}
            </video>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-10 items-center justify-end gap-3 bg-transparent px-4">
          <button
            type="button"
            aria-label={playbackLabel}
            onClick={togglePlayback}
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-transparent text-gray-700 transition-colors hover:bg-gray-200/70 hover:text-gray-900"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <div className="font-mono text-[11px] tabular-nums leading-none text-gray-600">
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </div>
          <button
            type="button"
            aria-label={mutedLabel}
            onClick={toggleMuted}
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-transparent text-gray-700 transition-colors hover:bg-gray-200/70 hover:text-gray-900"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <button
            type="button"
            aria-label={fullscreenLabel}
            onClick={toggleFullscreen}
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-transparent text-gray-700 transition-colors hover:bg-gray-200/70 hover:text-gray-900"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  )
}
