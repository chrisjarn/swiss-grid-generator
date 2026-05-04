"use client"

import { useEffect, useRef, useState } from "react"

import { SectionHeaderRow } from "@/components/ui/section-header-row"

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

  const tone = isDarkMode
    ? {
        input: "border-[#313A47] bg-[#232A35] text-[#F4F6F8] placeholder:text-[#8D98AA]",
      }
    : {
        input: "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
      }

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
        <SectionHeaderRow label="Title" />
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
          className={`w-full rounded-sm border px-2 py-1 text-[12px] outline-none ${tone.input}`}
          placeholder="Project title"
        />
      </div>
      <div className="space-y-1.5">
        <SectionHeaderRow label="Subject" />
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
          className={`w-full resize-y rounded-sm border px-2 py-1.5 text-[12px] leading-[1.45] outline-none ${tone.input}`}
          placeholder="Short subject"
        />
      </div>
      <div className="space-y-1.5">
        <SectionHeaderRow label="Author" />
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
          className={`w-full rounded-sm border px-2 py-1 text-[12px] outline-none ${tone.input}`}
          placeholder="Author name"
        />
      </div>
    </div>
  )
}
