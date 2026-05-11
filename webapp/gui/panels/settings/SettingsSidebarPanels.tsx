"use client"

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { BaselineGridPanel } from "@/gui/panels/settings/BaselineGridPanel"
import { CanvasRatioPanel } from "@/gui/panels/settings/CanvasRatioPanel"
import { ColorSchemePanel } from "@/gui/panels/settings/ColorSchemePanel"
import { GutterPanel } from "@/gui/panels/settings/GutterPanel"
import { MarginsPanel } from "@/gui/panels/settings/MarginsPanel"
import { SettingsHelpNavigationProvider } from "@/gui/panels/settings/help-navigation-context"
import { SidebarSectionScrollFrame } from "@/gui/panels/SidebarSectionScrollFrame"
import { TypographyPanel } from "@/gui/panels/settings/TypographyPanel"
import type {
  GridRhythm,
  GridRhythmColsDirection,
  GridRhythmRowsDirection,
  TypographyScale,
} from "@/core/config/defaults"
import type { FontFamily } from "@/core/config/fonts"
import type { ImageColorSchemeId } from "@/core/config/color-schemes"
import type { CanvasRatioKey, GridResult } from "@/core/layout/grid-calculator"
import type { SectionKey } from "@/core/types/workspace-ui-schema"

type CustomMarginMultipliers = {
  top: number
  left: number
  right: number
  bottom: number
}

const HOVER_OPEN_DELAY_MS = 100

type PendingOpenScrollAnchor = {
  previousTop: number
  section: SectionKey
}

type Props = {
  collapsed: Record<SectionKey, boolean>
  showSectionHelpIcons: boolean
  showRolloverInfo: boolean
  interactionsDisabled?: boolean
  onHelpNavigate: (section: SectionKey) => void
  onSectionHeaderClick: (section: SectionKey) => (event: React.MouseEvent) => void
  onSectionHeaderDoubleClick: (event: React.MouseEvent) => void
  canvasRatio: CanvasRatioKey
  onCanvasRatioChange: (value: CanvasRatioKey) => void
  onCanvasRatioPreviewChange?: (value: CanvasRatioKey | null) => void
  customRatioWidth: number
  onCustomRatioWidthChange: (value: number) => void
  customRatioHeight: number
  onCustomRatioHeightChange: (value: number) => void
  orientation: "portrait" | "landscape"
  onOrientationChange: (value: "portrait" | "landscape") => void
  onOrientationPreviewChange?: (value: "portrait" | "landscape" | null) => void
  rotation: number
  onRotationChange: (value: number) => void
  customBaseline: number
  availableBaselineOptions: number[]
  onCustomBaselineChange: (value: number) => void
  marginMethod: 1 | 2 | 3
  onMarginMethodChange: (value: 1 | 2 | 3) => void
  onMarginMethodPreviewChange?: (value: "1" | "2" | "3" | "custom" | null) => void
  useCustomMargins: boolean
  onUseCustomMarginsChange: (value: boolean) => void
  customMarginMultipliers: CustomMarginMultipliers
  onCustomMarginMultipliersChange: (value: CustomMarginMultipliers) => void
  currentMargins: GridResult["grid"]["margins"]
  gridUnit: number
  gridCols: number
  onGridColsChange: (value: number) => void
  gridRows: number
  onGridRowsChange: (value: number) => void
  gutterMultiple: number
  onGutterMultipleChange: (value: number) => void
  rhythm: GridRhythm
  onRhythmChange: (value: GridRhythm) => void
  onRhythmPreviewChange?: (value: GridRhythm | null) => void
  rhythmRowsEnabled: boolean
  onRhythmRowsEnabledChange: (value: boolean) => void
  rhythmRowsDirection: GridRhythmRowsDirection
  onRhythmRowsDirectionChange: (value: GridRhythmRowsDirection) => void
  onRhythmRowsDirectionPreviewChange?: (value: GridRhythmRowsDirection | null) => void
  rhythmColsEnabled: boolean
  onRhythmColsEnabledChange: (value: boolean) => void
  rhythmColsDirection: GridRhythmColsDirection
  onRhythmColsDirectionChange: (value: GridRhythmColsDirection) => void
  onRhythmColsDirectionPreviewChange?: (value: GridRhythmColsDirection | null) => void
  typographyScale: TypographyScale
  onTypographyScaleChange: (value: TypographyScale) => void
  onTypographyScalePreviewChange?: (value: TypographyScale | null) => void
  fibonacciSequenceStartIndex: number
  onFibonacciSequenceStartIndexChange: (value: number) => void
  typographyStyles: GridResult["typography"]["styles"]
  baseFont: FontFamily
  onBaseFontChange: (value: FontFamily) => void
  onBaseFontPreviewChange?: (value: FontFamily | null) => void
  colorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  onColorSchemePreviewChange?: (value: ImageColorSchemeId | null) => void
  canvasBackground: string | null
  onCanvasBackgroundChange: (value: string | null) => void
  onCanvasBackgroundPreviewChange?: (value: string | null) => void
  isDarkMode: boolean
}

export const SettingsSidebarPanels = memo(function SettingsSidebarPanels({
  collapsed,
  showSectionHelpIcons,
  showRolloverInfo,
  interactionsDisabled = false,
  onHelpNavigate,
  onSectionHeaderClick,
  onSectionHeaderDoubleClick,
  canvasRatio,
  onCanvasRatioChange,
  onCanvasRatioPreviewChange,
  customRatioWidth,
  onCustomRatioWidthChange,
  customRatioHeight,
  onCustomRatioHeightChange,
  orientation,
  onOrientationChange,
  onOrientationPreviewChange,
  rotation,
  onRotationChange,
  customBaseline,
  availableBaselineOptions,
  onCustomBaselineChange,
  marginMethod,
  onMarginMethodChange,
  onMarginMethodPreviewChange,
  useCustomMargins,
  onUseCustomMarginsChange,
  customMarginMultipliers,
  onCustomMarginMultipliersChange,
  currentMargins,
  gridUnit,
  gridCols,
  onGridColsChange,
  gridRows,
  onGridRowsChange,
  gutterMultiple,
  onGutterMultipleChange,
  rhythm,
  onRhythmChange,
  onRhythmPreviewChange,
  rhythmRowsEnabled,
  onRhythmRowsEnabledChange,
  rhythmRowsDirection,
  onRhythmRowsDirectionChange,
  onRhythmRowsDirectionPreviewChange,
  rhythmColsEnabled,
  onRhythmColsEnabledChange,
  rhythmColsDirection,
  onRhythmColsDirectionChange,
  onRhythmColsDirectionPreviewChange,
  typographyScale,
  onTypographyScaleChange,
  onTypographyScalePreviewChange,
  fibonacciSequenceStartIndex,
  onFibonacciSequenceStartIndexChange,
  typographyStyles,
  baseFont,
  onBaseFontChange,
  onBaseFontPreviewChange,
  colorScheme,
  onColorSchemeChange,
  onColorSchemePreviewChange,
  canvasBackground,
  onCanvasBackgroundChange,
  onCanvasBackgroundPreviewChange,
  isDarkMode,
}: Props) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLDivElement | null>>>({})
  const hoverOpenTimerRef = useRef<number | null>(null)
  const hoverCloseTimerRef = useRef<number | null>(null)
  const lastPointerYRef = useRef<number | null>(null)
  const pointerMovingDownRef = useRef(false)
  const pendingOpenScrollAnchorRef = useRef<PendingOpenScrollAnchor | null>(null)
  const [hoverOpenSection, setHoverOpenSection] = useState<SectionKey | null>(null)
  const [isHoverClosePending, setIsHoverClosePending] = useState(false)
  const [bottomSpacerHeight, setBottomSpacerHeight] = useState(0)
  const isSectionCollapsed = useCallback((section: SectionKey) => (
    collapsed[section] && hoverOpenSection !== section
  ), [collapsed, hoverOpenSection])
  const clearHoverOpenTimer = useCallback(() => {
    if (hoverOpenTimerRef.current === null) return
    window.clearTimeout(hoverOpenTimerRef.current)
    hoverOpenTimerRef.current = null
  }, [])
  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current === null) return
    window.clearTimeout(hoverCloseTimerRef.current)
    hoverCloseTimerRef.current = null
    setIsHoverClosePending(false)
  }, [])
  const updatePointerDirection = useCallback((event: React.MouseEvent) => {
    const previousPointerY = lastPointerYRef.current
    pointerMovingDownRef.current = previousPointerY === null
      ? event.nativeEvent.movementY > 0
      : event.clientY > previousPointerY
    lastPointerYRef.current = event.clientY
  }, [])
  const registerSectionRef = useCallback((section: SectionKey) => (node: HTMLDivElement | null) => {
    sectionRefs.current[section] = node
  }, [])
  const handleSectionMouseEnter = useCallback((section: SectionKey, event: React.MouseEvent) => {
    updatePointerDirection(event)
    if (interactionsDisabled || !collapsed[section]) return
    clearHoverCloseTimer()
    if (hoverOpenSection === section) return
    clearHoverOpenTimer()
    const shouldPreserveDownwardTitle = pointerMovingDownRef.current
    hoverOpenTimerRef.current = window.setTimeout(() => {
      const sectionNode = sectionRefs.current[section]
      pendingOpenScrollAnchorRef.current = shouldPreserveDownwardTitle && sectionNode
        ? {
            previousTop: sectionNode.getBoundingClientRect().top,
            section,
          }
        : null
      setHoverOpenSection(section)
      hoverOpenTimerRef.current = null
    }, HOVER_OPEN_DELAY_MS)
  }, [clearHoverCloseTimer, clearHoverOpenTimer, collapsed, hoverOpenSection, interactionsDisabled, updatePointerDirection])
  const handlePanelMouseEnter = useCallback(() => {
    clearHoverCloseTimer()
  }, [clearHoverCloseTimer])
  const handlePanelMouseLeave = useCallback(() => {
    clearHoverOpenTimer()
    clearHoverCloseTimer()
    setIsHoverClosePending(true)
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setHoverOpenSection(null)
      hoverCloseTimerRef.current = null
      setIsHoverClosePending(false)
    }, HOVER_OPEN_DELAY_MS)
  }, [clearHoverCloseTimer, clearHoverOpenTimer])
  const getSectionWrapperProps = useCallback((section: SectionKey) => ({
    ref: registerSectionRef(section),
    onMouseEnter: (event: React.MouseEvent) => handleSectionMouseEnter(section, event),
  }), [handleSectionMouseEnter, registerSectionRef])

  useEffect(() => (
    () => {
      clearHoverOpenTimer()
      clearHoverCloseTimer()
    }
  ), [clearHoverCloseTimer, clearHoverOpenTimer])

  useLayoutEffect(() => {
    const scrollRoot = scrollRootRef.current
    if (!scrollRoot || typeof ResizeObserver === "undefined") return

    const updateBottomSpacerHeight = () => setBottomSpacerHeight(scrollRoot.clientHeight)
    const resizeObserver = new ResizeObserver(updateBottomSpacerHeight)
    resizeObserver.observe(scrollRoot)
    updateBottomSpacerHeight()

    return () => resizeObserver.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!hoverOpenSection) return

    const anchor = pendingOpenScrollAnchorRef.current
    pendingOpenScrollAnchorRef.current = null
    if (!anchor || anchor.section !== hoverOpenSection) return

    const scrollRoot = scrollRootRef.current
    const sectionNode = sectionRefs.current[hoverOpenSection]
    if (!scrollRoot || !sectionNode) return

    const topDelta = sectionNode.getBoundingClientRect().top - anchor.previousTop
    if (Math.abs(topDelta) <= 0.5) return

    scrollRoot.scrollTo({
      top: Math.max(0, scrollRoot.scrollTop + topDelta),
      behavior: "auto",
    })
  }, [hoverOpenSection])

  useLayoutEffect(() => {
    if (hoverOpenSection) return
    if (isHoverClosePending) return
    if (!Object.values(collapsed).every(Boolean)) return

    const scrollRoot = scrollRootRef.current
    if (!scrollRoot) return

    const frame = window.requestAnimationFrame(() => {
      scrollRoot.scrollTo({
        top: 0,
        behavior: "auto",
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [collapsed, hoverOpenSection, isHoverClosePending])

  return (
    <SidebarSectionScrollFrame
      bottomSpacerHeight={bottomSpacerHeight}
      onMouseEnter={handlePanelMouseEnter}
      onMouseLeave={handlePanelMouseLeave}
      onMouseMove={updatePointerDirection}
      scrollRootRef={scrollRootRef}
    >
      <SettingsHelpNavigationProvider
        value={{
          showHelpIcons: showSectionHelpIcons,
          showRolloverInfo,
          interactionsDisabled,
          onNavigate: onHelpNavigate,
        }}
      >
        <div {...getSectionWrapperProps("format")}>
          <CanvasRatioPanel
            collapsed={isSectionCollapsed("format")}
            onHeaderClick={onSectionHeaderClick("format")}
            onHeaderDoubleClick={onSectionHeaderDoubleClick}
            canvasRatio={canvasRatio}
            onCanvasRatioChange={onCanvasRatioChange}
            onCanvasRatioPreviewChange={onCanvasRatioPreviewChange}
            customRatioWidth={customRatioWidth}
            onCustomRatioWidthChange={onCustomRatioWidthChange}
            customRatioHeight={customRatioHeight}
            onCustomRatioHeightChange={onCustomRatioHeightChange}
            orientation={orientation}
            onOrientationChange={onOrientationChange}
            onOrientationPreviewChange={onOrientationPreviewChange}
            rotation={rotation}
            onRotationChange={onRotationChange}
            isDarkMode={isDarkMode}
          />
        </div>

        <div {...getSectionWrapperProps("baseline")}>
          <BaselineGridPanel
            collapsed={isSectionCollapsed("baseline")}
            onHeaderClick={onSectionHeaderClick("baseline")}
            onHeaderDoubleClick={onSectionHeaderDoubleClick}
            customBaseline={customBaseline}
            availableBaselineOptions={availableBaselineOptions}
            onCustomBaselineChange={onCustomBaselineChange}
            isDarkMode={isDarkMode}
          />
        </div>

        <div {...getSectionWrapperProps("margins")}>
          <MarginsPanel
            collapsed={isSectionCollapsed("margins")}
            onHeaderClick={onSectionHeaderClick("margins")}
            onHeaderDoubleClick={onSectionHeaderDoubleClick}
            marginMethod={marginMethod}
            onMarginMethodChange={onMarginMethodChange}
            onMarginMethodPreviewChange={onMarginMethodPreviewChange}
            useCustomMargins={useCustomMargins}
            onUseCustomMarginsChange={onUseCustomMarginsChange}
            customMarginMultipliers={customMarginMultipliers}
            onCustomMarginMultipliersChange={onCustomMarginMultipliersChange}
            currentMargins={currentMargins}
            gridUnit={gridUnit}
            isDarkMode={isDarkMode}
          />
        </div>

        <div {...getSectionWrapperProps("gutter")}>
          <GutterPanel
            collapsed={isSectionCollapsed("gutter")}
            onHeaderClick={onSectionHeaderClick("gutter")}
            onHeaderDoubleClick={onSectionHeaderDoubleClick}
            gridCols={gridCols}
            onGridColsChange={onGridColsChange}
            gridRows={gridRows}
            onGridRowsChange={onGridRowsChange}
            gutterMultiple={gutterMultiple}
            onGutterMultipleChange={onGutterMultipleChange}
            rhythm={rhythm}
            onRhythmChange={onRhythmChange}
            onRhythmPreviewChange={onRhythmPreviewChange}
            rhythmRowsEnabled={rhythmRowsEnabled}
            onRhythmRowsEnabledChange={onRhythmRowsEnabledChange}
            rhythmRowsDirection={rhythmRowsDirection}
            onRhythmRowsDirectionChange={onRhythmRowsDirectionChange}
            onRhythmRowsDirectionPreviewChange={onRhythmRowsDirectionPreviewChange}
            rhythmColsEnabled={rhythmColsEnabled}
            onRhythmColsEnabledChange={onRhythmColsEnabledChange}
            rhythmColsDirection={rhythmColsDirection}
            onRhythmColsDirectionChange={onRhythmColsDirectionChange}
            onRhythmColsDirectionPreviewChange={onRhythmColsDirectionPreviewChange}
            isDarkMode={isDarkMode}
          />
        </div>

        <div {...getSectionWrapperProps("typo")}>
          <TypographyPanel
            collapsed={isSectionCollapsed("typo")}
            onHeaderClick={onSectionHeaderClick("typo")}
            onHeaderDoubleClick={onSectionHeaderDoubleClick}
            typographyScale={typographyScale}
            onTypographyScaleChange={onTypographyScaleChange}
            onTypographyScalePreviewChange={onTypographyScalePreviewChange}
            fibonacciSequenceStartIndex={fibonacciSequenceStartIndex}
            onFibonacciSequenceStartIndexChange={onFibonacciSequenceStartIndexChange}
            typographyStyles={typographyStyles}
            gridUnit={gridUnit}
            baseFont={baseFont}
            onBaseFontChange={onBaseFontChange}
            onBaseFontPreviewChange={onBaseFontPreviewChange}
            isDarkMode={isDarkMode}
          />
        </div>

        <div {...getSectionWrapperProps("color")}>
          <ColorSchemePanel
            collapsed={isSectionCollapsed("color")}
            onHeaderClick={onSectionHeaderClick("color")}
            onHeaderDoubleClick={onSectionHeaderDoubleClick}
            colorScheme={colorScheme}
            onColorSchemeChange={onColorSchemeChange}
            onColorSchemePreviewChange={onColorSchemePreviewChange}
            canvasBackground={canvasBackground}
            onCanvasBackgroundChange={onCanvasBackgroundChange}
            onCanvasBackgroundPreviewChange={onCanvasBackgroundPreviewChange}
            isDarkMode={isDarkMode}
          />
        </div>
      </SettingsHelpNavigationProvider>
    </SidebarSectionScrollFrame>
  )
})

SettingsSidebarPanels.displayName = "SettingsSidebarPanels"
