"use client"

import { Label } from "@/shared/ui/label"
import {
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"

type PreviewItemHandlers = {
  onFocus?: () => void
  onMouseEnter?: () => void
  onMouseMove?: () => void
  onPointerEnter?: () => void
  onPointerMove?: () => void
}

type ColorSchemeOption = {
  id: string
  label: string
  colors: readonly string[]
}

type Props = {
  schemes: readonly ColorSchemeOption[]
  schemeValue: string
  onSchemeValueChange: (value: string) => void
  onSchemeContentPointerLeave: () => void
  getSchemeItemPreviewProps: (value: string) => PreviewItemHandlers
  displayedColors: readonly string[]
  selectedColor: string
  onColorSelect: (value: string) => void
  isDarkMode: boolean
  ringOffsetClassName?: string
}

export function EditorColorSchemeControls({
  schemes,
  schemeValue,
  onSchemeValueChange,
  onSchemeContentPointerLeave,
  getSchemeItemPreviewProps,
  displayedColors,
  selectedColor,
  onColorSelect,
  isDarkMode,
  ringOffsetClassName = "",
}: Props) {
  const colorSchemeListClassName = getSettingsOpenListClassName(isDarkMode)

  return (
    <>
      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>COLOR</Label>
        <div className="grid grid-cols-4 gap-2">
          {displayedColors.map((color, index) => {
            const selected = selectedColor.toLowerCase() === color.toLowerCase()
            return (
              <div
                key={`${schemeValue}-${index}-${color}`}
                className="flex flex-col items-start gap-1"
              >
                <button
                  type="button"
                  onClick={() => onColorSelect(color)}
                  className={`h-5 w-full rounded-sm border ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  } ${selected ? `ring-2 ring-gray-500 ring-offset-1 ${ringOffsetClassName}` : ""}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select ${color}`}
                  title={color}
                />
                <span className={`w-full text-left text-[9px] font-mono leading-none ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {color.toLowerCase()}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>BASE SCHEME</Label>
        <div
          role="listbox"
          aria-label="Base scheme"
          className={colorSchemeListClassName}
          onMouseLeave={onSchemeContentPointerLeave}
          onPointerLeave={onSchemeContentPointerLeave}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              onSchemeContentPointerLeave()
            }
          }}
        >
          {schemes.map((scheme) => {
            const previewProps = getSchemeItemPreviewProps(scheme.id)
            return (
              <button
                key={scheme.id}
                type="button"
                role="option"
                aria-selected={schemeValue === scheme.id}
                className={getSettingsOpenListOptionClassName(isDarkMode, schemeValue === scheme.id)}
                onFocus={previewProps.onFocus}
                onMouseEnter={previewProps.onMouseEnter ?? previewProps.onMouseMove}
                onMouseMove={previewProps.onMouseMove}
                onPointerEnter={previewProps.onPointerEnter ?? previewProps.onPointerMove}
                onPointerMove={previewProps.onPointerMove}
                onClick={() => {
                  onSchemeValueChange(scheme.id)
                  onSchemeContentPointerLeave()
                }}
              >
                <span className="min-w-0 truncate">{scheme.label}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1 pl-3">
                  {scheme.colors.map((color, index) => (
                    <span
                      key={`${scheme.id}-${index}-${color}`}
                      className={`h-3 w-5 rounded-sm border ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
