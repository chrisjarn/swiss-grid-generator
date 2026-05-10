import { memo } from "react"
import { Label } from "@/shared/ui/label"
import { DebouncedSlider } from "@/shared/ui/slider"
import { PanelCard } from "@/gui/panels/settings/PanelCard"
import { Switch } from "@/shared/ui/switch"
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TopSelectContent,
} from "@/shared/ui/select"
import {
  GUTTER_MULTIPLE_RANGE,
  type GridRhythm,
  type GridRhythmColsDirection,
  type GridRhythmRowsDirection,
} from "@/lib/config/defaults"
import { useSelectRolloverPreview } from "@/gui/editors/hooks/useSelectRolloverPreview"
import {
  getSettingsControlClassName,
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  getSettingsValueBadgeClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
  SETTINGS_ROW_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"

const RHYTHM_OPTIONS: Array<{ value: GridRhythm; label: string; detail: string }> = [
  { value: "fibonacci", label: "Fibonacci", detail: "13:21:34:55:89" },
  { value: "golden", label: "Golden Ratio", detail: "1:1.618" },
  { value: "fifth", label: "Perfect Fifth", detail: "3:2" },
  { value: "fourth", label: "Perfect Fourth", detail: "4:3" },
  { value: "repetitive", label: "Repetitive", detail: "1:1:1:1" },
]

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  gridCols: number
  onGridColsChange: (value: number) => void
  gridRows: number
  onGridRowsChange: (value: number) => void
  gutterMultiple: number
  onGutterMultipleChange: (value: number) => void
  rhythm: GridRhythm
  onRhythmChange: (value: GridRhythm) => void
  onRhythmPreviewChange?: (value: GridRhythm | null) => void
  rhythmRowsEnabled: boolean
  onRhythmRowsEnabledChange: (value: boolean) => void
  rhythmRowsDirection: GridRhythmRowsDirection
  onRhythmRowsDirectionChange: (value: GridRhythmRowsDirection) => void
  onRhythmRowsDirectionPreviewChange?: (value: GridRhythmRowsDirection | null) => void
  rhythmColsEnabled: boolean
  onRhythmColsEnabledChange: (value: boolean) => void
  rhythmColsDirection: GridRhythmColsDirection
  onRhythmColsDirectionChange: (value: GridRhythmColsDirection) => void
  onRhythmColsDirectionPreviewChange?: (value: GridRhythmColsDirection | null) => void
  isDarkMode: boolean
}

export const GutterPanel = memo(function GutterPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  gridCols,
  onGridColsChange,
  gridRows,
  onGridRowsChange,
  gutterMultiple,
  onGutterMultipleChange,
  rhythm,
  onRhythmChange,
  onRhythmPreviewChange,
  rhythmRowsEnabled,
  onRhythmRowsEnabledChange,
  rhythmRowsDirection,
  onRhythmRowsDirectionChange,
  onRhythmRowsDirectionPreviewChange,
  rhythmColsEnabled,
  onRhythmColsEnabledChange,
  rhythmColsDirection,
  onRhythmColsDirectionChange,
  onRhythmColsDirectionPreviewChange,
  isDarkMode,
}: Props) {
  const rowsDirectionSelectPreview = useSelectRolloverPreview<GridRhythmRowsDirection>({
    value: rhythmRowsDirection,
    onCommitValue: onRhythmRowsDirectionChange,
    onPreviewValue: (value) => onRhythmRowsDirectionPreviewChange?.(value),
    onPreviewClear: () => onRhythmRowsDirectionPreviewChange?.(null),
  })
  const colsDirectionSelectPreview = useSelectRolloverPreview<GridRhythmColsDirection>({
    value: rhythmColsDirection,
    onCommitValue: onRhythmColsDirectionChange,
    onPreviewValue: (value) => onRhythmColsDirectionPreviewChange?.(value),
    onPreviewClear: () => onRhythmColsDirectionPreviewChange?.(null),
  })
  const controlClassName = getSettingsControlClassName(isDarkMode)
  const valueBadgeClassName = getSettingsValueBadgeClassName(isDarkMode)
  const rhythmListClassName = getSettingsOpenListClassName(isDarkMode)

  return (
    <PanelCard
      title="G R I D"
      tooltip="Grid columns, rows, gutter multiple, and rhythm controls; rhythm lists preview on rollover"
      collapsed={collapsed}
      collapsedSummary={`${gridCols} cols, ${gridRows} rows, ${gutterMultiple.toFixed(1)}x`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="gutter"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>Rhythms</Label>
        <div
          role="listbox"
          aria-label="Grid rhythm"
          className={rhythmListClassName}
          onMouseLeave={() => onRhythmPreviewChange?.(null)}
        >
          {RHYTHM_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={rhythm === option.value}
              className={getSettingsOpenListOptionClassName(isDarkMode, rhythm === option.value)}
              onFocus={() => onRhythmPreviewChange?.(option.value)}
              onBlur={() => onRhythmPreviewChange?.(null)}
              onMouseEnter={() => onRhythmPreviewChange?.(option.value)}
              onClick={() => onRhythmChange(option.value)}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              <span className="ml-auto shrink-0 pl-3 text-right tabular-nums">
                {option.detail}
              </span>
            </button>
          ))}
        </div>
      </div>
      {rhythm !== "repetitive" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Rows</Label>
              <Switch
                checked={rhythmRowsEnabled}
                onCheckedChange={onRhythmRowsEnabledChange}
                className="h-3 w-6 rounded-none border border-black bg-gray-300 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                thumbClassName="h-3 w-3 rounded-none border border-black bg-white shadow-none data-[state=checked]:translate-x-3"
              />
            </div>
            <Select
              value={rhythmRowsDirection}
              onOpenChange={rowsDirectionSelectPreview.handleOpenChange}
              onValueChange={rowsDirectionSelectPreview.handleValueChange}
              disabled={!rhythmRowsEnabled}
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent onPointerLeave={rowsDirectionSelectPreview.handleContentPointerLeave}>
                <SelectItem value="ltr" {...rowsDirectionSelectPreview.getItemPreviewProps("ltr")}>Left to right</SelectItem>
                <SelectItem value="rtl" {...rowsDirectionSelectPreview.getItemPreviewProps("rtl")}>Right to left</SelectItem>
              </TopSelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Cols</Label>
              <Switch
                checked={rhythmColsEnabled}
                onCheckedChange={onRhythmColsEnabledChange}
                className="h-3 w-6 rounded-none border border-black bg-gray-300 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                thumbClassName="h-3 w-3 rounded-none border border-black bg-white shadow-none data-[state=checked]:translate-x-3"
              />
            </div>
            <Select
              value={rhythmColsDirection}
              onOpenChange={colsDirectionSelectPreview.handleOpenChange}
              onValueChange={colsDirectionSelectPreview.handleValueChange}
              disabled={!rhythmColsEnabled}
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent onPointerLeave={colsDirectionSelectPreview.handleContentPointerLeave}>
                <SelectItem value="ttb" {...colsDirectionSelectPreview.getItemPreviewProps("ttb")}>Top to Bottom</SelectItem>
                <SelectItem value="btt" {...colsDirectionSelectPreview.getItemPreviewProps("btt")}>Bottom to top</SelectItem>
              </TopSelectContent>
            </Select>
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Columns</Label>
          <span className={valueBadgeClassName}>{gridCols}</span>
        </div>
        <DebouncedSlider
          value={[gridCols]}
          min={1}
          max={13}
          step={1}
          onValueCommit={([v]) => onGridColsChange(v)}
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Rows</Label>
          <span className={valueBadgeClassName}>{gridRows}</span>
        </div>
        <DebouncedSlider
          value={[gridRows]}
          min={1}
          max={13}
          step={1}
          onValueCommit={([v]) => onGridRowsChange(v)}
        />
      </div>
      <hr />
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className={SETTINGS_ROW_LABEL_CLASSNAME}>Gutter Multiple</Label>
          <span className={valueBadgeClassName}>
            {gutterMultiple}×
          </span>
        </div>
        <DebouncedSlider
          value={[gutterMultiple]}
          min={GUTTER_MULTIPLE_RANGE.min}
          max={GUTTER_MULTIPLE_RANGE.max}
          step={GUTTER_MULTIPLE_RANGE.step}
          onValueCommit={([v]) => onGutterMultipleChange(v)}
          onThumbDoubleClick={() => onGutterMultipleChange(1)}
        />
      </div>
    </PanelCard>
  )
})

GutterPanel.displayName = "GutterPanel"
