# DESIGN.md — Tactile Brutalism

**Swiss Grid Generator Design System**  
*Version 1.0 — May 2026*

## 1. Core Philosophy

**Tactile Brutalism** is a deliberate fusion of three design traditions:

- **Josef Müller-Brockmann & Swiss International Style** — Absolute clarity, systematic order, objective typography, reduction to the essential, visible structure through grid and baseline.
- **Dieter Rams (Braun)** — "Less, but better." Honest materials, timeless functionality, extreme restraint, tactile quality, and the belief that good design should be as little design as possible.
- **Digital Brutalism** — Raw honesty, material truth, visible construction, geometric rigor, and a rejection of decorative skeuomorphism.

The result is a serious, calm, highly precise editorial instrument that feels like a physical Braun hi-fi device from the 1970s reimagined for professional digital typography work in 2026.

> "Good design is as little design as possible." — Dieter Rams  
> "The grid is a system of order that makes the message more easily understood." — Josef Müller-Brockmann  
> **"Every stroke must be there for a reason."**

## 2. Fundamental Principles

- **Less, but better** — Remove everything that does not serve function or clarity.
- **Honesty & Material Truth** — Show structure. No fake shadows, gloss, or decoration.
- **Precision & Order** — Every spacing, proportion, and alignment must feel systematic.
- **Tactile Quality** — Elements should feel solid and touchable even on screen.
- **Functional Restraint** — Color is used only when it carries meaning, never for decoration (Dieter Rams principle).
- **Typographic Excellence** — Typography is the most important design element.
- **Every stroke must be there for a reason** — No arbitrary lines, borders, shadows, or details. Every visual element must justify its existence through function, structure, or hierarchy.

## 3. Color Philosophy & Palette

Color is used with extreme discipline — always functional, never decorative. We draw directly from the **Braun Audio** color language.

### Primary Tones (Braun Reference)

- **Braun White** — `#F0EDE5` — Main backgrounds and surfaces
- **Braun Dark Grey** — `#8A8A87` — Structural elements, borders, speaker grilles
- **Braun Light Grey** — `#C5C3BE` — Panels, buttons, mid-tone surfaces

### Structural Dark Tones

- **Braun Anthracite** — `#2E2E2C` — Deep frames, dark variants, bases
- **Braun Warm Black** — `#1A1A18` — Primary typography, labels, model names

### Accent / Signal Colors (Used very sparingly)

- **Braun Signal Red** — `#C02820` — Primary action color, power indicators, emphasis
- **Braun Green** — `#00A97A` — Status / on-state indicators
- **Braun Yellow** — `#D4B018` — Function / attention signals
- **Braun Blue** — `#2979C8` — Connectivity signals
- **Braun Orange** — `#E87820` — Secondary status (e.g. mute)

**Color Rule (Dieter Rams influence):**  
Maximum one strong accent color per screen or context. Color always serves a clear functional purpose — never decoration.

## 4. Typography

- **Body & UI:** `Inter` — clean, highly legible, neutral
- **Display & Branding:** `Space Grotesk` — geometric, modern, strong presence

**Rules:**
- UI text is authored in normal sentence/label case and rendered predominantly lowercase through the GUI CSS layer.
- Strong hierarchy through size, weight and spacing — never decoration
- Generous use of whitespace and baseline alignment

## 5. Form Language

- Sharp geometry, minimal or no rounding on structural elements
- Strong, consistent borders instead of shadows
- Flat but material appearance (subtle depth through borders and tone contrast)
- Icons are simple, geometric, and consistent in weight
- All components align to a strict underlying grid

## 6. Spatial & Grid System

- Heavily inspired by Müller-Brockmann: visible modular grids and baseline rhythms in the preview
- Progressive margin systems
- All UI elements respect an 8px / 4px baseline grid
- Clear visual separation between content area and controls

## 7. Interaction Philosophy

**Hover. Observe. Commit.**

The interface follows a deliberate three-step interaction model:

- **Hover** — Immediate live preview of changes (real-time exploration of rhythm, proportion, hierarchy, etc.).
- **Observe** — The user calmly evaluates the effect on the page ground and modular field.
- **Commit** — A conscious action finalizes the change.

This model encourages thoughtful decision-making while allowing fluid discovery. It respects the user’s intelligence and mirrors the precision required in professional typography.

Changes are **non-destructive until committed**, reinforcing the principle of considered action.

## 8. Do’s and Don’ts

**Do:**
- Make structure visible
- Use color and strokes only with clear purpose
- Prioritize calm, precision and readability
- Create tactile, solid-feeling interfaces

**Don’t:**
- Use decorative gradients, gloss, or skeuomorphic effects
- Add unnecessary illustrations or icons
- Use excessive rounding on major UI containers
- Rely on shadows for depth
- Break typographic discipline
- Add any stroke that cannot be justified

## 9. Redesign Guardrails

Broad interface restructuring, GUI sorting, and CSS visual-system cleanup should happen after the current interface redesign direction is settled. Until then, changes should stay narrow and avoid rewriting shared spacing, radius, color, or icon-button rules.

When the redesign pass begins, every component-level visual decision must be checked against:

- Tactile Brutalism: solid, exact, functional, non-decorative.
- 8px / 4px UI rhythm and consistent alignment.
- Functional color only, with no decorative accent drift.
- Component discipline over broad global overrides.
- "Every stroke must be there for a reason."
