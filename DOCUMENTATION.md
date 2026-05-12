# Swiss Grid Generator Documentation

Swiss Grid Generator is a precision tool for building editorial layouts from a visible system: ratio, baseline, margins, modular field, hierarchy, and export.

This document is the single source of truth for user documentation. The static documentation website is generated from this file.

## Getting Started

1. Open Swiss Grid Generator.
2. Choose a preset, or start from a clean page.
3. Set the canvas ratio and orientation.
4. Choose a baseline rhythm.
5. Define margins, columns, rows, gutters, and rhythm.
6. Add text and image areas only after the page field is clear.
7. Export the resolved page plan as JSON, PDF, SVG, or IDML.

The tool is built around one simple interaction model:

> Hover. Observe. Commit.

Hover previews show a temporary state. A click commits the decision.

## Core Concepts

### Grid Systems

The modular field is the working structure of the page. It divides the content area into columns and rows, with gutters derived from the baseline unit.

Use simple repetitive grids first. Move to Fibonacci, golden ratio, perfect fourth, or perfect fifth rhythms when the page needs a stronger proportional character.

### Baselines

The baseline is the vertical unit of the system. Margins, gutters, typography, and many placement decisions resolve against it.

The default A4 reference baseline is `12 pt`. Other formats scale from this reference while preserving typographic rhythm.

### Margins

Margins define the page pressure before content is placed.

| Method | Use |
|---|---|
| Progressive | Balanced Swiss modern page fields. |
| Van de Graaf | Classical book and spread proportions. |
| Baseline | Strict equal margins. |
| Custom | Deliberate exceptions. |

Use custom margins sparingly. They are most useful when the page has a clear external constraint.

### Rhythms

Rhythm controls how columns and rows are distributed.

| Rhythm | Character |
|---|---|
| Repetitive | Neutral, controlled, systematic. |
| Fibonacci | Strong progressive proportion. |
| Golden ratio | Classical proportional contrast. |
| Perfect fourth | Moderate typographic rhythm. |
| Perfect fifth | Wider proportional contrast. |

## Interface Guide

### Presets

The preset browser contains bundled starting points, examples, and user layouts. Select a layout to load it.

The quick-start video preset opens the onboarding video directly. It is a guide, not export content.

### Left Settings Panel

Use the left panel to define page structure:

- Canvas ratio and orientation
- Baseline
- Margins
- Modular field
- Typography rhythm
- Color and image-placeholder scheme

Supported controls preview on hover and commit on click.

### Preview

The preview shows the planned page. It consumes the same canonical page plan as PDF, SVG, IDML, thumbnails, and exports.

Double-click an empty module to create a text paragraph. Hold `Shift` while double-clicking to create an image placeholder.

### Text Editing

Text paragraphs use hierarchy roles:

| Role | Typical use |
|---|---|
| Display | Large typographic statement. |
| Headline | Primary title. |
| Subhead | Section title or secondary emphasis. |
| Body | Main reading text. |
| Caption | Notes, folios, metadata. |
| Custom | Paragraph-level exception. |

Use custom size and leading only when the hierarchy does not solve the page.

### Project Panel

The project panel manages:

- Project title, subject, and author
- Page navigation
- Page order
- Layer order
- Layer selection, locking, duplication, and deletion

## Placeholder Reference

Document variables are written directly inside text paragraphs.

| Token | Output |
|---|---|
| `<%lorem%>` | Fitted placeholder text for the active frame. |
| `<%project_title%>` | Project metadata title. |
| `<%page_title%>` | Current page name. |
| `<%page%>` | Current physical page number. |
| `<%pages%>` | Total physical page count. |
| `<%date%>` | Export or preview date as `YYYY-MM-DD`. |
| `<%time%>` | Export or preview time as `HH:mm`. |

In text edit mode, tokens stay visible. Outside edit mode, they render as resolved values.

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Import project | `Cmd/Ctrl+O` |
| Save to library | `Cmd/Ctrl+S` |
| Open export | `Cmd/Ctrl+Shift+E` |
| Undo | `Cmd/Ctrl+Z` |
| Redo | `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` |
| Toggle dark mode | `Cmd/Ctrl+Shift+D` |
| Toggle baselines | `Cmd/Ctrl+Shift+B` |
| Toggle margins | `Cmd/Ctrl+Shift+M` |
| Toggle modules | `Cmd/Ctrl+Shift+G` |
| Toggle typography | `Cmd/Ctrl+Shift+T` |
| Toggle image placeholders | `Cmd/Ctrl+Shift+J` |
| Toggle project panel | `Cmd/Ctrl+Shift+P` |
| Open documentation | `Shift+?` |
| Toggle legal notice | `Cmd/Ctrl+Shift+3` |
| Open presets | `Cmd/Ctrl+Shift+4` |

## Export Options

| Format | Use |
|---|---|
| JSON | Editable Swiss Grid Generator project file. |
| PDF | Vector output for print and review. |
| SVG | Single-page vector output, or zipped multi-page output. |
| IDML | InDesign interchange package. |

All vector exports consume the same canonical `PageExportPlan`. Preview, PDF, SVG, IDML, thumbnails, and exports are consumers of the same planned layout.

## Calculations & Theory

Swiss Grid Generator follows deterministic layout mathematics. The full engineering reference lives in [CALCULATIONS.md](CALCULATIONS.md).

Key principles:

- Layout is planned once.
- Browser text metrics are diagnostic only.
- Canvas, PDF, SVG, IDML, thumbnails, previews, and exports do not calculate layout independently.
- Output parity has priority over convenience.

## Documentation Map

| Need | Canonical file |
|---|---|
| User documentation | [DOCUMENTATION.md](DOCUMENTATION.md) |
| Project overview | [README.md](README.md) |
| Feature inventory | [FEATURES.md](FEATURES.md) |
| Exact settings and defaults | [SETTINGS.md](SETTINGS.md) |
| Layout math and geometry | [CALCULATIONS.md](CALCULATIONS.md) |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| GUI structure | [GUI.md](GUI.md) |
| Performance and benchmarks | [PERFORMANCE.md](PERFORMANCE.md) |
| Test strategy | [TESTS.md](TESTS.md) |
| Developer setup | [DEVELOPERS.md](DEVELOPERS.md) |
| Visual design system | [DESIGN.md](DESIGN.md) |
| Editorial voice | [EDITORIAL.md](EDITORIAL.md) |

## Markdown Rules

- Keep this file user-facing.
- Keep implementation detail in the linked engineering documents.
- Do not duplicate large tables from `SETTINGS.md` or formulas from `CALCULATIONS.md`.
- Prefer concise sections and links to the canonical file.
