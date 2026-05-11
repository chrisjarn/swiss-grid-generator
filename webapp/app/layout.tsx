import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { FONT_CSS_VARS, FONT_FACE_CSS } from "@/core/config/fonts"
import { LIGHT_UI_THEME_COLOR } from "@/lib/theme-color"
import { translateMessage } from "@/core/i18n/messages"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
}

export const metadata: Metadata = {
  // Basic Meta
  title: translateMessage("app.metadataTitle"),
  description: translateMessage("app.metadataDescription"),
  keywords: translateMessage("app.metadataKeywords"),
  robots: "index, follow",
  alternates: {
    canonical: "https://preview.swiss-grid-generator.com/",
  },
  // Icons
  icons: {
    icon: "/favicon.ico",
  },

  // Open Graph (for Facebook, LinkedIn, etc.)
  openGraph: {
    title: translateMessage("app.metadataTitle"),
    description: translateMessage("app.metadataShortDescription"),
    type: "website",
    url: "https://preview.swiss-grid-generator.com/",
    siteName: translateMessage("app.name"),
    images: [
      {
        url: "https://preview.swiss-grid-generator.com/og-image.jpg",
        alt: translateMessage("app.metadataImageAlt"),
        width: 1200,
        height: 630,
      },
    ],
  },

  // Twitter Cards (now X)
  twitter: {
    card: "summary_large_image",
    title: translateMessage("app.metadataTitle"),
    description: translateMessage("app.metadataExportDescription"),
    images: ["https://preview.swiss-grid-generator.com/twitter-image.jpg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          id="app-theme-color"
          data-app-theme-color="true"
          name="theme-color"
          content={LIGHT_UI_THEME_COLOR}
        />
        <meta name="color-scheme" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: FONT_FACE_CSS }} />
      </head>
      <body className={inter.className} style={FONT_CSS_VARS as React.CSSProperties}>{children}</body>
    </html>
  )
}
