import { Button } from "@/shared/ui/button"
import { useTranslation } from "@/lib/i18n"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"
import {
  getCompactActionButtonClassName,
  getPopupMutedTextClassName,
  getPopupSurfaceClassName,
} from "@/shared/ui/popup-styles"

type Props = {
  isOpen: boolean
  isDarkUi: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onClose: () => void
}

export function NoticeDialog({
  isOpen,
  isDarkUi,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation()
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        onClose()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-dialog-title"
        aria-describedby="notice-dialog-message"
        className={getPopupSurfaceClassName(isDarkUi, "flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden")}
      >
        <div className={`shrink-0 border-b pb-4 ${isDarkUi ? "border-[#313A47]" : "border-gray-200"}`}>
          <SectionHeaderRow label={<span id="notice-dialog-title">{title}</span>} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <p id="notice-dialog-message" className={`text-xs leading-relaxed ${getPopupMutedTextClassName(isDarkUi)}`}>
            {message}
          </p>
        </div>
        <div className="shrink-0 space-y-2 pt-4">
          <SectionHeaderRow label={t("dialogs.notice.actions")} />
          {onConfirm ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi })} w-full`}
                onClick={onClose}
              >
                {cancelLabel ?? t("dialogs.notice.cancel")}
              </Button>
              <Button
                size="sm"
                className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi })} w-full`}
                onClick={onConfirm}
              >
                {confirmLabel ?? t("dialogs.notice.confirm")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <Button size="sm" className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi })} w-full`} onClick={onClose}>
                {t("dialogs.notice.ok")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
