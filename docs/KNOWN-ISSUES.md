# Known issues and current state

Last reviewed with this repo's first commit. Items are ordered by how soon you will likely need them.

## 1. Changes in this repo that may not be live

The price-removal work (August 2026) is in this repo but was **never confirmed deployed**: Cloudflare Pages was reported under maintenance at the time. Files affected: `site/products.json`, `site/product.html`, `site/browse.html`, `site/index.html`, `site/sitemap-products-1/2/3.xml`.

How to check what is live:

- `https://rsdriveautomation.co.nz/products.json` should be about 2.9 MB, and rows should have three entries, e.g. `[619,"3RK2200-0CU20-0AA3","N"]`. The old file was 4.4 MB with a fourth entry like `"350 EUR"`.
- Any product URL in `https://rsdriveautomation.co.nz/sitemap-products-1.xml` should end at `&amp;cond=X` with no `price=`.
- Clicking a related part on a product page should give a URL without `&price=`.

If those are not true, deploy `site/` as described in [DEPLOYMENT.md](DEPLOYMENT.md).

Background: the catalogue data contained a price in EUR for every part (for example `350 EUR`). It was never displayed on any page, but it was carried in product URLs, the sitemap and the data file, so anyone could read it. The client sells on a quote-only model and does not want prices published, so it was removed everywhere. Do not re-introduce it.

## 2. Product pages are not SEO-ready (highest-value fix)

`product.html` sets its title, meta description, canonical, Open Graph tags and Product JSON-LD with JavaScript after the page loads. The HTML the server sends has generic placeholders, identical for all 127,690 product URLs. Google can render JavaScript but indexing at this scale is slow and unreliable, and social scrapers and non-JS crawlers see only the placeholders.

Recommended fix: generate the tags server-side. The lowest-friction option on this stack is a Cloudflare Pages Function (a `functions/` folder next to `site/`) or a Worker that reads `part`, `brand`, `cond` from the URL and injects the real tags into the HTML before it is returned. Alternative: pre-render static pages per part at build time (large, 127,690 files).

## 3. Condition labels are wrong on product pages

Data uses condition codes `N`, `R`, `U`, `NNB`, `NOB`. `product.html` `condLabel()` only understands `'0'`, `'1'`, `'2'`, so real products fall through to "Contact for details", and the schema `itemCondition` test (`COND === '0'`) is never true, so every product is marked "RefurbishedCondition". `index.html` has the correct mapping (`COND_LABEL`, around line 2242) to copy from.

## 4. `index.html` contains the whole page twice

See "Duplication warning" in [ARCHITECTURE.md](ARCHITECTURE.md). Duplicate element IDs and duplicate functions. Works in browsers today. Cleaning it up would cut roughly half the file but needs careful regression testing of navigation, search, forms and the logo editor.

## 5. No analytics or search tooling

No Google Analytics, Search Console, Business Profile or Bing Webmaster setup exists, and there is no conversion tracking on the enquiry forms. Install order that works: Search Console (verify via DNS TXT record in Cloudflare, submit `sitemap.xml`), GA4 with a form-submit event, then Ads conversion tracking if paid search starts. Remember the CSP in `_headers` must be extended first, see ARCHITECTURE.md.

## 6. Catalogue data pipeline is undocumented

There is **no script in this repo that produces `products.json` or the sitemaps**, and the original supplier feed is not here. The August 2026 changes were made with one-off scripts. To refresh the catalogue a developer needs the source feed and must write a generator that emits `products.json` (format in ARCHITECTURE.md) and the three product sitemaps (45,000 URLs per file maximum, ampersands escaped as `&amp;`). Ask the client where the data comes from. Build this before promising catalogue updates.

## 7. Performance

- `products.json` (2.9 MB) is downloaded in full by `product.html` just to show six related parts, and by `browse.html` and the home-page search. Splitting it per brand, or serving related parts from a small API, would cut page weight sharply.
- Core Web Vitals have not been measured. Run PageSpeed Insights on the home, browse and a product URL.
- Several images are very large: `img01.png` and `img04.png` are 3.2 MB each, `img03.png` and `img06.png` 2.7 MB each, `img07.png` 2.1 MB. `img01` and `img04` are byte-identical, as are `img03` and `img06`, so the duplicates can be removed once the references are merged. `img04.png` is also the Open Graph image and the schema logo. Compress and consider WebP.

## 8. Smaller items

- `product.html` and `index.html` still contain unused code from the removed price feature: CSS classes `.prod-price` and `.sr-price`, price-sort branches in `browse.html` (not reachable from the UI), and a `price` field populated from `row[3]`, which is now always empty. Harmless, safe to delete.
- Product Offer schema has no price by design. Google may treat an Offer without price as ineligible for product rich results. Consider dropping `offers` or leaving as is, deliberately.
- `sitemap-main.xml` lists only two URLs. Content pages inside `index.html` have no URLs of their own, so they cannot be indexed individually. Giving the key pages real URLs (services, manufacturers, contact, sell) is part of the SEO plan.
- `_headers` contains a leftover comment about replacing `YOUR_RAILWAY_HOST`. The CSP already uses wildcards for `*.railway.app`, so no action is needed.
- There are no automated tests and no CI.

## 9. Operational checks to confirm with the client

- Railway billing: the earlier handover noted a $5 trial credit and an instruction to add a card. Confirm billing is active so the backend does not stop.
- Domain expiry date and auto-renew.
- The database volume has no automated backup (see ACCOUNTS-AND-ACCESS.md).
- The GitHub backend repo's remote URL on the original machine had a personal access token embedded in it. It should have been revoked. If you find any token in a remote URL or file, treat it as compromised and rotate it.

## 10. Where the SEO work stands

The SEO audit and the execution checklist are in [docs/seo/](seo/). Phase 1 (analytics, Search Console, Business Profile, deploy the price fix) was not completed at the time of this handover. The product-page fix (item 2) and manufacturer landing pages are the highest-value engineering tasks.
