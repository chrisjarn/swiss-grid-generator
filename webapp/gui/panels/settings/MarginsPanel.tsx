import { memo } from "react"
import { Label } from "@/shared/ui/label"
import { DebouncedSlider } from "@/shared/ui/slider"
import { PanelCard } from "@/gui/panels/settings/PanelCard"
import {
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  getSettingsValueBadgeClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
  SETTINGS_ROW_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"

type CustomMarginMultipliers = { top: number; left: number; right: number; bottom: number }
type MarginMode = "1" | "2" | "3" | "custom"

const MARGIN_METHOD_OPTIONS: Array<{ value: MarginMode; label: string; detail: string | null }> = [
  { value: "1", label: "Progressive", detail: "1:2:2:3" },
  { value: "2", label: "Van de Graaf", detail: "2:3:4:6" },
  { value: "3", label: "Baseline", detail: "1:1:1:1" },
  { value: "custom", label: "Custom Margins", detail: null },
]

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  marginMethod: 1 | 2 | 3
  onMarginMethodChange: (value: 1 | 2 | 3) => void
  onMarginMethodPreviewChange?: (value: "1" | "2" | "3" | "custom" | null) => void
  useCustomMargins: boolean
  onUseCustomMarginsChange: (checked: boolean) => void
  customMarginMultipliers: CustomMarginMultipliers
  onCustomMarginMultipliersChange: (value: CustomMarginMultipliers) => void
  /** Used when initializing custom margins from current method margins. */
  currentMargins: { top: number; left: number; right: number; bottom: number }
  gridUnit: number
  isDarkMode: boolean
}

export const MarginsPanel = memo(function MarginsPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  marginMethod,
  onMarginMethodChange,
  onMarginMethodPreviewChange,
  useCustomMargins,
  onUseCustomMarginsChange,
  customMarginMultipliers,
  onCustomMarginMultipliersChange,
  currentMargins,
  gridUnit,
  isDarkMode,
}: Props) {
  const clampCustomMarginMultiplier = (value: number) => Math.max(1, Math.min(9, Math.round(value)))
  const valueBadgeClassName = getSettingsValueBadgeClassName(isDarkMode)
  const marginMethodListClassName = getSettingsOpenListClassName(isDarkMode)

  const handleMarginModeChange = (value: MarginMode) => {
    if (value === "custom") {
      onCustomMarginMultipliersChange({
        top: clampCustomMarginMultiplier(currentMargins.top / gridUnit),
        left: clampCustomMarginMultiplier(currentMargins.left / gridUnit),
        right: clampCustomMarginMultiplier(currentMargins.right / gridUnit),
        bottom: clampCustomMarginMultiplier(currentMargins.bottom / gridUnit),
      })
      onUseCustomMarginsChange(true)
      return
    }

    onMarginMethodChange(parseInt(value, 10) as 1 | 2 | 3)
    onUseCustomMarginsChange(false)
  }
  const selectedMarginMode: MarginMode = useCustomMargins
    ? "custom"
    : (marginMethod.toString() as "1" | "2" | "3")

  const collapsedSummary = useCustomMargins
    ? `Custom T${customMarginMultipliers.top}x L${customMarginMultipliers.left}x R${customMarginMultipliers.right}x B${customMarginMultipliers.bottom}x`
    : `${marginMethod === 1 ? "Progressive" : marginMethod === 2 ? "Van de Graaf" : "Baseline"}`

  return (
    <PanelCard
      title="M A R G I N S"
      tooltip="Margin method dropdown and custom per-side controls; margin method previews on rollover"
      collapsed={collapsed}
      collapsedSummary={collapsedSummary}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="margins"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>Method</Label>
        <div
          role="listbox"
          aria-label="Margin method"
          className={marginMethodListClassName}
          onMouseLeave={() => onMarginMethodPreviewChange?.(null)}
        >
          {MARGIN_METHOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={selectedMarginMode === option.value}
              className={getSettingsOpenListOptionClassName(isDarkMode, selectedMarginMode === option.value)}
              onFocus={() => onMarginMethodPreviewChange?.(option.value)}
              onBlur={() => onMarginMethodPreviewChange?.(null)}
              onMouseEnter={() => onMarginMethodPreviewChange?.(option.value)}
              onClick={() => handleMarginModeChange(option.value)}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {option.detail ? (
                <span className="ml-auto shrink-0 pl-3 text-right tabular-nums">
                  {option.detail}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {useCustomMargins ? (
        <div className="space-y-4 pt-1">
          {(["top", "left", "right"] as const).map((side) => (
            <div key={side} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>{side}</Label>
                <span className={valueBadgeClassName}>
                  {customMarginMultipliers[side]}×
                </span>
              </div>
              <DebouncedSlider
                value={[customMarginMultipliers[side]]}
                min={1}
                max={9}
                step={1}
                onValueCommit={([v]) =>
                  onCustomMarginMultipliersChange({ ...customMarginMultipliers, [side]: v })
                }
              />
            </div>
          ))}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Bottom</Label>
              <span className={valueBadgeClassName}>
                {customMarginMultipliers.bottom}×
              </span>
            </div>
            <DebouncedSlider
              value={[customMarginMultipliers.bottom]}
              min={1}
              max={9}
              step={1}
              onValueCommit={([v]) =>
                onCustomMarginMultipliersChange({ ...customMarginMultipliers, bottom: v })
              }
            />
          </div>
        </div>
      ) : null}
    </PanelCard>
  )
})

MarginsPanel.displayName = "MarginsPanel"
