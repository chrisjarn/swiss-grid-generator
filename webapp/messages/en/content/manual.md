# Swiss Grid Generator manual

## Swiss Grid Generator

### user manual

Swiss Grid Generator is a layout instrument for building disciplined editorial pages from ratio, baseline, margins, modules, and typographic hierarchy.

This manual is selective by design. It focuses on decisions that shape the page. It does not document every control.

For implementation-accurate reference, see [SETTINGS.md](./SETTINGS.md), [CALCULATIONS.md](./CALCULATIONS.md), and [FEATURES.md](./FEATURES.md).

## 1. introduction

### start with structure, not decoration.

A strong page usually follows a clear order: set the format, set the baseline, set the margins, build the grid, define the type system, place text and image areas, then export when the composition is stable.

Global decisions should come first. Local overrides should remain rare. If the structure is clear, later adjustments stay precise. If the structure is weak, every local correction becomes expensive.

## 2. quick start

### build the page in the simplest reliable order.

Choose `ratio`, `orientation`, and, if needed, `rotation`. Set the `baseline`. Choose the `margins` method, or use `custom margins` when the field needs a precise exception. Then set `cols`, `rows`, `gutter`, and `rhythm`. Finally define type rhythm and base family.

Only after the page structure is established should you create content. Double-click a module to create a text paragraph. Use `shift` + double-click to create an image placeholder. If the page feels wrong, return to baseline and margins before changing content blocks.

## 3. recommended workflow

### move from the largest decision to the smallest.

The sequence is simple: format and orientation first, baseline second, margins third, grid and rhythm fourth, type scale and base family fifth, paragraph and image placement sixth, local refinements seventh, export last.

The order matters because the tool is system-driven. If a document needs many local exceptions, the underlying grid, margin field, or hierarchy is usually unresolved. The correct repair is normally structural.

## 4. pages and document structure

### treat page order as part of the design.

Use single pages when each page should stand on its own. Use `facing pages` when a spread should behave as one editorial field. A facing spread is one project page, but it represents two physical pages. That affects page numbering and document variables such as `%page%` and `%pages%`.

In the project panel, use the `page` header or list icon to return from layers to the page list. Activate pages directly from rows, open a row only when you need its layers, and use the page counter when you need to jump by physical page number. Facing pages should be intentional, not a substitute for a weak single-page composition.

## 5. grid, margins, and rhythm

### resolve the page field before refining content.

Choose a baseline that matches the intended density of the work. A smaller baseline creates finer rhythm and more control. A larger baseline creates a slower page. Then choose a margin system that defines a clear content field.

Only after that should you define columns, rows, gutter, and rhythm. Use `repetitive` as the neutral reference. If the page does not work there, a more expressive rhythm will rarely solve it. Use fibonacci, golden ratio, perfect fourth, and perfect fifth only when they strengthen the structure.

## 6. typography

### let type reinforce the grid.

Start with type rhythm and base family. Then assign hierarchy by role: caption, body, subhead, headline, display, and `fx` where needed. `custom` is a paragraph-level override, not part of the global type scale. These roles are structural, not mood presets.

Refine tracking and leading only after hierarchy is correct. Tracking changes the tonal color of the page and should be used carefully. Alignment should be a compositional decision, not a repair. Variables such as `%page%`, `%pages%`, `%date%`, and `%lorem%` belong to the editorial logic of the page.

## 7. placing text and image areas

### define the frame before refining content.

Use the modular field deliberately. Double-click a module to create text with hyphenation off. Hold `1` to `5` while double-clicking to create text directly in a hierarchy; the initial frame follows that role and clamps to the remaining columns. Use `shift` + double-click to create an image placeholder.

Before refining wording, define the frame with `rows`, `baselines`, and `cols`. Then adjust alignment, snapping, and content. Snapped placement produces stronger editorial discipline. Free placement should be deliberate.

## 8. export

### export is translation, not correction.

Choose the export format according to what happens next. Use `PDF` for faithful vector document output, `SVG` for frozen vector geometry per page, and `IDML` when the document continues in InDesign.

Before exporting, confirm page range, page order, numbering, document size, and editorial variables. On long documents or rotated pages, make a visual check after export.

PDF, SVG, and IDML share the same deterministic page-planning path. The progress display reports preparation, page rendering, finalization, and elapsed time.

## 9. keyboard and fast interaction

### use shortcuts to protect concentration.

The essential interactions are few: double-click to create text, `shift` + double-click to create an image placeholder, hold `1` to `5` while double-clicking to choose hierarchy, drag to move, use `+` for transfer or duplication, use arrow keys to nudge selected layers, and press `esc` to leave dialogs or cancel export at the next safe point.

The purpose of shortcuts is not speed for its own sake. The purpose is to keep attention on the page.

## 10. common mistakes

### most layout problems begin too locally.

Styling paragraphs too early is a common error. If the grid is unresolved, local styling only hides the problem. Another error is using facing pages without spread logic. Facing pages are useful when the spread must work as one field. Otherwise, single pages are stronger.

Other errors follow the same pattern: overfilling the grid, repairing weak hierarchy with tracking, exporting without checking numbering and range. Return to the system first.

## 11. final advice

### keep the system clear and exceptions rare.

Set the page before the content. Set the rhythm before the styling. Set the frame before the wording. Set the system before the exceptions.

This is the central discipline of the tool.
