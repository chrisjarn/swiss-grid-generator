import { memo, useState } from "react"
import { Label } from "@/shared/ui/label"
import { FontSelect } from "@/shared/ui/font-select"
import { PREVIEW_STYLE_OPTIONS, formatPtSize } from "@/lib/preview-text-config"
import {
  MAX_FIBONACCI_SEQUENCE_START_INDEX,
  MIN_FIBONACCI_SEQUENCE_START_INDEX,
  clampFibonacciSequenceStartIndex,
  formatFibonacciTypographySequence,
  generateTypographyStyles,
  TYPOGRAPHY_SCALE_LABELS,
} from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import { FONT_OPTIONS, getFontFamilyCss, type FontFamily } from "@/lib/config/fonts"
import type { TypographyScale } from "@/lib/config/defaults"
import { PanelCard } from "@/gui/panels/settings/PanelCard"
import { LabeledControlRow } from "@/shared/ui/labeled-control-row"
import { useSelectRolloverPreview } from "@/gui/editors/hooks/useSelectRolloverPreview"
import {
  getSettingsControlClassName,
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
  SETTINGS_ROW_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"

const TYPOGRAPHY_SCALE_OPTIONS: Array<{ value: TypographyScale; label: string }> = Object
  .entries(TYPOGRAPHY_SCALE_LABELS)
  .map(([value, label]) => ({ value: value as TypographyScale, label }))
  .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))

function splitParentheticalLabel(label: string): { label: string; detail: string | null } {
  const match = label.match(/^(.*?)\s+\((.*)\)$/)
  return match ? { label: match[1], detail: match[2] } : { label, detail: null }
}

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  typographyScale: TypographyScale
  onTypographyScaleChange: (value: TypographyScale) => void
  onTypographyScalePreviewChange?: (value: TypographyScale | null) => void
  fibonacciSequenceStartIndex: number
  onFibonacciSequenceStartIndexChange: (value: number) => void
  typographyStyles: GridResult["typography"]["styles"]
  gridUnit: number
  baseFont: FontFamily
  onBaseFontChange: (value: FontFamily) => void
  onBaseFontPreviewChange?: (value: FontFamily | null) => void
  isDarkMode: boolean
}

export const TypographyPanel = memo(function TypographyPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  typographyScale,
  onTypographyScaleChange,
  onTypographyScalePreviewChange,
  fibonacciSequenceStartIndex,
  onFibonacciSequenceStartIndexChange,
  typographyStyles,
  gridUnit,
  baseFont,
  onBaseFontChange,
  onBaseFontPreviewChange,
  isDarkMode,
}: Props) {
  const [previewTypographyScale, setPreviewTypographyScale] = useState<TypographyScale | null>(null)
  const baseFontSelectPreview = useSelectRolloverPreview<FontFamily>({
    value: baseFont,
    onCommitValue: onBaseFontChange,
    onPreviewValue: (value) => onBaseFontPreviewChange?.(value),
    onPreviewClear: () => onBaseFontPreviewChange?.(null),
  })
  const tableTone = isDarkMode
    ? {
        frame: "border-gray-700 bg-gray-900/60",
        row: "border-gray-800",
        label: "text-gray-100",
        value: "text-gray-300",
      }
    : {
        frame: "border-gray-200 bg-gray-50/80",
        row: "border-gray-200",
        label: "text-gray-900",
        value: "text-gray-700",
      }
  const controlClassName = getSettingsControlClassName(isDarkMode)
  const typographyRhythmListClassName = getSettingsOpenListClassName(isDarkMode)
  const normalizedFibonacciStartIndex = clampFibonacciSequenceStartIndex(fibonacciSequenceStartIndex)
  const activeTypographyScaleLabel = typographyScale === "fibonacci"
    ? `Fibonacci (${formatFibonacciTypographySequence(normalizedFibonacciStartIndex)})`
    : TYPOGRAPHY_SCALE_LABELS[typographyScale]
  const displayedTypographyStyles = previewTypographyScale
    ? generateTypographyStyles(1, gridUnit, "A4", previewTypographyScale, normalizedFibonacciStartIndex).styles
    : typographyStyles
  const handleTypographyScalePreview = (value: TypographyScale) => {
    setPreviewTypographyScale(value)
    onTypographyScalePreviewChange?.(value)
  }
  const clearTypographyScalePreview = () => {
    setPreviewTypographyScale(null)
    onTypographyScalePreviewChange?.(null)
  }
  const handleFibonacciSequenceStep = (direction: -1 | 1) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const nextIndex = clampFibonacciSequenceStartIndex(normalizedFibonacciStartIndex + direction)
    onTypographyScaleChange("fibonacci")
    onFibonacciSequenceStartIndexChange(nextIndex)
    handleTypographyScalePreview("fibonacci")
  }
  const handleFibonacciKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    onTypographyScaleChange("fibonacci")
  }

  const hierarchyRows = PREVIEW_STYLE_OPTIONS
    .filter((option) => option.value !== "fx")
    .filter((option) => displayedTypographyStyles[option.value])
    .map((option) => ({
      key: option.value,
      label: option.label,
      size: displayedTypographyStyles[option.value].size,
      leading: displayedTypographyStyles[option.value].leading,
    }))

  return (
    <PanelCard
      title="T Y P O"
      tooltip="Typography scale, hierarchy table, and base font; hierarchy and font lists preview on rollover"
      collapsed={collapsed}
      collapsedSummary={`${activeTypographyScaleLabel}, ${baseFont}`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="typo"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <LabeledControlRow variant="popup" label={<Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Base</Label>}>
          <FontSelect
            value={baseFont}
            onValueChange={(value) => baseFontSelectPreview.handleValueChange(value as FontFamily)}
            options={FONT_OPTIONS}
            triggerClassName={controlClassName}
            renderTriggerValue={baseFont}
            triggerValueStyle={{ fontFamily: getFontFamilyCss(baseFont) }}
            onOpenChange={baseFontSelectPreview.handleOpenChange}
            onContentPointerLeave={baseFontSelectPreview.handleContentPointerLeave}
            getItemStyle={(option) => ({ fontFamily: getFontFamilyCss(option.value as FontFamily) })}
            getItemPreviewProps={(value) => baseFontSelectPreview.getItemPreviewProps(value as FontFamily)}
          />
        </LabeledControlRow>
        <div className="space-y-1.5">
          <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>Rhythm</Label>
          <div
            role="listbox"
            aria-label="Type rhythm"
            className={typographyRhythmListClassName}
            onMouseLeave={clearTypographyScalePreview}
          >
            {TYPOGRAPHY_SCALE_OPTIONS.map((option) => {
              const displayLabel = splitParentheticalLabel(option.label)
              const selected = typographyScale === option.value
              if (option.value === "fibonacci") {
                return (
                  <div
                    key={option.value}
                    role="option"
                    tabIndex={0}
                    aria-selected={selected}
                    className={getSettingsOpenListOptionClassName(isDarkMode, selected)}
                    onFocus={() => handleTypographyScalePreview(option.value)}
                    onBlur={clearTypographyScalePreview}
                    onMouseEnter={() => handleTypographyScalePreview(option.value)}
                    onClick={() => onTypographyScaleChange(option.value)}
                    onKeyDown={handleFibonacciKeyDown}
                  >
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="min-w-0 truncate">{displayLabel.label}</span>
                      <button
                        type="button"
                        aria-label="Shift Fibonacci sequence left"
                        disabled={normalizedFibonacciStartIndex <= MIN_FIBONACCI_SEQUENCE_START_INDEX}
                        className="h-5 w-5 shrink-0 text-center text-[11px] leading-5 text-inherit disabled:opacity-30"
                        onClick={handleFibonacciSequenceStep(-1)}
                      >
                        &lt;
                      </button>
                      <button
                        type="button"
                        aria-label="Shift Fibonacci sequence right"
                        disabled={normalizedFibonacciStartIndex >= MAX_FIBONACCI_SEQUENCE_START_INDEX}
                        className="h-5 w-5 shrink-0 text-center text-[11px] leading-5 text-inherit disabled:opacity-30"
                        onClick={handleFibonacciSequenceStep(1)}
                      >
                        &gt;
                      </button>
                    </span>
                    <span className="ml-auto shrink-0 pl-3 text-right tabular-nums">
                      {formatFibonacciTypographySequence(normalizedFibonacciStartIndex)}
                    </span>
                  </div>
                )
              }
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={getSettingsOpenListOptionClassName(isDarkMode, selected)}
                  onFocus={() => handleTypographyScalePreview(option.value)}
                  onBlur={clearTypographyScalePreview}
                  onMouseEnter={() => handleTypographyScalePreview(option.value)}
                  onClick={() => onTypographyScaleChange(option.value)}
                >
                  <span className="min-w-0 truncate">{displayLabel.label}</span>
                  {displayLabel.detail ? (
                    <span className="ml-auto max-w-[58%] shrink-0 truncate pl-3 text-right tabular-nums">
                      {displayLabel.detail}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
        <div className={`border ${tableTone.frame}`}>
          {hierarchyRows.map((row, index) => (
            <div
              key={row.key}
              className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-3 py-2 text-[11px] ${index > 0 ? `border-t ${tableTone.row}` : ""}`}
            >
              <span className={`truncate ${tableTone.label}`}>{row.label}</span>
              <span className={`font-mono text-right tabular-nums ${tableTone.value}`}>
                {formatPtSize(row.size)}/{formatPtSize(row.leading)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  )
})

TypographyPanel.displayName = "TypographyPanel"
