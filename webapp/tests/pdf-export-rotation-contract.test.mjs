import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("page export plan extends baselines beyond the page before downstream clipping", () => {
  const source = readText("lib/page-export-plan.ts")
  assert.match(source, /const\s+halfDiag\s*=\s*Math\.sqrt\(sourceWidth\s*\*\s*sourceWidth\s*\+\s*sourceHeight\s*\*\s*sourceHeight\)\s*\/\s*2/)
  assert.match(source, /x1:\s*-halfDiag/)
  assert.match(source, /x2:\s*sourceWidth\s*\+\s*halfDiag/)
  assert.match(source, /clipToPage:\s*true/)
})

test("typography layout plan reflows across the full stacked row height before advancing to the next column", () => {
  const source = readText("lib/typography-layout-plan.ts")
  assert.match(source, /export\s+function\s+getTypographyLineCapacityForHeight\([\s\S]*?firstLineHeight\s*=\s*lineStep/)
  assert.match(source, /const\s+safeFirstLineHeight\s*=\s*Math\.max\(0\.0001,\s*firstLineHeight\)/)
  assert.match(source, /return\s+Math\.max\(1,\s*1\s*\+\s*Math\.floor\(\(availableHeight\s*-\s*safeFirstLineHeight\)\s*\/\s*safeLineStep\)\)/)
  assert.match(source, /export\s+function\s+getTypographyReflowLineCapacityForHeight\([\s\S]*?return\s+Math\.max\(1,\s*Math\.floor\(\(availableHeight\s*\+\s*0\.0001\)\s*\/\s*safeLineStep\)\)/)
  assert.match(source, /const\s+getLineCapacityForHeight\s*=\s*\(availableHeight:\s*number,\s*lineStep:\s*number,\s*firstLineHeight:\s*number\)\s*=>/)
  assert.match(source, /const\s+getReflowLineCapacityForHeight\s*=\s*\(availableHeight:\s*number,\s*lineStep:\s*number\)\s*=>/)
  assert.match(source, /const\s+buildReflowRowLayouts\s*=\s*\([\s\S]*?rowStart:\s*number,[\s\S]*?rowSpan:\s*number,[\s\S]*?heightBaselines:\s*number,[\s\S]*?lineStep:\s*number,/)
  assert.match(source, /const\s+getReflowColumnLineCapacity\s*=\s*\(rowLayouts:\s*readonly\s+ReflowRowLayout\[\]\)\s*=>/)
  assert.match(source, /const\s+getReflowLineSlotYOffset\s*=\s*\([\s\S]*?rowLayouts:\s*readonly\s+ReflowRowLayout\[\],[\s\S]*?lineIndexWithinColumn:\s*number,[\s\S]*?lineStep:\s*number,/)
  assert.match(source, /const\s+reflowRowLayouts\s*=\s*buildReflowRowLayouts\(startRow,\s*rowSpan,\s*heightBaselines,\s*lineStep\)/)
  assert.match(source, /const\s+maxLinesPerColumn\s*=\s*Math\.max\(1,\s*columnReflow[\s\S]*?\?\s*getReflowColumnLineCapacity\(reflowRowLayouts\)[\s\S]*?:\s*getLineCapacityForHeight\(moduleHeightForBlock,\s*lineStep,\s*firstLineHeight\)\)/)
  assert.match(source, /const\s+lineIndexWithinColumn\s*=\s*lineIndex\s*%\s*maxLinesPerColumn/)
  assert.match(source, /const\s+lineSlotYOffset\s*=\s*getReflowLineSlotYOffset\(reflowRowLayouts,\s*lineIndexWithinColumn,\s*lineStep\)/)
  assert.match(source, /const\s+lineTopY\s*=\s*origin\.y\s*\+\s*baselineStep\s*\+\s*verticalStartOffset\s*\+\s*lineSlotYOffset/)
  assert.match(source, /reflowRowLayouts\.map\(\(rowLayout\)\s*=>\s*\(\{\s*x:\s*origin\.x\s*\+\s*getColumnOffset\(startCol,\s*columnIndex\),[\s\S]*?y:\s*origin\.y\s*\+\s*baselineStep\s*\+\s*rowLayout\.yOffset,/)
})

test("typography layout only reports overflow for newspaper reflow", () => {
  const source = readText("lib/typography-layout-plan.ts")
  assert.match(source, /const\s+visibleLineCount\s*=\s*columnReflow\s*\?\s*Math\.min\(lines\.length,\s*maxLinesPerColumn\)\s*:\s*lines\.length/)
  assert.match(source, /const\s+overflowLines\s*=\s*columnReflow\s*\?\s*Math\.max\(0,\s*lines\.length\s*-\s*commands\.length\)\s*:\s*0/)
  assert.match(source, /const\s+visibleCaptionLineCount\s*=\s*captionReflowEnabled\s*\?\s*Math\.min\(captionLines\.length,\s*captionMaxLinesPerColumn\)\s*:\s*captionLines\.length/)
  assert.match(source, /const\s+captionOverflowLines\s*=\s*captionReflowEnabled\s*\?\s*Math\.max\(0,\s*captionLines\.length\s*-\s*captionCommands\.length\)\s*:\s*0/)
})

test("page export plan only emits a page outline when guide layers are visible", () => {
  const source = readText("lib/page-export-plan.ts")
  assert.match(source, /const\s+showPageOutline\s*=\s*showMargins\s*\|\|\s*showModules\s*\|\|\s*showBaselines/)
  assert.match(source, /const\s+pageOutline\s*=\s*showPageOutline/)
})

test("page export plan resolves paragraph and inline text colors through the text-scheme fallback, not the image placeholder fallback", () => {
  const source = readText("lib/page-export-plan.ts")
  assert.match(source, /getDefaultTextSchemeColor/)
  assert.match(source, /resolveTextSchemeColor/)
  assert.match(source, /const\s+defaultTextColor\s*=\s*getDefaultTextSchemeColor\(imageColorScheme\)/)
  assert.match(source, /const\s+resolveExportTextColor\s*=\s*\(value:\s*unknown\)\s*=>\s*resolveTextSchemeColor\(value,\s*imageColorScheme\)/)
  assert.match(source, /const\s+resolvedTextColor\s*=\s*resolveExportTextColor\(blockTextColors\[key\]\s*\?\?\s*defaultTextColor\)/)
  assert.match(source, /const\s+exportFormatRuns\s*=\s*getExportFormatRunsForScheme\(\s*blockTextFormatRuns\[key\],\s*imageColorScheme,\s*resolveExportTextColor,\s*\)/)
})

test("pdf export consumes the shared page export plan instead of rebuilding layout inline", () => {
  const source = readText("lib/pdf-vector-export.ts")
  const plannedSource = readText("lib/planned-page-export-source.ts")
  assert.match(source, /import\s+\{\s*buildPageExportPlan,[\s\S]*?\}\s+from\s+"@\/lib\/page-export-plan"/)
  assert.match(source, /exportPlan\?:\s*PageExportPlan/)
  assert.match(source, /exportPlan:\s*providedExportPlan/)
  assert.match(source, /const\s+exportPlan\s*=\s*providedExportPlan\s*\?\?\s*buildPageExportPlan\(\{[\s\S]*?showBaselines,[\s\S]*?showModules,[\s\S]*?showMargins,[\s\S]*?showImagePlaceholders,[\s\S]*?showTypography,/)
  assert.match(plannedSource, /export\s+type\s+PlannedProjectPageExportSource\s*=\s*ResolvedProjectPageExportSource\s*&\s*\{[\s\S]*?exportPlan:\s*PageExportPlan/)
  assert.match(plannedSource, /exportPlan:\s*buildPageExportPlan\(\{[\s\S]*?source\.uiSettings\.showTypography/)
  assert.doesNotMatch(source, /monochromeGuides/)
})

test("pdf bleed paints the canvas background beyond the trim box", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /import\s+\{[\s\S]*?getExportGuideClipRect,[\s\S]*?type\s+ExportBox[\s\S]*?\}\s+from\s+"@\/lib\/export-box"/)
  assert.match(source, /exportBox:\s*ExportBox/)
  assert.match(source, /const\s+exportCanvasMarginPt\s*=\s*exportBox\.exportCanvasMarginPt/)
  assert.match(source, /setFillColor\(pdf,\s*\{\s*r:\s*255,\s*g:\s*255,\s*b:\s*255\s*\}\)[\s\S]*?pdf\.rect\(0,\s*0,\s*pageWidth,\s*pageHeight,\s*"F"\)/)
  assert.match(source, /const\s+backgroundRect\s*=\s*exportBox\.bleed[\s\S]*?pdf\.rect\(\s*originX\s*\+\s*backgroundRect\.x\s*\*\s*scale,[\s\S]*?originY\s*\+\s*backgroundRect\.y\s*\*\s*scale,[\s\S]*?backgroundRect\.width\s*\*\s*scale,[\s\S]*?backgroundRect\.height\s*\*\s*scale,[\s\S]*?"F"/)
  assert.doesNotMatch(source, /drawRectOutline\(-bleedPt,\s*-bleedPt,\s*sourceWidth\s*\+\s*bleedPt\s*\*\s*2,\s*sourceHeight\s*\+\s*bleedPt\s*\*\s*2\)/)
  assert.match(source, /if\s*\(exportBox\.cropMarkLines\.length\s*>\s*0\)\s*\{[\s\S]*?setDrawColor\(pdf,\s*\{\s*r:\s*20,\s*g:\s*20,\s*b:\s*20\s*\}\)[\s\S]*?for\s*\(const\s+line\s+of\s+exportBox\.cropMarkLines\)[\s\S]*?drawLine\(line\.x1,\s*line\.y1,\s*line\.x2,\s*line\.y2\)/)
})

test("pdf export keeps text rotation direction aligned with canvas preview", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(
    source,
    /pdf\.text\(line,\s*point\.x,\s*point\.y,\s*\{[\s\S]*?angle:\s*rotation\s*\+\s*blockRotation,[\s\S]*?rotationDirection:\s*0,[\s\S]*?\}\)/,
  )
})

test("pdf export rotates text anchors around paragraph origin before page transform", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(
    source,
    /const\s+rotated\s*=\s*rotatePointAround\(x,\s*y,\s*rotationOrigin\.x,\s*rotationOrigin\.y,\s*blockRotation\)/,
  )
})

test("pdf export wraps guide groups into form objects and clips production guides to the bleed box", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /type\s+PdfWithFormObjects\s*=\s*jsPDF\s*&/)
  assert.match(source, /function\s+buildGuideFormObjectKey\(\s*guideGroup:\s*PageExportGuideGroup,\s*transformFingerprint:\s*string,/)
  assert.match(source, /const\s+drawGuideGroup\s*=\s*\(key:\s*string,\s*draw:\s*\(\)\s*=>\s*void\)/)
  assert.match(source, /beginFormObject\(0,\s*0,\s*pageWidth,\s*pageHeight,\s*identityMatrix\)/)
  assert.match(source, /endFormObject\(key\)/)
  assert.match(source, /doFormObject\(key,\s*identityMatrix\)/)
  assert.match(source, /for\s*\(const\s+guideGroup\s+of\s+exportPlan\.guideGroups\)/)
  assert.match(source, /drawGuideGroup\(buildGuideFormObjectKey\(guideGroup,\s*guideTransformFingerprint\),\s*\(\)\s*=>\s*\{/)
  assert.match(source, /const\s+guideClipRect\s*=\s*getExportGuideClipRect\(exportBox,\s*guideGroup\.clipToPage\)/)
  assert.match(source, /if\s*\(guideClipRect\)\s*\{[\s\S]*?originX\s*\+\s*guideClipRect\.x\s*\*\s*scale,[\s\S]*?originY\s*\+\s*guideClipRect\.y\s*\*\s*scale,[\s\S]*?guideClipRect\.width\s*\*\s*scale,[\s\S]*?guideClipRect\.height\s*\*\s*scale,[\s\S]*?null/)
})

test("pdf guide form object cache keys include geometry so rhythm pages cannot reuse another page grid", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /hash\s*=\s*appendHashText\(hash,\s*guideGroup\.id\)/)
  assert.match(source, /hash\s*=\s*appendHashText\(hash,\s*transformFingerprint\)/)
  assert.match(source, /for\s*\(const\s+rect\s+of\s+guideGroup\.rects\)\s*\{[\s\S]*?formatCacheNumber\(rect\.x\)[\s\S]*?formatCacheNumber\(rect\.height\)/)
  assert.match(source, /for\s*\(const\s+line\s+of\s+guideGroup\.lines\)\s*\{[\s\S]*?formatCacheNumber\(line\.x1\)[\s\S]*?formatCacheNumber\(line\.y2\)/)
  assert.doesNotMatch(source, /drawGuideGroup\(`swiss_guides_\$\{guideGroup\.id\}`/)
})

test("pdf export uses the shared ordered layer list for placeholders and text", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+imagePlans\s*=\s*new\s+Map\(exportPlan\.imagePlans\.map/)
  assert.match(source, /const\s+textPlans\s*=\s*new\s+Map\(exportPlan\.textPlans\.map/)
  assert.match(source, /for\s*\(const\s+key\s+of\s+exportPlan\.orderedLayerKeys\)/)
})

test("pdf export applies tracking through charSpace instead of horizontal scaling", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /pdf\.text\(line,\s*point\.x,\s*point\.y,\s*\{[\s\S]*?charSpace:\s*getTrackingLetterSpacing\(fontSize\s*\*\s*scale,\s*trackingScale\)[\s\S]*?\}\)/)
})

test("vector text outlines use pre-positioned tracking segments with explicit left anchors", () => {
  const source = readText("lib/vector-text-outline.ts")
  assert.match(source, /if\s*\(textPlan\.graphemeLines\.length\s*>\s*0\)/)
  assert.match(source, /for\s*\(const\s+graphemes\s+of\s+textPlan\.graphemeLines\)/)
  assert.match(source, /text:\s*grapheme\.text,[\s\S]*?x:\s*grapheme\.x,[\s\S]*?y:\s*grapheme\.y,/)
  assert.match(source, /trackingScale:\s*0/)
  assert.match(source, /for\s*\(const\s+segments\s+of\s+textPlan\.segmentLines\)/)
})

test("pdf export isolates placeholder opacity from later live text fills", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+drawImagePlan\s*=\s*\(imagePlan:[\s\S]*?\)\s*=>\s*\{[\s\S]*?pdf\.saveGraphicsState\(\)/)
  assert.match(source, /try\s*\{[\s\S]*?setPdfOpacity\(imagePlan\.opacity\)[\s\S]*?drawFilledRect/)
  assert.match(source, /finally\s*\{[\s\S]*?pdf\.restoreGraphicsState\(\)/)
  assert.match(source, /const\s+rotationOrigin\s*=\s*\{\s*x:\s*plan\.rotationOriginX,\s*y:\s*plan\.rotationOriginY\s*\}[\s\S]*?pdf\.saveGraphicsState\(\)[\s\S]*?setPdfOpacity\(1\)[\s\S]*?setTextColor\(pdf,[\s\S]*?finally\s*\{[\s\S]*?pdf\.restoreGraphicsState\(\)/)
})

test("pdf export uses positioned live text segments instead of a second glyph-outline renderer", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /if\s*\(plan\.graphemeLines\.length\s*>\s*0\)/)
  assert.match(source, /for\s*\(const\s+graphemes\s+of\s+plan\.graphemeLines\)/)
  assert.match(source, /drawText\(\s*grapheme\.text,\s*grapheme\.x,\s*grapheme\.y,\s*"left",\s*0,/)
  assert.match(source, /for\s*\(const\s+segments\s+of\s+plan\.segmentLines\)/)
  assert.match(source, /drawText\(\s*segment\.text,\s*segment\.x,\s*segment\.y,\s*"left",\s*segment\.trackingScale,/)
  assert.doesNotMatch(source, /resolveTextPlanVectorShapes\(plan\)/)
  assert.doesNotMatch(source, /pdf\.path\(path,\s*"F"\)/)
})

test("pdf export action forwards placeholder visibility and active image color scheme", () => {
  const source = readText("lib/export-engine.ts")
  assert.match(source, /renderSwissGridVectorPdf\(\{[\s\S]*?imageColorScheme:\s*page\.imageColorScheme,[\s\S]*?canvasBackground:\s*page\.resolvedCanvasBackground,[\s\S]*?showImagePlaceholders:\s*page\.uiSettings\.showImagePlaceholders,[\s\S]*?showTypography:\s*page\.uiSettings\.showTypography,/)
  assert.match(source, /exportPlan:\s*page\.exportPlan/)
})

test("browser pdf export runs in a cancellable worker", () => {
  const source = readText("hooks/useExportActions.ts")
  const workerSource = readText("workers/pdf-export.worker.ts")
  assert.match(source, /new Worker\(new URL\("\.\.\/workers\/pdf-export\.worker\.ts",\s*import\.meta\.url\),\s*\{\s*type:\s*"module"\s*\}\)/)
  assert.match(source, /currentExportWorkerRef\.current\?\.terminate\(\)/)
  assert.match(source, /currentExportRejectRef\.current\?\.\(new ExportCancelledError\(\)\)/)
  assert.match(workerSource, /formats:\s*\["pdf"\]/)
  assert.match(workerSource, /onProgress:\s*\(progress\)\s*=>/)
  assert.match(workerSource, /type:\s*"progress"/)
  assert.match(workerSource, /type:\s*"done"/)
})

test("pdf export registers inline format-run fonts before rendering text", () => {
  const source = readText("lib/export-engine.ts")
  assert.match(source, /function\s+collectPdfFontFaces\(pages:\s*readonly\s+ResolvedProjectPageExportSource\[\]\):\s*PdfFontRegistrationFace\[\]/)
  assert.match(source, /layout\.blockTextFormatRuns\?\.\[key\]\?\.forEach/)
  assert.match(source, /isFontFamily\(run\.fontFamily\)/)
  assert.match(source, /const\s+pdfFontFaces\s*=\s*collectPdfFontFaces\(plannedPages\)/)
  assert.match(source, /ensurePdfFontFacesRegistered\(pdf,\s*pdfFontFaces\)/)
})

test("canvas preview loads inline format-run fonts before measuring text", () => {
  const previewSource = readText("components/grid-preview.tsx")
  const metricsSource = readText("hooks/usePreviewTypographyMetrics.ts")
  assert.match(previewSource, /usePreviewTypographyMetrics<BlockId,\s*TypographyStyleKey>\(\{[\s\S]*?getBlockTextColor,[\s\S]*?getBlockTextFormatRuns,/)
  assert.match(metricsSource, /getBlockTextFormatRuns:\s*\(key:\s*Key,\s*color:\s*string\)\s*=>\s*TextFormatRun<StyleKey,\s*FontFamily>\[\]/)
  assert.match(metricsSource, /textFormatRuns:\s*getBlockTextFormatRuns\(key,\s*textColor\)/)
  assert.match(metricsSource, /collectBrowserFontLoadSpecs\(fontBlocks\)/)
  assert.match(metricsSource, /collectFontFileMetricFacesFromBlocks\(fontBlocks\)/)
})

test("pdf font registry requires verified local assets instead of runtime remote discovery", () => {
  const source = readText("lib/pdf-font-registry.ts")
  const packageSource = readText("package.json")
  assert.match(source, /Failed to load required font asset/)
  assert.match(source, /preloadPdfFontFaces/)
  assert.match(source, /getPdfEmbeddedWeightFamilyName/)
  assert.doesNotMatch(source, /fontEntry\.fontName\s*=/)
  assert.doesNotMatch(source, /applyPdfPostScriptFontName/)
  assert.doesNotMatch(source, /api\.github\.com|raw\.githubusercontent\.com|discoverGoogleRepoVariableSources/)
  assert.match(packageSource, /"fonts:verify":\s*"node --import \.\/scripts\/register-ts-alias-loader\.mjs scripts\/verify-font-assets\.mjs"/)
  assert.match(packageSource, /"assets:generate":[\s\S]*npm run fonts:verify/)
})

test("pdf export uses the RGB setters required by the shared sRGB export path", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /function\s+setDrawColor\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /function\s+setTextColor\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /function\s+setFillColor\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /pdf\.setDrawColor\(color\.r,\s*color\.g,\s*color\.b\)/)
  assert.match(source, /pdf\.setTextColor\(color\.r,\s*color\.g,\s*color\.b\)/)
  assert.match(source, /pdf\.setFillColor\(color\.r,\s*color\.g,\s*color\.b\)/)
  assert.doesNotMatch(source, /PdfExportColorMode|rgbToCmyk|setDrawColorCmyk|setTextColorCmyk|setFillColorCmyk/)
})

test("pdf export constructs real jsPDF graphics-state instances before registering opacity states", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /type\s+PdfGraphicsStateParameters\s*=\s*\{\s*opacity\?:\s*number;\s*"stroke-opacity"\?:\s*number\s*\}/)
  assert.match(source, /type\s+PdfGraphicsStateConstructor\s*=\s*new\s*\(parameters:\s*PdfGraphicsStateParameters\)\s*=>\s*PdfGraphicsState/)
  assert.match(source, /typeof\s+opacityPdf\.GState\s*!==\s*"function"/)
  assert.match(source, /const\s+gState\s*=\s*new\s+opacityPdf\.GState\(\{\s*[\s\S]*?opacity:\s*normalizedOpacity,[\s\S]*?"stroke-opacity":\s*1,[\s\S]*?\}\)/)
  assert.match(source, /opacityPdf\.addGState\(key,\s*gState\)/)
  assert.match(source, /opacityPdf\.setGState\(key\)/)
})

test("pdf export attaches an embedded output intent profile for vector exports", () => {
  const source = readText("lib/pdf-output-intent.ts")
  assert.match(source, /putResources/)
  assert.match(source, /postPutResources/)
  assert.match(source, /putCatalog/)
  assert.match(source, /key:\s*"N",\s*value:\s*current\.profile\.channels/)
  assert.match(source, /key:\s*"Alternate",\s*value:\s*current\.profile\.alternateDevice/)
  assert.match(source, /\/OutputIntents\s*\[<</)
  assert.match(source, /\/DestOutputProfile\s+\$\{current\.profileObjectId\}\s+0\s+R/)
  assert.match(source, /\/S\s+\/GTS_PDFX/)
  assert.match(source, /srgb-iec61966-2-1\.icc/)
  assert.doesNotMatch(source, /coated-fogra39\.icc|DeviceCMYK|FOGRA39/)
})

test("pdf output intent does not inject color spaces into the XObject dictionary", () => {
  const source = readText("lib/pdf-output-intent.ts")
  assert.doesNotMatch(source, /putXobjectDict/)
  assert.doesNotMatch(source, /\/DefaultRGB|\/DefaultCMYK/)
})

test("vector export options expose one shared bleed setting and keep pdf color management deterministic", () => {
  const hookSource = readText("hooks/useExportActions.ts")
  const engineSource = readText("lib/export-engine.ts")
  const optionsSource = readText("lib/export-format-options.ts")
  assert.match(optionsSource, /export\s+type\s+ExportBleedOptions\s*=\s*\{[\s\S]*enabled:\s*boolean[\s\S]*widthMm:\s*number/)
  assert.match(optionsSource, /pdf:\s*\{[\s\S]*supportsBleed:\s*true/)
  assert.match(optionsSource, /svg:\s*\{[\s\S]*supportsBleed:\s*true/)
  assert.match(optionsSource, /idml:\s*\{[\s\S]*supportsBleed:\s*true/)
  assert.match(hookSource, /const\s+\[bleedEnabledDraft,\s*setBleedEnabledDraft\]/)
  assert.match(hookSource, /normalizeExportBleedOptions\(\{[\s\S]*enabled:\s*supportsExportBleed\(exportFormatDraft\)\s*&&\s*bleedEnabledDraft/)
  assert.match(engineSource, /function\s+resolvePdfExportColorManagement\(\):\s*\{[\s\S]*outputIntentProfileId:\s*PdfOutputIntentProfileId[\s\S]*return\s*\{[\s\S]*outputIntentProfileId:\s*"srgb"/)
  assert.doesNotMatch(hookSource, /PRINT_PRESETS|EXPORT_DIALOG_PRINT_PRESETS|offset_final|press_proof|digital_print/)
})

test("export dialog exposes shared bleed controls instead of print presets", () => {
  const source = readText("components/dialogs/ExportDialog.tsx")
  assert.match(source, /SectionHeaderRow[\s\S]*Bleed/)
  assert.match(source, /Bleed Width/)
  assert.match(source, /bleedEnabledDraft/)
  assert.match(source, /onBleedEnabledChange/)
  assert.doesNotMatch(source, /Print Pro/)
  assert.doesNotMatch(source, /Print Presets/)
  assert.doesNotMatch(source, /EXPORT_DIALOG_PRINT_PRESETS/)
  assert.doesNotMatch(source, /Registration-Style Marks/)
  assert.doesNotMatch(source, /onExportPrintProChange/)
})

test("export dialog stays dark-mode-safe after removing size override controls", () => {
  const source = readText("components/dialogs/ExportDialog.tsx")
  assert.match(source, /isDarkUi:\s*boolean/)
  assert.match(source, /getPopupSurfaceClassName/)
  assert.match(source, /getPopupInputClassName/)
  assert.match(source, /getPopupMutedTextClassName/)
  assert.match(source, /isDarkUi \? "bg-\[#313A47\]" : "bg-gray-300"/)
  assert.doesNotMatch(source, /Units \/ Paper Size/)
  assert.doesNotMatch(source, /Height will follow the selected aspect ratio automatically\./)
})

test("default vector bleed starts disabled but keeps 3mm as the activation width", () => {
  const source = readText("lib/config/ui-defaults.ts")
  const optionsSource = readText("lib/export-format-options.ts")
  assert.doesNotMatch(source, /default_v001\.json/)
  assert.match(optionsSource, /DEFAULT_EXPORT_BLEED_OPTIONS:\s*ExportBleedOptions\s*=\s*\{[\s\S]*enabled:\s*false,[\s\S]*widthMm:\s*3/)
  assert.doesNotMatch(source, /exportPrintPro|exportBleedMm|exportRegistrationMarks/)
  assert.doesNotMatch(source, /exportFinalSafeGuides/)
})
