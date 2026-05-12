import { memo, useState } from "react"
import { Info } from "lucide-react"
import { Label } from "@/shared/ui/label"
import { PREVIEW_STYLE_OPTIONS, formatPtSize } from "@/gui/preview/lib/preview-text-config"
import {
  MAX_FIBONACCI_SEQUENCE_START_INDEX,
  MIN_FIBONACCI_SEQUENCE_START_INDEX,
  clampFibonacciSequenceStartIndex,
  formatFibonacciTypographySequence,
  generateTypographyStyles,
  TYPOGRAPHY_SCALE_LABELS,
} from "@/core/layout/grid-calculator"
import type { GridResult } from "@/core/layout/grid-calculator"
import { FONT_OPTIONS, getFontFamilyCss, type FontFamily } from "@/core/config/fonts"
import type { TypographyScale } from "@/core/config/defaults"
import { PanelCard } from "@/gui/panels/settings/PanelCard"
import { useSelectRolloverPreview } from "@/gui/editors/hooks/useSelectRolloverPreview"
import {
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"
import { useTranslation } from "@/lib/i18n"

const TYPOGRAPHY_SCALE_OPTIONS: Array<{ value: TypographyScale; label: string }> = Object
  .entries(TYPOGRAPHY_SCALE_LABELS)
  .map(([value, label]) => ({ value: value as TypographyScale, label }))
  .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))

const FONT_GROUPS = [
  { key: "Sans-Serif", labelKey: "ui.editor.fontGroups.sansSerif" },
  { key: "Serif", labelKey: "ui.editor.fontGroups.serif" },
  { key: "Display", labelKey: "ui.editor.fontGroups.poster" },
] as const

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
  const { t } = useTranslation()
  const [previewTypographyScale, setPreviewTypographyScale] = useState<TypographyScale | null>(null)
  const [showHierarchyTable, setShowHierarchyTable] = useState(false)
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
  const fontFamilyListClassName = getSettingsOpenListClassName(isDarkMode)
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
      title={t("ui.panels.typography.title")}
      tooltip={t("ui.panels.typography.tooltip")}
      collapsed={collapsed}
      collapsedSummary={`${activeTypographyScaleLabel}, ${baseFont}`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="typo"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <div className="space-y-1.5">
          <div className="flex h-7 items-center justify-between">
            <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>{t("ui.panels.typography.rhythm")}</Label>
            <button
              type="button"
              aria-label={t("ui.panels.typography.toggleHierarchy")}
              aria-pressed={showHierarchyTable}
              className={`inline-flex h-5 w-5 items-center justify-center rounded-sm transition-colors ${
                showHierarchyTable
                  ? isDarkMode
                    ? "bg-swiss-orange-soft/20 text-[#F4F6F8]"
                    : "bg-swiss-orange-soft/15 text-[#9d4039]"
                  : isDarkMode
                    ? "text-gray-400 hover:bg-[#1D232D] hover:text-[#F4F6F8]"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
              }`}
              onClick={() => setShowHierarchyTable((current) => !current)}
            >
              <Info className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
          <div
            role="listbox"
            aria-label={t("ui.panels.typography.rhythmAria")}
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
                        aria-label={t("ui.panels.typography.shiftFibonacciLeft")}
                        disabled={normalizedFibonacciStartIndex <= MIN_FIBONACCI_SEQUENCE_START_INDEX}
                        className="h-5 w-5 shrink-0 text-center text-[11px] leading-5 text-inherit disabled:opacity-30"
                        onClick={handleFibonacciSequenceStep(-1)}
                      >
                        &lt;
                      </button>
                      <button
                        type="button"
                        aria-label={t("ui.panels.typography.shiftFibonacciRight")}
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
        {showHierarchyTable ? (
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
        ) : null}
        <div className="space-y-1.5">
          <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>{t("ui.panels.typography.base")}</Label>
          <div
            role="listbox"
            aria-label={t("ui.panels.typography.base")}
            className={fontFamilyListClassName}
            onMouseLeave={baseFontSelectPreview.handleContentPointerLeave}
          >
            {FONT_GROUPS.map((group) => {
              const groupOptions = FONT_OPTIONS.filter((option) => option.category === group.key)
              if (!groupOptions.length) return null
              return (
                <div
                  key={group.key}
                  className="grid grid-cols-[5.25rem_minmax(0,1fr)]"
                >
                  <div className={`px-2 py-2 text-left text-[10px] font-semibold uppercase leading-none tracking-[0.16em] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {t(group.labelKey)}
                  </div>
                  <div>
                    {groupOptions.map((option) => {
                      const value = option.value as FontFamily
                      const selected = baseFont === value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`${getSettingsOpenListOptionClassName(isDarkMode, selected)} justify-end text-right`}
                          style={{ fontFamily: getFontFamilyCss(value) }}
                          onBlur={baseFontSelectPreview.handleContentPointerLeave}
                          onClick={() => baseFontSelectPreview.handleValueChange(value)}
                          {...baseFontSelectPreview.getItemPreviewProps(value)}
                        >
                          <span className="min-w-0 truncate">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </PanelCard>
  )
})

TypographyPanel.displayName = "TypographyPanel"
