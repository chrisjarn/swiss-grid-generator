import { translateMessage } from "@/lib/i18n/messages"

export type DocumentVariableDefinition = {
  token: string
  description: string
}

export const DOCUMENT_VARIABLE_DEFINITIONS: readonly DocumentVariableDefinition[] = [
  {
    token: "<%lorem%>",
    description: translateMessage("documentVariables.lorem"),
  },
  {
    token: "<%project_title%>",
    description: translateMessage("documentVariables.projectTitle"),
  },
  {
    token: "<%page_title%>",
    description: translateMessage("documentVariables.pageTitle"),
  },
  {
    token: "<%page%>",
    description: translateMessage("documentVariables.page"),
  },
  {
    token: "<%pages%>",
    description: translateMessage("documentVariables.pages"),
  },
  {
    token: "<%date%>",
    description: translateMessage("documentVariables.date"),
  },
  {
    token: "<%time%>",
    description: translateMessage("documentVariables.time"),
  },
] as const
