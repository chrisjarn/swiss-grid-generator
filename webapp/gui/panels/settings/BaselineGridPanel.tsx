import { memo } from "react"
import { Label } from "@/shared/ui/label"
import { DebouncedSlider } from "@/shared/ui/slider"
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
        <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>{t("settings.baseline.gridUnit")}</Label>
          <span className={valueBadgeClassName}>
            {customBaseline} pt
          </span>
          </div>
          <DebouncedSlider
            value={[
              availableBaselineOptions.indexOf(customBaseline) >= 0
                ? availableBaselineOptions.indexOf(customBaseline)
                : 0,
            ]}
            min={0}
            max={availableBaselineOptions.length - 1}
            step={1}
            onValueCommit={([v]) => onCustomBaselineChange(availableBaselineOptions[v])}
            onThumbDoubleClick={() => onCustomBaselineChange(12)}
          />
        </div>
      )}
    </PanelCard>
  )
})

BaselineGridPanel.displayName = "BaselineGridPanel"
