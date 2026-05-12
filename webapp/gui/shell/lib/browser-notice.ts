import type { NoticeRequest } from "@/gui/lib/notice-request"

export function formatBrowserNoticeMessage(
  notice: Pick<NoticeRequest, "title" | "message">,
): string {
  return notice.message ? `${notice.title}\n\n${notice.message}` : notice.title
}

export function showBrowserNotice(notice: NoticeRequest): void {
  if (typeof window === "undefined") return
  const message = formatBrowserNoticeMessage(notice)
  if (notice.onConfirm) {
    if (window.confirm(message)) {
      notice.onConfirm()
    } else {
      notice.onCancel?.()
    }
    return
  }
  window.alert(message)
}
