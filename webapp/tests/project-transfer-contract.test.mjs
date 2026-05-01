import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("project transfers carry an explicit deterministic layout engine contract", () => {
  const transferSource = readText("lib/project-transfer.ts")
  const sessionSource = readText("lib/document-session.ts")
  const contractSource = readText("lib/layout-engine-contract.ts")
  const manifestSource = readText("lib/presets/generated-manifest.ts")

  assert.match(contractSource, /CURRENT_LAYOUT_ENGINE_CONTRACT/)
  assert.doesNotMatch(contractSource, /LEGACY_BROWSER_COMPAT_LAYOUT_ENGINE_CONTRACT|browser-canvas-compat-v1|swiss-grid-layout-v1/)
  assert.match(contractSource, /CURRENT_LAYOUT_ENGINE_CONTRACT:\s*LayoutEngineContract\s*=\s*[\s\S]*?DETERMINISTIC_OPTICAL_MARGIN_LAYOUT_ENGINE_CONTRACT/)
  assert.match(contractSource, /textMetricsEngine:\s*"font-file-deterministic-optical-margin-v1"/)
  assert.match(contractSource, /parseLayoutEngineContract\(source:[\s\S]*?return CURRENT_LAYOUT_ENGINE_CONTRACT/)
  assert.match(contractSource, /verticalTextBoxModel:\s*"cap-top-legacy-descent-0\.2em"/)
  assert.match(contractSource, /wrapModel:\s*"font-file-width-tracking-optical-v1"/)
  assert.match(contractSource, /layerOrderModel:\s*"explicit-layer-order-v1"/)
  assert.match(transferSource, /layoutEngine:\s*project\.layoutEngine\s*\?\?\s*CURRENT_LAYOUT_ENGINE_CONTRACT/)
  assert.match(sessionSource, /layoutEngine:\s*LayoutEngineContract/)
  assert.match(sessionSource, /layoutEngine = CURRENT_LAYOUT_ENGINE_CONTRACT/)
  assert.match(sessionSource, /parseLayoutEngineContract\(payload\.layoutEngine\)/)
  assert.match(sessionSource, /throw new Error\("Invalid project JSON: missing pages array\."\)/)
  assert.doesNotMatch(sessionSource, /missing pages or legacy uiSettings payload|Preserve legacy single-page/)
  assert.match(
    manifestSource,
    /\\"layoutEngine\\":\{\\"id\\":\\"swiss-grid-layout-v2\\",\\"version\\":2,\\"textMetricsEngine\\":\\"font-file-deterministic-optical-margin-v1\\"/,
    "bundled presets should explicitly carry the promoted v2 layout contract",
  )
})
