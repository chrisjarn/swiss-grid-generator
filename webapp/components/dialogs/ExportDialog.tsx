import { Image as ImageIcon, LayoutGrid, Loader2, Rows3, SquareDashed, Type, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { ExportPreviewCanvas } from "@/components/dialogs/ExportPreviewCanvas"
import { Label } from "@/components/ui/label"
import { SectionHeaderRow } from "@/components/ui/section-header-row"
import {
  getCompactActionButtonClassName,
  getPopupInputClassName,
  getPopupMutedTextClassName,
  getPopupSurfaceClassName,
} from "@/components/ui/popup-styles"
import type { ExportProgressState } from "@/hooks/useExportActions"
import type { LoadedProject } from "@/lib/document-session"
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_OPTIONS,
  type ExportFormat,
} from "@/lib/export-format-options"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"
import { cn } from "@/lib/utils"

type Props = {
  isOpen: boolean
  onClose: () => void
  isDarkUi: boolean
  showBaselines: boolean
  onToggleBaselines: () => void
  showMargins: boolean
  onToggleMargins: () => void
  showModules: boolean
  onToggleModules: () => void
  showTypography: boolean
  onToggleTypography: () => void
  showImagePlaceholders: boolean
  onToggleImagePlaceholders: () => void
  exportRangeDraft: string
  onExportRangeChange: (value: string) => void
  onExportRangeCommit: () => boolean
  exportRangeStartDraft: number
  exportFormatDraft: ExportFormat
  onExportFormatChange: (value: ExportFormat) => void
  exportFilenameDraft: string
  onExportFilenameChange: (value: string) => void
  defaultFilename: string
  jsonTitleDraft: string
  onJsonTitleChange: (value: string) => void
  jsonDescriptionDraft: string
  onJsonDescriptionChange: (value: string) => void
  jsonAuthorDraft: string
  onJsonAuthorChange: (value: string) => void
  bleedEnabledDraft: boolean
  onBleedEnabledChange: (value: boolean) => void
  bleedWidthMmDraft: string
  onBleedWidthMmChange: (value: string) => void
  onConfirm: () => void
  exportProgress: ExportProgressState | null
  previewProject: LoadedProject<Record<string, unknown>>
}

export function ExportDialog({
  isOpen,
  onClose,
  isDarkUi,
  showBaselines,
  onToggleBaselines,
  showMargins,
  onToggleMargins,
  showModules,
  onToggleModules,
  showTypography,
  onToggleTypography,
  showImagePlaceholders,
  onToggleImagePlaceholders,
  exportRangeDraft,
  onExportRangeChange,
  onExportRangeCommit,
  exportRangeStartDraft,
  exportFormatDraft,
  onExportFormatChange,
  exportFilenameDraft,
  onExportFilenameChange,
  defaultFilename,
  jsonTitleDraft,
  onJsonTitleChange,
  jsonDescriptionDraft,
  onJsonDescriptionChange,
  jsonAuthorDraft,
  onJsonAuthorChange,
  bleedEnabledDraft,
  onBleedEnabledChange,
  bleedWidthMmDraft,
  onBleedWidthMmChange,
  onConfirm,
  exportProgress,
  previewProject,
}: Props) {
  const [isRangeInvalid, setIsRangeInvalid] = useState(false)
  const rangeInputRef = useRef<HTMLInputElement | null>(null)
  if (!isOpen) return null

  const compactInputClassName = getPopupInputClassName(isDarkUi, "rounded-sm px-2 py-1 text-[12px]")
  const helpTextClassName = `text-xs leading-relaxed ${getPopupMutedTextClassName(isDarkUi)}`
  const actionButtonClassName = getCompactActionButtonClassName({ isDarkMode: isDarkUi })
  const sectionGridClassName = "grid grid-cols-4 items-start gap-3"
  const centeredRowLabelClassName = `${SECTION_HEADLINE_CLASSNAME} flex h-8 items-center text-left leading-none`
  const isPdfExport = exportFormatDraft === "pdf"
  const isSvgExport = exportFormatDraft === "svg"
  const isJsonExport = exportFormatDraft === "json"
  const isVectorExport = exportFormatDraft !== "json"
  const isExporting = exportProgress !== null
  const showPageRangeControls = previewProject.pages.length > 1
  const totalProgressPercent = exportProgress
    ? Math.max(0, Math.min(100, Math.round((exportProgress.completedSteps / Math.max(1, exportProgress.totalSteps)) * 100)))
    : 0
  const focusRangeInput = () => {
    window.requestAnimationFrame(() => {
      rangeInputRef.current?.focus()
      rangeInputRef.current?.select()
    })
  }
  const commitRangeInput = () => {
    const isValid = onExportRangeCommit()
    setIsRangeInvalid(!isValid)
    if (!isValid) focusRangeInput()
    return isValid
  }
  const confirmExport = () => {
    if (!commitRangeInput()) return
    onConfirm()
  }
  const idleActionLabel = isPdfExport ? "Export PDF" : isSvgExport ? "Export SVG" : isJsonExport ? "Save JSON" : "Export IDML"
  const activeActionLabel = exportProgress
    ? exportProgress.currentLabel || idleActionLabel
    : idleActionLabel

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4 md:items-center"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        onClose()
      }}
    >
      <div className={getPopupSurfaceClassName(isDarkUi, "relative max-h-[90vh] w-full max-w-[29.4rem] overflow-y-auto [scrollbar-gutter:stable]")}>
        <div className={cn("absolute left-0 right-0 top-0 h-[3px]", isDarkUi ? "bg-[#313A47]" : "bg-gray-300")}>
          <div
            className="h-full bg-swiss-orange transition-[width] duration-200"
            style={{ width: isExporting ? `${totalProgressPercent}%` : "0%" }}
          />
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <SectionHeaderRow label="E X P O R T" />
            <p className={helpTextClassName}>
              Vector exports follow the current preview exactly, including guides, typography, and placeholders. JSON exports preserve the editable project document.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <SectionHeaderRow label="Input" className="items-start" />
              <div className="grid grid-cols-1 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showBaselines })} w-full`}
                  disabled={isExporting}
                  onClick={onToggleBaselines}
                  aria-label="Toggle baselines in export"
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showMargins })} w-full`}
                  disabled={isExporting}
                  onClick={onToggleMargins}
                  aria-label="Toggle margins in export"
                >
                  <SquareDashed className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showModules })} w-full`}
                  disabled={isExporting}
                  onClick={onToggleModules}
                  aria-label="Toggle modules in export"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showTypography })} w-full`}
                  disabled={isExporting}
                  onClick={onToggleTypography}
                  aria-label="Toggle typography in export"
                >
                  <Type className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showImagePlaceholders })} w-full`}
                  disabled={isExporting}
                  onClick={onToggleImagePlaceholders}
                  aria-label="Toggle image placeholders in export"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <SectionHeaderRow label="Preview" className="items-start" />
              <ExportPreviewCanvas
                project={previewProject}
                pageNumber={exportRangeStartDraft}
                visibilitySettings={{
                  showBaselines,
                  showModules,
                  showMargins,
                  showImagePlaceholders,
                  showTypography,
                }}
                isDarkUi={isDarkUi}
              />
            </div>

            <div className="space-y-2">
              <SectionHeaderRow label="Output" className="items-start" />
              <div className="grid grid-cols-1 gap-1.5">
                {EXPORT_FORMATS.map((format) => (
                  <Button
                    key={format}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: exportFormatDraft === format })} w-full`}
                    disabled={isExporting}
                    onClick={() => onExportFormatChange(format)}
                  >
                    {EXPORT_FORMAT_OPTIONS[format].label}
                  </Button>
                ))}
                {isVectorExport ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: bleedEnabledDraft })} w-full`}
                    disabled={isExporting}
                    onClick={() => onBleedEnabledChange(!bleedEnabledDraft)}
                    aria-pressed={bleedEnabledDraft}
                  >
                    Bleed
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {isVectorExport && bleedEnabledDraft ? (
            <div className={sectionGridClassName}>
              <Label className={centeredRowLabelClassName}>Bleed Width</Label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={bleedWidthMmDraft}
                onChange={(event) => onBleedWidthMmChange(event.target.value)}
                disabled={isExporting}
                className={`${compactInputClassName} col-span-3`}
              />
            </div>
          ) : null}

          {showPageRangeControls ? (
            <div className={sectionGridClassName}>
              <Label className={centeredRowLabelClassName}>Pages</Label>
              <input
                ref={rangeInputRef}
                type="text"
                value={exportRangeDraft}
                onChange={(event) => {
                  setIsRangeInvalid(false)
                  onExportRangeChange(event.target.value)
                }}
                onBlur={commitRangeInput}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  commitRangeInput()
                }}
                disabled={isExporting}
                className={cn(
                  compactInputClassName,
                  "col-span-3",
                  isRangeInvalid ? "border-[#f54123] ring-1 ring-[#f54123]" : "",
                )}
                placeholder="1-5;7;25;550-650"
                aria-invalid={isRangeInvalid}
              />
            </div>
          ) : null}

          <div className={sectionGridClassName}>
            <Label className={centeredRowLabelClassName}>Filename</Label>
            <input
              type="text"
              value={exportFilenameDraft}
              onChange={(event) => onExportFilenameChange(event.target.value)}
              disabled={isExporting}
              className={`${compactInputClassName} col-span-3`}
              placeholder={defaultFilename}
            />
          </div>

          <div className={sectionGridClassName}>
            <Label className={centeredRowLabelClassName}>Title</Label>
            <input
              type="text"
              value={jsonTitleDraft}
              onChange={(event) => onJsonTitleChange(event.target.value)}
              disabled={isExporting}
              className={`${compactInputClassName} col-span-3`}
              placeholder="Project title"
            />
            <Label className={`${SECTION_HEADLINE_CLASSNAME} flex min-h-20 items-start pt-2 text-left leading-none`}>Subject</Label>
            <textarea
              value={jsonDescriptionDraft}
              onChange={(event) => onJsonDescriptionChange(event.target.value)}
              disabled={isExporting}
              className={`${compactInputClassName} col-span-3 min-h-20 leading-[1.45]`}
              placeholder="Short subject"
            />
            <Label className={centeredRowLabelClassName}>Author</Label>
            <input
              type="text"
              value={jsonAuthorDraft}
              onChange={(event) => onJsonAuthorChange(event.target.value)}
              disabled={isExporting}
              className={`${compactInputClassName} col-span-3`}
              placeholder="Author name"
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-3">
            <Label className={centeredRowLabelClassName}>Actions</Label>
            <Button variant="outline" size="sm" className={`${actionButtonClassName} w-full`} onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" className={`${actionButtonClassName} col-span-2 w-full justify-center gap-1.5`} onClick={confirmExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{activeActionLabel}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
