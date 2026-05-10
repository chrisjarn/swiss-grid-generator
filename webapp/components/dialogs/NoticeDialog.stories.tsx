import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { NoticeDialog } from "@/components/dialogs/NoticeDialog"

const meta = {
  title: "Dialogs/Notice Dialog",
  component: NoticeDialog,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    isOpen: true,
    isDarkUi: false,
    title: "Delete user layout",
    message: "This removes the saved layout from the local Users library. Cloud deletion depends on the current sync state.",
    onClose: () => {},
  },
} satisfies Meta<typeof NoticeDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Notice: Story = {}

export const Confirmation: Story = {
  args: {
    confirmLabel: "Delete",
    cancelLabel: "Keep",
    onConfirm: () => {},
  },
}

export const DarkConfirmation: Story = {
  args: {
    isDarkUi: true,
    confirmLabel: "Delete",
    cancelLabel: "Keep",
    onConfirm: () => {},
  },
}
