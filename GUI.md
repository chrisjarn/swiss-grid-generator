# GUI.md — swiss grid generator interface map

## purpose

`GUI.md` is the handoff map for gui design and implementation. It defines the current interface as a precise component system: information hierarchy, workspace regions, component inventory, expected states, and code ownership.

The interface is a professional typography instrument. The gui must support exact composition, deterministic preview, and calm repeated use. It must not behave like a generic design canvas or marketing interface.

`PageExportPlan` remains the source of truth for layout. Preview, thumbnails, PDF, SVG, and IDML consume the same plan. Gui components may expose controls and render planned output; they must not create a second layout model.

## visual system rules

- use structure before decoration.
- every stroke, border, icon, color, and divider must have a functional reason.
- use color only for state, action, warning, selection, or status.
- keep spacing aligned to the 8px / 4px interface rhythm.
- keep controls stable; hover previews must not create layout jumps.
- author ui copy in normal sentence/label case: labels, buttons, help text, tooltips, and status messages.
- apply lowercase presentation in the gui through CSS, not by lowercasing source strings.
- preserve required source casing for file formats, code identifiers, keyboard shortcuts, serialized values, and imported names.
- use sharp geometry, restrained borders, and flat tactile surfaces.
- avoid decorative gradients, gloss, arbitrary shadows, large rounded containers, and ornamental imagery.

## information architecture

```mermaid
mindmap
  root((SGG))
    project
      metadata
        title
        subject
        author
      pages
        page parameters
          id
          ratio
          baseline
          margins
          grid
          typography
          color
          facing
          rotation
        layers
          text
            layer parameters
              geometry
              typography
              symbols
              placeholders
              info
          image
            layer parameters
              geometry
              color
              info
    workspace
      shell
        top bar
        left settings
        preview field
        right panel
      preview
        canvas
        overlays
        guides
        inline editor
      panels
        settings
        project
        help
        feedback
        account
        legal
      dialogs
        save
        export
        notice
      shared ui
        buttons
        labels
        selects
        sliders
        switches
        tooltips
```

```mermaid
flowchart LR
  app["webapp/app\nnext boundary"] --> shell["webapp/gui/shell\nworkspace frame"]
  shell --> preview["webapp/gui/preview\nplanned canvas and overlays"]
  shell --> settings["webapp/gui/panels/settings\npage parameters"]
  shell --> sidebar["webapp/gui/panels/sidebar\nproject and support panels"]
  shell --> dialogs["webapp/gui/dialogs\nmodal workflows"]
  preview --> editors["webapp/gui/editors\ntext and image editing"]
  settings --> shared["webapp/shared/ui\nprimitive controls"]
  sidebar --> shared
  dialogs --> shared
  editors --> shared
  preview --> plan["PageExportPlan\ncanonical layout plan"]
```

## workspace regions

| region | purpose | visible components | expected states | interaction notes | code ownership |
|---|---|---|---|---|---|
| top bar | global workspace commands and display toggles | file actions, undo/redo, display toggles, sidebar toggles, account, more menu | default, active, disabled, synced, unsynced, hover, focus | icons carry the command; tooltips provide names and shortcuts when information is active | `webapp/gui/shell` |
| left settings panel | page-level parameters for the active page | ratio, orientation, baseline, margins, grid, typography, color | collapsed, expanded, hover-preview, committed, disabled while unavailable | dropdown/list hover may preview values and must restore committed state on close | `webapp/gui/panels/settings` |
| preview canvas | planned page rendering and direct manipulation | page, baselines, margins, modules, typography guides, image placeholders, hover affordances | loading, ready, editing, dragging, zoomed, locked layer hover, hidden during page settle | renders planned geometry; does not own layout calculation | `webapp/gui/preview` |
| right project panel | project structure, pages, layers, metadata, support panels | title, metadata, page list, layer list, help, feedback, account, legal notice | closed, open, active page, opened page row, selected layer, locked layer, sync states | only one right panel is active at a time; layer rows mirror preview selection | `webapp/gui/panels/sidebar` |
| editors | focused layer editing | text editor panel, image editor panel, inline textarea, section controls | open, closed, retargeted, dirty draft, committed, locked-disabled | editor state must preserve the active layer contract and avoid outside-pointer loss | `webapp/gui/editors` |
| dialogs | blocking or export/save workflows | save library, export, notice, export preview | idle, confirming, exporting, cancellable, error, success | modal surfaces are functional tools, not decorative cards | `webapp/gui/dialogs` |

## component inventory

### shell components

| component | design responsibility | path |
|---|---|---|
| shell | overall workspace composition and state handoff | `webapp/gui/shell/Shell.tsx` |
| top bar | compact icon-command row, status dots, menu entry points | `webapp/gui/shell/TopBar.tsx` |
| left toolbar | left-side settings container placement | `webapp/gui/shell/LeftToolbar.tsx` |
| right panel | right-side panel placement and width rhythm | `webapp/gui/shell/RightPanel.tsx` |
| canvas container | preview workspace mount point | `webapp/gui/shell/CanvasContainer.tsx` |

### preview components

| component | design responsibility | path |
|---|---|---|
| grid preview | production interaction canvas and preview orchestration | `webapp/gui/preview/GridPreview.tsx` |
| canvas stage | canvas stack, inline editor position, and help line placement | `webapp/gui/preview/GridPreviewCanvasStage.tsx` |
| overlays | text/image editor overlays and active editor panels | `webapp/gui/preview/GridPreviewOverlays.tsx` |
| feedback | transient preview warnings and status messages | `webapp/gui/preview/GridPreviewFeedback.tsx` |
| preview workspace | page field plus side panels and project overlays | `webapp/gui/preview/PreviewWorkspace.tsx` |
| swiss canvas | plan-only canvas foundation | `webapp/gui/preview/SwissCanvas.tsx` |

### settings panels

| component | design responsibility | path |
|---|---|---|
| settings shell | left panel section order and collapsed/open behavior | `webapp/gui/panels/settings/SettingsSidebarPanels.tsx` |
| panel card | section container, header, help affordance, divider rhythm | `webapp/gui/panels/settings/PanelCard.tsx` |
| canvas ratio | ratio, orientation, and rotation controls | `webapp/gui/panels/settings/CanvasRatioPanel.tsx` |
| baseline | baseline value control and unit display | `webapp/gui/panels/settings/BaselineGridPanel.tsx` |
| margins | margin method and custom multiplier controls | `webapp/gui/panels/settings/MarginsPanel.tsx` |
| grid/gutter | grid density, rhythm, direction, and gutter controls | `webapp/gui/panels/settings/GutterPanel.tsx` |
| typography | base font, scale rhythm, and hierarchy overview | `webapp/gui/panels/settings/TypographyPanel.tsx` |
| color | base scheme and page background controls | `webapp/gui/panels/settings/ColorSchemePanel.tsx` |

### sidebar panels

| component | design responsibility | path |
|---|---|---|
| pages panel | page list, page controls, layer entry points | `webapp/gui/panels/sidebar/PagesPanel.tsx` |
| layer list | text/image layer rows, locking, deletion, reordering | `webapp/gui/panels/sidebar/ProjectPageLayersList.tsx` |
| project title | compact title, metadata opening, close affordance | `webapp/gui/panels/sidebar/ProjectTitleSection.tsx` |
| metadata | title, subject, author fields | `webapp/gui/panels/sidebar/ProjectMetadataSection.tsx` |
| presets | preset and user layout browser | `webapp/gui/panels/sidebar/PresetLayoutsPanel.tsx` |
| account | auth and sync state surface | `webapp/gui/panels/sidebar/AccountPanel.tsx` |
| help | reference and guided help content | `webapp/gui/panels/sidebar/HelpPanel.tsx` |
| feedback | support message and screenshot attachment surface | `webapp/gui/panels/sidebar/FeedbackPanel.tsx` |
| legal | legal notice content | `webapp/gui/panels/sidebar/LegalNoticePanel.tsx` |

### editor panels

| component | design responsibility | path |
|---|---|---|
| text editor panel | paragraph, typography, symbols, placeholders, info | `webapp/gui/editors/TextEditorPanel.tsx` |
| image editor dialog | image geometry, color, transparency, info | `webapp/gui/dialogs/ImageEditorDialog.tsx` |
| inline textarea | direct text editing over planned text geometry | `webapp/gui/editors/InlineBlockTextarea.tsx` |
| editor section | shared editor section header and help behavior | `webapp/gui/panels/EditorSidebarSection.tsx` |
| color controls | editor-local color scheme and swatch controls | `webapp/gui/editors/EditorColorSchemeControls.tsx` |

### dialogs

| component | design responsibility | path |
|---|---|---|
| workspace dialogs | central dialog router for save, export, notices | `webapp/gui/dialogs/WorkspaceDialogs.tsx` |
| save library | local/cloud library metadata workflow | `webapp/gui/dialogs/SaveLibraryDialog.tsx` |
| export | format, metadata, range, bleed, progress, cancellation | `webapp/gui/dialogs/ExportDialog.tsx` |
| export preview | compact export preview canvas | `webapp/gui/dialogs/ExportPreviewCanvas.tsx` |
| notice | confirmation and risk messaging | `webapp/gui/dialogs/NoticeDialog.tsx` |

### shared primitives

| primitive | design responsibility | path |
|---|---|---|
| button | command surface and compact action variants | `webapp/shared/ui/button.tsx` |
| header icon button | top bar icon command with tooltip and status dot | `webapp/shared/ui/header-icon-button.tsx` |
| label | form labels and parameter labels | `webapp/shared/ui/label.tsx` |
| select | dropdown and top-opening select behavior | `webapp/shared/ui/select.tsx` |
| slider | numeric continuous or stepped value control | `webapp/shared/ui/slider.tsx` |
| switch | binary setting control | `webapp/shared/ui/switch.tsx` |
| tooltip | hover and focus explanation surface | `webapp/shared/ui/hover-tooltip.tsx` |
| section header row | panel section headline, value, action, status dot | `webapp/shared/ui/section-header-row.tsx` |
| help indicator line | active help marker line | `webapp/shared/ui/help-indicator-line.tsx` |
| font select | grouped font selection control | `webapp/shared/ui/font-select.tsx` |

## designer checklist

### typography

- ui labels and help copy are authored in normal sentence/label case and rendered lowercase by the gui CSS layer.
- section headlines may use spacing, weight, and color for hierarchy; casing is still controlled by the gui CSS layer.
- hierarchy is built through size, weight, spacing, and baseline alignment.
- avoid oversized type inside dense panels.

### spacing

- align controls to the established panel width and side gutters.
- use 8px / 4px increments for interface spacing.
- avoid nested cards; use sections, dividers, and bands.
- fixed-format controls must have stable dimensions in default, hover, active, and disabled states.

### color

- one strong accent per screen or context.
- accent color must indicate action, active state, warning, status, or selection.
- neutral surfaces carry structure; color does not decorate.
- dark mode must preserve hierarchy and contrast without adding decorative effects.

### controls

- icon buttons are used for global tools and repeated commands.
- sliders are used for numeric ranges.
- switches are used for binary settings.
- open list controls are used where option visibility is part of the workflow.
- dropdown hover previews must restore the committed value when no option is selected.

### states

- define default, hover, focus-visible, active, disabled, loading, error, selected, locked, synced, unsynced, and cancellable states where applicable.
- disabled controls must remain visible enough to explain system structure.
- locked layers may show guides and unlock affordances but must not expose edit, duplicate, delete, or movement behavior.
- loading and page transitions must not show provisional geometry.

### empty, loading, error, disabled

- empty states should be concise and functional.
- loading states should preserve layout dimensions.
- error states must state the condition and the next available action.
- disabled states must not shift surrounding layout.

## engineering ownership

- new gui code belongs in `webapp/gui/`.
- reusable primitives belong in `webapp/shared/ui/`.
- pure domain logic and shared types belong in `webapp/core/`; `webapp/lib/` is reserved for browser adapters, persistence, and export integration.
- preview components consume `PageExportPlan`; they do not calculate layout independently.
- export UI passes project snapshots and options to the shared export path; it does not rebuild format-specific layout data.
- `webapp/components/` and `webapp/hooks/` must stay removed. Do not recreate compatibility folders, shims, or imports.
- do not import from `@/components` or `@/hooks`.

---
**Date:** May 2026

**Version:** 001
