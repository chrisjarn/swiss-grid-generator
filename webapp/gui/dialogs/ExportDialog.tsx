import { ChevronDown, ChevronUp, Image as ImageIcon, LayoutGrid, Loader2, Rows3, SquareDashed, Type, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/shared/ui/button"
import { DocumentationHoverInfo } from "@/shared/ui/documentation-hover-info"
import { ExportPreviewCanvas } from "@/gui/dialogs/ExportPreviewCanvas"
import { Label } from "@/shared/ui/label"
import { useTranslation } from "@/lib/i18n"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"
import {
  getCompactActionButtonClassName,
  getPopupInputClassName,
  getPopupMutedTextClassName,
  getPopupSurfaceClassName,
} from "@/shared/ui/popup-styles"
import type { ExportProgressState } from "@/gui/shell/hooks/useExportActions"
import type { LoadedProject } from "@/core/document/session"
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_OPTIONS,
  type ExportFormat,
} from "@/lib/export-format-options"
import { SECTION_HEADLINE_CLASSNAME } from "@/shared/ui/section-headline"
import { cn } from "@/lib/utils"

type Props = {
  isOpen: boolean
  onClose: () => void
  isDarkUi: boolean
  showHoverInfo: boolean
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
  exportProgressLog: readonly string[]
  previewProject: LoadedProject<Record<string, unknown>>
}

export function ExportDialog({
  isOpen,
  onClose,
  isDarkUi,
  showHoverInfo,
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
  exportProgressLog,
  previewProject,
}: Props) {
  const { t } = useTranslation()
  const [isRangeInvalid, setIsRangeInvalid] = useState(false)
  const [isProgressLogOpen, setIsProgressLogOpen] = useState(false)
  const rangeInputRef = useRef<HTMLInputElement | null>(null)
  if (!isOpen) return null

  const compactInputClassName = getPopupInputClassName(isDarkUi, "rounded-sm px-2 py-1 text-[12px]")
  const helpTextClassName = `text-xs leading-relaxed ${getPopupMutedTextClassName(isDarkUi)}`
  const actionButtonClassName = getCompactActionButtonClassName({ isDarkMode: isDarkUi })
  const helpTooltipClassName = "border-border bg-popover/95 text-left text-popover-foreground shadow-lg"
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
  const idleActionLabel = isPdfExport
    ? t("ui.export.dialog.exportPdf")
    : isSvgExport
      ? t("ui.export.dialog.exportSvg")
      : isJsonExport
        ? t("ui.export.dialog.saveJson")
        : t("ui.export.dialog.exportIdml")
  const activeActionLabel = exportProgress
    ? exportProgress.currentLabel || idleActionLabel
    : idleActionLabel
  const progressLogText = exportProgressLog.join("\n")

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--color-overlay-bg)] p-4 md:items-center"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        onClose()
      }}
    >
      <div className={getPopupSurfaceClassName(isDarkUi, "relative max-h-[90vh] w-full max-w-[29.4rem] overflow-y-auto [scrollbar-gutter:stable]")}>
        <div className={cn("absolute left-0 right-0 top-0 h-[3px]", isDarkUi ? "bg-divider" : "bg-border")}>
          <div
            className="h-full bg-accent transition-[width] duration-200"
            style={{ width: isExporting ? `${totalProgressPercent}%` : "0%" }}
          />
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <DocumentationHoverInfo
              label={t("ui.export.dialog.title")}
              helpId="tooltip-export-dialog"
              showRolloverInfo={showHoverInfo}
              className="block"
              tooltipClassName={helpTooltipClassName}
            >
              <SectionHeaderRow label={t("ui.export.dialog.title")} />
            </DocumentationHoverInfo>
            <p className={helpTextClassName}>
              {t("ui.export.dialog.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <DocumentationHoverInfo
                label={t("ui.export.dialog.input")}
                helpId="tooltip-export-visibility"
                showRolloverInfo={showHoverInfo}
                className="block"
                tooltipClassName={helpTooltipClassName}
              >
                <SectionHeaderRow label={t("ui.export.dialog.input")} className="items-start" />
              </DocumentationHoverInfo>
              <div className="grid grid-cols-1 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: showBaselines })} w-full`}
                  disabled={isExporting}
                  onClick={onToggleBaselines}
                  aria-label={t("ui.export.dialog.toggleBaselines")}
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
                  aria-label={t("ui.export.dialog.toggleMargins")}
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
                  aria-label={t("ui.export.dialog.toggleModules")}
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
                  aria-label={t("ui.export.dialog.toggleTypography")}
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
                  aria-label={t("ui.export.dialog.toggleImagePlaceholders")}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <SectionHeaderRow label={t("ui.export.dialog.preview")} className="items-start" />
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
              <DocumentationHoverInfo
                label={t("ui.export.dialog.output")}
                helpId="tooltip-export-format"
                showRolloverInfo={showHoverInfo}
                className="block"
                tooltipClassName={helpTooltipClassName}
              >
                <SectionHeaderRow label={t("ui.export.dialog.output")} className="items-start" />
              </DocumentationHoverInfo>
              <div className="grid grid-cols-1 gap-1.5">
                {EXPORT_FORMATS.map((format) => (
                  <DocumentationHoverInfo
                    key={format}
                    disabled={isExporting}
                    label={EXPORT_FORMAT_OPTIONS[format].label}
                    helpId="tooltip-export-format"
                    showRolloverInfo={showHoverInfo}
                    className="block"
                    tooltipClassName={helpTooltipClassName}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: exportFormatDraft === format })} w-full`}
                      disabled={isExporting}
                      onClick={() => onExportFormatChange(format)}
                    >
                      {EXPORT_FORMAT_OPTIONS[format].label}
                    </Button>
                  </DocumentationHoverInfo>
                ))}
                {isVectorExport ? (
                  <DocumentationHoverInfo
                    label={t("ui.export.dialog.bleed")}
                    helpId="tooltip-export-bleed"
                    showRolloverInfo={showHoverInfo}
                    disabled={isExporting}
                    className="block"
                    tooltipClassName={helpTooltipClassName}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi, active: bleedEnabledDraft })} w-full`}
                      disabled={isExporting}
                      onClick={() => onBleedEnabledChange(!bleedEnabledDraft)}
                      aria-pressed={bleedEnabledDraft}
                    >
                      {t("ui.export.dialog.bleed")}
                    </Button>
                  </DocumentationHoverInfo>
                ) : null}
              </div>
            </div>
          </div>

          {isVectorExport && bleedEnabledDraft ? (
            <div className={sectionGridClassName}>
              <Label className={centeredRowLabelClassName}>{t("ui.export.dialog.bleedWidth")}</Label>
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
              <DocumentationHoverInfo
                label={t("ui.export.dialog.pages")}
                helpId="tooltip-export-page-range"
                showRolloverInfo={showHoverInfo}
                className="block"
                tooltipClassName={helpTooltipClassName}
              >
                <Label className={centeredRowLabelClassName}>{t("ui.export.dialog.pages")}</Label>
              </DocumentationHoverInfo>
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
                  isRangeInvalid ? "border-accent ring-1 ring-accent" : "",
                )}
                placeholder={t("ui.export.dialog.pageRangePlaceholder")}
                aria-invalid={isRangeInvalid}
              />
            </div>
          ) : null}

          <div className={sectionGridClassName}>
            <Label className={centeredRowLabelClassName}>{t("ui.export.dialog.filename")}</Label>
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
            <DocumentationHoverInfo
              label={t("ui.export.dialog.titleField")}
              helpId="tooltip-export-metadata"
              showRolloverInfo={showHoverInfo}
              className="block"
              tooltipClassName={helpTooltipClassName}
            >
              <Label className={centeredRowLabelClassName}>{t("ui.export.dialog.titleField")}</Label>
            </DocumentationHoverInfo>
            <input
              type="text"
              value={jsonTitleDraft}
              onChange={(event) => onJsonTitleChange(event.target.value)}
              disabled={isExporting}
              className={`${compactInputClassName} col-span-3`}
              placeholder={t("ui.common.projectTitle")}
            />
            <DocumentationHoverInfo
              label={t("ui.export.dialog.subject")}
              helpId="tooltip-export-metadata"
              showRolloverInfo={showHoverInfo}
              className="block"
              tooltipClassName={helpTooltipClassName}
            >
              <Label className={`${SECTION_HEADLINE_CLASSNAME} flex min-h-20 items-start pt-2 text-left leading-none`}>{t("ui.export.dialog.subject")}</Label>
            </DocumentationHoverInfo>
            <textarea
              value={jsonDescriptionDraft}
              onChange={(event) => onJsonDescriptionChange(event.target.value)}
              disabled={isExporting}
              className={`${compactInputClassName} col-span-3 min-h-20 leading-[1.45]`}
              placeholder={t("ui.common.shortSubject")}
            />
            <DocumentationHoverInfo
              label={t("ui.export.dialog.author")}
              helpId="tooltip-export-metadata"
              showRolloverInfo={showHoverInfo}
              className="block"
              tooltipClassName={helpTooltipClassName}
            >
              <Label className={centeredRowLabelClassName}>{t("ui.export.dialog.author")}</Label>
            </DocumentationHoverInfo>
            <input
              type="text"
              value={jsonAuthorDraft}
              onChange={(event) => onJsonAuthorChange(event.target.value)}
              disabled={isExporting}
              className={`${compactInputClassName} col-span-3`}
              placeholder={t("ui.common.authorName")}
            />
          </div>

          {exportProgressLog.length > 0 ? (
            <div className="space-y-2">
              <div className={sectionGridClassName}>
                <DocumentationHoverInfo
                  label={t("ui.export.dialog.progressLog")}
                  helpId="tooltip-export-progress-log"
                  showRolloverInfo={showHoverInfo}
                  className="block"
                  tooltipClassName={helpTooltipClassName}
                >
                  <Label className={centeredRowLabelClassName}>{t("ui.export.dialog.progressLog")}</Label>
                </DocumentationHoverInfo>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${actionButtonClassName} col-span-3 w-full justify-center gap-1.5`}
                  onClick={() => setIsProgressLogOpen((current) => !current)}
                  aria-expanded={isProgressLogOpen}
                >
                  {isProgressLogOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {isProgressLogOpen ? t("ui.export.dialog.hideProgressLog") : t("ui.export.dialog.showProgressLog")}
                  </span>
                </Button>
              </div>
              {isProgressLogOpen ? (
                <textarea
                  readOnly
                  value={progressLogText}
                  className={`${compactInputClassName} min-h-40 w-full resize-y font-mono text-[11px] leading-[1.45]`}
                  aria-label={t("ui.export.dialog.progressLog")}
                />
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-4 items-start gap-3">
            <Label className={centeredRowLabelClassName}>{t("ui.common.actions")}</Label>
            <Button variant="outline" size="sm" className={`${actionButtonClassName} w-full`} onClick={onClose}>
              {t("ui.common.cancel")}
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
