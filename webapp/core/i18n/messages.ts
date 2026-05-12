import { messages, type MessageKey } from "@/messages"

export { DEFAULT_LOCALE, messages, messagesByLocale } from "@/messages"
export type { Locale, MessageKey, Messages } from "@/messages"

export type MessageValues = Record<string, string | number>

function resolveMessage(key: MessageKey): string {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined
    return (current as Record<string, unknown>)[segment]
  }, messages)

  if (typeof value !== "string") {
    throw new Error(`Missing message for key "${key}"`)
  }

  return value
}

export function translateMessage(key: MessageKey, values?: MessageValues): string {
  const template = resolveMessage(key)
  if (!values) return template

  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, token) => {
    const value = values[token]
    return value === undefined ? match : String(value)
  })
}

export default messages
