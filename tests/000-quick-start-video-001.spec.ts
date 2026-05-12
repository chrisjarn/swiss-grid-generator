import { expect, test, type Locator, type Page } from "@playwright/test"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { mkdir, readFile, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)
const ffmpegPath = require("ffmpeg-static") as string | null

const rootDir = fileURLToPath(new URL("../", import.meta.url))
const viewport = {
  width: Number(process.env.QUICK_START_VIDEO_RECORD_WIDTH ?? 1440),
  height: Number(process.env.QUICK_START_VIDEO_RECORD_HEIGHT ?? 900),
}

const fixturePath = process.env.QUICK_START_VIDEO_FIXTURE
  ? path.resolve(process.env.QUICK_START_VIDEO_FIXTURE)
  : path.join(rootDir, "webapp", "tests", "fixtures", "120 Swiss Style Poster Example 001.json")

const performanceFixturePath = process.env.QUICK_START_VIDEO_PERFORMANCE_FIXTURE
  ? path.resolve(process.env.QUICK_START_VIDEO_PERFORMANCE_FIXTURE)
  : path.join(rootDir, "webapp", "tests", "fixtures", "performance-1000-pages.json")

const screencastPath = process.env.QUICK_START_VIDEO_SCREENCAST
  ? path.resolve(process.env.QUICK_START_VIDEO_SCREENCAST)
  : path.join(rootDir, "screencasts", "quick-start-video-001.mp4")

const screencastsDir = path.join(rootDir, "screencasts")
const exportedPdfPath = path.join(screencastsDir, "quick-start-video-001-performance-page-0005.pdf")
const screenshotPaths = {
  presetsBrowser: path.join(screencastsDir, "quick-start-video-001-presets-browser.png"),
  layoutProjectPanelOff: path.join(screencastsDir, "quick-start-video-001-layout-project-panel-off.png"),
  ratioSquareHover: path.join(screencastsDir, "quick-start-video-001-ratio-square-hover.png"),
  paragraphSubmenu: path.join(screencastsDir, "quick-start-video-001-paragraph-submenu.png"),
  performancePagesPanel: path.join(screencastsDir, "quick-start-video-001-performance-pages-panel.png"),
  exportPdfPopup: path.join(screencastsDir, "quick-start-video-001-export-pdf-popup.png"),
}

const rawVideoDir = path.join(rootDir, "test-results", "000-quick-start-video-001-raw-video")
// The live preview exposes the planned page through this document root; the visible canvases are layered inside it.
const previewDocumentSelector = '[data-preview-document-root="true"]'
const pacing = {
  afterLoad: Number(process.env.QUICK_START_VIDEO_RECORD_AFTER_LOAD_MS ?? 600),
  afterSectionClose: Number(process.env.QUICK_START_VIDEO_RECORD_AFTER_SECTION_CLOSE_MS ?? 450),
  afterHover: Number(process.env.QUICK_START_VIDEO_RECORD_AFTER_HOVER_MS ?? 700),
  betweenRatioPreviews: Number(process.env.QUICK_START_VIDEO_RECORD_BETWEEN_RATIO_PREVIEWS_MS ?? 450),
  afterCommit: Number(process.env.QUICK_START_VIDEO_RECORD_AFTER_COMMIT_MS ?? 900),
  mouseSteps: Number(process.env.QUICK_START_VIDEO_RECORD_MOUSE_STEPS ?? 14),
}

async function getPreviewDocumentAspect(previewDocument: Locator): Promise<number> {
  return previewDocument.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    if (rect.height <= 0) return 0
    return rect.width / rect.height
  })
}

async function waitForPreviewDocumentReady(page: Page): Promise<Locator> {
  const previewDocument = page.locator(previewDocumentSelector).first()
  await expect(previewDocument).toBeVisible()
  await expect.poll(
    async () => previewDocument.evaluate((node: HTMLDivElement) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 100 && rect.height > 100
    }),
    { message: "preview document has rendered dimensions" },
  ).toBe(true)
  return previewDocument
}

async function waitForPreviewDocumentAspect(previewDocument: Locator, expectedAspect: number): Promise<void> {
  await expect.poll(
    async () => Math.abs((await getPreviewDocumentAspect(previewDocument)) - expectedAspect),
    { message: `preview document aspect approaches ${expectedAspect}`, timeout: 30_000 },
  ).toBeLessThan(0.035)
}

async function installPointerOverlay(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      [data-playwright-record-pointer] {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 2147483647;
        width: 18px;
        height: 18px;
        border: 2px solid #c02820;
        border-radius: 9999px;
        background: rgba(192, 40, 32, 0.14);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.9);
        pointer-events: none;
        transform: translate(-50%, -50%);
        transition: width 120ms ease, height 120ms ease, background 120ms ease;
      }
      [data-playwright-record-pointer="down"] {
        width: 24px;
        height: 24px;
        background: rgba(192, 40, 32, 0.28);
      }
    `,
  })
  await page.evaluate(() => {
    const existing = document.querySelector("[data-playwright-record-pointer]")
    if (existing) existing.remove()

    const pointer = document.createElement("div")
    pointer.setAttribute("data-playwright-record-pointer", "idle")
    pointer.style.transform = "translate(-100px, -100px)"
    document.body.appendChild(pointer)

    window.addEventListener("mousemove", (event) => {
      pointer.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`
    }, { passive: true })
    window.addEventListener("mousedown", () => {
      pointer.setAttribute("data-playwright-record-pointer", "down")
    })
    window.addEventListener("mouseup", () => {
      pointer.setAttribute("data-playwright-record-pointer", "idle")
    })
  })
}

async function captureScreenshot(page: Page, outputPath: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await page.screenshot({
    path: outputPath,
    fullPage: false,
  })
}

async function importProjectFixture(page: Page, projectFixturePath: string): Promise<void> {
  const fixtureBuffer = await readFile(projectFixturePath)
  // Use the app's real import input, with explicit MIME metadata for deterministic upload behavior.
  await page.locator('input[type="file"]').setInputFiles({
    name: path.basename(projectFixturePath),
    mimeType: "application/json",
    buffer: fixtureBuffer,
  })
}

async function moveToLocator(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox()
  if (!box) throw new Error("Target locator has no bounding box.")
  await page.mouse.move(
    box.x + box.width / 2,
    box.y + box.height / 2,
    { steps: pacing.mouseSteps },
  )
}

async function clickLocatorSlowly(page: Page, locator: Locator): Promise<void> {
  await moveToLocator(page, locator)
  await page.waitForTimeout(250)
  await locator.click({ delay: 160 })
}

async function clickLocatorCenter(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox()
  if (!box) throw new Error("Target locator has no bounding box.")
  await page.mouse.move(
    box.x + box.width / 2,
    box.y + box.height / 2,
    { steps: pacing.mouseSteps },
  )
  await page.waitForTimeout(250)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 120 })
}

async function ensureActiveExportToggle(page: Page, button: Locator): Promise<void> {
  await moveToLocator(page, button)
  await page.waitForTimeout(180)
  const isActive = await button.evaluate((node) => node.className.includes("bg-swiss-orange-soft"))
  if (isActive) return
  await button.click({ delay: 120 })
  await expect.poll(
    async () => button.evaluate((node) => node.className.includes("bg-swiss-orange-soft")),
    { message: "export input toggle is active" },
  ).toBe(true)
}

async function moveJustOutsideLeftPanel(page: Page): Promise<void> {
  const leftPanel = page.locator('[data-editor-mode-preserve-root="true"]').first()
  const box = await leftPanel.boundingBox()
  if (!box) throw new Error("Left settings panel has no bounding box.")
  await page.mouse.move(
    box.x + box.width + 8,
    box.y + box.height / 2,
    { steps: Math.max(8, Math.round(pacing.mouseSteps / 2)) },
  )
  await page.waitForTimeout(pacing.afterSectionClose)
}

async function previewRatioOption(page: Page, ratioList: Locator, optionName: RegExp): Promise<void> {
  const option = ratioList.getByRole("option", { name: optionName })
  await moveToLocator(page, option)
  await option.hover()
  await page.waitForTimeout(pacing.betweenRatioPreviews)
}

async function closeLoadedLayoutTooltip(page: Page): Promise<void> {
  const closeTip = page.getByRole("button", { name: "Close tip" })
  try {
    await expect(closeTip).toBeVisible({ timeout: 5_000 })
  } catch {
    return
  }
  await clickLocatorSlowly(page, closeTip)
  await expect(closeTip).toBeHidden()
  await page.waitForTimeout(500)
}

async function closeRightProjectPanel(page: Page): Promise<void> {
  const hideProjectPanel = page.getByRole("button", { name: "Hide project panel" })
  await expect(hideProjectPanel).toBeEnabled()
  await clickLocatorSlowly(page, hideProjectPanel)
  await expect(page.getByRole("button", { name: "Show project panel" })).toBeVisible()
  await page.waitForTimeout(700)
}

async function openRightProjectPanel(page: Page): Promise<void> {
  const showProjectPanel = page.getByRole("button", { name: "Show project panel" })
  if (await showProjectPanel.isVisible().catch(() => false)) {
    await clickLocatorSlowly(page, showProjectPanel)
  }
  await expect(page.getByRole("button", { name: "Hide project panel" })).toBeVisible()
}

async function openPagesPanelSection(page: Page): Promise<void> {
  const pageList = page.locator('[data-page-list-scroll-root="true"]')
  if (await pageList.isVisible().catch(() => false)) return

  const pagesHeader = page.getByText("Pages", { exact: true }).last()
  await moveToLocator(page, pagesHeader)
  await page.waitForTimeout(pacing.afterSectionClose)
  if (!(await pageList.isVisible().catch(() => false))) {
    await clickLocatorSlowly(page, pagesHeader)
  }
  await expect(pageList).toBeVisible()
}

async function openLayersPanelSection(page: Page): Promise<void> {
  const layerList = page.locator('[data-page-layers-scroll-root="true"]')
  if (await layerList.isVisible().catch(() => false)) return

  const layersHeader = page.getByText("Layers", { exact: true }).last()
  await layersHeader.scrollIntoViewIfNeeded()
  await moveToLocator(page, layersHeader)
  await page.waitForTimeout(pacing.afterSectionClose)
  if (!(await layerList.isVisible().catch(() => false))) {
    await clickLocatorSlowly(page, layersHeader)
  }
  await expect(layerList).toBeVisible()
}

async function moveOutsideRightProjectPanel(page: Page): Promise<void> {
  const projectPanel = page.locator('[data-page-list-scroll-root="true"], [data-page-layers-scroll-root="true"]').first()
  const box = await projectPanel.boundingBox()
  if (!box) throw new Error("Project panel content has no bounding box.")
  await page.mouse.move(
    Math.max(12, box.x - 24),
    box.y + box.height * 0.45,
    { steps: Math.max(8, Math.round(pacing.mouseSteps / 2)) },
  )
  await page.waitForTimeout(pacing.afterSectionClose)
}

async function toggleHeaderDisplayOptions(page: Page): Promise<void> {
  const displayOptionNames = [
    "Toggle baseline rhythm",
    "Toggle margins",
    "Toggle modular field",
    "Toggle typography",
  ]

  for (const pass of [displayOptionNames, displayOptionNames]) {
    for (const name of pass) {
      const button = page.getByRole("button", { name })
      await expect(button).toBeEnabled()
      await clickLocatorSlowly(page, button)
      await page.waitForTimeout(450)
    }
  }
}

async function moveToPreviewPosition(page: Page, xRatio: number, yRatio: number): Promise<void> {
  const point = await getPreviewPoint(page, xRatio, yRatio)
  await page.mouse.move(point.x, point.y, { steps: pacing.mouseSteps })
  await page.waitForTimeout(850)
}

async function getPreviewPoint(page: Page, xRatio: number, yRatio: number): Promise<{ x: number; y: number }> {
  const previewDocument = await waitForPreviewDocumentReady(page)
  const box = await previewDocument.boundingBox()
  if (!box) throw new Error("Preview document has no bounding box.")
  return {
    x: box.x + box.width * xRatio,
    y: box.y + box.height * yRatio,
  }
}

async function moveOutsidePreviewDocument(page: Page): Promise<void> {
  const previewDocument = await waitForPreviewDocumentReady(page)
  const box = await previewDocument.boundingBox()
  if (!box) throw new Error("Preview document has no bounding box.")
  await page.mouse.move(
    box.x + box.width + 32,
    box.y + box.height * 0.22,
    { steps: Math.max(10, Math.round(pacing.mouseSteps / 2)) },
  )
  await page.waitForTimeout(pacing.afterSectionClose)
}

async function openParagraphControlsAt(page: Page, xRatio: number, yRatio: number): Promise<void> {
  await moveToPreviewPosition(page, xRatio, yRatio)

  const controlsButton = page.getByRole("button", { name: "Paragraph controls" }).first()
  await expect(controlsButton).toBeVisible()
  await moveToLocator(page, controlsButton)
  await expect(page.locator('[data-preview-edit-affordance="true"]').getByText("Rotation")).toBeVisible()
}

async function clickOverlayButton(page: Page, name: RegExp | string): Promise<void> {
  const button = page
    .locator('[data-preview-edit-affordance="true"]')
    .getByRole("button", { name })
    .first()
  await expect(button).toBeVisible()
  await clickLocatorSlowly(page, button)
}

async function revealAlignmentControls(page: Page): Promise<void> {
  const alignmentLabel = page
    .locator('[data-preview-edit-affordance="true"]')
    .getByText("Alignment", { exact: true })
    .first()
  await expect(alignmentLabel).toBeVisible()
  await moveToLocator(page, alignmentLabel)
  await page.waitForTimeout(250)
}

async function setHoveredParagraphRotation(page: Page, value: string): Promise<void> {
  const rotationValueButton = page
    .locator('[data-preview-edit-affordance="true"]')
    .getByRole("button", { name: "Rotation" })
    .first()
  await clickLocatorSlowly(page, rotationValueButton)

  const rotationInput = page
    .locator('[data-preview-edit-affordance="true"]')
    .getByRole("textbox", { name: "Rotation" })
    .first()
  await rotationInput.fill(value)
  await rotationInput.press("Enter")
  await expect(rotationValueButton).toContainText(value)
}

async function toggleParagraphOptionTwice(page: Page, optionName: RegExp): Promise<void> {
  const option = page
    .locator('[data-preview-edit-affordance="true"]')
    .getByRole("option", { name: optionName })
    .first()
  await expect(option).toBeVisible()
  await clickLocatorSlowly(page, option)
  await page.waitForTimeout(350)
  await clickLocatorSlowly(page, option)
  await page.waitForTimeout(350)
}

async function demonstrateParagraphControls(page: Page): Promise<void> {
  await openParagraphControlsAt(page, 0.19, 0.52)
  await captureScreenshot(page, screenshotPaths.paragraphSubmenu)

  await revealAlignmentControls(page)
  await clickOverlayButton(page, /^Center$/i)
  await page.waitForTimeout(500)
  await clickOverlayButton(page, /^Right$/i)
  await page.waitForTimeout(500)
  await clickOverlayButton(page, /^Left$/i)
  await page.waitForTimeout(500)

  await setHoveredParagraphRotation(page, "-10")
  await toggleParagraphOptionTwice(page, /Hyphenation/i)
  await toggleParagraphOptionTwice(page, /Column snap/i)
  await toggleParagraphOptionTwice(page, /Baseline snap/i)
  await moveOutsidePreviewDocument(page)
}

async function deleteParagraphAt(page: Page, xRatio: number, yRatio: number): Promise<void> {
  await openParagraphControlsAt(page, xRatio, yRatio)
  await clickOverlayButton(page, /Delete paragraph/i)
  await page.waitForTimeout(700)
}

async function duplicateParagraphFromTo(
  page: Page,
  source: { xRatio: number; yRatio: number },
  target: { xRatio: number; yRatio: number },
): Promise<void> {
  await openParagraphControlsAt(page, source.xRatio, source.yRatio)
  await clickOverlayButton(page, /Duplicate or transfer/i)
  await page.waitForTimeout(400)

  const point = await getPreviewPoint(page, target.xRatio, target.yRatio)
  await page.mouse.move(point.x, point.y, { steps: pacing.mouseSteps })
  await page.waitForTimeout(250)
  await page.mouse.click(point.x, point.y, { delay: 120 })
  await page.waitForTimeout(900)
}

async function rebuildThirdRowParagraphs(page: Page): Promise<void> {
  const left = { xRatio: 0.19, yRatio: 0.52 }
  const middle = { xRatio: 0.50, yRatio: 0.52 }
  const right = { xRatio: 0.82, yRatio: 0.52 }

  await demonstrateParagraphControls(page)
  await deleteParagraphAt(page, middle.xRatio, middle.yRatio)
  await deleteParagraphAt(page, right.xRatio, right.yRatio)
  await duplicateParagraphFromTo(page, left, middle)
  await duplicateParagraphFromTo(page, left, right)

  await moveOutsidePreviewDocument(page)
}

async function selectPerformancePages(page: Page): Promise<void> {
  await openPagesPanelSection(page)
  await captureScreenshot(page, screenshotPaths.performancePagesPanel)

  const pageList = page.locator('[data-page-list-scroll-root="true"]')
  for (const pageName of [
    "Performance 0001",
    "Performance 0002",
    "Performance 0003",
    "Performance 0004",
    "Performance 0005",
  ]) {
    const pageCardText = pageList.getByText(pageName, { exact: true }).first()
    await expect(pageCardText).toBeVisible()
    await clickLocatorCenter(page, pageCardText)
    await waitForPreviewDocumentReady(page)
    await page.waitForTimeout(450)
  }
}

async function hoverPerformanceLayers(page: Page): Promise<void> {
  await openLayersPanelSection(page)

  const layerList = page.locator('[data-page-layers-scroll-root="true"]')
  const layerCards = layerList.locator('[data-project-layer-card="true"]')
  const layerCount = await layerCards.count()
  for (let index = 0; index < layerCount; index += 1) {
    const layerCard = layerCards.nth(index)
    await layerCard.scrollIntoViewIfNeeded()
    await moveToLocator(page, layerCard)
    await page.waitForTimeout(220)
  }
  await moveOutsideRightProjectPanel(page)
}

async function demonstratePerformanceProject(page: Page): Promise<void> {
  await importProjectFixture(page, performanceFixturePath)
  await waitForPreviewDocumentReady(page)
  await closeLoadedLayoutTooltip(page)
  await openRightProjectPanel(page)
  await page.waitForTimeout(pacing.afterLoad)
  await selectPerformancePages(page)
  await moveOutsideRightProjectPanel(page)
  await hoverPerformanceLayers(page)
}

async function exportActivePerformancePageAsPdf(page: Page): Promise<void> {
  await rm(exportedPdfPath, { force: true })

  const exportButton = page.getByRole("button", { name: "Export" }).first()
  await clickLocatorSlowly(page, exportButton)
  await expect(page.getByText("PDF, SVG and IDML consume the canonical page plan. JSON remains editable.")).toBeVisible()

  for (const includeName of [
    "Include baselines",
    "Include margins",
    "Include modular field",
    "Include typography",
    "Include placeholders",
  ]) {
    await ensureActiveExportToggle(page, page.getByRole("button", { name: includeName }))
  }

  for (const outputName of ["SVG", "IDML", "JSON"]) {
    const outputButton = page.getByRole("button", { name: outputName }).first()
    await moveToLocator(page, outputButton)
    await page.waitForTimeout(180)
  }

  const pdfFormatButton = page.getByRole("button", { name: /^PDF$/ }).first()
  await clickLocatorSlowly(page, pdfFormatButton)

  const pageRangeInput = page.getByPlaceholder("1-5;7;25;550-650")
  await clickLocatorSlowly(page, pageRangeInput)
  await pageRangeInput.fill("5")
  await pageRangeInput.press("Enter")

  const filenameInput = page.locator('input[type="text"]').nth(1)
  await filenameInput.fill("quick-start-video-001-performance-page-0005.pdf")
  await captureScreenshot(page, screenshotPaths.exportPdfPopup)

  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 })
  await clickLocatorSlowly(page, page.getByRole("button", { name: /^PDF$/ }).last())
  const download = await downloadPromise
  await mkdir(path.dirname(exportedPdfPath), { recursive: true })
  await download.saveAs(exportedPdfPath)

  await page.goto(pathToFileURL(exportedPdfPath).href, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(2_000)
}

async function convertWebmToMp4(inputPath: string, outputPath: string): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not resolve an ffmpeg binary.")
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await rm(outputPath, { force: true })

  const args = [
    "-y",
    "-i",
    inputPath,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]

  // Playwright stores recorded browser video as WebM; the requirement is a real MP4 artifact.
  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ["ignore", "ignore", "pipe"],
    })
    let stderr = ""

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`ffmpeg exited with code ${code ?? "unknown"}:\n${stderr}`))
    })
  })
}

test("record quick start video 001", async ({ browser, baseURL }) => {
  await rm(rawVideoDir, { recursive: true, force: true })
  await mkdir(rawVideoDir, { recursive: true })

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    acceptDownloads: true,
    recordVideo: {
      dir: rawVideoDir,
      size: viewport,
    },
  })
  const page = await context.newPage()
  const video = page.video()

  await test.step("open the Next.js app", async () => {
    await page.goto(baseURL ?? "/", { waitUntil: "domcontentloaded" })
    await page.waitForLoadState("networkidle")
    await installPointerOverlay(page)
    await expect(page.getByRole("button", { name: "Import" })).toBeEnabled()
    await expect(page.locator('input[type="file"]')).toHaveCount(1)
    await page.waitForTimeout(pacing.afterLoad)
    await captureScreenshot(page, screenshotPaths.presetsBrowser)
  })

  await test.step("import the layout fixture", async () => {
    await importProjectFixture(page, fixturePath)

    await waitForPreviewDocumentReady(page)
    await closeLoadedLayoutTooltip(page)
    await closeRightProjectPanel(page)
    await captureScreenshot(page, screenshotPaths.layoutProjectPanelOff)
    await toggleHeaderDisplayOptions(page)
    await page.waitForTimeout(pacing.afterLoad)
  })

  await test.step("open canvas controls and cycle ratio rollovers", async () => {
    await moveToLocator(page, page.getByText("Canvas", { exact: true }).first())

    const ratioList = page.getByRole("listbox", { name: "Page ratio" })
    await expect(ratioList).toBeVisible()

    await previewRatioOption(page, ratioList, /Photo\s+2:3/i)
    await previewRatioOption(page, ratioList, /Screen\s+16:9/i)
    await previewRatioOption(page, ratioList, /Editorial\s+4:5/i)
    await previewRatioOption(page, ratioList, /Wide impact\s+2:1/i)
    await previewRatioOption(page, ratioList, /Square\s+1:1/i)
    await waitForPreviewDocumentAspect(await waitForPreviewDocumentReady(page), 1)
    await captureScreenshot(page, screenshotPaths.ratioSquareHover)
    await previewRatioOption(page, ratioList, /DIN/i)
    await previewRatioOption(page, ratioList, /Square\s+1:1/i)
    await waitForPreviewDocumentAspect(await waitForPreviewDocumentReady(page), 1)
    await page.waitForTimeout(pacing.afterHover)
  })

  await test.step("commit the square ratio and wait for the canvas", async () => {
    const ratioList = page.getByRole("listbox", { name: "Page ratio" })
    const squareOption = ratioList.getByRole("option", { name: /Square\s+1:1/i })

    await clickLocatorSlowly(page, squareOption)
    await expect(squareOption).toHaveAttribute("aria-selected", "true")
    await waitForPreviewDocumentAspect(await waitForPreviewDocumentReady(page), 1)
    await moveJustOutsideLeftPanel(page)
    await expect(page.getByRole("listbox", { name: "Page ratio" })).toBeHidden()
  })

  await test.step("open margins controls and commit Van de Graaf", async () => {
    await moveToLocator(page, page.getByText("Margins", { exact: true }).first())

    const marginMethodList = page.getByRole("listbox", { name: "Margin method" })
    await expect(marginMethodList).toBeVisible()

    await previewRatioOption(page, marginMethodList, /Progressive margins\s+1:2:2:3/i)
    await previewRatioOption(page, marginMethodList, /Baseline\s+1:1:1:1/i)

    await moveToLocator(page, page.getByText("Margins", { exact: true }).first())
    await expect(marginMethodList).toBeVisible()

    const vanDeGraafOption = marginMethodList.getByRole("option", { name: /Van de Graaf\s+2:3:4:6/i })
    await moveToLocator(page, vanDeGraafOption)
    await page.waitForTimeout(pacing.afterHover)
    await clickLocatorSlowly(page, vanDeGraafOption)
    await vanDeGraafOption.evaluate((node: HTMLButtonElement) => node.click())
    await expect(vanDeGraafOption).toHaveAttribute("aria-selected", "true")
    await moveJustOutsideLeftPanel(page)
    await expect(page.getByRole("listbox", { name: "Margin method" })).toBeHidden()
    await page.waitForTimeout(pacing.afterCommit)
  })

  await test.step("rebuild third row paragraphs from the first column", async () => {
    await rebuildThirdRowParagraphs(page)
  })

  await test.step("open performance fixture and inspect pages and layers", async () => {
    await demonstratePerformanceProject(page)
  })

  await test.step("export the active performance page as PDF and open it", async () => {
    await exportActivePerformancePageAsPdf(page)
  })

  await context.close()

  if (!video) {
    throw new Error("Playwright did not attach video recording to the page.")
  }
  const webmPath = await video.path()
  await convertWebmToMp4(webmPath, screencastPath)

})
