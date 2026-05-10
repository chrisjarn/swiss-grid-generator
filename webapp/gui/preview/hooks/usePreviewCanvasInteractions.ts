import type { PreviewCanvasInteractionArgs } from "@/gui/preview/hooks/preview-canvas-interaction-types"
import { usePreviewImagePlaceholderInteractions } from "@/gui/preview/hooks/usePreviewImagePlaceholderInteractions"
import { usePreviewPointerSelectionRouting } from "@/gui/preview/hooks/usePreviewPointerSelectionRouting"
import { usePreviewTextLayerInteractions } from "@/gui/preview/hooks/usePreviewTextLayerInteractions"

export function usePreviewCanvasInteractions<Key extends string, StyleKey extends string>({
  ...args
}: PreviewCanvasInteractionArgs<Key, StyleKey>) {
  const {
    handleTextDrop,
    openTextEditorFromCanvas,
  } = usePreviewTextLayerInteractions(args)

  const {
    handleImageDrop,
    handleImageDoubleClick,
  } = usePreviewImagePlaceholderInteractions(args)

  return usePreviewPointerSelectionRouting({
    ...args,
    handleTextDrop,
    handleImageDrop,
    openTextEditorFromCanvas,
    handleImageDoubleClick,
    activeEditorTarget: args.activeEditorTarget,
  })
}
