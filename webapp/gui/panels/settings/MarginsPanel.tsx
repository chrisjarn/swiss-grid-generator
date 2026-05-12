import { memo } from "react"
import { Label } from "@/shared/ui/label"
import { EditableSlider } from "@/shared/ui/slider"
import { PanelCard } from "@/gui/panels/settings/PanelCard"
import { translateMessage, useTranslation } from "@/lib/i18n"
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
  { value: "1", label: translateMessage("settings.margins.progressive"), detail: "1:2:2:3" },
  { value: "2", label: translateMessage("settings.margins.vanDeGraaf"), detail: "2:3:4:6" },
  { value: "3", label: translateMessage("settings.margins.baseline"), detail: "1:1:1:1" },
  { value: "custom", label: translateMessage("settings.margins.custom"), detail: null },
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
  const { t } = useTranslation()
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
  const sideLabels = {
    top: t("settings.margins.top"),
    left: t("settings.margins.left"),
    right: t("settings.margins.right"),
  }

  const collapsedSummary = useCustomMargins
    ? t("settings.margins.customSummary", {
        top: customMarginMultipliers.top,
        left: customMarginMultipliers.left,
        right: customMarginMultipliers.right,
        bottom: customMarginMultipliers.bottom,
      })
    : `${marginMethod === 1 ? t("settings.margins.progressive") : marginMethod === 2 ? t("settings.margins.vanDeGraaf") : t("settings.margins.baseline")}`

  return (
    <PanelCard
      title={t("settings.margins.title")}
      tooltip={t("settings.margins.tooltip")}
      collapsed={collapsed}
      collapsedSummary={collapsedSummary}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="margins"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>{t("settings.margins.method")}</Label>
        <div
          role="listbox"
          aria-label={t("settings.margins.methodAria")}
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
            <EditableSlider
              key={side}
              label={sideLabels[side]}
              inputAriaLabel={sideLabels[side]}
              value={[customMarginMultipliers[side]]}
              defaultValue={[1]}
              min={1}
              max={9}
              step={1}
              onValueCommit={([v]) =>
                onCustomMarginMultipliersChange({ ...customMarginMultipliers, [side]: v })
              }
              formatValue={(value) => `${value}×`}
              labelClassName={SETTINGS_ROW_LABEL_CLASSNAME}
              valueClassName={valueBadgeClassName}
            />
          ))}
          <EditableSlider
            label={t("settings.margins.bottom")}
            inputAriaLabel={t("settings.margins.bottom")}
            value={[customMarginMultipliers.bottom]}
            defaultValue={[1]}
            min={1}
            max={9}
            step={1}
            onValueCommit={([v]) =>
              onCustomMarginMultipliersChange({ ...customMarginMultipliers, bottom: v })
            }
            formatValue={(value) => `${value}×`}
            labelClassName={SETTINGS_ROW_LABEL_CLASSNAME}
            valueClassName={valueBadgeClassName}
          />
        </div>
      ) : null}
    </PanelCard>
  )
})

MarginsPanel.displayName = "MarginsPanel"
