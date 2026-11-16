# Brew Society theme — project conventions

Shopify theme for the client Brew Society (food and drink importer and distributor, VIC and NSW), based on Dawn v16.1.1 (pristine baseline = first commit of this repo). Designs live in Figma; the agency contact is Marcel (ONETOO). Read `docs/brief.md` and `docs/sitemap.md` before building anything: they hold the positioning, the page list and the blocks per page.

## Approach

- **Fork-and-modify**: edit Dawn's core files directly to match the Figma designs. Do not preserve Dawn's look for its own sake, and do not build parallel override layers. Change the source.
- We do NOT track upstream Dawn updates. Never re-import upstream Dawn files over customised ones.
- **Budget is tight.** Six designed templates only (see below). Prefer restyling a Dawn section over writing a new one. Search, account, 404 and checkout are restyled Dawn defaults.

## Figma

- File: https://www.figma.com/design/z7579GKhmjarc5NLoAnEBU/Brew-Society — final frames are on the page **Website - Presentation** (node `4166:3361`).
- Frames: Home `4207:6886` (mobile `4203:4836`), Us `4166:3733`, FAQ `4166:3932`, Contact `4180:6369`, 404 `4166:3992`, Shop - All `4166:4222`, Shop - Category `4166:4606`, Shop - Buy Overlay `4166:4667`, Shop - Cart Drawer `4166:4817`, Shop - Product `4244:2036` (mobile `4245:2128`), Brands - All `4166:4283` (logo `4166:4407`, list `4166:4532`), Brand item `4166:4170`, Collection - Brand `4166:4981` and `4219:5115` (wholesale only).
- Components on the **Website** page (`4102:2`): Navigation `4203:5306`, Footer `4203:5353`, Card `4127:3140`.
- Figma is the source of truth for design. Use the Figma MCP tools (`get_design_context`, `get_screenshot`, `get_variable_defs`) and match spacing, type and colour exactly.
- Known file quirk: the Figma variable `Spacing/16` has the value 0. The real value is 16.

## Conventions

- **New sections/snippets/assets built for Brew Society** are prefixed `bs-` (e.g. `sections/bs-hero.liquid`, `assets/bs-hero.css`) so bespoke work is distinguishable from modified Dawn files.
- **CSS**: Dawn's pattern. One `component-*.css` (or `bs-*.css`) per feature, loaded from the section/snippet with `{{ 'file.css' | asset_url | stylesheet_tag }}`. Use the design tokens below, never raw values.
- **JS**: vanilla custom elements per Dawn's pattern. No frameworks, no build step.
- **Copy**: fixed UI strings through `locales/en.default.json`; anything the client might reword belongs in section or block settings. Never hard-code copy in Liquid.
- **Copy rules from the workshop**: say importer and distributor, never brand owner. Label exclusives "Exclusive to Brew Society". Real testimonials only. No "bundle and save". No em dashes in headlines.

## Design tokens (source: Figma variables)

Declared in `snippets/bs-design-tokens.liquid`, rendered by `layout/theme.liquid` and `layout/password.liquid`. If Figma introduces a new token, add it there.

- **Typeface**: TT Commons Pro, self-hosted (`snippets/bs-font-face.liquid`, `snippets/bs-font-preload.liquid`). Three licensed files ship in `assets/`: Medium 500 (body and headings), DemiBold 600 (card titles, wordmark) and Bold 700. The Figma uses a little Regular 400; that file was not supplied, so 400 renders as Medium. Keep writing the Figma weight in CSS (`--bs-weight-*`) so the right file is picked up if it is added later. Dawn's font pickers were removed; the font variables are hard-coded in `theme.liquid`, `password.liquid` and `templates/gift_card.liquid`.
- **Type scale** (`--bs-text-*`): x-small 9, small 12, paragraph 16, large 21, x-large 28, 2x-large 38, 3x-large 51, 4x-large 67, 5x-large 90, 6x-large 120, 7x-large 160, 8x-large 213, 9x-large 283. Large and up multiply the merchant heading scale.
- **Heading classes** (set in `assets/base.css`, a starting map, verify per section against Figma): `.hxxl` 67 mobile, up to 213 desktop (page titles like "Alt. Milks 142"); `.hxl` 51 / 90; `.h0` 51 / 67; `h1` 38 / 51; `h2` 28 / 38; `h3` 21 / 28; `h4` 21; `h5` 16.
- **Line-height and tracking**: body 1.5 with 0 tracking. Display headings (`.hxl`, `.hxxl`) line-height 0.8, tracking -0.035em. Other headings line-height 1, tracking -0.035em. Buttons line-height 1, tracking -0.025em. Dawn's 0.06rem tracking and 75% opacity body copy were removed. Don't reintroduce them. Many Dawn components still carry `rgba(var(--color-foreground), 0.75)` and old tracking: normalise per section as you restyle.
- **Palette** (`--bs-color-*`, for accents in bespoke CSS only): blue `#2C36FF`, blue-tint `#DBDDFF`, grey `#B4B4B4`, black `#0A0100`, white `#FCF8F7` (off-white), stone `#F0EFEF` (page background). Section backgrounds always use the colour schemes: scheme-1 Stone (default), scheme-2 Off-white (cards, footer, panels), scheme-3 Blue (announcement bar, inverse), scheme-4 Black, scheme-5 Blue tint. The client has questioned the blue, so nothing may hard-code it: a palette change must be a Theme settings edit.
- **Spacing** (`--bs-space-*`): 4, 8, 16, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 256.
- **Layout**: full bleed. `.page-width` has no max-width; site gutter is `--bs-gutter` (12px mobile, 24px desktop), uniform including the header. Grid gap is 16px (`--bs-grid-gap`; also the theme's grid spacing settings). Desktop product grid is 4 columns, mobile 2.
- **Buttons**: pills. Theme setting radius is 40px (Dawn's maximum); oversized buttons (the 67px-label Add to Cart) need `border-radius: 999px` in bespoke CSS.

## Data model

Every brand and every product type is a Shopify **collection**. Two collection templates render them.

- `templates/collection.brand.json` — brand collections (about 35). Hero with logo, tags, summary, Order wholesale on Pepper; product grid with quick add, hidden when the brand has no D2C products.
- `templates/collection.json` — category collections and `/collections/all` (the Shop), with native Search & Discovery filters.
- `/collections` (list-collections) — the Brands catalogue: brand cards grouped under product-type headings, Exclusive first. No filter JS.
- **Buy panel**: Dawn's quick-add modal and `/products/<handle>` are one component. Don't design or build them separately.
- **Cart**: drawer (theme setting `cart_type` is `drawer`).
- **Wholesale** is not sold on Shopify. Every wholesale CTA links out to the Pepper ordering portal (ABN required). No customer-account or B2B work.

Collection metafields (namespace `brand`, definitions TBC with the client's spreadsheet): `logo` (file), `category` (list of text), `exclusive` (boolean), `status` (Imported exclusive / Local exclusive / Distributed), `channels` (list), `summary` (multi-line text), `website` (URL), `pepper_url` (URL). Plus a collection `type` metafield distinguishing brand from product-type collections. Make every namespace.key configurable in Theme settings rather than hard-coded.

## Merchant editability (client requirement)

- **Every section and block has a schema** with clear, human labels. Repeatable content (cards, logos, FAQs, steps) is modelled as blocks.
- **Section backgrounds are changeable**: every section, bespoke ones included, gets the standard `"type": "color_scheme"` setting and renders `class="color-{{ section.settings.color_scheme }} gradient"`. Never hard-code section backgrounds.
- **Section spacing**: include Dawn's `padding_top` / `padding_bottom` range settings on bespoke sections.
- `config/settings_data.json` and `templates/*.json` are also written by the Shopify theme editor through the GitHub sync (two-way). Expect "Update from Shopify" commits on `main`.

## Dawn gotchas (learned on Nelson Made)

- `base.css` hides empty elements globally (`a:empty, div:empty, … { display: none }`). Intentionally empty elements need an explicit `display`.
- Dawn's `.grid` is **flexbox**, not CSS grid: a full-row item needs `width: 100%`.
- `base.css` sets `header-menu > details` and `details-disclosure > details` to `position: relative`. Full-width absolutely positioned panels must reset this.
- **List metafield values** support `size` and `{% for %}` only. `.first` and `[index]` return nil. Use `for … offset/limit`.
- Draft products and metaobject entries are silently dropped from reference lists on the storefront.
- Liquid arrays: `.size`, never `.count`.
- Dawn 16 removed the legacy customer account templates and has no `blocks/` directory.

## Work packages and parallel sessions

One package (about one PR) per session, on its own `claude/…` branch:

1. Header and announcement bar
2. Footer
3. Product card and collection grid (Shop, category)
4. Brand collection template and Brands catalogue
5. Buy panel (quick-add modal + product page) and cart drawer
6. Homepage sections
7. Generic page, Contact, FAQ, 404

- **Shared-file hotspots**: `locales/en.default.json`, `config/settings_schema.json`, `config/settings_data.json`, `layout/theme.liquid`, `snippets/bs-design-tokens.liquid`, `assets/base.css`. Keep edits small, rebase often, and never rework a hotspot wholesale inside a package.
- Fetch and rebase on `origin/main` before every push. The theme editor commits to `main`.
- Validate before pushing: `node .claude/skills/shopify-liquid/scripts/validate.js --theme-path . --files "<changed files>"` (run `npm install` in `.claude/skills/shopify-liquid` first). Theme Check also runs in CI.
- Commit messages describe the storefront-visible change, not the file mechanics.

## Store access

TBC. No store is connected yet. When one is, record here: the myshopify domain, the preview theme id (`?preview_theme_id=…`), and whether the sandbox can reach it, so sessions can verify rendered pages themselves.
