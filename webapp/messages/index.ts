import enMessages from "@/messages/en.json"

export const DEFAULT_LOCALE = "en" as const

export const locales = ["en"] as const

export type Locale = (typeof locales)[number]

export const messagesByLocale = {
  en: enMessages,
} as const

export const messages = messagesByLocale[DEFAULT_LOCALE]

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

export default messages
