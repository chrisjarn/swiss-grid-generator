import { memo } from "react"
import { EditableSlider } from "@/shared/ui/slider"
import { PanelCard } from "@/gui/panels/settings/PanelCard"
import { useTranslation } from "@/lib/i18n"
import {
  getSettingsValueBadgeClassName,
  SETTINGS_ROW_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  customBaseline: number
  availableBaselineOptions: number[]
  onCustomBaselineChange: (value: number) => void
  isDarkMode: boolean
}

export const BaselineGridPanel = memo(function BaselineGridPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  customBaseline,
  availableBaselineOptions,
  onCustomBaselineChange,
  isDarkMode,
}: Props) {
  const { t } = useTranslation()
  const valueBadgeClassName = getSettingsValueBadgeClassName(isDarkMode)
  const selectedBaselineIndex = availableBaselineOptions.indexOf(customBaseline) >= 0
    ? availableBaselineOptions.indexOf(customBaseline)
    : 0
  const defaultBaselineIndex = availableBaselineOptions.indexOf(12) >= 0
    ? availableBaselineOptions.indexOf(12)
    : selectedBaselineIndex
  const resolveBaselineOptionIndex = (value: string) => {
    const parsed = Number(value.trim().replace(/\s+/g, "").replace(/,/g, "."))
    if (!Number.isFinite(parsed)) return Number.NaN
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    availableBaselineOptions.forEach((option, index) => {
      const distance = Math.abs(option - parsed)
      if (distance < nearestDistance) {
        nearestIndex = index
        nearestDistance = distance
      }
    })
    return nearestIndex
  }

  return (
    <PanelCard
      title={t("settings.baseline.title")}
      tooltip={t("settings.baseline.tooltip")}
      collapsed={collapsed}
      collapsedSummary={`${customBaseline} pt`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="baseline"
      isDarkMode={isDarkMode}
    >
      {availableBaselineOptions.length > 0 && (
        <EditableSlider
          label={t("settings.baseline.gridUnit")}
          inputAriaLabel={t("settings.baseline.gridUnit")}
          value={[selectedBaselineIndex]}
          defaultValue={[defaultBaselineIndex]}
          min={0}
          max={availableBaselineOptions.length - 1}
          step={1}
          onValueCommit={([v]) => onCustomBaselineChange(availableBaselineOptions[v])}
          formatValue={(value) => `${availableBaselineOptions[value] ?? customBaseline} pt`}
          parseValue={resolveBaselineOptionIndex}
          labelClassName={SETTINGS_ROW_LABEL_CLASSNAME}
          valueClassName={valueBadgeClassName}
        />
      )}
    </PanelCard>
  )
})

BaselineGridPanel.displayName = "BaselineGridPanel"
