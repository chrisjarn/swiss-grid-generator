import { translateMessage } from "@/lib/i18n"

export const PREVIEW_INTERACTION_HINT_LINES = [
  translateMessage("preview.interactionHints.edit"),
  translateMessage("preview.interactionHints.createParagraph"),
  translateMessage("preview.interactionHints.createImage"),
  translateMessage("preview.interactionHints.duplicate"),
] as const

export const PREVIEW_INTERACTION_HINT_SINGLE_LINE = PREVIEW_INTERACTION_HINT_LINES.join("  •  ")
