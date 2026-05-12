"use client"

import { Pause, Play, Volume2, VolumeX, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { useTranslation } from "@/lib/i18n"
import type { OnboardingVideoId } from "@/lib/onboarding/videos"
import { getOnboardingVideoConfig } from "@/lib/onboarding/videos"

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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoConfig = getOnboardingVideoConfig(videoId)

  const closeDialog = useCallback(() => {
    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.pause()
      videoElement.currentTime = 0
    }
    onClose()
  }, [onClose])

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

  const handleSeek = useCallback((value: string) => {
    const nextTime = Number(value)
    const videoElement = videoRef.current
    if (!videoElement || !Number.isFinite(nextTime)) return
    videoElement.currentTime = nextTime
    setCurrentTime(nextTime)
  }, [])

  useEffect(() => {
    if (!videoConfig) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      closeDialog()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeDialog, videoConfig])

  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setIsPaused(false)
    setIsMuted(true)
  }, [videoConfig?.id])

  if (!videoConfig) return null

  const title = t(videoConfig.titleKey)
  const closeLabel = t(videoConfig.closeLabelKey)
  const playLabel = t("ui.preview.onboarding.play")
  const pauseLabel = t("ui.preview.onboarding.pause")
  const muteLabel = t("ui.preview.onboarding.mute")
  const unmuteLabel = t("ui.preview.onboarding.unmute")
  const seekLabel = t("ui.preview.onboarding.seek")
  const playbackLabel = isPaused ? playLabel : pauseLabel
  const mutedLabel = isMuted ? unmuteLabel : muteLabel

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f3f4f6]"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        closeDialog()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-video-title"
        className="relative flex h-[100dvh] w-[100vw] flex-col overflow-hidden bg-[#f3f4f6] text-gray-900"
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-gray-300 px-4">
          <h2
            id="onboarding-video-title"
            className="min-w-0 truncate text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-gray-900"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={closeDialog}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#f3f4f6]">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            preload="metadata"
            poster={videoConfig.poster}
            className="h-full max-h-full w-full max-w-full bg-[#f3f4f6] object-contain"
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
        <div className="grid h-12 shrink-0 grid-cols-[32px_1fr_84px_32px] items-center gap-3 border-t border-gray-300 px-4">
          <button
            type="button"
            aria-label={playbackLabel}
            onClick={togglePlayback}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(currentTime, duration || currentTime)}
            aria-label={seekLabel}
            onChange={(event) => handleSeek(event.currentTarget.value)}
            className="h-1 w-full cursor-pointer accent-[#E87820]"
          />
          <div className="font-mono text-[11px] tabular-nums leading-none text-gray-600">
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </div>
          <button
            type="button"
            aria-label={mutedLabel}
            onClick={toggleMuted}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  )
}
