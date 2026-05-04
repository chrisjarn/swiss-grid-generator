"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  getCompactActionButtonClassName,
  getPopupInputClassName,
  getPopupMutedTextClassName,
  getPopupSurfaceClassName,
} from "@/components/ui/popup-styles"

type Props = {
  isOpen: boolean
  onClose: () => void
  isDarkUi: boolean
  title: string
  onTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  author: string
  onAuthorChange: (value: string) => void
  onConfirm: () => void
}

export function SaveLibraryDialog({
  isOpen,
  onClose,
  isDarkUi,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  author,
  onAuthorChange,
  onConfirm,
}: Props) {
  if (!isOpen) return null

  const actionButtonClassName = getCompactActionButtonClassName({ isDarkMode: isDarkUi })
  const inputClassName = getPopupInputClassName(isDarkUi)
  const mutedTextClassName = getPopupMutedTextClassName(isDarkUi)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className={getPopupSurfaceClassName(isDarkUi, "w-full max-w-md space-y-4")}>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold leading-tight">Save to Library</h3>
          <p className={`text-xs leading-relaxed ${mutedTextClassName}`}>
            Stores the current project in the local `Users` library.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Project Title</Label>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className={inputClassName}
            placeholder="Project title"
          />
        </div>
        <div className="space-y-2">
          <Label>Subject (optional)</Label>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className={getPopupInputClassName(isDarkUi, "min-h-20")}
            placeholder="Short subject"
          />
        </div>
        <div className="space-y-2">
          <Label>Author (optional)</Label>
          <input
            type="text"
            value={author}
            onChange={(event) => onAuthorChange(event.target.value)}
            className={inputClassName}
            placeholder="Author name"
          />
        </div>
        <div className="flex items-center justify-start gap-2">
          <Button variant="outline" size="sm" className={actionButtonClassName} onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className={actionButtonClassName} onClick={onConfirm}>
            Save to Library
          </Button>
        </div>
      </div>
    </div>
  )
}
