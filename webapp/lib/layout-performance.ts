export type LayoutPerformanceMetadata = Record<string, boolean | number | string | null | undefined>

export const LAYOUT_PROFILING_ENV_KEY = "NEXT_PUBLIC_LAYOUT_PROFILING"

function isProfilingFlagEnabled(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true"
}

export function isLayoutProfilingEnabled(): boolean {
  return isProfilingFlagEnabled(process.env.NEXT_PUBLIC_LAYOUT_PROFILING)
}

function getNowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now()
}

function formatMetadata(metadata: LayoutPerformanceMetadata | undefined): string {
  if (!metadata) return ""
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined)
  if (entries.length === 0) return ""
  return ` ${entries.map(([key, value]) => `${key}=${String(value)}`).join(" ")}`
}

export function recordLayoutPerformanceMetric(
  label: string,
  durationMs: number,
  metadata?: LayoutPerformanceMetadata,
): void {
  if (!isLayoutProfilingEnabled()) return
  console.info(`[sgg:layout-profile] ${label} ${durationMs.toFixed(2)}ms${formatMetadata(metadata)}`)
}

export function measureLayoutPerformance<T>(
  label: string,
  run: () => T,
  metadata?: LayoutPerformanceMetadata,
): T {
  if (!isLayoutProfilingEnabled()) return run()
  const startedAt = getNowMs()
  try {
    return run()
  } finally {
    recordLayoutPerformanceMetric(label, getNowMs() - startedAt, metadata)
  }
}

export async function measureLayoutPerformanceAsync<T>(
  label: string,
  run: () => Promise<T>,
  metadata?: LayoutPerformanceMetadata,
): Promise<T> {
  if (!isLayoutProfilingEnabled()) return run()
  const startedAt = getNowMs()
  try {
    return await run()
  } finally {
    recordLayoutPerformanceMetric(label, getNowMs() - startedAt, metadata)
  }
}
