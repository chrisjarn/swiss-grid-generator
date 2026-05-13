import { cn } from "@/lib/utils"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { FocusEvent, ReactNode } from "react"
import { HOVER_TOOLTIP_FADE_DURATION_MS, HOVER_TOOLTIP_OPEN_DELAY_MS } from "@/shared/ui/hover-tooltip-timing"

export type HoverTooltipProps = {
  label: ReactNode
  children: ReactNode
  className?: string
  tooltipClassName?: string
  anchorToClosestSelector?: string
  constrainToClosestSelector?: string
  constrainAxes?: "both" | "horizontal" | "vertical"
  horizontalAlign?: "center" | "start" | "end"
  viewportPaddingPx?: number
  disabled?: boolean
  inline?: boolean
}

type TooltipPoint = {
  x: number
  y: number
}

const TOOLTIP_ANCHOR_GAP_PX = 8

export function HoverTooltip({
  label,
  children,
  className,
  tooltipClassName,
  anchorToClosestSelector,
  constrainToClosestSelector,
  constrainAxes = "both",
  horizontalAlign = "center",
  viewportPaddingPx = 12,
  disabled = false,
  inline = false,
}: HoverTooltipProps) {
  const wrapperRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const openTimerRef = useRef<number | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPoint | null>(null)

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current === null || typeof window === "undefined") return
    window.clearTimeout(openTimerRef.current)
    openTimerRef.current = null
  }, [])

  const updateTooltipPosition = useCallback(() => {
    if (disabled || !isActive || typeof window === "undefined") return
    const anchorElement = anchorToClosestSelector
      ? wrapperRef.current?.closest(anchorToClosestSelector)
      : wrapperRef.current
    const wrapperRect = anchorElement instanceof HTMLElement
      ? anchorElement.getBoundingClientRect()
      : wrapperRef.current?.getBoundingClientRect()
    const node = tooltipRef.current
    if (!node || !wrapperRect) return
    const rect = node.getBoundingClientRect()

    let minX = viewportPaddingPx
    let maxX = window.innerWidth - viewportPaddingPx
    let minY = viewportPaddingPx
    let maxY = window.innerHeight - viewportPaddingPx

    if (constrainToClosestSelector) {
      const boundary = wrapperRef.current?.closest(constrainToClosestSelector)
      if (boundary instanceof HTMLElement) {
        const boundaryRect = boundary.getBoundingClientRect()
        if (constrainAxes === "both" || constrainAxes === "horizontal") {
          minX = Math.max(minX, boundaryRect.left + viewportPaddingPx)
          maxX = Math.min(maxX, boundaryRect.right - viewportPaddingPx)
        }
        if (constrainAxes === "both" || constrainAxes === "vertical") {
          minY = Math.max(minY, boundaryRect.top + viewportPaddingPx)
          maxY = Math.min(maxY, boundaryRect.bottom - viewportPaddingPx)
        }
      }
    }

    if (maxX < minX) {
      maxX = minX
    }
    if (maxY < minY) {
      maxY = minY
    }

    const minLeft = minX
    const maxLeft = Math.max(minLeft, maxX - rect.width)
    const preferredLeft = horizontalAlign === "start"
      ? wrapperRect.left
      : horizontalAlign === "end"
        ? wrapperRect.right - rect.width
        : wrapperRect.left + wrapperRect.width / 2 - rect.width / 2
    const nextLeft = Math.min(Math.max(preferredLeft, minLeft), maxLeft)

    const belowTop = wrapperRect.bottom + TOOLTIP_ANCHOR_GAP_PX
    const aboveTop = wrapperRect.top - TOOLTIP_ANCHOR_GAP_PX - rect.height
    const maxTop = Math.max(minY, maxY - rect.height)
    const canFitBelow = belowTop + rect.height <= maxY
    const canFitAbove = aboveTop >= minY
    const nextTop = canFitBelow
      ? belowTop
      : canFitAbove
        ? aboveTop
        : Math.min(Math.max(
          (maxY - wrapperRect.bottom) >= (wrapperRect.top - minY)
            ? belowTop
            : aboveTop,
          minY,
        ), maxTop)

    setTooltipPosition({ x: nextLeft, y: nextTop })
  }, [anchorToClosestSelector, constrainAxes, constrainToClosestSelector, disabled, horizontalAlign, isActive, viewportPaddingPx])

  useLayoutEffect(() => {
    if (disabled || !isActive) {
      setTooltipPosition(null)
      return
    }
    updateTooltipPosition()
    const handleViewportChange = () => updateTooltipPosition()
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)
    return () => {
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [disabled, isActive, updateTooltipPosition])

  const activateFromElement = useCallback(() => {
    if (isActive || typeof window === "undefined") return
    clearOpenTimer()
    openTimerRef.current = window.setTimeout(() => {
      setIsActive(true)
      openTimerRef.current = null
    }, HOVER_TOOLTIP_OPEN_DELAY_MS)
  }, [clearOpenTimer, isActive])

  const deactivateFromElement = useCallback(() => {
    clearOpenTimer()
    setIsActive(false)
  }, [clearOpenTimer])

  useEffect(() => {
    if (disabled) deactivateFromElement()
    return () => clearOpenTimer()
  }, [clearOpenTimer, deactivateFromElement, disabled])

  const wrapperProps = {
    className: cn(!disabled && "relative", className),
    onMouseEnter: disabled ? undefined : activateFromElement,
    onMouseLeave: disabled ? undefined : deactivateFromElement,
    onFocusCapture: disabled ? undefined : activateFromElement,
    onBlurCapture: disabled ? undefined : (event: FocusEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget
      if (!(nextTarget instanceof Node) || !wrapperRef.current?.contains(nextTarget)) {
        deactivateFromElement()
      }
    },
  }
  const content = (
    <>
      {children}
      {!disabled ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "pointer-events-none fixed z-40 rounded border px-2 py-1 text-[11px] shadow-sm transition-opacity",
            isActive ? "opacity-100" : "opacity-0",
            tooltipPosition ? null : "invisible",
            tooltipClassName,
          )}
          style={tooltipPosition
            ? {
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transitionDuration: `${HOVER_TOOLTIP_FADE_DURATION_MS}ms`,
            }
            : undefined}
        >
          {label}
        </div>
      ) : null}
    </>
  )

  return inline ? (
    <span
      ref={(node) => {
        wrapperRef.current = node
      }}
      {...wrapperProps}
    >
      {content}
    </span>
  ) : (
    <div
      ref={(node) => {
        wrapperRef.current = node
      }}
      {...wrapperProps}
    >
      {content}
    </div>
  )
}
