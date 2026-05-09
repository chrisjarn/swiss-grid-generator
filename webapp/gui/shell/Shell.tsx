"use client"

import { ThemeProvider } from "@/gui/shell/ThemeProvider"
import { ShellModelView } from "@/gui/shell/useShellModel"

export default function Shell() {
  return (
    <ThemeProvider>
      <ShellModelView />
    </ThemeProvider>
  )
}
