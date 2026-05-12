import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./.storybook/**/*.{ts,tsx,mdx}",
    "./pages/**/*.{ts,tsx}",
    "./gui/**/*.{ts,tsx}",
    "./gui/**/*.stories.{ts,tsx,mdx}",
    "./shared/**/*.{ts,tsx}",
    "./shared/**/*.stories.{ts,tsx,mdx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  safelist: [
    "bg-success",
    "bg-warning",
    "bg-accent",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--color-border)",
        input: "var(--color-border)",
        ring: "var(--color-accent-active)",
        background: "var(--color-app-background)",
        foreground: "var(--color-text-primary)",
        primary: {
          DEFAULT: "var(--color-text-primary)",
          foreground: "var(--color-page-default)",
        },
        secondary: {
          DEFAULT: "var(--color-surface-bg)",
          foreground: "var(--color-text-primary)",
        },
        destructive: {
          DEFAULT: "var(--color-error)",
          foreground: "var(--color-page-default)",
        },
        muted: {
          DEFAULT: "var(--color-panel-bg)",
          foreground: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-active)",
        },
        popover: {
          DEFAULT: "var(--color-panel-bg)",
          foreground: "var(--color-text-primary)",
        },
        card: {
          DEFAULT: "var(--color-panel-bg)",
          foreground: "var(--color-text-primary)",
        },
        "swiss-orange": {
          DEFAULT: "var(--color-accent)",
          soft: "var(--color-accent)",
        },
        panel: "var(--color-panel-bg)",
        surface: "var(--color-surface-bg)",
        divider: "var(--color-divider)",
        page: "var(--color-page-default)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
      },
      borderRadius: {
        NONE: '0',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
