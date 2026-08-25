# Deployment

Operational notes for running Brown Sugar HQ on Vercel. For local setup see the
[README](README.md).

## Which database is which

This project talks to more than one Neon branch. They are easy to confuse, and confusing
them has already caused one production outage.

| Environment | Neon endpoint | Where the connection string lives |
| --- | --- | --- |
| Local development | `ep-morning-flower-b16d9mmh` | `.env` in this working copy (gitignored) |
| Production (Vercel) | `ep-ancient-band-b14lt84k` | Vercel → Project → Settings → Environment Variables → `DATABASE_URL` (Production scope) |

**The endpoint listed for production is the one Vercel actually connects to.** It is not
necessarily the branch that looks like production in the Neon dashboard — a Neon project can
hold several branches, and the name of a branch tells you nothing about which one the
deployed application reads. Always take the production connection string from Vercel's own
environment variables, never from a branch you picked by name in Neon.

To confirm which endpoint a connection string points at without exposing the credentials:

```bash
node -e "console.log(new URL(process.argv[1]).host)" "<connection-string>"
```

## Which Blob store is which

Receipts and documents live in Vercel Blob, and the same split applies: local development and
production must use **separate stores**. A `BLOB_READ_WRITE_TOKEN` grants both read and write,
so a laptop pointed at the production store can upload into it and delete from it. Cleaning up
test files locally would then delete real receipts.

| Environment | Blob store | Where the token lives |
| --- | --- | --- |
| Local development | `brownsugar-hq-dev` | `BLOB_READ_WRITE_TOKEN` in `.env` (gitignored) |
| Production | `brownsugar-hq-prod` | Injected by Vercel into the Production environment |

### Telling them apart

A Blob token is shaped `vercel_blob_rw_<STORE_ID>_<SECRET>`. The fourth underscore-separated
segment is the store id, which is not secret and is shown in the Vercel dashboard. To check
which store a token addresses without printing the secret:

```bash
node -e "require('dotenv').config(); console.log(process.env.BLOB_READ_WRITE_TOKEN.split('_')[3])"
```

Compare that against the store id in Vercel → Storage → the store → Settings. If your local
`.env` prints the production store's id, replace it with the development store's token before
uploading or deleting anything.

### Never clean up blobs against production

Never run a script that deletes blobs while `.env` points at the production store. In
particular, "delete every blob not referenced by the database" is only safe when the token and
the database belong to the *same* environment — run against a dev database with a production
token, every production file looks unreferenced.

## Migrations are never automatic

**Migrations are never applied automatically.** `npm run build` runs `prisma generate`, which
only regenerates the client — it does not touch the database. After any schema change you
must run `prisma migrate deploy` against the Vercel database yourself.

Until you do, the deployed code and the production database disagree. That is not a quiet
failure: the application selects columns it expects to exist, so a missing one breaks sign-in
and every page that reads a session.

### Order of operations

1. Create and apply the migration locally.
2. Push the code.
3. Run `migrate deploy` against the production database.

Step 3 is not optional and does not happen on its own.

## Exact commands

### 1. Create the migration locally

```bash
npx prisma migrate dev --name your_change_name
```

This writes a new folder under `prisma/migrations/` and applies it to your local database.
Commit that folder along with the schema change.

### 2. Push the code

```bash
git push origin master
```

The branch is `master`, not `main`.

### 3. Get the production connection string

From the dashboard: Vercel → Project → Settings → Environment Variables → `DATABASE_URL`
(Production scope) → reveal and copy.

Or with the CLI, which avoids transcribing it by hand:

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.production.local --environment=production
```

`.env.production.local` is gitignored by Next.js. Delete it when you are done.

> Use the **unpooled** form of the string for migrations — the host **without** `-pooler`.
> Migrations run DDL in a transaction and do not behave reliably through a connection pooler.
> The application itself wants the pooled string; only migrations want the direct one.

### 4. Apply the migration to production

The datasource reads `DATABASE_URL` (see `prisma.config.ts`), so overriding it for the single
command is enough. **PowerShell and bash need different syntax** — this project is developed on
Windows, so both are given.

PowerShell:

```powershell
$env:DATABASE_URL="<production-unpooled-url>"; npx prisma migrate deploy; Remove-Item Env:\DATABASE_URL
```

bash / Git Bash:

```bash
DATABASE_URL="<production-unpooled-url>" npx prisma migrate deploy
```

Always `migrate deploy`, **never** `migrate dev`, against production. `deploy` only applies
migration files that already exist; `dev` can prompt to reset the database and will happily
drop data.

### 5. Verify

```powershell
$env:DATABASE_URL="<production-unpooled-url>"; npx prisma migrate status; Remove-Item Env:\DATABASE_URL
```

```bash
DATABASE_URL="<production-unpooled-url>" npx prisma migrate status
```

Expect `Database schema is up to date!`. If it lists pending migrations, step 4 did not take
effect — check that you pointed at the endpoint in the table above and not another branch.

Then load the deployed site and sign in. A schema mismatch shows up as a failed login, because
`authorize()` selects the columns the new code expects.

## Environment variables

See the [README](README.md#environment-variables) for the full table of what to set and where
each value comes from. Two things worth repeating here:

- Environment variables must be scoped to **Production** to affect the production deployment.
  A variable set only for Preview is invisible to it.
- Changing a variable does **not** affect the running deployment. You must redeploy afterwards.

## Rollback

Prisma has no `migrate down`. To undo a schema change, write a new migration that reverses it
and deploy that. For a destructive change, deploy code that tolerates both the old and the new
schema first, so the window between the push and the migration stays safe.

## Incident log

**2026-08-25 — production login failure.** The `user_is_active` migration was applied to a
Neon branch that was not the one Vercel connects to. The deployed code selected
`User.isActive` in both `authorize()` and the session `jwt` callback, so sign-in failed with a
generic "invalid email or password" and every authenticated page errored. Verifying "the
production branch" from a laptop did not catch it, because the branch checked was neither the
local nor the Vercel one. Resolved by running `migrate deploy` against
`ep-ancient-band-b14lt84k`.

Two changes came out of it: this document, and a `try/catch` around the session re-check in
`src/auth.ts`, so a future schema drift signs users out rather than erroring every route at
once.

**2026-08-25 — shared Blob store, near miss.** Local `.env` held a `BLOB_READ_WRITE_TOKEN` for
the same store production used. A cleanup script deleted every blob not referenced by the
*local* database, which would have destroyed production receipts had any existed — the store
happened to hold only local test files. Resolved by splitting development and production into
separate stores; see [Which Blob store is which](#which-blob-store-is-which).
