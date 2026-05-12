import { defineConfig, devices } from "@playwright/test"
import { fileURLToPath } from "node:url"
import path from "node:path"

const rootDir = fileURLToPath(new URL(".", import.meta.url))
const webappDir = path.join(rootDir, "webapp")
const port = process.env.PLAYWRIGHT_PORT ?? "3000"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`
const shouldStartWebServer = !process.env.PLAYWRIGHT_BASE_URL
const headedByDefault = process.env.PLAYWRIGHT_HEADLESS !== "1"

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: !headedByDefault,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
        cwd: webappDir,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      }
    : undefined,
})
