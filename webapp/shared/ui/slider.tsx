"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const TRACK_CLASS = "relative h-[2px] w-full grow overflow-hidden bg-primary/15"
const RANGE_CLASS = "absolute h-full min-w-[1px] min-h-[1px] bg-primary"
const THUMB_CLASS = "block h-3 w-3 cursor-pointer border border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
const VALUE_INPUT_CLASS = "h-5 border-0 text-right outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none"

function resolveRangeNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function snapValue(value: number, min: number, max: number, step: number): number {
  const resolvedStep = step > 0 ? step : 1
  const snapped = min + Math.round((value - min) / resolvedStep) * resolvedStep
  const precision = Math.max(0, String(resolvedStep).split(".")[1]?.length ?? 0)
  return Number(clampValue(snapped, min, max).toFixed(precision))
}

function snapValues(
  values: readonly number[],
  min: number,
  max: number,
  step: number,
): number[] {
  return values.map((value) => snapValue(value, min, max, step))
}

function buildFibonacciStops(min: number, max: number): number[] {
  const maxAbs = Math.max(Math.abs(min), Math.abs(max))
  const positiveStops = [0, 1, 2]
  while (positiveStops[positiveStops.length - 1] + positiveStops[positiveStops.length - 2] <= maxAbs) {
    positiveStops.push(positiveStops[positiveStops.length - 1] + positiveStops[positiveStops.length - 2])
  }
  const stops = new Set<number>()
  for (const stop of positiveStops) {
    if (stop >= min && stop <= max) stops.add(stop)
    if (stop !== 0 && -stop >= min && -stop <= max) stops.add(-stop)
  }
  return Array.from(stops).sort((a, b) => a - b)
}

function snapFibonacciValue(value: number, min: number, max: number): number {
  const clamped = clampValue(value, min, max)
  const stops = buildFibonacciStops(min, max)
  if (stops.length === 0) return clamped
  return stops.reduce((nearest, stop) => (
    Math.abs(stop - clamped) < Math.abs(nearest - clamped) ? stop : nearest
  ), stops[0])
}

function snapFibonacciValues(values: readonly number[], min: number, max: number): number[] {
  return values.map((value) => snapFibonacciValue(value, min, max))
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function parseSliderInput(value: string): number {
  const normalized = value.trim().replace(/\s+/g, "").replace(/,/g, ".")
  if (normalized.length === 0) return Number.NaN
  return Number(normalized)
}

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  onThumbDoubleClick?: React.MouseEventHandler<HTMLSpanElement>
  shiftStep?: number
  fibonacciStep?: boolean
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({
  className,
  min,
  max,
  step,
  shiftStep,
  fibonacciStep,
  onThumbDoubleClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  onValueChange,
  onValueCommit,
  ...props
}, ref) => {
  const modifierRef = React.useRef({ alt: false, shift: false })
  const resolvedMin = resolveRangeNumber(min, 0)
  const resolvedMax = resolveRangeNumber(max, 100)
  const resolvedStep = resolveRangeNumber(step, 1)

  const normalizeValues = React.useCallback((values: number[]) => {
    if (fibonacciStep && modifierRef.current.alt && modifierRef.current.shift) {
      return snapFibonacciValues(values, resolvedMin, resolvedMax)
    }
    return snapValues(
      values,
      resolvedMin,
      resolvedMax,
      modifierRef.current.shift && shiftStep ? shiftStep : resolvedStep,
    )
  }, [fibonacciStep, resolvedMax, resolvedMin, resolvedStep, shiftStep])

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer touch-none select-none items-center",
        className
      )}
      min={min}
      max={max}
      step={step}
      onPointerDown={(event) => {
        modifierRef.current = { alt: event.altKey, shift: event.shiftKey }
        onPointerDown?.(event)
      }}
      onPointerMove={(event) => {
        modifierRef.current = { alt: event.altKey, shift: event.shiftKey }
        onPointerMove?.(event)
      }}
      onPointerUp={(event) => {
        modifierRef.current = { alt: false, shift: false }
        onPointerUp?.(event)
      }}
      onPointerCancel={(event) => {
        modifierRef.current = { alt: false, shift: false }
        onPointerCancel?.(event)
      }}
      onKeyDown={(event) => {
        modifierRef.current = { alt: event.altKey, shift: event.shiftKey }
        onKeyDown?.(event)
      }}
      onKeyUp={(event) => {
        modifierRef.current = { alt: event.altKey, shift: event.shiftKey }
        onKeyUp?.(event)
      }}
      onValueChange={(values) => onValueChange?.(normalizeValues(values))}
      onValueCommit={(values) => onValueCommit?.(normalizeValues(values))}
      {...props}
    >
      <SliderPrimitive.Track className={TRACK_CLASS}>
        <SliderPrimitive.Range className={RANGE_CLASS} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={THUMB_CLASS} onDoubleClick={onThumbDoubleClick} />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

type DebouncedSliderProps = Omit<
  SliderProps,
  "value" | "onValueChange" | "onValueCommit"
> & {
  value: number[]
  onValueCommit: (value: number[]) => void
  onValueChange?: (value: number[]) => void
  defaultValue?: number[]
}

function DebouncedSlider({
  value,
  onValueCommit,
  onValueChange,
  defaultValue,
  className,
  onThumbDoubleClick,
  min,
  max,
  step,
  ...props
}: DebouncedSliderProps) {
  const [localValue, setLocalValue] = React.useState(value)
  const dragging = React.useRef(false)
  const lastEmittedRef = React.useRef<number[] | null>(null)
  const resolvedMin = resolveRangeNumber(min, 0)
  const resolvedMax = resolveRangeNumber(max, 100)
  const resolvedStep = resolveRangeNumber(step, 1)

  const commitValue = React.useCallback((nextValue: number[]) => {
    const snapped = snapValues(nextValue, resolvedMin, resolvedMax, resolvedStep)
    setLocalValue(snapped)
    onValueChange?.(snapped)
    onValueCommit(snapped)
  }, [onValueChange, onValueCommit, resolvedMax, resolvedMin, resolvedStep])

  // Sync from parent when not dragging (e.g. undo/redo, preset load)
  React.useEffect(() => {
    if (!dragging.current) setLocalValue(value)
  }, [value])

  return (
    <Slider
      className={className}
      value={localValue}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => {
        dragging.current = true
        setLocalValue(v)
        lastEmittedRef.current = v
        onValueChange?.(v)
        onValueCommit(v)
      }}
      onValueCommit={(v) => {
        dragging.current = false
        if (!lastEmittedRef.current || !arraysEqual(lastEmittedRef.current, v)) {
          onValueChange?.(v)
          onValueCommit(v)
        }
        lastEmittedRef.current = null
      }}
      onThumbDoubleClick={(event) => {
        if (defaultValue) {
          event.preventDefault()
          commitValue(defaultValue)
          return
        }
        onThumbDoubleClick?.(event)
      }}
      {...props}
    />
  )
}

type EditableSliderProps = DebouncedSliderProps & {
  label: React.ReactNode
  inputAriaLabel: string
  formatValue?: (value: number) => string
  parseValue?: (value: string) => number
  labelClassName?: string
  valueClassName?: string
  inputClassName?: string
  rowClassName?: string
  containerClassName?: string
}

function EditableSlider({
  label,
  inputAriaLabel,
  formatValue = (value) => String(value),
  parseValue = parseSliderInput,
  labelClassName,
  valueClassName,
  inputClassName,
  rowClassName,
  containerClassName,
  value,
  min,
  max,
  step,
  className,
  onValueChange,
  onValueCommit,
  ...sliderProps
}: EditableSliderProps) {
  const [editing, setEditing] = React.useState(false)
  const [draftInput, setDraftInput] = React.useState("")
  const [hovered, setHovered] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const [focusVisibleWithin, setFocusVisibleWithin] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const resolvedMin = resolveRangeNumber(min, 0)
  const resolvedMax = resolveRangeNumber(max, 100)
  const resolvedStep = resolveRangeNumber(step, 1)
  const currentValue = value[0] ?? resolvedMin
  const {
    onPointerDown: sliderPointerDown,
    onPointerUp: sliderPointerUp,
    onPointerCancel: sliderPointerCancel,
    ...resolvedSliderProps
  } = sliderProps
  const showSlider = hovered || dragging || focusVisibleWithin
  const valueSlotWidth = React.useMemo(() => {
    const formattedValues = [
      formatValue(currentValue),
      formatValue(resolvedMin),
      formatValue(resolvedMax),
    ]
    const maxLength = Math.max(...formattedValues.map((formatted) => formatted.length))
    return `${Math.max(4, maxLength + 1)}ch`
  }, [currentValue, formatValue, resolvedMax, resolvedMin])

  React.useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  React.useEffect(() => {
    if (!dragging) return
    const endDrag = () => setDragging(false)
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
    return () => {
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
    }
  }, [dragging])

  const openEditor = React.useCallback(() => {
    setDraftInput(String(currentValue))
    setEditing(true)
  }, [currentValue])

  const cancelEditor = React.useCallback(() => {
    setDraftInput("")
    setEditing(false)
  }, [])

  const commitEditor = React.useCallback(() => {
    const parsed = parseValue(draftInput)
    if (!Number.isFinite(parsed)) {
      cancelEditor()
      return
    }
    const nextValue = snapValue(parsed, resolvedMin, resolvedMax, resolvedStep)
    const nextValues = [nextValue]
    onValueChange?.(nextValues)
    onValueCommit(nextValues)
    setDraftInput("")
    setEditing(false)
  }, [
    cancelEditor,
    draftInput,
    onValueChange,
    onValueCommit,
    parseValue,
    resolvedMax,
    resolvedMin,
    resolvedStep,
  ])

  return (
    <div
      className={containerClassName}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return
        setFocusVisibleWithin(false)
      }}
      onFocusCapture={(event) => {
        if (event.target instanceof HTMLElement) {
          setFocusVisibleWithin(event.target.matches(":focus-visible"))
        }
      }}
    >
      <div className={cn("grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-3", rowClassName)}>
        <div className="relative min-h-8 min-w-0">
          <span
            className={cn(
              "pointer-events-none absolute inset-0",
              showSlider ? "opacity-0" : "opacity-100",
              labelClassName,
            )}
          >
            {label}
          </span>
          <DebouncedSlider
            value={value}
            min={min}
            max={max}
            step={step}
            onValueChange={onValueChange}
            onValueCommit={onValueCommit}
            className={cn(
              "absolute inset-x-0 top-1/2 -translate-y-1/2",
              showSlider ? "opacity-100" : "opacity-0",
              className,
            )}
            onPointerDown={(event) => {
              setDragging(true)
              sliderPointerDown?.(event)
            }}
            onPointerUp={(event) => {
              setDragging(false)
              sliderPointerUp?.(event)
            }}
            onPointerCancel={(event) => {
              setDragging(false)
              sliderPointerCancel?.(event)
            }}
            {...resolvedSliderProps}
          />
        </div>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draftInput}
            onChange={(event) => setDraftInput(event.target.value)}
            onBlur={commitEditor}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                cancelEditor()
                return
              }
              if (event.key !== "Enter") return
              event.preventDefault()
              commitEditor()
            }}
            className={cn(valueClassName, VALUE_INPUT_CLASS, inputClassName)}
            style={{ width: valueSlotWidth }}
            aria-label={inputAriaLabel}
          />
        ) : (
          <button
            type="button"
            className={cn("shrink-0 cursor-text text-right", valueClassName)}
            style={{ width: valueSlotWidth }}
            onClick={openEditor}
            aria-label={inputAriaLabel}
          >
            {formatValue(currentValue)}
          </button>
        )}
      </div>
    </div>
  )
}

export { Slider, DebouncedSlider, EditableSlider }
