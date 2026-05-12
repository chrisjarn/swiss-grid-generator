import { defineConfig } from "vitepress"

export default defineConfig({
  title: "Swiss Grid Generator",
  description: "Precision documentation for Swiss Grid Generator.",
  base: "/doc/",
  outDir: "../webapp/public/doc",
  cleanUrls: true,
  lastUpdated: true,
  appearance: false,
  ignoreDeadLinks: [
    /^\/docs\/CALCULATIONS/,
    /^\/docs\/README/,
    /^\/docs\/FEATURES/,
    /^\/docs\/SETTINGS/,
    /^\/docs\/ARCHITECTURE/,
    /^\/docs\/GUI/,
    /^\/docs\/PERFORMANCE/,
    /^\/docs\/TESTS/,
    /^\/docs\/DEVELOPERS/,
    /^\/docs\/DESIGN/,
    /^\/docs\/EDITORIAL/,
  ],
  head: [
    ["meta", { name: "theme-color", content: "#F0EDE5" }],
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    ["link", { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" }],
  ],
  themeConfig: {
    logo: undefined,
    siteTitle: "Swiss Grid Generator",
    nav: [
      { text: "Application", link: "https://preview.swiss-grid-generator.com" },
      { text: "Repository", link: "https://github.com/longplay45/swiss-grid-generator" },
    ],
    outline: {
      level: [2, 3],
      label: "Index",
    },
    search: {
      provider: "local",
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/longplay45/swiss-grid-generator" },
    ],
    docFooter: {
      prev: false,
      next: false,
    },
    footer: {
      message: "Every stroke must be there for a reason.",
      copyright: "MIT © lp45.net",
    },
  },
})
