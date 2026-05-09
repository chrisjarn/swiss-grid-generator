# SETTINGS.md

Current, implementation-accurate reference for all user-facing options and defaults.

## Typography System

6-level hierarchy, baseline-aligned system. Swiss caption keeps its intentional `7pt / 8pt` exception.

| Level | A4 Size | A4 Leading | Baseline Multiple | Weight |
|---|---:|---:|---:|---|
| `display` | 64pt | 72pt | 6x | Bold |
| `headline` | 30pt | 36pt | 3x | Bold |
| `subhead` | 20pt | 24pt | 2x | Regular |
| `body` | 10pt | 12pt | 1x | Regular |
| `caption` | 7pt | 8pt | 0.667x | Regular Italic |
| `fx` | 96pt | 96pt | 8x | Bold |

### Typography Scale Presets

| Value | Label |
|---|---|
| `swiss` | Swiss (Hand-tuned) |
| `golden` | Golden Ratio (phi) |
| `fibonacci` | Fibonacci (13, 21, 34, 55, 89) |
| `fourth` | Perfect Fourth (4:3) |
| `fifth` | Perfect Fifth (3:2) |

Default: `swiss`

Fibonacci maps the sequence `13, 21, 34, 55, 89` to `Caption`, `Body`, `Subhead`, `Headline`, and `Display`, with the default `21` normalized to the `10pt` body reference. In that default window, `Caption` uses `8pt` leading on the A4 `12pt` reference grid. Other Fibonacci leading values promote to the next baseline multiple whenever the initial baseline multiple would be smaller than the font size.
The Fibonacci rhythm row exposes `<` and `>` sequence controls. Moving the sequence shifts the five displayed Fibonacci values left or right while all values stay tied to the default `21 = 10pt` reference, so the typography rhythm visibly scales. The available displayed windows start at `8`, `13`, and `21`.

## Settings Panel (Left)

- The left panel begins directly with the parameter sections; the former title/reference block is not rendered in the panel layout.
- The left settings panel and right Project panel use the same shared width (`280px` on desktop, full width on mobile), side gutters, and top inset rhythm.
- The left panel does not auto-scroll or reposition when section headers are toggled.
- Preset browser mode hides the left settings panel.
- Section headlines use the shared spaced-uppercase headline style; opened section headlines use Swiss orange soft, while collapsed section headlines and left-panel parameter labels use neutral gray.
- Collapsed left-panel sections temporarily open on rollover, scroll into the visible panel area, and close again on hover-out; clicking a section toggle persists the open state.
- Left-panel settings sections render a full-width `#f3f4f6` divider at the bottom of each section; open sections use a darker gray background band while collapsed sections stay on the panel background.
- Supported dropdown controls preview hovered items live in the page while the menu is open; leaving or closing the menu restores the committed value until you select an option.
- Always-open dropdown-style list fields use a full-width option list with the parameter name as a headline above it.

### Canvas Ratio

#### Ratio options

| Label | Ratio | Decimal |
|---|---|---:|
| `DIN` | 1:sqrt(2) | 1.414 |
| `ANSI` | 1:1.294 | 1.294 |
| `Balanced` | 3:4 | 1.333 |
| `Photo` | 2:3 | 1.500 |
| `Screen` | 16:9 | 1.778 |
| `Square` | 1:1 | 1.000 |
| `Editorial` | 4:5 | 1.250 |
| `Wide Impact` | 2:1 | 2.000 |
| `Custom Ratio` | user-defined | derived from width:height |

#### Custom Ratio

- Available when `Ratio` is set to `Custom Ratio`
- Two floating-point ratio-unit inputs: `Width` and `Height`
- Range per field: min `0.1`, max `100`, step `0.001`
- Default: `4 : 5`
- Decimal point and decimal comma input are both accepted, so ratios like `2 : 1.414` or `2 : 1,414` are valid.
- Orientation is applied after the ratio pair.
- Export/preview dimensions are generated from the custom ratio at A4-equivalent area.

#### Orientation

- `portrait` (default from `default_v001.json`)
- `landscape`
- `Orientation` uses direct portrait/landscape icon buttons; hovering previews before click commit
- `Ratio` uses an always-open dropdown-style list field so every option is visible; list items preview live on rollover before click commit

#### Rotation

- min: `-180`
- max: `180`
- step: `1`
- default: `0`

### Baseline

- Grid unit options: `6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72`
- Default baseline in UI: **A4 baseline (12pt)**
- Dynamic max baseline protection remains active (ensures usable line count)

### Margins

#### Margin method

| ID | Label | Top | Left | Right | Bottom |
|---:|---|---:|---:|---:|---:|
| `1` | Progressive (1:2:2:3) | 1x | 2x | 2x | 3x |
| `2` | Van de Graaf (2:3:4:6) | 2x | 3x | 4x | 6x |
| `3` | Baseline (1:1:1:1) | 1x | 1x | 1x | 1x |
| `custom` | Custom Margins | user-defined | user-defined | user-defined | user-defined |

#### Custom Margins

- available as the last option in the `Margin Method` always-open dropdown-style list field
- per-side multipliers (`top,left,right,bottom`): min `1`, max `9`, step `1`
- selecting `Custom Margins` reveals the four side sliders
- actual custom margin = `sideMultiplier × gridUnit`
- `Margin Method` list items preview live on rollover before click commit

### Grid

- Columns (`gridCols`): min `1`, max `13`, step `1`, default `3` (from `default_v001.json`)
- Rows (`gridRows`): min `1`, max `13`, step `1`, default `6` (from `default_v001.json`)
- Gutter multiple: min `1.0`, max `4.0`, step `0.5`, default `1.0`
- Rhythms (`rhythm`): `fibonacci`, `golden`, `fifth`, `fourth`, `repetitive` (default)
- Rhythm list details: `Fibonacci` -> `13:21:34:55:89`, `Golden Ratio` -> `1:1.618`, `Perfect Fifth` -> `3:2`, `Perfect Fourth` -> `4:3`, `Repetitive` -> `1:1:1:1`
- `Rhythms` uses an always-open dropdown-style list field so every option is visible; list items preview live on rollover before click commit
- Non-repetitive direction dropdown items preview live on rollover before commit
- Non-repetitive rhythm rows:
  - enabled (`rhythmRowsEnabled`): `true|false` (default `true`)
  - direction (`rhythmRowsDirection`): `ltr` (`Left to right`) or `rtl` (`Right to left`) (default `ltr`)
- Non-repetitive rhythm cols:
  - enabled (`rhythmColsEnabled`): `true|false` (default `true`)
  - direction (`rhythmColsDirection`): `ttb` (`Top to Bottom`) or `btt` (`Bottom to top`) (default `ttb`)

### Typo

- `Base`: sets the default canvas rendering font for all paragraphs that do not have an explicit paragraph-level font override.
- `Rhythm`: selects the typography scale preset (see Typography Scale Presets).
- `Rhythm` uses an always-open dropdown-style list field so every option is visible; list items preview live on rollover before click commit
- The Fibonacci rhythm row shows direct `<` and `>` controls next to the label and the active sequence on the right, for example `Fibonacci < > 13, 21, 34, 55, 89`; clicking either control shifts the sequence while keeping the default `21 = 10pt` reference. The controls clamp to windows starting at `8` and `21`.
- Hierarchy overview: shows current `size/leading` for `Display`, `Headline`, `Subhead`, `Body`, and `Caption` on the active baseline/scale, and previews the hovered `Rhythm` preset while the list is active.
- Swiss on the A4 12pt reference baseline:
  - `Display`: `64pt / 72pt`
  - `Headline`: `30pt / 36pt`
  - `Subhead`: `20pt / 24pt`
  - `Body`: `10pt / 12pt`
  - `Caption`: `7pt / 8pt`
- `Custom` is paragraph-level only; when first selected in the text editor it copies the paragraph's currently resolved size and leading into `Custom Size` and `Custom Leading`.
- Paragraph text supports dynamic document variables in raw text:
  - `<%lorem%>` fills the current paragraph frame with fitted lorem ipsum
  - `<%project_title%>` resolves to the project metadata title
  - `<%page_title%>` resolves to the current page name
  - `<%page%>` uses the current physical page number; on facing spreads the right side resolves to `left + 1`
  - `<%pages%>` uses the total physical page count across single pages and facing spreads
  - `<%date%>` rendered as local `YYYY-MM-DD`
  - `<%time%>` rendered as local `HH:mm`
- Preview freezes `date` and `time` to the current preview session; PDF/SVG/IDML freeze them to the export run so all pages share one consistent timestamp.
- In text edit mode, placeholders stay visible as raw tokens in the edited paragraph; outside edit mode they render as live values.
- `Base` dropdown items preview live on rollover before commit.
- Settings-panel dropdowns open upward.
- Font dropdown groups: `Sans-Serif`, `Serif`, `Poster` (same grouping in left panel and popup editor).
- Available fonts:
  - Sans-Serif: [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans), [Inter](https://fonts.google.com/specimen/Inter), [Jost](https://fonts.google.com/specimen/Jost), [Work Sans](https://fonts.google.com/specimen/Work+Sans)
  - Serif: [Besley](https://fonts.google.com/specimen/Besley), [Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda), [EB Garamond](https://fonts.google.com/specimen/EB+Garamond), [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville)
  - Poster: [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)

### Color

- Selects the global base scheme for image placeholders.
- `BASE SCHEME`: uses a full-width always-open list with palette preview swatches on the right; list items preview live on rollover before click commit.
- `Background`: applies a page background color from the selected scheme using clickable swatches; clicking the active swatch toggles the background off. This setting is stored per page.
- `Background` swatches preview live on rollover before commit.
- Available schemes:
  - `Swiss Modern`: `#0b3536`, `#e5e7de`, `#0098d8`, `#fd8b7b`
  - `Stone Cyan`: `#35342f`, `#e1e0dd`, `#f1f2f0`, `#37bbe4`
  - `Fresh Contrast`: `#fef9f7`, `#1aa9bc`, `#457c39`, `#ffeb00`
- The text editor and image editor Color controls show a `COLOR` headline above the active color swatches, followed by the same open-list `BASE SCHEME` selector, and default to the current global selection.
- Image placeholders can also override swatch color and transparency directly in that Color section.

## Preview Header

The icon header renders as one full-width row above the left settings panel, preview canvas, and right settings panel. The `Smart Text Zoom` through `Project panel` icon group is centered over the preview column. Header icon buttons use the same active/inactive color logic as compact export popup buttons.
Multi-page layouts show a dark gray page-position line at the very top of the browser; single-page layouts and the presets browser do not show that line, and it has no underlying track color.
The header renders a vertical-more menu directly after the account icon; the menu contains `Dark Mode`/`Light Mode`, `Help`, `Feedback`, and `Legal Notice`. The former fixed footer in the left settings panel is not rendered.

### File Actions (icon buttons)

- `Presets` (layout-template icon): opens/closes the presets browser in the preview area
- When user layouts exist locally or through cloud sync, the `Users` section appears after bundled `Presets` and `Examples`
- The `Users` section header includes an info rollover describing local browser storage, browser-data clearing risk, and signed-in cloud sync
- User thumbnails in `Users` show a green status dot only while signed in and synced; signed-out, pending, and local-only states stay orange
- Deleting a user thumbnail asks for confirmation first, then removes it locally and displays whether the cloud delete was performed, queued, or unnecessary
- `Save` (save icon): opens Save to Library dialog; its status dot is red when the current project is not saved locally, orange when saved to the local Users library, and green only when the active saved project is signed in and cloud-synced
- `Import` (download icon): import project JSON or compressed `.swissgridgenerator` archive
- `Export` (upload icon): opens the export dialog
- `Save` and `Export` stay disabled until a preview layout is available.
- Divider placement: between `Export` and `Undo`
- `Esc` closes the presets browser without loading a preset

### Undo / Redo (icon buttons)

- `Undo` and `Redo` live in header
- keyboard:
  - `Cmd/Ctrl+Z` undo
  - `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redo

### UI + Preview Controls (icon toggles)

- `Smart Text Zoom` (zoom icon): enabled by default; when active, entering text edit mode zooms to the active paragraph, ordinary text/style edits keep the current zoom, frame-geometry changes (`Rows`, `Baselines`, `Cols`) refit it, and leaving text edit restores full-page fit
- Order: Smart Text Zoom appears to the left of the display toggles

### Display Options (icon toggles)

- Baselines
- Margins
- Gutter/modules
- Typo
- Image placeholders
- Project panel toggle (layers icon)
- Divider placement: Smart Text Zoom and baselines are separated by a divider
- Divider placement: image placeholders and the Project toggle are separated by a divider
- Baselines, margins, gutter/modules, typo, and image placeholders stay disabled until a preview layout is available.

### Sidebar Panels And More Menu

- `Layers` (layers icon): opens the right sidebar Project panel
- `Information` (`i` icon): toggles rollover info/tooltips globally
- Shortcuts: `Cmd/Ctrl+Shift+P` toggles the Project sidebar, `Cmd/Ctrl+Shift+I` toggles Information
- `Account` (user icon): opens the right sidebar cloud account panel and shows a green status dot only when the user is signed in and cloud sync is fully up to date; otherwise the dot stays orange
- `More` (vertical ellipsis icon): opens a submenu with `Dark Mode`/`Light Mode`, `Help`, `Feedback`, and `Legal Notice`
- `Dark Mode`/`Light Mode`: toggles dark UI for headers/panels/sidebars, preview shell background, and popup editor
- `Help`: opens help/reference panel
- `Feedback`: opens the right sidebar feedback panel
- `Legal Notice`: opens the right sidebar legal notice panel
- `Presets` (layout-template icon): opens preset thumbnails in the preview area
- Behavior: only one right sidebar panel can be open at a time; clicking the active panel icon closes that panel.
- Behavior: while presets are open, the left settings panel and header Project toggle are disabled.

### Project Panel

- `Title`: editable project title; also drives the default project JSON filename stem.
- Project panel section headlines use the same neutral gray as the shared inactive section-header style.
- The Project panel uses the same shared width (`280px` on desktop, full width on mobile), side gutters, and top inset rhythm as the left settings panel.
- The compact project-title row shows the real project title plus an edit/close button.
- Double-clicking the compact project title toggles the metadata section. Opening it focuses and selects the `Title` field immediately.
- The expanded metadata section contains editable `Title`, `Subject`, and `Author` fields together.
- The pages controls sit under a dedicated `P A G E S` section headline above the `Page` row; the headline carries the list icon, and single-clicking the full headline row returns from a page submenu to the page list. When the project contains only one page, this headline becomes `P A G E`, the `+` page action moves into the headline, and the separate `Page` navigation row is hidden.
- Project header includes a small `i` toggle that shows or hides the document info text; when inactive no collapsed summary is shown.
- `Page`: the row uses regular sidebar text styling; the counter shows current physical page and total physical pages, and double-clicking the current number opens an inline jump field capped by the total page count.
- Page navigation chevrons are grouped tightly as `<<`/`<` and `>`/`>>` pairs.
- In page list view, single-clicking a page row selects and displays it while keeping the list open. Double-clicking a page row, or clicking its open toggle, opens that page's inline layer list. Page rows can be dragged to reorder and expose rename/delete controls when opened.
- Opening the Project panel for a layout with more than one page starts in page list view.
- `+` inserts a clean page after the active page, preserving page settings/layout mode without copied layer content; `Shift` + `+` inserts a full duplicate with content.
- Page creation is capped at `1000` pages per project.
- `Facing pages`: one-way control inside an opened page row, positioned above `L A Y E R S`. It converts the current page into a true spread. The preview becomes a zero-gap `Doppelseite`, inner/outer margins mirror automatically, and the effective column count doubles across the spread.
- `Page Up` selects the previous project page, `Page Down` selects the next one, `Shift` + `Page Up` / `Shift` + `Page Down` jump by `10` pages, and `Home` / `End` jump to the first or last page when multiple pages exist.
- Loading or switching to another page keeps the previous preview hidden until the target page snapshot and first final plan commit are complete, so partial intermediate geometry is never shown.
- After conversion, the spread remains one project page and edits inside one continuous spread coordinate space.
- Single-clicking a page row in list view selects that page without leaving list view.
- Double-clicking a page row opens its inline layer list and aligns the opened page to the top of the panel. Closing it returns to the page list at the same page position.
- Each page row also has an open toggle that opens that page's layers inline.
- Newly added pages open automatically.
- Every page stores its own settings payload plus preview layout state.
- Project JSON can also carry an optional `tour` block for guided onboarding that steps through pages, layers, help, and editor targets.
- Expanded page rows show a `L A Y E R S` headline and divider above the mixed text/image stack for that page using current `layerOrder`.
- Text cards display a single rendered text preview row in the paragraph font and text color.
- Image cards display a full-width color rectangle instead of the `Image Placeholder` label.
- Hovering an active-page layer card mirrors the same active preview rollover/guides for that block.
- Hovering an active-page layer card temporarily routes keyboard layer nudging to that hovered layer; leaving the card restores keyboard nudging to the selected layer.
- Hovered text paragraphs in preview expose a `+` affordance: click duplicates the paragraph through the same placement path as dragging, even after switching pages. `Shift` + click copies `Paragraph` settings, `Alt/Option` + click copies `Typo` settings, and `Alt/Option` + `Shift` + click copies both. The next click on a paragraph applies the copied settings, even across pages and loaded layouts.
- Hovered image placeholders expose a `+` affordance for duplication.
- Dragging active-page layer cards changes z-index using a visible insertion marker between cards.
- Single-clicking an active-page layer card selects that layer; double-clicking opens or retargets its editor.
- Layer cards include a lock toggle to the left of delete. Clicking it locks or unlocks that layer; double-clicking applies the same lock state to every layer on the page. Locked layers stay visible in the stack and still show preview rollover guides and their unlock affordance, but editing, duplication, deletion, and movement stay disabled until unlocked.
- Selecting a layer card also highlights the corresponding layer in preview; selecting in preview scrolls the matching card into view in the panel. Preview rollover follows matching layer cards only outside edit mode.
- Deleting from the panel removes the layer from the active page and saved project JSON.
- In multi-page projects, the `P A G E S` section headline single-clicks across the full row to show the page list.
- Text and image editor section headers follow the same rule inside edit mode: single-click toggles one section, double-click opens or closes all sections.
- Editor panels use the section move-to rule: opening a section aligns that section shell to the top of the panel, closing a section can move back to the nearest still-open section above, and double-click closing all sections returns the panel to the default top-aligned state. The left settings panel does not auto-scroll when section headers are toggled.

### Support And Legal

- `Feedback` and `Legal Notice` live in the header More submenu and remain active even while the presets browser is open.
- The current app version appears at the end of the Help page.

When `i` is active, header icons show rollover tooltips with a second line for keyboard shortcuts (including Undo/Redo).

### Header Keyboard Shortcuts

- `Cmd/Ctrl+O`: Import project JSON or `.swissgridgenerator`
- `Cmd/Ctrl+S`: Save to Library
- `Cmd/Ctrl+Shift+E`: Open export popup
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`: Redo
- `Cmd/Ctrl+Shift+D`: Toggle dark mode
- `Cmd/Ctrl+Shift+B`: Toggle baselines
- `Cmd/Ctrl+Shift+M`: Toggle margins
- `Cmd/Ctrl+Shift+G`: Toggle modules/gutter
- `Cmd/Ctrl+Shift+T`: Toggle typography
- `Cmd/Ctrl+Shift+J`: Toggle image placeholders
- `Cmd/Ctrl+Shift+P`: Toggle project sidebar
- `Cmd/Ctrl+Shift+I`: Toggle information
- `Cmd/Ctrl+Shift+H`: Toggle help sidebar
- `Cmd/Ctrl+Shift+3`: Toggle legal notice sidebar
- `Cmd/Ctrl+Shift+4`: Toggle presets browser
- `Page Up`: Select previous project page
- `Page Down`: Select next project page
- `Home`: Select first project page
- `End`: Select last project page
- `Esc`: Close presets browser without loading a preset

## Popups

### Save to Library dialog

- Project Title input
- Subject input
- Author input
- Stores the project in the local Users library as a gzip-compressed archive
- Confirm/Cancel

### Export dialog

- Format buttons: `JSON`, `PDF`, `SVG`, `IDML`; labels, extensions, bleed capability, filename extension replacement, and vector format availability are resolved from one shared export format options table.
- Display toggles: baselines, margins, modules, typography, image placeholders
- Metadata fields are displayed directly in the compact export form
- Metadata fields are available for all formats:
  - Project Title
  - Subject
  - Author
- `JSON` export writes a standard editable `.json` project document
- JSON exports use `.json`
- `Pages` range input appears only for multipage projects
  - default selection is the full project page range
- All export formats use each page's stored document size
  - no paper-size override controls
  - no custom width override controls
- All export formats stay vector-based
- `JSON` exports the selected page range as an editable project document with metadata and current layout state
- `PDF`, `SVG`, and `IDML` preserve available project metadata in their format-specific metadata containers
- `PDF`, `SVG`, and `IDML` share one vector bleed control:
  - bleed defaults to off
  - width is entered in millimeters and restores `3mm` when activated from an empty or non-positive value
  - export internals convert millimeters to one shared `ExportBox` in points
  - the shared `ExportBox` owns trim, bleed, media canvas, export origin, crop-mark line geometry, and guide clipping for all three vector formats
  - enabled bleed extends the visible production area through bleed, adds a fixed white crop-mark canvas outside bleed, and adds black crop marks targeting the trim corners, while trim layout math stays unchanged
  - no dashed bleed guide is exported
- `PDF`, `SVG`, and `IDML` render typography from shared glyph-outline geometry, so exported text is frozen as non-live vector geometry in the normal export path
- `IDML`:
  - exports the selected page range
  - keeps each page at its stored document size
  - freezes typography into outlined/non-live geometry
- Filename input
- `PDF` exports RGB vector geometry with an embedded sRGB output intent
- `SVG`:
  - converts typography to exact glyph outlines, so exported text is not live-editable
- Confirm/Cancel
- `Esc` closes the popup when idle and cancels a running export at the next safe checkpoint
- Clicking outside the popup follows the same rule as `Esc`

### Feedback panel

- Required email field, prefilled from the signed-in account when available
- Required comment field
- Up to three small screenshot attachments
- Optional checkbox to attach the recent local cloud activity log for support
- Submits feedback messages and screenshots to Supabase

### Cloud Account panel

- Cloud sync status line
- `STATUS` shows `Not connected` while signed out
- `STATUS` expands/collapses the local cloud activity log
- Expanded status shows the latest event timestamp and recent local events
- Signed-in users get a `Sync Now` action in the expanded status section
- Email input for email-code sign-in while signed out
- Six-digit code input after a sign-in code is sent
- Signed-in email display while authenticated
- `Send Code`
- `Verify Code`
- `Sign Out`
- Auth and cloud-sync failures are mapped to user-facing guidance for rate limits, permissions, offline state, session expiry, and setup errors
- Signed-in sessions request throttled background sync on app focus, visible-tab return, and preset browser open
- Hidden-tab and page-close transitions trigger a best-effort local autosave flush and a best-effort cloud sync for already-saved user-library projects

## Paper Size Sets

### DIN ratio family

- A6, A5, A4, A3, A2, A1, A0
- B6, B5, B4, B3, B2, B1, B0

### ANSI ratio family

- LETTER, LEGAL, ANSI_B, ANSI_C, ANSI_D, ANSI_E

### Single-size ratio families

- BALANCED_3_4
- PHOTO_2_3
- SCREEN_16_9
- SQUARE_1_1
- EDITORIAL_4_5
- WIDE_2_1

## Text Editing + Placement

- Double-click text block to open editor
- Double-click empty module creates a paragraph in the clicked module with hyphenation off by default.
- Holding `1..5` while double-clicking empty module sets the new paragraph hierarchy: `1 Caption`, `2 Body`, `3 Subhead`, `4 Headline`, `5 Display`.
- New hierarchy paragraphs start with fixed module geometry and clamp to the available columns from the clicked module: Caption `1 row / 1 col`, Body `1 row / 2 cols`, Subhead `1 row / 2 cols`, Headline `1 row / 3 cols`, Display `1 row / 3 cols`.
- Drag to move; paragraphs and image placeholders respect `Snap to Columns (X)` and use module-top Y snapping by default when `Snap to Baseline (Y)` is enabled
- With a selected unlocked layer and no active editor field, arrow keys nudge the layer through the same logic: snapped X moves by columns, snapped Y moves by module rows by default, `Shift` uses baseline rows, and unsnapped axes move in tenth-step logical increments with `Shift` as a 10x multiplier
- With `Snap to Columns (X)` off, free horizontal placement may overhang one column into either side margin.
- Hover shows style/span/alignment tooltip when `i` is active

Editor controls:
- left sidebar editor that replaces layout settings while edit mode is active
- text editor sections: `Paragraph`, `Typo`, `Symbols`, `Placeholders`, `Info`
- image editor sections: `Geometry`, `Color`, `Info`
- while edit mode is active, preview hover stays visible on other unlocked existing blocks and clicking one retargets the already open editor; preview hover does not move or highlight Project panel layer cards
- locked layers still participate in preview rollover for guides and unlocking, but drag, edit, duplicate, delete, and editor retarget/open behavior stay disabled until unlocked from the Project panel
- the text editor header uses the same user-facing layer label shown in the Project panel instead of the internal paragraph id
- Paragraph section:
  - rows
  - baselines
  - cols
  - horizontal alignment (`left`, `center`, `right`)
  - vertical alignment (`top`, `center`, `bottom`)
  - reflow (`On` / `Off`, available only when cols > 1)
  - hyphenation (`On` / `Off`)
  - `Snap to Columns (X)` (`On` / `Off`)
  - `Snap to Baseline (Y)` (`On` / `Off`)
  - rotation (`-180..180`, integer degrees)
- paragraph and placeholder height resolve as `rows + baselines`
- `rows` may be `0` when `baselines > 0`
- `Baselines` is a dropdown from `0` to the current document's `baselines per grid module`
- text `Rows`, `Baselines`, and `Cols` dropdown items preview live on rollover before commit
- increasing paragraph `Cols` preserves the current anchored column even when the wider frame intentionally overhangs the page edge
- vertical alignment offsets the line stack inside the selected paragraph frame in baseline increments
- Typo section:
  - font family
  - font cut
  - hierarchy (`Typo`)
  - Custom size / Custom leading when `Custom` is selected
  - kerning (`Optical` / `Metric`, default `Optical`)
  - tracking numeric input (`-120..+300`, `1/1000 em`)
  - color scheme selector
  - color swatches
- text `font family`, `font cut`, `hierarchy`, and `color scheme` dropdown items preview live on rollover before commit
- Symbols section:
  - inserts symbols at the current caret or over the current selection
  - grouped sets: `Arrows`, `Bullets`, `Marks`, `Math`, `Geometry`, `Editorial`
  - recent symbols appear above the grouped palette after first use
  - inserted symbols remain normal paragraph text and receive a run-level `Noto Sans Symbols 2` font assignment
- Placeholders section:
  - lists all available document-variable tokens
  - inserts the clicked token at the current caret or over the current selection
  - `<%lorem%>` fills the active paragraph frame according to its rows, baselines, columns, reflow, and hyphenation settings
- image Color section:
  - color scheme selector
  - color swatches
  - transparency
- image Geometry section:
  - rows
  - baselines
  - cols
  - `Snap to Columns (X)` (`On` / `Off`)
  - `Snap to Baseline (Y)` (`On` / `Off`)
  - rotation (`-180..180`, integer degrees)
- the image editor header shows `IMAGE` plus the current placeholder swatch color
- image `Rows`, `Baselines`, `Cols`, and `color scheme` dropdown items preview live on rollover before commit
- Info section: geometry, type/color summary, counts, and `Max/Line`
- section headers single-click to toggle one section; double-click opens or closes all editor sections
- newspaper reflow is available only with cols > 1
- reflow with cols > 1: newspaper flow across configured columns, exhausting the selected `rows + baselines` height before moving to the next column
- overflow is reported only for active newspaper reflow; ordinary paragraphs continue drawing their full text even when it exceeds the selected row height
- font cut uses the available family-specific weight/style list
- tracking applies letter-spacing, not horizontal scaling
- tracking is stored in `1/1000 em`
- selection-aware styling is supported for:
  - font family
  - font cut
  - hierarchy
  - color
  - tracking
- paragraph-wide defaults are rebased when the current selection covers the full text or no range is selected
- textarea preview mirrors font family, selected cut, paragraph alignment, and the current frame-relative text position
- live `Characters`, `Words`, and `Max/Line` counts in the Info section
- inline caret and selection are rendered from the current text geometry, not DOM line boxes
- inline caret blinks while the text editor is focused with a collapsed selection
- double-click inside inline text edit selects the clicked word
- triple-click inside inline text edit selects the containing sentence
- `Alt+A` and `Cmd/Ctrl+A` select the whole paragraph while inline text edit is active
- `Arrow Left` / `Arrow Right` move the caret by the editor's own selection model, and `Arrow Up` / `Arrow Down` / `Home` / `End` follow the rendered line geometry
- repeated spaces and blank lines are preserved in the source model
- soft-wrap boundary spaces stay in the source text but do not render as visible indent at the start of the next visual line

Font behavior:
- If a paragraph font is set to the current `Base Font`, it is stored as inherited (no explicit override entry).
- If a paragraph font differs from `Base Font`, it is stored as an explicit paragraph override.
- Changing `Base Font` re-renders the preview immediately for inherited paragraphs only.
- Preview, thumbnails, drag previews, edit-mode geometry, and vector export planning use deterministic font-file metrics from local strict font assets:
  - `public/fonts/google/<slug>/regular.ttf`
  - `public/fonts/google/<slug>/bold.ttf`
  - `public/fonts/google/<slug>/italic.ttf`
  - `public/fonts/google/<slug>/bolditalic.ttf`
- Browser canvas text metrics are diagnostics only; they are not the production source for text wrapping, drag/edit geometry, thumbnail layout, or export plans.
- Asset sync routine:
  - `npm run fonts:sync` (reads `lib/config/fonts.ts` and rebuilds local Google font assets)
- Asset verification routine:
  - `npm run fonts:verify` (checks every configured family/cut path referenced by `lib/config/fonts.ts`)
- `npm run fonts:verify` runs as part of `assets:generate`; missing configured font assets are build-time errors, not runtime export fallbacks.
- Export warms document-used metric and fallback/export font faces in the background after project changes and when the export dialog opens. It does not preload all bundled fonts.

Syllable division behavior:
- Stored per paragraph in `blockSyllableDivision`.
- Default is `true` for `body` and `caption`.
- Default is `false` for other blocks unless explicitly enabled.
- Applied in both canvas preview and PDF export wrapping.

Drag behavior:
- Default drag moves a paragraph.
- Hovered text paragraphs expose a `+` affordance: click duplicates the paragraph through the same placement path as dragging, even after switching pages. `Shift` + click copies `Paragraph` settings, `Alt/Option` + click copies `Typo` settings, and `Alt/Option` + `Shift` + click copies both. Click another paragraph to apply the copied settings, even across pages and loaded layouts.
- Hovered image placeholders expose a `+` affordance for duplication.
- Paragraphs and image placeholders are stored as logical anchors: `{ column, row, baselineOffset }`.
- Paragraphs and image placeholders also persist independent `Snap to Columns (X)` and `Snap to Baseline (Y)` flags. When either axis snap is off, the corresponding `column` and/or `baselineOffset` value may remain fractional while the logical row anchor stays stable.
- With `Snap to Columns (X)` off, horizontal placement clamps symmetrically: one-column side-margin overhang remains available on both left and right.
- Paragraph and image-placeholder rotation is stored independently per layer.
- With `Snap to Baseline (Y)` on, default paragraph and image-placeholder drag snap Y to the nearest module top.
- Holding `Shift` (or `Ctrl`) during paragraph or image-placeholder drag temporarily snaps the Y position to the nearest baseline row.
- Image placeholders now use the same X/Y drag resolution model as paragraphs, while keeping their own span, height, color, opacity, and rotation controls.
- Hovering a paragraph reveals the edit affordance at the paragraph's exact top-left origin so very shallow frames remain reachable.

## Grid Change Reflow Logic

Structural changes do not auto-reposition existing paragraphs or image placeholders anymore.

Behavior:
1. Text paragraphs and image placeholders store logical anchors as `{ column, row, baselineOffset }`.
2. Increasing columns or rows preserves those anchors exactly.
3. Decreasing columns or rows is blocked when any paragraph or image placeholder would fall outside the proposed grid or span.
4. Invalid reductions keep the current grid unchanged.
5. Invalid reductions show a temporary preview warning instead of a blocking dialog.
6. Users must reposition or delete conflicting items manually before reducing the grid.

## Export Format Notes

- JSON: full UI + preview layout state.
- PDF: vector selected-range output with RGB geometry, embedded sRGB output intent, optional shared bleed plus white crop-mark canvas and black crop marks, grouped guide vectors, shared glyph-outline typography, and stored page geometry per exported page.
- SVG: single-page vector output with optional bleed plus white crop-mark canvas bounds, black crop marks, and typography converted to exact glyph outlines plus guides and placeholders, or a ZIP with one SVG per selected page for multi-page ranges; exported text is not live-editable.
- IDML: selected-range export with optional document bleed, slug/crop-mark canvas, black crop marks, one InDesign page per app page, and separate `Guides`, `Typography`, and `Placeholders` layers; guide lines and crop marks are stroked `GraphicLine` items, while exported text is frozen as geometry rather than live text.
- PDF, SVG, and IDML share the same `ProjectExportRunner` / `ExportEngine` entry path, consume the same canonical `PageExportPlan` data, and use the same `ExportBox` geometry for bleed/media/crop output and guide clipping.
- Browser PDF, SVG, and IDML actions also share one vector export action wrapper. That wrapper resolves base filenames, format-specific output names, SVG ZIP packaging, progress forcing, and download handoff from the same format options table before calling the shared project export runner.
- Long exports can be partitioned into deterministic page sets by the export engine. SVG and IDML use this page-set boundary for worker-backed browser artifact generation; final assembly remains ordered by page index.
- SVG and IDML use one shared export-engine worker scheduler for page-set dispatch, cancellation, progress, ordered result collection, and single-worker archive/package handoff. Format code remains responsible only for its request payload and serialized output.
- SVG and IDML page-set artifacts may be reused from a bounded in-memory LRU cache only when the serialized page-set request matches exactly. Cached IDML artifacts are cloned before reuse because package-worker transfer detaches typed-array buffers.
- Export status shows preparation, rendering, finalization, and percentage through the popup action button and top progress rail. Progress updates are non-blocking for the export engine.

## JSON UI Fields (serialized)

`canvasRatio`, `customRatioWidth`, `customRatioHeight`, `format`, `exportPaperSize`, `orientation`, `rotation`, `marginMethod`, `gridCols`, `gridRows`, `gutterMultiple`, `rhythm`, `rhythmRowsEnabled`, `rhythmRowsDirection`, `rhythmColsEnabled`, `rhythmColsDirection`, `typographyScale`, `baseFont`, `imageColorScheme`, `canvasBackground`, `customBaseline`, `displayUnit`, `useCustomMargins`, `customMarginMultipliers`

Notes:
- Export bleed is session/export-run state, not serialized per page. The default is centralized in `DEFAULT_EXPORT_BLEED_OPTIONS`.
- Project-level visibility state is serialized once at layout root in `visibilitySettings`: `showBaselines`, `showModules`, `showMargins`, `showImagePlaceholders`, and `showTypography`. It is not stored per page.
- Session-only GUI state is not serialized into layout JSON. That includes `showLayers` and settings-panel `collapsed` state.
- Saved layout JSON no longer stores `activePageId`; loaded projects always open on `pages[0]`.

## JSON Preview Layout Fields (current)

`blockOrder`, `textContent`, `blockTextEdited`, `styleAssignments`, `blockFontFamilies`, `blockFontWeights`, `blockOpticalKerning`, `blockTrackingScales`, `blockTrackingRuns`, `blockTextFormatRuns`, `blockColumnSpans`, `blockRowSpans`, `blockHeightBaselines`, `blockTextAlignments`, `blockTextReflow`, `blockSyllableDivision`, `blockItalic`, `blockRotations`, `blockCustomSizes`, `blockCustomLeadings`, `blockTextColors`, `blockModulePositions`, `blockSnapToColumns`, `blockSnapToBaseline`, `lockedLayers`, `layerOrder`, `imageOrder`, `imageModulePositions`, `imageColumnSpans`, `imageRowSpans`, `imageHeightBaselines`, `imageColors`, `imageOpacities`

Notes:
- `blockFontFamilies` is an override map and may omit paragraphs inheriting `baseFont`.
- `blockModulePositions` and `imageModulePositions` are stored as logical anchors `{ column, row, baselineOffset }`; paragraph anchors may carry fractional `column` and/or `baselineOffset` values when X or Y snapping is disabled; legacy absolute `{ col, row }` values are normalized on load.
- `blockSnapToColumns` and `blockSnapToBaseline` store the paragraph-level X/Y snap state. Omitted values default to `true`.
- `lockedLayers` stores per-layer lock state. Omitted entries are unlocked.
- `blockRowSpans` / `imageRowSpans` store the module-row component of block height, while `blockHeightBaselines` / `imageHeightBaselines` store the additional baseline component.
