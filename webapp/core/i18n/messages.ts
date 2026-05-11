import enMessages from "@/messages/en.json"

export const DEFAULT_LOCALE = "en" as const

export const messages = enMessages

export type Messages = typeof messages

type JoinPath<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`

type MessageLeafPath<Value, Prefix extends string = ""> = Value extends string
  ? Prefix
  : Value extends readonly unknown[]
    ? never
    : Value extends Record<string, unknown>
      ? {
          [Key in Extract<keyof Value, string>]: MessageLeafPath<Value[Key], JoinPath<Prefix, Key>>
        }[Extract<keyof Value, string>]
      : never

export type MessageKey = MessageLeafPath<Messages>

type MessageValues = Record<string, string | number>

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
