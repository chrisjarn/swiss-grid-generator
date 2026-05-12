import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const targetPath = path.join(ROOT, "docs-site", "index.md")
const repositoryBase = "https://github.com/longplay45/swiss-grid-generator/blob/main"

const sections = [
  {
    title: "Quickstart",
    source: "DOCUMENTATION.md",
  },
  {
    title: "Tooltips",
    source: "webapp/messages/en/content/tooltips.md",
  },
  {
    title: "Features",
    source: "FEATURES.md",
  },
  {
    title: "GUI",
    source: "GUI.md",
  },
  {
    title: "Performance",
    source: "PERFORMANCE.md",
  },
]

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8").trim()
}

function stripFirstHeading(markdown) {
  return markdown.replace(/^# .*(?:\r?\n)+/, "").trim()
}

function demoteHeadings(markdown) {
  return markdown.replace(/^(#{1,6})\s/gm, (match, marks) => {
    const nextLevel = Math.min(marks.length + 1, 6)
    return `${"#".repeat(nextLevel)} `
  })
}

function rewriteMarkdownLinks(markdown) {
  return markdown.replace(
  /\]\(([^)\s]+\.md)\)/g,
  (_match, relPath) => `](${repositoryBase}/${relPath})`,
)
}

const siteSource = [
  "# Swiss Grid Generator Documentation",
  ...sections.map(({ title, source }) => {
    const body = demoteHeadings(stripFirstHeading(readSource(source)))
    return `## ${title}\n\n${rewriteMarkdownLinks(body)}`
  }),
  "",
].join("\n\n")

fs.mkdirSync(path.dirname(targetPath), { recursive: true })
fs.writeFileSync(targetPath, siteSource)
console.log("Generated docs-site/index.md from documentation sources")
