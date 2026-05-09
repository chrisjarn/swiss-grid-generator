import type { LayoutEngineContract } from "@/lib/layout-engine-contract"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"
import type { GridConfig } from "@/core/types/grid"

export type DocumentId = string
export type PageId = string
export type LayerId = string

export type DocumentMetadata = {
  title: string
  description: string
  author: string
  createdAt?: string
}

export type DocumentVisibilitySettings = {
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
}

export type DocumentPageLayoutMode = "single" | "facing"

export type DocumentPage<Layout = PreviewLayoutState> = {
  id: PageId
  name: string
  uiSettings: GridConfig
  previewLayout: Layout | null
  layoutMode: DocumentPageLayoutMode
}

export type DocumentState<Layout = PreviewLayoutState> = {
  id: DocumentId
  activePageId: PageId
  pages: DocumentPage<Layout>[]
  metadata: DocumentMetadata
  layoutEngine: LayoutEngineContract
  visibilitySettings: DocumentVisibilitySettings
  revision: number
  tour?: unknown
}

export type DocumentHistory<Layout = PreviewLayoutState> = {
  past: DocumentState<Layout>[]
  present: DocumentState<Layout>
  future: DocumentState<Layout>[]
}
