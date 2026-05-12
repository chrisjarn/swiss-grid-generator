import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const QUICK_START_PRESET_PATH = "./data/000-quick-start-video-001.json"
const QUICK_START_VIDEO_ID = "quick-start-video-001"

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

function readManifestEntries() {
  const manifestSource = readText("lib/presets/generated-manifest.ts")
  return Array.from(
    manifestSource.matchAll(/path: "([^"]+)",\n\s+sourceJson: "((?:\\.|[^"\\])*)"/g),
    (match) => ({
      path: match[1],
      sourceJson: JSON.parse(`"${match[2]}"`),
    }),
  )
}

function readOnboardingVideoConfigSource() {
  return readText("lib/onboarding/videos.ts")
}

test("quick-start video preset is bundled and resolved through the onboarding registry", () => {
  const manifestEntry = readManifestEntries().find((entry) => entry.path === QUICK_START_PRESET_PATH)
  const registrySource = readOnboardingVideoConfigSource()
  const presetIndexSource = readText("lib/presets/index.ts")
  const presetTypesSource = readText("lib/presets/types.ts")

  assert.ok(manifestEntry, "Expected quick-start video preset to be present in the generated manifest")
  assert.equal(JSON.parse(manifestEntry.sourceJson).title, "quick start video 001")
  assert.match(registrySource, new RegExp(`${QUICK_START_PRESET_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}": "${QUICK_START_VIDEO_ID}"`))
  assert.match(presetIndexSource, /onboardingVideoId:\s*resolveOnboardingVideoIdForPresetPath\(sourcePath\)/)
  assert.match(presetTypesSource, /onboardingVideoId\?:\s*OnboardingVideoId/)
})

test("quick-start onboarding video config uses public WebM, MP4, and poster assets", () => {
  const registrySource = readOnboardingVideoConfigSource()
  const expectedAssets = [
    "/onboarding/quick-start-video-001.webm",
    "/onboarding/quick-start-video-001.mp4",
    "/onboarding/quick-start-video-001-poster.jpg",
  ]

  assert.match(registrySource, new RegExp(`id: "${QUICK_START_VIDEO_ID}"`))
  assert.match(registrySource, /type: "video\/webm"/)
  assert.match(registrySource, /type: "video\/mp4"/)

  for (const asset of expectedAssets) {
    assert.match(registrySource, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    assert.ok(fs.existsSync(path.join(ROOT, "public", asset)), `${asset} should exist under webapp/public`)
  }
})

test("onboarding video frame contains the full video inside the viewport", () => {
  const dialogSource = readText("gui/dialogs/OnboardingVideoDialog.tsx")

  assert.match(dialogSource, /bg-\[#f3f4f6\]/)
  assert.match(dialogSource, /object-contain/)
  assert.match(dialogSource, /max-h-full/)
  assert.match(dialogSource, /max-w-full/)
  assert.doesNotMatch(dialogSource, /object-cover/)
})

test("onboarding preset opens video directly without loading the layout first", () => {
  const shellSource = readText("gui/shell/useShellModel.tsx")
  const handlerStart = shellSource.indexOf("const handleLoadBrowserPreset = useCallback((preset: LayoutPreset) => {")
  const handlerEnd = shellSource.indexOf("const handleDeleteBrowserPreset", handlerStart)
  const handlerSource = shellSource.slice(handlerStart, handlerEnd)

  assert.match(handlerSource, /if \(preset\.onboardingVideoId\) \{\s*setActiveOnboardingVideoId\(preset\.onboardingVideoId\)\s*return\s*\}/)
  assert.ok(
    handlerSource.indexOf("if (preset.onboardingVideoId)") < handlerSource.indexOf("beginProjectLoadTiming()"),
    "onboarding video should be handled before project loading begins",
  )
})

test("preset browser activates layouts on single click", () => {
  const presetPanelSource = readText("gui/panels/sidebar/PresetLayoutsPanel.tsx")

  assert.match(presetPanelSource, /onClick=\{\(\) => onLoadPreset\(preset\)\}/)
  assert.match(presetPanelSource, /data-preset-id=\{preset\.id\}/)
  assert.doesNotMatch(presetPanelSource, /onDoubleClick=\{\(\) => onLoadPreset\(preset\)\}/)
})

test("onboarding video remains outside export engines and PageExportPlan code", () => {
  const exportSurfaceFiles = [
    "core/export/planned-page-export-source.ts",
    "core/export/project-page-export-source.ts",
    "core/layout/page-export-plan.ts",
    "core/layout/page-export-plan-types.ts",
    "lib/export-engine.ts",
    "lib/project-export-runner.ts",
    "lib/pdf-vector-export.ts",
    "lib/svg-vector-export.ts",
    "lib/svg-page-set-export.ts",
    "lib/idml-export.ts",
    "lib/idml/builder.ts",
  ]
  const violations = exportSurfaceFiles.filter((relPath) => /onboarding|video/i.test(readText(relPath)))

  assert.deepEqual(violations, [])
})
