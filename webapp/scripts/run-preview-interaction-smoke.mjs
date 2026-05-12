#!/usr/bin/env node
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const ROOT = process.cwd()
const DEFAULT_PORT = 3102
const START_TIMEOUT_MS = 60_000
const BROWSER_TIMEOUT_MS = 90_000

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
    process.env.SGG_PREVIEW_SMOKE_BROWSER_EXECUTABLE,
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
    "No Chromium-compatible browser found. Set SGG_PREVIEW_SMOKE_BROWSER_EXECUTABLE to a Chrome/Chromium executable.",
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
    this.listeners = new Map()
  }

  async open() {
    if (typeof WebSocket === "undefined") {
      throw new Error("This smoke script requires a Node.js runtime with global WebSocket support.")
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
    if (payload.id) {
      const pending = this.pending.get(payload.id)
      if (!pending) return
      this.pending.delete(payload.id)
      if (payload.error) {
        pending.reject(new Error(`${payload.error.message}: ${payload.error.data ?? ""}`.trim()))
        return
      }
      pending.resolve(payload.result)
      return
    }

    const listeners = this.listeners.get(payload.method)
    if (!listeners) return
    for (const listener of listeners) listener(payload.params, payload.sessionId)
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? new Set()
    listeners.add(listener)
    this.listeners.set(method, listeners)
    return () => {
      listeners.delete(listener)
    }
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "sgg-preview-smoke-"))
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
      child.kill("SIGKILL")
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      } catch (error) {
        console.warn(`Warning: could not remove browser profile directory ${userDataDir}: ${error.message}`)
      }
    },
  }
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId)
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed")
  }
  return result.result.value
}

async function waitForExpression(cdp, sessionId, expression, timeoutMs = BROWSER_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(cdp, sessionId, expression)
    if (value) return value
    await sleep(250)
  }
  throw new Error(`Timed out waiting for expression: ${expression}`)
}

async function mouseMove(cdp, sessionId, x, y) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x,
    y,
    button: "none",
    buttons: 0,
  }, sessionId)
}

async function mousePress(cdp, sessionId, x, y, clickCount = 1) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    buttons: 1,
    clickCount,
  }, sessionId)
}

async function mouseRelease(cdp, sessionId, x, y, clickCount = 1) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    buttons: 0,
    clickCount,
  }, sessionId)
}

async function click(cdp, sessionId, x, y) {
  await mouseMove(cdp, sessionId, x, y)
  await mousePress(cdp, sessionId, x, y)
  await mouseRelease(cdp, sessionId, x, y)
}

async function doubleClick(cdp, sessionId, x, y) {
  await mouseMove(cdp, sessionId, x, y)
  await mousePress(cdp, sessionId, x, y, 1)
  await mouseRelease(cdp, sessionId, x, y, 1)
  await mousePress(cdp, sessionId, x, y, 2)
  await mouseRelease(cdp, sessionId, x, y, 2)
}

async function drag(cdp, sessionId, start, end, steps = 10) {
  await mouseMove(cdp, sessionId, start.x, start.y)
  await mousePress(cdp, sessionId, start.x, start.y)
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps
    await mouseMove(
      cdp,
      sessionId,
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    )
    await sleep(20)
  }
  await mouseRelease(cdp, sessionId, end.x, end.y)
}

async function keyEvent(cdp, sessionId, type, key, code, windowsVirtualKeyCode, modifiers = 0) {
  await cdp.send("Input.dispatchKeyEvent", {
    type,
    key,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
    modifiers,
  }, sessionId)
}

async function selectInlineEditorTextWithKeyboard(cdp, sessionId, characterCount) {
  await evaluate(cdp, sessionId, `(() => {
    const node = document.querySelector('textarea[aria-label^="Inline edit"]')
    if (!node) return false
    node.focus()
    node.setSelectionRange(0, 0)
    return document.activeElement === node
  })()`)
  await keyEvent(cdp, sessionId, "rawKeyDown", "Shift", "ShiftLeft", 16, 8)
  for (let index = 0; index < characterCount; index += 1) {
    await keyEvent(cdp, sessionId, "rawKeyDown", "ArrowRight", "ArrowRight", 39, 8)
    await keyEvent(cdp, sessionId, "keyUp", "ArrowRight", "ArrowRight", 39, 8)
  }
  await keyEvent(cdp, sessionId, "keyUp", "Shift", "ShiftLeft", 16, 0)
}

async function waitForLivePageCanvas(cdp, sessionId) {
  return waitForExpression(cdp, sessionId, `(() => {
    const canvases = Array.from(document.querySelectorAll("canvas")).map((node, index) => {
      const rect = node.getBoundingClientRect()
      return {
        index,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        pointerEvents: getComputedStyle(node).pointerEvents,
      }
    })
    return canvases.find((canvas) => (
      canvas.pointerEvents === "auto" && canvas.width > 300 && canvas.height > 500
    )) ?? null
  })()`)
}

async function findPreviewTextLayerPoint(cdp, sessionId, canvas) {
  const xSteps = 10
  const ySteps = 12
  for (let yStep = 1; yStep < ySteps; yStep += 1) {
    for (let xStep = 1; xStep < xSteps; xStep += 1) {
      const point = {
        x: canvas.x + (canvas.width * xStep) / xSteps,
        y: canvas.y + (canvas.height * yStep) / ySteps,
      }
      await mouseMove(cdp, sessionId, point.x, point.y)
      await sleep(80)
      const hasParagraphAffordance = await evaluate(cdp, sessionId, `Array.from(document.querySelectorAll('[data-preview-edit-affordance="true"]')).some((node) => {
        const label = node.getAttribute("aria-label") ?? node.getAttribute("title") ?? ""
        return /paragraph/i.test(label)
      })`)
      if (hasParagraphAffordance) return point
    }
  }
  return null
}

async function main() {
  const port = toNumber(process.env.SGG_PREVIEW_SMOKE_PORT, DEFAULT_PORT)
  const url = process.env.SGG_PREVIEW_SMOKE_URL ?? `http://127.0.0.1:${port}`
  const shouldStartServer = !process.env.SGG_PREVIEW_SMOKE_URL
  let server = null
  let browser = null

  try {
    if (shouldStartServer) {
      server = startDevServer(port)
      await waitForDevServer(server, url, START_TIMEOUT_MS)
    }

    browser = await launchBrowser()
    const { cdp } = browser
    const consoleMessages = []
    cdp.on("Runtime.consoleAPICalled", (params) => {
      const text = params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ") ?? ""
      if (/Deterministic|Hydration|Error|failed|TypeError|ReferenceError/i.test(text)) {
        consoleMessages.push(`${params.type}: ${text}`)
      }
    })
    cdp.on("Runtime.exceptionThrown", (params) => {
      consoleMessages.push(`exception: ${params.exceptionDetails?.text ?? "unknown exception"}`)
    })

    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" })
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true })
    await cdp.send("Runtime.enable", {}, sessionId)
    await cdp.send("Page.enable", {}, sessionId)
    await cdp.send("Page.navigate", { url }, sessionId)

    await waitForExpression(cdp, sessionId, "document.readyState === 'complete'")
    await waitForExpression(cdp, sessionId, "document.fonts?.status === 'loaded'")
    await waitForExpression(cdp, sessionId, "document.querySelectorAll('canvas').length >= 3")

    const manualThumb = await waitForExpression(cdp, sessionId, `(() => {
      const node = document.querySelector('[data-preset-id="100-swiss-grid-generator-manual"]')
      if (!(node instanceof HTMLElement)) return null
      const rect = node.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })()`)
    await click(cdp, sessionId, manualThumb.x, manualThumb.y)

    await evaluate(cdp, sessionId, `(() => {
      const closeButton = document.querySelector('button[aria-label="close"]')
      if (!(closeButton instanceof HTMLButtonElement)) return false
      closeButton.click()
      return true
    })()`)
    await sleep(300)

    const pageCanvas = await waitForLivePageCanvas(cdp, sessionId)
    const dragStart = { x: pageCanvas.x + 94, y: pageCanvas.y + 73 }
    const dragEnd = { x: dragStart.x + 95, y: dragStart.y + 120 }
    await drag(cdp, sessionId, dragStart, dragEnd, 12)
    await sleep(800)

    const canvasStillVisible = await evaluate(cdp, sessionId, `Array.from(document.querySelectorAll("canvas")).some((node) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 300 && rect.height > 500
    })`)
    if (!canvasStillVisible) throw new Error("Live preview canvas disappeared after text drag.")

    const postDragPageCanvas = await waitForLivePageCanvas(cdp, sessionId)
    const hoveredTextLayerPoint = await findPreviewTextLayerPoint(cdp, sessionId, postDragPageCanvas)
    const editorOpen = await (async () => {
      const attempts = [
        hoveredTextLayerPoint,
        { x: dragEnd.x, y: dragEnd.y },
        { x: dragEnd.x - 30, y: dragEnd.y - 30 },
        { x: postDragPageCanvas.x + 94, y: postDragPageCanvas.y + 73 },
      ].filter(Boolean)
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          attempts.push({
            x: postDragPageCanvas.x + 48 + column * 72,
            y: postDragPageCanvas.y + 48 + row * 86,
          })
        }
      }
      for (const point of attempts) {
        await doubleClick(cdp, sessionId, point.x, point.y)
        await sleep(300)
        const isOpen = await evaluate(
          cdp,
          sessionId,
          `Boolean(document.querySelector('textarea[aria-label^="Inline edit"]'))`,
        )
        if (isOpen) return true
      }
      return false
    })()
    if (!editorOpen) throw new Error("Inline editor did not open from live preview geometry.")

    await waitForExpression(cdp, sessionId, `(() => {
      const node = document.querySelector('textarea[aria-label^="Inline edit"]')
      if (!node) return null
      const rect = node.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })()`)

    await selectInlineEditorTextWithKeyboard(cdp, sessionId, 4)
    await sleep(250)

    const selection = await evaluate(cdp, sessionId, `(() => {
      const node = document.querySelector('textarea[aria-label^="Inline edit"]')
      return node ? { start: node.selectionStart, end: node.selectionEnd, length: node.value.length } : null
    })()`)
    if (!selection || selection.end <= selection.start) {
      throw new Error(`Inline editor mouse selection failed: ${JSON.stringify(selection)}`)
    }

    if (consoleMessages.length > 0) {
      throw new Error(`Unexpected browser console output:\\n${consoleMessages.join("\\n")}`)
    }

    console.log(JSON.stringify({
      status: "passed",
      loadedPreset: "Swiss Grid Generator Manual",
      drag: "passed",
      inlineEditor: "passed",
      keyboardSelection: selection,
    }, null, 2))
  } finally {
    browser?.cleanup()
    server?.kill("SIGTERM")
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
