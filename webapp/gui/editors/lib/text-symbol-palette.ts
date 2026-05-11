import { translateMessage } from "@/core/i18n/messages"

export type TextSymbolPaletteGroup = {
  id: string
  label: string
  symbols: readonly string[]
}

export const TEXT_SYMBOL_PALETTE_GROUPS: readonly TextSymbolPaletteGroup[] = [
  {
    id: "arrows",
    label: translateMessage("editor.symbols.groups.arrows"),
    symbols: ["←", "↑", "→", "↓", "↖", "↗", "↘", "↙", "↔", "↕", "↩", "↪"],
  },
  {
    id: "bullets",
    label: translateMessage("editor.symbols.groups.bullets"),
    symbols: ["•", "◦", "▪", "▫", "■", "□", "●", "○", "◆", "◇", "▸", "▹"],
  },
  {
    id: "marks",
    label: translateMessage("editor.symbols.groups.marks"),
    symbols: ["§", "¶", "†", "‡", "※", "№", "©", "®", "™", "℠", "℗", "℞"],
  },
  {
    id: "math",
    label: translateMessage("editor.symbols.groups.math"),
    symbols: ["+", "−", "×", "÷", "=", "≠", "≈", "≤", "≥", "±", "∞", "√"],
  },
  {
    id: "greek",
    label: translateMessage("editor.symbols.groups.greek"),
    symbols: ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"],
  },
  {
    id: "geometry",
    label: translateMessage("editor.symbols.groups.geometry"),
    symbols: ["△", "▽", "▲", "▼", "◁", "▷", "◀", "▶", "◇", "◈", "⬡", "⬢"],
  },
  {
    id: "editorial",
    label: translateMessage("editor.symbols.groups.editorial"),
    symbols: ["«", "»", "‹", "›", "…", "–", "—", "′", "″", "·", "‚", "„"],
  },
] as const
