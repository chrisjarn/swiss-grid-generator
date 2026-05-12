export function getFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null
  return document.fullscreenElement
}

export async function requestElementFullscreen(target: Element | null): Promise<void> {
  if (!target || getFullscreenElement() || typeof target.requestFullscreen !== "function") return
  await target.requestFullscreen()
}

export async function exitFullscreenIfActive(): Promise<void> {
  if (typeof document === "undefined" || !getFullscreenElement() || typeof document.exitFullscreen !== "function") return
  await document.exitFullscreen()
}
