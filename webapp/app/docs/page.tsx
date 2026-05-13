import type { Metadata } from "next"

import { translateMessage } from "@/core/i18n/messages"
import { DocsFrame } from "@/app/docs/DocsFrame"

export const metadata: Metadata = {
  title: translateMessage("ui.shell.topBar.supportMenu.documentation"),
  robots: "index, follow",
}

export default function DocsPage() {
  return (
    <DocsFrame title={translateMessage("ui.shell.topBar.supportMenu.documentation")} />
  )
}
