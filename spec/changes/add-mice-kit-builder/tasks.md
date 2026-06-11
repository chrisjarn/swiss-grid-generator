# Implementation Tasks

1. **Boot the fork unchanged** — `cd webapp && npm install && npm run dev`; confirm it runs and
   `npm run test:contracts` passes. Capture a baseline. (No code changes.)
2. **Brand themes** — add `ibis` and `holiday-inn` 4-slot palettes to `core/config/color-schemes.ts`
   and a thin `BRAND_THEMES` registry (palette + logo asset + default font + accent role). Add logo
   assets under `webapp/public/brands/`.
3. **Brand sidebar panel** — add a Brand selector that plugs into `settingsPanels` (existing panels
   untouched); switching brand re-skins colour roles.
4. **Primitive vocabulary** — extend `BASE_BLOCK_IDS` in `core/document/defaults.ts` with the new
   typography roles (keep the 5 existing); declare each role's style spec (scale step, weight, case,
   tracking, colour role) in the type-scale registry.
5. **Real image assets** — extend the image block with optional `assetId`; add a Dexie-backed asset
   store (upload photos / floor plans / logos); keep colour-placeholder fallback.
6. **Asset render parity** — render real images in all three `imagePlans` consumers: canvas preview,
   PDF (`jspdf.addImage`), and SVG export.
7. **Icon registry** — add the vector icon set (seating, dietary, AV/amenity) and an `icon` primitive;
   render crisply in preview/PDF/SVG.
8. **Composite blocks** — implement `capacity-matrix` first (data-driven, grid-snapped, autofit, seating
   icons in headers), then `package-card`, `menu-list`, `spec-list`, `contact-block`, `loyalty-block`.
9. **Kit data model + templates** — define the kit JSON schema and grid-locked page templates (Cover,
   Contents, Capacity, Floor Plan, Packages, Menus, Canapés, Accommodation, Loyalty, Contact); add a
   generator that emits document pages from kit data.
10. **Multi-format** — provide portrait (A4) and landscape (16:9) variants of each template sharing one
    content source via the engine's reflow.
11. **Tests (additive)** — add contract tests: primitive style resolution, brand colour-role resolution,
    asset/icon export parity, capacity-matrix fit/no-overflow. All pre-existing tests must remain green.
12. **Docs** — author kit/primitive usage docs in repo markdown; respect i18n message bundle for UI strings.
