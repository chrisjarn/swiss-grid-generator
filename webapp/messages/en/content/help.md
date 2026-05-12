# Help

Edit this file to update the in-app help panel.

Format:
- `## group title` starts an index group.
- `### section title {#section-id}` starts a top-level section.
- Add `[noindex]` after the id to keep a section out of the index.
- `#### subsection title {#section-id}` starts a subsection.
- Use paragraphs and short bullets.
- Use `{{AVAILABLE_FONTS}}`, `{{SHORTCUT_TABLE}}`, and `{{DOCUMENT_VARIABLE_TOKENS}}` where needed.

## First sequence

### First sequence {#help-quick-start}
- Set ratio, orientation, and rotation in `canvas`.
- Set the baseline first. It governs the vertical rhythm.
- Choose a margin canon or custom baseline-unit frame.
- Define columns, rows, gutter, and grid rhythm.
- Set type rhythm and base family.
- Inspect baselines, margins, modules, typography, and placeholders before export.

## Settings

### Settings reference {#help-settings-overview} [noindex]
Core system controls.

### Canvas {#help-canvas-ratio}
- `ratio` sets page proportion.
- Custom ratio preserves A4-equivalent area before orientation is applied.
- `orientation` changes the axis.
- `rotation` turns the planned page without changing its geometry.

### Baseline {#help-baseline-grid}
- The baseline is the shared vertical unit.
- Type leading, margins, module height, and many movement steps depend on it.
- Choose the smallest rhythm that still gives the page calm.

### Margins {#help-margins}
- Margin methods express the content field in baseline units.
- Progressive gives a measured lower weight.
- Van de Graaf creates a classical asymmetric field.
- Baseline gives an equal frame.
- Custom margins should be used when the page needs a precise exception.

### Grid {#help-gutter}
- Columns and rows define the modular field.
- Gutter multiple sets the distance between modules in baseline units.
- Repetitive rhythm is the neutral control.
- Non-repetitive rhythms should strengthen proportion, not decorate the page.

### Typography {#help-typo}
- Base family sets the document default.
- Type rhythm controls the hierarchy scale.
- Fibonacci rhythm can Shift its sequence while remaining tied to the A4 body reference.
- Custom type belongs to individual paragraphs, not the global system.

### Color {#help-color-scheme}
- Base scheme defines the placeholder palette.
- Page ground is stored per page.
- Color is a signal. Use it sparingly.

## General guidance

### General guidance {#help-general-overview} [noindex]
Core editing and layout workflows.

### Preview workspace {#help-preview-workspace}
- The preview is the live layout surface for the active page.
- A loaded page appears only after its snapshot and first final page plan are ready.
- Double-click inside a module to add text.
- `Shift` + double-click adds an image placeholder.
- Hold `1..5` while double-clicking to set the new paragraph hierarchy: `1` caption, `2` body, `3` subhead, `4` headline, `5` display.
- Hover a layer to reveal edit access and placement guides.
- Hovered paragraphs and image placeholders show `>` controls and a bottom-right resize handle.
- Controls contain edit, duplicate, and delete. Paragraph controls also expose alignment, rotation, column reflow, hyphenation, column snap, and baseline snap. Image controls expose rotation, column snap, and baseline snap.
- Rotation sliders use 5 degree steps while dragging with `Shift`; `Alt/Option` + `Shift` snaps to signed Fibonacci degree stops.
- Drag to place, then nudge with arrow keys.
- Drag the bottom-right layer handle to resize paragraph or image placeholder rows and columns. `Shift` + drag adjusts height by baseline steps. The handle stays inside the layer frame.
- Preview visibility toggles also control export visibility.
- Locked layers show guides, but cannot be moved, edited, duplicated, deleted, or retargeted.
- `page up`, `page down`, `home`, and `end` navigate pages.
- Undo and redo cover settings, content, placement, duplication, deletion, and editor changes.

### Text editor {#help-editor}
- Open from the preview affordance or an unlocked text layer card.
- Retarget an open editor by selecting another unlocked paragraph.
- The left sidebar switches to `paragraph`, `typography`, `symbols`, `placeholders`, and `info`.
- Editor sections remember their open state within the current document.
- `Esc` or outside click exits edit mode.
- Inline editing follows the rendered line layout.

#### Paragraph section {#help-editor-paragraph}
- Set rows, baselines, columns, alignment, reflow, hyphenation, x/y snap, and rotation.
- Height is `rows + baselines`.
- `rows` may be `0` when `baselines` is greater than `0`.
- `rows`, `baselines`, and `cols` preview on hover before commit.
- Rotation uses 5 degree steps with `Shift`; `Alt/Option` + `Shift` snaps to signed Fibonacci degree stops.
- Drag the bottom-right paragraph handle to resize rows and columns. `Shift` + drag adjusts height by baseline steps. The handle stays inside the paragraph frame.
- Column snap locks x to column anchors.
- Baseline snap locks y to the editorial rhythm.

#### Typography section {#help-editor-typo}
- Set family, cut, hierarchy, color, kerning, tracking, and custom size or leading.
- Selecting `custom` seeds size and leading from the paragraph's resolved metrics.
- If text is selected, type and color controls apply to the selection.
- Font, cut, hierarchy, and scheme preview on hover before commit.

#### Symbols section {#help-editor-symbols}
- Insert typographic symbols at the caret or over the current selection.
- The palette includes arrows, bullets, marks, math, Greek lowercase, geometry, and editorial punctuation.
- Symbols export through `Noto Sans Symbols 2` for stable geometry.
- Recent symbols appear after first use.

#### Placeholders section {#help-editor-placeholders}
- Insert document-variable tokens at the caret or over the current selection.
- `<%lorem%>` fills the active frame using current geometry and reflow.
- `<%page%>` and `<%pages%>` use physical page counts. On facing spreads, the right side resolves to the next physical page number.
- Available tokens: {{DOCUMENT_VARIABLE_TOKENS}}.

#### Info section {#help-editor-info}
- Shows geometry, type summary, counts, and maximum line length.

### Image editor {#help-image-editor}
- `Shift` + double-click creates a new image placeholder.
- Open from the preview affordance or an unlocked image layer card.
- The left sidebar switches to `geometry`, `color`, and `info`.
- Editor sections remember their open state within the current document.
- `Esc` or outside click exits edit mode.

#### Geometry section {#help-image-editor-geometry}
- Set rows, baselines, columns, x/y snap, and rotation.
- Height is `rows + baselines`.
- `rows`, `baselines`, and `cols` preview on hover before commit.
- Hovered image placeholders expose `>` controls for edit, duplicate, delete, rotation, column snap, and baseline snap.
- Rotation uses 5 degree steps with `Shift`; `Alt/Option` + `Shift` snaps to signed Fibonacci degree stops.
- Drag the bottom-right image placeholder handle to resize rows and columns. `Shift` + drag adjusts height by baseline steps. The handle stays inside the placeholder frame.

#### Color section {#help-image-editor-color}
- Set scheme, swatch color, and transparency.

#### Info section {#help-image-editor-info}
- Shows geometry, snap state, rotation, scheme, color, and transparency.

### Drag and placement {#help-drag-placement}
- Drag respects each layer's x/y snap settings.
- With baseline snap on, normal drag uses module tops.
- Hold `Shift` during drag to move y by baseline rows.
- Unsnapped layers stay inside allowed placement bounds.
- With column snap off, layers may overhang by one column into the side margins.
- Selected layers can be moved with arrow keys. `Shift` increases unsnapped movement and switches snapped y to baseline steps.

### History and reflow {#help-history-reflow}
- Undo and redo cover settings, content, and placement.
- Reducing rows or columns never auto-repositions existing layers.
- If a grid reduction would push content out of bounds, the change is blocked.

### Save and load {#help-save-load}
- Save stores metadata, pages, settings, layers, and tours.
- `save to library` stores a compressed local archive.
- `import` restores JSON or `.swissgridgenerator`.
- Imported projects require the 2.0 `pages` schema.
- Positioned layers use logical anchors so layouts stay stable across grid changes.
- Supabase email-code auth is optional and used only for cloud sync.

### Export {#help-export}
- Export supports `JSON`, vector `PDF`, `SVG`, and `IDML`.
- Multi-page projects can export a range or explicit page selection.
- Export uses current guide visibility.
- `PDF`, `SVG`, and `IDML` consume the canonical page plan.
- Typography exports as shared glyph-outline geometry in the normal vector path.
- `JSON` exports an editable project document with metadata and layout state.
- Export metadata can be adjusted without changing the live project unless `JSON` is saved.
- Bleed is shared by `PDF`, `SVG`, and `IDML` and changes the export box, not the layout math.
- `Esc` closes the dialog when no export is running and cancels an active export at the next safe point.

### Project tours {#help-project-tours}
- A loaded project may include a guided tour overlay.
- Reopen closed tours from `open tour`.
- Steps can move between pages, highlight layers, open editors, jump to help topics, or wait for a layer selection.

### Layout tooltips {#help-layout-tooltips}
- Loading a preset or project opens a short workflow note at the bottom of the preview.
- `next` advances the sequence.
- When help is open, marked tooltip areas jump to their matching help topic on hover.

## Application controls

### Ux reference {#help-ux-overview} [noindex]
Global controls and panel behavior.

### Application controls {#help-application-controls-overview} [noindex]

### Header and sidebars {#help-sidebars-header}
- Header actions cover presets, import, save, export, undo, redo, paragraph zoom, display toggles, project, cloud account, and the more menu.
- The more menu contains light/dark mode, help, feedback, and legal notice.
- The project panel can be toggled with `Cmd/Ctrl+Shift+P`.

### Help navigation {#help-help-navigation}
- Open help, then hover marked targets.
- Markers cover header actions, settings panels, preview surface, editor sections, tooltip popup, and preset browser.
- Use the up arrow beside a help title to return to the index.

### Presets {#help-header-examples}
- Opens the preset browser.
- Bundled files are grouped into `presets` and `examples`.
- User files appear under `users` when local or cloud layouts exist.
- User storage is local to the browser unless cloud sync is active.
- Double-click a thumbnail to load it.
- `Esc` closes without loading.
- Shortcut: `Cmd/Ctrl+Shift+4`.

### Import {#help-header-load}
Imports JSON or `.swissgridgenerator`. Shortcut: `Cmd/Ctrl+O`.

### Save {#help-header-save}
Opens `save to library`, then stores the project in the local `users` library. The status dot is red when unsaved, orange when saved locally, and green only when signed in and cloud-synced. Shortcut: `Cmd/Ctrl+S`.

### Cloud account {#help-cloud-account}
- Opens the cloud account panel.
- The account dot is green only when signed in and fully synced.
- Email-code sign-in uses Supabase browser auth.
- Signed-in saved projects auto-save locally and sync when possible.
- Remote deletions apply locally when no newer unsynced local change exists.
- Failures are translated into rate-limit, permission, offline, session, and setup messages.

### Export {#help-header-export}
Opens export. Shortcut: `Cmd/Ctrl+Shift+E`.

### Undo {#help-header-undo}
Reverts the latest history step. Shortcut: `Cmd/Ctrl+Z`.

### Redo {#help-header-redo}
Reapplies an undone history step. Shortcut: `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`.

### Dark mode {#help-header-dark-mode}
Toggles light and dark UI. Shortcut: `Cmd/Ctrl+Shift+D`.

### Paragraph zoom {#help-header-smart-text-zoom}
Toggles zoom-to-paragraph during text editing.

### Baselines toggle {#help-header-baselines}
Shows baseline rhythm. Shortcut: `Cmd/Ctrl+Shift+B`.

### Margins toggle {#help-header-margins}
Shows margin frame. Shortcut: `Cmd/Ctrl+Shift+M`.

### Modules toggle {#help-header-modules}
Shows modular field and gutters. Shortcut: `Cmd/Ctrl+Shift+G`.

### Typography toggle {#help-header-typography}
Shows typography overlay. Shortcut: `Cmd/Ctrl+Shift+T`.

### Image placeholders toggle {#help-header-image-placeholders}
Shows image placeholders. Shortcut: `Cmd/Ctrl+Shift+J`.

### Project panel {#help-header-layers}
Shows project metadata, page order, and page layers. Shortcut: `Cmd/Ctrl+Shift+P`.

### Information toggle {#help-header-information}
Shows contextual help markers. Shortcut: `Cmd/Ctrl+Shift+I`.

## Reference

### Fonts {#help-reference-fonts}
{{AVAILABLE_FONTS}}

### Shortcuts {#help-reference-shortcuts}
{{SHORTCUT_TABLE}}
