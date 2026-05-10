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
    const trimmedDescription = descriptionDraft.trim()
    if (trimmedDescription !== projectDescription.trim()) {
      onProjectDescriptionChange(trimmedDescription)
    }
    setIsEditingDescription(false)
  }

  const commitTitle = () => {
    const trimmedTitle = titleDraft.trim()
    if (trimmedTitle.length > 0 && trimmedTitle !== projectTitle.trim()) {
      onProjectTitleChange(trimmedTitle)
    }
    setIsEditingTitle(false)
  }

  const commitAuthor = () => {
    const trimmedAuthor = authorDraft.trim()
    if (trimmedAuthor !== projectAuthor.trim()) {
      onProjectAuthorChange(trimmedAuthor)
    }
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
        <SectionHeaderRow label={t("projectPanel.metadata.title")} />
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
          placeholder={t("projectPanel.metadata.projectTitle")}
        />
      </div>
      <div className="space-y-1.5">
        <SectionHeaderRow label={t("projectPanel.metadata.subject")} />
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
          placeholder={t("projectPanel.metadata.shortSubject")}
        />
      </div>
      <div className="space-y-1.5">
        <SectionHeaderRow label={t("projectPanel.metadata.author")} />
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
          placeholder={t("projectPanel.metadata.authorName")}
        />
      </div>
    </div>
  )
}
