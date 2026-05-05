import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("svg export is rendered through the shared page export plan", () => {
  const source = readText("lib/svg-vector-export.ts")
  const plannedSource = readText("lib/planned-page-export-source.ts")
  assert.match(source, /import\s+\{\s*buildPageExportPlan,\s*type\s+PageExportPlan\s*\}\s+from\s+"@\/lib\/page-export-plan"/)
  assert.match(source, /exportPlan\?:\s*PageExportPlan/)
  assert.match(source, /exportPlan:\s*providedExportPlan/)
  assert.match(source, /const\s+exportPlan\s*=\s*providedExportPlan\s*\?\?\s*buildPageExportPlan\(\{/)
  assert.match(source, /showBaselines,\s*showModules,\s*showMargins,\s*showImagePlaceholders,\s*showTypography,/)
  assert.match(plannedSource, /buildPlannedProjectPageExportSources/)
})

test("svg export emits a trim-sized svg with page clipping, guide groups, placeholders, and outline groups", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(source, /<defs><clipPath id="\$\{pageClipId\}"><rect x="0" y="0" width="\$\{formatNumber\(exportPlan\.pageWidth\)\}" height="\$\{formatNumber\(exportPlan\.pageHeight\)\}" \/><\/clipPath><\/defs>/)
  assert.match(source, /guides-\$\{guideGroup\.id\}/)
  assert.match(source, /<rect id="image-\$\{quoteAttr\(key\)\}"/)
  assert.match(source, /<g id="text-\$\{quoteAttr\(key\)\}"/)
  assert.match(source, /data-text-rendering="glyph-outline"/)
  assert.match(source, /<path d="\$\{quoteAttr\(pathData\)\}"/)
})

test("svg export embeds project metadata in a dedicated rdf block", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /function\s+buildSvgMetadataMarkup\(/)
  assert.match(source, /<metadata>/)
  assert.match(source, /<rdf:RDF xmlns:rdf="http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#">/)
  assert.match(source, /<dc:format>image\/svg\+xml<\/dc:format>/)
  assert.match(source, /<dc:title><rdf:Alt><rdf:li xml:lang="x-default">/)
  assert.match(source, /<dc:description><rdf:Alt><rdf:li xml:lang="x-default">/)
  assert.match(source, /<dc:creator><rdf:Seq><rdf:li>/)
  assert.match(source, /<dc:date><rdf:Seq><rdf:li>/)
  assert.match(source, /<xmp:CreatorTool>/)
  assert.match(source, /metadataMarkup/)
})

test("svg export converts positioned graphemes through the shared vector outline resolver", () => {
  const svgSource = readText("lib/svg-vector-export.ts")
  const outlineSource = readText("lib/vector-text-outline.ts")
  assert.match(svgSource, /resolveTextPlanVectorShapes\(textPlan\)/)
  assert.match(svgSource, /buildSvgPathDataFromCommands\(shape\.commands\)/)
  assert.match(outlineSource, /import\s+\{\s*loadOutlineFont,[\s\S]*?\}\s+from\s+"@\/lib\/font-outline"/)
  assert.match(outlineSource, /loadOutlineFont\(fontFamily,\s*fontWeight,\s*italic\)/)
  assert.match(outlineSource, /textPlan\.graphemeLines\.length\s*>\s*0/)
  assert.match(outlineSource, /grapheme\.x/)
  assert.match(outlineSource, /grapheme\.y/)
  assert.match(outlineSource, /outlineFont\.getPath\(/)
  assert.match(outlineSource, /kerning:\s*false/)
  assert.match(outlineSource, /hinting:\s*false/)
})

test("svg export keeps block and page rotation explicit in svg transforms", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /function\s+renderRotationTransform\(rotation:\s*number,\s*originX:\s*number,\s*originY:\s*number\)/)
  assert.match(source, /const\s+pageRotationTransform\s*=\s*renderRotationTransform\(/)
  assert.match(source, /const\s+rotationTransform\s*=\s*renderRotationTransform\(/)
})

test("svg export keeps a narrow live-text fallback if outline loading fails unexpectedly", () => {
  const svgSource = readText("lib/svg-vector-export.ts")
  const outlineSource = readText("lib/vector-text-outline.ts")
  assert.match(outlineSource, /if\s*\(!outlineFont\)\s*\{[\s\S]*?fallbackTextShapes\.push/)
  assert.match(svgSource, /xml:space="preserve"/)
  assert.match(svgSource, /data-text-rendering="text-fallback"/)
})

test("export actions support pdf, svg, idml, and json formats with format-specific filenames", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /export\s+type\s+ExportFormat\s*=\s*"pdf"\s*\|\s*"svg"\s*\|\s*"idml"\s*\|\s*"json"/)
  assert.match(source, /runProjectExport/)
  assert.match(source, /const\s+getDefaultExportFilename\s*=\s*useCallback\(\(format:\s*ExportFormat,\s*selectedPages:\s*number,\s*compressedJson/)
  assert.match(source, /if\s*\(format\s*===\s*"svg"\s*&&\s*selectedPageCount\s*>\s*1\)\s*return\s*"\.zip"/)
  assert.match(source, /const\s+currentProjectSnapshot\s*=\s*activeProject/)
  assert.match(source, /filterProjectByExportRange\(activeProject,\s*selectedRange\)/)
  assert.doesNotMatch(source, /buildResolvedProjectPageExportSources/)
  assert.match(source, /PROJECT_JSON_EXTENSION/)
  assert.match(source, /PROJECT_ARCHIVE_EXTENSION/)
  assert.match(source, /if\s*\(exportFormatDraft\s*!==\s*"json"\s*&&\s*selectedPageCount\s*===\s*0\)\s*return/)
  assert.match(source, /if\s*\(exportFormatDraft\s*===\s*"json"\)\s*\{[\s\S]*?saveJSON\(filename,\s*selectedProject,\s*normalizedMetadata,\s*jsonCompressionEnabledDraft\)/)
  assert.match(source, /if\s*\(exportFormatDraft\s*===\s*"idml"\)\s*\{[\s\S]*?await\s+exportIDML\(currentProjectSnapshot,\s*selectedRange,\s*exportViewSettings,\s*filename,\s*normalizedMetadata\)/)
  assert.match(source, /await\s+exportPDF\(currentProjectSnapshot,\s*selectedRange,\s*exportViewSettings,\s*filename,/)
  assert.match(source, /await\s+exportSVG\(currentProjectSnapshot,\s*selectedRange,\s*exportViewSettings,\s*filename,\s*normalizedMetadata\)/)
  assert.match(source, /const\s+defaultRange\s*=\s*\{\s*fromPage:\s*1,\s*toPage:\s*projectPageCount\s*\}/)
  assert.match(source, /author:\s*saveAuthorDraft\.trim\(\),/)
  assert.match(source, /createdAt:\s*nextCreatedAt,/)
})

test("multi-page svg export switches to zip packaging with one file per selected page", () => {
  const source = readText("hooks/useExportActions.ts")
  const engineSource = readText("lib/export-engine.ts")
  assert.match(source, /svgPackaging:\s*"zip"/)
  assert.match(engineSource, /zipSync\(zipEntries\)/)
  assert.match(engineSource, /application\/zip/)
  assert.match(engineSource, /_page_\$\{String\(pageNumber\)\.padStart\(3,\s*"0"\)\}_/)
})

test("export dialog exposes an explicit pdf-svg-idml-json format switch", () => {
  const source = readText("components/dialogs/ExportDialog.tsx")
  assert.match(source, /SectionHeaderRow\s+label="Format"/)
  assert.match(source, /SectionHeaderRow\s+label="Pages"/)
  assert.match(source, /onExportFormatChange\("json"\)[\s\S]*onExportFormatChange\("pdf"\)[\s\S]*onExportFormatChange\("svg"\)[\s\S]*onExportFormatChange\("idml"\)/)
  assert.match(source, /onExportFormatChange\("pdf"\)/)
  assert.match(source, /onExportFormatChange\("svg"\)/)
  assert.match(source, /onExportFormatChange\("idml"\)/)
  assert.match(source, /onExportFormatChange\("json"\)/)
  assert.match(source, /onExportRangeStartChange/)
  assert.match(source, /onExportRangeEndChange/)
  assert.match(source, /SVG v1 exports trim-sized glyph-outline vectors, guides, and placeholders\./)
  assert.match(source, /SVG v1 exports a ZIP with one trim-sized outlined SVG per selected page\./)
  assert.match(source, /IDML v1 exports the selected project page range/)
  assert.match(source, /JSON exports the full editable project document/)
  assert.match(source, /GZIP-Compression/)
  assert.match(source, /GZIP-Compression/)
  assert.match(source, /Export IDML/)
  assert.match(source, /Save JSON/)
  assert.doesNotMatch(source, /Units \/ Paper Size/)
  assert.doesNotMatch(source, /Width \(mm\)/)
  assert.doesNotMatch(source, /Ratio:/)
})

test("save dialog remains focused on library metadata rather than json filename export", () => {
  const source = readText("components/dialogs/SaveLibraryDialog.tsx")
  assert.match(source, /Save to Library/)
  assert.match(source, /Project Title/)
  assert.match(source, /Subject \(optional\)/)
  assert.match(source, /Author \(optional\)/)
  assert.doesNotMatch(source, /Filename/)
})

test("default pdf and svg filenames no longer encode a paper-size override", () => {
  const source = readText("app/page.tsx")
  assert.match(source, /const\s+defaultPdfFilename\s*=\s*useMemo\(\s*\(\)\s*=>\s*`\$\{baseFilename\}_grid\.pdf`/)
  assert.match(source, /const\s+defaultSvgFilename\s*=\s*useMemo\(\s*\(\)\s*=>\s*`\$\{baseFilename\}_grid\.svg`/)
  assert.doesNotMatch(source, /baseFilename}_\$\{exportPaperSize\}_grid\.(pdf|svg)/)
})
