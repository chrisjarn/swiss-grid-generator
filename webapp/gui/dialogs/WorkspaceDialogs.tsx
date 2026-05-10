"use client"

import { ExportDialog } from "@/gui/dialogs/ExportDialog"
import { NoticeDialog } from "@/gui/dialogs/NoticeDialog"
import { SaveLibraryDialog } from "@/gui/dialogs/SaveLibraryDialog"
import type { ExportProgressState } from "@/gui/shell/hooks/useExportActions"
import type { LoadedProject } from "@/lib/document-session"
import type { ExportFormat } from "@/lib/export-format-options"

type NoticeState = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
} | null

type Props = {
  isDarkUi: boolean
  exportDialog: {
    isOpen: boolean
    onClose: () => void
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
    rangeDraft: string
    onRangeDraftChange: (value: string) => void
    onRangeDraftCommit: () => boolean
    rangeStart: number
    format: ExportFormat
    onFormatChange: (value: ExportFormat) => void
    filename: string
    onFilenameChange: (value: string) => void
    defaultFilename: string
    jsonTitle: string
    onJsonTitleChange: (value: string) => void
    jsonDescription: string
    onJsonDescriptionChange: (value: string) => void
    jsonAuthor: string
    onJsonAuthorChange: (value: string) => void
    bleedEnabled: boolean
    onBleedEnabledChange: (value: boolean) => void
    bleedMm: string
    onBleedMmChange: (value: string) => void
    onConfirm: () => void
    progress: ExportProgressState | null
    previewProject: LoadedProject<Record<string, unknown>>
  }
  saveLibraryDialog: {
    isOpen: boolean
    onClose: () => void
    title: string
    onTitleChange: (value: string) => void
    description: string
    onDescriptionChange: (value: string) => void
    author: string
    onAuthorChange: (value: string) => void
    onConfirm: () => void
  }
  noticeState: NoticeState
  onCloseNotice: () => void
  onConfirmNotice: () => void
}

export function WorkspaceDialogs({
  isDarkUi,
  exportDialog,
  saveLibraryDialog,
  noticeState,
  onCloseNotice,
  onConfirmNotice,
}: Props) {
  return (
    <>
      <ExportDialog
        isOpen={exportDialog.isOpen}
        onClose={exportDialog.onClose}
        isDarkUi={isDarkUi}
        showBaselines={exportDialog.showBaselines}
        onToggleBaselines={exportDialog.onToggleBaselines}
        showMargins={exportDialog.showMargins}
        onToggleMargins={exportDialog.onToggleMargins}
        showModules={exportDialog.showModules}
        onToggleModules={exportDialog.onToggleModules}
        showTypography={exportDialog.showTypography}
        onToggleTypography={exportDialog.onToggleTypography}
        showImagePlaceholders={exportDialog.showImagePlaceholders}
        onToggleImagePlaceholders={exportDialog.onToggleImagePlaceholders}
        exportRangeDraft={exportDialog.rangeDraft}
        onExportRangeChange={exportDialog.onRangeDraftChange}
        onExportRangeCommit={exportDialog.onRangeDraftCommit}
        exportRangeStartDraft={exportDialog.rangeStart}
        exportFormatDraft={exportDialog.format}
        onExportFormatChange={exportDialog.onFormatChange}
        exportFilenameDraft={exportDialog.filename}
        onExportFilenameChange={exportDialog.onFilenameChange}
        defaultFilename={exportDialog.defaultFilename}
        jsonTitleDraft={exportDialog.jsonTitle}
        onJsonTitleChange={exportDialog.onJsonTitleChange}
        jsonDescriptionDraft={exportDialog.jsonDescription}
        onJsonDescriptionChange={exportDialog.onJsonDescriptionChange}
        jsonAuthorDraft={exportDialog.jsonAuthor}
        onJsonAuthorChange={exportDialog.onJsonAuthorChange}
        bleedEnabledDraft={exportDialog.bleedEnabled}
        onBleedEnabledChange={exportDialog.onBleedEnabledChange}
        bleedWidthMmDraft={exportDialog.bleedMm}
        onBleedWidthMmChange={exportDialog.onBleedMmChange}
        onConfirm={exportDialog.onConfirm}
        exportProgress={exportDialog.progress}
        previewProject={exportDialog.previewProject}
      />

      <SaveLibraryDialog
        isOpen={saveLibraryDialog.isOpen}
        onClose={saveLibraryDialog.onClose}
        isDarkUi={isDarkUi}
        title={saveLibraryDialog.title}
        onTitleChange={saveLibraryDialog.onTitleChange}
        description={saveLibraryDialog.description}
        onDescriptionChange={saveLibraryDialog.onDescriptionChange}
        author={saveLibraryDialog.author}
        onAuthorChange={saveLibraryDialog.onAuthorChange}
        onConfirm={saveLibraryDialog.onConfirm}
      />

      <NoticeDialog
        isOpen={noticeState !== null}
        isDarkUi={isDarkUi}
        title={noticeState?.title ?? ""}
        message={noticeState?.message ?? ""}
        confirmLabel={noticeState?.confirmLabel}
        cancelLabel={noticeState?.cancelLabel}
        onConfirm={noticeState?.onConfirm ? onConfirmNotice : undefined}
        onClose={onCloseNotice}
      />
    </>
  )
}
