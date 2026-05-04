import type { BlockEditorState } from "@/components/editor/block-editor-types"

export function getBlockEditorLiveSignature<StyleKey extends string>(
  editorState: BlockEditorState<StyleKey>,
): string {
  return [
    editorState.target,
    editorState.draftStyle,
    editorState.draftFont,
    editorState.draftFontWeight,
    editorState.draftColumns,
    editorState.draftRows,
    editorState.draftHeightBaselines,
    editorState.draftAlign,
    editorState.draftVerticalAlign,
    editorState.draftColor,
    editorState.draftReflow ? "1" : "0",
    editorState.draftSyllableDivision ? "1" : "0",
    editorState.draftSnapToColumns ? "1" : "0",
    editorState.draftSnapToBaseline ? "1" : "0",
    editorState.draftItalic ? "1" : "0",
    editorState.draftOpticalKerning ? "1" : "0",
    editorState.draftTrackingScale,
    editorState.draftTrackingRuns.map((run) => `${run.start}:${run.end}:${run.trackingScale}`).join(","),
    editorState.draftTextFormatRuns.map((run) => `${run.start}:${run.end}:${run.fontFamily ?? ""}:${run.fontWeight ?? ""}:${run.italic === true ? 1 : run.italic === false ? 0 : ""}:${run.styleKey ?? ""}:${run.color ?? ""}`).join(","),
    editorState.draftRotation.toFixed(3),
    editorState.draftFxSize,
    editorState.draftFxLeading,
    editorState.draftTextEdited ? "1" : "0",
    editorState.draftText,
  ].join("|")
}
