import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useEffect, useState } from "react"
import type { ComponentProps } from "react"

import { SwissCanvas } from "@/gui/preview/SwissCanvas"
import type { FontFamily } from "@/core/config/fonts"
import { preloadFontFileMetricFaces } from "@/core/layout/font-file-text-metrics-engine"
import { generateSwissGrid } from "@/core/layout/grid-calculator"
import { buildPageExportPlan } from "@/core/layout/page-export-plan"
import type { PageExportPlan } from "@/core/layout/page-export-plan"
import type { PreviewLayoutState } from "@/core/types/preview-layout"

type StoryStyleKey = "display" | "headline" | "body" | "caption"

const storyLayout: PreviewLayoutState<StoryStyleKey, FontFamily> = {
  blockOrder: ["display", "headline", "body", "caption"],
  textContent: {
    display: "GRID",
    headline: "Canonical page export plan",
    body: "Storybook renders the same planned geometry consumed by canvas, PDF, SVG, IDML, and thumbnails.",
    caption: "Swiss Grid Generator / Storybook",
    image_1: "",
    image_2: "",
  },
  blockTextEdited: {
    display: true,
    headline: true,
    body: true,
    caption: true,
    image_1: false,
    image_2: false,
  },
  styleAssignments: {
    display: "display",
    headline: "headline",
    body: "body",
    caption: "caption",
    image_1: "body",
    image_2: "body",
  },
  blockColumnSpans: {
    display: 3,
    headline: 4,
    body: 3,
    caption: 2,
    image_1: 1,
    image_2: 1,
  },
  blockHeightBaselines: {
    display: 8,
    headline: 6,
    body: 10,
    caption: 2,
    image_1: 4,
    image_2: 4,
  },
  blockTextAlignments: {
    display: "left",
    headline: "left",
    body: "left",
    caption: "left",
    image_1: "left",
    image_2: "left",
  },
  blockVerticalAlignments: {
    display: "top",
    headline: "top",
    body: "top",
    caption: "top",
    image_1: "top",
    image_2: "top",
  },
  blockModulePositions: {
    display: { column: 0, row: 1, baselineOffset: 0 },
    headline: { column: 3, row: 3, baselineOffset: 0 },
    body: { column: 3, row: 7, baselineOffset: 0 },
    caption: { column: 0, row: 11, baselineOffset: 0 },
  },
  blockFontWeights: {
    display: 700,
    headline: 700,
    body: 400,
    caption: 400,
  },
  blockOpticalKerning: {
    display: true,
    headline: true,
    body: true,
    caption: true,
  },
  blockTrackingScales: {
    display: 1.04,
    headline: 1,
    body: 1,
    caption: 1,
  },
  blockSnapToColumns: {
    display: true,
    headline: true,
    body: true,
    caption: true,
  },
  layerOrder: ["image_1", "image_2", "display", "headline", "body", "caption"],
  imageOrder: ["image_1", "image_2"],
  imageModulePositions: {
    image_1: { col: 0, row: 3 },
    image_2: { col: 5, row: 1 },
  },
  imageColumnSpans: {
    image_1: 2,
    image_2: 2,
  },
  imageHeightBaselines: {
    image_1: 8,
    image_2: 14,
  },
  imageSnapToColumns: {
    image_1: true,
    image_2: true,
  },
  imageSnapToBaseline: {
    image_1: true,
    image_2: true,
  },
  imageColors: {
    image_1: "scheme:1",
    image_2: "scheme:3",
  },
  imageOpacities: {
    image_1: 0.42,
    image_2: 0.32,
  },
}

function buildStoryPlan(): PageExportPlan {
  return buildPageExportPlan({
    result: generateSwissGrid({
      format: "A5",
      orientation: "portrait",
      marginMethod: 1,
      gridCols: 6,
      gridRows: 12,
      baseline: 10,
      gutterMultiple: 1,
      rhythm: "repetitive",
      rhythmRowsEnabled: true,
      rhythmColsEnabled: true,
      typographyScale: "swiss",
    }),
    layout: storyLayout,
    imageColorScheme: "swiss-modern",
    canvasBackground: null,
    rotation: 0,
    showBaselines: true,
    showModules: true,
    showMargins: true,
    showImagePlaceholders: true,
    showTypography: true,
  })
}

let metricPreloadPromise: Promise<void> | null = null

function preloadStoryMetrics(): Promise<void> {
  metricPreloadPromise ??= preloadFontFileMetricFaces([
    { fontFamily: "Inter", fontWeight: 400, italic: false },
    { fontFamily: "Inter", fontWeight: 400, italic: true },
    { fontFamily: "Inter", fontWeight: 700, italic: false },
    { fontFamily: "Inter", fontWeight: 700, italic: true },
  ])
  return metricPreloadPromise
}

function PlannedSwissCanvas(args: ComponentProps<typeof SwissCanvas>) {
  const [plan, setPlan] = useState<PageExportPlan | null>(null)

  useEffect(() => {
    let active = true

    preloadStoryMetrics().then(() => {
      if (active) setPlan(buildStoryPlan())
    })

    return () => {
      active = false
    }
  }, [])

  return <SwissCanvas {...args} plan={plan} />
}

const meta = {
  title: "Preview/Swiss Canvas",
  component: SwissCanvas,
  parameters: {
    layout: "centered",
  },
  args: {
    plan: null,
    scale: 0.72,
    showGuides: true,
  },
} satisfies Meta<typeof SwissCanvas>

export default meta

type Story = StoryObj<typeof meta>

export const PlannedPage: Story = {
  render: (args) => <PlannedSwissCanvas {...args} />,
}

export const WithoutGuides: Story = {
  args: {
    showGuides: false,
  },
  render: (args) => <PlannedSwissCanvas {...args} />,
}

export const EmptyPlan: Story = {
  args: {
    plan: null,
  },
}
