# tooltips

tooltip copy for the in-app layout guidance shown at the bottom of the preview.

format:
- `## group title` starts a tooltip group.
- `### tooltip topic {#tooltip-id}` starts a tooltip topic.
- keep each note short, practical, and tied to a compositional decision.

## working order

### start with the page system {#tooltip-start-with-system}
set canvas, baseline, margins, modular field, rhythm, type scale, and base family before placing many layers.

if the page feels unresolved, adjust the system first. local paragraph changes are useful only after the field is stable.

### structure before styling {#tooltip-structure-before-styling}
use `rows`, `baselines`, and `cols` to define the text frame before refining wording, tracking, or color.

the frame is the editorial decision. styling should clarify it, not compensate for it.

### use repetitive as a control {#tooltip-repetitive-reference}
judge the page first in `repetitive` rhythm. it gives the clearest reading of margins, baseline, hierarchy, and measure.

use fibonacci, golden ratio, perfect fourth, or perfect fifth only when asymmetry strengthens the field.

## creating content

### create text on the grid {#tooltip-create-text}
double-click inside a module to create a paragraph where the structure suggests it belongs.

the block starts on the clicked module, with hyphenation off, and clamps to the available columns.

### choose hierarchy while creating {#tooltip-create-hierarchy}
hold `1..5` while double-clicking to assign hierarchy immediately.

`1` caption, `2` body, `3` subhead, `4` headline, `5` display. the initial measure follows the role and the remaining column field.

### place image placeholders deliberately {#tooltip-create-image}
use `shift` + double-click on an empty module to create an image placeholder.

placeholders share the same snap, span, baseline height, and rotation discipline as text.

### use lorem as a frame test {#tooltip-lorem-frame-test}
insert `<%lorem%>` to test whether a paragraph frame can carry the intended density.

the token fills the active frame using current rows, baselines, columns, reflow, and hyphenation.

## moving and duplicating

### drag for placement, nudge for decision {#tooltip-drag-and-nudge}
drag to establish position. use cursor keys for final placement.

nudging follows the same logical grid model as dragging, so movement stays tied to the page system.

### nudge with the grid {#tooltip-cursor-nudge}
with snapped axes enabled, arrow keys move the selected unlocked layer by columns and module rows.

hold `shift` to move snapped y by baseline rows. on unsnapped axes, `shift` increases the fine step.

### duplicate without losing rhythm {#tooltip-duplicate-layer}
use the visible `+` control for duplication and transfer.

for text, `+` duplicates the paragraph. `shift` copies paragraph settings, `alt/option` copies typography, and `alt/option` + `shift` copies both. image placeholders duplicate directly.

### free placement is an exception {#tooltip-free-placement}
turn off column or baseline snap only for a controlled optical exception.

free x placement can create a disciplined side-margin overhang. it is not for casual drift.

## editing flow

### paragraph zoom keeps work local {#tooltip-smart-text-zoom}
keep paragraph zoom on for text-heavy pages.

entering text edit focuses the active paragraph. text and style edits keep the view stable. frame changes refit the paragraph.

### retarget paragraph to paragraph {#tooltip-turbo-edit}
with an editor open, select another unlocked preview paragraph to retarget immediately.

use this to move through a page without repeatedly closing the editor.

### retarget from layer cards {#tooltip-layer-card-retarget}
double-click an unlocked layer card in the project panel to open or retarget its editor.

single-click still selects the layer for nudging and ordering.

### edit the rendered text {#tooltip-rendered-text-editing}
inline editing follows the rendered line layout.

double-click selects a word, triple-click selects a sentence, and `alt+a` or `cmd/ctrl+a` selects the paragraph.

### keep tokens visible while editing {#tooltip-placeholder-editing}
document variables stay visible as raw tokens while editing and render as live values outside edit mode.

use them for folios, project titles, dates, times, and proof text with predictable control.

## paragraph geometry

### height is rows plus baselines {#tooltip-rows-plus-baselines}
paragraph and image heights are built from `rows + baselines`.

use full rows for modular blocks and baseline-only height for captions, folios, and shallow editorial frames.

### set columns before reflow {#tooltip-columns-before-reflow}
choose `cols` before judging paragraph flow.

a weak line length is usually a measure problem. reflow and hyphenation work best after the measure is correct.

### align inside the frame {#tooltip-frame-alignment}
alignment positions text inside the configured frame.

use it as a compositional decision within a clear frame, not as a repair.

### use custom type sparingly {#tooltip-custom-type}
when first selected, `custom` copies the paragraph's resolved size and leading.

treat custom type as a local editorial exception after the hierarchy is clear.

## layers and pages

### select before nudging {#tooltip-select-before-nudge}
single-click a layer card to select it, then use arrow keys to nudge.

this keeps positional edits precise and avoids entering edit mode by accident.

### lock resolved layers {#tooltip-lock-finished-layers}
lock layers once their position and role are resolved.

locked layers still show rollover guides, but cannot be moved, edited, duplicated, deleted, or retargeted until unlocked.

### use page rows for document rhythm {#tooltip-page-cards}
use the `page` header or list icon to return from a layer stack to the page list.

page order is part of the design. treat it with the same discipline as modular field and hierarchy.

### use facing pages only for spreads {#tooltip-facing-pages}
use `facing pages` only when two physical pages need one continuous editorial field.

a facing spread doubles the column field, mirrors inner and outer margins, and affects physical page variables.

## preview discipline

### toggle guides while judging {#tooltip-preview-guides}
use the header toggles to inspect baselines, margins, modules, typography, and image placeholders.

judge the same layout with and without construction lines. the rhythm should remain visible after the guides disappear.

### rollover guides show the frame {#tooltip-rollover-guides}
hover a layer to see its edit access and placement guides.

paragraph guides follow the configured `rows + baselines` frame, not only the visible text bounds.

### help hover is contextual {#tooltip-help-hover}
open help and hover marked areas for the matching reference.

## export readiness

### export after the system is stable {#tooltip-export-readiness}
export should confirm a resolved layout, not repair it.

check page order, page range, visible guide toggles, rotation, page numbering, and document variables before export.

### choose export by downstream use {#tooltip-export-format}
use `JSON` for editable project exchange, `PDF` for faithful vector output, `SVG` for frozen per-page geometry, and `IDML` for InDesign continuation.

the normal vector path freezes typography as planned geometry for `PDF`, `SVG`, and `IDML`.

### shared vector bleed {#tooltip-export-bleed}
bleed applies to `PDF`, `SVG`, and `IDML` from one shared control.

it changes the export box and crop marks, not the page layout math.

### visible overlays are exported {#tooltip-export-visibility}
export follows current guide visibility.

turn off construction guides before final output unless they are part of the deliverable.

### export progress {#tooltip-export-progress}
progress is informational. export continues from the committed page plan.

## common corrections

### if the page feels loose {#tooltip-fix-loose-page}
return to baseline, margins, and grid rhythm before editing individual paragraphs.

loose layouts usually need a clearer field, not more local styling.

### if text feels weak {#tooltip-fix-weak-type}
check hierarchy, measure, leading, and baseline alignment before changing tracking.

tracking changes paragraph color. it refines texture; it does not replace hierarchy.

### if content falls out of bounds {#tooltip-grid-reduction}
grid reductions are blocked when existing layers would fall outside the new field.

resolve layer placement first, then reduce rows or columns.

### if editing feels slow {#tooltip-faster-editing}
use paragraph zoom, keep one editor open, and retarget from paragraph to paragraph.

the most efficient workflow is staying in context while moving deliberately through the page.
