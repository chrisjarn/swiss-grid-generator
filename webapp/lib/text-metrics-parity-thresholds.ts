export type TextMetricsParityThresholds = {
  minSampleCount: number
  maxAbsWidthDelta: number
  averageAbsWidthDelta: number
  maxAbsAdvanceDelta: number
  averageAbsAdvanceDelta: number
  maxAbsOpticalKerningDelta: number
  averageAbsOpticalKerningDelta: number
  wrappedTextChangedCount: number
  wrappedLineCountChangedCount: number
  exportChangedCommandCount: number
  exportChangedCommandTextCount: number
  exportMaxAbsCommandXDelta: number
  exportMaxAbsCommandYDelta: number
  exportMaxAbsRectXDelta: number
  exportMaxAbsRectYDelta: number
  exportMaxAbsRectWidthDelta: number
  exportMaxAbsRectHeightDelta: number
  deterministicOpticalMarginChangedCommandCount: number
  deterministicOpticalMarginChangedCommandTextCount: number
  deterministicOpticalMarginMaxAbsCommandXDelta: number
  deterministicOpticalMarginMaxAbsCommandYDelta: number
  deterministicOpticalMarginMaxAbsRectDelta: number
  previewPlanChangedPlanCount: number
  previewPlanChangedCommandCount: number
  previewPlanChangedCommandTextCount: number
  previewPlanChangedGraphemeCount: number
  previewPlanMaxAbsCommandDelta: number
  previewPlanMaxAbsRectDelta: number
  previewPlanMaxAbsGraphemeDelta: number
}

export type TextMetricsParityThresholdFailure = {
  label: string
  actual: number
  operator: "<=" | ">="
  expected: number
}

export type TextMetricsParityThresholdReport = {
  status: "passed" | "failed"
  failures: TextMetricsParityThresholdFailure[]
}

type TextMetricsProductionExportPlanSignatureLike = {
  label: string
  signature: string
}

type TextMetricsExportPlanParityLike = {
  changedPlanCount?: number
  changedCommandCount: number
  changedCommandTextCount: number
  maxAbsCommandXDelta: number
  maxAbsCommandYDelta: number
  maxAbsRectXDelta: number
  maxAbsRectYDelta: number
  maxAbsRectWidthDelta: number
  maxAbsRectHeightDelta: number
}

type TextMetricsPreviewPlanParityLike = TextMetricsExportPlanParityLike & {
  changedPlanCount: number
  changedGraphemeCount: number
  maxAbsGraphemeXDelta: number
  maxAbsGraphemeYDelta: number
  maxAbsGraphemeWidthDelta: number
  maxAbsGraphemeAscentDelta: number
  maxAbsGraphemeDescentDelta: number
}

export type TextMetricsParityReportLike = {
  sampleCount: number
  maxAbsWidthDelta: number
  averageAbsWidthDelta: number
  maxAbsAdvanceDelta: number
  averageAbsAdvanceDelta: number
  maxAbsOpticalKerningDelta: number
  averageAbsOpticalKerningDelta: number
  wrappedTextChangedCount: number
  wrappedLineCountChangedCount: number
  exportPlan: TextMetricsExportPlanParityLike
  previewPlan?: TextMetricsPreviewPlanParityLike
  previewCanvasAdapter?: TextMetricsPreviewPlanParityLike
}

export type TextMetricsProductionParityReportLike = {
  sampleCount: number
  exportPlan: TextMetricsExportPlanParityLike
  rangeCalibrationClassCorrection?: TextMetricsExportPlanParityLike
  deterministicOpticalMargin?: TextMetricsExportPlanParityLike
  previewPlan?: TextMetricsPreviewPlanParityLike
  previewCanvasAdapter?: TextMetricsPreviewPlanParityLike
  productionExportPlanSignatures?: readonly TextMetricsProductionExportPlanSignatureLike[]
  deterministicOpticalMarginExportPlanSignatures?: readonly TextMetricsProductionExportPlanSignatureLike[]
}

export const DEFAULT_TEXT_METRICS_PARITY_THRESHOLDS: TextMetricsParityThresholds = {
  minSampleCount: 70,
  maxAbsWidthDelta: 6,
  averageAbsWidthDelta: 1.5,
  maxAbsAdvanceDelta: 9,
  averageAbsAdvanceDelta: 0.5,
  maxAbsOpticalKerningDelta: 13,
  averageAbsOpticalKerningDelta: 1.5,
  wrappedTextChangedCount: 0,
  wrappedLineCountChangedCount: 0,
  exportChangedCommandCount: 0,
  exportChangedCommandTextCount: 0,
  exportMaxAbsCommandXDelta: 6,
  exportMaxAbsCommandYDelta: 0.01,
  exportMaxAbsRectXDelta: 0.01,
  exportMaxAbsRectYDelta: 0.01,
  exportMaxAbsRectWidthDelta: 0.01,
  exportMaxAbsRectHeightDelta: 0.01,
  deterministicOpticalMarginChangedCommandCount: 0,
  deterministicOpticalMarginChangedCommandTextCount: 0,
  deterministicOpticalMarginMaxAbsCommandXDelta: 0.16,
  deterministicOpticalMarginMaxAbsCommandYDelta: 0.01,
  deterministicOpticalMarginMaxAbsRectDelta: 0.01,
  previewPlanChangedPlanCount: 0,
  previewPlanChangedCommandCount: 0,
  previewPlanChangedCommandTextCount: 0,
  previewPlanChangedGraphemeCount: 0,
  previewPlanMaxAbsCommandDelta: 0.01,
  previewPlanMaxAbsRectDelta: 0.01,
  previewPlanMaxAbsGraphemeDelta: 0.01,
}

export const EXPECTED_TEXT_METRICS_PRODUCTION_EXPORT_PLAN_SIGNATURES: readonly TextMetricsProductionExportPlanSignatureLike[] = [
  {
    label: "Book Template Van de Graaf 4x5 12pt / Right Page",
    signature: "b5c80101",
  },
  {
    label: "Book Template Van de Graaf 4x5 12pt / Left Page",
    signature: "d8434522",
  },
  {
    label: "Book Template Van de Graaf 4x5 12pt / Facing Pages",
    signature: "b55b5496",
  },
  {
    label: "Swiss Grid Generator Manual / Title",
    signature: "cfeebf66",
  },
  {
    label: "Swiss Grid Generator Manual / Introduction",
    signature: "bab59184",
  },
  {
    label: "Swiss Grid Generator Manual / Quick Start",
    signature: "7e05e360",
  },
  {
    label: "Swiss Grid Generator Manual / Recommended Workflow",
    signature: "22dde627",
  },
  {
    label: "Swiss Grid Generator Manual / Pages and Document Structure",
    signature: "dd8e68af",
  },
  {
    label: "Swiss Grid Generator Manual / Grid, Margins, and Rhythm",
    signature: "17598dd8",
  },
  {
    label: "Swiss Grid Generator Manual / Typography",
    signature: "ccab0129",
  },
  {
    label: "Swiss Grid Generator Manual / Placing Text and Image Areas",
    signature: "491b89df",
  },
  {
    label: "Swiss Grid Generator Manual / Export",
    signature: "1dce46de",
  },
  {
    label: "Swiss Grid Generator Manual / Keyboard and Fast Interaction",
    signature: "81abe188",
  },
  {
    label: "Swiss Grid Generator Manual / Common Mistakes",
    signature: "f32f1f93",
  },
  {
    label: "Swiss Grid Generator Manual / Final Advice",
    signature: "522aae82",
  },
  {
    label: "Swiss Style Poster Example 001 / Poster AO",
    signature: "2c2e8c65",
  },
  {
    label: "Swiss Style Poster Example 002 / Swiss Style Poster",
    signature: "8c27f777",
  },
  {
    label: "Classic Poster Lookalike / Classic Poster Lookalike",
    signature: "48d95b71",
  },
  {
    label: "Classic Book Cover Lookalike / Blank Start Page",
    signature: "06ef2722",
  },
]

export const EXPECTED_TEXT_METRICS_DETERMINISTIC_OPTICAL_MARGIN_EXPORT_PLAN_SIGNATURES: readonly TextMetricsProductionExportPlanSignatureLike[] = [
  {
    label: "Book Template Van de Graaf 4x5 12pt / Right Page",
    signature: "b5c80101",
  },
  {
    label: "Book Template Van de Graaf 4x5 12pt / Left Page",
    signature: "d8434522",
  },
  {
    label: "Book Template Van de Graaf 4x5 12pt / Facing Pages",
    signature: "b55b5496",
  },
  {
    label: "Swiss Grid Generator Manual / Title",
    signature: "cfeebf66",
  },
  {
    label: "Swiss Grid Generator Manual / Introduction",
    signature: "bab59184",
  },
  {
    label: "Swiss Grid Generator Manual / Quick Start",
    signature: "7e05e360",
  },
  {
    label: "Swiss Grid Generator Manual / Recommended Workflow",
    signature: "22dde627",
  },
  {
    label: "Swiss Grid Generator Manual / Pages and Document Structure",
    signature: "dd8e68af",
  },
  {
    label: "Swiss Grid Generator Manual / Grid, Margins, and Rhythm",
    signature: "17598dd8",
  },
  {
    label: "Swiss Grid Generator Manual / Typography",
    signature: "ccab0129",
  },
  {
    label: "Swiss Grid Generator Manual / Placing Text and Image Areas",
    signature: "491b89df",
  },
  {
    label: "Swiss Grid Generator Manual / Export",
    signature: "1dce46de",
  },
  {
    label: "Swiss Grid Generator Manual / Keyboard and Fast Interaction",
    signature: "81abe188",
  },
  {
    label: "Swiss Grid Generator Manual / Common Mistakes",
    signature: "f32f1f93",
  },
  {
    label: "Swiss Grid Generator Manual / Final Advice",
    signature: "522aae82",
  },
  {
    label: "Swiss Style Poster Example 001 / Poster AO",
    signature: "2c2e8c65",
  },
  {
    label: "Swiss Style Poster Example 002 / Swiss Style Poster",
    signature: "8c27f777",
  },
  {
    label: "Classic Poster Lookalike / Classic Poster Lookalike",
    signature: "48d95b71",
  },
  {
    label: "Classic Book Cover Lookalike / Blank Start Page",
    signature: "06ef2722",
  },
]

export function evaluateTextMetricsParityThresholds(
  report: TextMetricsParityReportLike,
  thresholds: TextMetricsParityThresholds = DEFAULT_TEXT_METRICS_PARITY_THRESHOLDS,
): TextMetricsParityThresholdReport {
  const checks: [string, number, "<=" | ">=", number][] = [
    ["sampleCount", report.sampleCount, ">=", thresholds.minSampleCount],
    ["maxAbsWidthDelta", report.maxAbsWidthDelta, "<=", thresholds.maxAbsWidthDelta],
    ["averageAbsWidthDelta", report.averageAbsWidthDelta, "<=", thresholds.averageAbsWidthDelta],
    ["maxAbsAdvanceDelta", report.maxAbsAdvanceDelta, "<=", thresholds.maxAbsAdvanceDelta],
    ["averageAbsAdvanceDelta", report.averageAbsAdvanceDelta, "<=", thresholds.averageAbsAdvanceDelta],
    ["maxAbsOpticalKerningDelta", report.maxAbsOpticalKerningDelta, "<=", thresholds.maxAbsOpticalKerningDelta],
    [
      "averageAbsOpticalKerningDelta",
      report.averageAbsOpticalKerningDelta,
      "<=",
      thresholds.averageAbsOpticalKerningDelta,
    ],
    ["wrappedTextChangedCount", report.wrappedTextChangedCount, "<=", thresholds.wrappedTextChangedCount],
    [
      "wrappedLineCountChangedCount",
      report.wrappedLineCountChangedCount,
      "<=",
      thresholds.wrappedLineCountChangedCount,
    ],
    ["exportPlan.changedCommandCount", report.exportPlan.changedCommandCount, "<=", thresholds.exportChangedCommandCount],
    [
      "exportPlan.changedCommandTextCount",
      report.exportPlan.changedCommandTextCount,
      "<=",
      thresholds.exportChangedCommandTextCount,
    ],
    ["exportPlan.maxAbsCommandXDelta", report.exportPlan.maxAbsCommandXDelta, "<=", thresholds.exportMaxAbsCommandXDelta],
    ["exportPlan.maxAbsCommandYDelta", report.exportPlan.maxAbsCommandYDelta, "<=", thresholds.exportMaxAbsCommandYDelta],
    ["exportPlan.maxAbsRectXDelta", report.exportPlan.maxAbsRectXDelta, "<=", thresholds.exportMaxAbsRectXDelta],
    ["exportPlan.maxAbsRectYDelta", report.exportPlan.maxAbsRectYDelta, "<=", thresholds.exportMaxAbsRectYDelta],
    [
      "exportPlan.maxAbsRectWidthDelta",
      report.exportPlan.maxAbsRectWidthDelta,
      "<=",
      thresholds.exportMaxAbsRectWidthDelta,
    ],
    [
      "exportPlan.maxAbsRectHeightDelta",
      report.exportPlan.maxAbsRectHeightDelta,
      "<=",
      thresholds.exportMaxAbsRectHeightDelta,
    ],
  ]

  const failures = checks.flatMap(([label, actual, operator, expected]) => {
    const passed = operator === ">=" ? actual >= expected : actual <= expected
    return passed ? [] : [{ label, actual, operator, expected }]
  })

  return {
    status: failures.length === 0 ? "passed" : "failed",
    failures,
  }
}

function evaluateExportPlanThresholds(
  labelPrefix: string,
  report: TextMetricsExportPlanParityLike,
  thresholds: TextMetricsParityThresholds,
): TextMetricsParityThresholdFailure[] {
  const checks: [string, number, "<=" | ">=", number][] = [
    [`${labelPrefix}.changedCommandCount`, report.changedCommandCount, "<=", thresholds.exportChangedCommandCount],
    [
      `${labelPrefix}.changedCommandTextCount`,
      report.changedCommandTextCount,
      "<=",
      thresholds.exportChangedCommandTextCount,
    ],
    [`${labelPrefix}.maxAbsCommandXDelta`, report.maxAbsCommandXDelta, "<=", thresholds.exportMaxAbsCommandXDelta],
    [`${labelPrefix}.maxAbsCommandYDelta`, report.maxAbsCommandYDelta, "<=", thresholds.exportMaxAbsCommandYDelta],
    [`${labelPrefix}.maxAbsRectXDelta`, report.maxAbsRectXDelta, "<=", thresholds.exportMaxAbsRectXDelta],
    [`${labelPrefix}.maxAbsRectYDelta`, report.maxAbsRectYDelta, "<=", thresholds.exportMaxAbsRectYDelta],
    [
      `${labelPrefix}.maxAbsRectWidthDelta`,
      report.maxAbsRectWidthDelta,
      "<=",
      thresholds.exportMaxAbsRectWidthDelta,
    ],
    [
      `${labelPrefix}.maxAbsRectHeightDelta`,
      report.maxAbsRectHeightDelta,
      "<=",
      thresholds.exportMaxAbsRectHeightDelta,
    ],
  ]

  return checks.flatMap(([label, actual, operator, expected]) => {
    const passed = operator === ">=" ? actual >= expected : actual <= expected
    return passed ? [] : [{ label, actual, operator, expected }]
  })
}

function evaluateExportPlanSignatures(
  labelPrefix: string,
  expectedSignatures: readonly TextMetricsProductionExportPlanSignatureLike[],
  signatures: readonly TextMetricsProductionExportPlanSignatureLike[] | undefined,
): TextMetricsParityThresholdFailure[] {
  if (!signatures) {
    return [{
      label: labelPrefix,
      actual: 0,
      operator: ">=",
      expected: expectedSignatures.length,
    }]
  }

  const signatureByLabel = new Map(signatures.map((signature) => [signature.label, signature]))

  return expectedSignatures.flatMap((expected) => {
    const actual = signatureByLabel.get(expected.label)
    if (actual?.label === expected.label && actual.signature === expected.signature) return []
    return [{
      label: `${labelPrefix} ${expected.label} expected ${expected.signature}, got ${actual?.signature ?? "missing"}`,
      actual: 0,
      operator: ">=" as const,
      expected: 1,
    }]
  })
}

function evaluateProductionExportPlanSignatures(
  signatures: readonly TextMetricsProductionExportPlanSignatureLike[] | undefined,
): TextMetricsParityThresholdFailure[] {
  return evaluateExportPlanSignatures(
    "productionExportPlanSignatures",
    EXPECTED_TEXT_METRICS_PRODUCTION_EXPORT_PLAN_SIGNATURES,
    signatures,
  )
}

function evaluateDeterministicOpticalMarginExportPlanSignatures(
  signatures: readonly TextMetricsProductionExportPlanSignatureLike[] | undefined,
): TextMetricsParityThresholdFailure[] {
  return evaluateExportPlanSignatures(
    "deterministicOpticalMarginExportPlanSignatures",
    EXPECTED_TEXT_METRICS_DETERMINISTIC_OPTICAL_MARGIN_EXPORT_PLAN_SIGNATURES,
    signatures,
  )
}

export function evaluateDeterministicOpticalMarginThresholds(
  report: TextMetricsExportPlanParityLike,
  thresholds: TextMetricsParityThresholds = DEFAULT_TEXT_METRICS_PARITY_THRESHOLDS,
): TextMetricsParityThresholdReport {
  const checks: [string, number, "<=" | ">=", number][] = [
    [
      "deterministicOpticalMargin.changedCommandCount",
      report.changedCommandCount,
      "<=",
      thresholds.deterministicOpticalMarginChangedCommandCount,
    ],
    [
      "deterministicOpticalMargin.changedCommandTextCount",
      report.changedCommandTextCount,
      "<=",
      thresholds.deterministicOpticalMarginChangedCommandTextCount,
    ],
    [
      "deterministicOpticalMargin.maxAbsCommandXDelta",
      report.maxAbsCommandXDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsCommandXDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsCommandYDelta",
      report.maxAbsCommandYDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsCommandYDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsRectXDelta",
      report.maxAbsRectXDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsRectDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsRectYDelta",
      report.maxAbsRectYDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsRectDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsRectWidthDelta",
      report.maxAbsRectWidthDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsRectDelta,
    ],
    [
      "deterministicOpticalMargin.maxAbsRectHeightDelta",
      report.maxAbsRectHeightDelta,
      "<=",
      thresholds.deterministicOpticalMarginMaxAbsRectDelta,
    ],
  ]

  const failures = checks.flatMap(([label, actual, operator, expected]) => {
    const passed = operator === ">=" ? actual >= expected : actual <= expected
    return passed ? [] : [{ label, actual, operator, expected }]
  })

  return {
    status: failures.length === 0 ? "passed" : "failed",
    failures,
  }
}

export function evaluatePreviewPlanThresholds(
  report: TextMetricsPreviewPlanParityLike,
  thresholds: TextMetricsParityThresholds = DEFAULT_TEXT_METRICS_PARITY_THRESHOLDS,
  label = "previewPlan",
): TextMetricsParityThresholdReport {
  const checks: [string, number, "<=" | ">=", number][] = [
    [`${label}.changedPlanCount`, report.changedPlanCount, "<=", thresholds.previewPlanChangedPlanCount],
    [`${label}.changedCommandCount`, report.changedCommandCount, "<=", thresholds.previewPlanChangedCommandCount],
    [
      `${label}.changedCommandTextCount`,
      report.changedCommandTextCount,
      "<=",
      thresholds.previewPlanChangedCommandTextCount,
    ],
    [`${label}.changedGraphemeCount`, report.changedGraphemeCount, "<=", thresholds.previewPlanChangedGraphemeCount],
    [`${label}.maxAbsCommandXDelta`, report.maxAbsCommandXDelta, "<=", thresholds.previewPlanMaxAbsCommandDelta],
    [`${label}.maxAbsCommandYDelta`, report.maxAbsCommandYDelta, "<=", thresholds.previewPlanMaxAbsCommandDelta],
    [`${label}.maxAbsRectXDelta`, report.maxAbsRectXDelta, "<=", thresholds.previewPlanMaxAbsRectDelta],
    [`${label}.maxAbsRectYDelta`, report.maxAbsRectYDelta, "<=", thresholds.previewPlanMaxAbsRectDelta],
    [`${label}.maxAbsRectWidthDelta`, report.maxAbsRectWidthDelta, "<=", thresholds.previewPlanMaxAbsRectDelta],
    [`${label}.maxAbsRectHeightDelta`, report.maxAbsRectHeightDelta, "<=", thresholds.previewPlanMaxAbsRectDelta],
    [`${label}.maxAbsGraphemeXDelta`, report.maxAbsGraphemeXDelta, "<=", thresholds.previewPlanMaxAbsGraphemeDelta],
    [`${label}.maxAbsGraphemeYDelta`, report.maxAbsGraphemeYDelta, "<=", thresholds.previewPlanMaxAbsGraphemeDelta],
    [`${label}.maxAbsGraphemeWidthDelta`, report.maxAbsGraphemeWidthDelta, "<=", thresholds.previewPlanMaxAbsGraphemeDelta],
    [`${label}.maxAbsGraphemeAscentDelta`, report.maxAbsGraphemeAscentDelta, "<=", thresholds.previewPlanMaxAbsGraphemeDelta],
    [`${label}.maxAbsGraphemeDescentDelta`, report.maxAbsGraphemeDescentDelta, "<=", thresholds.previewPlanMaxAbsGraphemeDelta],
  ]

  const failures = checks.flatMap(([label, actual, operator, expected]) => {
    const passed = operator === ">=" ? actual >= expected : actual <= expected
    return passed ? [] : [{ label, actual, operator, expected }]
  })

  return {
    status: failures.length === 0 ? "passed" : "failed",
    failures,
  }
}

export function evaluateTextMetricsProductionParityThresholds(
  report: TextMetricsProductionParityReportLike,
  thresholds: TextMetricsParityThresholds = DEFAULT_TEXT_METRICS_PARITY_THRESHOLDS,
): TextMetricsParityThresholdReport {
  const failures: TextMetricsParityThresholdFailure[] = []
  if (report.sampleCount < thresholds.minSampleCount) {
    failures.push({
      label: "sampleCount",
      actual: report.sampleCount,
      operator: ">=",
      expected: thresholds.minSampleCount,
    })
  }
  failures.push(...evaluateExportPlanThresholds("exportPlan", report.exportPlan, thresholds))
  if (report.rangeCalibrationClassCorrection) {
    failures.push(...evaluateExportPlanThresholds(
      "rangeCalibrationClassCorrection",
      report.rangeCalibrationClassCorrection,
      thresholds,
    ))
  }
  if (report.deterministicOpticalMargin) {
    failures.push(...evaluateDeterministicOpticalMarginThresholds(
      report.deterministicOpticalMargin,
      thresholds,
    ).failures)
  }
  if (report.deterministicOpticalMarginExportPlanSignatures) {
    failures.push(...evaluateDeterministicOpticalMarginExportPlanSignatures(
      report.deterministicOpticalMarginExportPlanSignatures,
    ))
  }
  if (report.previewPlan) {
    failures.push(...evaluatePreviewPlanThresholds(report.previewPlan, thresholds).failures)
  }
  if (report.previewCanvasAdapter) {
    failures.push(...evaluatePreviewPlanThresholds(
      report.previewCanvasAdapter,
      thresholds,
      "previewCanvasAdapter",
    ).failures)
  }
  failures.push(...evaluateProductionExportPlanSignatures(report.productionExportPlanSignatures))

  return {
    status: failures.length === 0 ? "passed" : "failed",
    failures,
  }
}
