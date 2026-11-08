# Architecture

## Overview

```
Visitor browser
   |  HTML/JS/JSON (static, cached on Cloudflare CDN)
   v
Cloudflare Pages  (site/)
   |  fetch() for logos, POST for forms
   v
PocketBase on Railway  (pocketbase/)  --->  Resend API  --->  sales@ inbox
   |
   +-- SQLite + uploads on a Railway volume
```

The website has no server-side code of its own. Everything dynamic is either client-side JavaScript or a call to PocketBase.

## `site/`

| File | What it is |
|---|---|
| `index.html` | The home page **and every content page** (about, services, manufacturers, contact, sell, warranty, terms, privacy, returns, shipping, IP). About 4,100 lines. See the duplication warning below. |
| `browse.html` | Catalogue browser: search, brand filter, category view, grid/list. Loads `products.json` client-side. |
| `product.html` | Single product page template. All 127,690 product URLs use this one file, e.g. `/product.html?part=EK1100&brand=Beckhoff&cond=R`. Cloudflare serves it without `.html` as `/product?...`. |
| `products.json` | Catalogue data. `{ "b": [brand names], "p": [[brandIndex, partNumber, conditionCode], ...] }`. |
| `sitemap.xml` | Sitemap index. |
| `sitemap-main.xml` | Home and browse pages. |
| `sitemap-products-1/2/3.xml` | One URL per product (45,000 + 45,000 + 37,690 = 127,690). Ampersands must stay escaped as `&amp;`. |
| `robots.txt` | Allows all, points to `sitemap.xml`. |
| `_headers` | Cloudflare security headers and the Content Security Policy. |
| `_redirects` | www to root redirect, and a catch-all that serves `index.html`. |
| `images/` | `img01.png` to `img08.png`, page imagery. Brand logos are **not** here, they come from PocketBase. |

### How `index.html` works

- All pages are `<div id="page-NAME" class="page">` blocks inside one document. `showPage('NAME')` toggles which one is visible. There is no URL routing between them, `_redirects` just returns `index.html` for any path.
- Pages: `home, about, products, services, contact, warranty, terms, privacy, sell, returns, shipping, ip`.
- Key globals near line 2090: `PB_URL` (backend address) and `_brandSlugMap` (brand display name to full name for search links).
- Search: `loadSearchData()` fetches `/products.json` on first use, `doSearch()` token-matches part numbers and brands, `renderSearchResults()` builds the dropdown, `goToProduct()` navigates to `product.html`.
- Forms: `submitForm(e, type)` posts to PocketBase (`enquiries` or `sell_enquiries`).
- Brand logos: an async function at the end of the file fetches `/api/collections/logos/records` and applies logo, zoom, x and y to each brand frame. An in-page logo editor lets a logged-in PocketBase admin adjust and save logos.

### Duplication warning

`index.html` contains the page markup **twice**. The first copy runs from `<body>` (line 649) to a truncated `</html` at about line 2553. A second full copy of the nav, all pages, and scripts follows, ending at line 4146. A code comment, "PB_URL already declared in Copy 1 script above", shows this was intentional at some point, but it produces duplicate element IDs and duplicate function definitions, and it doubles the size of the file (347 KB). Browsers tolerate it, so the site works, but treat the file carefully: a fix applied to one copy may need applying to the other. Removing the duplicate is a worthwhile cleanup (see KNOWN-ISSUES) and should be tested thoroughly.

### How `product.html` works

The file ships with generic placeholder `<title>`, meta description, canonical, Open Graph and JSON-LD. On `DOMContentLoaded`, `initPage()` reads `part`, `brand` and `cond` from the query string and rewrites all of those in the DOM, builds the Product schema, fills the spec table and breadcrumb. `loadRelated()` then fetches `products.json` and shows up to six other parts from the same brand. Search engines that do not run JavaScript, and social share scrapers, only see the placeholder values.

### Condition codes

`products.json` uses `N` New (121,100), `R` Refurbished (6,135), `U` Used (201), `NNB` New No Box (159), `NOB` New Open Box (95). `index.html` maps these correctly (`COND_LABEL`). `product.html` does not, see KNOWN-ISSUES.

## `pocketbase/`

| Path | Purpose |
|---|---|
| `Dockerfile` | Alpine image, downloads PocketBase 0.23.4, copies hooks and migrations, upserts the superuser from env vars, serves on port 8090. `pb_data` must be a mounted volume at `/pb/pb_data`. |
| `pb_migrations/1_init_collections.js` | Creates the collections below. Runs automatically on start. |
| `pb_hooks/enquiries.pb.js` | On contact form create: takes the real IP, rate-limits to 3 submissions per IP per hour, sanitises input, filters spam keywords. After create: emails sales via Resend. |
| `pb_hooks/sell_enquiries.pb.js` | Same pattern for the sell-to-us form. |
| `pb_hooks/logos.pb.js` | Sets default zoom, x and y on new logo records. |

### Collections

| Collection | Purpose | Who can create | Who can read, edit, delete |
|---|---|---|---|
| `admin_users` | Admin logins used by the in-page logo editor | superusers only | superusers only |
| `enquiries` | Contact form submissions | public | `admin_users` only |
| `sell_enquiries` | Sell-to-us submissions and uploads | public | `admin_users` only |
| `logos` | Brand logo image plus zoom, x, y per brand | `admin_users` | **public read**, `admin_users` write |

## Security configuration

- `_headers` sets HSTS, `X-Frame-Options: DENY`, a strict Content Security Policy and a locked-down Permissions-Policy.
- The CSP allows scripts and styles only from self (with `unsafe-inline`), `cdnjs.cloudflare.com`, Google Fonts, and API connections to `*.railway.app`. **If you add any third-party script (Google Analytics, Tag Manager, Google Ads), you must extend `script-src`, `connect-src` and `img-src` in `_headers`, or the browser will silently block it.**
- If the backend ever moves off `*.railway.app`, update `connect-src` and `img-src` and `PB_URL` in `index.html`, `product.html` and `browse.html`.
