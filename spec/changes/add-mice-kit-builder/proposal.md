# Proposal: Add MICE Kit Builder

**Change ID:** `add-mice-kit-builder`
**Status:** Draft — awaiting approval
**Date:** 2026-06-11

## Why

The team produces hotel **MICE kits** (Meetings, Incentives, Conferences, Events) — branded sales
collateral and proposals (ibis, Holiday Inn, sub-branded to partners like Chelsea). Today these are
hand-built in tools where **layout drifts and content overflows the page**, getting worse with every
edit. The forked `swiss-grid-generator` already guarantees grid-locked, overflow-proof layout via its
`PageExportPlan` engine (`overflowByBlock`, autofit, reflow), multi-format output (portrait + landscape),
fonts, and PDF/SVG export.

We will **extend** that engine into a MICE Kit Builder. The missing pieces are a **named primitive
vocabulary** (so no element's role or size is ever guessed), **brand theming**, **real image/logo/icon
assets**, and **data-driven kit pages**. This proposal adds those capabilities **additively** — no existing
feature, preset, panel, or test is removed.

## What Changes

- **Primitive vocabulary** — a fixed, named set of typography, brand/asset, and composite primitives
  (e.g. `heading`, `heading-description`, `label`, `value`, `price`, `logo`, `sub-brand-logo`,
  `icon-seating`). Each carries one fixed type spec (scale step, weight, case, tracking, colour role).
- **Brand themes** — ibis and Holiday Inn brand palettes + logo lockups + default fonts, selectable;
  primitives resolve colour roles against the active brand.
- **Real assets** — extend image blocks to carry real photos, floor plans, and logos (currently colour
  placeholders), rendered identically in preview, PDF, and SVG.
- **Icon system** — a built-in vector icon registry (seating, dietary, AV/amenity) rendered crisply in
  all export surfaces.
- **Composite MICE blocks** — `capacity-matrix`, `package-card`, `menu-list`, `spec-list`,
  `contact-block`, `loyalty-block`, laid out by the engine and overflow-guarded.
- **Kit data model + templates** — a hotel kit schema (`rooms`, `packages`, `menus`, `facts`, `contact`,
  `loyalty`) that generates grid-locked pages; same content reflows to portrait (A4) and landscape (16:9).

## Impact

- **Affected specs:** new capability `mice-kit-builder` (no existing spec to modify — clean repo).
- **Affected code (additive):** `core/document/defaults.ts` (extend `BASE_BLOCK_IDS`), type-scale style
  registry, `core/config/color-schemes.ts` (+ brand palettes), image block model + the three
  `imagePlans` consumers (canvas/PDF/SVG), new MICE block modules, new sidebar panels (`settingsPanels`),
  new presets/templates, Dexie asset store.
- **Guardrails:** existing contract tests (`page-export-plan`, export parity, text metrics) must stay
  green; respect `AGENTS.md` (i18n strings, strict `PageExportPlan` parity); keep the npm asset pipeline.
- **Users:** internal events/design team gains a reusable, overflow-proof, brand-led kit builder.
- **Out of scope (this change):** bun/Biome migration; new cloud sync; non-hotel document types.
