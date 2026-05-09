import { generateSwissGrid } from "../../lib/grid-calculator.ts"

const BASE_BLOCKS = ["display", "headline", "subhead", "body", "caption"]
const STYLE_SEQUENCE = ["display", "headline", "body", "body", "caption"]
const ALIGN_SEQUENCE = ["left", "left", "left", "justify", "left"]

function paragraph(seed, blockIndex) {
  const fragments = [
    "Typographic systems should preserve measure, interval, baseline, and hierarchy across every export surface.",
    "A page plan is useful only when the canvas, vector export, and editing geometry consume the same resolved commands.",
    "Swiss editorial composition depends on repeatable columns, disciplined whitespace, and deliberate optical alignment.",
    "Placeholder geometry and text frames must remain stable during drag previews, thumbnail rendering, and document export.",
  ]
  return Array.from({ length: 2 + ((seed + blockIndex) % 3) }, (_, index) => (
    fragments[(seed + blockIndex + index) % fragments.length]
  )).join(" ")
}

export function createStressGridResult(pageIndex = 0) {
  return generateSwissGrid({
    format: pageIndex % 3 === 0 ? "A4" : pageIndex % 3 === 1 ? "LETTER" : "A5",
    orientation: pageIndex % 4 === 0 ? "landscape" : "portrait",
    marginMethod: ((pageIndex % 3) + 1),
    gridCols: 8 + (pageIndex % 3),
    gridRows: 10 + (pageIndex % 4),
    baseline: 10 + (pageIndex % 3),
    gutterMultiple: pageIndex % 2 === 0 ? 1 : 0.5,
    rhythm: "modular",
    rhythmRowsEnabled: true,
    rhythmColsEnabled: true,
    typographyScale: pageIndex % 2 === 0 ? "swiss" : "fibonacci",
  })
}

export function createStressPreviewLayout(pageIndex = 0, extraBlockCount = 12, imageCount = 6) {
  const extraBlocks = Array.from({ length: extraBlockCount }, (_, index) => `analysis_${index + 1}`)
  const blockOrder = [...BASE_BLOCKS, ...extraBlocks]
  const imageOrder = Array.from({ length: imageCount }, (_, index) => `image_${index + 1}`)
  const textContent = {}
  const blockTextEdited = {}
  const styleAssignments = {}
  const blockColumnSpans = {}
  const blockRowSpans = {}
  const blockHeightBaselines = {}
  const blockTextAlignments = {}
  const blockVerticalAlignments = {}
  const blockTextReflow = {}
  const blockSyllableDivision = {}
  const blockSnapToColumns = {}
  const blockModulePositions = {}
  const blockFontWeights = {}
  const blockTrackingScales = {}
  const blockOpticalKerning = {}

  blockOrder.forEach((key, index) => {
    const baseIndex = BASE_BLOCKS.indexOf(key)
    const style = baseIndex >= 0 ? STYLE_SEQUENCE[baseIndex] : index % 5 === 0 ? "headline" : "body"
    textContent[key] = paragraph(pageIndex, index)
    blockTextEdited[key] = true
    styleAssignments[key] = style
    blockColumnSpans[key] = key === "display" ? 4 : 2 + ((pageIndex + index) % 4)
    blockRowSpans[key] = key === "caption" ? 1 : 2 + ((pageIndex + index) % 3)
    blockHeightBaselines[key] = key === "caption" ? 3 : 4 + ((pageIndex + index) % 8)
    blockTextAlignments[key] = baseIndex >= 0 ? ALIGN_SEQUENCE[baseIndex] : index % 4 === 0 ? "justify" : "left"
    blockVerticalAlignments[key] = index % 5 === 0 ? "center" : "top"
    blockTextReflow[key] = index % 3 === 0
    blockSyllableDivision[key] = index % 2 === 0
    blockSnapToColumns[key] = true
    blockModulePositions[key] = {
      col: (pageIndex + index * 2) % 7,
      row: 1 + ((pageIndex * 3 + index * 4) % 28),
    }
    blockFontWeights[key] = style === "headline" || style === "display" ? 700 : 400
    blockTrackingScales[key] = index % 4 === 0 ? 1.08 : 1
    blockOpticalKerning[key] = true
  })

  const imageModulePositions = {}
  const imageColumnSpans = {}
  const imageHeightBaselines = {}
  const imageSnapToColumns = {}
  const imageSnapToBaseline = {}
  const imageRotations = {}
  const imageColors = {}
  const imageOpacities = {}

  imageOrder.forEach((key, index) => {
    imageModulePositions[key] = {
      col: (pageIndex + index * 3) % 7,
      row: 2 + ((pageIndex + index * 5) % 26),
    }
    imageColumnSpans[key] = 1 + ((pageIndex + index) % 3)
    imageHeightBaselines[key] = 4 + ((pageIndex + index) % 9)
    imageSnapToColumns[key] = true
    imageSnapToBaseline[key] = true
    imageRotations[key] = index % 3 === 0 ? 0 : (index % 2 === 0 ? 4 : -4)
    imageColors[key] = `scheme:${index % 4}`
    imageOpacities[key] = 0.35 + (index % 3) * 0.2
  })

  return {
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockFontWeights,
    blockOpticalKerning,
    blockTrackingScales,
    blockColumnSpans,
    blockRowSpans,
    blockHeightBaselines,
    blockTextAlignments,
    blockVerticalAlignments,
    blockTextReflow,
    blockSyllableDivision,
    blockSnapToColumns,
    blockModulePositions,
    layerOrder: [...imageOrder, ...blockOrder],
    imageOrder,
    imageModulePositions,
    imageColumnSpans,
    imageHeightBaselines,
    imageSnapToColumns,
    imageSnapToBaseline,
    imageRotations,
    imageColors,
    imageOpacities,
  }
}

export function createStressPagePlanArgs(pageIndex = 0) {
  return {
    result: createStressGridResult(pageIndex),
    layout: createStressPreviewLayout(pageIndex),
    imageColorScheme: "swiss-modern",
    canvasBackground: pageIndex % 2 === 0 ? null : "scheme:1",
    rotation: pageIndex % 5 === 0 ? -7.5 : pageIndex % 5 === 1 ? 5 : 0,
    showBaselines: true,
    showModules: true,
    showMargins: true,
    showImagePlaceholders: true,
    showTypography: true,
  }
}
