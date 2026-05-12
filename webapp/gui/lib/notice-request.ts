export type NoticeRequest = {
  title: string
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}
