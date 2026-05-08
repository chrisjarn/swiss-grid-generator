import { memo, useCallback, useEffect, useState } from "react"
import { RectangleHorizontal, RectangleVertical } from "lucide-react"
import { Label } from "@/components/ui/label"
import { DebouncedSlider } from "@/components/ui/slider"
import { LabeledControlRow } from "@/components/ui/labeled-control-row"
import { getNeutralFormControlClassName } from "@/components/ui/popup-styles"
import {
  getSettingsIconButtonClassName,
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  getSettingsValueBadgeClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
  SETTINGS_ROW_LABEL_CLASSNAME,
} from "@/components/settings/settings-panel-styles"
import {
  CANVAS_RATIOS,
  clampCustomCanvasRatioUnit,
  formatCustomCanvasRatio,
  getCanvasRatioDisplayLabel,
  type CanvasRatioKey,
} from "@/lib/grid-calculator"
import { PanelCard } from "@/components/settings/PanelCard"

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
      title="C A N V A S"
      tooltip="Ratio preset or custom width:height, orientation, and preview rotation; ratio lists and orientation controls preview on rollover"
      collapsed={collapsed}
      collapsedSummary={`${ratioLabel}, ${orientation}, ${rotation}°`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="format"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <LabeledControlRow
          variant="popup"
          className="!items-start"
          label={<Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>Ratio</Label>}
        >
          <div
            role="listbox"
            aria-label="Canvas ratio"
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
        </LabeledControlRow>
      </div>
      {canvasRatio === "custom" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Ratio Units</Label>
            <span className={valueBadgeClassName}>
              {customRatioText}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1">
              <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Width</Label>
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
                aria-label="Custom ratio width unit"
              />
            </div>
            <span className="pb-2 text-sm text-gray-500">:</span>
            <div className="space-y-1">
              <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Height</Label>
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
                aria-label="Custom ratio height unit"
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <LabeledControlRow variant="popup" label={<Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Orientation</Label>}>
          <div
            className="grid grid-cols-2 gap-1.5"
            onMouseLeave={() => onOrientationPreviewChange?.(null)}
          >
            <button
              type="button"
              aria-label="Portrait orientation"
              aria-pressed={orientation === "portrait"}
              title="Portrait"
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
              aria-label="Landscape orientation"
              aria-pressed={orientation === "landscape"}
              title="Landscape"
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Rotation</Label>
          <span className={valueBadgeClassName}>{rotation}°</span>
        </div>
        <DebouncedSlider
          value={[rotation]}
          min={-180}
          max={180}
          step={1}
          onValueCommit={([v]) => onRotationChange(v)}
          onThumbDoubleClick={() => onRotationChange(0)}
        />
      </div>
    </PanelCard>
  )
})

CanvasRatioPanel.displayName = "CanvasRatioPanel"
