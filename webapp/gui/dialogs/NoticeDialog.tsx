import { Button } from "@/shared/ui/button"
import { useTranslation } from "@/lib/i18n"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"
import { useDialogPrimaryAction } from "@/shared/ui/use-dialog-primary-action"
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
  const primaryAction = onConfirm ?? onClose
  const { primaryActionRef, handleDialogKeyDown } = useDialogPrimaryAction({
    isOpen,
    onPrimaryAction: primaryAction,
  })
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
        onKeyDown={handleDialogKeyDown}
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
          <SectionHeaderRow label={t("ui.common.dialogs.notice.actions")} />
          {onConfirm ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi })} w-full`}
                onClick={onClose}
              >
                {cancelLabel ?? t("ui.common.dialogs.notice.cancel")}
              </Button>
              <Button
                ref={primaryActionRef}
                size="sm"
                className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi })} w-full`}
                onClick={onConfirm}
              >
                {confirmLabel ?? t("ui.common.dialogs.notice.confirm")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <Button
                ref={primaryActionRef}
                size="sm"
                className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi })} w-full`}
                onClick={onClose}
              >
                {t("ui.common.dialogs.notice.ok")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
