# RS Drive Automation website

Source for **rsdriveautomation.co.nz**, an Auckland supplier of industrial automation parts and services (NZ and AU). This repo holds everything needed to run, change and deploy the website and its backend.

If you are taking this project over, read in this order:

1. This file (5 minutes)
2. [docs/ACCOUNTS-AND-ACCESS.md](docs/ACCOUNTS-AND-ACCESS.md) - which services run what, and what you need access to
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - how the code is organised
4. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - how changes go live
5. [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) - current state, bugs, and what is not yet deployed
6. [docs/seo/](docs/seo/) - SEO audit and the execution checklist (the main ongoing work)

## Taking over this repo

This repo is public so it can be handed over easily. To own a private copy:

```bash
git clone https://github.com/sp1330/rsda-website.git
cd rsda-website
# create an empty PRIVATE repo on your own GitHub account, then:
git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-PRIVATE-REPO.git
git push -u origin main
```

After that, ask the client for the access listed in [docs/ACCOUNTS-AND-ACCESS.md](docs/ACCOUNTS-AND-ACCESS.md). The original repo being public means it holds no secrets, but treat everything in `docs/` as business-sensitive and do not re-publish it.

## What is in the repo

```
site/         Website. Static HTML/CSS/JS, no framework, no build step.
pocketbase/   Backend. PocketBase (Go) with JS hooks, runs on Railway via Docker.
scripts/      check-site.py - sanity checks to run before every deploy.
docs/         Handover documentation. docs/seo/ has the SEO audits and checklist,
              docs/original-guides/ has the earlier technical handover guide (paths in it are out of date,
              the files in docs/ here supersede them).
assets/       Brand logo files and the business card.
```

## Run the site locally

```bash
python3 -m http.server 8765 --directory site
# open http://localhost:8765
```

Notes: Cloudflare-specific files (`_redirects`, `_headers`) are not applied locally. Forms and brand logos talk to the live backend on Railway, so submitting a form locally sends a real enquiry email to sales. Do not submit test forms without telling the client.

## Before every deploy

```bash
python3 scripts/check-site.py
```

It checks that `products.json` is valid, all sitemap files are well-formed XML, and no product URL leaks a `price` parameter.

## Stack at a glance

| Part | Technology | Hosted on |
|---|---|---|
| Website | Static HTML/CSS/JS | Cloudflare Pages (project `rsdriveautomation`) |
| DNS and domain routing | Cloudflare | Cloudflare |
| Backend / database | PocketBase 0.23.4 (SQLite) | Railway (project `rsda-pocketbase`) |
| Form emails | Resend API, called from PocketBase hooks | resend.com |
| Backend source (separate repo) | `rpatel-2019/rsda-pocketbase` | GitHub |

## Business rules to respect

- **No prices anywhere.** RS Drive Automation sells on a quote-only model. Prices must never appear on pages, in URLs, in `products.json`, in sitemaps or in structured data.
- The business is an **independent supplier**, not an authorised dealer of the brands it lists. Keep the disclaimer wording intact.
- Primary conversion is the **quote / enquiry form**. Do not break it.

## Secrets

None are stored in this repo and none should ever be committed. The backend needs three environment variables set on Railway, listed in [pocketbase/.env.example](pocketbase/.env.example).
