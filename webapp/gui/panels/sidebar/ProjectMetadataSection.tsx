"use client"

import { useEffect, useRef, useState } from "react"

import { getNeutralFormControlClassName } from "@/shared/ui/popup-styles"
import { SectionHeaderRow } from "@/shared/ui/section-header-row"
import { useTranslation } from "@/lib/i18n/useTranslation"

type Props = {
  projectTitle: string
  projectDescription: string
  projectAuthor: string
  onProjectTitleChange: (nextTitle: string) => void
  onProjectDescriptionChange: (nextDescription: string) => void
  onProjectAuthorChange: (nextAuthor: string) => void
  autoFocusTitle?: boolean
  isDarkMode?: boolean
}

type MetadataCommitSnapshot = {
  authorDraft: string
  descriptionDraft: string
  onProjectAuthorChange: (nextAuthor: string) => void
  onProjectDescriptionChange: (nextDescription: string) => void
  onProjectTitleChange: (nextTitle: string) => void
  projectAuthor: string
  projectDescription: string
  projectTitle: string
  titleDraft: string
}

function commitMetadataDrafts({
  authorDraft,
  descriptionDraft,
  onProjectAuthorChange,
  onProjectDescriptionChange,
  onProjectTitleChange,
  projectAuthor,
  projectDescription,
  projectTitle,
  titleDraft,
}: MetadataCommitSnapshot) {
  const trimmedTitle = titleDraft.trim()
  if (trimmedTitle.length > 0 && trimmedTitle !== projectTitle.trim()) {
    onProjectTitleChange(trimmedTitle)
  }

  const trimmedDescription = descriptionDraft.trim()
  if (trimmedDescription !== projectDescription.trim()) {
    onProjectDescriptionChange(trimmedDescription)
  }

  const trimmedAuthor = authorDraft.trim()
  if (trimmedAuthor !== projectAuthor.trim()) {
    onProjectAuthorChange(trimmedAuthor)
  }
}

export function ProjectMetadataSection({
  projectTitle,
  projectDescription,
  projectAuthor,
  onProjectTitleChange,
  onProjectDescriptionChange,
  onProjectAuthorChange,
  autoFocusTitle = false,
  isDarkMode = false,
}: Props) {
  const { t } = useTranslation()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingAuthor, setIsEditingAuthor] = useState(false)
  const [titleDraft, setTitleDraft] = useState(projectTitle)
  const [descriptionDraft, setDescriptionDraft] = useState(projectDescription)
  const [authorDraft, setAuthorDraft] = useState(projectAuthor)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const commitSnapshotRef = useRef<MetadataCommitSnapshot>({
    authorDraft,
    descriptionDraft,
    onProjectAuthorChange,
    onProjectDescriptionChange,
    onProjectTitleChange,
    projectAuthor,
    projectDescription,
    projectTitle,
    titleDraft,
  })

  commitSnapshotRef.current = {
    authorDraft,
    descriptionDraft,
    onProjectAuthorChange,
    onProjectDescriptionChange,
    onProjectTitleChange,
    projectAuthor,
    projectDescription,
    projectTitle,
    titleDraft,
  }

  useEffect(() => (
    () => commitMetadataDrafts(commitSnapshotRef.current)
  ), [])

  useEffect(() => {
    if (!isEditingTitle) return
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    })
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingTitle) return
    setTitleDraft(projectTitle)
  }, [isEditingTitle, projectTitle])

  useEffect(() => {
    if (isEditingDescription) return
    setDescriptionDraft(projectDescription)
  }, [isEditingDescription, projectDescription])

  useEffect(() => {
    if (isEditingAuthor) return
    setAuthorDraft(projectAuthor)
  }, [isEditingAuthor, projectAuthor])

  useEffect(() => {
    if (!autoFocusTitle) return
    setIsEditingTitle(true)
  }, [autoFocusTitle])

  const inputClassName = getNeutralFormControlClassName(isDarkMode, "w-full rounded-sm px-2 py-1 text-[12px]")
  const textareaClassName = getNeutralFormControlClassName(isDarkMode, "w-full resize-y rounded-sm px-2 py-1.5 text-[12px] leading-[1.45]")

  const commitDescription = () => {
    commitMetadataDrafts(commitSnapshotRef.current)
    setIsEditingDescription(false)
  }

  const commitTitle = () => {
    commitMetadataDrafts(commitSnapshotRef.current)
    setIsEditingTitle(false)
  }

  const commitAuthor = () => {
    commitMetadataDrafts(commitSnapshotRef.current)
    setIsEditingAuthor(false)
  }

  const resetDescription = () => {
    setDescriptionDraft(projectDescription)
    setIsEditingDescription(false)
  }

  const resetTitle = () => {
    setTitleDraft(projectTitle)
    setIsEditingTitle(false)
  }

  const resetAuthor = () => {
    setAuthorDraft(projectAuthor)
    setIsEditingAuthor(false)
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="space-y-1.5">
        <SectionHeaderRow label={t("ui.panels.project.metadata.title")} />
        <input
          ref={titleInputRef}
          type="text"
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onFocus={() => setIsEditingTitle(true)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commitTitle()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              resetTitle()
            }
          }}
          className={inputClassName}
          placeholder={t("ui.panels.project.metadata.projectTitle")}
        />
      </div>
      <div className="space-y-1.5">
        <SectionHeaderRow label={t("ui.panels.project.metadata.subject")} />
        <textarea
          rows={5}
          value={descriptionDraft}
          onChange={(event) => setDescriptionDraft(event.target.value)}
          onFocus={() => setIsEditingDescription(true)}
          onBlur={commitDescription}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              resetDescription()
            }
          }}
          className={textareaClassName}
          placeholder={t("ui.panels.project.metadata.shortSubject")}
        />
      </div>
      <div className="space-y-1.5">
        <SectionHeaderRow label={t("ui.panels.project.metadata.author")} />
        <input
          type="text"
          value={authorDraft}
          onChange={(event) => setAuthorDraft(event.target.value)}
          onFocus={() => setIsEditingAuthor(true)}
          onBlur={commitAuthor}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commitAuthor()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              resetAuthor()
            }
          }}
          className={inputClassName}
          placeholder={t("ui.panels.project.metadata.authorName")}
        />
      </div>
    </div>
  )
}
