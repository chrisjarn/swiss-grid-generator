export type WorkspaceTheme = {
  root: string
  leftPanel: string
  leftPanelEdit: string
  subtleBorder: string
  bodyText: string
  headingText: string
  link: string
  previewShell: string
  previewHeader: string
  previewContent: string
  previewContentEdit: string
  divider: string
  sidebar: string
  sidebarBody: string
}

export const DARK_WORKSPACE_THEME: WorkspaceTheme = {
  root: "bg-[#161A22]",
  leftPanel: "dark border-[#313A47] bg-[#1D232D] text-[#F4F6F8]",
  leftPanelEdit: "bg-[#1D232D]",
  subtleBorder: "border-[#313A47]",
  bodyText: "text-[#A8B1BF]",
  headingText: "text-[#F4F6F8]",
  link: "text-[#F4F6F8] underline",
  previewShell: "bg-[#161A22]",
  previewHeader: "dark border-[#313A47] bg-[#1D232D] text-[#F4F6F8]",
  previewContent: "bg-[#161A22]",
  previewContentEdit: "bg-[#161A22]",
  divider: "bg-[#313A47]",
  sidebar: "dark border-[#313A47] bg-[#1D232D] text-[#A8B1BF]",
  sidebarBody: "text-[#8D98AA]",
}

export const LIGHT_WORKSPACE_THEME: WorkspaceTheme = {
  root: "bg-gray-100",
  leftPanel: "border-gray-200 bg-gray-100",
  leftPanelEdit: "bg-gray-100",
  subtleBorder: "border-gray-200",
  bodyText: "text-gray-600",
  headingText: "text-gray-700",
  link: "underline",
  previewShell: "bg-gray-100",
  previewHeader: "border-gray-200 bg-gray-100",
  previewContent: "bg-gray-100",
  previewContentEdit: "bg-gray-100",
  divider: "bg-gray-200",
  sidebar: "border-gray-200 bg-gray-100 text-gray-700",
  sidebarBody: "text-gray-600",
}
