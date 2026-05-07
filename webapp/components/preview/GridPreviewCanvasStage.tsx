"use client"

import type { CSSProperties, MouseEventHandler, PointerEventHandler, RefObject } from "react"
import type { Dispatch, SetStateAction } from "react"

import { InlineBlockTextarea, type InlineEditorLayout } from "@/components/editor/InlineBlockTextarea"
import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"

type Props<StyleKey extends string> = {
  staticCanvasRef: RefObject<HTMLCanvasElement | null>
  imageCanvasRef: RefObject<HTMLCanvasElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>
  heldFrameCanvasRef: RefObject<HTMLCanvasElement | null>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  pageWidthCss: number
  pageHeightCss: number
  pageWidthPx: number
  pageHeightPx: number
  heldFrameVisible: boolean
  heldFrameWidthCss: number
  heldFrameHeightCss: number
  heldFrameWidthPx: number
  heldFrameHeightPx: number
  interactionsPaused: boolean
  canvasCursorClass: string
  canvasCursorStyle?: CSSProperties
  handlePreviewPointerDown: PointerEventHandler<HTMLCanvasElement>
  handleCanvasPointerMove: PointerEventHandler<HTMLCanvasElement>
  handleCanvasPointerUp: PointerEventHandler<HTMLCanvasElement>
  handleCanvasPointerCancel: PointerEventHandler<HTMLCanvasElement>
  handleCanvasLostPointerCapture: PointerEventHandler<HTMLCanvasElement>
  handleCanvasMouseMove: MouseEventHandler<HTMLCanvasElement>
  handleCanvasMouseLeave: MouseEventHandler<HTMLCanvasElement>
  handleCanvasDoubleClick: MouseEventHandler<HTMLCanvasElement>
  editorState: BlockEditorState<StyleKey> | null
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
  inlineEditorLayout: InlineEditorLayout | null
  rotation: number
  scale: number
  baselineStep: number
  imageColorScheme: ImageColorSchemeId
  pageBackgroundColor: string | null
  closeEditor: () => void
  saveEditor: () => void
  getStyleSizeValue: (styleKey: StyleKey) => number
  getStyleLeadingValue: (styleKey: StyleKey) => number
  isFxStyle: (styleKey: StyleKey) => boolean
  showDocumentHelpIndicator?: boolean
  onDocumentHelpHover?: () => void
}

export function GridPreviewCanvasStage<StyleKey extends string>({
  staticCanvasRef,
  imageCanvasRef,
  canvasRef,
  overlayCanvasRef,
  heldFrameCanvasRef,
  textareaRef,
  pageWidthCss,
  pageHeightCss,
  pageWidthPx,
  pageHeightPx,
  heldFrameVisible,
  heldFrameWidthCss,
  heldFrameHeightCss,
  heldFrameWidthPx,
  heldFrameHeightPx,
  interactionsPaused,
  canvasCursorClass,
  canvasCursorStyle,
  handlePreviewPointerDown,
  handleCanvasPointerMove,
  handleCanvasPointerUp,
  handleCanvasPointerCancel,
  handleCanvasLostPointerCapture,
  handleCanvasMouseMove,
  handleCanvasMouseLeave,
  handleCanvasDoubleClick,
  editorState,
  setEditorState,
  inlineEditorLayout,
  rotation,
  scale,
  baselineStep,
  imageColorScheme,
  pageBackgroundColor,
  closeEditor,
  saveEditor,
  getStyleSizeValue,
  getStyleLeadingValue,
  isFxStyle,
  showDocumentHelpIndicator = false,
  onDocumentHelpHover,
}: Props<StyleKey>) {
  return (
    <div
      data-preview-document-root="true"
      className="relative"
      style={{ width: pageWidthCss, height: pageHeightCss }}
      onMouseEnter={showDocumentHelpIndicator ? onDocumentHelpHover : undefined}
    >
      <canvas
        ref={staticCanvasRef}
        width={pageWidthPx}
        height={pageHeightPx}
        style={{ width: pageWidthCss, height: pageHeightCss }}
        className="absolute inset-0 block shadow-lg"
      />
      <canvas
        ref={imageCanvasRef}
        width={pageWidthPx}
        height={pageHeightPx}
        style={{ width: pageWidthCss, height: pageHeightCss }}
        className="pointer-events-none absolute inset-0 block"
      />
      <canvas
        ref={canvasRef}
        width={pageWidthPx}
        height={pageHeightPx}
        style={{ width: pageWidthCss, height: pageHeightCss, ...canvasCursorStyle }}
        className={`absolute inset-0 block touch-none ${interactionsPaused ? "pointer-events-none" : canvasCursorClass}`}
        onPointerDown={interactionsPaused ? undefined : handlePreviewPointerDown}
        onPointerMove={interactionsPaused ? undefined : handleCanvasPointerMove}
        onPointerUp={interactionsPaused ? undefined : handleCanvasPointerUp}
        onPointerCancel={interactionsPaused ? undefined : handleCanvasPointerCancel}
        onLostPointerCapture={interactionsPaused ? undefined : handleCanvasLostPointerCapture}
        onMouseMove={interactionsPaused ? undefined : handleCanvasMouseMove}
        onMouseLeave={interactionsPaused ? undefined : handleCanvasMouseLeave}
        onDoubleClick={interactionsPaused ? undefined : handleCanvasDoubleClick}
      />
      <canvas
        ref={overlayCanvasRef}
        width={pageWidthPx}
        height={pageHeightPx}
        style={{ width: pageWidthCss, height: pageHeightCss }}
        className="pointer-events-none absolute inset-0 block"
      />
      <canvas
        ref={heldFrameCanvasRef}
        width={heldFrameWidthPx}
        height={heldFrameHeightPx}
        aria-hidden="true"
        style={{
          width: heldFrameWidthCss,
          height: heldFrameHeightCss,
          opacity: heldFrameVisible ? 1 : 0,
        }}
        className="pointer-events-none absolute left-0 top-0 z-20 block"
      />
      {showDocumentHelpIndicator ? <HelpIndicatorLine /> : null}
      <InlineBlockTextarea
        editorState={editorState}
        setEditorState={setEditorState}
        textareaRef={textareaRef}
        layout={inlineEditorLayout}
        pageWidth={pageWidthCss}
        pageHeight={pageHeightCss}
        pageRotation={rotation}
        scale={scale}
        baselineStep={baselineStep}
        imageColorScheme={imageColorScheme}
        pageBackgroundColor={pageBackgroundColor}
        closeEditor={closeEditor}
        saveEditor={saveEditor}
        getStyleSizeValue={getStyleSizeValue}
        getStyleLeadingValue={getStyleLeadingValue}
        isFxStyle={isFxStyle}
      />
    </div>
  )
}
