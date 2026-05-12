import { translateMessage } from "@/core/i18n/messages"

export type DocumentVariableDefinition = {
  token: string
  description: string
}

export const DOCUMENT_VARIABLE_DEFINITIONS: readonly DocumentVariableDefinition[] = [
  {
    token: "<%lorem%>",
    description: translateMessage("ui.editor.documentVariables.lorem"),
  },
  {
    token: "<%project_title%>",
    description: translateMessage("ui.editor.documentVariables.projectTitle"),
  },
  {
    token: "<%page_title%>",
    description: translateMessage("ui.editor.documentVariables.pageTitle"),
  },
  {
    token: "<%page%>",
    description: translateMessage("ui.editor.documentVariables.page"),
  },
  {
    token: "<%pages%>",
    description: translateMessage("ui.editor.documentVariables.pages"),
  },
  {
    token: "<%date%>",
    description: translateMessage("ui.editor.documentVariables.date"),
  },
  {
    token: "<%time%>",
    description: translateMessage("ui.editor.documentVariables.time"),
  },
] as const
