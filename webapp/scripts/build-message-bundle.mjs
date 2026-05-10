import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../..")
const messagesRoot = path.join(repoRoot, "webapp/messages")

const DOMAIN_FILES = [
  "app.json",
  "common.json",
  "shell.json",
  "settings.json",
  "dialogs.json",
  "project.json",
  "presets.json",
  "editor.json",
  "preview.json",
  "export.json",
  "status.json",
]

function mergeDomain(target, source, sourcePath) {
  for (const [key, value] of Object.entries(source)) {
    if (Object.hasOwn(target, key)) {
      throw new Error(`Duplicate message domain "${key}" in ${sourcePath}`)
    }
    target[key] = value
  }
}

async function buildLocale(locale) {
  const localeDir = path.join(messagesRoot, locale)
  const uiDir = path.join(localeDir, "ui")
  const output = {}

  for (const filename of DOMAIN_FILES) {
    const sourcePath = path.join(uiDir, filename)
    const source = JSON.parse(await fs.readFile(sourcePath, "utf8"))
    mergeDomain(output, source, path.relative(repoRoot, sourcePath))
  }

  const outputPath = path.join(messagesRoot, `${locale}.json`)
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  process.stdout.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

await buildLocale("en")
