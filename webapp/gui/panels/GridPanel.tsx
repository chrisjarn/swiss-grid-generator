"use client"

import { memo } from "react"

import type { GridConfig } from "@/core/types/grid"
import {
  GUTTER_MULTIPLE_RANGE,
  type GridRhythm,
  type GridRhythmColsDirection,
  type GridRhythmRowsDirection,
} from "@/lib/config/defaults"
import { Label } from "@/shared/ui/label"
import { DebouncedSlider } from "@/shared/ui/slider"
import { Switch } from "@/shared/ui/switch"
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TopSelectContent,
} from "@/shared/ui/select"

export type GridPanelValue = Pick<
  GridConfig,
  | "gridCols"
  | "gridRows"
  | "gutterMultiple"
  | "rhythm"
  | "rhythmRowsEnabled"
  | "rhythmRowsDirection"
  | "rhythmColsEnabled"
  | "rhythmColsDirection"
>

type GridPanelProps = {
  value: GridPanelValue
  onChange: (patch: Partial<GridPanelValue>) => void
  onPreviewChange?: (patch: Partial<GridPanelValue> | null) => void
  disabled?: boolean
}

const RHYTHM_OPTIONS: Array<{ value: GridRhythm; label: string; detail: string }> = [
  { value: "fibonacci", label: "Fibonacci", detail: "13:21:34:55:89" },
  { value: "golden", label: "Golden Ratio", detail: "1:1.618" },
  { value: "fifth", label: "Perfect Fifth", detail: "3:2" },
  { value: "fourth", label: "Perfect Fourth", detail: "4:3" },
  { value: "repetitive", label: "Repetitive", detail: "1:1:1:1" },
]

const ROW_DIRECTION_OPTIONS: Array<{ value: GridRhythmRowsDirection; label: string }> = [
  { value: "ltr", label: "Left to right" },
  { value: "rtl", label: "Right to left" },
]

const COL_DIRECTION_OPTIONS: Array<{ value: GridRhythmColsDirection; label: string }> = [
  { value: "ttb", label: "Top to bottom" },
  { value: "btt", label: "Bottom to top" },
]

const labelClassName = "text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
const valueClassName = "font-mono text-[11px] tabular-nums text-neutral-800"
const controlClassName = "h-8 rounded-sm border-neutral-300 bg-white text-[12px]"
const rhythmButtonClassName =
  "grid h-7 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 text-left text-[12px] leading-none transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50"

function sliderValue(value: number): [number] {
  return [value]
}

export const GridPanel = memo(function GridPanel({
  value,
  onChange,
  onPreviewChange,
  disabled = false,
}: GridPanelProps) {
  const rhythmUsesAxes = value.rhythm !== "repetitive"

  return (
    <section className="space-y-5 px-6 py-5 text-neutral-950" data-panel="grid">
      <header className="border-b border-neutral-200 pb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-700">
          Grid
        </h2>
      </header>

      <div className="space-y-2">
        <Label className={labelClassName}>Rhythm</Label>
        <div
          role="listbox"
          aria-label="Grid rhythm"
          className="overflow-hidden rounded-sm border border-neutral-300 bg-white"
          onMouseLeave={() => onPreviewChange?.(null)}
        >
          {RHYTHM_OPTIONS.map((option) => {
            const selected = value.rhythm === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                className={`${rhythmButtonClassName} ${
                  selected ? "bg-neutral-950 text-white hover:bg-neutral-950" : "text-neutral-900"
                }`}
                onFocus={() => onPreviewChange?.({ rhythm: option.value })}
                onBlur={() => onPreviewChange?.(null)}
                onMouseEnter={() => onPreviewChange?.({ rhythm: option.value })}
                onClick={() => onChange({ rhythm: option.value })}
              >
                <span className="truncate">{option.label}</span>
                <span className={selected ? "text-white/75" : "text-neutral-500"}>{option.detail}</span>
              </button>
            )
          })}
        </div>
      </div>

      {rhythmUsesAxes ? (
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex h-6 items-center justify-between">
              <Label className={labelClassName}>Rows</Label>
              <Switch
                checked={value.rhythmRowsEnabled}
                disabled={disabled}
                onCheckedChange={(rhythmRowsEnabled) => onChange({ rhythmRowsEnabled })}
                className="h-4 w-7 rounded-sm"
                thumbClassName="h-3 w-3 rounded-sm data-[state=checked]:translate-x-3"
              />
            </div>
            <Select
              value={value.rhythmRowsDirection}
              disabled={disabled || !value.rhythmRowsEnabled}
              onValueChange={(rhythmRowsDirection: GridRhythmRowsDirection) => onChange({ rhythmRowsDirection })}
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent>
                {ROW_DIRECTION_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    onMouseEnter={() => onPreviewChange?.({ rhythmRowsDirection: option.value })}
                    onFocus={() => onPreviewChange?.({ rhythmRowsDirection: option.value })}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex h-6 items-center justify-between">
              <Label className={labelClassName}>Columns</Label>
              <Switch
                checked={value.rhythmColsEnabled}
                disabled={disabled}
                onCheckedChange={(rhythmColsEnabled) => onChange({ rhythmColsEnabled })}
                className="h-4 w-7 rounded-sm"
                thumbClassName="h-3 w-3 rounded-sm data-[state=checked]:translate-x-3"
              />
            </div>
            <Select
              value={value.rhythmColsDirection}
              disabled={disabled || !value.rhythmColsEnabled}
              onValueChange={(rhythmColsDirection: GridRhythmColsDirection) => onChange({ rhythmColsDirection })}
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent>
                {COL_DIRECTION_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    onMouseEnter={() => onPreviewChange?.({ rhythmColsDirection: option.value })}
                    onFocus={() => onPreviewChange?.({ rhythmColsDirection: option.value })}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex h-6 items-center justify-between">
            <Label className={labelClassName}>Columns</Label>
            <span className={valueClassName}>{value.gridCols}</span>
          </div>
          <DebouncedSlider
            value={sliderValue(value.gridCols)}
            min={1}
            max={13}
            step={1}
            disabled={disabled}
            onValueCommit={([gridCols]) => onChange({ gridCols })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex h-6 items-center justify-between">
            <Label className={labelClassName}>Rows</Label>
            <span className={valueClassName}>{value.gridRows}</span>
          </div>
          <DebouncedSlider
            value={sliderValue(value.gridRows)}
            min={1}
            max={13}
            step={1}
            disabled={disabled}
            onValueCommit={([gridRows]) => onChange({ gridRows })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex h-6 items-center justify-between">
            <Label className={labelClassName}>Gutter</Label>
            <span className={valueClassName}>{value.gutterMultiple.toFixed(1)}x</span>
          </div>
          <DebouncedSlider
            value={sliderValue(value.gutterMultiple)}
            min={GUTTER_MULTIPLE_RANGE.min}
            max={GUTTER_MULTIPLE_RANGE.max}
            step={GUTTER_MULTIPLE_RANGE.step}
            disabled={disabled}
            onValueCommit={([gutterMultiple]) => onChange({ gutterMultiple })}
            onThumbDoubleClick={() => onChange({ gutterMultiple: 1 })}
          />
        </div>
      </div>
    </section>
  )
})

GridPanel.displayName = "GridPanel"
