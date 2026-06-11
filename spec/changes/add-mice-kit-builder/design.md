# ibis × Chelsea — MICE Kit Design Vision

> Design thinking *before* we build the templates. Grounded in the three references you gave
> (Holiday Inn Perth kit, ibis Adelaide kit, the ibis/Chelsea proposal doc) and the Chelsea venue data.
> Goal: agency-grade, ibis brand-led, Swiss-grid disciplined — *better* than the references, not a copy.

---

## 1. Design thesis

The reference kits are good hotel collateral but not agency-grade: their icons are mismatched
(clip-art seating diagrams, inconsistent stroke weights), spacing drifts page-to-page, and type
hierarchy wobbles. Our edge is **the opposite of decoration — discipline**:

- **One strict modular grid** governs every page. Nothing floats; photography, panels, tables,
  and icons all snap to it. This is what makes a 14-page kit feel like one object.
- **Restraint with the brand.** ibis red (`#e10025`) is a *structural accent* — the left spine,
  the eyebrow kicker, section rules, key numbers (prices), page folio — **not** a flood of red panels.
  White space does the heavy lifting; black ink carries the content. (The ibis Adelaide kit floods
  red/orange blocks — we will be more surgical and more premium.)
- **One type family — Lato** (the ibis brand font), worked hard across a tuned scale.
- **One bespoke icon system.** This is the single biggest visible upgrade over the references.

## 2. Brand & sub-brand

- **Primary brand: ibis** — red `#e10025`, Lato, the rounded-square logomark (installed).
- **Sub-brand: Chelsea** — co-brand lockup ("ibis Perth × Chelsea" / "in partnership with").
  *Open input:* need Chelsea's logo + brand colour to set the secondary accent precisely.
- **⚠️ Loyalty programme — brand accuracy:** the proposal doc is **Accor** (cecilia.chu@accor.com),
  so the loyalty slide must be **Accor ALL / Meeting Planner**, **NOT** IHG Business Rewards
  (that's the Holiday Inn reference — different chain). Easy to get wrong; flagging now.

## 3. Design system

### Grid
| | Landscape (16:9 deck) | Portrait (A4 proposal) |
|---|---|---|
| Columns | **12** | **8** |
| Margin | 64 px @1280×720 (baseline-multiple) | proportional, same canon |
| Gutter | 24 px | 20 px |
| Baseline | 8 pt rhythm — all type & rules snap | 8 pt |
| Content / image split | content L 7 cols · photo R 5 cols | photo top band · content stacks below |

### Type scale (Lato, primitive roles)
| Primitive | Weight | Case | Use |
|---|---|---|---|
| `display` | 900 | UPPER | Cover title |
| `heading` | 900 | UPPER | Page title (two-tone: black word + light word, per HI kit) |
| `subheading` | 700 | Title | Group headers (e.g. "Continental Breakfast") |
| `heading-description` | 300 | Sentence | The deck under a heading |
| `body` | 400 | Sentence | Copy |
| `list-item` | 400 | Sentence | Menu / inclusion items |
| `label` | 700 | UPPER tracked | "AREA", "CEILING" |
| `value` | 500 tabular | — | "97", "200 guests" |
| `price` | 900, **red** | — | "$69 pp" |
| `caption` / `legend` | 400 / 600 | — | dietary key, footnotes |

### Colour roles (brand tokens)
`paper #ffffff` · `ink #1a1a1a` · `muted #9b9b9b` · `brand #e10025`.
Red appears only as: left spine, section rule, prices, folio, key icons. Target ≤ ~10% red coverage per page.
**No eyebrows / kicker labels** — pages go straight from the co-brand lockup to the heading.

### Icon system (the differentiator)
One 24-grid, one 1.5 stroke weight, ink or brand-red. Three families:
- **Seating:** theatre · classroom · boardroom · u-shape · cocktail · cabaret · banquet
- **Dietary:** V · VG · GF · GFO · NF · DF
- **Amenity/AV:** room-hire · wifi · LCD screen · lectern · mic · whiteboard · flip-chart · catering · tea/coffee · water · parking
Drawn once, reused everywhere → instant "designed by a studio" read. (My earlier capacity POC seating set is the seed.)

### Photography
Full-bleed, grid-snapped (never floating), no heavy filters. Landscape: right 5-col image field.
Portrait: top band or full-bleed cover. A consistent thin ibis-red keyline option on photo edges.

### Co-brand lockup
ibis logomark top-left at a fixed module; "× Chelsea" lockup paired to its right with fixed spacing.
Consistent on every page header; back cover gets the large version.

## 4. Page inventory (the kit)

Each page = a grid-locked template, generated from venue data, available **portrait + landscape**.

| # | Page | Key primitives | Data source |
|---|---|---|---|
| 1 | **Cover** | full-bleed hero · brand panel · `display` · co-brand lockup | — |
| 2 | **Contents** | numbered list · red numerals · dot leaders · photo band | page list |
| 3 | **Welcome / Venue** | `pull-quote` · hero · fact strip (CBD location · 5 spaces · ≤200 pax) | fact sheet |
| 4 | **Room Dimensions & Capacity** | `capacity-matrix` + seating icons | rooms[] |
| 5 | **Floor Plans** | `floorplan` images · legend · access notes | supplied plans |
| 6 | **Day Delegate Packages** | `package-card` grid (amenity icons) · `price` $69–74pp · inclusions | packages[] |
| 7 | **Beverage & Breakfast** | `menu-list` columns · `price` · dietary `legend` | menus.breakfast |
| 8 | **Catering — Lunch/Buffet/Plated** | multi-column `menu-list` · alternate-drop note · prices | menus.catering |
| 9 | **Canapés / Grazing** | cold/hot columns · dietary tags | menus.canapes |
| 10 | **Accommodation** | copy · room photo · `spec-list` | fact sheet |
| 11 | **Loyalty — Accor ALL Meeting Planner** | points value · rewards · partner lockup (CHU briefs assets) | loyalty |
| 12 | **Contact / Back cover** | Cecilia Chu details · address · large lockup · red ground | contact |

### Hero page sketch — Room Dimensions & Capacity (landscape)
```
│▌ [ibis▢] × Chelsea ··················································· folio 04
│▌ ─────────────────────────────────────────────────────────────────────────
│▌ ROOM DIMENSIONS
│▌ & Capacity            heading-description (light) ……………
│▌
│▌  ROOM      AREA  CEIL  [▦]TH [▤]CL [▭]BR [⊔]US [✦]CK [◷]CB
│▌  Charles    97   2.9    50    20    18    18    30    24
│▌  George    115   2.9    80    30    25    27    50    40
│▌  Edward    280   3.0   200   100    50    30   150   104
│▌  Chelsea Bar —   3.0    —     —     —     —     80    —
│▌  Dining Hall —   3.0    —     —     —     —     60    70
│▌ ─────────────────────────────────────────────────────────────────────────
│▌ ibis Perth × Chelsea            capacities are a guide — contact our team
```
*(left red spine `▌`, seating icons in the column heads, tabular figures, all on the 12-col grid)*

### Same page — portrait reflow
When 6 seating columns won't fit A4 width, the matrix **reflows to room cards** (one `spec-list`
per room: label/value pairs + a small seating-icon row) — the engine's autofit decides, so it
**never overflows**. Same data, same grid, different shape.

## 5. Portrait ↔ landscape strategy

- **One content source per page**; the chosen format selects the grid (12 vs 8 col) and the engine
  reflows. No duplicate authoring.
- **Landscape** = sales deck / web / email (the references' format).
- **Portrait** = the A4 proposal/contract (the .docx use-case) — adds the priced **Venue Availability**
  and **Estimated Event Total** tables from the proposal doc.
- Wide tables that can't fit portrait fall back to stacked cards (above). Photography swaps from
  side-field (landscape) to top-band (portrait).

## 6. Open inputs (to make it real, not mocked)
1. **Chelsea** logo + brand colour (for the sub-brand accent + lockup).
2. **Photography** — venue/room/food shots (or we proxy with the reference imagery for layout).
3. **Floor plans** — you said you can supply.
4. **Loyalty** — confirm **Accor ALL Meeting Planner** (not IHG) + CHU's briefed assets.
5. **Pricing confirmation** — the .docx figures ($69–74 DDP, room hire/min-spend) as the data seed.

## 7. Build order to realise this
1. Assign-source UI (place the logo/photos) — unlocks pages 1, 3, 5, 10.
2. Icon system (seating/dietary/amenity) — unlocks pages 4, 6, 7–9.
3. Composite blocks: `capacity-matrix`, `package-card`, `menu-list`, `spec-list`.
4. Kit data model + seed Chelsea venue data.
5. Templates: Cover + Capacity first (the two hero pages), portrait + landscape, on the engine.
6. Remaining pages → full kit → PDF (with logo rasterisation for vector marks).
