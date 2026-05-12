import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../..")
const messagesRoot = path.join(repoRoot, "webapp/messages")

const MESSAGE_SOURCES = [
  { file: "app.json", path: ["app"] },
  { file: "ui/common.json", path: ["ui", "common"] },
  { file: "ui/shell.json", path: ["ui", "shell"] },
  { file: "ui/panels.json", path: ["ui", "panels"] },
  { file: "ui/preview.json", path: ["ui", "preview"] },
  { file: "ui/editor.json", path: ["ui", "editor"] },
  { file: "ui/export.json", path: ["ui", "export"] },
  { file: "ui/status.json", path: ["ui", "status"] },
]

function assignMessageSource(target, source, targetPath, sourcePath) {
  let current = target
  for (const [index, segment] of targetPath.entries()) {
    const isLeaf = index === targetPath.length - 1
    if (isLeaf) {
      if (Object.hasOwn(current, segment)) {
        throw new Error(`Duplicate message domain "${targetPath.join(".")}" in ${sourcePath}`)
      }
      current[segment] = source
      return
    }

    if (!Object.hasOwn(current, segment)) {
      current[segment] = {}
    } else if (!current[segment] || typeof current[segment] !== "object" || Array.isArray(current[segment])) {
      throw new Error(`Message domain conflict at "${targetPath.slice(0, index + 1).join(".")}" in ${sourcePath}`)
    }

    current = current[segment]
  }
}

async function buildLocale(locale) {
  const localeDir = path.join(messagesRoot, locale)
  const output = {}

  for (const sourceConfig of MESSAGE_SOURCES) {
    const sourcePath = path.join(localeDir, sourceConfig.file)
    const source = JSON.parse(await fs.readFile(sourcePath, "utf8"))
    assignMessageSource(output, source, sourceConfig.path, path.relative(repoRoot, sourcePath))
  }

  const outputPath = path.join(messagesRoot, `${locale}.json`)
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  process.stdout.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

await buildLocale("en")
