"use client"

import { useCallback } from "react"

import { translateMessage, type MessageKey } from "@/core/i18n/messages"

type TranslationValues = Parameters<typeof translateMessage>[1]

export function useTranslation() {
  const t = useCallback((key: MessageKey, values?: TranslationValues) => (
    translateMessage(key, values)
  ), [])

  return { t }
}
