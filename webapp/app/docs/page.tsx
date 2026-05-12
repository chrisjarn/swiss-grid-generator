import type { Metadata } from "next"

import { translateMessage } from "@/core/i18n/messages"

const DOCUMENTATION_ENTRY = "/doc/index.html"

export const metadata: Metadata = {
  title: translateMessage("ui.shell.topBar.supportMenu.documentation"),
  robots: "index, follow",
}

export default function DocsPage() {
  return (
    <iframe
      title={translateMessage("ui.shell.topBar.supportMenu.documentation")}
      src={DOCUMENTATION_ENTRY}
      className="fixed inset-0 h-dvh w-dvw border-0 bg-background"
    />
  )
}
