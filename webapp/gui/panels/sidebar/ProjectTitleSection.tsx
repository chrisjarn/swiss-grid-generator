"use client"

import type { MouseEvent } from "react"

import { ProjectPanelSection } from "@/gui/panels/sidebar/ProjectPanelSection"
import { ProjectMetadataSection } from "@/gui/panels/sidebar/ProjectMetadataSection"
import { useTranslation } from "@/lib/i18n/useTranslation"

type Props = {
  expanded: boolean
  onHeaderClick: (event: MouseEvent<HTMLElement>) => void
  onHeaderDoubleClick: (event: MouseEvent<HTMLElement>) => void
  projectInfoSentence: string
  projectTitle: string
  projectDescription: string
  projectAuthor: string
  onRolloverOpen: () => void
  onProjectTitleChange: (nextTitle: string) => void
  onProjectDescriptionChange: (nextDescription: string) => void
  onProjectAuthorChange: (nextAuthor: string) => void
  isDarkMode?: boolean
}

export function ProjectTitleSection({
  expanded,
  onHeaderClick,
  onHeaderDoubleClick,
  projectInfoSentence,
  projectTitle,
  projectDescription,
  projectAuthor,
  onRolloverOpen,
  onProjectTitleChange,
  onProjectDescriptionChange,
  onProjectAuthorChange,
  isDarkMode = false,
}: Props) {
  const { t } = useTranslation()

  const visibleProjectTitle = projectTitle.trim() || t("ui.panels.project.metadata.untitled")
  const tone = isDarkMode
    ? {
        body: "text-muted-foreground",
        titleMuted: "text-muted-foreground",
      }
    : {
        body: "text-muted-foreground",
        titleMuted: "text-muted-foreground",
      }

  return (
    <ProjectPanelSection
      title={t("ui.panels.project.title")}
      expanded={expanded}
      collapsedSummary={(
        <span className={projectTitle.trim() ? undefined : tone.titleMuted}>
          {visibleProjectTitle}
        </span>
      )}
      isDarkMode={isDarkMode}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      onRolloverOpen={onRolloverOpen}
    >
      <p className={`text-xs leading-[1.45] ${tone.body}`}>
        {projectInfoSentence}
      </p>
      <ProjectMetadataSection
        projectTitle={projectTitle}
        projectDescription={projectDescription}
        projectAuthor={projectAuthor}
        onProjectTitleChange={onProjectTitleChange}
        onProjectDescriptionChange={onProjectDescriptionChange}
        onProjectAuthorChange={onProjectAuthorChange}
        isDarkMode={isDarkMode}
      />
    </ProjectPanelSection>
  )
}
