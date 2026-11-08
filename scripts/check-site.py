#!/usr/bin/env python3
"""Pre-deploy sanity checks for the site/ folder.

Run from the repo root:  python3 scripts/check-site.py
Exits 0 if everything passes, 1 otherwise. Standard library only.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
errors = []


def fail(msg):
    errors.append(msg)
    print(f"FAIL  {msg}")


def ok(msg):
    print(f"ok    {msg}")


# 1. products.json is valid, rows are [brandIndex, part, cond] with no price
try:
    data = json.loads((SITE / "products.json").read_text(encoding="utf-8"))
    brands, rows = data["b"], data["p"]
    bad_len = sum(1 for r in rows if len(r) != 3)
    bad_idx = sum(1 for r in rows if not (0 <= r[0] < len(brands)))
    if bad_len:
        fail(f"products.json: {bad_len} rows do not have exactly 3 fields (price re-added?)")
    elif bad_idx:
        fail(f"products.json: {bad_idx} rows point at a missing brand")
    else:
        ok(f"products.json valid: {len(brands)} brands, {len(rows)} parts, no price field")
except Exception as exc:  # noqa: BLE001
    fail(f"products.json unreadable: {exc}")
    rows = []

# 2. every sitemap is well-formed XML
sitemaps = sorted(SITE.glob("sitemap*.xml"))
total_urls = 0
product_urls = 0
for sm in sitemaps:
    try:
        tree = ET.parse(sm)
    except ET.ParseError as exc:
        fail(f"{sm.name}: not well-formed XML ({exc}). Ampersands must be &amp;")
        continue
    locs = [e.text or "" for e in tree.getroot().iter() if e.tag.endswith("}loc")]
    if sm.name.startswith("sitemap-products"):
        product_urls += len(locs)
        if len(locs) > 50000:
            fail(f"{sm.name}: {len(locs)} URLs exceeds the 50,000 limit")
        leaked = [u for u in locs if "price" in u.lower()]
        if leaked:
            fail(f"{sm.name}: {len(leaked)} URLs contain 'price', e.g. {leaked[0]}")
        spaces = [u for u in locs if " " in u]
        if spaces:
            fail(f"{sm.name}: {len(spaces)} URLs contain raw spaces, e.g. {spaces[0]}")
    total_urls += len(locs)
ok(f"{len(sitemaps)} sitemap files parsed, {total_urls} URLs") if not errors else None

if rows and product_urls and product_urls != len(rows):
    fail(f"sitemaps list {product_urls} product URLs but products.json has {len(rows)} parts")
elif rows and product_urls:
    ok("product sitemap URL count matches products.json")

# 3. no HTML template builds a URL with a price parameter
for name in ("index.html", "product.html", "browse.html"):
    text = (SITE / name).read_text(encoding="utf-8")
    hits = re.findall(r"[?&]price=|'&price='|\"&price=\"", text)
    if hits:
        fail(f"{name}: builds URLs with a price parameter")
    else:
        ok(f"{name}: no price in generated URLs")

# 4. required files exist
for name in ("index.html", "browse.html", "product.html", "robots.txt", "sitemap.xml", "_headers", "_redirects"):
    if not (SITE / name).exists():
        fail(f"missing site/{name}")
if not (SITE / "images").is_dir():
    fail("missing site/images/")

print()
if errors:
    print(f"{len(errors)} problem(s). Do not deploy until fixed.")
    sys.exit(1)
print("All checks passed.")
