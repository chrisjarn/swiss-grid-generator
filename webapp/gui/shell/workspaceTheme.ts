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
  root: "dark bg-background text-foreground",
  leftPanel: "dark border-border bg-background text-foreground",
  leftPanelEdit: "bg-background",
  subtleBorder: "border-border",
  bodyText: "text-muted-foreground",
  headingText: "text-foreground",
  link: "text-foreground underline",
  previewShell: "bg-background",
  previewHeader: "dark border-border bg-background text-foreground",
  previewContent: "bg-background",
  previewContentEdit: "bg-background",
  divider: "bg-border",
  sidebar: "dark border-border bg-card text-muted-foreground",
  sidebarBody: "text-muted-foreground",
}

export const LIGHT_WORKSPACE_THEME: WorkspaceTheme = {
  root: "bg-background text-foreground",
  leftPanel: "border-border bg-background text-foreground",
  leftPanelEdit: "bg-background",
  subtleBorder: "border-border",
  bodyText: "text-muted-foreground",
  headingText: "text-foreground",
  link: "text-foreground underline",
  previewShell: "bg-background",
  previewHeader: "border-border bg-background text-foreground",
  previewContent: "bg-background",
  previewContentEdit: "bg-background",
  divider: "bg-border",
  sidebar: "border-border bg-card text-muted-foreground",
  sidebarBody: "text-muted-foreground",
}
