# Architecture

Swiss Grid Generator uses one deterministic layout plan for every output surface.

The layout is planned once in pure TypeScript and stored in a canonical `PageExportPlan`. Preview, thumbnails, PDF, SVG, and IDML consume that same plan. They do not calculate their own layout.

## Core contract

- The planner owns grid geometry, text wrapping, glyph positions, image placeholders, layer order, and export commands.
- Canvas is an output surface. It draws the plan.
- PDF, SVG, and IDML are vector export consumers of the same plan.
- Browser text metrics are diagnostic only.
- No browser should silently change authored layout geometry.

## Source layout

| Area | Responsibility |
|---|---|
| `webapp/app/` | Next.js app boundary. |
| `webapp/core/` | Pure domain logic: config, document types, layout, export planning, typography, and shared types. It must not import React. |
| `webapp/gui/` | React shell, preview, panels, editors, dialogs, and interaction orchestration. |
| `webapp/shared/` | Reusable UI primitives and utilities. |
| `webapp/lib/` | Browser adapters, persistence, export integration, presets, onboarding, and i18n helpers. |
| `webapp/messages/` | Authored product text and generated locale bundles. |

## Runtime boundaries

- `webapp/gui/shell/Shell.tsx` mounts the production workspace.
- `webapp/gui/preview/GridPreview.tsx` orchestrates live preview interaction.
- `webapp/gui/preview/SwissCanvas.tsx` is a plan-only canvas foundation.
- `webapp/lib/project-export-runner.ts` and `webapp/lib/export-engine.ts` own shared vector export entry paths.
- `webapp/core/layout/page-export-plan.ts` owns canonical page-plan construction.

## Related references

- [CALCULATIONS.md](CALCULATIONS.md) documents the layout math and geometry rules.
- [GUI.md](GUI.md) documents the frontend component and interaction architecture.
- [PERFORMANCE.md](PERFORMANCE.md) documents performance measurements and optimization history.
- [TESTS.md](TESTS.md) documents the regression suite that protects the architecture.
