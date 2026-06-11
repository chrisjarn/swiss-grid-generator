# Spec Delta: mice-kit-builder

## ADDED Requirements

### Requirement: Named Primitive Vocabulary
The system SHALL provide a fixed, named set of element primitives (typography, brand/asset, and
composite). WHEN a user adds an element, the system SHALL require selection of a named primitive,
and SHALL apply that primitive's fixed type spec (scale step, weight, case, tracking, colour role,
default grid span) rather than an arbitrary size.

#### Scenario: Adding a heading primitive
GIVEN a page on the active grid
WHEN the user adds a `heading` primitive
THEN the system applies the `heading` style spec from the type-scale registry
AND the element's font size is derived from the scale step, never a hardcoded pixel value.

#### Scenario: Distinct heading-description role
GIVEN a `heading` placed on the page
WHEN the user adds a `heading-description` beneath it
THEN the system applies the `heading-description` spec (lighter weight, muted colour role, sentence case)
AND it is recorded as a distinct labelled role, not a `body` block.

#### Scenario: Existing base roles preserved
GIVEN the fork's existing base roles `display, headline, subhead, body, caption`
WHEN the primitive vocabulary is installed
THEN those five roles remain available and behave unchanged
AND the new roles are added alongside them.

### Requirement: Brand Theming
The system SHALL support selectable brand themes (initially `ibis` and `holiday-inn`), each defining a
4-slot colour palette, logo lockup, and default font. WHEN a brand is selected, the system SHALL resolve
every primitive's colour role (`paper`, `muted`, `ink`, `brand`) against that brand's palette.

#### Scenario: Switching brand re-skins the kit
GIVEN a kit authored with the `ibis` brand
WHEN the user switches the active brand to `holiday-inn`
THEN all primitives resolve their colour roles to the Holiday Inn palette
AND no element retains a hardcoded brand colour.

#### Scenario: Existing colour schemes retained
GIVEN the fork's existing `IMAGE_COLOR_SCHEMES`
WHEN brand themes are added
THEN all pre-existing colour schemes remain selectable and unchanged.

### Requirement: Real Image and Logo Assets
The system SHALL allow image blocks to reference real raster/vector assets (photos, floor plans, logos)
in addition to the existing colour-placeholder behaviour. The system SHALL render a referenced asset
identically across canvas preview, PDF export, and SVG export.

#### Scenario: Place a photo
GIVEN an uploaded photograph in the asset store
WHEN the user assigns it to an image block and exports
THEN the photograph appears in the canvas preview, the PDF, and the SVG with matching position and fit.

#### Scenario: Placeholder fallback preserved
GIVEN an image block with no assigned asset
WHEN the page renders
THEN the block falls back to the existing colour-placeholder behaviour (capability not removed).

#### Scenario: Logo primitive from active brand
GIVEN the active brand is `ibis`
WHEN the user adds a `logo` primitive
THEN the system places the ibis logo lockup at locked aspect ratio, snapped to the grid.

### Requirement: Icon System
The system SHALL provide a built-in vector icon registry covering seating layouts (theatre, classroom,
boardroom, u-shape, cocktail, banquet, cabaret), dietary tags (V, VG, GF, GFO, NF, DF), and AV/amenity
icons. WHEN an icon primitive is placed, the system SHALL render it as a crisp vector in preview, PDF,
and SVG.

#### Scenario: Seating icon in capacity header
GIVEN a `capacity-matrix` block
WHEN the matrix renders its column headers
THEN each seating-style column shows its corresponding `icon-seating` glyph at a single consistent stroke weight.

### Requirement: Overflow-Proof Composite Blocks
The system SHALL provide composite MICE blocks (`capacity-matrix`, `package-card`, `menu-list`,
`spec-list`, `contact-block`, `loyalty-block`) laid out through the engine. IF a composite block's content
exceeds its allocated grid area, THEN the system SHALL auto-fit or report overflow via `overflowByBlock`
and SHALL NOT render content outside the page bounds.

#### Scenario: Capacity matrix that fits
GIVEN room data for five rooms across six set-up styles
WHEN the `capacity-matrix` is placed on a page
THEN it renders entirely within the page bounds with no element crossing the page edge.

#### Scenario: Overflow is reported, not spilled
GIVEN a `menu-list` with more items than its grid area can hold
WHEN the page is laid out
THEN the engine records the excess in `overflowByBlock`
AND no list item is drawn outside the page bounds.

### Requirement: Kit Data Model and Multi-Format Templates
The system SHALL define a hotel kit schema (`rooms`, `packages`, `menus`, `facts`, `contact`, `loyalty`)
and grid-locked page templates that bind to it. WHEN kit data is provided, the system SHALL generate the
kit pages; and the same content SHALL reflow to both portrait (A4) and landscape (16:9) using the engine's
existing orientation and ratio support.

#### Scenario: Generate a kit from data
GIVEN a populated kit data file for a hotel
WHEN the user generates the kit
THEN the system produces the templated pages (Cover, Contents, Capacity, Floor Plan, Packages, Menus,
Canapés, Accommodation, Loyalty, Contact) on the active grid.

#### Scenario: Same content, two formats
GIVEN a generated kit in 16:9 landscape
WHEN the user switches the format to A4 portrait
THEN the same content reflows onto the portrait grid with no overflow and no content loss.

### Requirement: Additive Extension Guarantee
The system SHALL add the above capabilities without removing any existing capability. WHEN the change is
applied, the fork's existing presets, panels, fonts, export formats, and passing contract tests SHALL
remain present and green.

#### Scenario: Existing contract tests stay green
GIVEN the fork's existing contract test suite
WHEN the MICE Kit Builder change is applied
THEN `page-export-plan`, export-parity, and text-metrics contract tests continue to pass.
