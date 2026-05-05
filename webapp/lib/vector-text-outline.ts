import type { FontFamily } from "@/lib/config/fonts"
import { parseHexColor, type RgbColor } from "@/lib/export-colors"
import { loadOutlineFont, type OpenTypePathCommand } from "@/lib/font-outline"
import type { PageExportTextPlan } from "@/lib/page-export-plan"
import { getRenderedTextDrawCommandText } from "@/lib/text-draw-command"

export type GeometryPathPoint = {
  anchor: { x: number; y: number }
  left: { x: number; y: number }
  right: { x: number; y: number }
}

export type GeometryPath = {
  open: boolean
  points: GeometryPathPoint[]
}

export type OutlineTextShape = {
  commands: readonly OpenTypePathCommand[]
  color: RgbColor
}

export type FallbackTextShape = {
  text: string
  x: number
  y: number
  color: RgbColor
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  trackingScale: number
}

function clonePoint(point: { x: number; y: number }) {
  return { x: point.x, y: point.y }
}

function buildStraightPathPoint(point: { x: number; y: number }): GeometryPathPoint {
  return {
    anchor: clonePoint(point),
    left: clonePoint(point),
    right: clonePoint(point),
  }
}

function pointsEqual(left: { x: number; y: number }, right: { x: number; y: number }): boolean {
  return Math.abs(left.x - right.x) <= 0.0001 && Math.abs(left.y - right.y) <= 0.0001
}

export function isRenderableTextFragment(text: string): boolean {
  return text.replace(/\s+/g, "").length > 0
}

export function quadraticToCubic(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
): { control1: { x: number; y: number }; control2: { x: number; y: number } } {
  return {
    control1: {
      x: start.x + ((control.x - start.x) * 2) / 3,
      y: start.y + ((control.y - start.y) * 2) / 3,
    },
    control2: {
      x: end.x + ((control.x - end.x) * 2) / 3,
      y: end.y + ((control.y - end.y) * 2) / 3,
    },
  }
}

export function buildSvgPathDataFromCommands(
  commands: readonly OpenTypePathCommand[],
  precision = 3,
): string {
  const format = (value: number) => {
    if (!Number.isFinite(value)) return "0"
    const rounded = Math.round(value * 10 ** precision) / 10 ** precision
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(precision).replace(/\.?0+$/, "")
  }

  return commands.map((command) => {
    switch (command.type) {
      case "M":
        return `M${format(command.x)} ${format(command.y)}`
      case "L":
        return `L${format(command.x)} ${format(command.y)}`
      case "C":
        return `C${format(command.x1)} ${format(command.y1)} ${format(command.x2)} ${format(command.y2)} ${format(command.x)} ${format(command.y)}`
      case "Q":
        return `Q${format(command.x1)} ${format(command.y1)} ${format(command.x)} ${format(command.y)}`
      case "Z":
        return "Z"
      default:
        return ""
    }
  }).filter(Boolean).join("")
}

export function convertOpenTypeCommandsToGeometryPaths(commands: readonly OpenTypePathCommand[]): GeometryPath[] {
  const paths: GeometryPath[] = []
  let current: GeometryPathPoint[] = []

  const finalizeCurrent = (open: boolean) => {
    if (current.length === 0) return
    if (!open && current.length > 1) {
      const first = current[0]!
      const last = current[current.length - 1]!
      if (pointsEqual(first.anchor, last.anchor)) {
        first.left = clonePoint(last.left)
        current = current.slice(0, -1)
      }
    }
    if (current.length > 0) {
      paths.push({ open, points: current })
    }
    current = []
  }

  for (const command of commands) {
    switch (command.type) {
      case "M": {
        finalizeCurrent(true)
        current = [buildStraightPathPoint({ x: command.x, y: command.y })]
        break
      }
      case "L": {
        if (current.length === 0) break
        const lastPoint = current[current.length - 1]!
        const nextPoint = buildStraightPathPoint({ x: command.x, y: command.y })
        lastPoint.right = clonePoint(lastPoint.anchor)
        current.push(nextPoint)
        break
      }
      case "C": {
        if (current.length === 0) break
        const lastPoint = current[current.length - 1]!
        lastPoint.right = { x: command.x1, y: command.y1 }
        current.push({
          anchor: { x: command.x, y: command.y },
          left: { x: command.x2, y: command.y2 },
          right: { x: command.x, y: command.y },
        })
        break
      }
      case "Q": {
        if (current.length === 0) break
        const lastPoint = current[current.length - 1]!
        const cubic = quadraticToCubic(
          lastPoint.anchor,
          { x: command.x1, y: command.y1 },
          { x: command.x, y: command.y },
        )
        lastPoint.right = cubic.control1
        current.push({
          anchor: { x: command.x, y: command.y },
          left: cubic.control2,
          right: { x: command.x, y: command.y },
        })
        break
      }
      case "Z": {
        finalizeCurrent(false)
        break
      }
      default:
        break
    }
  }

  finalizeCurrent(true)
  return paths.filter((path) => path.points.length > 0)
}

export async function preloadTextPlanOutlineFonts(textPlans: readonly PageExportTextPlan[]): Promise<void> {
  await Promise.all(textPlans.flatMap((textPlan) => {
    if (textPlan.graphemeLines.length > 0) {
      return textPlan.graphemeLines.flatMap((line) => line
        .filter((grapheme) => isRenderableTextFragment(grapheme.text))
        .map((grapheme) => loadOutlineFont(grapheme.fontFamily, grapheme.fontWeight, grapheme.italic)))
    }
    if (textPlan.segmentLines.length > 0) {
      return textPlan.segmentLines.flatMap((line) => line
        .filter((segment) => isRenderableTextFragment(segment.text))
        .map((segment) => loadOutlineFont(segment.fontFamily, segment.fontWeight, segment.italic)))
    }
    return textPlan.commands
      .map((command) => getRenderedTextDrawCommandText(command))
      .filter((text) => isRenderableTextFragment(text))
      .map(() => loadOutlineFont(textPlan.fontFamily, textPlan.fontWeight, textPlan.italic))
  }))
}

export async function resolveTextPlanVectorShapes(
  textPlan: PageExportTextPlan,
): Promise<{ outlineShapes: OutlineTextShape[]; fallbackTextShapes: FallbackTextShape[] }> {
  const outlineShapes: OutlineTextShape[] = []
  const fallbackTextShapes: FallbackTextShape[] = []

  const pushResolvedShape = async ({
    text,
    x,
    y,
    fontFamily,
    fontWeight,
    italic,
    fontSize,
    color,
    trackingScale,
  }: FallbackTextShape) => {
    if (!isRenderableTextFragment(text)) return
    const outlineFont = await loadOutlineFont(fontFamily, fontWeight, italic)
    if (!outlineFont) {
      fallbackTextShapes.push({
        text,
        x,
        y,
        color,
        fontFamily,
        fontWeight,
        italic,
        fontSize,
        trackingScale,
      })
      return
    }
    const commands = outlineFont.getPath(
      text,
      x,
      y,
      fontSize,
      {
        kerning: false,
        hinting: false,
      },
    ).commands
    if (commands.length === 0) return
    outlineShapes.push({ commands, color })
  }

  if (textPlan.graphemeLines.length > 0) {
    for (const graphemes of textPlan.graphemeLines) {
      for (const grapheme of graphemes) {
        await pushResolvedShape({
          text: grapheme.text,
          x: grapheme.x,
          y: grapheme.y,
          color: parseHexColor(grapheme.color) ?? textPlan.textColor,
          fontFamily: grapheme.fontFamily,
          fontWeight: grapheme.fontWeight,
          italic: grapheme.italic,
          fontSize: grapheme.fontSize,
          trackingScale: 0,
        })
      }
    }
    return { outlineShapes, fallbackTextShapes }
  }

  if (textPlan.segmentLines.length > 0) {
    for (const segments of textPlan.segmentLines) {
      for (const segment of segments) {
        await pushResolvedShape({
          text: segment.text,
          x: segment.x,
          y: segment.y,
          color: parseHexColor(segment.color) ?? textPlan.textColor,
          fontFamily: segment.fontFamily,
          fontWeight: segment.fontWeight,
          italic: segment.italic,
          fontSize: segment.fontSize,
          trackingScale: segment.trackingScale,
        })
      }
    }
    return { outlineShapes, fallbackTextShapes }
  }

  for (const command of textPlan.commands) {
    await pushResolvedShape({
      text: getRenderedTextDrawCommandText(command),
      x: command.x,
      y: command.y,
      color: textPlan.textColor,
      fontFamily: textPlan.fontFamily,
      fontWeight: textPlan.fontWeight,
      italic: textPlan.italic,
      fontSize: textPlan.fontSize,
      trackingScale: textPlan.trackingScale,
    })
  }

  return { outlineShapes, fallbackTextShapes }
}
