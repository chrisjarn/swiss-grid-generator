import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  FONT_DEFINITIONS,
  getFontAssetPath,
  getFontVariants,
} from "@/core/config/fonts"

const WEBAPP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC_ROOT = path.join(WEBAPP_ROOT, "public")

function toPublicFilePath(assetPath) {
  const normalized = assetPath.replace(/^\/+/, "")
  const filePath = path.resolve(PUBLIC_ROOT, normalized)
  if (!filePath.startsWith(PUBLIC_ROOT + path.sep)) {
    throw new Error(`Font asset escapes public directory: ${assetPath}`)
  }
  return filePath
}

const missing = []
for (const definition of FONT_DEFINITIONS) {
  for (const variant of getFontVariants(definition.value)) {
    const assetPath = getFontAssetPath(definition.value, variant.weight, variant.italic)
    const filePath = toPublicFilePath(assetPath)
    try {
      const stat = fs.statSync(filePath)
      if (!stat.isFile() || stat.size <= 0) {
        missing.push(`${definition.value} ${variant.weight}${variant.italic ? " italic" : ""}: ${assetPath}`)
      }
    } catch {
      missing.push(`${definition.value} ${variant.weight}${variant.italic ? " italic" : ""}: ${assetPath}`)
    }
  }
}

if (missing.length > 0) {
  console.error("Missing required local font assets:")
  missing.forEach((entry) => console.error(`  - ${entry}`))
  process.exitCode = 1
} else {
  console.log(`Font assets verified (${FONT_DEFINITIONS.length} families).`)
}
