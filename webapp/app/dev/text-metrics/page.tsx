"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DEFAULT_TEXT_METRICS_PARITY_THRESHOLDS,
  evaluateDeterministicOpticalMarginThresholds,
  evaluatePreviewPlanThresholds,
  evaluateTextMetricsProductionParityThresholds,
  evaluateTextMetricsParityThresholds,
  type TextMetricsParityThresholdReport,
} from "@/lib/text-metrics-parity-thresholds"
import type {
  TextMetricsPresetParityReport,
  TextMetricsPresetParityReportOptions,
} from "@/lib/text-metrics-dev-report"

type CaptureState =
  | {
      status: "idle" | "running"
      downloadUrl: null
      filename: null
      payloadSize: 0
      thresholdReport: null
      productionThresholdReport: null
      deterministicOpticalMarginThresholdReport: null
      previewPlanThresholdReport: null
      previewCanvasAdapterThresholdReport: null
      error: null
    }
  | {
      status: "passed" | "failed"
      downloadUrl: string
      filename: string
      payloadSize: number
      thresholdReport: TextMetricsParityThresholdReport
      productionThresholdReport: TextMetricsParityThresholdReport
      deterministicOpticalMarginThresholdReport: TextMetricsParityThresholdReport
      previewPlanThresholdReport: TextMetricsParityThresholdReport
      previewCanvasAdapterThresholdReport: TextMetricsParityThresholdReport
      error: null
    }
  | {
      status: "error"
      downloadUrl: null
      filename: null
      payloadSize: 0
      thresholdReport: null
      productionThresholdReport: null
      deterministicOpticalMarginThresholdReport: null
      previewPlanThresholdReport: null
      previewCanvasAdapterThresholdReport: null
      error: string
    }

const DEFAULT_OPTIONS: Required<TextMetricsPresetParityReportOptions> = {
  sampleLimit: 240,
  maxTextLength: 180,
  exportPageLimit: 80,
}

function readNumericParam(search: string, key: keyof Required<TextMetricsPresetParityReportOptions>): number {
  const raw = new URLSearchParams(search).get(key)
  if (!raw) return DEFAULT_OPTIONS[key]
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_OPTIONS[key]
}

function resolveCaptureOptions(): Required<TextMetricsPresetParityReportOptions> {
  if (typeof window === "undefined") return DEFAULT_OPTIONS
  return {
    sampleLimit: readNumericParam(window.location.search, "sampleLimit"),
    maxTextLength: readNumericParam(window.location.search, "maxTextLength"),
    exportPageLimit: readNumericParam(window.location.search, "exportPageLimit"),
  }
}

function getBrowserMetadata() {
  if (typeof window === "undefined") {
    return {
      capturedAt: new Date().toISOString(),
      userAgent: "",
      devicePixelRatio: 1,
      viewport: { width: 0, height: 0 },
    }
  }

  return {
    capturedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    devicePixelRatio: window.devicePixelRatio,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  }
}

function formatByteSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function createCaptureFilename(capturedAt: string): string {
  return `swiss-grid-text-metrics-${capturedAt.replace(/[:.]/g, "-")}.json`
}

function summarizeReport(report: TextMetricsPresetParityReport) {
  return {
    activeEngineId: report.activeEngineId,
    candidateEngineId: report.candidateEngineId,
    sampleCount: report.sampleCount,
    maxAbsWidthDelta: report.maxAbsWidthDelta,
    averageAbsWidthDelta: report.averageAbsWidthDelta,
    maxAbsAdvanceDelta: report.maxAbsAdvanceDelta,
    averageAbsAdvanceDelta: report.averageAbsAdvanceDelta,
    maxAbsOpticalKerningDelta: report.maxAbsOpticalKerningDelta,
    averageAbsOpticalKerningDelta: report.averageAbsOpticalKerningDelta,
    wrappedTextChangedCount: report.wrappedTextChangedCount,
    wrappedLineCountChangedCount: report.wrappedLineCountChangedCount,
    largestWidthDeltas: report.largestWidthDeltas.slice(0, 8),
    largestAdvanceDeltas: report.largestAdvanceDeltas.slice(0, 8),
    largestOpticalKerningDeltas: report.largestOpticalKerningDeltas.slice(0, 8),
    exportPlan: {
      ...report.exportPlan,
      largestDeltas: report.exportPlan.largestDeltas.slice(0, 8),
      boundaryVetoSummary: {
        ...report.exportPlan.boundaryVetoSummary,
        largestVetoes: report.exportPlan.boundaryVetoSummary.largestVetoes.slice(0, 8),
      },
    },
    rangeCalibration: {
      ...report.rangeCalibration,
      largestDeltas: report.rangeCalibration.largestDeltas.slice(0, 8),
      boundaryVetoSummary: {
        ...report.rangeCalibration.boundaryVetoSummary,
        largestVetoes: report.rangeCalibration.boundaryVetoSummary.largestVetoes.slice(0, 8),
      },
    },
    rangeCalibrationClassCorrection: {
      ...report.rangeCalibrationClassCorrection,
      largestDeltas: report.rangeCalibrationClassCorrection.largestDeltas.slice(0, 8),
      boundaryVetoSummary: {
        ...report.rangeCalibrationClassCorrection.boundaryVetoSummary,
        largestVetoes: report.rangeCalibrationClassCorrection.boundaryVetoSummary.largestVetoes.slice(0, 8),
      },
    },
    deterministicOpticalMargin: {
      ...report.deterministicOpticalMargin,
      largestDeltas: report.deterministicOpticalMargin.largestDeltas.slice(0, 8),
      boundaryVetoSummary: {
        ...report.deterministicOpticalMargin.boundaryVetoSummary,
        largestVetoes: report.deterministicOpticalMargin.boundaryVetoSummary.largestVetoes.slice(0, 8),
      },
    },
    previewPlan: {
      ...report.previewPlan,
      largestDeltas: report.previewPlan.largestDeltas.slice(0, 8),
    },
    previewCanvasAdapter: {
      ...report.previewCanvasAdapter,
      largestDeltas: report.previewCanvasAdapter.largestDeltas.slice(0, 8),
    },
    productionExportPlanSignatures: report.productionExportPlanSignatures,
    deterministicOpticalMarginExportPlanSignatures: report.deterministicOpticalMarginExportPlanSignatures,
    browserDiagnostics: report.browserDiagnostics,
    diagnosis: report.diagnosis,
  }
}

export default function TextMetricsDevPage() {
  const payloadRef = useRef("")
  const downloadUrlRef = useRef<string | null>(null)
  const [copyStatus, setCopyStatus] = useState("")
  const [captureState, setCaptureState] = useState<CaptureState>({
    status: "idle",
    downloadUrl: null,
    filename: null,
    payloadSize: 0,
    thresholdReport: null,
    productionThresholdReport: null,
    deterministicOpticalMarginThresholdReport: null,
    previewPlanThresholdReport: null,
    previewCanvasAdapterThresholdReport: null,
    error: null,
  })
  const [options, setOptions] = useState<Required<TextMetricsPresetParityReportOptions>>(DEFAULT_OPTIONS)

  useEffect(() => {
    setOptions(resolveCaptureOptions())
  }, [])
  const isDevelopment = process.env.NODE_ENV === "development"

  const runCapture = useCallback(async () => {
    if (!isDevelopment) {
      setCaptureState({
        status: "error",
        downloadUrl: null,
        filename: null,
        payloadSize: 0,
        thresholdReport: null,
        productionThresholdReport: null,
        deterministicOpticalMarginThresholdReport: null,
        previewPlanThresholdReport: null,
        previewCanvasAdapterThresholdReport: null,
        error: "Text metrics capture is only available in development builds.",
      })
      return
    }

    setCopyStatus("")
    payloadRef.current = ""
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current)
      downloadUrlRef.current = null
    }
    setCaptureState({
      status: "running",
      downloadUrl: null,
      filename: null,
      payloadSize: 0,
      thresholdReport: null,
      productionThresholdReport: null,
      deterministicOpticalMarginThresholdReport: null,
      previewPlanThresholdReport: null,
      previewCanvasAdapterThresholdReport: null,
      error: null,
    })

    try {
      const { runPresetTextMetricsParityReport } = await import("@/lib/text-metrics-dev-report")
      const report = await runPresetTextMetricsParityReport(options)
      const thresholdReport = evaluateTextMetricsParityThresholds(report)
      const productionThresholdReport = evaluateTextMetricsProductionParityThresholds(report)
      const deterministicOpticalMarginThresholdReport = evaluateDeterministicOpticalMarginThresholds(
        report.deterministicOpticalMargin,
      )
      const previewPlanThresholdReport = evaluatePreviewPlanThresholds(report.previewPlan)
      const previewCanvasAdapterThresholdReport = evaluatePreviewPlanThresholds(
        report.previewCanvasAdapter,
        undefined,
        "previewCanvasAdapter",
      )
      const browser = getBrowserMetadata()
      const payload = JSON.stringify({
        kind: "swiss-grid-generator.text-metrics-parity-capture",
        browser,
        options,
        thresholds: DEFAULT_TEXT_METRICS_PARITY_THRESHOLDS,
        thresholdReport,
        productionThresholdReport,
        deterministicOpticalMarginThresholdReport,
        previewPlanThresholdReport,
        previewCanvasAdapterThresholdReport,
        report: summarizeReport(report),
      })
      const blob = new Blob([payload], { type: "application/json" })
      const downloadUrl = URL.createObjectURL(blob)
      const filename = createCaptureFilename(browser.capturedAt)
      payloadRef.current = payload
      downloadUrlRef.current = downloadUrl

      setCaptureState({
        status: productionThresholdReport.status,
        downloadUrl,
        filename,
        payloadSize: blob.size,
        thresholdReport,
        productionThresholdReport,
        deterministicOpticalMarginThresholdReport,
        previewPlanThresholdReport,
        previewCanvasAdapterThresholdReport,
        error: null,
      })
    } catch (error) {
      payloadRef.current = ""
      setCaptureState({
        status: "error",
        downloadUrl: null,
        filename: null,
        payloadSize: 0,
        thresholdReport: null,
        productionThresholdReport: null,
        deterministicOpticalMarginThresholdReport: null,
        previewPlanThresholdReport: null,
        previewCanvasAdapterThresholdReport: null,
        error: error instanceof Error ? error.stack ?? error.message : String(error),
      })
    }
  }, [isDevelopment, options])

  const copyPayload = useCallback(async () => {
    if (!payloadRef.current) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payloadRef.current)
      } else {
        throw new Error("Clipboard API unavailable")
      }
      setCopyStatus("Copied")
    } catch {
      setCopyStatus("Copy unavailable; use Download JSON")
    }
  }, [])

  const downloadPayload = useCallback(() => {
    if (!captureState.downloadUrl || !captureState.filename) return
    const link = document.createElement("a")
    link.href = captureState.downloadUrl
    link.download = captureState.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }, [captureState.downloadUrl, captureState.filename])

  useEffect(() => {
    void runCapture()
  }, [runCapture])

  useEffect(() => () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
  }, [])

  const statusClassName = captureState.status === "passed"
    ? "border-emerald-600 bg-emerald-50 text-emerald-950"
    : captureState.status === "failed" || captureState.status === "error"
      ? "border-red-600 bg-red-50 text-red-950"
      : "border-neutral-300 bg-neutral-50 text-neutral-950"

  return (
    <main className="min-h-screen bg-white px-8 py-6 text-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="border-b border-neutral-200 pb-4">
          <p className="text-[11px] font-bold uppercase text-red-400">
            Text Metrics Diagnostic
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            Browser Metric Capture
          </h1>
        </header>

        <section className={`border px-4 py-3 text-sm ${statusClassName}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold uppercase">
                {captureState.status}
              </div>
              <div className="mt-1 text-xs">
                Samples {options.sampleLimit}, max text {options.maxTextLength}, export pages {options.exportPageLimit}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={runCapture}
                className="border border-neutral-950 px-3 py-2 text-xs font-semibold uppercase"
              >
                Run
              </button>
              <button
                type="button"
                onClick={copyPayload}
                disabled={!payloadRef.current}
                className="border border-neutral-950 px-3 py-2 text-xs font-semibold uppercase disabled:border-neutral-300 disabled:text-neutral-400"
              >
                Copy JSON
              </button>
              <button
                type="button"
                onClick={downloadPayload}
                disabled={!captureState.downloadUrl}
                className="border border-neutral-950 px-3 py-2 text-xs font-semibold uppercase disabled:border-neutral-300 disabled:text-neutral-400"
              >
                Download JSON
              </button>
            </div>
          </div>
          {captureState.filename ? (
            <div className="mt-2 text-xs">
              Ready: {captureState.filename} ({formatByteSize(captureState.payloadSize)})
            </div>
          ) : null}
          {captureState.productionThresholdReport ? (
            <div className="mt-2 text-xs">
              Production parity: {captureState.productionThresholdReport.status}
              {captureState.deterministicOpticalMarginThresholdReport
                ? ` / Deterministic optical margin: ${captureState.deterministicOpticalMarginThresholdReport.status}`
                : ""}
              {captureState.previewPlanThresholdReport
                ? ` / Preview plan: ${captureState.previewPlanThresholdReport.status}`
                : ""}
              {captureState.previewCanvasAdapterThresholdReport
                ? ` / Preview canvas adapter: ${captureState.previewCanvasAdapterThresholdReport.status}`
                : ""}
              {captureState.thresholdReport.status !== captureState.productionThresholdReport.status
                ? ` / Browser canvas diagnostic: ${captureState.thresholdReport.status}`
                : ""}
            </div>
          ) : null}
          {copyStatus ? <div className="mt-2 text-xs">{copyStatus}</div> : null}
          {captureState.productionThresholdReport?.failures.length ? (
            <ul className="mt-3 list-inside list-disc text-xs">
              {captureState.productionThresholdReport.failures.map((failure) => (
                <li key={failure.label}>
                  {failure.label}: {failure.actual} {failure.operator} {failure.expected}
                </li>
              ))}
            </ul>
          ) : null}
          {captureState.error ? (
            <pre className="mt-3 whitespace-pre-wrap text-xs">{captureState.error}</pre>
          ) : null}
        </section>
      </div>
    </main>
  )
}
