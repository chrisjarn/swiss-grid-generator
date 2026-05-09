// The planner still owns this shape in lib/page-export-plan.ts.
// Keep a type-only bridge here until the planner module moves into core/layout.
export type {
  PageExportGuideGroup,
  PageExportImagePlan,
  PageExportLine,
  PageExportPlan,
  PageExportRect,
  PageExportTextPlan,
} from "@/lib/page-export-plan"
