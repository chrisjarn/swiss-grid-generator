import type { ProjectMetadata } from "@/core/document/session"
import type { PageExportPlan } from "@/core/layout/page-export-plan"
import type { ResolvedProjectPageExportSource } from "@/core/export/project-page-export-source"

export type IdmlFontMetadata = {
  family: string
  styleName: string
  fullName: string
  postScriptName: string
  weight: number
  italic: boolean
  fontType: string
}

export type IdmlProjectPage = ResolvedProjectPageExportSource & {
  exportPlan: PageExportPlan
}

export type SwissGridIdmlDocument = {
  metadata: ProjectMetadata
  pages: IdmlProjectPage[]
  bleedMm?: number
}

export type IdmlSpreadArtifact = {
  filePath: string
  pageId: string
  bytes: Uint8Array
}

export type IdmlStoryArtifact = {
  id: string
  filePath: string
  bytes: Uint8Array
}

export type IdmlPageSetArtifacts = {
  startPageIndex: number
  pageCount: number
  spreads: IdmlSpreadArtifact[]
  stories: IdmlStoryArtifact[]
  diagnostics?: {
    xmlGenerationMs: number
    encodeMs: number
    spreadBytes: number
    storyBytes: number
    spreadCount: number
    storyCount: number
  }
}
