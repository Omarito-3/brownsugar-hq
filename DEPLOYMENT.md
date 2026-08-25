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

## The rule

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
