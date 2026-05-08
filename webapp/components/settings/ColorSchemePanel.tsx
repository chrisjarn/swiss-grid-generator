import { memo, useState } from "react"
import { Label } from "@/components/ui/label"
import { PanelCard } from "@/components/settings/PanelCard"
import {
  getClosestImageSchemeColorToken,
  getImageSchemeColorToken,
  getImageColorScheme,
  IMAGE_COLOR_SCHEMES,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import {
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
} from "@/components/settings/settings-panel-styles"

const COLOR_SLOT_LABELS = ["Paper", "Light", "Mid", "Dark"] as const
const NO_BACKGROUND_VALUE = "__none__"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  colorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  onColorSchemePreviewChange?: (value: ImageColorSchemeId | null) => void
  canvasBackground: string | null
  onCanvasBackgroundChange: (value: string | null) => void
  onCanvasBackgroundPreviewChange?: (value: string | null) => void
  isDarkMode: boolean
}

export const ColorSchemePanel = memo(function ColorSchemePanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  colorScheme,
  onColorSchemeChange,
  onColorSchemePreviewChange,
  canvasBackground,
  onCanvasBackgroundChange,
  onCanvasBackgroundPreviewChange,
  isDarkMode,
}: Props) {
  const selected = getImageColorScheme(colorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const displayedScheme = previewColorScheme ? getImageColorScheme(previewColorScheme) : selected
  const backgroundOptionValues = displayedScheme.colors.map((_, index) => getImageSchemeColorToken(index))
  const backgroundSelectValue = canvasBackground === null
    ? NO_BACKGROUND_VALUE
    : getClosestImageSchemeColorToken(canvasBackground, colorScheme)
  const colorSchemeListClassName = getSettingsOpenListClassName(isDarkMode)
  const backgroundRingOffsetClassName = isDarkMode ? "ring-offset-[#151A21]" : "ring-offset-white"
  const handleColorSchemePreview = (value: ImageColorSchemeId) => {
    setPreviewColorScheme(value)
    onColorSchemePreviewChange?.(value)
  }
  const clearColorSchemePreview = () => {
    setPreviewColorScheme(null)
    onColorSchemePreviewChange?.(null)
  }

  return (
    <PanelCard
      title="C O L O R"
      tooltip="Color scheme and page background swatches for image placeholders; scheme list and swatches preview on rollover"
      collapsed={collapsed}
      collapsedSummary={(
        <div className="flex items-center gap-1.5">
          {selected.colors.map((color, index) => (
            <span
              key={`collapsed-${selected.id}-${index}-${color}`}
              className={`inline-block h-2.5 w-5 rounded-sm border ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="color"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>BASE SCHEME</Label>
        <div
          role="listbox"
          aria-label="Base scheme"
          className={colorSchemeListClassName}
          onMouseLeave={clearColorSchemePreview}
        >
          {IMAGE_COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              role="option"
              aria-selected={colorScheme === scheme.id}
              className={getSettingsOpenListOptionClassName(isDarkMode, colorScheme === scheme.id)}
              onFocus={() => handleColorSchemePreview(scheme.id)}
              onBlur={clearColorSchemePreview}
              onMouseEnter={() => handleColorSchemePreview(scheme.id)}
              onClick={() => {
                onColorSchemeChange(scheme.id)
                clearColorSchemePreview()
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
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className={SETTINGS_OPEN_LIST_LABEL_CLASSNAME}>Background</Label>
        <div
          className="grid grid-cols-4 gap-2"
          onMouseLeave={() => onCanvasBackgroundPreviewChange?.(null)}
        >
          {displayedScheme.colors.map((color, index) => {
            const token = backgroundOptionValues[index] ?? getImageSchemeColorToken(index)
            const selectedBackground = backgroundSelectValue === token
            return (
              <div
                key={`background-${displayedScheme.id}-${index}-${color}`}
                className="flex flex-col items-start gap-1"
              >
                <button
                  type="button"
                  aria-label={`Toggle ${COLOR_SLOT_LABELS[index]} page background`}
                  aria-pressed={selectedBackground}
                  title={color}
                  className={`h-5 w-full rounded-sm border transition-colors active:translate-y-px ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  } ${selectedBackground ? `ring-2 ring-gray-500 ring-offset-1 ${backgroundRingOffsetClassName}` : ""}`}
                  style={{ backgroundColor: color }}
                  onFocus={() => onCanvasBackgroundPreviewChange?.(token)}
                  onBlur={() => onCanvasBackgroundPreviewChange?.(null)}
                  onMouseEnter={() => onCanvasBackgroundPreviewChange?.(token)}
                  onClick={() => {
                    onCanvasBackgroundChange(selectedBackground ? null : token)
                    onCanvasBackgroundPreviewChange?.(null)
                  }}
                />
                <span className={`w-full text-left text-[9px] font-mono leading-none ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {color.toLowerCase()}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </PanelCard>
  )
})

ColorSchemePanel.displayName = "ColorSchemePanel"
