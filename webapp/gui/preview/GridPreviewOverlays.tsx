"use client"

import { Lock, Plus, SquarePen, Trash2 } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

import { ImageEditorDialog, type ImageEditorState } from "@/gui/dialogs/ImageEditorDialog"
import { TextEditorPanel } from "@/gui/editors/TextEditorPanel"
import type { BlockEditorState } from "@/gui/editors/block-editor-types"
import type { PreviewColorSchemeOption, TextEditorControls } from "@/gui/preview/lib/preview-overlay-controls"
import type { ImageColorSchemeId } from "@/core/config/color-schemes"
import type { BlockRect } from "@/gui/preview/lib/preview-types"
import type { HelpSectionId } from "@/core/document/help-registry"
import {
  resolvePreviewHoverActionTop,
  resolvePreviewHoverBandRect,
  resolvePreviewHoverDeleteActionLeft,
  resolvePreviewHoverPrimaryActionLeft,
} from "@/gui/preview/lib/preview-hover-affordance"
import { useTranslation } from "@/lib/i18n/useTranslation"

type Props<StyleKey extends string> = {
  showEditorHelpIcon: boolean
  showRolloverInfo: boolean
  editorSidebarHost: HTMLDivElement | null
  stageLeftCss: number
  stageTopCss: number
  pageWidthCss: number
  pageHeightCss: number
  pageRotation: number
  editorState: BlockEditorState<StyleKey> | null
  imageEditorState: ImageEditorState | null
  textEditorControls: TextEditorControls<StyleKey> | null
  hoveredTextKey: string | null
  hoveredTextRect: BlockRect | null
  hoveredImageKey: string | null
  hoveredImageRect: BlockRect | null
  hoveredLayerLocked: boolean
  onHoveredLayerLockToggle: (key: string, locked: boolean) => void
  openTextEditor: (key: string) => void
  openImageEditor: (key: string) => void
  onCopyAffordanceActivate: (args: {
    key: string
    kind: "text" | "image"
    clientX: number
    clientY: number
    altKey: boolean
    shiftKey: boolean
  }) => void
  deletePreviewTarget: (key: string) => void
  clearHover: () => void
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  baselinesPerGridModule: number
  gridRows: number
  gridCols: number
  imageColorScheme: ImageColorSchemeId
  imagePalette: readonly string[]
  imageColorSchemes: readonly PreviewColorSchemeOption[]
  onPreviewEditorOpen?: () => void
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  isDarkMode?: boolean
}

type CopyAffordanceIntent = "duplicate" | "paragraph" | "typo" | "both"

function getCopyAffordanceIntent(altKey: boolean, shiftKey: boolean): CopyAffordanceIntent {
  if (altKey && shiftKey) return "both"
  if (shiftKey) return "paragraph"
  if (altKey) return "typo"
  return "duplicate"
}

function getTextCopyRolloverTitle(t: ReturnType<typeof useTranslation>["t"]): string {
  return [
    t("overlayActions.duplicateParagraph"),
    t("overlayActions.copyParagraphSettings"),
    t("overlayActions.copyTypographySettings"),
    t("overlayActions.copyParagraphTypographySettings"),
  ].join("\n")
}

export function GridPreviewOverlays<StyleKey extends string>({
  showEditorHelpIcon,
  showRolloverInfo,
  editorSidebarHost,
  stageLeftCss,
  stageTopCss,
  pageWidthCss,
  pageHeightCss,
  pageRotation,
  editorState,
  imageEditorState,
  textEditorControls,
  hoveredTextKey,
  hoveredTextRect,
  hoveredImageKey,
  hoveredImageRect,
  hoveredLayerLocked,
  onHoveredLayerLockToggle,
  openTextEditor,
  openImageEditor,
  onCopyAffordanceActivate,
  deletePreviewTarget,
  clearHover,
  setImageEditorState,
  baselinesPerGridModule,
  gridRows,
  gridCols,
  imageColorScheme,
  imagePalette,
  imageColorSchemes,
  onPreviewEditorOpen,
  onOpenHelpSection,
  isDarkMode = false,
}: Props<StyleKey>) {
  const { t } = useTranslation()
  const [copyAffordanceIntent, setCopyAffordanceIntent] = useState<CopyAffordanceIntent>("duplicate")
  const [copyAffordanceHovered, setCopyAffordanceHovered] = useState(false)
  const activeEditorTarget = editorState?.target ?? imageEditorState?.target ?? null
  const hoveredEditTarget = hoveredTextKey && hoveredTextRect
    ? { kind: "text" as const, key: hoveredTextKey, rect: hoveredTextRect }
    : hoveredImageKey && hoveredImageRect
      ? { kind: "image" as const, key: hoveredImageKey, rect: hoveredImageRect }
      : null
  const showHoveredEditTarget = Boolean(
    hoveredEditTarget && hoveredEditTarget.key !== activeEditorTarget,
  )
  const actionButtonSize = 22
  const actionButtonGap = 4
  const hoverBandRect = hoveredEditTarget
    ? resolvePreviewHoverBandRect({
        targetRect: hoveredEditTarget.rect,
        pageWidth: pageWidthCss,
        pageHeight: pageHeightCss,
      })
    : null
  const leftActionGroupLeft = hoverBandRect
    ? resolvePreviewHoverPrimaryActionLeft(hoverBandRect)
    : 0
  const deleteButtonLeft = hoverBandRect
    ? resolvePreviewHoverDeleteActionLeft(hoverBandRect, hoveredLayerLocked)
    : 0
  const actionGroupTop = hoverBandRect
    ? resolvePreviewHoverActionTop(hoverBandRect)
    : 0
  const hoveredKindLabel = hoveredEditTarget?.kind === "text"
    ? t("overlayActions.paragraph")
    : t("overlayActions.imagePlaceholder")
  const copyButtonClassName = (() => {
    if (hoveredEditTarget?.kind !== "text" || copyAffordanceIntent === "duplicate") {
      return isDarkMode
        ? "border-gray-700 bg-gray-900/95 text-gray-200 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-50"
        : "border-gray-200 bg-white/95 text-gray-700 hover:border-gray-300 hover:bg-white hover:text-gray-900"
    }
    if (copyAffordanceIntent === "paragraph") {
      return isDarkMode
        ? "border-swiss-orange-soft bg-swiss-orange text-white hover:brightness-110"
        : "border-swiss-orange bg-swiss-orange text-white hover:brightness-95"
    }
    if (copyAffordanceIntent === "typo") {
      return isDarkMode
        ? "border-gray-500 bg-gray-600 text-white hover:border-gray-400 hover:bg-gray-500"
        : "border-gray-500 bg-gray-600 text-white hover:border-gray-600 hover:bg-gray-700"
    }
    return isDarkMode
      ? "border-swiss-orange-soft bg-swiss-orange text-gray-900 ring-1 ring-gray-400 hover:brightness-110"
      : "border-swiss-orange bg-swiss-orange text-gray-900 ring-1 ring-gray-600 hover:brightness-95"
  })()

  useEffect(() => {
    if (!copyAffordanceHovered || hoveredEditTarget?.kind !== "text") return
    const updateIntent = (event: KeyboardEvent) => {
      setCopyAffordanceIntent(getCopyAffordanceIntent(event.altKey, event.shiftKey))
    }
    window.addEventListener("keydown", updateIntent)
    window.addEventListener("keyup", updateIntent)
    return () => {
      window.removeEventListener("keydown", updateIntent)
      window.removeEventListener("keyup", updateIntent)
    }
  }, [copyAffordanceHovered, hoveredEditTarget?.kind])

  const editorSidebar = editorSidebarHost
    ? createPortal(
      <>
        {editorState && textEditorControls ? (
          <div
            data-editor-interactive-root="true"
            className="h-full"
            onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-editor") : undefined}
          >
            <TextEditorPanel
              showRolloverInfo={showRolloverInfo}
              showHelpIndicator={showEditorHelpIcon}
              onOpenHelpSection={onOpenHelpSection}
              controls={textEditorControls}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : null}

        {imageEditorState ? (
          <div
            data-editor-interactive-root="true"
            className="h-full"
            onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-image-editor") : undefined}
          >
            <ImageEditorDialog
              editorState={imageEditorState}
              setEditorState={setImageEditorState}
              baselinesPerGridModule={baselinesPerGridModule}
              gridRows={gridRows}
              gridCols={gridCols}
              colorSchemes={imageColorSchemes}
              selectedColorScheme={imageColorScheme}
              palette={imagePalette}
              showHelpIndicator={showEditorHelpIcon}
              onOpenHelpSection={onOpenHelpSection}
              showRolloverInfo={showRolloverInfo}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : null}
      </>,
      editorSidebarHost,
    )
    : null

  return (
    <>
      {showHoveredEditTarget && hoveredEditTarget ? (
        <div
          className="pointer-events-none absolute z-40"
          style={{
            left: stageLeftCss + pageWidthCss / 2,
            top: stageTopCss + pageHeightCss / 2,
            width: pageWidthCss,
            height: pageHeightCss,
            transform: `translate(-50%, -50%) rotate(${pageRotation}deg)`,
            transformOrigin: `${pageWidthCss / 2}px ${pageHeightCss / 2}px`,
          }}
        >
          {hoveredLayerLocked ? (
            <button
              type="button"
              data-preview-edit-affordance="true"
              className={`pointer-events-auto absolute flex items-center justify-center rounded-sm border shadow-md transition-colors ${
                isDarkMode
                  ? "border-gray-700 bg-gray-900/95 text-gray-200 hover:border-swiss-orange-soft hover:bg-gray-800 hover:text-swiss-orange-soft"
                  : "border-gray-200 bg-white/95 text-gray-700 hover:border-swiss-orange-soft hover:bg-white hover:text-swiss-orange"
              }`}
              style={{
                left: leftActionGroupLeft,
                top: actionGroupTop,
                width: actionButtonSize,
                height: actionButtonSize,
                transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
              }}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onHoveredLayerLockToggle(hoveredEditTarget.key, false)
              }}
              aria-label={t("overlayActions.unlock", { kind: hoveredKindLabel })}
              title={t("overlayActions.unlock", { kind: hoveredKindLabel })}
            >
              <Lock className="h-3 w-3" />
            </button>
          ) : (
            <>
              <div
                className="pointer-events-auto absolute flex items-center"
                style={{
                  left: leftActionGroupLeft,
                  top: actionGroupTop,
                  transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
                }}
                onMouseLeave={() => clearHover()}
              >
                <button
                  type="button"
                  data-preview-edit-affordance="true"
                  className={`flex items-center justify-center rounded-sm border shadow-md transition-colors ${
                    isDarkMode
                      ? "border-gray-700 bg-gray-900/95 text-gray-200 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-50"
                      : "border-gray-200 bg-white/95 text-gray-700 hover:border-gray-300 hover:bg-white hover:text-gray-900"
                  }`}
                  style={{
                    width: actionButtonSize,
                    height: actionButtonSize,
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    clearHover()
                    onPreviewEditorOpen?.()
                    if (hoveredEditTarget.kind === "text") {
                      openTextEditor(hoveredEditTarget.key)
                      return
                    }
                    openImageEditor(hoveredEditTarget.key)
                  }}
                  aria-label={t("overlayActions.edit", { kind: hoveredKindLabel })}
                  title={t("overlayActions.edit", { kind: hoveredKindLabel })}
                >
                  <SquarePen className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  data-preview-edit-affordance="true"
                  className={`flex items-center justify-center rounded-sm border shadow-md transition-colors ${
                    copyButtonClassName
                  }`}
                  style={{
                    width: actionButtonSize,
                    height: actionButtonSize,
                    marginLeft: actionButtonGap,
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                  onMouseEnter={(event) => {
                    setCopyAffordanceHovered(true)
                    setCopyAffordanceIntent(getCopyAffordanceIntent(event.altKey, event.shiftKey))
                  }}
                  onMouseMove={(event) => {
                    setCopyAffordanceIntent(getCopyAffordanceIntent(event.altKey, event.shiftKey))
                  }}
                  onMouseLeave={() => {
                    setCopyAffordanceHovered(false)
                    setCopyAffordanceIntent("duplicate")
                  }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onCopyAffordanceActivate({
                      key: hoveredEditTarget.key,
                      kind: hoveredEditTarget.kind,
                      clientX: event.clientX,
                      clientY: event.clientY,
                      altKey: event.altKey,
                      shiftKey: event.shiftKey,
                    })
                  }}
                  aria-label={hoveredEditTarget.kind === "text"
                    ? t("overlayActions.duplicateText")
                    : t("overlayActions.duplicateImage")}
                  title={hoveredEditTarget.kind === "text"
                    ? getTextCopyRolloverTitle(t)
                    : t("overlayActions.duplicateImageTooltip")}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                data-preview-edit-affordance="true"
                className={`pointer-events-auto absolute flex items-center justify-center rounded-sm border shadow-md transition-colors ${
                  isDarkMode
                    ? "border-gray-700 bg-gray-900/95 text-gray-200 hover:border-red-500/70 hover:bg-gray-800 hover:text-red-300"
                    : "border-gray-200 bg-white/95 text-gray-700 hover:border-red-300 hover:bg-white hover:text-red-600"
                }`}
                style={{
                  left: deleteButtonLeft,
                  top: actionGroupTop,
                  width: actionButtonSize,
                  height: actionButtonSize,
                  transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
                }}
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  deletePreviewTarget(hoveredEditTarget.key)
                }}
                aria-label={t("overlayActions.delete", { kind: hoveredKindLabel })}
                title={t("overlayActions.delete", { kind: hoveredKindLabel })}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      ) : null}

      {editorSidebar}
    </>
  )
}
