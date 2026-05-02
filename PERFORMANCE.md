# Performance Measurement

Swiss Grid Generator 2.0 keeps layout planning deterministic: `PageExportPlan` is the canonical source of truth, and canvas/PDF/SVG/IDML only consume that plan. Performance work must preserve that contract.

## Live Profiling

Enable dev-only timing logs with:

```bash
NEXT_PUBLIC_LAYOUT_PROFILING=1 npm run dev
```

The profiler records diagnostic timings for:

- `buildPageExportPlan`
- canvas render-plan conversion
- canvas layer-stack drawing
- PDF render pass
- SVG render pass
- IDML render pass

Profiling is disabled unless `NEXT_PUBLIC_LAYOUT_PROFILING` is set to `1` or `true`.

## Layout Benchmark

Run the deterministic layout stress benchmark from `webapp/`:

```bash
npm run benchmark:layout
```

The benchmark builds canonical page export plans for 10, 100, 500, and 1000 stress pages with dense typography and image placeholders. It reports total planning time, average planning time per page, plan counts, and Node heap usage.

These numbers are diagnostic, not a hard pass/fail gate. The contract gate is:

```bash
npm run test:page-export-plan
```

That test snapshots a normalized canonical stress plan hash so performance changes cannot silently alter grid geometry, line breaks, placeholder rectangles, layer order, or export plan structure.

## Safe Optimization Rules

- Optimize around the canonical plan, not around canvas.
- Keep planner inputs and returned `PageExportPlan` semantics stable.
- Cache only pure deterministic calculations with explicit keys.
- Do not cache or reuse returned plan objects across calls unless mutation safety is proven.
- Run `npm run test:page-export-plan`, `npm run lint`, `npx tsc --noEmit`, and `npm run benchmark:layout` after planner changes.
