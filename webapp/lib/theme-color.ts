export const UI_THEME_COLOR_PROPERTY = "--color-app-background"

export function getUiThemeColor() {
  if (typeof document === "undefined") return ""
  return window.getComputedStyle(document.documentElement).getPropertyValue(UI_THEME_COLOR_PROPERTY).trim()
}
