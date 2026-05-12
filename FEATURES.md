# Feature Inventory

Current capability inventory for Swiss Grid Generator.

## Document Model

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

## Grid System

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

## Typography

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

## Text Editing

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

## Placement and Layers

- Double-click empty module to create a text paragraph with hyphenation off by default.
- Hold `1..5` while double-clicking empty module to create a paragraph as `Caption`, `Body`, `Subhead`, `Headline`, or `Display`; new hierarchy blocks use disciplined starting frames: Caption `1x1`, Body/Subhead `1x2`, Headline/Display `1x3`, clamped to the remaining columns from the clicked module.
- `Shift` + double-click empty module to create an image placeholder (`Ctrl` fallback).
- Paragraph creation uses the actual clicked module rather than the nearest module center.
- Drag paragraphs and placeholders to move them.
- Hovered text paragraphs expose a `+` affordance: click duplicates the paragraph through the same placement path as dragging, even after switching pages; `Shift` + click copies `Paragraph` settings, `Alt/Option` + click copies `Typo` settings, and `Alt/Option` + `Shift` + click copies both for transfer onto another paragraph, even across pages and loaded layouts.
- Hovered image placeholders expose a `+` affordance for duplication.
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

## Image Placeholders

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

## Presets

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

## Export

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

## UI and Workflow

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

## Cloud Sync

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
