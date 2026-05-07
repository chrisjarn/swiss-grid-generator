import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("browser preview caches only exact canonical page plans, not mutable canvas adapter maps", () => {
  const source = readText("hooks/useTypographyRenderer.ts")
  assert.match(source, /const\s+MAX_PREVIEW_PAGE_EXPORT_PLAN_CACHE_ENTRIES\s*=\s*12/)
  assert.match(source, /type\s+PreviewPageExportPlanCacheEntry\s*=\s*\{[\s\S]*?exportPlan:\s*PageExportPlan/)
  assert.match(source, /function\s+buildPreviewPageExportPlanCacheKey/)
  assert.match(source, /JSON\.stringify\(\{[\s\S]*?result,[\s\S]*?layout,[\s\S]*?documentVariableContext,[\s\S]*?layoutEngine,[\s\S]*?fontRenderEpoch/)
  assert.match(source, /const\s+pageExportPlanCacheKey\s*=\s*dragState\s*\?\s*null/)
  assert.match(source, /readPreviewPageExportPlanCache\(pageExportPlanCacheRef\.current,\s*pageExportPlanCacheKey\)/)
  assert.match(source, /writePreviewPageExportPlanCache\(pageExportPlanCacheRef\.current,\s*pageExportPlanCacheKey,\s*exportPlan\)/)
  assert.match(source, /buildCanvasRenderPlansFromPageExportPlan\(exportPlan/)
  const cacheEntryMatch = source.match(/type\s+PreviewPageExportPlanCacheEntry\s*=\s*\{[\s\S]*?\n\}/)
  assert.ok(cacheEntryMatch)
  assert.doesNotMatch(cacheEntryMatch[0], /canvasRenderPlans/)
})

test("browser preview invalidates visible canvas geometry before paint until a fresh plan commits", () => {
  const previewSource = readText("components/grid-preview.tsx")
  const rendererSource = readText("hooks/useTypographyRenderer.ts")

  assert.match(previewSource, /useLayoutEffect/)
  assert.match(previewSource, /const\s+previewSurfaceSignatureRef\s*=\s*useRef<string\s*\|\s*null>\(null\)/)
  assert.match(previewSource, /const\s+previewSurfaceSignature\s*=\s*useMemo\(\(\)\s*=>\s*JSON\.stringify\(\{[\s\S]*?initialLayoutToken,[\s\S]*?scale,[\s\S]*?pixelRatio,[\s\S]*?rotation,[\s\S]*?showTypography,[\s\S]*?showImagePlaceholders,[\s\S]*?fontRenderEpoch/)
  assert.match(previewSource, /useLayoutEffect\(\(\)\s*=>\s*\{[\s\S]*?previewSurfaceSignatureRef\.current\s*===\s*previewSurfaceSignature[\s\S]*?setLayoutDisplayReady\(false\)[\s\S]*?blockRectsRef\.current\s*=\s*\{\}[\s\S]*?imageRectsRef\.current\s*=\s*\{\}[\s\S]*?previousPlansRef\.current\.clear\(\)[\s\S]*?setOverflowLinesByBlock\(\{\}\)/)
  assert.match(previewSource, /style=\{\{\s*opacity:\s*layoutDisplayReady\s*\?\s*1\s*:\s*0\s*\}\}/)
  assert.doesNotMatch(previewSource, /rounded-lg\s+transition-opacity/)
  assert.match(rendererSource, /if\s*\(!showTypography\s*&&\s*imagePlans\.size\s*===\s*0\)\s*\{[\s\S]*?onPlansCommit\?\.\(\)/)
})
