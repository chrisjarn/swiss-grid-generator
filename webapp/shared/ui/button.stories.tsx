import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Button } from "@/shared/ui/button"

const meta = {
  title: "Shared/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  args: {
    children: "Apply",
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Export",
  },
}

export const Compact: Story = {
  args: {
    size: "sm",
    children: "Save",
  },
}
