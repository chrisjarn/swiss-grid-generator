"use client"

import { useEffect, type ReactNode } from "react"

import { useWorkspaceStore } from "@/gui/state/workspaceStore"
import { getUiThemeColor } from "@/lib/theme-color"

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const isDarkUi = useWorkspaceStore((state) => state.darkMode)
  const setDarkUi = useWorkspaceStore((state) => state.setDarkMode)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const applyTheme = (matches: boolean) => setDarkUi(matches)
    applyTheme(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => applyTheme(event.matches)
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [setDarkUi])

  useEffect(() => {
    if (typeof document === "undefined") return

    document.documentElement.classList.toggle("dark", isDarkUi)
    document.documentElement.classList.toggle("light", !isDarkUi)
    const content = getUiThemeColor()
    let meta = document.getElementById("app-theme-color")
    if (!(meta instanceof HTMLMetaElement)) {
      meta = document.createElement("meta")
      meta.setAttribute("id", "app-theme-color")
      meta.setAttribute("data-app-theme-color", "true")
      meta.setAttribute("name", "theme-color")
      document.head.appendChild(meta)
    }
    if (content) meta.setAttribute("content", content)
  }, [isDarkUi])

  return children
}
