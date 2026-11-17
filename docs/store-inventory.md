# Store inventory

Read through the Admin API on 2026-11-17 (store `brew-society.myshopify.com`, live, old Debut theme). Regenerate rather than trust this once the client starts changing data.

## Headlines

- **1218 products**: 60 active, 4 unlisted, 1154 draft.
- The drafts are the wholesale range (Arkadia, Ministry, Dare, Dairy Farmers, packaging…). Almost none have images. They are not sold on the shop and are not this theme's concern.
- **7 brands have shop products.** The other brands on the current site have none, so their brand pages are the wholesale-only variant.
- **The vendor field is not usable for brands**: nearly every product's vendor is `Brew Society.` or `Brew Society`. Brand membership comes from collections and tags.
- Only 5 active products have more than one variant (the Frederick's Coffee lines, 16 variants each). Singles and cartons are **separate products**, not variants of one product.
- No collection metafield definitions exist yet. No collection uses a template suffix.

## Active products by brand

| Brand | Active products |
|---|---|
| Tea Culture | 25 |
| Vivani | 13 |
| Simply Roasted | 8 |
| Frederick's Coffee | 5 |
| Ordinary Soda | 4 |
| Nibana | 3 |
| Prana Chai | 2 |

## Active products by product type

| Product type | Count |
|---|---|
| Tea | 25 |
| Organic Chocolate | 12 |
| Crisps | 8 |
| (blank) | 7 |
| Soda | 4 |
| Drinking Chocolate | 3 |
| Chocolate | 1 |

## Collections

| Handle | Title | Products (all statuses) | Kind | Rule |
|---|---|---|---|---|
| `chai` | Chai | 4 | category | TAG EQUALS Chai |
| `coffee-1` | Fredericks Coffee | 6 | brand | TAG EQUALS Coffee |
| `home-beverages` | Tea Culture™ | 19 | brand | TAG EQUALS Home Beverages |
| `home-page` | Home Page | 11 | merchandising | manual |
| `loose-leaf` | Loose Leaf | 8 | category | TAG EQUALS Loose Leaf |
| `nibana-drinking-chocolate` | Nibana Drinking Chocolate | 3 | brand | manual |
| `prana-chai` | Prana Chai | 2 | brand | manual |
| `pyramid-infuser` | Pyramid Infuser | 13 | category | TAG EQUALS Pyramid Infuser |
| `shop-all` | Shop All | 868 | all products | VARIANT_PRICE GREATER_THAN 0 |
| `simply-roasted` | Simply Roasted Crisps | 8 | brand | TAG EQUALS Simply Roasted |
| `sodas` | Ordinary Soda | 4 | brand | TAG EQUALS Sodas |
| `tea` | Tea | 95 | category | TYPE EQUALS Tea |
| `vivani-organic-chocolate` | Vivani Organic Chocolate | 21 | brand | manual |

## Menus

- `main-menu` (Main menu): ← BrewSociety, Tea Culture™ [Chai, Loose Leaf, Pyramid Infuser, Matcha], Fredericks Coffee, Nibana Drinking Chocolate, Ordinary Soda, Simply Roasted Crisps, Prana Chai, Vivani Organic Chocolate
- `footer` (Footer menu): ← Back to BrewSociety, Search, Shipping & Returns, Terms of Service, Refund policy, FAQs
- `customer-account-main-menu` (Customer account main menu): Orders, Profile

The `main-menu` and `footer` menus belong to the live site. Leave them alone until launch.

## Pages

- `/pages/categories` Shop by Category (published)
- `/pages/faqs` FAQs (published)

## Metafield definitions

- Collection: none
- Product: `mm-google-shopping.custom_product` (boolean), `shopify.dietary-preferences` (list.metaobject_reference), `shopify.flavor` (list.metaobject_reference), `shopify.tea-input-type` (list.metaobject_reference), `shopify.color-pattern` (list.metaobject_reference)

## Sales channels

Online Store, Facebook & Instagram, Point of Sale, Google & YouTube, Shop
