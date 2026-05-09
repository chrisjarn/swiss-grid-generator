"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ShellProps = {
  topBar?: ReactNode
  leftPanel?: ReactNode
  rightPanel?: ReactNode
  children: ReactNode
  dialogs?: ReactNode
  className?: string
}

export function Shell({
  topBar,
  leftPanel,
  rightPanel,
  children,
  dialogs,
  className,
}: ShellProps) {
  return (
    <main
      className={cn(
        "grid min-h-screen grid-rows-[auto_1fr] overflow-hidden bg-neutral-100 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50",
        className,
      )}
    >
      {topBar ? (
        <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          {topBar}
        </header>
      ) : null}
      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)_280px]">
        {leftPanel ? (
          <aside className="min-h-0 overflow-y-auto border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            {leftPanel}
          </aside>
        ) : null}
        <section className="min-h-0 overflow-hidden bg-neutral-100 dark:bg-neutral-900">
          {children}
        </section>
        {rightPanel ? (
          <aside className="min-h-0 overflow-y-auto border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            {rightPanel}
          </aside>
        ) : null}
      </div>
      {dialogs}
    </main>
  )
}
