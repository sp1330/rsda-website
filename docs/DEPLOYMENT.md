# Deployment

There are two independent deploys: the website (Cloudflare Pages) and the backend (Railway). They do not depend on each other, so you can ship either alone.

## Website (Cloudflare Pages)

The Pages project `rsdriveautomation` is deployed by **direct upload**, not from git. Pushing to this repo does not change the live site.

1. Run `python3 scripts/check-site.py` and fix anything it reports.
2. Test locally (`python3 -m http.server 8765 --directory site`).
3. Cloudflare dashboard, Workers and Pages, `rsdriveautomation`, **Create deployment**.
4. Drag the **entire `site/` folder** into the upload box. Never upload single files: the `images/` folder and the sitemaps must go with it.
5. Wait about 30 seconds for the deployment to go live.
6. Hard refresh (Cmd+Shift+R) and check the changed pages. Also open `/sitemap.xml` and one `/product?part=...` URL.
7. Commit and push the same state to this repo so git always matches what is live.

Rollback: in the same Cloudflare project, open Deployments and promote the previous deployment.

Suggested improvement: connect the Pages project to this GitHub repo (build command none, output directory `site`) so that merging to `main` deploys automatically. Discuss with the client before changing how deployments work.

### Cloudflare cache

Static files are cached on Cloudflare's CDN. After a deploy, visitors normally see the new version within about a minute. If a stale file persists, purge the cache from the Cloudflare dashboard.

## Backend (Railway)

Railway builds `pocketbase/Dockerfile` and redeploys automatically when the backend repo (`rpatel-2019/rsda-pocketbase`) receives a push, in about two minutes.

The backend source also lives in this repo under `pocketbase/`. The two copies are separate: the Railway deployment follows the `rsda-pocketbase` repo. If you change a hook or migration:

1. Edit the file, test it if you can run PocketBase locally.
2. Commit it to `rpatel-2019/rsda-pocketbase` (this triggers the deploy) **and** copy the same change into `pocketbase/` here so the repos stay in step.
3. Watch Railway, project `rsda-pocketbase`, Deployments, View Logs, for errors. A syntax error in a hook can break form submissions, so check the contact form afterwards (tell the client first, a real email is sent).

Restart: Railway, project, Settings, Restart, or push any commit.

### Running PocketBase locally (optional)

```bash
# macOS/Linux, from a scratch folder
curl -L -o pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.23.4/pocketbase_0.23.4_darwin_arm64.zip
unzip pb.zip -d pb && cd pb
cp -r /path/to/repo/pocketbase/pb_hooks /path/to/repo/pocketbase/pb_migrations .
./pocketbase superuser upsert you@example.com a-local-password
RESEND_API_KEY=dummy ./pocketbase serve
```

Use a dummy `RESEND_API_KEY` locally so no real emails go out. Point `PB_URL` in the HTML files at `http://127.0.0.1:8090` only on a local branch, never commit that.

## Changing the Content Security Policy

Edit `site/_headers`. Any new third-party domain (analytics, ads, fonts, maps) must be added to the correct directive or the browser blocks it. Test in the browser console for `Refused to load` messages after deploying.

## Domain and DNS

All DNS is in Cloudflare. The registrar is only for renewal. Records and caveats are in [ACCOUNTS-AND-ACCESS.md](ACCOUNTS-AND-ACCESS.md).
