#!/usr/bin/env node
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const ROOT = process.cwd()
const DEFAULT_PORT = 3101
const START_TIMEOUT_MS = 60_000
const BROWSER_TIMEOUT_MS = 90_000

const DEFAULT_THRESHOLDS = {
  minSampleCount: 70,
  maxAbsWidthDelta: 6,
  averageAbsWidthDelta: 1.5,
  maxAbsAdvanceDelta: 9,
  averageAbsAdvanceDelta: 0.5,
  maxAbsOpticalKerningDelta: 13,
  averageAbsOpticalKerningDelta: 1.5,
  wrappedTextChangedCount: 0,
  wrappedLineCountChangedCount: 0,
  exportChangedCommandCount: 0,
  exportChangedCommandTextCount: 0,
  exportMaxAbsCommandXDelta: 6,
  exportMaxAbsCommandYDelta: 0.01,
  exportMaxAbsRectXDelta: 0.01,
  exportMaxAbsRectYDelta: 0.01,
  exportMaxAbsRectWidthDelta: 0.01,
  exportMaxAbsRectHeightDelta: 0.01,
  deterministicOpticalMarginChangedCommandCount: 0,
  deterministicOpticalMarginChangedCommandTextCount: 0,
  deterministicOpticalMarginMaxAbsCommandXDelta: 0.16,
  deterministicOpticalMarginMaxAbsCommandYDelta: 0.01,
  deterministicOpticalMarginMaxAbsRectDelta: 0.01,
}

const EXPECTED_PRODUCTION_EXPORT_PLAN_SIGNATURES = [
  {
    label: "Book Template Van de Graaf 4x5 12pt / Right Page",
    signature: "b5c80101",
  },
  {
    label: "Book Template Van de Graaf 4x5 12pt / Left Page",
    signature: "d8434522",
  },
  {
    label: "Book Template Van de Graaf 4x5 12pt / Facing Pages",
    signature: "b55b5496",
  },
  {
    label: "Swiss Grid Generator Manual / Title",
    signature: "cfeebf66",
  },
  {
    label: "Swiss Grid Generator Manual / Introduction",
    signature: "bab59184",
  },
  {
    label: "Swiss Grid Generator Manual / Quick Start",
    signature: "7e05e360",
  },
  {
    label: "Swiss Grid Generator Manual / Recommended Workflow",
    signature: "22dde627",
  },
  {
    label: "Swiss Grid Generator Manual / Pages and Document Structure",
    signature: "dd8e68af",
  },
  {
    label: "Swiss Grid Generator Manual / Grid, Margins, and Rhythm",
    signature: "17598dd8",
  },
  {
    label: "Swiss Grid Generator Manual / Typography",
    signature: "ccab0129",
  },
  {
    label: "Swiss Grid Generator Manual / Placing Text and Image Areas",
    signature: "491b89df",
  },
  {
    label: "Swiss Grid Generator Manual / Export",
    signature: "1dce46de",
  },
  {
    label: "Swiss Grid Generator Manual / Keyboard and Fast Interaction",
    signature: "81abe188",
  },
  {
    label: "Swiss Grid Generator Manual / Common Mistakes",
    signature: "f32f1f93",
  },
  {
    label: "Swiss Grid Generator Manual / Final Advice",
    signature: "522aae82",
  },
  {
    label: "Swiss Style Poster Example 001 / Poster AO",
    signature: "2c2e8c65",
  },
  {
    label: "Swiss Style Poster Example 002 / Swiss Style Poster",
    signature: "8c27f777",
  },
  {
    label: "Classic Poster Lookalike / Classic Poster Lookalike",
    signature: "48d95b71",
  },
  {
    label: "Classic Book Cover Lookalike / Blank Start Page",
    signature: "06ef2722",
  },
]

const EXPECTED_DETERMINISTIC_OPTICAL_MARGIN_EXPORT_PLAN_SIGNATURES = [
  {
    label: "Book Template Van de Graaf 4x5 12pt / Right Page",
    signature: "b5c80101",
  },
  {
    label: "Book Template Van de Graaf 4x5 12pt / Left Page",
    signature: "d8434522",
  },
  {
    label: "Book Template Van de Graaf 4x5 12pt / Facing Pages",
    signature: "b55b5496",
  },
  {
    label: "Swiss Grid Generator Manual / Title",
    signature: "cfeebf66",
  },
  {
    label: "Swiss Grid Generator Manual / Introduction",
    signature: "bab59184",
  },
  {
    label: "Swiss Grid Generator Manual / Quick Start",
    signature: "7e05e360",
  },
  {
    label: "Swiss Grid Generator Manual / Recommended Workflow",
    signature: "22dde627",
  },
  {
    label: "Swiss Grid Generator Manual / Pages and Document Structure",
    signature: "dd8e68af",
  },
  {
    label: "Swiss Grid Generator Manual / Grid, Margins, and Rhythm",
    signature: "17598dd8",
  },
  {
    label: "Swiss Grid Generator Manual / Typography",
    signature: "ccab0129",
  },
  {
    label: "Swiss Grid Generator Manual / Placing Text and Image Areas",
    signature: "491b89df",
  },
  {
    label: "Swiss Grid Generator Manual / Export",
    signature: "1dce46de",
  },
  {
    label: "Swiss Grid Generator Manual / Keyboard and Fast Interaction",
    signature: "81abe188",
  },
  {
    label: "Swiss Grid Generator Manual / Common Mistakes",
    signature: "f32f1f93",
  },
  {
    label: "Swiss Grid Generator Manual / Final Advice",
    signature: "522aae82",
  },
  {
    label: "Swiss Style Poster Example 001 / Poster AO",
    signature: "2c2e8c65",
  },
  {
    label: "Swiss Style Poster Example 002 / Swiss Style Poster",
    signature: "8c27f777",
  },
  {
    label: "Classic Poster Lookalike / Classic Poster Lookalike",
    signature: "48d95b71",
  },
  {
    label: "Classic Book Cover Lookalike / Blank Start Page",
    signature: "06ef2722",
  },
]

const options = {
  sampleLimit: toNumber(process.env.SGG_PARITY_SAMPLE_LIMIT, 240),
  maxTextLength: toNumber(process.env.SGG_PARITY_MAX_TEXT_LENGTH, 180),
  exportPageLimit: toNumber(process.env.SGG_PARITY_EXPORT_PAGE_LIMIT, 80),
}

const thresholds = {
  minSampleCount: toNumber(process.env.SGG_PARITY_MIN_SAMPLE_COUNT, DEFAULT_THRESHOLDS.minSampleCount),
  maxAbsWidthDelta: toNumber(process.env.SGG_PARITY_MAX_WIDTH_DELTA, DEFAULT_THRESHOLDS.maxAbsWidthDelta),
  averageAbsWidthDelta: toNumber(process.env.SGG_PARITY_AVG_WIDTH_DELTA, DEFAULT_THRESHOLDS.averageAbsWidthDelta),
  maxAbsAdvanceDelta: toNumber(process.env.SGG_PARITY_MAX_ADVANCE_DELTA, DEFAULT_THRESHOLDS.maxAbsAdvanceDelta),
  averageAbsAdvanceDelta: toNumber(process.env.SGG_PARITY_AVG_ADVANCE_DELTA, DEFAULT_THRESHOLDS.averageAbsAdvanceDelta),
  maxAbsOpticalKerningDelta: toNumber(
    process.env.SGG_PARITY_MAX_OPTICAL_KERNING_DELTA,
    DEFAULT_THRESHOLDS.maxAbsOpticalKerningDelta,
  ),
  averageAbsOpticalKerningDelta: toNumber(
    process.env.SGG_PARITY_AVG_OPTICAL_KERNING_DELTA,
    DEFAULT_THRESHOLDS.averageAbsOpticalKerningDelta,
  ),
  wrappedTextChangedCount: toNumber(
    process.env.SGG_PARITY_WRAPPED_TEXT_CHANGES,
    DEFAULT_THRESHOLDS.wrappedTextChangedCount,
  ),
  wrappedLineCountChangedCount: toNumber(
    process.env.SGG_PARITY_WRAPPED_LINE_COUNT_CHANGES,
    DEFAULT_THRESHOLDS.wrappedLineCountChangedCount,
  ),
  exportChangedCommandCount: toNumber(
    process.env.SGG_PARITY_EXPORT_COMMAND_COUNT_CHANGES,
    DEFAULT_THRESHOLDS.exportChangedCommandCount,
  ),
  exportChangedCommandTextCount: toNumber(
    process.env.SGG_PARITY_EXPORT_COMMAND_TEXT_CHANGES,
    DEFAULT_THRESHOLDS.exportChangedCommandTextCount,
  ),
  exportMaxAbsCommandXDelta: toNumber(
    process.env.SGG_PARITY_EXPORT_MAX_COMMAND_X_DELTA,
    DEFAULT_THRESHOLDS.exportMaxAbsCommandXDelta,
  ),
  exportMaxAbsCommandYDelta: toNumber(
    process.env.SGG_PARITY_EXPORT_MAX_COMMAND_Y_DELTA,
    DEFAULT_THRESHOLDS.exportMaxAbsCommandYDelta,
  ),
  exportMaxAbsRectXDelta: toNumber(
    process.env.SGG_PARITY_EXPORT_MAX_RECT_X_DELTA,
    DEFAULT_THRESHOLDS.exportMaxAbsRectXDelta,
  ),
  exportMaxAbsRectYDelta: toNumber(
    process.env.SGG_PARITY_EXPORT_MAX_RECT_Y_DELTA,
    DEFAULT_THRESHOLDS.exportMaxAbsRectYDelta,
  ),
  exportMaxAbsRectWidthDelta: toNumber(
    process.env.SGG_PARITY_EXPORT_MAX_RECT_WIDTH_DELTA,
    DEFAULT_THRESHOLDS.exportMaxAbsRectWidthDelta,
  ),
  exportMaxAbsRectHeightDelta: toNumber(
    process.env.SGG_PARITY_EXPORT_MAX_RECT_HEIGHT_DELTA,
    DEFAULT_THRESHOLDS.exportMaxAbsRectHeightDelta,
  ),
  deterministicOpticalMarginChangedCommandCount: toNumber(
    process.env.SGG_PARITY_DETERMINISTIC_OPTICAL_MARGIN_COMMAND_COUNT_CHANGES,
    DEFAULT_THRESHOLDS.deterministicOpticalMarginChangedCommandCount,
  ),
  deterministicOpticalMarginChangedCommandTextCount: toNumber(
    process.env.SGG_PARITY_DETERMINISTIC_OPTICAL_MARGIN_COMMAND_TEXT_CHANGES,
    DEFAULT_THRESHOLDS.deterministicOpticalMarginChangedCommandTextCount,
  ),
  deterministicOpticalMarginMaxAbsCommandXDelta: toNumber(
    process.env.SGG_PARITY_DETERMINISTIC_OPTICAL_MARGIN_MAX_COMMAND_X_DELTA,
    DEFAULT_THRESHOLDS.deterministicOpticalMarginMaxAbsCommandXDelta,
  ),
  deterministicOpticalMarginMaxAbsCommandYDelta: toNumber(
    process.env.SGG_PARITY_DETERMINISTIC_OPTICAL_MARGIN_MAX_COMMAND_Y_DELTA,
    DEFAULT_THRESHOLDS.deterministicOpticalMarginMaxAbsCommandYDelta,
  ),
  deterministicOpticalMarginMaxAbsRectDelta: toNumber(
    process.env.SGG_PARITY_DETERMINISTIC_OPTICAL_MARGIN_MAX_RECT_DELTA,
    DEFAULT_THRESHOLDS.deterministicOpticalMarginMaxAbsRectDelta,
  ),
}

function toNumber(value, fallback) {
  if (value === undefined || value === "") return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function findBrowserExecutable() {
  const candidates = [
    process.env.SGG_PARITY_BROWSER_EXECUTABLE,
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  throw new Error(
    "No Chromium-compatible browser found. Set SGG_PARITY_BROWSER_EXECUTABLE to a Chrome/Chromium executable.",
  )
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {
      // Server is not ready yet.
    }
    await sleep(500)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function waitForDevServer(child, url, timeoutMs) {
  await Promise.race([
    waitForHttp(url, timeoutMs),
    new Promise((_, reject) => {
      child.once("exit", (code, signal) => {
        reject(new Error(`Next dev server exited before ${url} was ready (${signal ?? code}).`))
      })
    }),
  ])
}

function startDevServer(port) {
  const child = spawn("npm", ["run", "dev", "--", "-p", String(port)], {
    cwd: ROOT,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk)
  })
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk)
  })

  return child
}

function waitForBrowserEndpoint(child) {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error("Timed out waiting for the browser DevTools endpoint."))
    }, BROWSER_TIMEOUT_MS)

    child.stderr.on("data", (chunk) => {
      const match = String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (!match || settled) return
      settled = true
      clearTimeout(timeout)
      resolve(match[1])
    })

    child.once("exit", (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(new Error(`Browser exited before exposing DevTools endpoint (${signal ?? code}).`))
    })
  })
}

class CdpConnection {
  constructor(endpoint) {
    this.endpoint = endpoint
    this.nextId = 1
    this.pending = new Map()
  }

  async open() {
    if (typeof WebSocket === "undefined") {
      throw new Error("This parity script requires a Node.js runtime with global WebSocket support.")
    }
    this.socket = new WebSocket(this.endpoint)
    this.socket.addEventListener("message", (event) => {
      this.handleMessage(String(event.data))
    })
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true })
      this.socket.addEventListener("error", reject, { once: true })
    })
  }

  handleMessage(message) {
    const payload = JSON.parse(message)
    if (!payload.id) return
    const pending = this.pending.get(payload.id)
    if (!pending) return
    this.pending.delete(payload.id)
    if (payload.error) {
      pending.reject(new Error(`${payload.error.message}: ${payload.error.data ?? ""}`.trim()))
      return
    }
    pending.resolve(payload.result)
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId
    this.nextId += 1
    const message = { id, method, params }
    if (sessionId) message.sessionId = sessionId
    this.socket.send(JSON.stringify(message))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
  }

  close() {
    this.socket?.close()
  }
}

async function launchBrowser() {
  const executable = findBrowserExecutable()
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "sgg-text-metrics-parity-"))
  const child = spawn(executable, [
    "--headless",
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-crash-reporter",
    "--disable-crashpad",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  })

  const endpoint = await waitForBrowserEndpoint(child)
  const cdp = new CdpConnection(endpoint)
  await cdp.open()
  return {
    child,
    cdp,
    cleanup: () => {
      cdp.close()
      child.kill()
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      } catch (error) {
        console.warn(`Warning: could not remove browser profile directory ${userDataDir}: ${error.message}`)
      }
    },
  }
}

async function evaluateParityReport(cdp, url) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" })
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true })
  await cdp.send("Runtime.enable", {}, sessionId)
  await cdp.send("Page.enable", {}, sessionId)
  await cdp.send("Page.navigate", { url }, sessionId)

  const deadline = Date.now() + BROWSER_TIMEOUT_MS
  while (Date.now() < deadline) {
    const ready = await cdp.send("Runtime.evaluate", {
      expression: "typeof window.__sggTextMetricsParity === 'function'",
      returnByValue: true,
    }, sessionId)
    if (ready.result?.value === true) break
    await sleep(500)
  }

  const expression = `
    (async () => {
      const report = await window.__sggTextMetricsParity(${JSON.stringify(options)});
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
        },
        rangeCalibration: {
          ...report.rangeCalibration,
          largestDeltas: report.rangeCalibration.largestDeltas.slice(0, 8),
        },
        rangeCalibrationClassCorrection: {
          ...report.rangeCalibrationClassCorrection,
          largestDeltas: report.rangeCalibrationClassCorrection.largestDeltas.slice(0, 8),
        },
        deterministicOpticalMargin: {
          ...report.deterministicOpticalMargin,
          largestDeltas: report.deterministicOpticalMargin.largestDeltas.slice(0, 8),
        },
        previewPlan: {
          ...report.previewPlan,
          largestDeltas: report.previewPlan.largestDeltas.slice(0, 8),
        },
        productionExportPlanSignatures: report.productionExportPlanSignatures,
        deterministicOpticalMarginExportPlanSignatures: report.deterministicOpticalMarginExportPlanSignatures,
        browserDiagnostics: report.browserDiagnostics,
        diagnosis: report.diagnosis,
      };
    })()
  `
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: BROWSER_TIMEOUT_MS,
  }, sessionId)
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Text metrics parity evaluation failed.")
  }
  return result.result.value
}

function collectCheckFailures(checks) {
  const failures = []

  for (const [label, actual, operator, expected] of checks) {
    const passed = operator === ">=" ? actual >= expected : actual <= expected
    if (!passed) failures.push(`${label}: expected ${operator} ${expected}, got ${actual}`)
  }

  return failures
}

function assertBrowserDiagnosticThresholds(report) {
  return collectCheckFailures([
    ["sampleCount", report.sampleCount, ">=", thresholds.minSampleCount],
    ["maxAbsWidthDelta", report.maxAbsWidthDelta, "<=", thresholds.maxAbsWidthDelta],
    ["averageAbsWidthDelta", report.averageAbsWidthDelta, "<=", thresholds.averageAbsWidthDelta],
    ["maxAbsAdvanceDelta", report.maxAbsAdvanceDelta, "<=", thresholds.maxAbsAdvanceDelta],
    ["averageAbsAdvanceDelta", report.averageAbsAdvanceDelta, "<=", thresholds.averageAbsAdvanceDelta],
    ["maxAbsOpticalKerningDelta", report.maxAbsOpticalKerningDelta, "<=", thresholds.maxAbsOpticalKerningDelta],
    ["averageAbsOpticalKerningDelta", report.averageAbsOpticalKerningDelta, "<=", thresholds.averageAbsOpticalKerningDelta],
    ["wrappedTextChangedCount", report.wrappedTextChangedCount, "<=", thresholds.wrappedTextChangedCount],
    ["wrappedLineCountChangedCount", report.wrappedLineCountChangedCount, "<=", thresholds.wrappedLineCountChangedCount],
    ["exportPlan.changedCommandCount", report.exportPlan.changedCommandCount, "<=", thresholds.exportChangedCommandCount],
    [
      "exportPlan.changedCommandTextCount",
      report.exportPlan.changedCommandTextCount,
      "<=",
      thresholds.exportChangedCommandTextCount,
    ],
    ["exportPlan.maxAbsCommandXDelta", report.exportPlan.maxAbsCommandXDelta, "<=", thresholds.exportMaxAbsCommandXDelta],
    ["exportPlan.maxAbsCommandYDelta", report.exportPlan.maxAbsCommandYDelta, "<=", thresholds.exportMaxAbsCommandYDelta],
    ["exportPlan.maxAbsRectXDelta", report.exportPlan.maxAbsRectXDelta, "<=", thresholds.exportMaxAbsRectXDelta],
    ["exportPlan.maxAbsRectYDelta", report.exportPlan.maxAbsRectYDelta, "<=", thresholds.exportMaxAbsRectYDelta],
    [
      "exportPlan.maxAbsRectWidthDelta",
      report.exportPlan.maxAbsRectWidthDelta,
      "<=",
      thresholds.exportMaxAbsRectWidthDelta,
    ],
    [
      "exportPlan.maxAbsRectHeightDelta",
      report.exportPlan.maxAbsRectHeightDelta,
      "<=",
      thresholds.exportMaxAbsRectHeightDelta,
    ],
  ])
}

function assertExportPlanThresholds(labelPrefix, report) {
  return collectCheckFailures([
    [`${labelPrefix}.changedCommandCount`, report.changedCommandCount, "<=", thresholds.exportChangedCommandCount],
    [
      `${labelPrefix}.changedCommandTextCount`,
      report.changedCommandTextCount,
      "<=",
      thresholds.exportChangedCommandTextCount,
    ],
    [`${labelPrefix}.maxAbsCommandXDelta`, report.maxAbsCommandXDelta, "<=", thresholds.exportMaxAbsCommandXDelta],
    [`${labelPrefix}.maxAbsCommandYDelta`, report.maxAbsCommandYDelta, "<=", thresholds.exportMaxAbsCommandYDelta],
    [`${labelPrefix}.maxAbsRectXDelta`, report.maxAbsRectXDelta, "<=", thresholds.exportMaxAbsRectXDelta],
    [`${labelPrefix}.maxAbsRectYDelta`, report.maxAbsRectYDelta, "<=", thresholds.exportMaxAbsRectYDelta],
    [
      `${labelPrefix}.maxAbsRectWidthDelta`,
      report.maxAbsRectWidthDelta,
      "<=",
      thresholds.exportMaxAbsRectWidthDelta,
    ],
    [
      `${labelPrefix}.maxAbsRectHeightDelta`,
      report.maxAbsRectHeightDelta,
      "<=",
      thresholds.exportMaxAbsRectHeightDelta,
    ],
  ])
}

function assertDeterministicOpticalMarginThresholds(report) {
  if (!report) return ["deterministicOpticalMargin: expected report, got missing"]

  return collectCheckFailures([
    [
      "deterministicOpticalMargin.changedCommandCount",
      report.changedCommandCount,
      "<=",
      thresholds.deterministicOpticalMarginChangedCommandCount,
    ],
    [
      "deterministicOpticalMargin.changedCommandTextCount",
      report.changedCommandTextCount,
      "<=",
      thresholds.deterministicOpticalMarginChangedCommandTextCount,
    ],
    [
      "deterministicOpticalMargin.maxAbsCommandXDelta",
      report.maxAbsCommandXDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsCommandXDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsCommandYDelta",
      report.maxAbsCommandYDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsCommandYDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsRectXDelta",
      report.maxAbsRectXDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsRectDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsRectYDelta",
      report.maxAbsRectYDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsRectDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsRectWidthDelta",
      report.maxAbsRectWidthDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsRectDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsRectHeightDelta",
      report.maxAbsRectHeightDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsRectDelta,
    ],
  ])
}

function assertExportPlanSignatures(labelPrefix, expectedSignatures, signatures) {
  if (!signatures) return [`${labelPrefix}: expected ${expectedSignatures.length}, got missing`]

  const signatureByLabel = new Map(signatures.map((signature) => [signature.label, signature]))
  return expectedSignatures.flatMap((expected) => {
    const actual = signatureByLabel.get(expected.label)
    if (actual?.label === expected.label && actual.signature === expected.signature) return []
    return [
      `${labelPrefix} ${expected.label}: expected ${expected.signature}, got ${actual?.signature ?? "missing"}`,
    ]
  })
}

function assertProductionThresholds(report) {
  return collectCheckFailures([
    ["sampleCount", report.sampleCount, ">=", thresholds.minSampleCount],
  ]).concat(
    assertExportPlanThresholds("exportPlan", report.exportPlan),
    assertExportPlanThresholds("rangeCalibrationClassCorrection", report.rangeCalibrationClassCorrection),
    assertExportPlanSignatures(
      "productionExportPlanSignatures",
      EXPECTED_PRODUCTION_EXPORT_PLAN_SIGNATURES,
      report.productionExportPlanSignatures,
    ),
  )
}

function summarizeExportPlan(report) {
  return {
    pageCount: report.pageCount,
    textPlanCount: report.textPlanCount,
    changedPlanCount: report.changedPlanCount,
    changedCommandCount: report.changedCommandCount,
    changedCommandTextCount: report.changedCommandTextCount,
    maxAbsCommandXDelta: report.maxAbsCommandXDelta,
    maxAbsCommandYDelta: report.maxAbsCommandYDelta,
    maxAbsRectXDelta: report.maxAbsRectXDelta,
    maxAbsRectYDelta: report.maxAbsRectYDelta,
    maxAbsRectWidthDelta: report.maxAbsRectWidthDelta,
    maxAbsRectHeightDelta: report.maxAbsRectHeightDelta,
    wrapDecisionSummary: {
      sampleCount: report.wrapDecisionSummary.sampleCount,
      decisionChangedCount: report.wrapDecisionSummary.decisionChangedCount,
      outlineOnlyCount: report.wrapDecisionSummary.outlineOnlyCount,
      browserOnlyCount: report.wrapDecisionSummary.browserOnlyCount,
      bothAcceptedCount: report.wrapDecisionSummary.bothAcceptedCount,
      maxAbsWidthDelta: report.wrapDecisionSummary.maxAbsWidthDelta,
      averageAbsWidthDelta: report.wrapDecisionSummary.averageAbsWidthDelta,
      groups: report.wrapDecisionSummary.groups,
      largestDeltas: report.wrapDecisionSummary.largestDeltas,
    },
    boundaryVetoSummary: {
      sampleCount: report.boundaryVetoSummary.sampleCount,
      maxCorrection: report.boundaryVetoSummary.maxCorrection,
      averageCorrection: report.boundaryVetoSummary.averageCorrection,
      largestVetoes: report.boundaryVetoSummary.largestVetoes.slice(0, 8),
    },
    opticalPairSummary: {
      commandCount: report.opticalPairSummary.commandCount,
      pairCount: report.opticalPairSummary.pairCount,
      totalContributionDelta: report.opticalPairSummary.totalContributionDelta,
      averageContributionDelta: report.opticalPairSummary.averageContributionDelta,
      maxAbsContributionDelta: report.opticalPairSummary.maxAbsContributionDelta,
      largestPairs: report.opticalPairSummary.largestPairs.slice(0, 8),
      largestAggregates: report.opticalPairSummary.largestAggregates.slice(0, 8),
      largestClassAggregates: report.opticalPairSummary.largestClassAggregates.slice(0, 8),
    },
    opticalPairDiagnostics: report.largestDeltas
      .flatMap((delta) => (delta.changedCommands ?? [])
        .filter((command) => command.opticalPairDiagnostics)
        .map((command) => ({
          label: delta.label,
          key: delta.key,
          commandIndex: command.index,
          activeText: command.activeText,
          candidateText: command.candidateText,
          opticalPairDiagnostics: {
            ...command.opticalPairDiagnostics,
            pairs: undefined,
          },
        })))
      .slice(0, 8),
  }
}

function summarizeDiagnosticExportPlan(report) {
  return {
    pageCount: report.pageCount,
    textPlanCount: report.textPlanCount,
    changedPlanCount: report.changedPlanCount,
    changedCommandCount: report.changedCommandCount,
    changedCommandTextCount: report.changedCommandTextCount,
    maxAbsCommandXDelta: report.maxAbsCommandXDelta,
    maxAbsCommandYDelta: report.maxAbsCommandYDelta,
    maxAbsRectXDelta: report.maxAbsRectXDelta,
    maxAbsRectYDelta: report.maxAbsRectYDelta,
    maxAbsRectWidthDelta: report.maxAbsRectWidthDelta,
    maxAbsRectHeightDelta: report.maxAbsRectHeightDelta,
    largestDeltas: report.largestDeltas.slice(0, 8).map((delta) => ({
      label: delta.label,
      key: delta.key,
      styleKey: delta.styleKey,
      fontFamily: delta.fontFamily,
      fontWeight: delta.fontWeight,
      italic: delta.italic,
      fontSize: delta.fontSize,
      leading: delta.leading,
      trackingScale: delta.trackingScale,
      opticalKerning: delta.opticalKerning,
      changedCommandTextCount: delta.changedCommandTextCount,
      maxAbsCommandXDelta: delta.maxAbsCommandXDelta,
      maxAbsCommandYDelta: delta.maxAbsCommandYDelta,
      maxAbsRectXDelta: delta.maxAbsRectXDelta,
      maxAbsRectYDelta: delta.maxAbsRectYDelta,
      changedCommands: delta.changedCommands.slice(0, 4).map((command) => ({
        index: command.index,
        textChanged: command.textChanged,
        text: command.activeText,
        activeX: command.activeX,
        candidateX: command.candidateX,
        xDelta: command.xDelta,
        activeY: command.activeY,
        candidateY: command.candidateY,
        yDelta: command.yDelta,
      })),
    })),
  }
}

function summarizePreviewPlan(report) {
  return {
    pageCount: report.pageCount,
    textPlanCount: report.textPlanCount,
    changedPlanCount: report.changedPlanCount,
    changedCommandCount: report.changedCommandCount,
    changedCommandTextCount: report.changedCommandTextCount,
    changedGraphemeCount: report.changedGraphemeCount,
    maxAbsCommandXDelta: report.maxAbsCommandXDelta,
    maxAbsCommandYDelta: report.maxAbsCommandYDelta,
    maxAbsRectXDelta: report.maxAbsRectXDelta,
    maxAbsRectYDelta: report.maxAbsRectYDelta,
    maxAbsRectWidthDelta: report.maxAbsRectWidthDelta,
    maxAbsRectHeightDelta: report.maxAbsRectHeightDelta,
    maxAbsGraphemeXDelta: report.maxAbsGraphemeXDelta,
    maxAbsGraphemeYDelta: report.maxAbsGraphemeYDelta,
    maxAbsGraphemeWidthDelta: report.maxAbsGraphemeWidthDelta,
    maxAbsGraphemeAscentDelta: report.maxAbsGraphemeAscentDelta,
    maxAbsGraphemeDescentDelta: report.maxAbsGraphemeDescentDelta,
    largestDeltas: report.largestDeltas.slice(0, 8).map((delta) => ({
      label: delta.label,
      key: delta.key,
      activeCommandCount: delta.activeCommandCount,
      candidateCommandCount: delta.candidateCommandCount,
      commandCountDelta: delta.commandCountDelta,
      changedCommandTextCount: delta.changedCommandTextCount,
      activeGraphemeCount: delta.activeGraphemeCount,
      candidateGraphemeCount: delta.candidateGraphemeCount,
      graphemeCountDelta: delta.graphemeCountDelta,
      changedGraphemeCount: delta.changedGraphemeCount,
      maxAbsCommandXDelta: delta.maxAbsCommandXDelta,
      maxAbsCommandYDelta: delta.maxAbsCommandYDelta,
      maxAbsRectXDelta: delta.maxAbsRectXDelta,
      maxAbsRectYDelta: delta.maxAbsRectYDelta,
      maxAbsGraphemeXDelta: delta.maxAbsGraphemeXDelta,
      maxAbsGraphemeYDelta: delta.maxAbsGraphemeYDelta,
      maxAbsGraphemeWidthDelta: delta.maxAbsGraphemeWidthDelta,
      changedGraphemes: delta.changedGraphemes.slice(0, 4),
      activeTexts: delta.activeTexts.slice(0, 4),
      candidateTexts: delta.candidateTexts.slice(0, 4),
    })),
  }
}

function summarizeParityReport(report) {
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
    exportPlan: summarizeExportPlan(report.exportPlan),
    rangeCalibration: summarizeExportPlan(report.rangeCalibration),
    rangeCalibrationClassCorrection: summarizeExportPlan(report.rangeCalibrationClassCorrection),
    deterministicOpticalMargin: summarizeDiagnosticExportPlan(report.deterministicOpticalMargin),
    previewPlan: summarizePreviewPlan(report.previewPlan),
    productionExportPlanSignatures: report.productionExportPlanSignatures,
    deterministicOpticalMarginExportPlanSignatures: report.deterministicOpticalMarginExportPlanSignatures,
    diagnosis: report.diagnosis,
  }
}

async function main() {
  const port = toNumber(process.env.SGG_PARITY_PORT, DEFAULT_PORT)
  const url = process.env.SGG_PARITY_URL ?? `http://127.0.0.1:${port}`
  const shouldStartServer = !process.env.SGG_PARITY_URL
  let server = null
  let browser = null

  try {
    if (shouldStartServer) {
      server = startDevServer(port)
      await waitForDevServer(server, url, START_TIMEOUT_MS)
    }

    browser = await launchBrowser()
    const report = await evaluateParityReport(browser.cdp, url)
    const browserDiagnosticFailures = assertBrowserDiagnosticThresholds(report)
    const deterministicOpticalMarginFailures = assertDeterministicOpticalMarginThresholds(
      report.deterministicOpticalMargin,
    ).concat(assertExportPlanSignatures(
      "deterministicOpticalMarginExportPlanSignatures",
      EXPECTED_DETERMINISTIC_OPTICAL_MARGIN_EXPORT_PLAN_SIGNATURES,
      report.deterministicOpticalMarginExportPlanSignatures,
    ))
    const productionFailures = assertProductionThresholds(report)
    const failOnBrowserDiagnostic = process.env.SGG_PARITY_FAIL_ON_BROWSER_DIAGNOSTIC === "1"
    const failures = failOnBrowserDiagnostic
      ? productionFailures.concat(browserDiagnosticFailures, deterministicOpticalMarginFailures)
      : productionFailures.concat(deterministicOpticalMarginFailures)
    console.log(JSON.stringify({
      options,
      thresholds,
      report: process.env.SGG_PARITY_SUMMARY_ONLY === "1" ? summarizeParityReport(report) : report,
      productionStatus: productionFailures.length === 0 ? "passed" : "failed",
      productionFailures,
      deterministicOpticalMarginStatus: deterministicOpticalMarginFailures.length === 0 ? "passed" : "failed",
      deterministicOpticalMarginFailures,
      browserDiagnosticStatus: browserDiagnosticFailures.length === 0 ? "passed" : "failed",
      browserDiagnosticFailures,
      status: failures.length === 0 ? "passed" : "failed",
      failures,
    }, null, 2))

    if (failures.length > 0) {
      process.exitCode = 1
    }
  } finally {
    browser?.cleanup()
    server?.kill()
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message ?? error)
  process.exitCode = 1
})
