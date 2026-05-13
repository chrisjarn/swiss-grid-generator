import { memo, useCallback, useEffect, useState } from "react"
import { RectangleHorizontal, RectangleVertical } from "lucide-react"
import { Label } from "@/shared/ui/label"
import { EditableSlider } from "@/shared/ui/slider"
import { LabeledControlRow } from "@/shared/ui/labeled-control-row"
import { getNeutralFormControlClassName } from "@/shared/ui/popup-styles"
import {
  getSettingsIconButtonClassName,
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  getSettingsValueBadgeClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
  SETTINGS_ROW_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"
import {
  CANVAS_RATIOS,
  clampCustomCanvasRatioUnit,
  formatCustomCanvasRatio,
  getCanvasRatioDisplayLabel,
  type CanvasRatioKey,
} from "@/core/layout/grid-calculator"
import { PanelCard } from "@/gui/panels/settings/PanelCard"
import { useTranslation } from "@/lib/i18n"

function parseCustomRatioUnitInput(value: string): number {
  const normalized = value.trim().replace(/\s+/g, "").replace(/,/g, ".")
  if (normalized.length === 0) return Number.NaN
  return Number(normalized)
}

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  canvasRatio: CanvasRatioKey
  onCanvasRatioChange: (value: CanvasRatioKey) => void
  onCanvasRatioPreviewChange?: (value: CanvasRatioKey | null) => void
  customRatioWidth: number
  onCustomRatioWidthChange: (value: number) => void
  customRatioHeight: number
  onCustomRatioHeightChange: (value: number) => void
  orientation: "portrait" | "landscape"
  onOrientationChange: (value: "portrait" | "landscape") => void
  onOrientationPreviewChange?: (value: "portrait" | "landscape" | null) => void
  rotation: number
  onRotationChange: (value: number) => void
  isDarkMode: boolean
}

export const CanvasRatioPanel = memo(function CanvasRatioPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  canvasRatio,
  onCanvasRatioChange,
  onCanvasRatioPreviewChange,
  customRatioWidth,
  onCustomRatioWidthChange,
  customRatioHeight,
  onCustomRatioHeightChange,
  orientation,
  onOrientationChange,
  onOrientationPreviewChange,
  rotation,
  onRotationChange,
  isDarkMode,
}: Props) {
  const { t } = useTranslation()
  const [customRatioWidthInput, setCustomRatioWidthInput] = useState(customRatioWidth.toString())
  const [customRatioHeightInput, setCustomRatioHeightInput] = useState(customRatioHeight.toString())

  useEffect(() => {
    setCustomRatioWidthInput(customRatioWidth.toString())
  }, [customRatioWidth])

  useEffect(() => {
    setCustomRatioHeightInput(customRatioHeight.toString())
  }, [customRatioHeight])

  const ratioLabel = getCanvasRatioDisplayLabel(canvasRatio, customRatioWidth, customRatioHeight)
  const customRatioText = formatCustomCanvasRatio(customRatioWidth, customRatioHeight)
  const inputClassName = getNeutralFormControlClassName(isDarkMode, "h-8 w-full rounded-sm px-2 text-[12px] focus:ring-2 focus:ring-ring focus:ring-offset-2")
  const valueBadgeClassName = getSettingsValueBadgeClassName(isDarkMode)
  const ratioListClassName = getSettingsOpenListClassName(isDarkMode)

  const commitCustomRatioWidth = useCallback(() => {
    const parsed = parseCustomRatioUnitInput(customRatioWidthInput)
    const nextValue = clampCustomCanvasRatioUnit(parsed, customRatioWidth)
    onCustomRatioWidthChange(nextValue)
    setCustomRatioWidthInput(nextValue.toString())
  }, [customRatioWidth, customRatioWidthInput, onCustomRatioWidthChange])

  const commitCustomRatioHeight = useCallback(() => {
    const parsed = parseCustomRatioUnitInput(customRatioHeightInput)
    const nextValue = clampCustomCanvasRatioUnit(parsed, customRatioHeight)
    onCustomRatioHeightChange(nextValue)
    setCustomRatioHeightInput(nextValue.toString())
  }, [customRatioHeight, customRatioHeightInput, onCustomRatioHeightChange])

  return (
    <PanelCard
      title={t("ui.panels.canvas.title")}
      tooltip={t("ui.panels.canvas.tooltip")}
      helpId="tooltip-settings-canvas"
      collapsed={collapsed}
      collapsedSummary={`${ratioLabel}, ${orientation}, ${rotation}°`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="format"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>{t("ui.panels.canvas.ratio")}</Label>
        <div
          role="listbox"
          aria-label={t("ui.panels.canvas.ratioAria")}
          className={ratioListClassName}
          onMouseLeave={() => onCanvasRatioPreviewChange?.(null)}
        >
          {CANVAS_RATIOS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="option"
              aria-selected={canvasRatio === opt.key}
              className={getSettingsOpenListOptionClassName(isDarkMode, canvasRatio === opt.key)}
              onFocus={() => onCanvasRatioPreviewChange?.(opt.key)}
              onBlur={() => onCanvasRatioPreviewChange?.(null)}
              onMouseEnter={() => onCanvasRatioPreviewChange?.(opt.key)}
              onClick={() => onCanvasRatioChange(opt.key)}
            >
              <span className="min-w-0 truncate">{opt.label}</span>
              {opt.key !== "custom" ? (
                <span className="ml-auto shrink-0 pl-3 text-right tabular-nums">
                  {opt.ratioLabel}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      {canvasRatio === "custom" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>{t("ui.panels.canvas.ratioUnits")}</Label>
            <span className={valueBadgeClassName}>
              {customRatioText}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1">
              <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>{t("ui.panels.canvas.width")}</Label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={customRatioWidthInput}
                onChange={(event) => setCustomRatioWidthInput(event.target.value)}
                onBlur={commitCustomRatioWidth}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  commitCustomRatioWidth()
                  ;(event.currentTarget as HTMLInputElement).blur()
                }}
                className={inputClassName}
                aria-label={t("ui.panels.canvas.customRatioWidth")}
              />
            </div>
            <span className="pb-2 text-sm text-muted-foreground">:</span>
            <div className="space-y-1">
              <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>{t("ui.panels.canvas.height")}</Label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={customRatioHeightInput}
                onChange={(event) => setCustomRatioHeightInput(event.target.value)}
                onBlur={commitCustomRatioHeight}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  commitCustomRatioHeight()
                  ;(event.currentTarget as HTMLInputElement).blur()
                }}
                className={inputClassName}
                aria-label={t("ui.panels.canvas.customRatioHeight")}
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <LabeledControlRow variant="popup" label={<Label className={SETTINGS_ROW_LABEL_CLASSNAME}>{t("ui.panels.canvas.orientation")}</Label>}>
          <div
            className="grid grid-cols-2 gap-1.5"
            onMouseLeave={() => onOrientationPreviewChange?.(null)}
          >
            <button
              type="button"
              aria-label={t("ui.panels.canvas.portraitAria")}
              aria-pressed={orientation === "portrait"}
              title={t("ui.panels.canvas.portrait")}
              className={getSettingsIconButtonClassName(isDarkMode, orientation === "portrait")}
              onFocus={() => onOrientationPreviewChange?.("portrait")}
              onBlur={() => onOrientationPreviewChange?.(null)}
              onMouseEnter={() => onOrientationPreviewChange?.("portrait")}
              onClick={() => onOrientationChange("portrait")}
            >
              <RectangleVertical className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label={t("ui.panels.canvas.landscapeAria")}
              aria-pressed={orientation === "landscape"}
              title={t("ui.panels.canvas.landscape")}
              className={getSettingsIconButtonClassName(isDarkMode, orientation === "landscape")}
              onFocus={() => onOrientationPreviewChange?.("landscape")}
              onBlur={() => onOrientationPreviewChange?.(null)}
              onMouseEnter={() => onOrientationPreviewChange?.("landscape")}
              onClick={() => onOrientationChange("landscape")}
            >
              <RectangleHorizontal className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </LabeledControlRow>
      </div>
      <EditableSlider
        label={t("ui.panels.canvas.rotation")}
        inputAriaLabel={t("ui.panels.canvas.rotation")}
        value={[rotation]}
        defaultValue={[0]}
        min={-180}
        max={180}
        step={1}
        shiftStep={5}
        fibonacciStep
        onValueCommit={([v]) => onRotationChange(v)}
        formatValue={(value) => `${Math.round(value)}°`}
        labelClassName={SETTINGS_ROW_LABEL_CLASSNAME}
        valueClassName={valueBadgeClassName}
      />
    </PanelCard>
  )
})

CanvasRatioPanel.displayName = "CanvasRatioPanel"
