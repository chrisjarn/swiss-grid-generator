# Test Suite

Swiss Grid Generator tests are organized by architectural responsibility. The suite should protect the deterministic `PageExportPlan` contract first: layout is planned once in pure math, and preview/PDF/SVG/IDML only consume that plan.

Run commands from `webapp/`.

## Main Commands

```bash
npm test
npm run lint
npx tsc --noEmit
```

`npm test` runs the folder-owned Node test suites:

```bash
npm run test:integration
npm run test:core
npm run test:contracts
npm run test:gui
```

The browser smoke test is intentionally separate because it starts Next.js and a headless Chromium-compatible browser:

```bash
npm run test:preview-interactions
```

## Test Folders

| Folder | Purpose |
|---|---|
| `tests/core/` | Pure deterministic logic: grid math, reflow/autofit, text layout, typography planning, optical margins, tracking, low-level performance smoke tests. |
| `tests/contracts/` | Product contracts and export fidelity: `PageExportPlan`, browser-free text metrics, preview plan consumption, PDF/SVG/IDML parity, export box geometry. |
| `tests/gui/` | UI helper behavior that can be tested without a browser: inline editor geometry/selection/navigation, preview helpers, editor ownership, snapshots, style transfer. |
| `tests/integration/` | Project/preset flows and persisted format contracts: preset schema, document variables, font roundtrip. |
| `tests/fixtures/` | Canonical fixture projects used by contracts, exports, and performance generation. |
| `tests/helpers/` | Shared test builders and fixture helpers. |

## Targeted Commands

Use targeted scripts when working in one area:

```bash
npm run test:autofit
npm run test:canvas-renderer
npm run test:grid
npm run test:reflow
npm run test:text
npm run test:text-metrics
npm run test:typography-layout
npm run test:page-export-plan
npm run test:export-box
npm run test:export-geometry
npm run test:pdf
npm run test:svg
npm run test:idml
npm run test:project-transfer
npm run test:inline-editor
npm run test:preview-helpers
npm run test:roundtrip
npm run test:text-quality
```

## Boundary And Regression Coverage

- `test:core` includes the TypeScript alias-loader regression that prevents directory-alias `EISDIR` failures.
- `test:contracts` includes the `webapp/core/**` boundary check. Core modules must not import from `@/lib`, `@/gui`, `@/app`, or `@/shared`.
- `test:contracts` includes the legacy frontend import check. `webapp/components/`, `webapp/hooks/`, `@/components`, and `@/hooks` must stay absent.
- `test:project-transfer` verifies that the PDF worker protocol sends a transferable serialized payload and does not structured-clone the project object.
- `test:page-export-plan` verifies that optional planning instrumentation does not change the canonical `PageExportPlan`.
- `test:export-box` verifies shared PDF/SVG/IDML export-box geometry and the real export timing surface, including planning sub-timings.

## Rules

- Keep core tests free of React and browser dependencies.
- Keep export and preview tests anchored to `PageExportPlan`, not duplicated layout calculations.
- Browser text metrics are diagnostic only; deterministic font-file metrics are the layout contract.
- Add new tests to the folder-owned suite first, then add a targeted script only when it improves daily workflow.
- Keep one-off bug regressions inside a broader behavior suite instead of adding standalone files.
