export type ProjectPanelPageLayoutMode = "single" | "facing"

export type ProjectPanelLayerCounts = {
  images: number
  text: number
}

export type ProjectPanelPageRow = {
  id: string
  imageLayerCount: number
  layoutMode: ProjectPanelPageLayoutMode
  name: string
  textLayerCount: number
}

export type ProjectPanelViewModel = {
  layerCountsByPageId: ReadonlyMap<string, ProjectPanelLayerCounts>
  pageIndexById: ReadonlyMap<string, number>
  pages: readonly ProjectPanelPageRow[]
  physicalPageCount: number
  physicalPageNumberById: ReadonlyMap<string, number>
}
