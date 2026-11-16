# Brew Society — Shopify Theme

Custom Shopify theme for Brew Society, built by [ONETOO](https://onetoo.com.au) on top of [Shopify Dawn](https://github.com/Shopify/dawn) **v16.1.1**.

Dawn is a starting point, not a dependency: core sections, snippets and styles are modified directly to match the Brew Society designs in Figma. The pristine Dawn baseline is the first commit in this repo, so `git diff <baseline>..HEAD` always shows exactly what has been customised.

Project conventions, design tokens and the data model are in [CLAUDE.md](CLAUDE.md). The brief, sitemap, redirects and copy are in [docs/](docs/).

## Repo ↔ Shopify sync

This repo syncs to the store through Shopify's GitHub integration:

1. In Shopify admin: **Online Store → Themes → Add theme → Connect from GitHub**.
2. Select this repository and the `main` branch.
3. Shopify creates an unpublished theme that stays in sync with `main`. Every merge deploys. Publish it at launch.

The integration is **two-way**: changes made in the theme editor are committed back to `main`. Pull `main` before branching. Only the connected branch syncs, so feature branches are safe to push.

| Branch | Purpose |
|---|---|
| `main` | Production, connected to the Shopify theme |
| `claude/*`, `feature/*` | Development branches, merged into `main` via PR |

## Local development

Requires the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli):

```bash
npm install -g @shopify/cli@latest
shopify theme dev --store <store>.myshopify.com
shopify theme check
```

## Fonts

The brand typeface **TT Commons Pro** (Regular 400, Medium 500, DemiBold 600) is self-hosted from `assets/` and wired up in `snippets/bs-font-face.liquid`. Dawn's font pickers are removed; the size scales remain editable in Theme settings → Typography.

> ⚠️ **The licensed woff2 files are not committed yet.** Add `tt-commons-pro-regular.woff2`, `tt-commons-pro-medium.woff2` and `tt-commons-pro-demibold.woff2` to `assets/`. No code change is needed. Until then the theme renders in the system fallback font.
