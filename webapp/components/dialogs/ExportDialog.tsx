import { ChevronUp, Image as ImageIcon, LayoutGrid, Rows3, SquareDashed, Type } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SectionHeaderRow } from "@/components/ui/section-header-row"
import {
  getCompactActionButtonClassName,
  getPopupInputClassName,
  getPopupMutedTextClassName,
  getPopupSurfaceClassName,
} from "@/components/ui/popup-styles"
import type { ExportProgressState } from "@/hooks/useExportActions"
import type { ExportFormat } from "@/lib/export-format-options"
import { cn } from "@/lib/utils"

type Props = {
  isOpen: boolean
  onClose: () => void
  isDarkUi: boolean
  selectedPageCount: number
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
  pageRangeOptions: Array<{ value: string; label: string }>
  exportRangeStartDraft: number
  onExportRangeStartChange: (value: string) => void
  exportRangeEndDraft: number
  onExportRangeEndChange: (value: string) => void
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
  jsonCompressionEnabledDraft: boolean
  onJsonCompressionEnabledChange: (value: boolean) => void
  bleedEnabledDraft: boolean
  onBleedEnabledChange: (value: boolean) => void
  exportBleedMmDraft: string
  onExportBleedMmChange: (value: string) => void
  onConfirm: () => void
  exportProgress: ExportProgressState | null
}

export function ExportDialog({
  isOpen,
  onClose,
  isDarkUi,
  selectedPageCount,
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
  pageRangeOptions,
  exportRangeStartDraft,
  onExportRangeStartChange,
  exportRangeEndDraft,
  onExportRangeEndChange,
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
  jsonCompressionEnabledDraft,
  onJsonCompressionEnabledChange,
  bleedEnabledDraft,
  onBleedEnabledChange,
  exportBleedMmDraft,
  onExportBleedMmChange,
  onConfirm,
  exportProgress,
}: Props) {
  const [isMetadataOpen, setIsMetadataOpen] = useState(false)
  const [exportStartedAt, setExportStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  useEffect(() => {
    if (!exportProgress) {
      setExportStartedAt(null)
      setElapsedMs(0)
      return
    }
    const startedAt = exportStartedAt ?? performance.now()
    if (exportStartedAt === null) setExportStartedAt(startedAt)
    const updateElapsed = () => setElapsedMs(performance.now() - startedAt)
    updateElapsed()
    const interval = window.setInterval(updateElapsed, 250)
    return () => window.clearInterval(interval)
  }, [exportProgress, exportStartedAt])
  if (!isOpen) return null

  const compactInputClassName = getPopupInputClassName(isDarkUi, "rounded-sm px-2 py-1 text-[12px]")
  const helpTextClassName = `text-xs leading-relaxed ${getPopupMutedTextClassName(isDarkUi)}`
  const dialogThemeClassName = isDarkUi ? "dark" : undefined
  const actionButtonClassName = getCompactActionButtonClassName({ isDarkMode: isDarkUi })
  const isPdfExport = exportFormatDraft === "pdf"
  const isSvgExport = exportFormatDraft === "svg"
  const isJsonExport = exportFormatDraft === "json"
  const isVectorExport = exportFormatDraft !== "json"
  const isMultiPageSelection = selectedPageCount > 1
  const isExporting = exportProgress !== null
  const closedMetadataFormatSectionClassName = !isMetadataOpen ? "min-h-[196px]" : ""
  const totalProgressPercent = exportProgress
    ? Math.max(0, Math.min(100, Math.round((exportProgress.completedSteps / Math.max(1, exportProgress.totalSteps)) * 100)))
    : 0
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`
  const exportProgressTitle = exportProgress
    ? exportProgress.phase === "preparing"
      ? `${exportProgress.format.toUpperCase()} prepare`
      : exportProgress.phase === "packaging"
        ? `${exportProgress.format.toUpperCase()} finalize`
        : `${exportProgress.format.toUpperCase()} render pages ${exportProgress.completedSteps} / ${Math.max(1, exportProgress.totalSteps)}`
    : ""

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4 md:items-center"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        onClose()
      }}
    >
      <div className={getPopupSurfaceClassName(isDarkUi, "flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden")}>
        <div className={cn("shrink-0 space-y-4 border-b pb-4", isDarkUi ? "border-[#313A47]" : "border-gray-200")}>
          <div className="space-y-1">
            <SectionHeaderRow label="Export" />
            <p className={helpTextClassName}>
              Vector exports follow the current preview exactly, including guides, typography, and placeholders. JSON exports preserve the editable project document.
            </p>
          </div>
          <div className="space-y-2">
            <SectionHeaderRow label="Active Layers Rendered" />
            <div className="grid grid-cols-5 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showBaselines })}
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
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showMargins })}
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
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showModules })}
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
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showTypography })}
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
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showImagePlaceholders })}
                disabled={isExporting}
                onClick={onToggleImagePlaceholders}
                aria-label="Toggle image placeholders in export"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <SectionHeaderRow label="Format" />
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: exportFormatDraft === "json" })}
                disabled={isExporting}
                onClick={() => onExportFormatChange("json")}
              >
                JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: exportFormatDraft === "pdf" })}
                disabled={isExporting}
                onClick={() => onExportFormatChange("pdf")}
              >
                PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: exportFormatDraft === "svg" })}
                disabled={isExporting}
                onClick={() => onExportFormatChange("svg")}
              >
                SVG
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: exportFormatDraft === "idml" })}
                disabled={isExporting}
                onClick={() => onExportFormatChange("idml")}
              >
                IDML
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {isExporting ? (
              <div className={cn("space-y-2 rounded-[5px] border px-3 py-3", isDarkUi ? "border-[#313A47] bg-[#232A35]" : "border-gray-300 bg-white")}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {exportProgressTitle}
                    </div>
                    <div className={`truncate text-xs ${getPopupMutedTextClassName(isDarkUi)}`}>
                      {exportProgress.currentLabel}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs font-medium">
                    <div>{totalProgressPercent}%</div>
                    <div className={getPopupMutedTextClassName(isDarkUi)}>{elapsedLabel}</div>
                  </div>
                </div>
                <div className={cn("h-2 overflow-hidden rounded-sm", isDarkUi ? "bg-[#313A47]" : "bg-gray-200")}>
                  <div
                    className={cn("h-full transition-[width] duration-200", isDarkUi ? "bg-[#F4F6F8]" : "bg-gray-900")}
                    style={{ width: `${totalProgressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}

            {pageRangeOptions.length > 1 ? (
              <div className="space-y-2">
                <SectionHeaderRow label="Pages" />
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label className="text-left text-[11px] text-muted-foreground">From</Label>
                  <Select
                    value={String(exportRangeStartDraft)}
                    onValueChange={onExportRangeStartChange}
                    disabled={isExporting}
                  >
                    <SelectTrigger aria-label="Export from page" className="h-8 rounded-sm px-2 py-1 text-left text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={dialogThemeClassName}>
                      {pageRangeOptions.map((option) => (
                        <SelectItem key={`from-${option.value}`} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-left text-[11px] text-muted-foreground">To</Label>
                  <Select
                    value={String(exportRangeEndDraft)}
                    onValueChange={onExportRangeEndChange}
                    disabled={isExporting}
                  >
                    <SelectTrigger aria-label="Export to page" className="h-8 rounded-sm px-2 py-1 text-left text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={dialogThemeClassName}>
                      {pageRangeOptions.map((option) => (
                        <SelectItem key={`to-${option.value}`} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <SectionHeaderRow label="Filename" />
              <input
                type="text"
                value={exportFilenameDraft}
                onChange={(event) => onExportFilenameChange(event.target.value)}
                disabled={isExporting}
                className={compactInputClassName}
                placeholder={defaultFilename}
              />
            </div>

            <div className="space-y-2">
              <SectionHeaderRow
                label="Metadata"
                actionIcon={<ChevronUp className={`h-2 w-2 transition-transform ${isMetadataOpen ? "rotate-180" : "rotate-90"}`} />}
                actionClassName={isDarkUi ? "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]" : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"}
                ariaExpanded={isMetadataOpen}
                onRowClick={() => setIsMetadataOpen((open) => !open)}
              />
              {isMetadataOpen ? (
                <>
                  <div className="space-y-2">
                    <Label>Project Title</Label>
                    <input
                      type="text"
                      value={jsonTitleDraft}
                      onChange={(event) => onJsonTitleChange(event.target.value)}
                      disabled={isExporting}
                      className={compactInputClassName}
                      placeholder="Project title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject (optional)</Label>
                    <textarea
                      value={jsonDescriptionDraft}
                      onChange={(event) => onJsonDescriptionChange(event.target.value)}
                      disabled={isExporting}
                      className={`${compactInputClassName} min-h-20 leading-[1.45]`}
                      placeholder="Short subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Author (optional)</Label>
                    <input
                      type="text"
                      value={jsonAuthorDraft}
                      onChange={(event) => onJsonAuthorChange(event.target.value)}
                      disabled={isExporting}
                      className={compactInputClassName}
                      placeholder="Author name"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className={cn("space-y-4", closedMetadataFormatSectionClassName)}>
              {isJsonExport ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <SectionHeaderRow
                      label={(
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <span>GZIP-Compression</span>
                          <span className={`text-[11px] font-normal normal-case tracking-normal ${getPopupMutedTextClassName(isDarkUi)}`}>
                            (smaller export file)
                          </span>
                        </span>
                      )}
                      className="min-w-0 flex-1"
                    />
                    <input
                      type="checkbox"
                      checked={jsonCompressionEnabledDraft}
                      onChange={(event) => onJsonCompressionEnabledChange(event.target.checked)}
                      disabled={isExporting}
                      aria-label="Gzip-compress JSON export"
                      className="h-3.5 w-3.5 shrink-0"
                    />
                  </div>
                  <p className={helpTextClassName}>
                    JSON exports the full editable project document, including all pages, metadata, and current layout state.
                  </p>
                </>
              ) : null}

              {isVectorExport ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <SectionHeaderRow
                      label={(
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <span>Bleed</span>
                          <span className={`text-[11px] font-normal normal-case tracking-normal ${getPopupMutedTextClassName(isDarkUi)}`}>
                            (millimeters)
                          </span>
                        </span>
                      )}
                      className="min-w-0 flex-1"
                    />
                    <input
                      type="checkbox"
                      checked={bleedEnabledDraft}
                      onChange={(event) => onBleedEnabledChange(event.target.checked)}
                      disabled={isExporting}
                      aria-label="Enable vector export bleed"
                      className="h-3.5 w-3.5 shrink-0"
                    />
                  </div>
                  {bleedEnabledDraft ? (
                    <div className="space-y-2">
                      <Label>Bleed Width (mm)</Label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={exportBleedMmDraft}
                        onChange={(event) => onExportBleedMmChange(event.target.value)}
                        disabled={isExporting}
                        className={compactInputClassName}
                      />
                    </div>
                  ) : null}
                  <p className={helpTextClassName}>
                    {isPdfExport
                      ? "PDF exports RGB vector geometry with an sRGB output intent. Bleed is a production area, with crop marks outside it."
                      : isSvgExport
                        ? (
                          isMultiPageSelection
                            ? "SVG exports a ZIP with one outlined SVG per selected page. Bleed is included as production area, with crop marks outside it."
                            : "SVG exports outlined vector geometry. Bleed is included as production area, with crop marks outside it."
                        )
                        : "IDML exports outlined geometry, document bleed, slug canvas, and crop marks outside bleed."}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 space-y-2 pt-4">
          <SectionHeaderRow label="Actions" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className={`${actionButtonClassName} w-full`} onClick={onClose} disabled={isExporting}>
              {isExporting ? "Exporting..." : "Cancel"}
            </Button>
            <Button size="sm" className={`${actionButtonClassName} w-full`} onClick={onConfirm} disabled={isExporting}>
              {isExporting
                ? (isPdfExport ? "Exporting PDF" : isSvgExport ? "Exporting SVG" : "Exporting IDML")
                : isPdfExport ? "Export PDF" : isSvgExport ? "Export SVG" : isJsonExport ? "Save JSON" : "Export IDML"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
