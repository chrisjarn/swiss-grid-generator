"use client"

import { useEffect, useRef, useState } from "react"

import { EditorSidebarSection } from "@/gui/panels/EditorSidebarSection"
import { SidebarSectionScrollFrame } from "@/gui/panels/SidebarSectionScrollFrame"
import { FontSelect } from "@/shared/ui/font-select"
import { EditorColorSchemeControls } from "@/gui/editors/EditorColorSchemeControls"
import { Label } from "@/shared/ui/label"
import { getNeutralFormControlClassName } from "@/shared/ui/popup-styles"
import { DebouncedSlider } from "@/shared/ui/slider"
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TopSelectContent,
} from "@/shared/ui/select"
import { Switch } from "@/shared/ui/switch"
import {
  FONT_OPTIONS,
  getFontFamilyCss,
  getFontVariantById,
  getFontVariants,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"
import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { TextEditorControls as SharedTextEditorControls } from "@/lib/preview-overlay-controls"
import {
  applyTextFormatToRange,
  getUniformTextFormatValueForRange,
  rebaseTextFormatRuns,
  type BaseTextFormat,
} from "@/lib/text-format-runs"
import {
  formatTrackingScale,
  MAX_TRACKING_SCALE,
  MIN_TRACKING_SCALE,
} from "@/lib/text-rendering"
import {
  applyTrackingScaleToRange,
  getUniformTrackingScaleForRange,
  rebaseTextTrackingRuns,
} from "@/lib/text-tracking-runs"
import { DOCUMENT_VARIABLE_DEFINITIONS } from "@/lib/document-variable-definitions"
import {
  EDITOR_PANEL_PERSISTENCE_RESET_EVENT,
  TEXT_EDITOR_SCROLL_STORAGE_KEY,
  TEXT_EDITOR_SECTIONS_STORAGE_KEY,
} from "@/lib/editor-panel-persistence"
import { resolveCustomStyleSeedMetrics } from "@/lib/preview-text-config"
import { TEXT_SYMBOL_PALETTE_GROUPS } from "@/lib/text-symbol-palette"
import { useAutoScrollOpenedSection } from "@/gui/editors/hooks/useAutoScrollOpenedSection"
import { usePersistedSectionState } from "@/gui/editors/hooks/usePersistedSectionState"
import { PREVIEW_PERF_UPDATED_EVENT, type PerfPayload } from "@/gui/preview/hooks/usePreviewPerf"
import { useStateSnapshotSelectPreview } from "@/gui/editors/hooks/useStateSnapshotSelectPreview"
import type { HelpSectionId } from "@/lib/help-registry"
import { LabeledControlRow } from "@/shared/ui/labeled-control-row"
import { useTranslation } from "@/lib/i18n/useTranslation"
import type { MessageKey } from "@/lib/i18n/messages"
import type { BlockEditorTextAlign, BlockEditorVerticalAlign } from "@/gui/editors/block-editor-types"

type TextEditorPanelProps<StyleKey extends string> = {
  controls: SharedTextEditorControls<StyleKey>
  showHelpIndicator?: boolean
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  showRolloverInfo?: boolean
  isDarkMode?: boolean
}

type SectionKey = "layout" | "type" | "symbols" | "placeholders" | "info"
const SECTION_HEADER_CLICK_DELAY_MS = 180
const TEXT_EDITOR_SECTION_KEYS: SectionKey[] = ["layout", "type", "symbols", "placeholders", "info"]
const RECENT_SYMBOLS_STORAGE_KEY = "swiss-grid-generator:text-editor-recent-symbols"
const MAX_RECENT_SYMBOL_COUNT = 12
const SYMBOL_FONT_FAMILY: FontFamily = "Noto Sans Symbols 2"

const TEXT_EDITOR_COLLAPSED_DEFAULTS: Record<SectionKey, boolean> = {
  layout: true,
  type: true,
  symbols: true,
  placeholders: true,
  info: true,
}

const TEXT_EDITOR_HELP_SECTION_BY_KEY: Record<SectionKey, HelpSectionId> = {
  layout: "help-editor-paragraph",
  type: "help-editor-typo",
  symbols: "help-editor-symbols",
  placeholders: "help-editor-placeholders",
  info: "help-editor-info",
}

const HORIZONTAL_ALIGN_MESSAGE_KEYS = {
  left: "editor.paragraph.left",
  center: "editor.paragraph.center",
  right: "editor.paragraph.right",
} satisfies Record<BlockEditorTextAlign, MessageKey>

const VERTICAL_ALIGN_MESSAGE_KEYS = {
  top: "editor.paragraph.top",
  center: "editor.paragraph.center",
  bottom: "editor.paragraph.bottom",
} satisfies Record<BlockEditorVerticalAlign, MessageKey>

function readTotalRenderTimeMs(): number | null {
  if (typeof window === "undefined") return null
  return getTotalRenderTimeMs(window.__sggPerf as PerfPayload | undefined)
}

function getTotalRenderTimeMs(payload: PerfPayload | undefined): number | null {
  if (!payload) return null
  const values = [payload.draw?.avg, payload.reflow?.avg, payload.autofit?.avg]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0)
}

export function TextEditorPanel<StyleKey extends string>({
  controls,
  showHelpIndicator = false,
  onOpenHelpSection,
  showRolloverInfo = true,
  isDarkMode = false,
}: TextEditorPanelProps<StyleKey>) {
  const { t } = useTranslation()
  const [fxSizeInput, setFxSizeInput] = useState("")
  const [fxLeadingInput, setFxLeadingInput] = useState("")
  const [trackingInput, setTrackingInput] = useState("")
  const [editorColorScheme, setEditorColorScheme] = useState<ImageColorSchemeId>(controls.selectedColorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const [collapsed, setCollapsed] = usePersistedSectionState(
    TEXT_EDITOR_SECTIONS_STORAGE_KEY,
    TEXT_EDITOR_COLLAPSED_DEFAULTS,
    { resetEventName: EDITOR_PANEL_PERSISTENCE_RESET_EVENT },
  )
  const [recentSymbols, setRecentSymbols] = useState<string[]>([])
  const [hasLoadedRecentSymbols, setHasLoadedRecentSymbols] = useState(false)
  const [totalRenderTimeMs, setTotalRenderTimeMs] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      setHasLoadedRecentSymbols(true)
      return
    }
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECENT_SYMBOLS_STORAGE_KEY) ?? "[]") as unknown
      if (!Array.isArray(parsed)) {
        setRecentSymbols([])
        return
      }
      setRecentSymbols(parsed
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .slice(0, MAX_RECENT_SYMBOL_COUNT))
    } catch {
      setRecentSymbols([])
    } finally {
      setHasLoadedRecentSymbols(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const update = (payload?: PerfPayload) => {
      setTotalRenderTimeMs((previous) => {
        const next = payload ? getTotalRenderTimeMs(payload) : readTotalRenderTimeMs()
        if (previous === null && next === null) return previous
        if (previous !== null && next !== null && Math.abs(previous - next) < 0.05) return previous
        return next
      })
    }

    const handlePerfUpdated = (event: Event) => {
      update((event as CustomEvent<PerfPayload>).detail)
    }

    update()
    window.addEventListener(PREVIEW_PERF_UPDATED_EVENT, handlePerfUpdated)
    return () => {
      window.removeEventListener(PREVIEW_PERF_UPDATED_EVENT, handlePerfUpdated)
    }
  }, [])

  const { scrollRootRef, registerSectionRef, bottomSpacerHeight } = useAutoScrollOpenedSection(collapsed, {
    resetEventName: EDITOR_PANEL_PERSISTENCE_RESET_EVENT,
    restoreKey: controls.editorState.target,
    scrollStorageKey: TEXT_EDITOR_SCROLL_STORAGE_KEY,
  })
  const sectionHeaderClickTimeoutRef = useRef<number | null>(null)
  const fxSelected = controls.isFxStyle(controls.editorState.draftStyle)

  const editorText = controls.editorState.draftText ?? ""
  const characterCount = editorText.length
  const wordCount = editorText.trim() ? editorText.trim().split(/\s+/).length : 0
  const canUseNewspaperReflow = controls.editorState.draftColumns > 1
  const selectionRange = controls.editorState.draftSelectionStart !== controls.editorState.draftSelectionEnd
    ? {
      start: controls.editorState.draftSelectionStart,
      end: controls.editorState.draftSelectionEnd,
    }
    : null
  const selectionCoversWholeText = Boolean(
    selectionRange
    && selectionRange.start === 0
    && selectionRange.end === editorText.length,
  )
  const selectionUsesScopedRuns = Boolean(selectionRange && !selectionCoversWholeText)
  const currentBaseTextFormat: BaseTextFormat<StyleKey, FontFamily> = {
    fontFamily: controls.editorState.draftFont,
    fontWeight: controls.editorState.draftFontWeight,
    italic: controls.editorState.draftItalic,
    styleKey: controls.editorState.draftStyle,
    color: controls.editorState.draftColor,
  }
  const getSelectionFormatValue = <Prop extends keyof BaseTextFormat<StyleKey, FontFamily>>(prop: Prop) => (
    selectionRange
      ? getUniformTextFormatValueForRange(
        controls.editorState.draftText,
        selectionRange,
        currentBaseTextFormat,
        controls.editorState.draftTextFormatRuns,
        prop,
      )
      : currentBaseTextFormat[prop]
  )
  const selectionFontFamily = getSelectionFormatValue("fontFamily")
  const selectionFontWeight = getSelectionFormatValue("fontWeight")
  const selectionItalic = getSelectionFormatValue("italic")
  const selectionStyleKey = getSelectionFormatValue("styleKey")
  const selectionColor = getSelectionFormatValue("color")
  const selectedFontVariantForSelection = (
    selectionFontFamily
    && selectionFontWeight !== null
    && selectionItalic !== null
  )
    ? resolveFontVariant(selectionFontFamily, selectionFontWeight, selectionItalic)
    : null
  const selectionTrackingScale = controls.editorState.draftSelectionStart !== controls.editorState.draftSelectionEnd
    ? getUniformTrackingScaleForRange(
      controls.editorState.draftText,
      {
        start: controls.editorState.draftSelectionStart,
        end: controls.editorState.draftSelectionEnd,
      },
      controls.editorState.draftTrackingScale,
      controls.editorState.draftTrackingRuns,
    )
    : controls.editorState.draftTrackingScale
  const hasMixedTypeSettings = controls.editorState.draftTextFormatRuns.length > 0
    || controls.editorState.draftTrackingRuns.length > 0
  const selectedSchemeLabel = controls.colorSchemes.find((scheme) => scheme.id === editorColorScheme)?.label
    ?? editorColorScheme
  const selectedStyleLabelForSelection = selectionStyleKey
    ? controls.styleOptions.find((option) => option.value === selectionStyleKey)?.label ?? selectionStyleKey
    : t("editor.mixed")
  const resolvedFontFamilyForSelection = selectionFontFamily ?? controls.editorState.draftFont

  useEffect(() => {
    setFxSizeInput(String(controls.editorState.draftFxSize))
    setFxLeadingInput(String(controls.editorState.draftFxLeading))
  }, [controls.editorState.draftFxLeading, controls.editorState.draftFxSize, controls.editorState.target])

  useEffect(() => {
    setTrackingInput(selectionTrackingScale === null ? "" : String(selectionTrackingScale))
  }, [controls.editorState.target, selectionTrackingScale])

  useEffect(() => {
    setEditorColorScheme(controls.selectedColorScheme)
    setPreviewColorScheme(null)
  }, [controls.editorState.target, controls.selectedColorScheme])

  useEffect(() => {
    if (!hasLoadedRecentSymbols) return
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(RECENT_SYMBOLS_STORAGE_KEY, JSON.stringify(recentSymbols))
    } catch {
      // Recent symbols are a convenience; insertion must not depend on storage.
    }
  }, [hasLoadedRecentSymbols, recentSymbols])

  useEffect(() => {
    return () => {
      if (sectionHeaderClickTimeoutRef.current !== null) {
        window.clearTimeout(sectionHeaderClickTimeoutRef.current)
      }
    }
  }, [])

  const maxHeightBaselines = Math.max(0, controls.baselinesPerGridModule - 1)
  const setTextEditorState = controls.setEditorState
  const insertSymbol = (symbol: string) => {
    controls.insertEditorText(symbol, {
      format: {
        fontFamily: SYMBOL_FONT_FAMILY,
        fontWeight: 400,
        italic: false,
      },
    })
    setRecentSymbols((current) => [
      symbol,
      ...current.filter((item) => item !== symbol),
    ].slice(0, MAX_RECENT_SYMBOL_COUNT))
  }

  useEffect(() => {
    if (controls.editorState.draftHeightBaselines <= maxHeightBaselines) return
    setTextEditorState((prev) => (
      prev
        ? {
          ...prev,
          draftHeightBaselines: maxHeightBaselines,
        }
        : prev
    ))
  }, [
    controls.editorState.draftHeightBaselines,
    maxHeightBaselines,
    setTextEditorState,
  ])

  const activeColorScheme = previewColorScheme ?? editorColorScheme
  const previewPalette = controls.colorSchemes.find((scheme) => scheme.id === activeColorScheme)?.colors ?? controls.palette
  const resolvedHeightBaselines = Math.max(0, Math.min(maxHeightBaselines, controls.editorState.draftHeightBaselines))

  const rebaseDraftTextFormatRuns = (
    state: typeof controls.editorState,
    nextBase: BaseTextFormat<StyleKey, FontFamily>,
  ) => rebaseTextFormatRuns(
    state.draftText,
    state.draftTextFormatRuns,
    {
      fontFamily: state.draftFont,
      fontWeight: state.draftFontWeight,
      italic: state.draftItalic,
      styleKey: state.draftStyle,
      color: state.draftColor,
    },
    nextBase,
  )

  const getSelectionRangeForState = (state: typeof controls.editorState | null) => (
    state && state.draftSelectionStart !== state.draftSelectionEnd
      ? {
          start: state.draftSelectionStart,
          end: state.draftSelectionEnd,
        }
      : null
  )

  const getBaseTextFormatForState = (state: typeof controls.editorState): BaseTextFormat<StyleKey, FontFamily> => ({
    fontFamily: state.draftFont,
    fontWeight: state.draftFontWeight,
    italic: state.draftItalic,
    styleKey: state.draftStyle,
    color: state.draftColor,
  })

  const getSelectionFormatValueForState = <Prop extends keyof BaseTextFormat<StyleKey, FontFamily>>(
    state: typeof controls.editorState | null,
    prop: Prop,
  ) => {
    if (!state) return null
    const nextSelectionRange = getSelectionRangeForState(state)
    const baseTextFormat = getBaseTextFormatForState(state)
    return nextSelectionRange
      ? getUniformTextFormatValueForRange(
          state.draftText,
          nextSelectionRange,
          baseTextFormat,
          state.draftTextFormatRuns,
          prop,
        )
      : baseTextFormat[prop]
  }

  const applyTextFormatPatchToState = (
    state: typeof controls.editorState | null,
    patch: Partial<BaseTextFormat<StyleKey, FontFamily>>,
  ) => {
    if (!state) return state
    const nextSelectionRange = getSelectionRangeForState(state)
    const selectionCoversWholeText = Boolean(
      nextSelectionRange
      && nextSelectionRange.start === 0
      && nextSelectionRange.end === state.draftText.length,
    )
    const nextSelectionUsesScopedRuns = Boolean(nextSelectionRange && !selectionCoversWholeText)
    if (nextSelectionUsesScopedRuns && nextSelectionRange) {
      return {
        ...state,
        draftTextFormatRuns: applyTextFormatToRange(
          state.draftText,
          nextSelectionRange,
          patch,
          getBaseTextFormatForState(state),
          state.draftTextFormatRuns,
        ),
      }
    }

    const nextBase: BaseTextFormat<StyleKey, FontFamily> = {
      fontFamily: patch.fontFamily ?? state.draftFont,
      fontWeight: patch.fontWeight ?? state.draftFontWeight,
      italic: patch.italic ?? state.draftItalic,
      styleKey: patch.styleKey ?? state.draftStyle,
      color: patch.color ?? state.draftColor,
    }

    return {
      ...state,
      draftFont: nextBase.fontFamily,
      draftFontWeight: nextBase.fontWeight,
      draftItalic: nextBase.italic,
      draftStyle: nextBase.styleKey,
      draftColor: nextBase.color,
      draftTextFormatRuns: rebaseDraftTextFormatRuns(state, nextBase),
    }
  }

  const applyDraftRowsValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextRows = Math.max(0, Math.min(controls.gridRows, Number(value)))
    return {
      ...state,
      draftRows: nextRows,
    }
  }

  const applyDraftColumnsValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextColumns = Math.max(1, Math.min(controls.gridCols, Number(value)))
    return {
      ...state,
      draftColumns: nextColumns,
      draftReflow: nextColumns > 1 ? state.draftReflow : false,
    }
  }

  const applyDraftBaselinesValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextBaselines = Math.max(0, Math.min(maxHeightBaselines, Number(value)))
    return {
      ...state,
      draftHeightBaselines: nextBaselines,
    }
  }

  const applyDraftFontValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextFont = value as FontFamily
    const requestedWeight = getSelectionFormatValueForState(state, "fontWeight") ?? state.draftFontWeight
    const requestedItalic = getSelectionFormatValueForState(state, "italic") ?? state.draftItalic
    const resolvedVariant = resolveFontVariant(nextFont, requestedWeight, requestedItalic)
    return applyTextFormatPatchToState(state, {
      fontFamily: nextFont,
      fontWeight: resolvedVariant.weight,
      italic: resolvedVariant.italic,
    })
  }

  const applyDraftFontCutValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const fontFamily = getSelectionFormatValueForState(state, "fontFamily") ?? state.draftFont
    const nextVariant = getFontVariantById(fontFamily, value)
    if (!nextVariant) return state
    return applyTextFormatPatchToState(state, {
      fontWeight: nextVariant.weight,
      italic: nextVariant.italic,
    })
  }

  const applyDraftHierarchyValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextStyle = value as StyleKey
    const currentStyleForCustomSeed = getSelectionFormatValueForState(state, "styleKey") ?? state.draftStyle
    const nextCustomMetrics = controls.isFxStyle(nextStyle)
      ? resolveCustomStyleSeedMetrics({
          currentStyle: currentStyleForCustomSeed,
          currentCustomSize: state.draftFxSize,
          currentCustomLeading: state.draftFxLeading,
          isCustomStyle: controls.isFxStyle,
          getStyleSize: controls.getStyleSizeValue,
          getStyleLeading: controls.getStyleLeadingValue,
        })
      : null
    const nextSelectionRange = getSelectionRangeForState(state)
    const selectionCoversWholeText = Boolean(
      nextSelectionRange
      && nextSelectionRange.start === 0
      && nextSelectionRange.end === state.draftText.length,
    )
    const nextSelectionUsesScopedRuns = Boolean(nextSelectionRange && !selectionCoversWholeText)
    if (nextSelectionUsesScopedRuns && nextSelectionRange) {
      const nextState = applyTextFormatPatchToState(state, { styleKey: nextStyle })
      if (!nextState || !nextCustomMetrics) return nextState
      return {
        ...nextState,
        draftFxSize: nextCustomMetrics.size,
        draftFxLeading: nextCustomMetrics.leading,
      }
    }
    const currentDefaultWeight = controls.getStyleDefaultFontWeight(state.draftStyle)
    const currentDefaultItalic = controls.getStyleDefaultItalic(state.draftStyle)
    const nextDefaultWeight = controls.getStyleDefaultFontWeight(nextStyle)
    const nextDefaultItalic = controls.getStyleDefaultItalic(nextStyle)
    const requestedWeight = state.draftFontWeight === currentDefaultWeight
      ? nextDefaultWeight
      : state.draftFontWeight
    const requestedItalic = state.draftItalic === currentDefaultItalic
      ? nextDefaultItalic
      : state.draftItalic
    const resolvedVariant = resolveFontVariant(state.draftFont, requestedWeight, requestedItalic)
    const nextBase: BaseTextFormat<StyleKey, FontFamily> = {
      fontFamily: state.draftFont,
      fontWeight: resolvedVariant.weight,
      italic: resolvedVariant.italic,
      styleKey: nextStyle,
      color: state.draftColor,
    }
    return {
      ...state,
      draftStyle: nextStyle,
      draftFontWeight: resolvedVariant.weight,
      draftItalic: resolvedVariant.italic,
      draftTextFormatRuns: rebaseDraftTextFormatRuns(state, nextBase),
      draftFxSize: nextCustomMetrics
        ? nextCustomMetrics.size
        : state.draftFxSize,
      draftFxLeading: nextCustomMetrics
        ? nextCustomMetrics.leading
        : state.draftFxLeading,
      draftText: state.draftTextEdited ? state.draftText : controls.getDummyTextForStyle(nextStyle),
    }
  }

  const applyDraftKerningValue = (value: string, state: typeof controls.editorState | null) => (
    state
      ? {
          ...state,
          draftOpticalKerning: value !== "off",
        }
      : state
  )

  const rowsSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftRowsValue,
    committedValue: String(controls.editorState.draftRows),
  })
  const columnsSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftColumnsValue,
    committedValue: String(controls.editorState.draftColumns),
  })
  const baselinesSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftBaselinesValue,
    committedValue: String(resolvedHeightBaselines),
  })
  const fontSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftFontValue,
    committedValue: selectionFontFamily ?? controls.editorState.draftFont,
  })
  const cutSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftFontCutValue,
    committedValue: selectedFontVariantForSelection?.id
      ?? resolveFontVariant(
        selectionFontFamily ?? controls.editorState.draftFont,
        selectionFontWeight ?? controls.editorState.draftFontWeight,
        selectionItalic ?? controls.editorState.draftItalic,
      ).id,
  })
  const hierarchySelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftHierarchyValue,
    committedValue: selectionStyleKey ?? controls.editorState.draftStyle,
  })
  const kerningSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftKerningValue,
    committedValue: controls.editorState.draftOpticalKerning ? "on" : "off",
  })

  const applySelectionTextFormat = (
    patch: Partial<BaseTextFormat<StyleKey, FontFamily>>,
  ) => {
    controls.setEditorState((prev) => {
      if (!prev) return prev
      if (selectionUsesScopedRuns && selectionRange) {
        return {
          ...prev,
          draftTextFormatRuns: applyTextFormatToRange(
            prev.draftText,
            selectionRange,
            patch,
            {
              fontFamily: prev.draftFont,
              fontWeight: prev.draftFontWeight,
              italic: prev.draftItalic,
              styleKey: prev.draftStyle,
              color: prev.draftColor,
            },
            prev.draftTextFormatRuns,
          ),
        }
      }
      const nextBase: BaseTextFormat<StyleKey, FontFamily> = {
        fontFamily: patch.fontFamily ?? prev.draftFont,
        fontWeight: patch.fontWeight ?? prev.draftFontWeight,
        italic: patch.italic ?? prev.draftItalic,
        styleKey: patch.styleKey ?? prev.draftStyle,
        color: patch.color ?? prev.draftColor,
      }
      return {
        ...prev,
        draftFont: nextBase.fontFamily,
        draftFontWeight: nextBase.fontWeight,
        draftItalic: nextBase.italic,
        draftStyle: nextBase.styleKey,
        draftColor: nextBase.color,
        draftTextFormatRuns: rebaseDraftTextFormatRuns(prev, nextBase),
      }
    })
  }

  const commitTrackingInput = () => {
    const parsed = Number(trackingInput)
    if (!Number.isFinite(parsed)) {
      setTrackingInput(selectionTrackingScale === null ? "" : String(selectionTrackingScale))
      return
    }
    const nextScale = Math.max(MIN_TRACKING_SCALE, Math.min(MAX_TRACKING_SCALE, Math.round(parsed)))
    controls.setEditorState((prev) => prev ? {
      ...prev,
      draftTrackingScale: (
        prev.draftSelectionStart !== prev.draftSelectionEnd
          && !(prev.draftSelectionStart === 0 && prev.draftSelectionEnd === prev.draftText.length)
      )
        ? prev.draftTrackingScale
        : nextScale,
      draftTrackingRuns: (
        prev.draftSelectionStart !== prev.draftSelectionEnd
          && !(prev.draftSelectionStart === 0 && prev.draftSelectionEnd === prev.draftText.length)
      )
        ? applyTrackingScaleToRange(
          prev.draftText,
          {
            start: prev.draftSelectionStart,
            end: prev.draftSelectionEnd,
          },
          nextScale,
          prev.draftTrackingScale,
          prev.draftTrackingRuns,
        )
        : rebaseTextTrackingRuns(
          prev.draftText,
          [],
          prev.draftTrackingScale,
          nextScale,
        ),
    } : prev)
    setTrackingInput(String(nextScale))
  }

  const getStyleOptionLabel = (styleKey: StyleKey, label: string) => (
    controls.isFxStyle(styleKey) ? label : `${label} (${controls.getStyleSizeLabel(styleKey)})`
  )
  const toggleSection = (key: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  const handleSectionHeaderClick = (key: SectionKey) => (event: React.MouseEvent) => {
    if (event.detail > 1) return
    if (sectionHeaderClickTimeoutRef.current !== null) {
      window.clearTimeout(sectionHeaderClickTimeoutRef.current)
    }
    sectionHeaderClickTimeoutRef.current = window.setTimeout(() => {
      toggleSection(key)
      sectionHeaderClickTimeoutRef.current = null
    }, SECTION_HEADER_CLICK_DELAY_MS)
  }
  const handleSectionHeaderDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault()
    if (sectionHeaderClickTimeoutRef.current !== null) {
      window.clearTimeout(sectionHeaderClickTimeoutRef.current)
      sectionHeaderClickTimeoutRef.current = null
    }
    setCollapsed((current) => {
      const allClosed = TEXT_EDITOR_SECTION_KEYS.every((key) => current[key])
      return TEXT_EDITOR_SECTION_KEYS.reduce((nextState, key) => {
        nextState[key] = !allClosed
        return nextState
      }, {} as Record<SectionKey, boolean>)
    })
  }

  const tone = isDarkMode
    ? {
      muted: "text-gray-400",
      panel: "bg-transparent",
      surface: "bg-transparent",
      infoFrame: "border-gray-700 bg-gray-900/60",
      infoRow: "border-gray-800",
      infoLabel: "text-gray-400",
      infoValue: "text-gray-100",
      button: "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-gray-100",
      buttonActive: "border-gray-600 bg-gray-800 text-gray-100",
      ringOffset: "ring-offset-gray-900",
      selectContent: "dark",
    }
    : {
      muted: "text-gray-600",
      panel: "bg-transparent",
      surface: "bg-transparent",
      infoFrame: "border-gray-200 bg-gray-50/80",
      infoRow: "border-gray-200",
      infoLabel: "text-gray-500",
      infoValue: "text-gray-900",
      button: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
      buttonActive: "border-gray-400 bg-gray-100 text-gray-900",
      ringOffset: "ring-offset-white",
      selectContent: "",
    }

  const triggerClassName = getNeutralFormControlClassName(isDarkMode, "h-9")
  const textInputClassName = getNeutralFormControlClassName(isDarkMode, "h-9 w-full rounded-md px-3 text-sm")
  const sectionLabelClassName = `text-sm ${tone.muted}`
  const segmentButtonClassName = (active: boolean) => (
    `h-8 rounded-sm border px-3 text-xs ${active ? tone.buttonActive : tone.button}`
  )
  const inlineSwitchClassName = "h-3 w-6 rounded-none border border-black bg-gray-300 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
  const inlineSwitchThumbClassName = "h-3 w-3 rounded-none border border-black bg-white shadow-none data-[state=checked]:translate-x-3"
  const placeholderButtonClassName = `w-full rounded-sm border px-3 py-2 text-left transition-colors ${tone.button}`
  const symbolButtonClassName = `flex h-9 w-full items-center justify-center rounded-sm border text-[17px] leading-none transition-colors ${tone.button}`
  const infoRows = [
    [t("editor.paragraph.rows"), String(controls.editorState.draftRows)],
    [t("editor.paragraph.baselines"), String(controls.editorState.draftHeightBaselines)],
    [t("editor.paragraph.cols"), String(controls.editorState.draftColumns)],
    [t("editor.paragraph.rotation"), `${Math.round(controls.editorState.draftRotation)}deg`],
    [t("editor.info.align"), t(HORIZONTAL_ALIGN_MESSAGE_KEYS[controls.editorState.draftAlign])],
    [t("editor.info.verticalAlign"), t(VERTICAL_ALIGN_MESSAGE_KEYS[controls.editorState.draftVerticalAlign])],
    [t("editor.info.reflow"), controls.editorState.draftReflow && canUseNewspaperReflow ? t("common.on") : t("common.off")],
    [t("editor.info.hyphen"), controls.editorState.draftSyllableDivision ? t("common.on") : t("common.off")],
    [t("editor.info.snapX"), controls.editorState.draftSnapToColumns ? t("common.on") : t("common.off")],
    [t("editor.info.snapY"), controls.editorState.draftSnapToBaseline ? t("common.on") : t("common.off")],
    [t("editor.typography.font"), selectionFontFamily ?? t("editor.mixed")],
    [t("editor.typography.cut"), selectedFontVariantForSelection?.label ?? t("editor.mixed")],
    [t("editor.typography.hierarchy"), selectedStyleLabelForSelection],
    [t("editor.typography.kerning"), controls.editorState.draftOpticalKerning ? t("editor.typography.optical") : t("editor.typography.metric")],
    [t("editor.typography.tracking"), selectionTrackingScale !== null ? formatTrackingScale(selectionTrackingScale) : t("editor.mixed")],
    [t("editor.info.scheme"), selectedSchemeLabel],
    [t("editor.color.color"), selectionColor ?? t("editor.mixed")],
    [t("editor.info.chars"), String(characterCount)],
    [t("editor.info.words"), String(wordCount)],
    [t("editor.info.maxLine"), String(controls.maxCharsPerLine ?? 0)],
    [t("editor.info.renderTime"), totalRenderTimeMs === null ? "—" : `${totalRenderTimeMs.toFixed(1)} ms`],
  ]
  const selectedFontTriggerLabel = selectionFontFamily ?? t("editor.mixed")
  const selectedFontTriggerStyle = selectionFontFamily
    ? { fontFamily: getFontFamilyCss(selectionFontFamily) }
    : undefined
  const selectedCutTriggerLabel = selectedFontVariantForSelection?.label ?? t("editor.mixed")
  const selectedCutTriggerStyle = selectedFontVariantForSelection
    ? {
        fontFamily: getFontFamilyCss(resolvedFontFamilyForSelection),
        fontWeight: selectedFontVariantForSelection.weight,
        fontStyle: selectedFontVariantForSelection.italic ? "italic" as const : "normal" as const,
      }
    : undefined

  return (
    <div
      data-text-editor-panel="true"
      data-editor-interactive-root="true"
      className={`min-h-0 flex h-full flex-col overflow-hidden ${tone.panel}`}
    >
      <SidebarSectionScrollFrame
        bottomSpacerHeight={bottomSpacerHeight}
        className={tone.surface}
        scrollRootRef={scrollRootRef}
      >
        <div ref={registerSectionRef("layout")}>
          <EditorSidebarSection
            title={`I. ${t("editor.paragraph.title")}`}
            tooltip={t("editor.paragraph.tooltip")}
            collapsed={collapsed.layout}
            collapsedSummary={`${controls.editorState.draftRows} ${t("editor.paragraph.rows")}, ${controls.editorState.draftColumns} ${t("editor.paragraph.cols")}`}
            onHeaderClick={handleSectionHeaderClick("layout")}
            onHeaderDoubleClick={handleSectionHeaderDoubleClick}
            isDarkMode={isDarkMode}
            showHelpIndicator={showHelpIndicator}
            showRolloverInfo={showRolloverInfo}
            onHelpNavigate={() => onOpenHelpSection?.(TEXT_EDITOR_HELP_SECTION_BY_KEY.layout)}
          >
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Label className={sectionLabelClassName}>{t("editor.paragraph.rows")}</Label>
            <Label className={`${sectionLabelClassName} text-right`}>{t("editor.paragraph.cols")}</Label>

            <Select
              value={rowsSelectPreview.value}
              onOpenChange={rowsSelectPreview.handleOpenChange}
              onValueChange={rowsSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={rowsSelectPreview.handleContentPointerLeave}>
                {Array.from({ length: controls.gridRows + 1 }, (_, index) => index).map((count) => (
                  <SelectItem key={count} value={String(count)} {...rowsSelectPreview.getItemPreviewProps(String(count))}>
                    {t(count === 1 ? "editor.format.row" : "editor.format.rows", { count })}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>

            <Select
              value={columnsSelectPreview.value}
              onOpenChange={columnsSelectPreview.handleOpenChange}
              onValueChange={columnsSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={columnsSelectPreview.handleContentPointerLeave}>
                {Array.from({ length: controls.gridCols }, (_, index) => index + 1).map((count) => (
                  <SelectItem key={count} value={String(count)} {...columnsSelectPreview.getItemPreviewProps(String(count))}>
                    {t(count === 1 ? "editor.format.column" : "editor.format.columns", { count })}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>

            <Label className={sectionLabelClassName}>{t("editor.paragraph.baselines")}</Label>
            <div aria-hidden="true" />

            <Select
              value={baselinesSelectPreview.value}
              onOpenChange={baselinesSelectPreview.handleOpenChange}
              onValueChange={baselinesSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={baselinesSelectPreview.handleContentPointerLeave}>
                <SelectItem value="0" {...baselinesSelectPreview.getItemPreviewProps("0")}>{t("editor.format.zeroBaselines")}</SelectItem>
                {Array.from({ length: maxHeightBaselines }, (_, index) => index + 1).map((count) => (
                  <SelectItem
                    key={`paragraph-baselines-${count}`}
                    value={String(count)}
                    {...baselinesSelectPreview.getItemPreviewProps(String(count))}
                  >
                    {t(count === 1 ? "editor.format.baseline" : "editor.format.baselines", { count })}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>{t("editor.paragraph.horizontalAlignment")}</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftAlign === "left")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "left" } : prev)}
              >
                {t("editor.paragraph.left")}
              </button>
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftAlign === "center")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "center" } : prev)}
              >
                {t("editor.paragraph.center")}
              </button>
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftAlign === "right")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "right" } : prev)}
              >
                {t("editor.paragraph.right")}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>{t("editor.paragraph.verticalAlignment")}</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftVerticalAlign === "top")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftVerticalAlign: "top" } : prev)}
              >
                {t("editor.paragraph.top")}
              </button>
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftVerticalAlign === "center")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftVerticalAlign: "center" } : prev)}
              >
                {t("editor.paragraph.center")}
              </button>
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftVerticalAlign === "bottom")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftVerticalAlign: "bottom" } : prev)}
              >
                {t("editor.paragraph.bottom")}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={sectionLabelClassName}>{t("editor.paragraph.rotation")}</Label>
              <span className={`rounded px-1.5 py-0.5 text-xs font-mono ${isDarkMode ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-900"}`}>
                {Math.round(controls.editorState.draftRotation)}°
              </span>
            </div>
            <DebouncedSlider
              value={[controls.editorState.draftRotation]}
              min={-180}
              max={180}
              step={1}
              onValueCommit={([value]) => {
                controls.setEditorState((prev) => prev ? {
                  ...prev,
                  draftRotation: clampRotation(value),
                } : prev)
              }}
              onThumbDoubleClick={() => {
                controls.setEditorState((prev) => prev ? {
                  ...prev,
                  draftRotation: 0,
                } : prev)
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className={sectionLabelClassName}>{t("editor.paragraph.newspaperReflow")}</Label>
                <p className={`mt-1 text-[11px] ${tone.muted}`}>
                  {canUseNewspaperReflow ? t("editor.paragraph.reflowAvailable") : t("editor.paragraph.reflowUnavailable")}
                </p>
              </div>
              <Switch
                checked={controls.editorState.draftReflow && canUseNewspaperReflow}
                disabled={!canUseNewspaperReflow}
                onCheckedChange={(checked) => controls.setEditorState((prev) => prev ? { ...prev, draftReflow: checked } : prev)}
                className={inlineSwitchClassName}
                thumbClassName={inlineSwitchThumbClassName}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className={sectionLabelClassName}>{t("editor.paragraph.hyphenation")}</Label>
                <p className={`mt-1 text-[11px] ${tone.muted}`}>{t("editor.paragraph.hyphenationHelp")}</p>
              </div>
              <Switch
                checked={controls.editorState.draftSyllableDivision}
                onCheckedChange={(checked) => controls.setEditorState((prev) => prev ? { ...prev, draftSyllableDivision: checked } : prev)}
                className={inlineSwitchClassName}
                thumbClassName={inlineSwitchThumbClassName}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className={sectionLabelClassName}>{t("editor.paragraph.snapColumns")}</Label>
                <p className={`mt-1 text-[11px] ${tone.muted}`}>{t("editor.paragraph.snapColumnsHelp")}</p>
              </div>
              <Switch
                checked={controls.editorState.draftSnapToColumns}
                onCheckedChange={(checked) => controls.setEditorState((prev) => prev ? { ...prev, draftSnapToColumns: checked } : prev)}
                className={inlineSwitchClassName}
                thumbClassName={inlineSwitchThumbClassName}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className={sectionLabelClassName}>{t("editor.paragraph.snapBaseline")}</Label>
                <p className={`mt-1 text-[11px] ${tone.muted}`}>{t("editor.paragraph.snapBaselineHelp")}</p>
              </div>
              <Switch
                checked={controls.editorState.draftSnapToBaseline}
                onCheckedChange={(checked) => controls.setEditorState((prev) => prev ? { ...prev, draftSnapToBaseline: checked } : prev)}
                className={inlineSwitchClassName}
                thumbClassName={inlineSwitchThumbClassName}
              />
            </div>
          </div>
          </EditorSidebarSection>
        </div>

        <div ref={registerSectionRef("type")}>
        <EditorSidebarSection
          title={hasMixedTypeSettings ? (
            <>
              II. {t("editor.typography.title")}{" "}
              <span className={isDarkMode ? "text-[#F4F6F8]" : "text-gray-900"}>
                {t("editor.mixed")}
              </span>
            </>
          ) : `II. ${t("editor.typography.title")}`}
          tooltip={t("editor.typography.tooltip")}
          collapsed={collapsed.type}
          collapsedSummary={`${selectionFontFamily ?? t("editor.mixed")}, ${selectedStyleLabelForSelection}`}
          onHeaderClick={handleSectionHeaderClick("type")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(TEXT_EDITOR_HELP_SECTION_BY_KEY.type)}
        >
          <div className="space-y-2">
            <LabeledControlRow label={<Label className={sectionLabelClassName}>{t("editor.typography.hierarchy")}</Label>}>
            <Select
              value={hierarchySelectPreview.value}
              onOpenChange={hierarchySelectPreview.handleOpenChange}
              onValueChange={hierarchySelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder={t("editor.mixed")} />
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={hierarchySelectPreview.handleContentPointerLeave}>
                {controls.styleOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    {...hierarchySelectPreview.getItemPreviewProps(option.value)}
                  >
                    {getStyleOptionLabel(option.value, option.label)}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>
            </LabeledControlRow>
          </div>

          {fxSelected ? (
            <div className="space-y-2">
              <div className="space-y-2">
                <LabeledControlRow label={<Label className={sectionLabelClassName}>{t("editor.typography.customSize")}</Label>}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fxSizeInput}
                  onChange={(event) => {
                    const normalized = event.target.value.replace(",", ".")
                    if (!/^\d*\.?\d*$/.test(normalized)) return
                    setFxSizeInput(normalized)
                  }}
                  onBlur={() => {
                    const parsed = Number(fxSizeInput)
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      setFxSizeInput(String(controls.editorState.draftFxSize))
                      return
                    }
                    const clamped = clampFxSize(Math.round(parsed * 10) / 10)
                    controls.setEditorState((prev) => prev ? { ...prev, draftFxSize: clamped } : prev)
                    setFxSizeInput(String(clamped))
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return
                    event.preventDefault()
                    ;(event.currentTarget as HTMLInputElement).blur()
                  }}
                  className={textInputClassName}
                />
                </LabeledControlRow>
              </div>

              <div className="space-y-2">
                <LabeledControlRow label={<Label className={sectionLabelClassName}>{t("editor.typography.customLeading")}</Label>}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fxLeadingInput}
                  onChange={(event) => {
                    const normalized = event.target.value.replace(",", ".")
                    if (!/^\d*\.?\d*$/.test(normalized)) return
                    setFxLeadingInput(normalized)
                  }}
                  onBlur={() => {
                    const parsed = Number(fxLeadingInput)
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      setFxLeadingInput(String(controls.editorState.draftFxLeading))
                      return
                    }
                    const clamped = clampFxLeading(Math.round(parsed * 10) / 10)
                    controls.setEditorState((prev) => prev ? { ...prev, draftFxLeading: clamped } : prev)
                    setFxLeadingInput(String(clamped))
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return
                    event.preventDefault()
                    ;(event.currentTarget as HTMLInputElement).blur()
                  }}
                  className={textInputClassName}
                />
                </LabeledControlRow>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <LabeledControlRow label={<Label className={sectionLabelClassName}>{t("editor.typography.font")}</Label>}>
            <FontSelect
              value={fontSelectPreview.value}
              onValueChange={fontSelectPreview.handleValueChange}
              options={FONT_OPTIONS}
              triggerClassName={triggerClassName}
              triggerStyle={{ width: "100%" }}
              renderTriggerValue={selectedFontTriggerLabel}
              triggerValueStyle={selectedFontTriggerStyle}
              contentClassName={tone.selectContent}
              placeholder={t("editor.mixed")}
              onOpenChange={fontSelectPreview.handleOpenChange}
              onContentPointerLeave={fontSelectPreview.handleContentPointerLeave}
              getItemStyle={(option) => ({ fontFamily: getFontFamilyCss(option.value as FontFamily) })}
              getItemPreviewProps={fontSelectPreview.getItemPreviewProps}
            />
            </LabeledControlRow>
          </div>

          <div className="space-y-2">
            <LabeledControlRow label={<Label className={sectionLabelClassName}>{t("editor.typography.cut")}</Label>}>
            <Select
              value={cutSelectPreview.value}
              onOpenChange={cutSelectPreview.handleOpenChange}
              onValueChange={cutSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <span className="block min-w-0 truncate text-left" style={selectedCutTriggerStyle}>
                  {selectedCutTriggerLabel}
                </span>
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={cutSelectPreview.handleContentPointerLeave}>
                {getFontVariants(selectionFontFamily ?? controls.editorState.draftFont).map((variant) => (
                  <SelectItem
                    key={variant.id}
                    value={variant.id}
                    style={{
                      fontFamily: getFontFamilyCss(resolvedFontFamilyForSelection),
                      fontWeight: variant.weight,
                      fontStyle: variant.italic ? "italic" : "normal",
                    }}
                    {...cutSelectPreview.getItemPreviewProps(variant.id)}
                  >
                    {variant.label}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>
            </LabeledControlRow>
          </div>

          <div className="space-y-2">
            <LabeledControlRow label={<Label className={sectionLabelClassName}>{t("editor.typography.kerning")}</Label>}>
            <Select
              value={kerningSelectPreview.value}
              onOpenChange={kerningSelectPreview.handleOpenChange}
              onValueChange={kerningSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={kerningSelectPreview.handleContentPointerLeave}>
                <SelectItem value="on" {...kerningSelectPreview.getItemPreviewProps("on")}>{t("editor.typography.optical")}</SelectItem>
                <SelectItem value="off" {...kerningSelectPreview.getItemPreviewProps("off")}>{t("editor.typography.metric")}</SelectItem>
              </TopSelectContent>
            </Select>
            </LabeledControlRow>
          </div>

          <div className="space-y-2">
            <LabeledControlRow label={<Label className={sectionLabelClassName}>{t("editor.typography.tracking")}</Label>}>
            <input
              type="number"
              min={MIN_TRACKING_SCALE}
              max={MAX_TRACKING_SCALE}
              step={1}
              inputMode="numeric"
              value={trackingInput}
              placeholder={selectionTrackingScale === null ? t("editor.mixed") : undefined}
              onChange={(event) => {
                setTrackingInput(event.target.value)
              }}
              onBlur={commitTrackingInput}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                commitTrackingInput()
                ;(event.currentTarget as HTMLInputElement).blur()
              }}
              className={textInputClassName}
            />
            </LabeledControlRow>
          </div>

          <EditorColorSchemeControls
            schemes={controls.colorSchemes}
            schemeValue={editorColorScheme}
            onSchemeValueChange={(value) => {
              setEditorColorScheme(value as ImageColorSchemeId)
              setPreviewColorScheme(null)
            }}
            onSchemeContentPointerLeave={() => setPreviewColorScheme(null)}
            getSchemeItemPreviewProps={(value) => ({
              onFocus: () => setPreviewColorScheme(value as ImageColorSchemeId),
              onPointerMove: () => setPreviewColorScheme(value as ImageColorSchemeId),
            })}
            displayedColors={previewPalette}
            selectedColor={selectionColor ?? controls.editorState.draftColor}
            onColorSelect={(color) => {
              applySelectionTextFormat({ color })
            }}
            isDarkMode={isDarkMode}
            ringOffsetClassName={tone.ringOffset}
          />
        </EditorSidebarSection>
        </div>

        <div ref={registerSectionRef("symbols")}>
        <EditorSidebarSection
          title={`III. ${t("editor.symbols.title")}`}
          tooltip={t("editor.symbols.tooltip")}
          collapsed={collapsed.symbols}
          collapsedSummary={t("editor.symbols.summary")}
          onHeaderClick={handleSectionHeaderClick("symbols")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(TEXT_EDITOR_HELP_SECTION_BY_KEY.symbols)}
        >
          <div className="space-y-4">
            {recentSymbols.length > 0 ? (
              <div className="space-y-2">
                <Label className={sectionLabelClassName}>{t("editor.symbols.recent")}</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {recentSymbols.map((symbol) => (
                    <button
                      key={`recent-symbol-${symbol}`}
                      type="button"
                      className={symbolButtonClassName}
                      style={{ fontFamily: SYMBOL_FONT_FAMILY }}
                      aria-label={t("editor.symbols.insert", { symbol })}
                      title={t("editor.symbols.insert", { symbol })}
                      onMouseDown={(event) => {
                        event.preventDefault()
                      }}
                      onClick={() => insertSymbol(symbol)}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {TEXT_SYMBOL_PALETTE_GROUPS.map((group) => (
              <div key={group.id} className="space-y-2">
                <Label className={sectionLabelClassName}>{group.label}</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {group.symbols.map((symbol, index) => (
                    <button
                      key={`${group.id}-${symbol}-${index}`}
                      type="button"
                      className={symbolButtonClassName}
                      style={{ fontFamily: SYMBOL_FONT_FAMILY }}
                      aria-label={t("editor.symbols.insert", { symbol })}
                      title={t("editor.symbols.insert", { symbol })}
                      onMouseDown={(event) => {
                        event.preventDefault()
                      }}
                      onClick={() => insertSymbol(symbol)}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </EditorSidebarSection>
        </div>

        <div ref={registerSectionRef("placeholders")}>
        <EditorSidebarSection
          title={`IV. ${t("editor.placeholders.title")}`}
          tooltip={t("editor.placeholders.tooltip")}
          collapsed={collapsed.placeholders}
          collapsedSummary={t("editor.placeholders.summary")}
          onHeaderClick={handleSectionHeaderClick("placeholders")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(TEXT_EDITOR_HELP_SECTION_BY_KEY.placeholders)}
        >
          <div className="space-y-2">
            {DOCUMENT_VARIABLE_DEFINITIONS.map(({ token, description }) => (
              <button
                key={token}
                type="button"
                className={placeholderButtonClassName}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  controls.insertEditorText(token)
                }}
              >
                <span className={`block font-mono text-[11px] leading-tight ${isDarkMode ? "text-[#F4F6F8]" : "text-gray-900"}`}>
                  {token}
                </span>
                <span className={`mt-1 block text-[11px] leading-snug ${tone.muted}`}>
                  {description}
                </span>
              </button>
            ))}
          </div>
        </EditorSidebarSection>
        </div>

        <div ref={registerSectionRef("info")}>
          <EditorSidebarSection
          title={`V. ${t("editor.info.title")}`}
          tooltip={t("editor.info.paragraphTooltip")}
          collapsed={collapsed.info}
          collapsedSummary={t("editor.info.charsWords", { chars: characterCount, words: wordCount })}
          onHeaderClick={handleSectionHeaderClick("info")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(TEXT_EDITOR_HELP_SECTION_BY_KEY.info)}
        >
          <div className={`border ${tone.infoFrame}`}>
            {infoRows.map(([label, value], index) => (
              <div
                key={label}
                className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-3 py-2 text-[11px] ${index > 0 ? `border-t ${tone.infoRow}` : ""}`}
              >
                <span className={tone.infoLabel}>{label}</span>
                <span className={`truncate text-right ${tone.infoValue}`}>{value}</span>
              </div>
            ))}
          </div>
          </EditorSidebarSection>
        </div>
      </SidebarSectionScrollFrame>
    </div>
  )
}
