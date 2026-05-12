import { translateMessage } from "@/core/i18n/messages"

export const BASE_BLOCK_IDS = ["display", "headline", "subhead", "body", "caption"] as const

export type BaseBlockId = typeof BASE_BLOCK_IDS[number]

const DEFAULT_COPYRIGHT_YEAR = new Date().getFullYear()

export const DEFAULT_TEXT_CONTENT: Readonly<Record<BaseBlockId, string>> = {
  display: translateMessage("app.defaultContent.display"),
  headline: translateMessage("app.defaultContent.headline"),
  subhead: translateMessage("app.defaultContent.subhead"),
  body: translateMessage("app.defaultContent.body"),
  caption: translateMessage("app.defaultContent.caption", { year: DEFAULT_COPYRIGHT_YEAR }),
}

export const DEFAULT_STYLE_ASSIGNMENTS: Readonly<Record<BaseBlockId, BaseBlockId>> = {
  display: "display",
  headline: "headline",
  subhead: "subhead",
  body: "body",
  caption: "caption",
}

export function isBaseBlockId(key: string): key is BaseBlockId {
  return (BASE_BLOCK_IDS as readonly string[]).includes(key)
}

export function createDefaultTextContent(): Record<BaseBlockId, string> {
  return { ...DEFAULT_TEXT_CONTENT }
}

export function createDefaultStyleAssignments(): Record<BaseBlockId, BaseBlockId> {
  return { ...DEFAULT_STYLE_ASSIGNMENTS }
}
