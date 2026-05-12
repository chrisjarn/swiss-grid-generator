import type { MessageKey } from "@/lib/i18n"

export const ONBOARDING_VIDEO_IDS = ["quick-start-video-001"] as const

export type OnboardingVideoId = (typeof ONBOARDING_VIDEO_IDS)[number]

export type OnboardingVideoSource = {
  src: `/onboarding/${string}`
  type: "video/webm" | "video/mp4"
}

export type OnboardingVideoConfig = {
  id: OnboardingVideoId
  titleKey: MessageKey
  closeLabelKey: MessageKey
  fallbackKey: MessageKey
  poster: `/onboarding/${string}`
  sources: readonly OnboardingVideoSource[]
}

const ONBOARDING_VIDEO_BY_PRESET_PATH: Readonly<Record<string, OnboardingVideoId>> = {
  "./data/000-quick-start-video-001.json": "quick-start-video-001",
}

export const ONBOARDING_VIDEOS: Readonly<Record<OnboardingVideoId, OnboardingVideoConfig>> = {
  "quick-start-video-001": {
    id: "quick-start-video-001",
    titleKey: "ui.preview.onboarding.quickStartTitle",
    closeLabelKey: "ui.preview.onboarding.close",
    fallbackKey: "ui.preview.onboarding.fallback",
    poster: "/onboarding/quick-start-video-001-poster.jpg",
    sources: [
      {
        src: "/onboarding/quick-start-video-001.webm",
        type: "video/webm",
      },
      {
        src: "/onboarding/quick-start-video-001.mp4",
        type: "video/mp4",
      },
    ],
  },
}

export function resolveOnboardingVideoIdForPresetPath(sourcePath: string): OnboardingVideoId | undefined {
  return ONBOARDING_VIDEO_BY_PRESET_PATH[sourcePath]
}

export function getOnboardingVideoConfig(videoId: OnboardingVideoId | null | undefined): OnboardingVideoConfig | null {
  if (!videoId) return null
  return ONBOARDING_VIDEOS[videoId] ?? null
}
