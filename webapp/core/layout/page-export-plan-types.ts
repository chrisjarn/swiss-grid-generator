import type { GridResult } from "@/core/layout/grid-calculator"
import type { RgbColor } from "@/core/export/colors"
import type { FontFamily } from "@/core/config/fonts"
import type { ImageColorSchemeId } from "@/core/config/color-schemes"
import type { DocumentVariableContext } from "@/core/document/variable-text"
import type { LayoutEngineContract } from "@/core/layout/layout-engine-contract"
import type { TextMetricsEngineFactory } from "@/core/layout/text-metrics-engine"
import type { TextMetricsService } from "@/core/layout/text-metrics-service"
import type {
  PositionedTextFormatTrackingGrapheme,
  PositionedTextFormatTrackingSegment,
} from "@/core/layout/text-format-runs"
import type { TextTrackingRun } from "@/core/layout/text-tracking-runs"
import type { TextWrapDecisionTrace } from "@/core/layout/text-layout"
import type { TypographyLayoutPlan } from "@/core/layout/typography-layout-plan"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/core/types/preview-layout"

export type TypographyStyleKey = keyof GridResult["typography"]["styles"]
export type BlockId = string
export type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

export type PageExportLine = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type PageExportRect = {
  x: number
  y: number
  width: number
  height: number
}

export type PageExportGuideGroup = {
  id: "margins" | "modules" | "baselines"
  strokeColor: RgbColor
  strokeWidth: number
  dashPattern: number[]
  clipToPage: boolean
  lines: PageExportLine[]
  rects: PageExportRect[]
}

export type PageExportImagePlan = PageExportRect & {
  key: BlockId
  fillColor: RgbColor
  opacity: number
  rotation: number
  rotationOriginX: number
  rotationOriginY: number
}

export type PageExportTextPlan = TypographyLayoutPlan<BlockId, TypographyStyleKey> & {
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  leading: number
  trackingScale: number
  trackingRuns: TextTrackingRun[]
  opticalKerning: boolean
  textColor: RgbColor
  sourceText: string
  segmentLines: PositionedTextFormatTrackingSegment<TypographyStyleKey, FontFamily>[][]
  graphemeLines: PositionedTextFormatTrackingGrapheme<TypographyStyleKey, FontFamily>[][]
}

export type PageExportPlan = {
  pageWidth: number
  pageHeight: number
  rotation: number
  backgroundColor: RgbColor | null
  pageOutline: {
    strokeColor: RgbColor
    strokeWidth: number
  } | null
  guideGroups: PageExportGuideGroup[]
  orderedLayerKeys: BlockId[]
  imagePlans: PageExportImagePlan[]
  textPlans: PageExportTextPlan[]
  overflowByBlock: Partial<Record<BlockId, number>>
}

export type PageExportTextWrapTrace = TextWrapDecisionTrace & {
  key: BlockId
  styleKey: TypographyStyleKey
  canvasFont: string
  maxWidth: number
}

export type BuildPageExportPlanArgs = {
  result: GridResult
  layout: PreviewLayoutState | null
  documentVariableContext?: DocumentVariableContext | null
  baseFont?: FontFamily
  imageColorScheme: ImageColorSchemeId
  canvasBackground?: string | null
  rotation: number
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  includeGraphemeLines?: boolean
  layoutEngine?: LayoutEngineContract
  rawDocumentVariableBlockKey?: BlockId | null
  textMetricsEngineFactory?: TextMetricsEngineFactory<TypographyStyleKey, FontFamily>
  textMetricsService?: TextMetricsService<TypographyStyleKey, FontFamily>
  textWrapTraceCollector?: (trace: PageExportTextWrapTrace) => void
}
