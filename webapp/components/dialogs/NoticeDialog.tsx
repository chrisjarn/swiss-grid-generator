import { Button } from "@/components/ui/button"
import { SectionHeaderRow } from "@/components/ui/section-header-row"
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
          <SectionHeaderRow label="Actions" />
          <div className="grid grid-cols-1 gap-2">
            <Button size="sm" className={`${getCompactActionButtonClassName({ isDarkMode: isDarkUi })} w-full`} onClick={onClose}>
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
