# Swiss Grid Generator Documentation

Swiss Grid Generator is a precision tool for building editorial layouts from a visible system: ratio, baseline, margins, modular field, hierarchy, and export.

This document is the canonical user documentation source for the static documentation website. It contains the quickstart guide, tooltip guide, and feature inventory. The generated `/docs` site also includes GUI and performance documentation.

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

Double-click an empty module to create a text paragraph. Hold `Shift` while double-clicking to create and select an image placeholder. Hold `1..4` with `Shift` to choose a swatch from the active base scheme.

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
| Copy layout to clipboard | `Shift+J` |
| Toggle project panel | `Cmd/Ctrl+Shift+P` |
| Toggle presentation mode | `Tab` or `Shift+P` |
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

<!-- tooltip-source:start -->

## Tooltip Guide

Tooltip copy for the in-app layout guidance shown at the bottom of the preview.

Format:
- `### group title` starts a tooltip group.
- `#### tooltip topic {#tooltip-id}` starts a tooltip topic.
- Keep each note short, practical, and tied to a compositional decision.

### Working order

#### Start with the page system {#tooltip-start-with-system}
Set canvas, baseline, margins, modular field, rhythm, type scale, and base family before placing many layers.

If the page feels unresolved, adjust the system first. Local paragraph changes are useful only after the field is stable.

#### Structure before styling {#tooltip-structure-before-styling}
Use `rows`, `baselines`, and `cols` to define the text frame before refining wording, tracking, or color.

The frame is the editorial decision. Styling should clarify it, not compensate for it.

#### Use repetitive as a control {#tooltip-repetitive-reference}
Judge the page first in `repetitive` rhythm. It gives the clearest reading of margins, baseline, hierarchy, and measure.

Use Fibonacci, golden ratio, perfect fourth, or perfect fifth only when asymmetry strengthens the field.

### Creating content

#### Create text on the grid {#tooltip-create-text}
Double-click inside a module to create a paragraph where the structure suggests it belongs.

The block starts on the clicked module, with hyphenation off, and clamps to the available columns.

#### Choose hierarchy while creating {#tooltip-create-hierarchy}
Hold `1..5` while double-clicking to assign hierarchy immediately.

`1` caption, `2` body, `3` subhead, `4` headline, `5` display. The initial measure follows the role and the remaining column field.

#### Place image placeholders deliberately {#tooltip-create-image}
Use `Shift` + double-click on an empty module to create and select an image placeholder. Hold `1..4` with `Shift` to assign the active base-scheme swatch while creating it.

Placeholders share the same snap, span, baseline height, and rotation discipline as text.

#### Use lorem as a frame test {#tooltip-lorem-frame-test}
Insert `<%lorem%>` to test whether a paragraph frame can carry the intended density.

The token fills the active frame using current rows, baselines, columns, reflow, and hyphenation.

### Moving and duplicating

#### Drag for placement, nudge for decision {#tooltip-drag-and-nudge}
Drag to establish position. Use cursor keys for final placement.

Nudging follows the same logical grid model as dragging, so movement stays tied to the page system.

#### Nudge with the grid {#tooltip-cursor-nudge}
With snapped axes enabled, arrow keys move the selected unlocked layer by columns and module rows.

Hold `Shift` to move snapped y by baseline rows. On unsnapped axes, `Shift` increases the fine step.

#### Duplicate without losing rhythm {#tooltip-duplicate-layer}
Use the `>` rollover controls for duplication and transfer.

For text, duplicate starts the same placement path as dragging. `Shift` copies paragraph settings, `Alt/Option` copies typography, and `Alt/Option` + `Shift` copies both. Image placeholders duplicate directly.

#### Free placement is an exception {#tooltip-free-placement}
Turn off column or baseline snap only for a controlled optical exception.

Free x placement can create a disciplined side-margin overhang. It is not for casual drift.

### Editing flow

#### Paragraph zoom keeps work local {#tooltip-smart-text-zoom}
Keep paragraph zoom on for text-heavy pages.

Entering text edit focuses the active paragraph. Text and style edits keep the view stable. Frame changes refit the paragraph.

#### Retarget paragraph to paragraph {#tooltip-turbo-edit}
With an editor open, select another unlocked preview paragraph to retarget immediately.

Use this to move through a page without repeatedly closing the editor.

#### Retarget from layer cards {#tooltip-layer-card-retarget}
Double-click an unlocked layer card in the project panel to open or retarget its editor.

Single-click still selects the layer for nudging and ordering.

#### Edit the rendered text {#tooltip-rendered-text-editing}
Inline editing follows the rendered line layout.

Double-click selects a word, triple-click selects a sentence, and `alt+a` or `Cmd/Ctrl+A` selects the paragraph.

#### Keep tokens visible while editing {#tooltip-placeholder-editing}
Document variables stay visible as raw tokens while editing and render as live values outside edit mode.

Use them for folios, project titles, dates, times, and proof text with predictable control.

### Paragraph geometry

#### Height is rows plus baselines {#tooltip-rows-plus-baselines}
Paragraph and image heights are built from `rows + baselines`.

Use full rows for modular blocks and baseline-only height for captions, folios, and shallow editorial frames.

#### Set columns before reflow {#tooltip-columns-before-reflow}
Choose `cols` before judging paragraph flow.

A weak line length is usually a measure problem. Reflow and hyphenation work best after the measure is correct.

#### Align inside the frame {#tooltip-frame-alignment}
Alignment positions text inside the configured frame.

Use it as a compositional decision within a clear frame, not as a repair.

#### Use custom type sparingly {#tooltip-custom-type}
When first selected, `custom` copies the paragraph's resolved size and leading.

Treat custom type as a local editorial exception after the hierarchy is clear.

### Layers and pages

#### Select before nudging {#tooltip-select-before-nudge}
Single-click a layer card to select it, then use arrow keys to nudge.

This keeps positional edits precise and avoids entering edit mode by accident.

#### Lock resolved layers {#tooltip-lock-finished-layers}
Lock layers once their position and role are resolved.

Locked layers still show rollover guides, but cannot be moved, edited, duplicated, deleted, or retargeted until unlocked.

#### Use page rows for document rhythm {#tooltip-page-cards}
Use the `page` header or list icon to return from a layer stack to the page list.

Page order is part of the design. Treat it with the same discipline as modular field and hierarchy.

#### Use facing pages only for spreads {#tooltip-facing-pages}
Use `facing pages` only when two physical pages need one continuous editorial field.

A facing spread doubles the column field, mirrors inner and outer margins, and affects physical page variables.

### Preview discipline

#### Toggle guides while judging {#tooltip-preview-guides}
Use the header toggles to inspect baselines, margins, modules, typography, and image placeholders.

Judge the same layout with and without construction lines. The rhythm should remain visible after the guides disappear.

#### Rollover guides show the frame {#tooltip-rollover-guides}
Hover a layer to see its edit access and placement guides.

Paragraph guides follow the configured `rows + baselines` frame, not only the visible text bounds.

#### Documentation stays external {#tooltip-documentation-link}
Use the documentation link for the full reference. Keep the canvas focused on the layout.

### Export readiness

#### Export after the system is stable {#tooltip-export-readiness}
Export should confirm a resolved layout, not repair it.

Check page order, page range, visible guide toggles, rotation, page numbering, and document variables before export.

#### Choose export by downstream use {#tooltip-export-format}
Use `JSON` for editable project exchange, `PDF` for faithful vector output, `SVG` for frozen per-page geometry, and `IDML` for InDesign continuation.

The normal vector path freezes typography as planned geometry for `PDF`, `SVG`, and `IDML`.

#### Shared vector bleed {#tooltip-export-bleed}
Bleed applies to `PDF`, `SVG`, and `IDML` from one shared control.

It changes the export box and crop marks, not the page layout math.

#### Visible overlays are exported {#tooltip-export-visibility}
Export follows current guide visibility.

Turn off construction guides before final output unless they are part of the deliverable.

#### Export progress {#tooltip-export-progress}
Progress is informational. Export continues from the committed page plan.

### Common corrections

#### If the page feels loose {#tooltip-fix-loose-page}
Return to baseline, margins, and grid rhythm before editing individual paragraphs.

Loose layouts usually need a clearer field, not more local styling.

#### If text feels weak {#tooltip-fix-weak-type}
Check hierarchy, measure, leading, and baseline alignment before changing tracking.

Tracking changes paragraph color. It refines texture; it does not replace hierarchy.

#### If content falls out of bounds {#tooltip-grid-reduction}
Grid reductions are blocked when existing layers would fall outside the new field.

Resolve layer placement first, then reduce rows or columns.

#### If editing feels slow {#tooltip-faster-editing}
Use paragraph zoom, keep one editor open, and retarget from paragraph to paragraph.

The most efficient workflow is staying in context while moving deliberately through the page.

### Header controls

#### Preset browser {#tooltip-header-presets}
Opens the preset browser. Presets replace the active project state, so review the thumbnail and metadata before loading a different system.

#### Import project {#tooltip-header-import}
Loads a saved Swiss Grid Generator project file. The imported project becomes the active document and should be checked against the preview before export.

#### Save to library {#tooltip-header-save}
Stores the current document in the local library. The status dot reports whether the document can be stored and whether the library copy needs attention.

#### Export dialog {#tooltip-header-export}
Opens export preparation. Use it after the layout, guides, visibility, metadata, and page range have been checked.

#### History actions {#tooltip-header-history}
Undo and redo restore authored document states. They are intentionally disabled when no matching state exists.

#### Guide visibility {#tooltip-header-guide-visibility}
Toggles the preview guide layers. These controls affect the editing surface and export options, but they do not change the planned grid geometry.

#### Project panel {#tooltip-header-project-panel}
Shows the page and layer panels. Use it to inspect page order, facing-page state, and the active layer list.

#### Account panel {#tooltip-header-account}
Shows account and cloud status. The status dot reports whether library sync is connected, pending, or blocked.

#### Support menu {#tooltip-header-support-menu}
Collects secondary workspace actions: hover info, display mode, clipboard layout transfer, documentation, feedback, and legal text.

### Settings controls

#### Canvas settings {#tooltip-settings-canvas}
Defines the document format, ratio, orientation, and rotation. These values set the page box consumed by preview and export.

#### Baseline settings {#tooltip-settings-baseline}
Defines the baseline unit for the system. Text rhythm, rows, and many snap decisions depend on this value.

#### Margin settings {#tooltip-settings-margins}
Defines the active page frame. Margin method changes affect the available composition area before layers are placed.

#### Grid settings {#tooltip-settings-grid}
Defines rows, columns, gutters, and rhythm. The grid is structural; layer placement and export geometry consume the resulting plan.

#### Typography settings {#tooltip-settings-typography}
Defines the global typographic scale and base family. Paragraph defaults inherit from these values unless a selected layer overrides them.

#### Color settings {#tooltip-settings-color}
Defines the page ground and active palette. Color choices affect preview, exported graphics, and editor swatches.

#### Custom ratio fields {#tooltip-control-custom-ratio}
Sets the numeric width-to-height ratio for custom formats. The ratio is normalized before the page box is planned.

#### Rotation control {#tooltip-control-rotation}
Rotates the selected page or layer in planned coordinates. The value is rounded to the control step before preview and export consume it.

#### Margin method control {#tooltip-control-margin-method}
Switches the margin construction method. Preview highlights the candidate method before it is committed.

#### Grid size controls {#tooltip-control-grid-size}
Changes the structural row and column count. Existing layers keep their authored coordinates and may need review after large grid changes.

#### Grid rhythm controls {#tooltip-control-grid-rhythm}
Changes how rows and columns expand across the page. Rhythm choices are calculated before layer placement.

#### Type rhythm controls {#tooltip-control-type-rhythm}
Changes the global type scale. Paragraphs that use style presets follow this rhythm; custom sizes remain explicit.

#### Base family control {#tooltip-control-base-family}
Changes the document base font family. Export resolves available cuts from this family before drawing text.

#### Page ground control {#tooltip-control-page-ground}
Changes the page background color. This is part of the document appearance and is included in exported formats when enabled.

### Editor controls

#### Paragraph geometry {#tooltip-editor-paragraph}
Edits the selected paragraph frame: rows, columns, baselines, alignment, rotation, reflow, and snap behavior. The frame is the first hit area for hover and selection.

#### Paragraph typography {#tooltip-editor-typography}
Edits the selected paragraph type settings. Style, family, cut, kerning, tracking, and color are written back to the layer.

#### Symbol insertion {#tooltip-editor-symbols}
Inserts typographic symbols into the active text editor. Symbols are inserted as text and remain part of the paragraph content.

#### Placeholder insertion {#tooltip-editor-placeholders}
Inserts document variables such as page number and project title. Placeholders resolve from the active project context during preview and export.

#### Paragraph information {#tooltip-editor-info}
Reports the current paragraph metadata. Use it to check character count, word count, and selected layer state.

#### Image geometry {#tooltip-editor-image-geometry}
Edits the selected image frame. Rows, columns, baselines, rotation, and snap values determine the exported image box.

#### Image color {#tooltip-editor-image-color}
Edits image placeholder color and transparency. These values affect the visual placeholder in preview and export.

#### Image information {#tooltip-editor-image-info}
Reports the selected image layer metadata. Use it to check geometry, color, and opacity before export.

#### Column snap control {#tooltip-control-snap-x}
Locks horizontal layer movement to the column grid. Disable it only when free placement is needed.

#### Baseline snap control {#tooltip-control-snap-y}
Locks vertical layer movement to the baseline grid. This keeps text and image frames aligned to the typographic system.

#### Reflow control {#tooltip-control-reflow}
Allows a paragraph to continue across its assigned columns. Use it for newspaper-like columns; keep it off for isolated text blocks.

#### Hyphenation control {#tooltip-control-hyphenation}
Allows syllable division inside the selected paragraph. It improves measure fit while preserving the planned frame.

#### Tracking control {#tooltip-control-tracking}
Adjusts letter spacing for the selected paragraph. Use small values and verify line breaks after changing it.

#### Transparency control {#tooltip-control-transparency}
Sets image placeholder opacity. Lower opacity can reveal grid structure while retaining the planned image area.

### Preview and project controls

#### Create page control {#tooltip-preview-create}
Adds a clean page or duplicates content with the modifier shortcut. Page creation updates project order and document variables.

#### Preview layer affordances {#tooltip-preview-layer-affordances}
The `>` rollover controls edit, duplicate, and delete the active preview layer. Paragraph controls add alignment, rotation, column reflow, hyphenation, column snap, and baseline snap. Image controls add rotation, column snap, and baseline snap. The bottom-right handle resizes the active layer.

#### Page list {#tooltip-project-pages}
Controls page order, names, and facing-page state. Page order drives page numbers, export order, and document variables.

#### Layer cards {#tooltip-project-layer-cards}
Show the layers on the active page. Use them for selection, locking, deletion, and editor retargeting when the canvas is dense.

#### Project metadata {#tooltip-project-metadata}
Shows project title, author, dates, document size, and typography statistics. Metadata supports review and library management.

#### Facing pages control {#tooltip-project-facing-pages}
Pairs pages into spreads for preview and export review. Facing-page state changes the editing context, not the underlying page geometry.

#### Preset cards {#tooltip-preset-browser}
Show stored and built-in systems with format, grid, margin, rhythm, and metadata. Loading a card replaces the active document.

#### User library {#tooltip-user-library}
Stores local presets and reports cloud sync state when account sync is active. User presets can be opened, exported, copied, or deleted.

### Export and support

#### Export surface {#tooltip-export-dialog}
Collects export format, guide visibility, metadata, and page range. Export consumes the same planned document used by preview.

#### Export page range {#tooltip-export-page-range}
Limits output to a selected page interval. Review facing spreads and page numbering before exporting a partial range.

#### Export metadata {#tooltip-export-metadata}
Embeds title, author, subject, and related document fields where the selected export format supports them.

#### Export progress log {#tooltip-export-progress-log}
Reports export preparation and file generation. A failed step should be corrected in the document before another export run.

#### Account and cloud {#tooltip-account-cloud}
Shows sign-in, sign-out, and sync state. Cloud actions affect library synchronization, not the open document geometry.

#### Feedback panel {#tooltip-feedback-panel}
Collects feedback and optional screenshots for product review. It does not change the current document.

#### Legal panel {#tooltip-legal-panel}
Shows license and legal information for the application. It is informational and does not affect project state.

<!-- tooltip-source:end -->

<!-- feature-source:start -->

## Feature Inventory

Current capability inventory for Swiss Grid Generator.

### Document Model

- Multi-page projects with project metadata (`title`, `description`, `author`, `createdAt`).
- Save to Library dialog for project title plus optional subject and author metadata, with a header status dot for unsaved, locally saved, and cloud-synced state.
- Independent page settings and layout state per page.
- Mixed page layer stack with text paragraphs and image placeholders.
- Save/load as plain project JSON or gzip-compressed `.swissgridgenerator` archives.
- Bundled presets use the same project JSON schema as saved documents.
- Imported projects use the 2.0 project schema with an explicit `pages` array.
- Optional guided project tours embedded in project JSON and rendered as an in-app step overlay.
- Optional Supabase email-code authentication for cloud sync.
- Authenticated projects keep a local offline cache and use Supabase as the remote source of truth.
- Saved user-library projects track `ownerUserId`, `remoteProjectId`, `remoteRevision`, `lastSyncedAt`, and sync state.
- Local cloud/account activity is stored in a capped support log and is not uploaded automatically.

### Grid System

- Supported layout dropdowns render hovered options live in the preview and revert on close unless the option is committed.
- Ratio families: `DIN`, `ANSI`, `Balanced`, `Photo`, `Screen`, `Square`, `Editorial`, `Wide Impact`, `Custom Ratio`.
- Custom ratio width:height input resolved to A4-equivalent page area.
- Portrait and landscape orientation.
- Full page rotation from `-180..180`.
- Baseline units from `6pt` to `72pt`, filtered by usable line count.
- Margin method dropdown: `Progressive`, `Van de Graaf`, `Baseline`, `Custom Margins`.
- Custom per-side margins in direct baseline units.
- Grid size from `1..13` for both columns and rows.
- Gutter multiple from `1.0..4.0` in `0.5` steps.
- Rhythm modes: `Repetitive`, `Fibonacci`, `Golden Ratio`, `Perfect Fourth`, `Perfect Fifth`.
- Independent rhythm enable/direction per axis.

### Typography

- Core type hierarchy levels: `Display`, `Headline`, `Subhead`, `Body`, `Caption`, and `fx`.
- `Custom` is a paragraph-level override mode in the text editor rather than a global scale row.
- Scale systems: `Swiss`, `Golden Ratio`, `Fibonacci`, `Perfect Fourth`, `Perfect Fifth`.
- Left-panel hierarchy table showing the resolved `Display`, `Headline`, `Subhead`, `Body`, and `Caption` metrics for the active baseline/scale.
- Base font inheritance plus block-level override support.
- Font family groups: `Sans-Serif`, `Serif`, `Display`.
- Available Fonts:
  - Sans-Serif: [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans), [Inter](https://fonts.google.com/specimen/Inter), [Jost](https://fonts.google.com/specimen/Jost), [Work Sans](https://fonts.google.com/specimen/Work+Sans)
  - Serif: [EB Garamond](https://fonts.google.com/specimen/EB+Garamond), [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville), [Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda), [Besley](https://fonts.google.com/specimen/Besley)
  - Display: [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
- Inserted symbols use `Noto Sans Symbols 2` as an internal run-level font assignment for stable rendering/export.
- Family cut selection from available local variants.
- Optical or metric kerning.
- Tracking input from `-120` to `+300` (`1/1000 em`).
- Custom-specific size and leading overrides.
- Paragraph horizontal alignment: left, center, right.
- Paragraph vertical alignment: top, center, bottom.
- Hyphenation toggle per paragraph.
- Newspaper reflow across paragraph columns.
- Optical margin alignment engine for preview/export.
- Dynamic document variables for `lorem`, `project_title`, `page_title`, `page`, `pages`, `date`, `time`, and `url`.
- `%page%` / `%pages%` resolve against physical page counts; on facing spreads the right side advances by one physical page.

### Text Editing

- Inline editor overlay on the page surface.
- Left-sidebar text editor with `Paragraph`, `Typo`, `Symbols`, `Placeholders`, and `Info` sections.
- Text-editor section open/closed state and panel scroll position are remembered across pages and paragraphs inside the current document, with an all-closed first-use default. Opening a different document or preset resets the editor panels to the closed, top-aligned state.
- Settings and editor sections use one shared move-to rule: opening a section aligns that section shell to the top of the panel, closing a section can move back to the nearest still-open section above, and closing all sections restores the default top-aligned view.
- The text editor header uses the same user-facing layer label shown in the Project panel instead of the internal block id.
- Paragraph section: rows, baselines, cols, horizontal alignment, vertical alignment, reflow, hyphenation, `Snap to Columns (X)`, `Snap to Baseline (Y)`, rotation.
- Paragraph height resolves as `rows + baselines`, with `rows = 0` allowed when `baselines > 0`.
- `Baselines` is a bounded dropdown capped by the current document's baselines-per-grid-module count.
- Paragraph geometry dropdowns preview hovered row/col/baseline values live before commit.
- Vertical alignment positions the text stack inside the configured paragraph frame while preserving baseline rhythm.
- `Snap to Columns (X)` keeps paragraphs on logical column anchors; turning it off allows free horizontal placement with symmetric one-column overhang into the side margins.
- `Snap to Baseline (Y)` keeps paragraphs on editorial Y anchors; normal drag uses module tops, `Shift`/`Ctrl` drag uses baseline rows, and turning it off allows free vertical placement.
- Typo section: font, cut, hierarchy, Custom size/leading, kerning, tracking, scheme, color.
- Selecting `Custom` seeds Custom size/leading from the paragraph's currently resolved size and leading.
- Typo dropdowns preview hovered family, cut, hierarchy, and scheme values before commit.
- Symbols section inserts typographic marks from a grouped palette, stores recent picks, and assigns inserted symbols to `Noto Sans Symbols 2` as run-level formatting.
- Placeholders section lists the available document-variable tokens and inserts the clicked token at the caret or over the current selection.
- `<%lorem%>` fills the active paragraph frame according to its geometry, reflow, and hyphenation settings.
- Info section: geometry, style, font, size, leading, kerning, tracking, counts, `Max/Line`.
- Text editor can be opened from the preview affordance or by double-clicking an unlocked text layer card in the Project panel.
- When a text editor is already open, clicking another unlocked preview paragraph or double-clicking another unlocked text layer card retargets the editor to that paragraph.
- Selection-aware styling for selected text:
  - font family
  - font cut
  - hierarchy (`Typo`)
  - color
  - tracking
- Paragraph defaults are rebased when edits are applied without a scoped selection.
- Caret and selection rendering follow rendered text geometry.
- In text edit mode, placeholders stay visible as raw tokens in the edited paragraph; outside edit mode they render to live values.
- Double-click selects the clicked word in inline text edit mode.
- Triple-click selects the containing sentence in inline text edit mode.
- Four clicks select the whole paragraph text in inline text edit mode.
- `Alt+A` and `Cmd/Ctrl+A` select the whole paragraph while inline text edit is active.
- `Arrow`, `Home`, and `End` navigation in inline text edit follows the rendered line geometry rather than DOM textarea line boxes.
- Preserves repeated spaces and blank lines in the source model.
- Soft-wrap boundary spaces remain in the source text but do not render as visible indent on the next visual line.

### Placement and Layers

- Double-click empty module to create a text paragraph with hyphenation off by default.
- Hold `1..5` while double-clicking empty module to create a paragraph as `Caption`, `Body`, `Subhead`, `Headline`, or `Display`; new hierarchy blocks use disciplined starting frames: Caption `1x1`, Body/Subhead `1x2`, Headline/Display `1x3`, clamped to the remaining columns from the clicked module.
- `Shift` + double-click empty module to create and select an image placeholder without opening edit mode (`Ctrl` fallback); hold `1..4` with `Shift` to use that active base-scheme swatch.
- Paragraph creation uses the actual clicked module rather than the nearest module center.
- Drag paragraphs and placeholders to move them.
- Hovered text paragraphs and image placeholders expose a `>` controls affordance and a bottom-right resize handle.
- The controls submenu contains edit, duplicate, and delete actions. Paragraph controls also expose alignment, rotation, column reflow, hyphenation, column snap, and baseline snap. Image controls expose rotation, column snap, and baseline snap.
- Paragraph duplicate still follows the same placement path as dragging, even after switching pages. `Shift` + duplicate copies `Paragraph` settings, `Alt/Option` + duplicate copies `Typo` settings, and `Alt/Option` + `Shift` + duplicate copies both for transfer onto another paragraph, even across pages and loaded layouts.
- Default paragraph drag respects each paragraph's current `Snap to Columns (X)` state and, when `Snap to Baseline (Y)` is on, snaps Y to the nearest module top.
- Holding `Shift` during paragraph or image-placeholder drag temporarily snaps the Y position to the nearest baseline row (`Ctrl` fallback).
- Arrow keys nudge the selected unlocked paragraph or image placeholder through the same logical placement model: snapped X moves by columns, snapped Y moves by module rows by default, `Shift` uses baseline rows, and unsnapped axes move in tenth-step logical increments with `Shift` as a 10x multiplier.
- Image placeholders now use the same X/Y snap model as paragraphs, including free-axis placement and per-layer rotation.
- Paragraph hover guides follow the configured `rows + baselines` height rather than only the rendered text bounds.
- Paragraph hover edit affordance is anchored at the paragraph's top-left origin so shallow frames remain reachable.
- Preview rollover stays active while editing, so clicking another existing unlocked paragraph or image placeholder retargets the already open editor instead of leaving edit mode.
- Project panel supports page switching, a compact `Page` header with list-view access and physical page navigation, full-width page rows with inline layer lists, reordering, renaming, deletion, and one `+` page-creation control.
- Hovering an active-page layer card in the Project panel temporarily makes it the keyboard nudge target without changing the committed selection.
- Project panel includes a compact project-title row showing the real project title plus an edit/close button.
- Double-clicking the compact project-title row toggles the metadata section; opening it focuses and selects the `Title` field immediately.
- The expanded metadata section contains editable `Title`, `Subject`, and `Author` fields storing on blur, and the `Subject` field can be vertically resized for the current session.
- Project panel includes a document-info toggle with project/page/layer/type summary text.
- Opened page rows expose a `Facing pages` control above `Layers`, converting a page into a true facing spread with mirrored inner/outer margins, a zero-gap preview seam, and doubled effective columns across the spread.
- The Project header includes an `i` toggle for document info text.
- `Page Up` and `Page Down` step through project pages when multiple pages are present, `Shift` + `Page Up` / `Shift` + `Page Down` jump by `10` pages, and `Home` / `End` jump to the first or last page.
- Keyboard page navigation keeps the active page row in view, waits briefly before moving the row, and only opens inline layers after a longer pause so fast paging stays lightweight.
- Facing spreads stay a single project page and keep the normal layer editing workflow inside one continuous spread space.
- `+` inserts a new single page after the active page, preserving that page's settings and layout mode but starting without copied layer content; `Shift` + `+` inserts a full duplicate of the active page with its content.
- Projects are capped at `1000` pages.
- The `Page` header and list icon return from an inline page submenu to the page list.
- The physical page counter shows current page and total physical pages; double-clicking the current number opens an inline jump field capped by the total page count.
- Single-clicking a page row in list view selects and displays it while keeping list view open; double-clicking a page row, or clicking its open toggle, opens that page's inline layer list.
- Expanded page rows expose rename, delete, facing-pages, and inline layer-management controls.
- Newly added pages open automatically.
- Project JSON supports an optional `tour` definition for quick onboarding tied to real pages and layers.
- Tour overlay supports open/close, back/next, step captions, optional layer focus, optional editor opening, and click-to-advance steps.
- Layer cards support selection, reordering, locking, deletion, and editor opening.
- Active-page layer cards now use single-click for selection and double-click for editor open/retarget, so keyboard nudging stays reachable from the Project panel without immediately entering edit mode.
- Double-clicking a layer-card lock toggle applies the same lock or unlock state to every layer on that page.
- Locked layers stay visible and still participate in preview rollover for guides and unlocking, but drag, edit, duplicate, delete, and editor retarget/open behavior remain disabled until unlocked.
- Text layer rows use a single rendered preview line in the paragraph font and color.
- Image layer rows use a full-width placeholder color rectangle instead of an `Image Placeholder` text label.
- `Custom Ratio` accepts fractional width/height units, including decimal comma input for formats such as `2:1,414`.
- Text paragraphs and image placeholders use logical grid anchors:
  - `column`
  - `row`
  - `baselineOffset`
- Paragraphs and image placeholders both persist independent X/Y snap flags; unsnapped anchors may carry fractional `column` and/or `baselineOffset` values.
- Increasing columns/rows preserves existing anchors.
- Increasing a paragraph's column span preserves its anchored column even when the wider frame intentionally overhangs the page edge.
- Decreasing columns/rows is blocked when any paragraph or image placeholder would fall outside the new grid.
- Invalid grid reductions show a temporary warning instead of auto-repositioning content.

### Image Placeholders

- Independent row/column spans plus additional baseline height.
- Color-scheme aware placeholder fills.
- Placeholder-specific transparency control.
- Placeholder-specific `Snap to Columns (X)`, `Snap to Baseline (Y)`, and rotation controls.
- With X snapping off, image placeholders use the same symmetric one-column side-margin overhang as paragraphs.
- Stable logical positioning across grid changes.
- Separate left-sidebar editor with `Geometry`, `Color`, and `Info` sections.
- Image-editor section open/closed state and panel scroll position are remembered across pages and placeholders inside the current document, with an all-closed first-use default. Opening a different document or preset resets the editor panels to the closed, top-aligned state.
- Settings and editor sections use one shared move-to rule: opening a section aligns that section shell to the top of the panel, closing a section can move back to the nearest still-open section above, and closing all sections restores the default top-aligned view.
- The image editor header shows `IMAGE` plus the current placeholder swatch color.
- Image editor can be opened from the preview affordance or by double-clicking the corresponding unlocked image layer card in the Project panel.
- When an image editor is already open, double-clicking another unlocked active-page image layer card retargets the editor.
- Geometry section includes rows, baselines, columns, X/Y snapping, and rotation.
- Geometry dropdowns preview hovered row/col/baseline values live before commit.
- Scheme, swatch color, and transparency live in the Color section.
- Scheme dropdown previews the hovered placeholder palette before commit.
- `Baselines` is a bounded dropdown capped by the current document's baselines-per-grid-module count.
- Info section summarizes rows, baselines, columns, X/Y snap state, rotation, scheme, color, and transparency.

### Presets

- Preset browser in the preview area.
- Rendered page-1 thumbnails for bundled presets.
- Loading a preset, imported project, or saved user layout always opens the first page in its `pages` array.
- Loaded pages are revealed only after the full page snapshot and first final preview plan are ready, so fast paging does not expose intermediate image or layer placement.
- Preset rollover tooltip with title, subject, author, and creation date metadata when rollover info is enabled.
- User-library layouts are listed after bundled `Presets` and `Examples` when any local or synced user layouts are available.
- The Users section header includes an info rollover describing local browser storage, data-clearing risk, and signed-in cloud sync.
- User-library thumbnails show a green status dot only while signed in and synced; signed-out, pending, or local-only states use the warning color.
- Deleting a user-library thumbnail asks for confirmation first, then removes it locally and displays whether the cloud delete was performed, queued, or unnecessary.
- Double-click preset to load.
- `Esc` closes the browser without loading.

### Export

- Save dialog stores the current project into the local `Users` library with editable title, subject, and author metadata.
- Local `Users` library records are stored as gzip-compressed project archives in IndexedDB.
- `PDF` selected-range export.
- `JSON` selected-range export as a standard editable `.json` project document.
- `SVG v1` selected-range export.
- `IDML v1` selected-range export.
- Export defaults to the full project page range.
- Export dialog includes display toggles for baselines, margins, modules, typography, and image placeholders, plus a live thumbnail preview, JSON/PDF/SVG/IDML format switching driven by the shared format options table, explicit page-selection input, filename and metadata fields, and compact action-button progress with a thin top progress rail.
- Export progress displays preparation, deterministic planning, page rendering, finalization, percentage, elapsed time, and a collapsible progress log using the same formatter as CLI export.
- Export is WYSIWYG with respect to the project-level visibility state for baselines, margins, modules, typography, and image placeholders.
- All export formats use stored page geometry directly.
- PDF, SVG, and IDML are vector-based, not raster captures.
- PDF, SVG, and IDML are run through the shared `ProjectExportRunner` / `ExportEngine` path, so they consume the same resolved project pages and canonical `PageExportPlan` data.
- PDF, SVG, and IDML render typography from shared glyph-outline geometry, so exported text is frozen as non-live vector geometry in the normal export path.
- Browser vector export actions share one wrapper for PDF, SVG, and IDML filename/base-name resolution, progress rules, and download handoff.
- The export engine partitions long exports into deterministic page sets; SVG and IDML use one shared worker scheduler for page-set artifact generation, cancellation, progress, and ordered assembly.
- SVG and IDML page-set artifacts can be reused from a bounded exact-request cache for repeated exports without re-rendering unchanged page sets.
- Export metadata fields (`Project Title`, `Subject`, `Author`) are editable in the dialog for all formats.
- PDF, SVG, and IDML share one bleed option:
  - disabled by default
  - default width `3mm`
  - one shared `ExportBox` defines trim, bleed, media canvas, export origin, crop-mark geometry, and guide clipping
  - visible export geometry extends through the production bleed area; a fixed white crop-mark canvas and black crop marks are added outside it
  - no dashed bleed guide is exported
- PDF exports RGB vector geometry with an embedded `sRGB IEC61966-2.1` output intent.
- Configured local font assets are verified during asset generation and used for deterministic metrics plus glyph-outline extraction.
- PDF guide groups exported as separate form objects for margins, modules, and baselines.
- PDF exports preserve available project metadata (`title`, `description`, `author`, `createdAt`) where the format supports it.
- Single-page SVG exports a vector file with exact glyph-outline typography, guides, placeholders, and optional bleed plus crop-mark canvas bounds and marks.
- Multi-page SVG exports a ZIP with one SVG per page.
- SVG exports embed available project metadata in the file metadata block.
- SVG typography is exported as outline geometry, so downstream text is not live-editable.
- IDML exports separate `Guides`, `Typography`, and `Placeholders` layers with frozen text-frame geometry, so downstream text is not live-editable.
- IDML guide lines and crop marks are serialized as real stroked `GraphicLine` page items; rectangle guide outlines remain rectangle geometry.
- IDML exports preserve available project metadata in the package XMP metadata.
- `Esc` closes idle export UI and cancels a running export at the next safe checkpoint.
- Clicking the backdrop follows the same close/cancel behavior as `Esc`.

### UI and Workflow

- Dark mode through the header support submenu.
- Smart text-edit zoom toggle as the first item in the header support submenu, enabled by default.
- While smart text zoom is enabled, entering text edit mode focuses the active paragraph, ordinary text/style edits keep the current zoom, frame-geometry changes (`Rows`, `Baselines`, `Cols`) refit it, and leaving text edit returns to full-page fit.
- Header support submenu uses the same open-list visual system as panel list sections and includes hover info, dark mode, layout clipboard transfer, documentation, feedback, and legal notice.
- Current layouts can be copied to the clipboard and pasted into another browser session through the project-transfer JSON payload.
- Presentation mode shows only the planned layout, supports native fullscreen when the browser allows it, and keeps page navigation active.
- Quick-start video overlay uses a full-height video surface with transparent header/controls, page-style shadow, no seek bar, and a native fullscreen control.
- Layout-open tooltip copy remains generated from the tooltip source, but the automatic popup is currently disabled.
- Visibility toggles for baselines, margins, modules, image placeholders, and typography.
- Undo/redo across settings, layout, and editor operations.
- External documentation link opens the generated documentation site.
- Rollover-info toggle for tooltips and affordances.
- Feedback sidebar with required email/comment fields, optional screenshots, and optional support-log attachment.
- Legal Notice sidebar with provider, contact, privacy, cloud storage, terms, and dispute-resolution information.
- Account, feedback, and legal notice panels use the right content panel surface and remain available from preset browser view.
- Header account panel with email-code sign-in, cloud sync status, and a green/warning header status dot.
- When signed out, the account panel status row reads `Not connected`.
- The account panel `Status` row expands to show recent local cloud/account events and a `Download` support action.
- Auth and cloud-sync failures surface as actionable product messages instead of raw provider errors.
- Hidden-tab / page-close transitions trigger a best-effort local autosave flush and a best-effort cloud sync for already-saved user-library projects.
- Keyboard shortcuts for header controls and panel toggles.

### Cloud Sync

- Supabase browser auth with email one-time-code sign-in.
- Cloud archives stored as gzip-compressed `.swissgridgenerator` files.
- On sign-in, the app syncs local library entries with Supabase and pulls remote-only projects into the local offline cache.
- Signed-in sessions request throttled background sync when the app regains focus, becomes visible, or opens the preset browser.
- Existing saved user-library projects auto-save locally and sync debounced to the cloud while editing.
- Revision mismatches are marked as `conflict` instead of overwriting local work silently.
- Remote deletions are applied locally on sync when the local copy has no newer unsynced changes; otherwise the project is marked as `conflict`.
- Account and sync events are recorded locally as capped support diagnostics with `info`, `success`, `warning`, or `error` severity.
- The local cloud activity log can be attached to feedback submissions for support.
- Remote-backed deletions are soft-deleted in Supabase via `deleted_at`, while local-only deletions purge the local cache record immediately.

---

**Date:** May 2026

**Version:** 001

<!-- feature-source:end -->

## Documentation Map

| Need | Canonical file |
|---|---|
| User documentation, tooltip guide, and feature inventory | [DOCUMENTATION.md](DOCUMENTATION.md) |
| Project overview | [README.md](README.md) |
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
- Keep quickstart material concise.
- Keep implementation detail in the dedicated engineering documents.
- Let `scripts/sync-docs-site.mjs` compose the generated `/docs` site from `DOCUMENTATION.md`, `GUI.md`, and `PERFORMANCE.md`.
