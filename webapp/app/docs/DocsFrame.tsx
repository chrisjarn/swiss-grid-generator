"use client"

import { useEffect, useState } from "react"

const DOCUMENTATION_ENTRY = "/doc/index.html"

function getDocumentationFrameSrc() {
  if (typeof window === "undefined") return DOCUMENTATION_ENTRY
  return `${DOCUMENTATION_ENTRY}${window.location.hash}`
}

export function DocsFrame({
  title,
}: {
  title: string
}) {
  const [src, setSrc] = useState(DOCUMENTATION_ENTRY)

  useEffect(() => {
    const updateSrc = () => setSrc(getDocumentationFrameSrc())
    updateSrc()
    window.addEventListener("hashchange", updateSrc)
    return () => window.removeEventListener("hashchange", updateSrc)
  }, [])

  return (
    <iframe
      title={title}
      src={src}
      className="fixed inset-0 h-dvh w-dvw border-0 bg-background"
    />
  )
}
