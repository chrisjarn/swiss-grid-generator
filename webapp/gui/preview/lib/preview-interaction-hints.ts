import { translateMessage } from "@/lib/i18n"

export const PREVIEW_INTERACTION_HINT_LINES = [
  translateMessage("ui.preview.interactionHints.edit"),
  translateMessage("ui.preview.interactionHints.createParagraph"),
  translateMessage("ui.preview.interactionHints.createImage"),
  translateMessage("ui.preview.interactionHints.duplicate"),
] as const

export const PREVIEW_INTERACTION_HINT_SINGLE_LINE = PREVIEW_INTERACTION_HINT_LINES.join("  •  ")
