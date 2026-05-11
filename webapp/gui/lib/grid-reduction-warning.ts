import type { GridReductionAxis } from "@/core/layout/grid-reduction-validation"
import { translateMessage } from "@/lib/i18n"

export function getGridReductionWarningMessage(axis: GridReductionAxis): string {
  switch (axis) {
    case "columns":
      return translateMessage("status.gridReduction.columns")
    case "rows":
      return translateMessage("status.gridReduction.rows")
    default:
      return translateMessage("status.gridReduction.grid")
  }
}
