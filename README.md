# Brown Sugar HQ

Internal operations hub for the Brown Sugar branches — sales, finance, stock, employees,
management, and marketing, in English and Arabic (with full RTL support).

Deploying or changing the schema? Read [DEPLOYMENT.md](DEPLOYMENT.md) first.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + **React 19**
- **Prisma 7** against **PostgreSQL** (Neon)
- **NextAuth v5** (credentials, JWT sessions)
- **Tailwind CSS v4** + shadcn/ui
- **next-intl** for i18n (cookie-based locale, no path prefix)

## Getting Started

Create a `.env` file with your database connection string:

```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
```

Then install, migrate, seed, and run:

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test accounts

> **Local development only.** These accounts exist so role scoping can be checked by logging
> in as each role. They must never exist in a deployed environment. If you have already run
> the seed against a live database, change the passwords through `/settings/users` or delete
> the accounts.

`npm run db:seed` creates three accounts, one per role. They share a password, which the seed
prints when it finishes. Set `SEED_PASSWORD` to choose it:

```bash
SEED_PASSWORD="your-dev-password" npm run db:seed
```

With `SEED_PASSWORD` unset a random one is generated and printed **once** — only the hash is
stored, so if you don't copy it from the output you'll need to seed again. No password is
hardcoded in the repository.

| Role | Email | Branch |
| --- | --- | --- |
| Owner | `owner@brownsugar.hq` | All branches |
| Manager | `manager@brownsugar.hq` | Batn al-Hawa |
| Staff | `staff@brownsugar.hq` | Batn al-Hawa |

The manager and staff accounts share a branch on purpose: that makes it possible to view the
same branch's data under two different roles and see only the permissions differ.

### What each role should see

**Owner** — everything: all branches, all salary figures, currency settings, salary-expense
generation, and delete permissions across every module.

**Manager** — scoped to their own branch only. Salary amounts are hidden (no salary metric
cards, no salary column in the employees table, no "Generate salary expenses" button), but
they can otherwise manage their branch's sales, expenses, stock, employees, schedule, tasks,
documents, campaigns, experiments, and feedback.

**Staff** — read-mostly. `/employees` redirects to a read-only weekly schedule for their
branch, `/marketing` redirects to the dashboard, and `/management` shows only the tasks
assigned to them (whose status they can update). Dashboard data is scoped to their branch.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Seed branches, currencies, products, and test accounts |
| `npm run db:studio` | Open Prisma Studio |

## Localization

The UI ships in English (default) and Arabic. Locale is stored in a `NEXT_LOCALE` cookie and
switched with the `EN | ع` toggle in the sidebar. When Arabic is active the document is set to
`dir="rtl"` and the layout mirrors; currency symbols, amounts, and dates stay in Western
digits. Chart axes and internals stay LTR, which is standard for RTL dashboards.

Translation catalogs live in [`messages/en.json`](messages/en.json) and
[`messages/ar.json`](messages/ar.json). Both files must stay key-for-key in sync.

## Deployment (Vercel)

### Environment variables

Set these in **Project → Settings → Environment Variables**.

| Variable | Where the value comes from | Required |
| --- | --- | --- |
| `DATABASE_URL` | Neon dashboard → your project → **Connection string**. Use the **pooled** string (host contains `-pooler`) — serverless functions open many short-lived connections and will exhaust a direct connection. | Yes |
| `AUTH_SECRET` | Generate one: `npx auth secret`. Any long random string works; it signs session JWTs. Changing it logs everyone out. | Yes |
| `BLOB_READ_WRITE_TOKEN` | Injected automatically when you connect a Blob store under **Storage**. Only set by hand for local dev (**Storage → your store → `.env.local` tab**). | Yes, for uploads |
| `CRON_SECRET` | Invent one: `openssl rand -hex 32`. Vercel Cron sends it as `Authorization: Bearer …`. **If unset, `/api/cron/rates` is publicly callable.** | Yes |
| `EXCHANGE_RATES_URL` | Leave unset. Only set it to point at a different rate provider. | No |

`AUTH_URL` is deliberately **not** required — `trustHost: true` derives the URL from the
request, so preview deployments work without per-deployment configuration.

### Build

`npm run build` runs `prisma generate && next build`. Prisma generation is in the build script
rather than only in `postinstall` because Vercel restores a cached `node_modules` on most
builds and skips `postinstall`, which would otherwise ship a stale client after a schema
change. `prisma generate` needs neither a reachable database nor `DATABASE_URL`.

### Cron

[`vercel.json`](vercel.json) schedules `/api/cron/rates` daily at 06:00 UTC. Once-a-day is the
maximum frequency on Vercel's Hobby plan; on Hobby the trigger time is approximate.

### Running migrations against production

Migrations are **not** applied automatically by the build. After any schema change you must run
`prisma migrate deploy` against the database Vercel connects to — which is a different Neon
branch from your local one.

**See [DEPLOYMENT.md](DEPLOYMENT.md) for the endpoints, the exact commands, and why this
matters.** Getting it wrong has already caused a production outage.

## Notes

- Uploads (expense receipts, management documents) go to a **private Vercel Blob** store and are
  served through [`/api/files/[...path]`](src/app/api/files/%5B...path%5D/route.ts), which
  authenticates the request and authorizes it against the record that owns the file. Blob URLs
  are never exposed directly.
- The seeded test accounts are **local development credentials**. Never run `npm run db:seed`
  against a deployed database.
