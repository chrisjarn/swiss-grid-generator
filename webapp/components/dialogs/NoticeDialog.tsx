import { Button } from "@/components/ui/button"
import {
  getCompactActionButtonClassName,
  getPopupMutedTextClassName,
  getPopupSurfaceClassName,
} from "@/components/ui/popup-styles"

type Props = {
  isOpen: boolean
  isDarkUi: boolean
  title: string
  message: string
  onClose: () => void
}

export function NoticeDialog({
  isOpen,
  isDarkUi,
  title,
  message,
  onClose,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-dialog-title"
        aria-describedby="notice-dialog-message"
        className={getPopupSurfaceClassName(isDarkUi, "w-full max-w-sm")}
      >
        <h3 id="notice-dialog-title" className="text-sm font-semibold leading-tight">
          {title}
        </h3>
        <p id="notice-dialog-message" className={`mt-2 text-xs leading-relaxed ${getPopupMutedTextClassName(isDarkUi)}`}>
          {message}
        </p>
        <div className="mt-4 flex items-center justify-start">
          <Button size="sm" className={getCompactActionButtonClassName({ isDarkMode: isDarkUi })} onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  )
}
