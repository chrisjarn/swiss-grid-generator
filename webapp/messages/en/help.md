# Help

Edit this file to update the in-app Help panel.

Format:
- `## Group Title` starts an index group.
- `### Section Title {#section-id}` starts a top-level section.
- Add `[noindex]` after the id to keep a section out of the index.
- `#### Subsection Title {#section-id}` starts a subsection.
- Use `{{AVAILABLE_FONTS}}`, `{{SHORTCUT_TABLE}}`, and `{{DOCUMENT_VARIABLE_TOKENS}}` where needed.

## Quick Start

### Quick Start {#help-quick-start}
- Set `Canvas`: ratio, orientation, rotation.
- Set `Baseline`: vertical rhythm.
- Set `Margins`: page frame.
- Set `Grid`: columns, rows, gutters, rhythm.
- Set `Typography`: hierarchy and base family.
- Use header toggles to inspect structure.

## General Guidance

### Settings Reference {#help-settings-overview} [noindex]
Core page system controls.

### Canvas {#help-canvas-ratio}
- Ratio defines page proportion.
- Orientation swaps axes.
- Rotation turns the preview and export page.
- Custom ratio preserves A4-equivalent area.

### Baseline {#help-baseline-grid}
- Baseline sets vertical rhythm.
- Grid unit controls margins, modules, and leading.
- Larger units reduce available lines.

### Margins {#help-margins}
- Margin method defines page frame.
- Progressive, Van de Graaf, and Baseline are canon presets.
- Custom margins use baseline-unit sides.

### Grid {#help-gutter}
- Columns and rows define the modular field.
- Gutter multiple sets module separation.
- Rhythm distributes modules by equal, Fibonacci, golden, fourth, or fifth proportion.
- Direction controls non-repetitive rhythm flow.

### Typography {#help-typo}
- Base family sets default rendering.
- Rhythm sets type scale.
- Hierarchy remains the primary structure.
- `Custom` is paragraph-local.

### Color {#help-color-scheme}
- Base scheme defines placeholder color families.
- Background swatches set page ground per page.
- Active swatch click clears the ground.

### General Guidance {#help-general-overview} [noindex]
Core editing and layout workflows.

### Preview Workspace {#help-preview-workspace}
- The preview is the active page surface.
- Pages appear after the final page plan is ready.
- Double-click an empty module for text. `Shift` + double-click for image.
- Hold `1..5` while creating text: `1 Caption`, `2 Body`, `3 Subhead`, `4 Headline`, `5 Display`.
- New blocks clamp to the remaining field.
- Hover layers for edit access and guides.
- Drag to place. Arrow keys refine.
- `+` duplicates. `Shift` copies paragraph geometry. `Alt/Option` copies type. Both copy both.
- Visibility toggles control preview and export.
- Locked layers remain visible but fixed.
- Snapped axes move on grid. Unsnapped axes move in fine steps.
- `Page Up`, `Page Down`, `Home`, and `End` navigate pages.
- Undo and redo cover settings, placement, deletion, and editor changes.

### Text Editor {#help-editor}
- Open from preview or an unlocked text layer card.
- Select another unlocked paragraph to retarget.
- The sidebar becomes `Paragraph`, `Typography`, `Symbols`, `Placeholders`, `Info`.
- Section state is document-local.
- `Esc` or outside click exits.
- Double-click selects word. Triple-click selects sentence. Four clicks select paragraph.
- `Alt+A` or `Cmd/Ctrl+A` selects all.

#### Paragraph Section {#help-editor-paragraph}
- Set rows, baselines, columns, alignment, flow, snap, rotation.
- Frame height is `Rows + Baselines`.
- `Rows` may be `0` when `Baselines` is greater than `0`.
- `Rows`, `Baselines`, and `Cols` preview on rollover.
- `Snap to Columns (X)` locks column anchors.
- `Snap to Baseline (Y)` locks baseline rhythm.

#### Typography Section {#help-editor-typo}
- Set hierarchy, family, cut, color, kerning, tracking, custom size, leading.
- `Custom` starts from resolved paragraph metrics.
- Selection receives type and color changes.
- Family, cut, hierarchy, kerning, and scheme preview on rollover.

#### Symbols Section {#help-editor-symbols}
- Insert symbols at caret or selection.
- Groups: arrows, bullets, marks, math, Greek, geometry, editorial.
- Symbols export through `Noto Sans Symbols 2`.
- Recent symbols appear after first use.

#### Placeholders Section {#help-editor-placeholders}
- Insert document-variable tokens.
- `<%lorem%>` fills the active frame.
- `<%page%>` and `<%pages%>` use physical page counts.
- Available tokens: {{DOCUMENT_VARIABLE_TOKENS}}.

#### Info Section {#help-editor-info}
Geometry, type summary, counts, line capacity.

### Image Editor {#help-image-editor}
- `Shift` + double-click an empty module creates an image placeholder.
- Open from preview or an unlocked image layer card.
- The sidebar becomes `Geometry`, `Color`, `Info`.
- Section state is document-local.
- `Esc` or outside click exits.
- Double-click another unlocked image card to retarget.

#### Geometry Section {#help-image-editor-geometry}
- Set rows, baselines, columns, snap, rotation.
- Frame height is `Rows + Baselines`.
- `Rows`, `Baselines`, and `Cols` preview on rollover.

#### Color Section {#help-image-editor-color}
Scheme, swatch, transparency.

#### Info Section {#help-image-editor-info}
Geometry, snap, rotation, scheme, color, transparency.

### Drag and Placement {#help-drag-placement}
- Drag follows X and Y snap.
- Baseline snap uses module tops.
- `Shift` drag moves Y by baseline rows.
- Unsnapped layers stay within bounds.
- Column snap off allows one-column side overhang.
- Cursor keys move selected layers. `Shift` increases step.

### History and Reflow {#help-history-reflow}
- Undo and redo cover settings, content, placement.
- Grid reduction never moves layers silently.
- Out-of-bounds content blocks reduction.

### Save and Load {#help-save-load}
- Save stores metadata, pages, settings, layers, tours.
- `Save to library` stores a compressed local archive.
- `Import` restores JSON or `.swissgridgenerator`.
- Imported projects require the 2.0 `pages` schema.
- Logical anchors keep layouts stable across grid changes.
- Supabase auth is only for cloud sync.

### Export {#help-export}
- Formats: JSON, PDF, SVG, IDML.
- Multi-page projects export ranges or explicit pages.
- Export uses project guide visibility.
- PDF, SVG, and IDML are vector exports from the shared page plan.
- Text exports as frozen outline geometry.
- Workers keep long exports responsive where supported.
- SVG and IDML can reuse exact-request page artifacts.
- JSON remains editable.
- Export metadata does not alter the live project unless JSON is saved.
- Metadata is written to PDF, SVG, and IDML where supported.
- One bleed control defines trim, bleed, media, origin, crop marks, guides.
- PDF uses RGB vector geometry with sRGB output intent.
- Multi-page SVG exports a ZIP.
- IDML separates guide, typography, and placeholder layers.
- `Esc` closes or cancels.

### Project Tours {#help-project-tours}
- Projects may include a guided tour.
- Reopen closed tours from `Open tour`.
- Steps can change pages, highlight layers, open editors, open help, or wait for a layer click.

### Layout Tooltips {#help-layout-tooltips}
- Presets and projects may open workflow tips.
- `Next` advances the sequence.
- Help hover connects tips to reference sections.

## Application Controls

### UX Reference {#help-ux-overview} [noindex]
Global controls and panel behavior.

### Application Controls {#help-application-controls-overview} [noindex]

### Header and Sidebars {#help-sidebars-header}
- Header: presets, import, save, export, undo, redo, zoom, visibility, Project, account, more.
- More: theme, Help, Feedback, Legal.
- Project panel: `Cmd/Ctrl+Shift+P`.

### Help Navigation {#help-help-navigation}
- Open Help, then hover marked targets.
- Header, settings, editor sections, preview, and presets are covered.
- Up-arrow returns to index.

### Presets {#help-header-examples}
- Opens preset browser.
- Groups: `Presets`, `Examples`, `Users`.
- `Users` appears when saved layouts exist.
- The info marker covers local storage, data clearing, cloud sync.
- Hover shows metadata.
- Green dot means signed in and synced.
- Delete confirms, removes locally, then reports cloud state.
- Double-click loads.
- `Esc` closes.
- Shortcut: `Cmd/Ctrl+Shift+4`.

### Import {#help-header-load}
Imports JSON or `.swissgridgenerator`. Shortcut: `Cmd/Ctrl+O`.

### Save {#help-header-save}
Stores the project in `Users`. Red dot: unsaved. Orange: local. Green: cloud-synced. Shortcut: `Cmd/Ctrl+S`.

### Cloud Account {#help-cloud-account}
- Opens cloud account.
- Green dot means signed in and synced.
- Sign-in uses Supabase email code.
- `Cloud state` shows local account and sync events.
- `Sync now` runs manual sync.
- Saved projects auto-save locally and sync when possible.
- Remote deletions apply locally unless local changes are newer.
- Conflicts require source selection.
- Failures use translated status messages.
- Hidden or closed tabs attempt local autosave and cloud sync.

### Export {#help-header-export}
Opens export. Shortcut: `Cmd/Ctrl+Shift+E`.

### Undo {#help-header-undo}
Reverts one step. Shortcut: `Cmd/Ctrl+Z`.

### Redo {#help-header-redo}
Reapplies one step. Shortcut: `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`.

### Dark Mode {#help-header-dark-mode}
Toggles light and dark UI. Shortcut: `Cmd/Ctrl+Shift+D`.

### Paragraph Zoom {#help-header-smart-text-zoom}
Toggles zoom-to-paragraph during text editing.

### Baselines Toggle {#help-header-baselines}
Shows baseline rhythm. Shortcut: `Cmd/Ctrl+Shift+B`.

### Margins Toggle {#help-header-margins}
Shows margin frame. Shortcut: `Cmd/Ctrl+Shift+M`.

### Modules Toggle {#help-header-modules}
Shows modular field and gutters. Shortcut: `Cmd/Ctrl+Shift+G`.

### Typography Toggle {#help-header-typography}
Shows typography overlay. Shortcut: `Cmd/Ctrl+Shift+T`.

### Image Placeholders Toggle {#help-header-image-placeholders}
Shows image placeholders. Shortcut: `Cmd/Ctrl+Shift+J`.

### Project Panel {#help-header-layers}
- Metadata, page order, layers.
- `i` toggles document data.
- Double-click project title to edit metadata.
- Page header returns to page list.
- Page counter shows physical page position. Double-click jumps.
- Click page row to activate. Double-click opens layers.
- `Page Up`, `Page Down`, `Home`, `End` navigate.
- Drag page rows to reorder.
- Rename and delete controls sit in each row.
- Last page cannot be deleted.
- `Facing pages` creates one spread record.
- `+` adds a page. `Shift` + `+` duplicates content.
- Maximum: `1000` pages.
- Layer cards mirror preview hover.
- Drag unlocked layer cards to reorder z-index.
- Lock and delete controls sit in each card.
- Double-click unlocked card to open or retarget editor.
