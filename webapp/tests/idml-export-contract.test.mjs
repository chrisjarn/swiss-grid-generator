import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("idml export rebuilds each project page through the shared resolver and page export plan", () => {
  const source = readText("lib/idml-export.ts")
  const plannedSource = readText("lib/planned-page-export-source.ts")
  assert.match(source, /for\s*\(const\s+\[index,\s*page\]\s+of\s+project\.pages\.entries\(\)\)/)
  assert.match(source, /buildResolvedProjectPageExportSource\(page,\s*sourcePath,\s*\{/)
  assert.match(source, /buildPlannedProjectPageExportSource\(resolved,\s*layoutEngine\)/)
  assert.match(source, /layoutEngine:\s*LayoutEngineContract/)
  assert.match(plannedSource, /buildPageExportPlan\(\{[\s\S]*?showBaselines:\s*source\.uiSettings\.showBaselines/)
  assert.match(plannedSource, /showModules:\s*source\.uiSettings\.showModules/)
  assert.match(plannedSource, /showMargins:\s*source\.uiSettings\.showMargins/)
  assert.match(plannedSource, /showImagePlaceholders:\s*source\.uiSettings\.showImagePlaceholders/)
  assert.match(plannedSource, /showTypography:\s*source\.uiSettings\.showTypography/)
})

test("idml package builder writes a packaged document with resources, spreads, and a backing story", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(source, /zipSync\(/)
  assert.match(source, /application\/vnd\.adobe\.indesign-idml-package/)
  assert.match(source, /"META-INF\/container\.xml"/)
  assert.match(source, /"META-INF\/metadata\.xml"/)
  assert.match(source, /"Resources\/Graphic\.xml"/)
  assert.match(source, /"Resources\/Fonts\.xml"/)
  assert.match(source, /"Resources\/Styles\.xml"/)
  assert.match(source, /"Resources\/Preferences\.xml"/)
  assert.match(source, /"MasterSpreads\/MasterSpread_sggMaster\.xml"/)
  assert.match(source, /"XML\/BackingStory\.xml"/)
  assert.match(source, /"XML\/Tags\.xml"/)
  assert.match(source, /"designmap\.xml"/)
  assert.match(source, /Spreads\/Spread_\$\{String\(pageIndex \+ 1\)\.padStart\(3,\s*"0"\)\}\.xml/)
})

test("idml builder separates guides, typography, and placeholders on dedicated layers", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(source, /const\s+LAYER_PLACEHOLDERS_ID\s*=\s*"sggLayerPlaceholders"/)
  assert.match(source, /const\s+LAYER_TYPOGRAPHY_ID\s*=\s*"sggLayerTypography"/)
  assert.match(source, /const\s+LAYER_GUIDES_ID\s*=\s*"sggLayerGuides"/)
  assert.match(source, /ItemLayer:\s*LAYER_PLACEHOLDERS_ID/)
  assert.match(source, /ItemLayer:\s*LAYER_TYPOGRAPHY_ID/)
  assert.match(source, /buildGuidesXml\(pageTransformMatrix,\s*guideRects\)/)
  assert.match(source, /layerId:\s*LAYER_GUIDES_ID/)
  assert.match(source, /Name:\s*"Placeholders"/)
  assert.match(source, /Name:\s*"Typography"/)
  assert.match(source, /Name:\s*"Guides"/)
})

test("idml builder places spread items in page coordinates with an explicit page-origin transform", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(source, /function\s+buildPageCoordinateTransform\(pageHeight:\s*number\):\s*Matrix/)
  assert.match(source, /return\s+\[1,\s*0,\s*0,\s*1,\s*0,\s*-pageHeight\s*\/\s*2\]/)
  assert.match(source, /ItemTransform:\s*formatMatrix\(buildPageCoordinateTransform\(pageHeight\)\)/)
  assert.match(source, /renderRectPathGeometry\(0,\s*0,\s*pageWidth,\s*pageHeight\)/)
})

test("idml designmap declares spreads before section metadata to avoid a synthetic lead page", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(
    source,
    /\.\.\.spreads\.map\(\(spread\)\s*=>\s*renderIdmlElement\("idPkg:Spread",\s*\{\s*src:\s*spread\.filePath\s*\}\)\),[\s\S]*renderIdmlElement\(\s*"Section"/,
  )
})

test("idml preferences do not predeclare document pages when spreads already define the export range", () => {
  const source = readText("lib/idml/builder.ts")
  assert.doesNotMatch(source, /PagesPerDocument:/)
  assert.match(source, /FacingPages:\s*false/)
})

test("idml builder converts shared vector outline geometry into outlined polygon items", () => {
  const source = readText("lib/idml/builder.ts")
  const outlineSource = readText("lib/vector-text-outline.ts")
  assert.match(source, /preloadTextPlanOutlineFonts\(page\.exportPlan\.textPlans\)/)
  assert.match(source, /resolveTextPlanVectorShapes\(textPlan\)/)
  assert.match(source, /for\s*\(const\s+\[shapeIndex,\s*shape\]\s+of\s+outlineShapes\.entries\(\)\)/)
  assert.match(source, /convertOpenTypeCommandsToGeometryPaths\(shape\.commands\)/)
  assert.match(source, /renderIdmlElement\(\s*"Polygon"/)
  assert.match(source, /renderPathGeometry\(geometryPaths\)/)
  assert.match(outlineSource, /loadOutlineFont\(fontFamily,\s*fontWeight,\s*italic\)/)
  assert.match(outlineSource, /outlineFont\.getPath\(/)
})

test("idml styles still include paragraph families plus per-character vector export resources", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(source, /buildCharacterStyles\(/)
  assert.match(source, /buildParagraphStyleKeys\(/)
  assert.match(source, /"body",\s*"headline",\s*"display",\s*"fx",\s*"caption"/)
  assert.match(source, /CharacterStyle\/sgg\/char_/)
  assert.match(source, /ParagraphStyle\/sgg\//)
  assert.match(source, /AppliedFont",\s*\{\s*type:\s*"string"\s*\}/)
  assert.match(source, /Leading",\s*\{\s*type:\s*"unit"\s*\}/)
})

test("idml font metadata prefers parsed font-file names and keeps a fallback path", () => {
  const source = readText("lib/idml/font-metadata.ts")
  assert.match(source, /findTable\(view,\s*"name"\)/)
  assert.match(source, /const\s+nameId\s*=\s*view\.getUint16\(recordOffset\s*\+\s*6,\s*false\)/)
  assert.match(source, /byNameId\.get\(16\)/)
  assert.match(source, /byNameId\.get\(17\)/)
  assert.match(source, /byNameId\.get\(6\)/)
  assert.match(source, /getFontAssetPath\(fontFamily,\s*resolvedVariant\.weight,\s*resolvedVariant\.italic\)/)
  assert.match(source, /buildFallbackMetadata\(/)
})
