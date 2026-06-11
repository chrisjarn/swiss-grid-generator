// One-off builder for the ibis × Chelsea capacity template preset.
// Emits a schemaVersion:2 project into lib/presets/data/. Run: node scripts/build-ibis-template.mjs
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "lib", "presets", "data", "030 ibis Chelsea Capacity 16x9.json")

const seating = [
  ["theatre", "Theatre"],
  ["classroom", "Classroom"],
  ["boardroom", "Boardroom"],
  ["ushape", "U-Shape"],
  ["cocktail", "Cocktail"],
  ["cabaret", "Cabaret"],
  ["banquet", "Banquet"],
]

// --- text blocks ---
const blockOrder = []
const textContent = {}
const styleAssignments = {}
const blockModulePositions = {}
const blockColumnSpans = {}
const blockTextAlignments = {}
const blockItalic = {}

function text(key, content, style, column, row, colspan, align = "left") {
  blockOrder.push(key)
  textContent[key] = content
  styleAssignments[key] = style
  blockModulePositions[key] = { column, row, baselineOffset: 0 }
  blockColumnSpans[key] = colspan
  blockTextAlignments[key] = align
}

text("cobrand", "Chelsea", "subhead", 1, 0, 4)
text("heading", "Room Dimensions & Capacity", "headline", 0, 1, 8)
text(
  "deck",
  "Five flexible spaces, from the 97 sqm Charles Room to the 280 sqm Edward Room, configured across six set-up styles for up to 200 delegates.",
  "body",
  0,
  3,
  6,
)
// icon labels (centered under each icon)
seating.forEach(([id, label], i) => {
  text(`label-${id}`, label, "caption", i, 6, 1, "center")
  blockItalic[`label-${id}`] = false // caption style is italic by default; icon labels read better upright
})

// --- image blocks (logo + seating icons + photo field) ---
const imageOrder = []
const imageModulePositions = {}
const imageColumnSpans = {}
const imageRowSpans = {}
const imageSnapToColumns = {}
const imageSnapToBaseline = {}
const imageColors = {}
const imageOpacities = {}
const imageSources = {}

function image(key, column, row, colspan, rowspan, { src = null, color = "scheme:1", opacity = 1 } = {}) {
  imageOrder.push(key)
  imageModulePositions[key] = { column, row, baselineOffset: 0 }
  imageColumnSpans[key] = colspan
  imageRowSpans[key] = rowspan
  imageSnapToColumns[key] = true
  imageSnapToBaseline[key] = true
  imageColors[key] = color
  imageOpacities[key] = opacity
  if (src) imageSources[key] = src
}

image("logo", 0, 0, 1, 1, { src: "/brands/ibis-logo.svg" })
seating.forEach(([id], i) => {
  image(`icon-${id}`, i, 5, 1, 1, { src: `/icons/seating/${id}.svg` })
})
// venue photo field on the right (grey placeholder until a real photo is dropped in)
image("photo", 8, 0, 4, 8, { color: "scheme:1" })

const previewLayout = {
  blockOrder,
  textContent,
  blockTextEdited: {},
  styleAssignments,
  blockFontFamilies: {},
  blockFontWeights: {},
  blockOpticalKerning: {},
  blockTrackingScales: {},
  blockTrackingRuns: {},
  blockTextFormatRuns: {},
  blockColumnSpans,
  blockRowSpans: {},
  blockHeightBaselines: {},
  blockTextAlignments,
  blockVerticalAlignments: {},
  blockTextReflow: {},
  blockSyllableDivision: {},
  blockSnapToColumns: {},
  blockSnapToBaseline: {},
  blockItalic,
  blockRotations: {},
  blockModulePositions,
  blockCustomSizes: {},
  blockCustomLeadings: {},
  blockTextColors: {},
  lockedLayers: {},
  layerOrder: [],
  imageOrder,
  imageModulePositions,
  imageColumnSpans,
  imageRowSpans,
  imageHeightBaselines: {},
  imageSnapToColumns,
  imageSnapToBaseline,
  imageRotations: {},
  imageColors,
  imageOpacities,
  imageSources,
}

const project = {
  schemaVersion: 2,
  exportedAt: "2026-06-11T00:00:00.000Z",
  title: "ibis × Chelsea — Room Capacity",
  description: "ibis-branded MICE capacity page on a wide 16:9 grid.",
  author: "ibis Conference & Events",
  createdAt: "2026-06-11T00:00:00.000Z",
  visibilitySettings: {
    showBaselines: false,
    showModules: false,
    showMargins: false,
    showImagePlaceholders: true,
    showTypography: true,
  },
  pages: [
    {
      id: "ibis-capacity-1",
      name: "Room Capacity",
      layoutMode: "single",
      uiSettings: {
        canvasRatio: "screen_16_9",
        customRatioWidth: 16,
        customRatioHeight: 9,
        orientation: "landscape",
        rotation: 0,
        marginMethod: 2,
        gridCols: 12,
        gridRows: 8,
        gutterMultiple: 1,
        rhythm: "repetitive",
        rhythmRowsEnabled: true,
        rhythmRowsDirection: "ltr",
        rhythmColsEnabled: true,
        rhythmColsDirection: "ttb",
        typographyScale: "swiss",
        baseFont: "Lato",
        imageColorScheme: "brand-ibis",
        canvasBackground: "scheme:0",
        customBaseline: 12,
        useCustomMargins: true,
        customMarginMultipliers: { top: 1.5, left: 1.5, right: 1.5, bottom: 1.5 },
      },
      previewLayout,
    },
  ],
  layoutEngine: {
    id: "swiss-grid-layout-v2",
    version: 2,
    textMetricsEngine: "font-file-deterministic-optical-margin-v1",
    opticalMarginModel: "font-file-contour-optical-margin-v1",
    verticalTextBoxModel: "cap-top-legacy-descent-0.2em",
    wrapModel: "font-file-width-tracking-optical-v1",
    layerOrderModel: "explicit-layer-order-v1",
  },
}

await fs.writeFile(OUT, JSON.stringify(project, null, 2))
console.log("wrote", OUT)
