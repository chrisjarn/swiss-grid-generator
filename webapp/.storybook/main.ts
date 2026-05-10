import { fileURLToPath } from "node:url"
import type { StorybookConfig } from "@storybook/nextjs-vite"

const projectRoot = fileURLToPath(new URL("..", import.meta.url))

const config: StorybookConfig = {
  stories: [
    "../components/**/*.stories.@(ts|tsx|mdx)",
    "../gui/**/*.stories.@(ts|tsx|mdx)",
    "../shared/**/*.stories.@(ts|tsx|mdx)",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  viteFinal: async (viteConfig) => {
    const existingAlias = viteConfig.resolve?.alias
    const alias = Array.isArray(existingAlias)
      ? existingAlias
      : Object.entries(existingAlias ?? {}).map(([find, replacement]) => ({ find, replacement }))

    return {
      ...viteConfig,
      resolve: {
        ...viteConfig.resolve,
        alias: [
          ...alias,
          { find: "@", replacement: projectRoot },
        ],
      },
      define: {
        ...viteConfig.define,
        "process.env.NEXT_PUBLIC_APP_VERSION": JSON.stringify("storybook"),
        "process.env.NEXT_PUBLIC_RELEASE_CHANNEL": JSON.stringify("storybook"),
      },
    }
  },
}

export default config
