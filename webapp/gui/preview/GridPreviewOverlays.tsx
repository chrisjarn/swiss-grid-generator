"use client"

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ChevronUp,
  Copy,
  Lock,
  MoveDiagonal2,
  SquarePen,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { createPortal } from "react-dom"
import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  SetStateAction,
} from "react"

import { ImageEditorDialog, type ImageEditorState } from "@/gui/dialogs/ImageEditorDialog"
import { TextEditorPanel } from "@/gui/editors/TextEditorPanel"
import type { BlockEditorState } from "@/gui/editors/block-editor-types"
import type { PreviewColorSchemeOption, TextEditorControls } from "@/gui/preview/lib/preview-overlay-controls"
import type { ImageColorSchemeId } from "@/core/config/color-schemes"
import type { TextAlignMode, TextVerticalAlignMode } from "@/core/types/layout-primitives"
import type { BlockRect } from "@/gui/preview/lib/preview-types"
import type { DocumentationSectionId as HelpSectionId } from "@/core/document/documentation-sections"
import {
  getSettingsIconButtonClassName,
  getSettingsOpenListClassName,
  getSettingsOpenListOptionClassName,
  getSettingsValueBadgeClassName,
  SETTINGS_FINE_CHEVRON_ICON_CLASSNAME,
  SETTINGS_OPEN_LIST_LABEL_CLASSNAME,
  SETTINGS_ROW_LABEL_CLASSNAME,
} from "@/gui/panels/settings/settings-panel-styles"
import {
  resolvePreviewHoverActionTop,
  resolvePreviewHoverBandRect,
  resolvePreviewHoverPrimaryActionLeft,
  resolvePreviewHoverVisibleRect,
  resolvePreviewParagraphMenuWidth,
} from "@/gui/preview/lib/preview-hover-affordance"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { Label } from "@/shared/ui/label"
import { EditableSlider } from "@/shared/ui/slider"

const PREVIEW_ACTION_BUTTON_SIZE = 22
const PREVIEW_LAYER_AFFORDANCE_SIZE = 32
const PREVIEW_ROLLOVER_MENU_BUTTON_WIDTH = 24
const PREVIEW_ROLLOVER_MENU_BUTTON_HEIGHT = 32
const PREVIEW_ROLLOVER_ICON_SIZE = 12
const PREVIEW_ROLLOVER_MENU_SYMBOL_SIZE = 14
const PREVIEW_RESIZE_HANDLE_SIZE = PREVIEW_LAYER_AFFORDANCE_SIZE
const PARAGRAPH_MENU_GUIDE_INSET = 1
const ROLLOVER_MENU_BODY_INSET = (PREVIEW_LAYER_AFFORDANCE_SIZE - PREVIEW_ROLLOVER_ICON_SIZE) / 2
const ROLLOVER_MENU_BOTTOM_INSET = 8
const PARAGRAPH_MENU_MAX_HEIGHT = 360
const PARAGRAPH_MENU_MIN_BUTTON_ROWS = 5
const HORIZONTAL_ALIGNMENTS = ["left", "center", "right"] as const
const VERTICAL_ALIGNMENTS = ["top", "center", "bottom"] as const

type ParagraphRolloverControls = {
  align: TextAlignMode
  verticalAlign: TextVerticalAlignMode
  rotation: number
  reflow: boolean
  reflowDisabled: boolean
  hyphenation: boolean
  snapX: boolean
  snapY: boolean
}

type ParagraphRolloverControlPatch = Partial<{
  align: TextAlignMode
  verticalAlign: TextVerticalAlignMode
  rotation: number
  reflow: boolean
  hyphenation: boolean
  snapX: boolean
  snapY: boolean
}>

type ImageRolloverControls = {
  rotation: number
  snapX: boolean
  snapY: boolean
}

type ImageRolloverControlPatch = Partial<{
  rotation: number
  snapX: boolean
  snapY: boolean
}>

type RolloverToggleRow<Patch> = {
  key: string
  label: string
  checked: boolean
  disabled?: boolean
  patch: (checked: boolean) => Patch
}

type Props<StyleKey extends string> = {
  showEditorHelpIcon: boolean
  showRolloverInfo: boolean
  editorSidebarHost: HTMLDivElement | null
  stageLeftCss: number
  stageTopCss: number
  pageWidthCss: number
  pageHeightCss: number
  pageRotation: number
  baselineStepCss: number
  gridColumnRightEdgesCss: readonly number[]
  editorState: BlockEditorState<StyleKey> | null
  imageEditorState: ImageEditorState | null
  textEditorControls: TextEditorControls<StyleKey> | null
  hoveredTextKey: string | null
  hoveredTextRect: BlockRect | null
  hoveredTextControls: ParagraphRolloverControls | null
  hoveredImageKey: string | null
  hoveredImageRect: BlockRect | null
  hoveredImageControls: ImageRolloverControls | null
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
  onLayerResizeHandlePointerDown: (
    kind: "text" | "image",
    key: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onParagraphRolloverControlStart: (key: string) => void
  onParagraphRolloverControlChange: (key: string, patch: ParagraphRolloverControlPatch) => void
  onParagraphRolloverControlEnd: () => void
  onParagraphRolloverControlPreview: (key: string, patch: ParagraphRolloverControlPatch | null) => void
  onImageRolloverControlStart: (key: string) => void
  onImageRolloverControlChange: (key: string, patch: ImageRolloverControlPatch) => void
  onImageRolloverControlEnd: () => void
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

function getTextCopyRolloverTitle(t: ReturnType<typeof useTranslation>["t"]): string {
  return [
    t("ui.editor.overlayActions.duplicateParagraph"),
    t("ui.editor.overlayActions.copyParagraphSettings"),
    t("ui.editor.overlayActions.copyTypographySettings"),
    t("ui.editor.overlayActions.copyParagraphTypographySettings"),
  ].join("\n")
}

function stopPreviewButtonEvent(event: ReactMouseEvent<HTMLElement>) {
  event.preventDefault()
  event.stopPropagation()
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
  baselineStepCss,
  gridColumnRightEdgesCss,
  editorState,
  imageEditorState,
  textEditorControls,
  hoveredTextKey,
  hoveredTextRect,
  hoveredTextControls,
  hoveredImageKey,
  hoveredImageRect,
  hoveredImageControls,
  hoveredLayerLocked,
  onHoveredLayerLockToggle,
  openTextEditor,
  openImageEditor,
  onCopyAffordanceActivate,
  onLayerResizeHandlePointerDown,
  onParagraphRolloverControlStart,
  onParagraphRolloverControlChange,
  onParagraphRolloverControlEnd,
  onParagraphRolloverControlPreview,
  onImageRolloverControlStart,
  onImageRolloverControlChange,
  onImageRolloverControlEnd,
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
  const [openRolloverMenuKey, setOpenRolloverMenuKey] = useState<string | null>(null)
  const activeEditorTarget = editorState?.target ?? imageEditorState?.target ?? null
  const hoveredEditTarget = hoveredTextKey && hoveredTextRect
    ? { kind: "text" as const, key: hoveredTextKey, rect: hoveredTextRect }
    : hoveredImageKey && hoveredImageRect
      ? { kind: "image" as const, key: hoveredImageKey, rect: hoveredImageRect }
      : null
  const showHoveredEditTarget = Boolean(
    hoveredEditTarget && hoveredEditTarget.key !== activeEditorTarget,
  )
  const hoverBandRect = hoveredEditTarget
    ? resolvePreviewHoverBandRect({
        targetRect: hoveredEditTarget.rect,
        pageWidth: pageWidthCss,
        pageHeight: pageHeightCss,
      })
    : null
  const hoverVisibleRect = hoveredEditTarget
    ? resolvePreviewHoverVisibleRect({
        targetRect: hoveredEditTarget.rect,
        pageWidth: pageWidthCss,
        pageHeight: pageHeightCss,
      })
    : null
  const leftActionGroupLeft = hoverBandRect
    ? resolvePreviewHoverPrimaryActionLeft(hoverBandRect)
    : 0
  const actionGroupTop = hoverBandRect
    ? resolvePreviewHoverActionTop(hoverBandRect)
    : 0
  const paragraphMenuLeft = Math.max(0, (hoverBandRect?.x ?? 0) - PARAGRAPH_MENU_GUIDE_INSET)
  const paragraphMenuTop = Math.max(0, (hoverBandRect?.y ?? 0) - PARAGRAPH_MENU_GUIDE_INSET)
  const paragraphMenuHeightStep = Number.isFinite(baselineStepCss) && baselineStepCss > 0
    ? baselineStepCss
    : 1
  const paragraphMenuRawMaxHeight = Math.max(
    PREVIEW_ACTION_BUTTON_SIZE * PARAGRAPH_MENU_MIN_BUTTON_ROWS,
    Math.min(PARAGRAPH_MENU_MAX_HEIGHT, pageHeightCss - paragraphMenuTop),
  )
  const paragraphMenuMaxHeight = Math.max(
    paragraphMenuHeightStep,
    Math.floor(paragraphMenuRawMaxHeight / paragraphMenuHeightStep) * paragraphMenuHeightStep,
  )
  const paragraphMenuWidth = resolvePreviewParagraphMenuWidth({
    left: paragraphMenuLeft,
    verticalEdges: gridColumnRightEdgesCss,
  })
  const paragraphMenuRenderedWidth = paragraphMenuWidth + 1
  const hoveredKindLabel = hoveredEditTarget?.kind === "text"
    ? t("ui.editor.overlayActions.paragraph")
    : t("ui.editor.overlayActions.imagePlaceholder")
  const rolloverControlsLabel = hoveredEditTarget?.kind === "image"
    ? t("ui.editor.overlayActions.imageControls")
    : t("ui.editor.overlayActions.paragraphControls")
  const rolloverMenuOpen = Boolean(
    hoveredEditTarget
    && openRolloverMenuKey === hoveredEditTarget.key,
  )
  const paragraphMenuOpen = rolloverMenuOpen && hoveredEditTarget?.kind === "text"
  const imageMenuOpen = rolloverMenuOpen && hoveredEditTarget?.kind === "image"
  const paragraphMenuClassName = isDarkMode
    ? "bg-surface text-foreground shadow-none"
    : "bg-surface text-foreground shadow-none"
  const paragraphMenuLabelClassName = SETTINGS_OPEN_LIST_LABEL_CLASSNAME
  const paragraphMenuRowLabelClassName = SETTINGS_ROW_LABEL_CLASSNAME
  const paragraphMenuValueBadgeClassName = getSettingsValueBadgeClassName(isDarkMode)
  const paragraphMenuOptionListClassName = getSettingsOpenListClassName(isDarkMode)
  const paragraphMenuOptionClassName = (active: boolean, disabled: boolean) => (
    `${getSettingsOpenListOptionClassName(isDarkMode, active)} ${disabled ? "cursor-not-allowed opacity-45 hover:bg-transparent" : ""}`
  )
  const paragraphMenuSegmentButtonClassName = (active: boolean) => (
    getSettingsIconButtonClassName(isDarkMode, active)
  )
  const previewRolloverIconButtonClassName = `inline-flex items-center justify-center border-0 shadow-none ${
    isDarkMode
      ? "bg-surface text-foreground hover:bg-surface hover:text-foreground"
      : "bg-surface text-foreground hover:bg-surface hover:text-foreground"
  }`
  const previewRolloverIconClassName = SETTINGS_FINE_CHEVRON_ICON_CLASSNAME
  const rolloverMenuBodyStyle = {
    paddingLeft: ROLLOVER_MENU_BODY_INSET,
    paddingRight: ROLLOVER_MENU_BODY_INSET,
    paddingBottom: ROLLOVER_MENU_BOTTOM_INSET,
  }
  const rolloverMenuIconButtonStyle = {
    width: PREVIEW_ROLLOVER_MENU_BUTTON_WIDTH,
    minWidth: PREVIEW_ROLLOVER_MENU_BUTTON_WIDTH,
    height: PREVIEW_ROLLOVER_MENU_BUTTON_HEIGHT,
    minHeight: PREVIEW_ROLLOVER_MENU_BUTTON_HEIGHT,
    padding: 0,
  }
  const rolloverMenuIconStyle = {
    width: PREVIEW_ROLLOVER_MENU_SYMBOL_SIZE,
    height: PREVIEW_ROLLOVER_MENU_SYMBOL_SIZE,
    flexShrink: 0,
  }
  const paragraphMenuIconRowClassName = "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3"
  const paragraphMenuLeftIconGroupClassName = "flex items-center justify-start gap-x-0.5"
  const paragraphMenuRightIconGroupClassName = "flex items-center justify-end gap-x-0.5"
  const resizeHandleSize = Math.min(
    PREVIEW_RESIZE_HANDLE_SIZE,
    Math.max(PREVIEW_ACTION_BUTTON_SIZE, hoveredEditTarget?.rect.width ?? PREVIEW_RESIZE_HANDLE_SIZE),
    Math.max(PREVIEW_ACTION_BUTTON_SIZE, hoveredEditTarget?.rect.height ?? PREVIEW_RESIZE_HANDLE_SIZE),
  )
  const resizeHandleLeft = hoverVisibleRect
    ? hoverVisibleRect.x + hoverVisibleRect.width - resizeHandleSize
    : 0
  const resizeHandleTop = hoverVisibleRect
    ? hoverVisibleRect.y + hoverVisibleRect.height - resizeHandleSize
    : 0
  const paragraphChevronIconClassName = `${previewRolloverIconClassName} rotate-90`
  const horizontalAlignIconByValue = {
    left: AlignLeft,
    center: AlignCenter,
    right: AlignRight,
  } satisfies Record<TextAlignMode, typeof AlignLeft>
  const verticalAlignIconByValue = {
    top: AlignVerticalJustifyStart,
    center: AlignVerticalJustifyCenter,
    bottom: AlignVerticalJustifyEnd,
  } satisfies Record<TextVerticalAlignMode, typeof AlignVerticalJustifyStart>
  const activeHoverKey = hoveredTextKey ?? hoveredImageKey
  useEffect(() => {
    if (openRolloverMenuKey && openRolloverMenuKey !== activeHoverKey) {
      setOpenRolloverMenuKey(null)
    }
  }, [activeHoverKey, openRolloverMenuKey])

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

  const openRolloverMenu = useCallback((key: string) => {
    setOpenRolloverMenuKey((current) => (current === key ? current : key))
  }, [])

  const endActiveRolloverControl = () => {
    if (hoveredEditTarget?.kind === "text") {
      onParagraphRolloverControlEnd()
      onParagraphRolloverControlPreview(hoveredEditTarget.key, null)
      return
    }
    if (hoveredEditTarget?.kind === "image") {
      onImageRolloverControlEnd()
    }
  }

  const handleRolloverMenuPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation()
    if (hoveredEditTarget?.kind === "text") {
      onParagraphRolloverControlStart(hoveredEditTarget.key)
      return
    }
    if (hoveredEditTarget?.kind === "image") {
      onImageRolloverControlStart(hoveredEditTarget.key)
    }
  }

  const handleRolloverMenuPointerEnd = () => endActiveRolloverControl()

  const handleParagraphToggleChange = (
    patch: ParagraphRolloverControlPatch,
  ) => {
    if (hoveredEditTarget?.kind !== "text") return
    onParagraphRolloverControlStart(hoveredEditTarget.key)
    onParagraphRolloverControlChange(hoveredEditTarget.key, patch)
    onParagraphRolloverControlEnd()
  }

  const paragraphToggleRows = useMemo(() => (
    hoveredTextControls
      ? [
        {
          key: "reflow",
          label: t("ui.editor.paragraph.newspaperReflow"),
          checked: hoveredTextControls.reflow && !hoveredTextControls.reflowDisabled,
          disabled: hoveredTextControls.reflowDisabled,
          patch: (checked: boolean): ParagraphRolloverControlPatch => ({ reflow: checked }),
        },
        {
          key: "hyphenation",
          label: t("ui.editor.paragraph.hyphenation"),
          checked: hoveredTextControls.hyphenation,
          disabled: false,
          patch: (checked: boolean): ParagraphRolloverControlPatch => ({ hyphenation: checked }),
        },
        {
          key: "snapX",
          label: t("ui.editor.paragraph.snapColumns"),
          checked: hoveredTextControls.snapX,
          disabled: false,
          patch: (checked: boolean): ParagraphRolloverControlPatch => ({ snapX: checked }),
        },
        {
          key: "snapY",
          label: t("ui.editor.paragraph.snapBaseline"),
          checked: hoveredTextControls.snapY,
          disabled: false,
          patch: (checked: boolean): ParagraphRolloverControlPatch => ({ snapY: checked }),
        },
      ]
      : []
  ), [hoveredTextControls, t])
  const rolloverRotationValue = useMemo(
    () => [hoveredTextControls?.rotation ?? 0],
    [hoveredTextControls?.rotation],
  )
  const imageRolloverRotationValue = useMemo(
    () => [hoveredImageControls?.rotation ?? 0],
    [hoveredImageControls?.rotation],
  )
  const imageToggleRows = useMemo(() => (
    hoveredImageControls
      ? [
        {
          key: "snapX",
          label: t("ui.editor.paragraph.snapColumns"),
          checked: hoveredImageControls.snapX,
          patch: (checked: boolean): ImageRolloverControlPatch => ({ snapX: checked }),
        },
        {
          key: "snapY",
          label: t("ui.editor.paragraph.snapBaseline"),
          checked: hoveredImageControls.snapY,
          patch: (checked: boolean): ImageRolloverControlPatch => ({ snapY: checked }),
        },
      ]
      : []
  ), [hoveredImageControls, t])
  const handleParagraphAlignmentChange = (
    patch: Pick<ParagraphRolloverControlPatch, "align" | "verticalAlign">,
  ) => {
    if (hoveredEditTarget?.kind !== "text") return
    onParagraphRolloverControlStart(hoveredEditTarget.key)
    onParagraphRolloverControlChange(hoveredEditTarget.key, patch)
    onParagraphRolloverControlEnd()
  }

  const previewParagraphAlignmentChange = (
    patch: Pick<ParagraphRolloverControlPatch, "align" | "verticalAlign">,
  ) => {
    if (hoveredEditTarget?.kind !== "text") return
    onParagraphRolloverControlPreview(hoveredEditTarget.key, patch)
  }

  const handleImageToggleChange = (patch: ImageRolloverControlPatch) => {
    if (hoveredEditTarget?.kind !== "image") return
    onImageRolloverControlStart(hoveredEditTarget.key)
    onImageRolloverControlChange(hoveredEditTarget.key, patch)
    onImageRolloverControlEnd()
  }

  const renderRolloverIconButton = ({
    Icon,
    buttonKey,
    active = false,
    ariaLabel,
    title,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onPointerDown,
    onClick,
  }: {
    Icon: LucideIcon
    buttonKey?: string
    active?: boolean
    ariaLabel: string
    title: string
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    onFocus?: () => void
    onBlur?: () => void
    onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
    onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void
  }) => (
    <button
      key={buttonKey}
      type="button"
      data-preview-edit-affordance="true"
      data-preview-menu-control="true"
      className={paragraphMenuSegmentButtonClassName(active)}
      style={rolloverMenuIconButtonStyle}
      aria-pressed={active}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseDown={stopPreviewButtonEvent}
      onPointerDown={onPointerDown}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} style={rolloverMenuIconStyle} />
    </button>
  )

  const renderRolloverIconRow = (
    left: ReactNode,
    right: ReactNode,
  ) => (
    <div className={paragraphMenuIconRowClassName}>
      <div className={paragraphMenuLeftIconGroupClassName}>{left}</div>
      <div className={paragraphMenuRightIconGroupClassName}>{right}</div>
    </div>
  )

  const renderAlignmentButton = (
    alignKind: "horizontal" | "vertical",
    value: TextAlignMode | TextVerticalAlignMode,
  ) => {
    const isHorizontal = alignKind === "horizontal"
    const AlignIcon = isHorizontal
      ? horizontalAlignIconByValue[value as TextAlignMode]
      : verticalAlignIconByValue[value as TextVerticalAlignMode]
    const active = isHorizontal
      ? hoveredTextControls?.align === value
      : hoveredTextControls?.verticalAlign === value
    const patch = isHorizontal
      ? { align: value as TextAlignMode }
      : { verticalAlign: value as TextVerticalAlignMode }
    return renderRolloverIconButton({
      Icon: AlignIcon,
      buttonKey: `rollover-${alignKind}-align-${value}`,
      active,
      ariaLabel: t(`ui.editor.paragraph.${value}`),
      title: t(`ui.editor.paragraph.${value}`),
      onMouseEnter: () => previewParagraphAlignmentChange(patch),
      onMouseLeave: () => {
        if (hoveredEditTarget?.kind === "text") {
          onParagraphRolloverControlPreview(hoveredEditTarget.key, null)
        }
      },
      onFocus: () => previewParagraphAlignmentChange(patch),
      onBlur: () => {
        if (hoveredEditTarget?.kind === "text") {
          onParagraphRolloverControlPreview(hoveredEditTarget.key, null)
        }
      },
      onClick: (event) => {
        stopPreviewButtonEvent(event)
        if (hoveredEditTarget?.kind !== "text") return
        handleParagraphAlignmentChange(patch)
        onParagraphRolloverControlPreview(hoveredEditTarget.key, null)
      },
    })
  }

  const renderRolloverRotationSlider = ({
    value,
    currentRotation,
    onChange,
    onCommit,
  }: {
    value: number[]
    currentRotation: number
    onChange: (rotation: number) => void
    onCommit: () => void
  }) => (
    <EditableSlider
      label={t("ui.editor.paragraph.rotation")}
      inputAriaLabel={t("ui.editor.paragraph.rotation")}
      value={value}
      defaultValue={[0]}
      min={-180}
      max={180}
      step={1}
      shiftStep={5}
      fibonacciStep
      onValueChange={([nextValue]) => {
        if (Math.abs(nextValue - currentRotation) < 0.0001) return
        onChange(nextValue)
      }}
      onValueCommit={onCommit}
      formatValue={(nextValue) => `${Math.round(nextValue)}°`}
      labelClassName={paragraphMenuRowLabelClassName}
      valueClassName={paragraphMenuValueBadgeClassName}
    />
  )

  const renderRolloverToggleList = <Patch,>(
    rows: readonly RolloverToggleRow<Patch>[],
    onToggle: (patch: Patch) => void,
  ) => (
    <div className="space-y-1.5">
      <Label className={paragraphMenuLabelClassName}>{t("ui.editor.paragraph.options")}</Label>
      <div
        role="listbox"
        aria-multiselectable="true"
        aria-label={t("ui.editor.paragraph.options")}
        className={paragraphMenuOptionListClassName}
      >
        {rows.map((row) => {
          const disabled = row.disabled ?? false
          return (
            <button
              key={row.key}
              type="button"
              role="option"
              aria-selected={row.checked}
              disabled={disabled}
              className={paragraphMenuOptionClassName(row.checked, disabled)}
              onClick={(event) => {
                stopPreviewButtonEvent(event)
                if (disabled) return
                onToggle(row.patch(!row.checked))
              }}
            >
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="ml-auto shrink-0 pl-3 text-right tabular-nums">
                {row.checked ? t("ui.common.on") : t("ui.common.off")}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderRolloverMenuActions = () => (
    renderRolloverIconRow(
      <>
        {renderRolloverIconButton({
          Icon: SquarePen,
          ariaLabel: t("ui.editor.overlayActions.edit", { kind: hoveredKindLabel }),
          title: t("ui.editor.overlayActions.edit", { kind: hoveredKindLabel }),
          onClick: (event) => {
            stopPreviewButtonEvent(event)
            if (!hoveredEditTarget) return
            clearHover()
            onPreviewEditorOpen?.()
            if (hoveredEditTarget.kind === "text") {
              openTextEditor(hoveredEditTarget.key)
              return
            }
            openImageEditor(hoveredEditTarget.key)
          },
        })}
        {renderRolloverIconButton({
          Icon: Copy,
          ariaLabel: hoveredEditTarget?.kind === "text"
            ? t("ui.editor.overlayActions.duplicateText")
            : t("ui.editor.overlayActions.duplicateImage"),
          title: hoveredEditTarget?.kind === "text"
            ? getTextCopyRolloverTitle(t)
            : t("ui.editor.overlayActions.duplicateImageTooltip"),
          onPointerDown: (event) => {
            event.stopPropagation()
          },
          onClick: (event) => {
            stopPreviewButtonEvent(event)
            if (!hoveredEditTarget) return
            onCopyAffordanceActivate({
              key: hoveredEditTarget.key,
              kind: hoveredEditTarget.kind,
              clientX: event.clientX,
              clientY: event.clientY,
              altKey: event.altKey,
              shiftKey: event.shiftKey,
            })
          },
        })}
      </>,
      <>
        {renderRolloverIconButton({
          Icon: Trash2,
          ariaLabel: t("ui.editor.overlayActions.delete", { kind: hoveredKindLabel }),
          title: t("ui.editor.overlayActions.delete", { kind: hoveredKindLabel }),
          onPointerDown: (event) => {
            event.stopPropagation()
          },
          onClick: (event) => {
            stopPreviewButtonEvent(event)
            if (!hoveredEditTarget) return
            deletePreviewTarget(hoveredEditTarget.key)
          },
        })}
      </>,
    )
  )

  const rolloverMenu = rolloverMenuOpen && hoveredEditTarget ? (
    <div
      data-preview-edit-affordance="true"
      className={`pointer-events-auto absolute overflow-y-auto overscroll-contain ${paragraphMenuClassName}`}
      style={{
        left: paragraphMenuLeft,
        top: paragraphMenuTop,
        width: paragraphMenuRenderedWidth,
        zIndex: 120,
        maxHeight: paragraphMenuMaxHeight,
        transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
        transformOrigin: "0 0",
      }}
      onMouseEnter={() => openRolloverMenu(hoveredEditTarget.key)}
      onMouseLeave={() => {
        setOpenRolloverMenuKey(null)
        endActiveRolloverControl()
        if (hoveredEditTarget.kind === "text") {
          onParagraphRolloverControlPreview(hoveredEditTarget.key, null)
        }
      }}
      onPointerDown={handleRolloverMenuPointerDown}
      onPointerUp={handleRolloverMenuPointerEnd}
      onPointerCancel={handleRolloverMenuPointerEnd}
    >
      <div className="space-y-2" style={rolloverMenuBodyStyle}>
        {renderRolloverMenuActions()}
        {paragraphMenuOpen && hoveredTextControls ? (
          <>
            <div className="group min-h-8">
              <Label
                className={`${paragraphMenuLabelClassName} group-hover:hidden group-focus-within:hidden`}
              >
                {t("ui.editor.paragraph.alignment")}
              </Label>
              <div
                className="hidden group-hover:block group-focus-within:block"
              >
                {renderRolloverIconRow(
                  HORIZONTAL_ALIGNMENTS.map((align) => renderAlignmentButton("horizontal", align)),
                  VERTICAL_ALIGNMENTS.map((verticalAlign) => renderAlignmentButton("vertical", verticalAlign)),
                )}
              </div>
            </div>
            <div className="space-y-2">
              {renderRolloverRotationSlider({
                value: rolloverRotationValue,
                currentRotation: hoveredTextControls.rotation,
                onChange: (rotationValue) => {
                  onParagraphRolloverControlChange(hoveredEditTarget.key, { rotation: rotationValue })
                },
                onCommit: onParagraphRolloverControlEnd,
              })}
              {renderRolloverToggleList(paragraphToggleRows, handleParagraphToggleChange)}
            </div>
          </>
        ) : null}
        {imageMenuOpen && hoveredImageControls ? (
          <>
            {renderRolloverRotationSlider({
              value: imageRolloverRotationValue,
              currentRotation: hoveredImageControls.rotation,
              onChange: (rotationValue) => {
                onImageRolloverControlChange(hoveredEditTarget.key, { rotation: rotationValue })
              },
              onCommit: onImageRolloverControlEnd,
            })}
            {renderRolloverToggleList(imageToggleRows, handleImageToggleChange)}
          </>
        ) : null}
      </div>
    </div>
  ) : null

  return (
    <>
      {showHoveredEditTarget && hoveredEditTarget ? (
        <div
          className="pointer-events-none absolute"
          style={{
            left: stageLeftCss + pageWidthCss / 2,
            top: stageTopCss + pageHeightCss / 2,
            zIndex: 80,
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
              data-preview-icon-surface="true"
              className={`pointer-events-auto absolute flex items-center justify-center rounded-sm border shadow-md transition-colors ${
                isDarkMode
                  ? "border-border bg-[color-mix(in_srgb,var(--color-panel-bg)_95%,transparent)] text-muted-foreground hover:border-accent hover:bg-surface hover:text-accent"
                  : "border-divider bg-[color-mix(in_srgb,var(--color-page-default)_95%,transparent)] text-muted-foreground hover:border-accent hover:bg-page hover:text-accent"
              }`}
              style={{
                left: leftActionGroupLeft,
                top: actionGroupTop,
                width: PREVIEW_ACTION_BUTTON_SIZE,
                height: PREVIEW_ACTION_BUTTON_SIZE,
                transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
              }}
              onMouseDown={stopPreviewButtonEvent}
              onClick={(event) => {
                stopPreviewButtonEvent(event)
                onHoveredLayerLockToggle(hoveredEditTarget.key, false)
              }}
              aria-label={t("ui.editor.overlayActions.unlock", { kind: hoveredKindLabel })}
              title={t("ui.editor.overlayActions.unlock", { kind: hoveredKindLabel })}
            >
              <Lock className="h-3 w-3" />
            </button>
          ) : (
            <>
              <div
                className="pointer-events-none absolute"
                style={{
                  left: paragraphMenuLeft,
                  top: paragraphMenuTop,
                  width: PREVIEW_LAYER_AFFORDANCE_SIZE,
                  height: PREVIEW_LAYER_AFFORDANCE_SIZE,
                  transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
                }}
              >
                <button
                  type="button"
                  data-preview-edit-affordance="true"
                  data-preview-icon-surface="true"
                  className={`pointer-events-auto ${previewRolloverIconButtonClassName}`}
                  style={{
                    width: PREVIEW_LAYER_AFFORDANCE_SIZE,
                    height: PREVIEW_LAYER_AFFORDANCE_SIZE,
                  }}
                  onMouseDown={stopPreviewButtonEvent}
                  onMouseEnter={() => openRolloverMenu(hoveredEditTarget.key)}
                  onFocus={() => openRolloverMenu(hoveredEditTarget.key)}
                  onClick={(event) => {
                    stopPreviewButtonEvent(event)
                    setOpenRolloverMenuKey((current) => (
                      current === hoveredEditTarget.key ? null : hoveredEditTarget.key
                    ))
                  }}
                  aria-label={rolloverControlsLabel}
                  title={rolloverControlsLabel}
                >
                  <ChevronUp className={paragraphChevronIconClassName} />
                </button>
              </div>
              {rolloverMenu}
              <button
                type="button"
                data-preview-edit-affordance="true"
                data-preview-icon-surface="true"
                className={`pointer-events-auto absolute cursor-nwse-resize ${previewRolloverIconButtonClassName}`}
                style={{
                  left: resizeHandleLeft,
                  top: resizeHandleTop,
                  width: resizeHandleSize,
                  height: resizeHandleSize,
                  transform: pageRotation !== 0 ? `rotate(${-pageRotation}deg)` : undefined,
                }}
                onPointerDown={(event) => {
                  onLayerResizeHandlePointerDown(hoveredEditTarget.kind, hoveredEditTarget.key, event)
                }}
                aria-label={hoveredEditTarget.kind === "text"
                  ? t("ui.editor.overlayActions.resizeParagraph")
                  : t("ui.editor.overlayActions.resizeImagePlaceholder")}
                title={hoveredEditTarget.kind === "text"
                  ? t("ui.editor.overlayActions.resizeParagraphTooltip")
                  : t("ui.editor.overlayActions.resizeImagePlaceholderTooltip")}
              >
                <MoveDiagonal2 className={previewRolloverIconClassName} />
              </button>
            </>
          )}
        </div>
      ) : null}

      {editorSidebar}
    </>
  )
}
