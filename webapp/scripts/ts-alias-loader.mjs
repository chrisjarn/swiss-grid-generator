import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", ".json"]
const INDEX_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".json"]

function resolveAliasPath(specifier) {
  if (!specifier.startsWith("@/")) return null
  const withoutAlias = specifier.slice(2)
  for (const extension of EXTENSIONS) {
    const candidate = path.join(ROOT, `${withoutAlias}${extension}`)
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  const directoryCandidate = path.join(ROOT, withoutAlias)
  if (fs.existsSync(directoryCandidate) && fs.statSync(directoryCandidate).isDirectory()) {
    for (const extension of INDEX_EXTENSIONS) {
      const indexCandidate = path.join(directoryCandidate, `index${extension}`)
      if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) return indexCandidate
    }
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  const aliasPath = resolveAliasPath(specifier)
  if (aliasPath) {
    return {
      url: pathToFileURL(aliasPath).href,
      shortCircuit: true,
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    const source = fs.readFileSync(new URL(url), "utf8")
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${source};`,
    }
  }
  return nextLoad(url, context)
}
