import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { SettingsHelpNavigationProvider } from "@/gui/panels/settings/help-navigation-context"
import { PanelCard } from "@/gui/panels/settings/PanelCard"

const meta = {
  title: "Settings/Panel Card",
  component: PanelCard,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <SettingsHelpNavigationProvider
        value={{
          showHelpIcons: true,
          showRolloverInfo: false,
          interactionsDisabled: false,
          onNavigate: () => {},
        }}
      >
        <div className="w-[280px] overflow-hidden rounded-sm border border-gray-200 bg-[#f7f7f5] dark:border-[#313A47] dark:bg-[#1D232D]">
          <Story />
        </div>
      </SettingsHelpNavigationProvider>
    ),
  ],
  args: {
    title: "Grid",
    tooltip: "Grid structure",
    collapsed: false,
    helpSectionKey: "gutter",
    isDarkMode: false,
    onHeaderClick: () => {},
    onHeaderDoubleClick: () => {},
    children: (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-[0.18em] text-gray-500">Columns</span>
          <span className="font-mono">8</span>
        </div>
        <div className="h-1.5 rounded-sm bg-gray-300">
          <div className="h-1.5 w-2/3 rounded-sm bg-[#fd8b7b]" />
        </div>
      </div>
    ),
  },
} satisfies Meta<typeof PanelCard>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Collapsed: Story = {
  args: {
    collapsed: true,
    collapsedSummary: "8 cols / 12 rows",
  },
}

export const DarkOpen: Story = {
  args: {
    isDarkMode: true,
  },
}
