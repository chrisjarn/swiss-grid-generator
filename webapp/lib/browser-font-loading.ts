import { isFontFamily, type FontFamily } from "@/lib/config/fonts"
import type { TextFormatRun } from "@/lib/text-format-runs"

export type BrowserFontLoadBlock<Key extends string, StyleKey extends string> = {
  key: Key
  styleKey: StyleKey
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  fontSize: number
  textFormatRuns?: readonly TextFormatRun<StyleKey, FontFamily>[]
  resolveRunFontSize?: (styleKey: StyleKey) => number
}

export function buildBrowserFontLoadSpec(
  fontFamily: FontFamily,
  fontWeight: number,
  italic: boolean,
  fontSize: number,
): string {
  const fontStyle = italic ? "italic" : "normal"
  return `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`
}

export function collectBrowserFontLoadSpecs<Key extends string, StyleKey extends string>(
  blocks: readonly BrowserFontLoadBlock<Key, StyleKey>[],
): string[] {
  const specs = new Set<string>()

  for (const block of blocks) {
    specs.add(buildBrowserFontLoadSpec(
      block.fontFamily,
      block.fontWeight,
      block.italic,
      block.fontSize,
    ))

    block.textFormatRuns?.forEach((run) => {
      if (!isFontFamily(run.fontFamily)) return
      const runStyleKey = run.styleKey ?? block.styleKey
      specs.add(buildBrowserFontLoadSpec(
        run.fontFamily,
        run.fontWeight ?? block.fontWeight,
        run.italic ?? block.italic,
        block.resolveRunFontSize?.(runStyleKey) ?? block.fontSize,
      ))
    })
  }

  return [...specs]
}

export async function preloadBrowserFontSpecs(specs: Iterable<string>): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return
  const uniqueSpecs = [...new Set(specs)]
  if (!uniqueSpecs.length) return
  await Promise.allSettled(uniqueSpecs.map((spec) => document.fonts.load(spec)))
}
