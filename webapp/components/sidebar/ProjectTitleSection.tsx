"use client"

import { Pencil, X } from "lucide-react"
import { useState } from "react"

import { ProjectMetadataSection } from "@/components/sidebar/ProjectMetadataSection"

type Props = {
  projectTitle: string
  projectDescription: string
  projectAuthor: string
  onProjectTitleChange: (nextTitle: string) => void
  onProjectDescriptionChange: (nextDescription: string) => void
  onProjectAuthorChange: (nextAuthor: string) => void
  isDarkMode?: boolean
}

export function ProjectTitleSection({
  projectTitle,
  projectDescription,
  projectAuthor,
  onProjectTitleChange,
  onProjectDescriptionChange,
  onProjectAuthorChange,
  isDarkMode = false,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldAutoFocusTitle, setShouldAutoFocusTitle] = useState(false)

  const visibleProjectTitle = projectTitle.trim() || "Untitled Project"
  const tone = isDarkMode
    ? {
        title: "text-[#F4F6F8]",
        titleMuted: "text-[#8D98AA]",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:text-[#F4F6F8]",
      }
    : {
        title: "text-gray-900",
        titleMuted: "text-gray-500",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:text-gray-900",
      }

  const beginProjectEdit = () => {
    setIsExpanded(true)
    setShouldAutoFocusTitle(true)
  }

  return (
    <div className="mt-1">
      <div className="flex min-h-[18px] items-center justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onDoubleClick={() => {
            if (isExpanded) {
              setIsExpanded(false)
              setShouldAutoFocusTitle(false)
              return
            }
            setIsExpanded(true)
            setShouldAutoFocusTitle(true)
          }}
        >
          <span className={`block truncate text-[12px] font-medium leading-none ${projectTitle.trim() ? tone.title : tone.titleMuted}`}>
            {visibleProjectTitle}
          </span>
        </button>
        <button
          type="button"
          aria-label={isExpanded ? "Close project metadata" : "Edit project metadata"}
          className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${tone.action}`}
          onClick={() => {
            if (isExpanded) {
              setIsExpanded(false)
              setShouldAutoFocusTitle(false)
              return
            }
            beginProjectEdit()
          }}
        >
          {isExpanded ? <X className="h-2 w-2" /> : <Pencil className="h-2 w-2" />}
        </button>
      </div>
      {isExpanded ? (
        <ProjectMetadataSection
          projectTitle={projectTitle}
          projectDescription={projectDescription}
          projectAuthor={projectAuthor}
          onProjectTitleChange={onProjectTitleChange}
          onProjectDescriptionChange={onProjectDescriptionChange}
          onProjectAuthorChange={onProjectAuthorChange}
          autoFocusTitle={shouldAutoFocusTitle}
          isDarkMode={isDarkMode}
        />
      ) : null}
    </div>
  )
}
