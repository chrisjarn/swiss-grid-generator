import type { TextStyleTransferMode } from "@/lib/preview-text-style-transfer"

export type TextCopyAffordanceAction =
  | { kind: "duplicate" }
  | { kind: "transfer"; mode: Exclude<TextStyleTransferMode, "full"> }

export function resolveTextCopyAffordanceAction({
  altKey,
  shiftKey,
}: {
  altKey: boolean
  shiftKey: boolean
}): TextCopyAffordanceAction {
  if (altKey && shiftKey) return { kind: "transfer", mode: "both" }
  if (shiftKey) return { kind: "transfer", mode: "paragraph" }
  if (altKey) return { kind: "transfer", mode: "typo" }
  return { kind: "duplicate" }
}
