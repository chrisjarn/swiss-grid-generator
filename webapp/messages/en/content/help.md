# help

edit this file to update the in-app help panel.

format:
- `## group title` starts an index group.
- `### section title {#section-id}` starts a top-level section.
- add `[noindex]` after the id to keep a section out of the index.
- `#### subsection title {#section-id}` starts a subsection.
- use paragraphs and short bullets.
- use `{{AVAILABLE_FONTS}}`, `{{SHORTCUT_TABLE}}`, and `{{DOCUMENT_VARIABLE_TOKENS}}` where needed.

## first sequence

### first sequence {#help-quick-start}
- set ratio, orientation, and rotation in `canvas`.
- set the baseline first. it governs the vertical rhythm.
- choose a margin canon or custom baseline-unit frame.
- define columns, rows, gutter, and grid rhythm.
- set type rhythm and base family.
- inspect baselines, margins, modules, typography, and placeholders before export.

## settings

### settings reference {#help-settings-overview} [noindex]
core system controls.

### canvas {#help-canvas-ratio}
- `ratio` sets page proportion.
- custom ratio preserves a4-equivalent area before orientation is applied.
- `orientation` changes the axis.
- `rotation` turns the planned page without changing its geometry.

### baseline {#help-baseline-grid}
- the baseline is the shared vertical unit.
- type leading, margins, module height, and many movement steps depend on it.
- choose the smallest rhythm that still gives the page calm.

### margins {#help-margins}
- margin methods express the content field in baseline units.
- progressive gives a measured lower weight.
- van de Graaf creates a classical asymmetric field.
- baseline gives an equal frame.
- custom margins should be used when the page needs a precise exception.

### grid {#help-gutter}
- columns and rows define the modular field.
- gutter multiple sets the distance between modules in baseline units.
- repetitive rhythm is the neutral control.
- non-repetitive rhythms should strengthen proportion, not decorate the page.

### typography {#help-typo}
- base family sets the document default.
- type rhythm controls the hierarchy scale.
- fibonacci rhythm can shift its sequence while remaining tied to the a4 body reference.
- custom type belongs to individual paragraphs, not the global system.

### color {#help-color-scheme}
- base scheme defines the placeholder palette.
- page ground is stored per page.
- color is a signal. use it sparingly.

## general guidance

### general guidance {#help-general-overview} [noindex]
core editing and layout workflows.

### preview workspace {#help-preview-workspace}
- the preview is the live layout surface for the active page.
- a loaded page appears only after its snapshot and first final page plan are ready.
- double-click inside a module to add text.
- `shift` + double-click adds an image placeholder.
- hold `1..5` while double-clicking to set the new paragraph hierarchy: `1` caption, `2` body, `3` subhead, `4` headline, `5` display.
- hover a layer to reveal edit access and placement guides.
- drag to place, then nudge with arrow keys.
- preview visibility toggles also control export visibility.
- locked layers show guides, but cannot be moved, edited, duplicated, deleted, or retargeted.
- `page up`, `page down`, `home`, and `end` navigate pages.
- undo and redo cover settings, content, placement, duplication, deletion, and editor changes.

### text editor {#help-editor}
- open from the preview affordance or an unlocked text layer card.
- retarget an open editor by selecting another unlocked paragraph.
- the left sidebar switches to `paragraph`, `typography`, `symbols`, `placeholders`, and `info`.
- editor sections remember their open state within the current document.
- `esc` or outside click exits edit mode.
- inline editing follows the rendered line layout.

#### paragraph section {#help-editor-paragraph}
- set rows, baselines, columns, alignment, reflow, hyphenation, x/y snap, and rotation.
- height is `rows + baselines`.
- `rows` may be `0` when `baselines` is greater than `0`.
- `rows`, `baselines`, and `cols` preview on hover before commit.
- column snap locks x to column anchors.
- baseline snap locks y to the editorial rhythm.

#### typography section {#help-editor-typo}
- set family, cut, hierarchy, color, kerning, tracking, and custom size or leading.
- selecting `custom` seeds size and leading from the paragraph's resolved metrics.
- if text is selected, type and color controls apply to the selection.
- font, cut, hierarchy, and scheme preview on hover before commit.

#### symbols section {#help-editor-symbols}
- insert typographic symbols at the caret or over the current selection.
- the palette includes arrows, bullets, marks, math, greek lowercase, geometry, and editorial punctuation.
- symbols export through `Noto Sans Symbols 2` for stable geometry.
- recent symbols appear after first use.

#### placeholders section {#help-editor-placeholders}
- insert document-variable tokens at the caret or over the current selection.
- `<%lorem%>` fills the active frame using current geometry and reflow.
- `<%page%>` and `<%pages%>` use physical page counts. on facing spreads, the right side resolves to the next physical page number.
- available tokens: {{DOCUMENT_VARIABLE_TOKENS}}.

#### info section {#help-editor-info}
- shows geometry, type summary, counts, and maximum line length.

### image editor {#help-image-editor}
- `shift` + double-click creates a new image placeholder.
- open from the preview affordance or an unlocked image layer card.
- the left sidebar switches to `geometry`, `color`, and `info`.
- editor sections remember their open state within the current document.
- `esc` or outside click exits edit mode.

#### geometry section {#help-image-editor-geometry}
- set rows, baselines, columns, x/y snap, and rotation.
- height is `rows + baselines`.
- `rows`, `baselines`, and `cols` preview on hover before commit.

#### color section {#help-image-editor-color}
- set scheme, swatch color, and transparency.

#### info section {#help-image-editor-info}
- shows geometry, snap state, rotation, scheme, color, and transparency.

### drag and placement {#help-drag-placement}
- drag respects each layer's x/y snap settings.
- with baseline snap on, normal drag uses module tops.
- hold `shift` during drag to move y by baseline rows.
- unsnapped layers stay inside allowed placement bounds.
- with column snap off, layers may overhang by one column into the side margins.
- selected layers can be moved with arrow keys. `shift` increases unsnapped movement and switches snapped y to baseline steps.

### history and reflow {#help-history-reflow}
- undo and redo cover settings, content, and placement.
- reducing rows or columns never auto-repositions existing layers.
- if a grid reduction would push content out of bounds, the change is blocked.

### save and load {#help-save-load}
- save stores metadata, pages, settings, layers, and tours.
- `save to library` stores a compressed local archive.
- `import` restores json or `.swissgridgenerator`.
- imported projects require the 2.0 `pages` schema.
- positioned layers use logical anchors so layouts stay stable across grid changes.
- supabase email-code auth is optional and used only for cloud sync.

### export {#help-export}
- export supports `JSON`, vector `PDF`, `SVG`, and `IDML`.
- multi-page projects can export a range or explicit page selection.
- export uses current guide visibility.
- `PDF`, `SVG`, and `IDML` consume the canonical page plan.
- typography exports as shared glyph-outline geometry in the normal vector path.
- `JSON` exports an editable project document with metadata and layout state.
- export metadata can be adjusted without changing the live project unless `JSON` is saved.
- bleed is shared by `PDF`, `SVG`, and `IDML` and changes the export box, not the layout math.
- `esc` closes the dialog when no export is running and cancels an active export at the next safe point.

### project tours {#help-project-tours}
- a loaded project may include a guided tour overlay.
- reopen closed tours from `open tour`.
- steps can move between pages, highlight layers, open editors, jump to help topics, or wait for a layer selection.

### layout tooltips {#help-layout-tooltips}
- loading a preset or project opens a short workflow note at the bottom of the preview.
- `next` advances the sequence.
- when help is open, marked tooltip areas jump to their matching help topic on hover.

## application controls

### ux reference {#help-ux-overview} [noindex]
global controls and panel behavior.

### application controls {#help-application-controls-overview} [noindex]

### header and sidebars {#help-sidebars-header}
- header actions cover presets, import, save, export, undo, redo, paragraph zoom, display toggles, project, cloud account, and the more menu.
- the more menu contains light/dark mode, help, feedback, and legal notice.
- the project panel can be toggled with `cmd/ctrl+shift+p`.

### help navigation {#help-help-navigation}
- open help, then hover marked targets.
- markers cover header actions, settings panels, preview surface, editor sections, tooltip popup, and preset browser.
- use the up arrow beside a help title to return to the index.

### presets {#help-header-examples}
- opens the preset browser.
- bundled files are grouped into `presets` and `examples`.
- user files appear under `users` when local or cloud layouts exist.
- user storage is local to the browser unless cloud sync is active.
- double-click a thumbnail to load it.
- `esc` closes without loading.
- shortcut: `cmd/ctrl+shift+4`.

### import {#help-header-load}
imports json or `.swissgridgenerator`. shortcut: `cmd/ctrl+o`.

### save {#help-header-save}
opens `save to library`, then stores the project in the local `users` library. the status dot is red when unsaved, orange when saved locally, and green only when signed in and cloud-synced. shortcut: `cmd/ctrl+s`.

### cloud account {#help-cloud-account}
- opens the cloud account panel.
- the account dot is green only when signed in and fully synced.
- email-code sign-in uses supabase browser auth.
- signed-in saved projects auto-save locally and sync when possible.
- remote deletions apply locally when no newer unsynced local change exists.
- failures are translated into rate-limit, permission, offline, session, and setup messages.

### export {#help-header-export}
opens export. shortcut: `cmd/ctrl+shift+e`.

### undo {#help-header-undo}
reverts the latest history step. shortcut: `cmd/ctrl+z`.

### redo {#help-header-redo}
reapplies an undone history step. shortcut: `cmd/ctrl+shift+z` or `cmd/ctrl+y`.

### dark mode {#help-header-dark-mode}
toggles light and dark ui. shortcut: `cmd/ctrl+shift+d`.

### paragraph zoom {#help-header-smart-text-zoom}
toggles zoom-to-paragraph during text editing.

### baselines toggle {#help-header-baselines}
shows baseline rhythm. shortcut: `cmd/ctrl+shift+b`.

### margins toggle {#help-header-margins}
shows margin frame. shortcut: `cmd/ctrl+shift+m`.

### modules toggle {#help-header-modules}
shows modular field and gutters. shortcut: `cmd/ctrl+shift+g`.

### typography toggle {#help-header-typography}
shows typography overlay. shortcut: `cmd/ctrl+shift+t`.

### image placeholders toggle {#help-header-image-placeholders}
shows image placeholders. shortcut: `cmd/ctrl+shift+j`.

### project panel {#help-header-layers}
shows project metadata, page order, and page layers. shortcut: `cmd/ctrl+shift+p`.

### information toggle {#help-header-information}
shows contextual help markers. shortcut: `cmd/ctrl+shift+i`.

## reference

### fonts {#help-reference-fonts}
{{AVAILABLE_FONTS}}

### shortcuts {#help-reference-shortcuts}
{{SHORTCUT_TABLE}}
