import type { ExportEngineTimingEntry } from "@/lib/export-engine"

export function formatExportDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(2)}s`
}

export function formatExportElapsedPrefix(elapsedMs: number): string {
  const seconds = (elapsedMs / 1000).toFixed(1).padStart(6, " ")
  return `[+${seconds}s]`
}

export function createExportElapsedLogFormatter(startedAt = performance.now()): (message: string) => string {
  return (message: string) => `${formatExportElapsedPrefix(performance.now() - startedAt)} ${message}`
}

export function formatExportTimingLine(entry: ExportEngineTimingEntry): string {
  const seconds = formatExportDuration(entry.durationMs).padStart(8, " ")
  return `  ${entry.label.padEnd(22)} ${seconds}${entry.extra ? ` ${entry.extra}` : ""}`
}

export function formatExportPerformanceSummaryLines(
  timings: readonly ExportEngineTimingEntry[],
  totalDurationMs: number,
): string[] {
  return [
    "performance summary:",
    ...timings.map(formatExportTimingLine),
    `  ${"total".padEnd(22)} ${formatExportDuration(totalDurationMs).padStart(8, " ")}`,
  ]
}
