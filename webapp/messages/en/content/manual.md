# Swiss Grid Generator manual

## Swiss Grid Generator

### manual

Swiss Grid Generator is a layout instrument for disciplined editorial pages built from ratio, baseline, margins, modules, and typographic hierarchy.

this manual is selective by design. it focuses on decisions that shape the page. it does not document every control.

for implementation-accurate reference, see [SETTINGS.md](./SETTINGS.md), [CALCULATIONS.md](./CALCULATIONS.md), and [FEATURES.md](./FEATURES.md).

## 1. introduction

### start with structure, not decoration.

a strong page follows a clear order: set the canvas, set the baseline, set the margins, build the modular field, define the type system, place text and image areas, then export when the composition is stable.

global decisions should come first. local overrides should remain rare. if the structure is clear, later adjustments stay precise. if the structure is weak, every local correction becomes expensive.

## 2. quick start

### build the page in the simplest reliable order.

choose `ratio`, `orientation`, and, if needed, `rotation`. set the `baseline`. choose the `margins` method, or use `custom margins` when the field needs a precise exception. then set `cols`, `rows`, `gutter`, and `rhythm`. finally define type rhythm and base family.

create content only after the page structure is established. double-click a module to create a text paragraph. use `shift` + double-click to create an image placeholder. if the page feels wrong, return to baseline and margins before changing content blocks.

## 3. recommended workflow

### move from the largest decision to the smallest.

the sequence is simple: canvas and orientation first, baseline second, margins third, modular field and rhythm fourth, type scale and base family fifth, paragraph and image placement sixth, local refinements seventh, export last.

the order matters because the tool is system-driven. if a document needs many local exceptions, the underlying modular field, margin field, or hierarchy is usually unresolved. the correct repair is normally structural.

## 4. pages and document structure

### treat page order as part of the design.

use single pages when each page should stand on its own. use `facing pages` when a spread should behave as one editorial field. a facing spread is one project page, but it represents two physical pages. that affects page numbering and document variables such as `%page%` and `%pages%`.

in the project panel, use the `page` header or list icon to return from layers to the page list. activate pages directly from rows, open a row only when you need its layers, and use the page counter when you need to jump by physical page number. facing pages should be intentional, not a substitute for a weak single-page composition.

## 5. grid, margins, and rhythm

### resolve the page field before refining content.

choose a baseline that matches the intended density of the work. a smaller baseline creates finer rhythm and more control. a larger baseline creates a slower page. then choose a margin system that defines a clear content field.

only after that should you define columns, rows, gutter, and rhythm. use `repetitive` as the neutral reference. if the page does not work there, a more expressive rhythm will rarely solve it. use fibonacci, golden ratio, perfect fourth, and perfect fifth only when they strengthen the structure.

## 6. typography

### let type reinforce the grid.

start with type rhythm and base family. then assign hierarchy by role: caption, body, subhead, headline, display, and `fx` where needed. `custom` is a paragraph-level override, not part of the global type scale. these roles are structural, not mood presets.

refine tracking and leading only after hierarchy is correct. tracking changes the tonal color of the page and should be used carefully. alignment should be a compositional decision, not a repair. variables such as `%page%`, `%pages%`, `%date%`, and `%lorem%` belong to the editorial logic of the page.

## 7. placing text and image areas

### define the frame before refining content.

use the modular field deliberately. double-click a module to create text with hyphenation off. hold `1` to `5` while double-clicking to create text directly in a hierarchy; the initial frame follows that role and clamps to the remaining columns. use `shift` + double-click to create an image placeholder.

before refining wording, define the frame with `rows`, `baselines`, and `cols`. then adjust alignment, snapping, and content. snapped placement produces stronger editorial discipline. free placement should be deliberate.

## 8. export

### export is translation, not correction.

choose the export format according to what happens next. use `PDF` for faithful vector document output, `SVG` for frozen vector geometry per page, and `IDML` when the document continues in InDesign.

before exporting, confirm page range, page order, numbering, document size, and editorial variables. on long documents or rotated pages, make a visual check after export.

`PDF`, `SVG`, and `IDML` share the same deterministic page-planning path. the progress display reports preparation, planning, page rendering, finalization, elapsed time, and the same progress log used by CLI export.

## 9. keyboard and fast interaction

### use shortcuts to protect concentration.

the essential interactions are few: double-click to create text, `shift` + double-click to create an image placeholder, hold `1` to `5` while double-clicking to choose hierarchy, drag to move, use `+` for transfer or duplication, use arrow keys to nudge selected layers, and press `esc` to leave dialogs or cancel export at the next safe point.

shortcuts protect attention. they are not speed for its own sake.

## 10. common mistakes

### most layout problems begin too locally.

styling paragraphs too early is a common error. if the modular field is unresolved, local styling only hides the problem. another error is using facing pages without spread logic. facing pages are useful when the spread must work as one field. otherwise, single pages are stronger.

other errors follow the same pattern: overfilling the field, repairing weak hierarchy with tracking, exporting without checking numbering and range. return to the system first.

## 11. final advice

### keep the system clear and exceptions rare.

set the page before the content. set the rhythm before the styling. set the frame before the wording. set the system before the exceptions.

this is the central discipline of the tool.
