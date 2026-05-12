"use client"

import { Button } from "@/shared/ui/button"
import { Label } from "@/shared/ui/label"
import { useTranslation } from "@/lib/i18n"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"
import {
  getCompactActionButtonClassName,
  getPopupInputClassName,
  getPopupMutedTextClassName,
  getPopupSurfaceClassName,
} from "@/shared/ui/popup-styles"

type Props = {
  isOpen: boolean
  onClose: () => void
  isDarkUi: boolean
  title: string
  onTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  author: string
  onAuthorChange: (value: string) => void
  onConfirm: () => void
}

export function SaveLibraryDialog({
  isOpen,
  onClose,
  isDarkUi,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  author,
  onAuthorChange,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  if (!isOpen) return null

  const actionButtonClassName = getCompactActionButtonClassName({ isDarkMode: isDarkUi })
  const inputClassName = getPopupInputClassName(isDarkUi, "rounded-sm px-2 py-1 text-[12px]")
  const mutedTextClassName = getPopupMutedTextClassName(isDarkUi)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        onClose()
      }}
    >
      <div className={getPopupSurfaceClassName(isDarkUi, "flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden")}>
        <div className={`shrink-0 space-y-1 border-b pb-4 ${isDarkUi ? "border-[#313A47]" : "border-gray-200"}`}>
          <SectionHeaderRow label={t("ui.shell.dialogs.saveLibrary.title")} />
          <p className={`text-xs leading-relaxed ${mutedTextClassName}`}>
            {t("ui.shell.dialogs.saveLibrary.description")}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <SectionHeaderRow label={t("ui.common.metadata")} />
              <div className="space-y-2">
                <Label>{t("ui.common.projectTitle")}</Label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  className={inputClassName}
                  placeholder={t("ui.common.projectTitle")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("ui.common.subjectOptional")}</Label>
                <textarea
                  value={description}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  className={`${inputClassName} min-h-20 leading-[1.45]`}
                  placeholder={t("ui.common.shortSubject")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("ui.common.authorOptional")}</Label>
                <input
                  type="text"
                  value={author}
                  onChange={(event) => onAuthorChange(event.target.value)}
                  className={inputClassName}
                  placeholder={t("ui.common.authorName")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 space-y-2 pt-4">
          <SectionHeaderRow label={t("ui.common.actions")} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className={`${actionButtonClassName} w-full`} onClick={onClose}>
              {t("ui.common.cancel")}
            </Button>
            <Button size="sm" className={`${actionButtonClassName} w-full`} onClick={onConfirm}>
              {t("ui.shell.dialogs.saveLibrary.confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
