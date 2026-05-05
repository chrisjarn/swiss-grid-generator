# Help

Edit this file to update the in-app Help panel.

Format:
- `## Group Title` starts an index group.
- `### Section Title {#section-id}` starts a top-level section.
- Add `[noindex]` after the id to keep a section out of the index.
- `#### Subsection Title {#section-id}` starts a subsection.
- Use paragraphs and `-` bullet lists.
- Use backticks for inline code.
- Use markdown links for external URLs.
- Use `{{AVAILABLE_FONTS}}`, `{{SHORTCUT_TABLE}}`, and `{{DOCUMENT_VARIABLE_TOKENS}}` where needed.

## Quick Start

### Quick Start {#help-quick-start}
- Set ratio, orientation, and rotation in `I. Canvas`.
- Set the baseline first. It drives everything.
- Set margins in `III. Margins`.
- Set columns, rows, gutter, and rhythm in `IV. Grid`.
- Set the type scale and base font in `V. Typo`.
- Use the header toggles to inspect baselines, margins, modules, and type.

## General Guidance

### General Guidance {#help-general-overview} [noindex]
Core editing and layout workflows.

### Preview Workspace {#help-preview-workspace}
- The preview is the live layout surface for the active page.
- When you load a preset, project, or another page, the new preview is only revealed after the full page snapshot and first final plan commit are ready, so provisional image/text geometry is not shown mid-load.
- Double-click inside a module to add text with hyphenation off by default. `Shift` + double-click adds an image placeholder.
- Hold `1..5` while double-clicking empty space to choose the new paragraph hierarchy: `1 Caption`, `2 Body`, `3 Subhead`, `4 Headline`, `5 Display`. New hierarchy blocks start as Caption `1x1`, Body/Subhead `1x2`, Headline/Display `1x3`, clamped to the remaining columns from the clicked module.
- Hover a layer to reveal edit access and placement guides.
- Drag to move.
- Hovered text paragraphs expose a `+` affordance: click to duplicate the paragraph, then click the target placement, even after switching pages. `Shift` + click copies `Paragraph` settings, `Alt/Option` + click copies `Typo` settings, and `Alt/Option` + `Shift` + click copies both onto another paragraph, even on a different page or after loading another layout.
- Hovered image placeholders expose a `+` affordance for duplication.
- Preview visibility toggles control whether baselines, margins, modules, typography, and image placeholders are shown on the active page.
- Locked layers still show preview rollover guides and their unlock affordance, but they cannot be moved, edited, duplicated, deleted, or retargeted until unlocked in the Project panel.
- Arrow keys nudge the selected unlocked layer. Snapped axes move by the grid; unsnapped axes move in fine steps. `Shift` increases the unsnapped step and switches snapped Y to baseline movement.
- `Page Up`, `Page Down`, `Home`, and `End` navigate project pages.
- Undo/redo includes placement, duplication, deletion, and editor changes.

### Text Editor {#help-editor}
- Open text edit from the preview affordance, or by double-clicking an unlocked text layer card in the Project panel.
- Retarget an open text editor by clicking another unlocked preview block or by double-clicking another unlocked text layer card in the Project panel.
- While editing, the left sidebar switches to `Paragraph`, `Typo`, `Symbols`, `Placeholders`, and `Info`.
- Those editor sections remember their last open/closed GUI state and panel scroll position across pages and paragraphs inside the current document. First use starts with all sections closed, and opening another document or preset resets the editor panels to the closed, top-aligned state.
- Opening a settings or editor section moves that whole section shell to the top of the panel. Closing a section while other open sections remain above it moves back to the nearest still-open section above, and closing all sections returns the panel to its default top-aligned view.
- The editor title uses the same layer label shown in the Project panel.
- `Esc` or outside click exits edit mode.
- Inside inline text edit: double-click selects a word, triple-click selects a sentence, four clicks select the whole paragraph text, `Alt+A` or `Cmd/Ctrl+A` selects all, and `Arrow` / `Home` / `End` follow the rendered line layout.

#### Paragraph Section {#help-editor-paragraph}
- Set rows, baselines, columns, alignment, reflow, hyphenation, X/Y snap, and rotation.
- Height is `rows + baselines`.
- `Rows` may be `0` when `Baselines` is greater than `0`, so shallow editorial frames stay possible.
- `Rows`, `Baselines`, and `Cols` preview on dropdown hover before commit.
- `Snap to Columns (X)` locks to columns. Off allows free horizontal placement with controlled side overhang.
- `Snap to Baseline (Y)` locks to the editorial Y system. Off allows free vertical placement.

#### Typo Section {#help-editor-typo}
- Set font family, cut, hierarchy, color, kerning, tracking, and `Custom` size/leading.
- Choosing `Custom` seeds the size and leading fields from the paragraph's current resolved metrics.
- If text is selected, type and color controls apply to the selection instead of the whole paragraph.
- Font, cut, hierarchy, and scheme preview on dropdown hover before commit.

#### Symbols Section {#help-editor-symbols}
- Insert typographic symbols at the caret or over the current selection.
- The grouped symbol palette includes arrows, bullets, marks, math, Greek lowercase letters, geometry, and editorial punctuation.
- Symbol insertion stores normal paragraph text plus a run-level `Noto Sans Symbols 2` font assignment for stable canvas and export rendering.
- Recent symbols appear above the grouped palette after first use.

#### Placeholders Section {#help-editor-placeholders}
- Insert document-variable tokens at the caret or over the current selection.
- `<%lorem%>` fills the active frame using its current geometry and reflow settings.
- `<%page%>` and `<%pages%>` use physical page counts. On facing spreads, the right side resolves to the next physical page number.
- Available tokens: {{DOCUMENT_VARIABLE_TOKENS}}.

#### Info Section {#help-editor-info}
- Shows geometry, type summary, counts, and `Max/Line`.

### Image Editor {#help-image-editor}
- `Shift` + double-click on an empty space in the preview to create a new image placeholder.
- Open from the preview affordance or by double-clicking the corresponding unlocked image layer card in the Project panel.
- The left sidebar switches to `Geometry`, `Color`, and `Info`.
- Those editor sections remember their last open/closed GUI state and panel scroll position across pages and image placeholders inside the current document. First use starts with all sections closed, and opening another document or preset resets the editor panels to the closed, top-aligned state.
- Opening a settings or editor section moves that whole section shell to the top of the panel. Closing a section while other open sections remain above it moves back to the nearest still-open section above, and closing all sections returns the panel to its default top-aligned view.
- The editor title shows `IMAGE` plus the current placeholder swatch color.
- `Esc` or outside click exits edit mode.
- Double-clicking another unlocked active-page image layer card retargets the open image editor.

#### Geometry Section {#help-image-editor-geometry}
- Set rows, baselines, columns, X/Y snap, and rotation.
- Height is `rows + baselines`.
- `Rows`, `Baselines`, and `Cols` preview on dropdown hover before commit.

#### Color Section {#help-image-editor-color}
- Set scheme, swatch color, and transparency.

#### Info Section {#help-image-editor-info}
- Shows the current geometry, snap state, rotation, scheme, color, and transparency.

### Drag and Placement {#help-drag-placement}
- Drag respects each layer's current X/Y snap settings.
- With `Snap to Baseline (Y)` on, normal drag uses module tops.
- Holding `Shift` during drag switches Y movement to baseline rows.
- Unsnapped layers still stay inside their allowed placement bounds.
- With `Snap to Columns (X)` off, paragraphs and image placeholders may overhang by one column into the side margins.
- Selected layers can also be moved via cursor keys `UP`, `DOWN`, `LEFT`, `RIGHT`. `SHIFT` + `Cursor Keys` increments the steps 10x.

### History and Reflow {#help-history-reflow}
- Undo/redo covers settings, content edits, and placement changes.
- Reducing rows or columns never auto-repositions existing layers.
- If a grid reduction would push content out of bounds, the change is blocked and a warning is shown.

### Save and Load Project JSON {#help-save-load}
- Save stores project metadata, pages, page settings, layout state, and optional tours.
- `Save to Library` opens a metadata dialog for project title plus optional subject and author, then stores the full project in the local `Users` library as a gzip-compressed archive.
- `Import` restores the full project from either a saved project JSON or a compressed `.swissgridgenerator` archive and always opens on the first page in the loaded `pages` array.
- Imported projects must use the 2.0 project schema with an explicit `pages` array.
- Positioned layers are stored with logical anchors so layouts stay stable across grid changes.
- Supabase email-code auth is optional and used only for cloud sync.

### Export {#help-export}
- Export supports JSON, vector PDF, SVG, and IDML.
- Multi-page projects can export a page range.
- The dialog includes a fixed header/footer, five display toggles, a format switcher, page-range selectors, a filename field, phase-based export progress with elapsed time, and a collapsible metadata section.
- Exports are WYSIWYG with respect to the current preview visibility state for baselines, margins, modules, typography, and image placeholders.
- PDF, SVG, and IDML exports are 100% vector based.
- PDF, SVG, and IDML use one shared export runner and canonical page plan path.
- JSON exports the selected page range as an editable project document with metadata and current layout state, with an optional gzip-compressed `.swissgridgenerator` variant.
- Project Title, Subject, and Author can be adjusted in the export dialog for all formats without changing the live project until a JSON export is saved.
- PDF exports store available project metadata in the PDF document info dictionary.
- SVG exports embed available project metadata in the SVG metadata block.
- IDML exports carry project metadata into the package XMP metadata.
- PDF includes print presets plus optional bleed and registration-style marks.
- PDF embeds verified local font assets only; required font files are checked during asset generation.
- Multi-page SVG exports a ZIP with one outlined SVG per selected page.
- IDML exports separate guides, typography, and placeholder layers with frozen text geometry.
- `Esc` closes the dialog when no export is running and cancels an in-progress export at the next safe checkpoint.
- Clicking outside the popup follows the same close/cancel behavior.

### Project Tours {#help-project-tours}
- A loaded project may include an optional guided tour overlay.
- Closed tours can be reopened from the `Open Tour` button at the bottom of the preview.
- Tour steps can move between pages, highlight layers, open editors, jump to help topics, or wait for a specific layer click before advancing.

### Layout Tooltips {#help-layout-tooltips}
- Loading a preset or project also opens a short workflow tooltip at the bottom of the preview.
- The popup fades in, shows one authored tip at a time, and stays open until it is closed with `X`, outside click, or replaced with `Next >`.
- `Next >` cycles through the tooltip sequence and updates the `Tooltip x of y` counter.
- When Help is open, the tooltip popup becomes an orange-marked help target like the rest of the interface and hovering it jumps the Help panel to this section.

## Application Controls

### UX Reference {#help-ux-overview} [noindex]
Global controls and panel behavior.

### Application Controls {#help-application-controls-overview} [noindex]

### Header and Sidebars {#help-sidebars-header}
- Header actions cover presets, import, save, export, undo/redo, dark mode, smart text zoom, display toggles, Project, help, and cloud account.
- The Project panel can be toggled with `Cmd/Ctrl+Shift+P`.
- `Shift` + click on a page-visibility toggle applies the same state to every page in the project.

### Help Navigation {#help-help-navigation}
- When help is open, orange-marked UI targets jump to their matching help topic on hover.
- Opening the Help panel also enables those contextual help markers across header actions, settings panels, the preview surface, and the preset browser.
- The layout-tooltip popup uses the same help-hover logic and only shows its orange top indicator while Help is open.
- The Help panel remains available while the preset browser is open.
- While the preset browser is open and the left settings controls are inactive, the left-panel section headers still keep their help-hover targets.
- Use the small up-arrow beside a help title to jump back to the index.

### Presets {#help-header-examples}
- Opens the presets browser.
- Bundled files are grouped into `Presets` and `Examples`. `Users` is reserved for user files.
- When user layouts exist locally or through cloud sync, the `Users` section is listed after bundled `Presets` and `Examples`.
- The `Users` header info marker explains that local layouts are browser/device-local and can be lost when browser data is cleared; signed-in cloud sync stores saved layouts in Supabase.
- Hovering a preset thumbnail shows title, subject, author, date, format, grid, baseline, margin, and rhythm metadata.
- User thumbnails in `Users` also show cloud status in the rollover; the thumbnail status dot is green only while signed in and synced, orange when signed out or pending, and red on signed-in sync error.
- Deleting a user thumbnail asks for confirmation first, then removes it locally and displays whether the cloud delete was performed, queued, or unnecessary.
- Double-click a thumbnail to load it.
- `Esc` closes the browser without loading.
- Shortcut: `Cmd/Ctrl+Shift+4`.

### Import {#help-header-load}
Imports a saved project JSON or compressed `.swissgridgenerator` archive. Shortcut: `Cmd/Ctrl+O`.

### Save {#help-header-save}
Opens the `Save to Library` dialog for project title, subject, and author, then stores the current project in the local `Users` library as a gzip-compressed archive. The Save icon status dot is red when the current project is not saved locally, orange when saved to the local Users library, and green only when the active saved project is signed in and cloud-synced. Shortcut: `Cmd/Ctrl+S`.

### Cloud Account {#help-cloud-account}
- The header account icon opens the right sidebar cloud account panel.
- The account icon shows a green status dot only when the user is signed in and cloud sync is fully up to date; otherwise it stays orange.
- While signed out, the `STATUS` row reads `Not connected`.
- Email-code sign-in uses Supabase browser auth.
- The `STATUS` row expands to show recent local cloud/account events.
- Signed-in users can trigger `Sync Now` from the account panel.
- Signed-in projects continue to use the local offline cache while syncing to Supabase in the background.
- Signed-in sessions request throttled background sync when the app regains focus, becomes visible, or opens the preset browser.
- Existing saved user-library projects auto-save locally and sync debounced to the cloud while you edit.
- Remote deletions are applied locally on sync when the local copy has no newer unsynced changes; otherwise the project is marked as a conflict.
- Auth and cloud-sync failures are translated into user-facing messages for rate limits, permissions, offline state, session expiry, and setup errors.
- When the tab is hidden or closed, the app performs a best-effort local autosave flush and a best-effort cloud sync for already-saved user-library projects.

### Export {#help-header-export}
Opens export for JSON, PDF, SVG, and IDML. Shortcut: `Cmd/Ctrl+Shift+E`.

### Undo {#help-header-undo}
Reverts the latest history step. Shortcut: `Cmd/Ctrl+Z`.

### Redo {#help-header-redo}
Reapplies an undone history step. Shortcut: `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`.

### Dark Mode {#help-header-dark-mode}
Toggles light and dark UI themes. Shortcut: `Cmd/Ctrl+Shift+D`.

### Smart Text Zoom {#help-header-smart-text-zoom}
Toggles automatic zoom-to-paragraph while text editing. When enabled, entering text edit zooms to the active paragraph, ordinary text/style edits keep the current zoom, geometry changes (`Rows`, `Baselines`, `Cols`) refit it, and leaving text edit returns to full-page fit.

### Baselines Toggle {#help-header-baselines}
Shows or hides baseline guides on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+B`.

### Margins Toggle {#help-header-margins}
Shows or hides margin guides on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+M`.

### Modules Toggle {#help-header-modules}
Shows or hides modules and gutters on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+G`.

### Typography Toggle {#help-header-typography}
Shows or hides typography overlays on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+T`.

### Image Placeholders Toggle {#help-header-image-placeholders}
Shows or hides image placeholders on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+J`.

### Project Panel {#help-header-layers}
- Opens the project title and page/layer management panel.
- The small `i` toggle in the Project header shows or hides the document info text.
- The compact project-title row always shows the real project title.
- Double-click the compact project title to open or close the metadata section. Opening it focuses and selects the `Title` field immediately.
- The expanded metadata section contains `Title`, `Subject`, and `Author`.
- The `Subject` field is vertically resizable in the current session.
- The document info text summarizes pages, layers, fonts, cuts, words, characters, author, and creation date when metadata exists.
- Single-click a page row to activate it. Double-click it to open or close its inline layer list.
- `Page Up` / `Page Down` move through project pages, `Shift` + `Page Up` / `Page Down` jump by `10`, and the active page row is brought into view before its inline layers open.
- Drag collapsed page rows to reorder the project.
- Page rows include rename and delete controls. The last remaining page cannot be deleted.
- `Facing pages` converts a page into a spread inside the same page record.
- `+` inserts a new single page after the active page, preserving its page settings and layout mode but starting without copied layer content.
- `++` inserts a full duplicate of the active page with its content.
- A project can contain up to `1000` pages.
- `Page Up` / `Page Down` step one page. `Shift` + `Page Up` / `Shift` + `Page Down` jump by `10` pages. `Home` / `End` jump to the first or last page.
- Active-page layer cards mirror preview hover/guides.
- Hovering an active-page layer card temporarily routes keyboard layer nudging to that layer; leaving the card restores keyboard nudging to the selected layer.
- Drag unlocked layer cards to reorder z-index.
- Layer cards include lock and delete controls.
- Single-click a layer card to select it. Double-click an unlocked layer card to open or retarget its corresponding text or image editor.
- Double-click a layer card's lock toggle to apply the same lock state to every layer on that page.
- Locked layers stay visible and selectable, and their preview rollover remains available for guides and unlocking, but move, edit, duplicate, delete, and editor retarget/open actions stay disabled until unlocked.

### Feedback {#help-feedback-panel}
- The footer `Feedback` action opens a compact feedback sidebar.
- It collects a required email, a required comment, and up to three small screenshots.
- The optional log checkbox attaches the recent local cloud activity log for support.
- If you are signed in, the account email is used in the form.
- Submitting feedback stores the message in Supabase.

### Legal Notice {#help-legal-notice-panel}
- The footer `Legal Notice` action opens the legal notice sidebar.
- It includes provider details, contact, privacy notes, cloud storage notes, feedback handling, user rights, terms of use, and consumer dispute resolution.

### Keyboard Shortcuts {#help-shortcuts}
`Cmd/Ctrl` means `Cmd` on macOS and `Ctrl` on Windows/Linux.

{{SHORTCUT_TABLE}}

## Grid Generator Settings

### Grid Generator Settings {#help-grid-generator-settings-overview} [noindex]

### I. Canvas {#help-canvas-ratio}
- Choose a preset ratio or enter `Custom Ratio`.
- `Custom Ratio` accepts fractional width/height values and also accepts decimal comma input.
- `Ratio` and `Orientation` preview on dropdown hover before commit.
- Rotation turns the full preview/export composition.

### II. Baseline {#help-baseline-grid}
- The baseline controls vertical rhythm for the grid and type.
- Available baseline options run from `6pt` to `72pt` and are filtered so the current page still keeps a usable number of lines.
- Top and bottom margins stay baseline-aligned.

### III. Margins {#help-margins}
- Choose a margin method or `Custom Margins`.
- Margin method previews on dropdown hover before commit.
- `Baseline Multiple` scales the margin system while keeping baseline alignment.
- `Custom Margins` exposes top, left, right, and bottom baseline-multiplier controls.

### IV. Grid {#help-gutter}
- Set columns, rows, gutter, and rhythm.
- Rhythm options preview on dropdown hover before commit.
- Non-repetitive rhythms can be enabled and directed independently for rows and columns.
- Reducing rows or columns is blocked when existing content would fall outside the new grid.

### V. Typo {#help-typo}
- Set the type scale and base font for the document.
- `Rhythm` and `Base` preview on dropdown hover before commit.
- In the settings sidebar, dropdowns open upward.
- The `Steps` table shows the resolved size/leading values for `Display`, `Headline`, `Subhead`, `Body`, and `Caption` on the active baseline.
- Blocks without explicit overrides inherit the base font.

### VI. Available Fonts {#help-available-fonts}
- Base-font and paragraph font pickers use the same grouped family list.
- Font-family pickers preview hovered families live before commit.
- Each listed family links to its Google Fonts specimen page.

{{AVAILABLE_FONTS}}

### VII. Color {#help-color-scheme}
- Sets the base scheme for new image placeholders.
- `Background` applies `None` or a scheme color to the page.
- The same scheme system is used in the image editor, where individual placeholders can still override swatch color and transparency.
- Scheme and background preview on dropdown hover before commit.

## App Information

### Version {#help-app-version}
{{APP_VERSION}}
