import type { Preview } from "@storybook/nextjs-vite"
import "../app/globals.css"

const preview: Preview = {
  initialGlobals: {
    theme: "light",
  },
  globalTypes: {
    theme: {
      description: "Interface theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Braun" },
          { value: "dark", title: "Brutalism" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.theme === "dark"

      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", isDark)
        document.body.classList.toggle("dark", isDark)
      }

      return (
        <div className={isDark ? "min-h-screen bg-[#111821] p-8 text-gray-100" : "min-h-screen bg-[#f5f2ed] p-8 text-gray-900"}>
          <Story />
        </div>
      )
    },
  ],
  parameters: {
    backgrounds: {
      disable: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
}

export default preview
