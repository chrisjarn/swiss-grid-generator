import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Download, Layers, Save, Undo2 } from "lucide-react"

import { HeaderIconButton } from "@/components/ui/header-icon-button"

const meta = {
  title: "UI/Header Icon Button",
  component: HeaderIconButton,
  parameters: {
    layout: "centered",
  },
  args: {
    showTooltip: false,
    onClick: () => {},
  },
} satisfies Meta<typeof HeaderIconButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    ariaLabel: "Save",
    tooltip: "Save",
    children: <Save className="h-4 w-4" aria-hidden="true" />,
  },
}

export const ActiveWithStatus: Story = {
  args: {
    ariaLabel: "Project panel",
    tooltip: "Project panel",
    "aria-pressed": true,
    showStatusDot: true,
    statusDotClassName: "bg-[#4CAF50]",
    children: <Layers className="h-4 w-4" aria-hidden="true" />,
  },
}

export const Disabled: Story = {
  args: {
    ariaLabel: "Undo",
    tooltip: "Undo",
    disabled: true,
    children: <Undo2 className="h-4 w-4" aria-hidden="true" />,
  },
}

export const DarkModeSet: Story = {
  args: {
    ariaLabel: "Dark mode controls",
    tooltip: "Dark mode controls",
    children: <Save className="h-4 w-4" aria-hidden="true" />,
  },
  render: () => (
    <div className="flex items-center gap-2 rounded-sm bg-[#111821] p-3">
      <HeaderIconButton ariaLabel="Save" tooltip="Save" showTooltip={false} isDarkMode>
        <Save className="h-4 w-4" aria-hidden="true" />
      </HeaderIconButton>
      <HeaderIconButton ariaLabel="Export" tooltip="Export" showTooltip={false} isDarkMode showStatusDot>
        <Download className="h-4 w-4" aria-hidden="true" />
      </HeaderIconButton>
      <HeaderIconButton ariaLabel="Layers" tooltip="Layers" showTooltip={false} isDarkMode aria-pressed>
        <Layers className="h-4 w-4" aria-hidden="true" />
      </HeaderIconButton>
    </div>
  ),
}
