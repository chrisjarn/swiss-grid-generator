import { useCallback, useEffect, useRef } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

import { getImageSchemeColorToken } from "@/core/config/color-schemes"
import type { PreviewCanvasInteractionArgs } from "@/gui/preview/hooks/preview-canvas-interaction-types"
import type { DragState as PreviewDragState } from "@/gui/preview/hooks/usePreviewDrag"
import { clampFreePlacementRow, clampLayerColumn } from "@/core/layout/layer-placement"
import type { PagePoint } from "@/gui/preview/lib/preview-types"
import type { ModulePosition } from "@/core/types/preview-layout"

type Args<Key extends string, StyleKey extends string> = Pick<
  PreviewCanvasInteractionArgs<Key, StyleKey>,
  | "findTopmostImageAtPoint"
  | "resolveModulePositionAtPagePoint"
  | "clampImageModulePosition"
  | "getGridMetrics"
  | "getImageSpan"
  | "getImageRows"
  | "getImageHeightBaselines"
  | "getImageColorReference"
  | "getImageOpacity"
  | "getImageRotation"
  | "isImageSnapToColumnsEnabled"
  | "isImageSnapToBaselineEnabled"
  | "gridCols"
  | "recordHistoryBeforeChange"
  | "insertImagePlaceholder"
  | "setImageModulePositions"
  | "onSelectLayer"
  | "onImagePlaceholderCreated"
  | "promoteLayerToTop"
  | "getNextImagePlaceholderId"
  | "ensureImagePlaceholdersVisible"
  | "openImageEditor"
>

type DoubleClickArgs = {
  event: ReactMouseEvent<HTMLCanvasElement>
  pagePoint: PagePoint
}

const IMAGE_COLOR_SHORTCUT_KEYS = ["4", "3", "2", "1"] as const
const IMAGE_COLOR_SHORTCUT_KEY_SET = new Set<string>(IMAGE_COLOR_SHORTCUT_KEYS)

function resolveImageColorShortcutKey(event: KeyboardEvent): string | null {
  const key = IMAGE_COLOR_SHORTCUT_KEY_SET.has(event.key)
    ? event.key
    : IMAGE_COLOR_SHORTCUT_KEY_SET.has(event.code.replace(/^Digit/, ""))
      ? event.code.replace(/^Digit/, "")
      : IMAGE_COLOR_SHORTCUT_KEY_SET.has(event.code.replace(/^Numpad/, ""))
        ? event.code.replace(/^Numpad/, "")
        : null
  return key
}

function resolveHeldImageColorShortcut(keys: ReadonlySet<string>): string | null {
  for (const key of IMAGE_COLOR_SHORTCUT_KEYS) {
    if (keys.has(key)) return getImageSchemeColorToken(Number.parseInt(key, 10) - 1)
  }
  return null
}

export function usePreviewImagePlaceholderInteractions<Key extends string, StyleKey extends string>({
  findTopmostImageAtPoint,
  resolveModulePositionAtPagePoint,
  clampImageModulePosition,
  getGridMetrics,
  getImageSpan,
  getImageRows,
  getImageHeightBaselines,
  getImageColorReference,
  getImageOpacity,
  getImageRotation,
  isImageSnapToColumnsEnabled,
  isImageSnapToBaselineEnabled,
  gridCols,
  recordHistoryBeforeChange,
  insertImagePlaceholder,
  setImageModulePositions,
  onSelectLayer,
  onImagePlaceholderCreated,
  promoteLayerToTop,
  getNextImagePlaceholderId,
  ensureImagePlaceholdersVisible,
  openImageEditor,
}: Args<Key, StyleKey>) {
  const heldImageColorShortcutKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const resolvedKey = resolveImageColorShortcutKey(event)
      if (!resolvedKey) return
      heldImageColorShortcutKeysRef.current.add(resolvedKey)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const resolvedKey = resolveImageColorShortcutKey(event)
      if (!resolvedKey) return
      heldImageColorShortcutKeysRef.current.delete(resolvedKey)
    }

    const clearHeldKeys = () => {
      heldImageColorShortcutKeysRef.current.clear()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", clearHeldKeys)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", clearHeldKeys)
    }
  }, [])

  const handleImageDrop = useCallback((drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    const sourceColumns = getImageSpan(drag.key)
    const sourceRows = getImageRows(drag.key)
    const sourceHeightBaselines = getImageHeightBaselines(drag.key)
    const sourceColor = getImageColorReference(drag.key)
    const sourceOpacity = getImageOpacity(drag.key)
    const sourceRotation = getImageRotation(drag.key)
    const sourceSnapToColumns = isImageSnapToColumnsEnabled(drag.key)
    const sourceSnapToBaseline = isImageSnapToBaselineEnabled(drag.key)
    const metrics = getGridMetrics()
    const resolvedPosition = {
      col: clampLayerColumn(nextPreview.col, { span: sourceColumns, gridCols, snapToColumns: sourceSnapToColumns }),
      row: clampFreePlacementRow(nextPreview.row, metrics.maxBaselineRow),
    }

    if (copyOnDrop) {
      const newKey = getNextImagePlaceholderId()
      ensureImagePlaceholdersVisible?.()
      recordHistoryBeforeChange()
      insertImagePlaceholder(newKey, {
        position: resolvedPosition,
        columns: sourceColumns,
        rows: sourceRows,
        heightBaselines: sourceHeightBaselines,
        color: sourceColor,
        opacity: sourceOpacity,
        snapToColumns: sourceSnapToColumns,
        snapToBaseline: sourceSnapToBaseline,
        rotation: sourceRotation,
        afterKey: drag.key,
      })
      promoteLayerToTop(newKey)
      onSelectLayer?.(newKey)
      return
    }

    recordHistoryBeforeChange()
    setImageModulePositions((current) => ({
      ...current,
      [drag.key]: resolvedPosition,
    }))
  }, [
    ensureImagePlaceholdersVisible,
    getGridMetrics,
    getImageHeightBaselines,
    getImageColorReference,
    getImageOpacity,
    getImageRotation,
    getImageRows,
    isImageSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    getImageSpan,
    getNextImagePlaceholderId,
    gridCols,
    insertImagePlaceholder,
    onSelectLayer,
    promoteLayerToTop,
    recordHistoryBeforeChange,
    setImageModulePositions,
  ])

  const handleImageDoubleClick = useCallback(({ event, pagePoint }: DoubleClickArgs): boolean => {
    const targetKey = findTopmostImageAtPoint(pagePoint.x, pagePoint.y)
    if (targetKey) {
      openImageEditor(targetKey)
      return true
    }

    if (!(event.shiftKey || event.ctrlKey)) {
      return false
    }

    const rawPosition = resolveModulePositionAtPagePoint(pagePoint.x, pagePoint.y)
    if (!rawPosition) return true

    const newKey = getNextImagePlaceholderId()
    const snapped = clampImageModulePosition(rawPosition, 1, 1)
    const shortcutColor = event.shiftKey
      ? resolveHeldImageColorShortcut(heldImageColorShortcutKeysRef.current)
      : null
    ensureImagePlaceholdersVisible?.()
    recordHistoryBeforeChange()
    insertImagePlaceholder(newKey, {
      position: snapped,
      color: shortcutColor ?? undefined,
    })
    promoteLayerToTop(newKey)
    onImagePlaceholderCreated?.(newKey, pagePoint)
    return true
  }, [
    clampImageModulePosition,
    findTopmostImageAtPoint,
    getNextImagePlaceholderId,
    insertImagePlaceholder,
    ensureImagePlaceholdersVisible,
    onImagePlaceholderCreated,
    openImageEditor,
    promoteLayerToTop,
    recordHistoryBeforeChange,
    resolveModulePositionAtPagePoint,
  ])

  return {
    handleImageDrop,
    handleImageDoubleClick,
  }
}
