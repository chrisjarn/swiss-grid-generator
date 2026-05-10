# tooltips

Tooltip copy for the in-app layout guidance shown at the bottom of the preview.

Format:
- `## Group Title` starts a tooltip group.
- `### Tooltip Topic {#tooltip-id}` starts a tooltip topic.
- Keep each note short, practical, and tied to a compositional decision.

## working order

### start with the page system {#tooltip-start-with-system}
Set format, baseline, margins, grid, rhythm, type scale, and base family before placing many layers.

if the page feels unresolved, adjust the system first. local paragraph changes are useful only after the field is stable.

### structure before styling {#tooltip-structure-before-styling}
Use `rows`, `baselines`, and `cols` to define the text frame before refining wording, tracking, or color.

The frame is the editorial decision. Styling should clarify it, not compensate for it.

### use repetitive as a control {#tooltip-repetitive-reference}
Judge the page first in `repetitive` rhythm. It gives the clearest reading of margins, baseline, hierarchy, and measure.

Use fibonacci, golden ratio, perfect fourth, or perfect fifth only when asymmetry strengthens the field.

## creating content

### create text on the grid {#tooltip-create-text}
Double-click inside a module to create a paragraph where the structure suggests it belongs.

The block starts on the clicked module, with hyphenation off, and clamps to the available columns.

### choose hierarchy while creating {#tooltip-create-hierarchy}
Hold `1..5` while double-clicking to assign hierarchy immediately.

`1` caption, `2` body, `3` subhead, `4` headline, `5` display. The initial measure follows the role and the remaining column field.

### place image placeholders deliberately {#tooltip-create-image}
Use `shift` + double-click on an empty module to create an image placeholder.

Placeholders share the same snap, span, baseline height, and rotation discipline as text.

### use lorem as a frame test {#tooltip-lorem-frame-test}
Insert `<%lorem%>` to test whether a paragraph frame can carry the intended density.

The token fills the active frame using current rows, baselines, columns, reflow, and hyphenation.

## moving and duplicating

### drag for placement, nudge for decision {#tooltip-drag-and-nudge}
Drag to establish position. Use cursor keys for final placement.

Nudging follows the same logical grid model as dragging, so movement stays tied to the page system.

### nudge with the grid {#tooltip-cursor-nudge}
With snapped axes enabled, arrow keys move the selected unlocked layer by columns and module rows.

Hold `shift` to move snapped y by baseline rows. On unsnapped axes, `shift` increases the fine step.

### duplicate without losing rhythm {#tooltip-duplicate-layer}
Use the visible `+` control for duplication and transfer.

For text, `+` duplicates the paragraph. `shift` copies paragraph settings, `alt/option` copies typography, and `alt/option` + `shift` copies both. Image placeholders duplicate directly.

### free placement is an exception {#tooltip-free-placement}
Turn off column or baseline snap only for a controlled optical exception.

Free x placement can create a disciplined side-margin overhang. It is not for casual drift.

## editing flow

### paragraph zoom keeps work local {#tooltip-smart-text-zoom}
Keep paragraph zoom on for text-heavy pages.

Entering text edit focuses the active paragraph. Text and style edits keep the view stable. Frame changes refit the paragraph.

### retarget paragraph to paragraph {#tooltip-turbo-edit}
With an editor open, select another unlocked preview paragraph to retarget immediately.

Use this to move through a page without repeatedly closing the editor.

### retarget from layer cards {#tooltip-layer-card-retarget}
Double-click an unlocked layer card in the project panel to open or retarget its editor.

Single-click still selects the layer for nudging and ordering.

### edit the rendered text {#tooltip-rendered-text-editing}
Inline editing follows the rendered line layout.

Double-click selects a word, triple-click selects a sentence, and `alt+a` or `cmd/ctrl+a` selects the paragraph.

### keep tokens visible while editing {#tooltip-placeholder-editing}
Document variables stay visible as raw tokens while editing and render as live values outside edit mode.

Use them for folios, project titles, dates, times, and proof text with predictable control.

## paragraph geometry

### height is rows plus baselines {#tooltip-rows-plus-baselines}
paragraph and image heights are built from `rows + baselines`.

Use full rows for modular blocks and baseline-only height for captions, folios, and shallow editorial frames.

### set columns before reflow {#tooltip-columns-before-reflow}
Choose `cols` before judging paragraph flow.

A weak line length is usually a measure problem. Reflow and hyphenation work best after the measure is correct.

### align inside the frame {#tooltip-frame-alignment}
Alignment positions text inside the configured frame.

Use it as a compositional decision within a clear frame, not as a repair.

### use custom type sparingly {#tooltip-custom-type}
When first selected, `custom` copies the paragraph's resolved size and leading.

Treat custom type as a local editorial exception after the hierarchy is clear.

## layers and pages

### select before nudging {#tooltip-select-before-nudge}
Single-click a layer card to select it, then use arrow keys to nudge.

This keeps positional edits precise and avoids entering edit mode by accident.

### lock resolved layers {#tooltip-lock-finished-layers}
Lock layers once their position and role are resolved.

Locked layers still show rollover guides, but cannot be moved, edited, duplicated, deleted, or retargeted until unlocked.

### use page rows for document rhythm {#tooltip-page-cards}
Use the `page` header or list icon to return from a layer stack to the page list.

Page order is part of the design. Treat it with the same discipline as grid and hierarchy.

### use facing pages only for spreads {#tooltip-facing-pages}
Use `facing pages` only when two physical pages need one continuous editorial field.

A facing spread doubles the column field, mirrors inner and outer margins, and affects physical page variables.

## preview discipline

### toggle guides while judging {#tooltip-preview-guides}
Use the header toggles to inspect baselines, margins, modules, typography, and image placeholders.

Judge the same layout with and without construction lines. The rhythm should remain visible after the guides disappear.

### rollover guides show the frame {#tooltip-rollover-guides}
Hover a layer to see its edit access and placement guides.

paragraph guides follow the configured `rows + baselines` frame, not only the visible text bounds.

### help hover is contextual {#tooltip-help-hover}
open help and hover marked areas for the matching reference.

## export readiness

### export after the system is stable {#tooltip-export-readiness}
export should confirm a resolved layout, not repair it.

Check page order, page range, visible guide toggles, rotation, page numbering, and document variables before export.

### choose export by downstream use {#tooltip-export-format}
Use `JSON` for editable project exchange, `PDF` for faithful vector output, `SVG` for frozen per-page geometry, and `IDML` for InDesign continuation.

PDF, SVG and IDML freeze typography as planned geometry in the normal vector path.

### shared vector bleed {#tooltip-export-bleed}
Bleed applies to PDF, SVG and IDML from one shared control.

It changes the export box and crop marks, not the page layout math.

### visible overlays are exported {#tooltip-export-visibility}
export follows current guide visibility.

Turn off construction guides before final output unless they are part of the deliverable.

### export progress {#tooltip-export-progress}
progress is informational. export continues from the committed page plan.

## common corrections

### if the page feels loose {#tooltip-fix-loose-page}
Return to baseline, margins, and grid rhythm before editing individual paragraphs.

Loose layouts usually need a clearer field, not more local styling.

### if text feels weak {#tooltip-fix-weak-type}
Check hierarchy, measure, leading, and baseline alignment before changing tracking.

Tracking changes paragraph color. It refines texture; it does not replace hierarchy.

### if content falls out of bounds {#tooltip-grid-reduction}
grid reductions are blocked when existing layers would fall outside the new field.

Resolve layer placement first, then reduce rows or columns.

### if editing feels slow {#tooltip-faster-editing}
Use paragraph zoom, keep one editor open, and retarget from paragraph to paragraph.

the most efficient workflow is staying in context while moving deliberately through the page.
