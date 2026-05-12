import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(ROOT, "DOCUMENTATION.md")
const targetPath = path.join(ROOT, "docs-site", "index.md")

const source = fs.readFileSync(sourcePath, "utf8")
const repositoryBase = "https://github.com/longplay45/swiss-grid-generator/blob/main"
const siteSource = source.replace(
  /\]\(([^)\s]+\.md)\)/g,
  (_match, relPath) => `](${repositoryBase}/${relPath})`,
)
fs.mkdirSync(path.dirname(targetPath), { recursive: true })
fs.writeFileSync(targetPath, siteSource)
console.log("Generated docs-site/index.md from DOCUMENTATION.md")
