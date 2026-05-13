export const DOCUMENTATION_URL = "/docs"

export function openDocumentation(sectionId?: string) {
  const hash = sectionId ? `#${encodeURIComponent(sectionId)}` : ""
  window.open(`${DOCUMENTATION_URL}${hash}`, "_blank", "noopener,noreferrer")
}
