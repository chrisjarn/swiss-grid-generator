"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { parseLoadedProject, type LoadedProject } from "@/core/document/session"
import {
  formatProjectExportPageSelection,
  parseProjectExportPageSelectionDraft,
} from "@/core/export/project-page-export-source"
import type { ExportEngineProgress, ExportEngineResult } from "@/lib/export-engine"
import { DEFAULT_EXPORT_BLEED_OPTIONS } from "@/lib/export-format-options"
import {
  createExportElapsedLogFormatter,
  formatExportPerformanceSummaryLines,
} from "@/lib/export-performance-log"
import { runPdfExportInBrowserWorker } from "@/lib/pdf-export-worker-client"

type BenchmarkStatus = "idle" | "loading" | "running" | "complete" | "error"
type CopyStatus = "idle" | "copied" | "failed"

type BenchmarkResult = {
  status: "complete"
  fixture: string
  range: string
  selectedPages: number
  outputBytes: number
  totalDurationMs: number
  userAgent: string
  timings: ExportEngineResult["timings"]
  logLines: string[]
}

const ALLOWED_FIXTURES = new Set([
  "performance-100-pages.json",
  "performance-1000-pages.json",
  "performance-1000-pages-static-text.json",
])

declare global {
  interface Window {
    __SGG_PDF_EXPORT_BENCHMARK__?: BenchmarkResult
  }
}

function getQueryValue(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback
  return new URLSearchParams(window.location.search).get(key) ?? fallback
}

function getResultJson(result: BenchmarkResult | null, error: string | null): string {
  if (result) return JSON.stringify(result, null, 2)
  if (error) return JSON.stringify({ status: "error", error }, null, 2)
  return ""
}

async function loadBenchmarkProject(fixture: string): Promise<LoadedProject<Record<string, unknown>>> {
  if (!ALLOWED_FIXTURES.has(fixture)) throw new Error(`unknown fixture: ${fixture}`)
  const response = await fetch(`/benchmark-fixtures/${encodeURIComponent(fixture)}`, {
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error(`fixture load failed: ${response.status}`)
  }
  return parseLoadedProject(await response.json())
}

export default function PdfExportBenchmarkPage() {
  const [status, setStatus] = useState<BenchmarkStatus>("idle")
  const [progress, setProgress] = useState<ExportEngineProgress | null>(null)
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")
  const runningRef = useRef(false)

  const fixture = useMemo(() => getQueryValue("fixture", "performance-1000-pages.json"), [])
  const range = useMemo(() => getQueryValue("range", "1-1000"), [])
  const autostart = useMemo(() => getQueryValue("autostart", "1") !== "0", [])
  const output = getResultJson(result, error)

  const runBenchmark = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    setStatus("loading")
    setError(null)
    setResult(null)
    setProgress(null)
    setCopyStatus("idle")

    try {
      const formatLogLine = createExportElapsedLogFormatter()
      const logLines: string[] = []
      const appendLog = (message: string) => {
        const line = formatLogLine(message)
        logLines.push(line)
        console.info(line)
      }
      appendLog(`fixture: ${fixture}`)
      appendLog(`range: ${range}`)

      const project = await loadBenchmarkProject(fixture)
      const selection = parseProjectExportPageSelectionDraft(range, project.pages.length)
      if (!selection || selection.pageNumbers.length === 0) {
        throw new Error(`invalid range: ${range}`)
      }
      appendLog(`pages: ${selection.pageNumbers.length} selected from ${project.pages.length}`)

      setStatus("running")
      const exportResult = await runPdfExportInBrowserWorker({
        project,
        pageNumbers: selection.pageNumbers,
        visibilitySettings: project.visibilitySettings,
        filename: "browser-pdf-export-benchmark.pdf",
        bleed: DEFAULT_EXPORT_BLEED_OPTIONS,
        metadata: {
          title: project.metadata.title,
          description: project.metadata.description,
          author: project.metadata.author,
          createdAt: project.metadata.createdAt ?? new Date(0).toISOString(),
        },
        onProgress: (nextProgress) => {
          if (
            nextProgress.phase !== "rendering"
            || nextProgress.completedSteps === 0
            || nextProgress.completedSteps === nextProgress.totalSteps
            || nextProgress.completedSteps % 250 === 0
          ) {
            setProgress(nextProgress)
          }
        },
        onLog: appendLog,
        logEveryPages: 25,
      })
      for (const line of formatExportPerformanceSummaryLines(exportResult.timings, exportResult.totalDurationMs)) {
        appendLog(line)
      }
      const outputBytes = exportResult.outputs
        .filter((outputItem) => "bytes" in outputItem)
        .reduce((total, outputItem) => total + outputItem.bytes.byteLength, 0)
      const benchmarkResult: BenchmarkResult = {
        status: "complete",
        fixture,
        range: formatProjectExportPageSelection(selection.pageNumbers),
        selectedPages: selection.pageNumbers.length,
        outputBytes,
        totalDurationMs: exportResult.totalDurationMs,
        userAgent: window.navigator.userAgent,
        timings: exportResult.timings,
        logLines,
      }
      window.__SGG_PDF_EXPORT_BENCHMARK__ = benchmarkResult
      console.info("[Swiss Grid Generator] browser pdf export benchmark")
      console.info(JSON.stringify(benchmarkResult, null, 2))
      setResult(benchmarkResult)
      setStatus("complete")
    } catch (caught) {
      const message = caught instanceof Error ? caught.stack || caught.message : String(caught)
      setError(message)
      setStatus("error")
    } finally {
      runningRef.current = false
    }
  }, [fixture, range])

  const copyOutput = useCallback(async () => {
    if (!output) return
    try {
      await window.navigator.clipboard.writeText(output)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("failed")
    }
  }, [output])

  useEffect(() => {
    if (!autostart) return
    void runBenchmark()
  }, [autostart, runBenchmark])

  return (
    <main className="min-h-screen bg-[#e8e4dc] p-8 font-mono text-[12px] leading-5 text-[#151515]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b border-[#151515] pb-4">
          <h1 className="text-[16px] font-semibold uppercase tracking-0">pdf export benchmark</h1>
          <p className="mt-2 max-w-3xl">
            same browser worker path as the export dialog. result is written to the console and
            window.__SGG_PDF_EXPORT_BENCHMARK__.
          </p>
        </header>
        <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-1 border-b border-[#151515] pb-4">
          <dt>fixture</dt>
          <dd>{fixture}</dd>
          <dt>range</dt>
          <dd>{range}</dd>
          <dt>status</dt>
          <dd>{status}</dd>
          <dt>progress</dt>
          <dd>
            {progress
              ? `${progress.completedSteps}/${progress.totalSteps} ${progress.phase}`
              : "none"}
          </dd>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runBenchmark()}
            disabled={status === "loading" || status === "running"}
            className="border border-[#151515] px-4 py-2 disabled:opacity-50"
          >
            run benchmark
          </button>
          <button
            type="button"
            onClick={() => void copyOutput()}
            disabled={!output}
            className="border border-[#151515] px-4 py-2 disabled:opacity-50"
          >
            copy to clipboard
          </button>
          {copyStatus !== "idle" ? (
            <span>{copyStatus}</span>
          ) : null}
        </div>
        <pre className="mt-6 max-h-[60vh] overflow-auto whitespace-pre-wrap border border-[#151515] bg-[#f5f2ec] p-4">
          {output || "waiting"}
        </pre>
      </div>
    </main>
  )
}
