# Developer Guide

This file is the home for local setup, generated assets, validation, and recording workflows.

For architecture, read [ARCHITECTURE.md](ARCHITECTURE.md). For test ownership, read [TESTS.md](TESTS.md).

## Project structure

The active frontend is `webapp/`. Run application, asset, lint, and test commands from that directory unless a command below says otherwise.

## Local development

```bash
cd webapp
npm install
npm run dev
```

`npm run dev` runs `npm run assets:generate` first. That regenerates message bundles, manual preset content, preset manifests, help, tooltips, legal content, and font verification.

## Generated assets

Run this after changing messages, preset data, manual content, help content, tooltip content, legal content, or font configuration:

```bash
cd webapp
npm run assets:generate
```

The generated preset manifest lives at `webapp/lib/presets/generated-manifest.ts`. Source preset JSON files live at `webapp/lib/presets/data/`.

## Documentation site

User documentation is authored only in [DOCUMENTATION.md](DOCUMENTATION.md). The static site source at `docs-site/index.md` is generated from that file and is ignored by git.

```bash
npm run docs:dev
npm run docs:build
```

The application opens `/docs` relative to the current host. `npm run docs:build` writes the generated VitePress site to ignored `webapp/public/doc/`; the static `/docs/` app route embeds that generated site so local development and production use the same public entry point.

## Validation

Use the main validation set before committing broad changes:

```bash
cd webapp
npm run lint
npx tsc --noEmit
npm run test:contracts
npm run test:gui
npm run test:integration
npm run test:preview-interactions
```

Use [TESTS.md](TESTS.md) for targeted commands and suite ownership.

## Quick-start recording

The root package owns the Playwright recording script for the public quick-start media:

```bash
npm run record:000-quick-start-video-001
```

The recording writes:

- `screencasts/quick-start-video-001.mp4`
- `screencasts/quick-start-video-001-*.png`
- `screencasts/quick-start-video-001-performance-page-0005.pdf`

The onboarding overlay uses the static media under:

- `webapp/public/onboarding/quick-start-video-001.webm`
- `webapp/public/onboarding/quick-start-video-001.mp4`
- `webapp/public/onboarding/quick-start-video-001-poster.jpg`

## Performance checks

Layout-planner performance is documented in [PERFORMANCE.md](PERFORMANCE.md).

Common commands:

```bash
cd webapp
NEXT_PUBLIC_LAYOUT_PROFILING=1 npm run dev
npm run benchmark:layout
npm run export -- --layout tests/fixtures/performance-1000-pages.json --range 1-1000 --format pdf --out ../tmp/export-debug
```

## Documentation edits

Use [DOCUMENTATION.md](DOCUMENTATION.md) as the canonical user documentation. The README is a project homepage; developer details belong here, in [ARCHITECTURE.md](ARCHITECTURE.md), [TESTS.md](TESTS.md), [CALCULATIONS.md](CALCULATIONS.md), or [PERFORMANCE.md](PERFORMANCE.md).
