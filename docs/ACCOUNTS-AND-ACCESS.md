# Accounts and access

No passwords are in this repo. Access to every service below is granted by **invitation** from the account owner. Do not ask for, or accept, anyone's master password.

## Services

| Service | URL | What it does | What you need |
|---|---|---|---|
| Cloudflare | dash.cloudflare.com | Hosts the website (Pages project `rsdriveautomation`), manages DNS for rsdriveautomation.co.nz | Invite as account member, with access to Pages and DNS |
| Railway | railway.app | Runs the PocketBase backend (project `rsda-pocketbase`), holds environment variables, logs, and the database volume | Invite to the project |
| PocketBase admin panel | rsda-pocketbase-production.up.railway.app/_/ | Database UI: enquiries, sell submissions, brand logos | A second superuser account created for you (do not share the existing one) |
| GitHub (backend) | github.com/rpatel-2019/rsda-pocketbase | Backend source; a push triggers a Railway redeploy | Collaborator on the repo |
| GitHub (this repo) | github.com/sp1330/rsda-website | Website and backend source, docs | Collaborator on the repo |
| Resend | resend.com | Sends the enquiry notification emails | Invite as team member (needed to check logs or rotate the API key) |
| Domain registrar | where rsdriveautomation.co.nz was bought | Domain renewal only. DNS is not managed here | Ask the client; usually read-only is enough |

## Who owns what

The business owner holds the Cloudflare account (owner email begins `R.patel@rsdriveautomation`). Railway and the backend GitHub repo are under the GitHub user `rpatel-2019`. This repo is under `sp1330` and can be transferred to the business account (Settings, Danger Zone, Transfer).

## Onboarding checklist for the incoming developer

Ask the client to complete each item:

- [ ] Invite you to Cloudflare (Pages and DNS)
- [ ] Invite you to the Railway project `rsda-pocketbase`
- [ ] Add you as collaborator to `rpatel-2019/rsda-pocketbase`
- [ ] Add you as collaborator to `sp1330/rsda-website`
- [ ] Create you a PocketBase superuser (admin panel, Superusers collection)
- [ ] Invite you to Resend
- [ ] Confirm the domain expiry date and that auto-renew is on
- [ ] Give you a **backup of the PocketBase database** (see below)
- [ ] Give you the source of the parts catalogue data (see KNOWN-ISSUES, "Catalogue data pipeline")
- [ ] Set up Google Analytics, Search Console and Google Business Profile, or add you to them (none exist yet)

## Environment variables (Railway, project `rsda-pocketbase`, Variables tab)

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Lets the hooks send email through Resend |
| `PB_SUPERUSER_EMAIL` | Superuser email, created or updated on every container start |
| `PB_SUPERUSER_PASSWORD` | Superuser password, set from this variable on every container start |

Because the superuser is upserted from these variables at startup, changing the password in the admin panel alone will be reverted on the next restart. Change it in Railway.

## The database is not in git

Contact enquiries, sell-to-us submissions (with uploaded files) and the **brand logo images** live in a SQLite database on a Railway volume mounted at `/pb/pb_data`. Git does not contain it and there is no automated backup. Before handing over, and regularly after:

- In the PocketBase admin panel, Settings, Backups, create a backup and download it, **or**
- Download the volume contents through the Railway CLI.

If that volume is lost, all past enquiries and the uploaded brand logos are lost with it. Logos can be re-uploaded through the site's logo editor, but enquiry history cannot be recovered.

## DNS records (managed in Cloudflare)

| Type | Name | Target |
|---|---|---|
| CNAME | `@` | `rsdriveautomation.pages.dev` |
| CNAME | `www` | `rsdriveautomation.pages.dev` |

The sending domain must also be verified in Resend (Resend dashboard, Domains), which normally requires extra DNS records in Cloudflare. These were not checked when this handover was written. Do not delete unfamiliar TXT, MX or CNAME records without checking what they belong to.
