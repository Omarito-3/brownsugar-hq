# Brown Sugar HQ — Shared Project Context

This is the shared source of truth for every engineer and AI agent working in this repository.
It describes how the project **is**, verified against the code. It is not a wishlist. When the
code and this file disagree, the code wins, and this file should be corrected.

Companion files:

- [CURRENT_STATE.md](CURRENT_STATE.md): what works, what is partial, known risks and debt
- [DECISIONS.md](DECISIONS.md): architectural and business decision log (append-only)
- [AI_WORKLOG.md](AI_WORKLOG.md): handoff log between agents (append-only)
- [../DEPLOYMENT.md](../DEPLOYMENT.md): production database, Blob stores, migrations, incident log
- [../README.md](../README.md): local setup and role summary

Last verified against commit `9c953cb` (2026-09-24).

---

## 1. What it is

Brown Sugar HQ is an internal operations system for **Brown Sugar, a Coffee & Bubble Tea
House** with several branches. It is not a point-of-sale (POS) system. Staff enter **one
aggregate sales record per branch per day**, not individual orders.

Business areas: dashboard, sales, finance/expenses, stock/inventory (warehouses, branches,
suppliers, requests, transfers), employees (staff, shifts, salary), management (tasks,
documents), marketing (campaigns, menu experiments, customer feedback), a business
calculator, and settings (account, users, currencies).

Seeded branches (from `prisma/seed.ts`): Batn al-Hawa (Jerusalem), Icon Mall (Ramallah),
Birzeit University.

Guiding principles from the owner:

1. Simple enough for non-technical employees.
2. Usable on mobile.
3. Financial calculations must be reliable.
4. Inventory movements must be traceable.
5. Branch permissions must be strictly enforced, and each role sees only what it is allowed to.
6. Arabic and RTL must work correctly.
7. Avoid unnecessary complexity. Business logic matters more than clever engineering.
8. Don't casually break working functionality.

## 2. Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16.3** (App Router, Server Components, Server Actions) | Has breaking changes from older Next.js. Read `node_modules/next/dist/docs/` before writing framework code. Middleware lives in `src/proxy.ts` (the Next 16 name), not `middleware.ts`. |
| UI | React 19.2, Tailwind CSS v4, shadcn/ui (Radix), lucide icons, sonner toasts, framer-motion, recharts | `components.json` = shadcn config |
| Forms | react-hook-form + zod v4 (`@hookform/resolvers`) | |
| DB | PostgreSQL (Neon in production) via **Prisma 7** with the `@prisma/adapter-pg` driver adapter | Client generated to `src/generated/prisma` (gitignored). Config in `prisma.config.ts`. |
| Auth | **NextAuth v5 beta** (`next-auth@5.0.0-beta`), Credentials provider, JWT sessions, bcryptjs | `@auth/prisma-adapter` is installed but **not used** |
| i18n | next-intl 4, cookie-based locale (`NEXT_LOCALE`), no URL prefix | `messages/en.json`, `messages/ar.json` |
| Files | Vercel Blob (**private** store), proxied through `/api/files/...` | |
| Hosting | Vercel, with a daily Vercel Cron job (`vercel.json`) | |
| Tooling | ESLint 9 (next config + prettier), Prettier with the tailwind plugin, TypeScript 5 strict, tsx for scripts | **No test framework and no tests** |

## 3. Directory map

```
prisma/
  schema.prisma              data model (single source for the DB shape)
  migrations/                9 migrations; some are hand-written and data-preserving
  seed.ts                    branches, currencies, products, three dev test accounts
scripts/
  create-owner.ts            create or reset an OWNER account (recovery path)
  backfill-sales-currency-amounts.ts   one-off historical backfill
messages/{en,ar}.json        translation catalogs (must stay key-for-key identical)
src/
  proxy.ts                   Next 16 "middleware": redirects unauthenticated users to /login
  auth.ts                    NextAuth (Node runtime): credentials login + per-request user re-check
  auth.config.ts             edge-safe NextAuth config (JWT/session callbacks, trustHost)
  app/
    layout.tsx               root: sets <html lang dir>, theme, intl provider, toaster
    page.tsx                 redirects to /dashboard
    login/                   login page
    (app)/                   authenticated shell (sidebar, mobile topbar, bottom nav)
      dashboard, sales, finance, stock/{items,locations,movement,requests,suppliers},
      employees/{schedule}, management, marketing, tools/calculator,
      settings/{account,currencies,users}
    api/
      auth/[...nextauth]     NextAuth handlers
      files/[...path]        authenticated proxy for private Blob files
      cron/rates             daily exchange-rate refresh (Bearer CRON_SECRET)
  lib/
    actions/*.ts             "use server" mutations. All writes go through these.
    queries/*.ts             "server-only" read functions used by pages
    validations/*.ts         zod schemas, shared by client forms and server actions
    stock-movements.ts       applyMovementTx(): the single stock-quantity mutation primitive
    exchange-rates.ts        live rate fetch (open.er-api.com) + staleness check
    format.ts                money/number/date formatting, rounding, date keys
    safe-eval.ts             arithmetic parser for the calculator (no eval())
    *-labels.ts, branch-colors.ts   display helpers
    prisma.ts                PrismaClient singleton with the pg adapter
  components/
    ui/                      shadcn primitives (don't hand-edit without reason)
    layout/, shared/, charts/, providers/, motion/
    sales/, finance/, stock/, employees/, management/, marketing/, settings/, tools/
  config/nav.ts              navigation items (same list for every role)
  i18n/                      locale list + next-intl request config
  types/next-auth.d.ts       adds id/role/branchId to Session, User, JWT
```

## 4. Architecture

- **Rendering:** pages are async Server Components. Each one calls `auth()`, works out the
  user's branch scope, and calls `lib/queries/*` in parallel. Interactive parts are client
  components that receive serialized props.
- **Mutations:** client components call Server Actions in `lib/actions/*` directly. Every action:
  1. calls `auth()` and rejects unauthenticated users,
  2. validates input with the shared zod schema, built with translated messages via
     `getTranslations`,
  3. enforces role and branch rules **on the server**,
  4. writes through Prisma, sometimes inside `$transaction`,
  5. calls `revalidatePath(...)` for affected pages,
  6. returns `{ ok: true, ... } | { ok: false, error }` and does **not** throw for expected
     failures.
- **There are no REST/JSON APIs** besides auth, file serving and cron.
- **Money:** each multi-currency amount is converted to ILS **on the server at write time**
  using the stored rate, rounded with `roundCurrency` (2dp), and stored next to the original
  amount. Client-submitted ILS amounts are never trusted. Later rate changes never recalculate
  existing records.
- **Dates:** business dates are Postgres `DATE` columns written as `YYYY-MM-DDT00:00:00Z`.
  Every "today", "this week" and "this month" calculation uses **UTC** (see CURRENT_STATE risks).
  Weeks are ISO weeks (Monday start) in sales and Sunday-start in the schedule.

## 5. Data model (summary of `prisma/schema.prisma`)

All IDs are cuid strings. Money is `Decimal(10,2)`, rates are `Decimal(10,4)`, and stock
quantities are `Decimal(10,2)`.

| Area | Models | Key facts |
| --- | --- | --- |
| Org | `Branch`, `User` | `User.role` ∈ OWNER/MANAGER/STAFF. `User.branchId` is nullable (null for OWNER). `User.isActive`: users are deactivated, never deleted. There is **no UI or action to create or edit branches**. They come from the seed or direct DB work. |
| Catalog | `Product`, `BranchProduct` | Menu products with ILS base price/cost and per-branch availability/price override. Used for optional sales line items and the calculator. There is no product-management UI. |
| Currency | `Currency` | PK = ISO code. `rateToIls` = ILS per 1 unit. ILS is the base (1.0). Seeded: ILS, USD, JOD, EUR. `isAutoUpdated` + `lastFetchedAt` track the live feed. |
| Sales | `SalesEntry`, `SalesCurrencyAmount`, `SalesLineItem` | **Unique (branchId, date)**: one entry per branch per day. `totalIls` = sum of the currency rows' `amountIls`. Line items (product × qty) are optional and informational. They do not affect totals. |
| Finance | `Expense` | Original amount + currency + `amountIls`. Categories: RENT, SUPPLIES, SALARY, MARKETING, EQUIPMENT, OTHER. Optional `receiptUrl` (an `/api/files/...` path). Can be linked 1:1 from a `StockMovement` or `Campaign` (FK `ON DELETE SET NULL`). |
| Stock | `StockItem`, `StockLocation`, `LocationStock`, `StockMovement`, `Supplier` | Items are **global** (shared across locations). A location is a WAREHOUSE (`branchId` null) or a BRANCH. `LocationStock` holds `currentQuantity` and a per-location `minimumQuantity` (when > 0 it overrides the item's `lowStockThreshold`). `StockMovement` is the append-only ledger: PURCHASE, CONSUMPTION, WASTE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT (+ direction). |
| Stock requests | `StockRequest`, `StockRequestItem` | PENDING → APPROVED → FULFILLED, or PENDING → REJECTED. Fulfilment creates transfer movement pairs. |
| Employees | `Employee`, `ShiftAssignment` | Employees are HR records, **separate from `User` logins**. `salaryIls` is monthly. There is one shift (MORNING/EVENING/FULL_DAY) per employee per day. |
| Management | `Task`, `Document` | Task/document `branchId` null = org-wide. Documents have optional `expiryDate`. |
| Marketing | `Campaign`, `MenuExperiment`, `Feedback` | A campaign can optionally auto-create a MARKETING expense. |

Migrations: `prisma migrate dev` locally, `prisma migrate deploy` against production, applied
**by hand** (see DEPLOYMENT.md). `20260824140000_stock_locations_and_requests` is hand-written
and migrates the old `BranchStock` model into `StockLocation`/`LocationStock` with row-count
guards.

## 6. Authentication

- Credentials login (email + password, bcrypt, 10 rounds). There is no sign-up, no email reset,
  and no OAuth.
- JWT session strategy. The token carries `id`, `role`, `branchId`.
- `src/auth.ts` overrides the `jwt` callback so that **every session read re-queries the user**.
  An inactive or missing user, or a failed DB lookup, returns null and signs them out. Role and
  branch changes take effect on the next request without a re-login.
- `src/proxy.ts` (edge) only checks that a session exists and redirects to `/login`. Its matcher
  **excludes `/api/*`**, so API routes must authenticate themselves (they do).
- `src/app/(app)/layout.tsx` also redirects unauthenticated users.
- `trustHost: true`, so `AUTH_URL` is not needed.
- Account recovery: `npx tsx scripts/create-owner.ts` (reads `OWNER_PASSWORD` or generates one).

## 7. Roles and branch scoping

Roles are fixed in the `Role` enum. Nothing is configurable per user.

**Branch scoping pattern:** used on every page:

```ts
const isOwner = session.user.role === "OWNER";
const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);
// queries treat `undefined` as "all branches"
```

Server actions do their own checks. They don't rely on the UI hiding buttons.

The matrix below is verified from the server actions and page redirects:

| Capability | OWNER | MANAGER (own branch) | STAFF (own branch) |
| --- | --- | --- | --- |
| Dashboard | all branches | own branch | own branch (tasks: only assigned to them; no documents) |
| Sales: view | all | own | own |
| Sales: create / edit | any branch | own | **own (allowed)** |
| Sales: delete | ✓ | ✗ | ✗ |
| Expenses: view / create / edit | all / any | own | **own (allowed)** |
| Expenses: delete | ✓ | ✗ | ✗ |
| Stock: view levels/movements | all | own branch + all warehouses | own branch + all warehouses |
| Stock: record movement (purchase/consume/waste/adjust) | any active location | own branch location(s) | **own branch location(s)** |
| Stock: direct transfer between locations | ✓ | ✗ | ✗ |
| Stock items & suppliers (global) | ✓ | ✓ (edits affect all branches) | ✗ |
| Stock locations / warehouses | ✓ | ✗ | ✗ |
| Stock request: create | any | for own branch location | for own branch location |
| Stock request: approve/reject/fulfil | any | only if **fulfilling** location is their branch | ✗ |
| Per-location minimums | any | own | **own (allowed)** |
| Employees page | all + salaries | own branch (salary UI hidden*) | redirected to read-only schedule |
| Employees: create/edit/deactivate/delete | ✓ | own branch | ✗ |
| Schedule edit | ✓ | own branch | ✗ |
| Generate monthly salary expenses | ✓ | ✗ | ✗ |
| Tasks / documents: manage | ✓ (incl. org-wide) | own branch only | ✗ (may change status of tasks assigned to them) |
| Marketing | ✓ | own branch | redirected to dashboard |
| Calculator / break-even | all branches | own | own |
| Settings: account (own name/password) | ✓ | ✓ | ✓ |
| Settings: users, currencies | ✓ | ✗ | ✗ |

\* See CURRENT_STATE.md: salary values still reach the manager's browser through the edit dialog.

File access (`/api/files/...`): receipts go to the OWNER or anyone whose branch matches the
expense. Documents go to the OWNER, or to a MANAGER for their own branch or org-wide documents.
STAFF never gets documents. An unattached upload is readable only by its uploader. Denials
return 404.

## 8. Core business rules (as implemented)

**Sales**
- One `SalesEntry` per branch per date. A duplicate returns the existing entry id so the UI can
  offer to edit it.
- An entry holds 1+ currency rows (unique per currency). The server computes each row's
  `amountIls` from the current rate, and `totalIls` is their sum.
- Dates cannot be in the future (UTC).
- Non-owners always write to their own branch. The branchId they submit is ignored.

**Finance**
- `amountIls = round2(amountOriginal × rateToIls)` at write time.
- Profit = Σ `SalesEntry.totalIls` − Σ `Expense.amountIls` for the period and branch.
- Auto-created expenses:
  - PURCHASE stock movement with `costIls > 0` **at a branch location** creates a SUPPLIES
    expense (ILS). Warehouse purchases create **no** expense.
  - Campaign with "create expense" + budget + branch creates a MARKETING expense (ILS) dated at
    campaign start.
  - "Generate salary expenses" (OWNER): for a given month, one SALARY expense per active branch
    = Σ active employees' `salaryIls`. Idempotency relies on the marker `salary-gen:YYYY-MM`
    in `notes`.

**Stock**
- All quantity changes go through `applyMovementTx()` in `lib/stock-movements.ts`, which
  upserts the `LocationStock` row, applies the signed delta, **rejects a negative result**,
  and writes the `StockMovement` row inside the caller's transaction.
- Transfer = TRANSFER_OUT at the source + TRANSFER_IN at the destination, in one transaction.
- Request fulfilment moves **the full requested quantity** of every line atomically. A
  shortfall on any line rolls the whole thing back. Partial fulfilment is not supported.
- Low-stock alert: `currentQuantity < (minimumQuantity > 0 ? minimumQuantity : item.lowStockThreshold)`.
- Movements cannot be edited or deleted. Corrections are ADJUSTMENT movements.

**Currencies**
- Live rates come from `https://open.er-api.com/v6/latest/ILS` (overridable with
  `EXCHANGE_RATES_URL`). The stored rate is `1 / rates[CODE]`.
- Refreshed daily by Vercel Cron at 06:00 UTC and on demand by the OWNER. Currencies with
  `isAutoUpdated = false` are left alone. If the fetch fails, nothing is written.
- Rates older than 7 days are flagged stale in the UI.

**Employees**
- Deactivate rather than delete. Delete fails if history exists.
- `setDaySchedule` silently drops employees that do not belong to the target branch.

## 9. Localization and RTL

- Locales: `en` (default) and `ar`. Stored in the `NEXT_LOCALE` cookie by the `setLocale`
  server action. The switcher is in the sidebar.
- `src/app/layout.tsx` sets `<html lang dir="rtl|ltr">`.
- The layout uses logical Tailwind utilities (`ms-`, `me-`, `ps-`, `text-start`/`text-end`).
  No physical `ml-/mr-/pl-/pr-/left-/right-` classes were found outside `components/ui`.
- Numbers, currency and dates always use Western digits (`numberingSystem: "latn"`, `en-US`
  number formatting). Chart internals stay LTR.
- Stock items, locations and products have optional `nameAr`. `localizedName()` falls back to
  English.
- Both catalogs have **855 keys and are in exact parity** (checked 2026-09-24). Keep it that
  way: add every key to both files.
- Server-action error messages are translated. Exceptions (English only): upload errors in
  `lib/actions/upload.ts`, calculator errors in `lib/actions/tools.ts`, and
  `Unknown currency: X`.

## 10. Environment variables (names only)

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection (pooled in production; unpooled for migrations) |
| `AUTH_SECRET` | NextAuth JWT signing |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob. Dev and prod use **separate stores** |
| `CRON_SECRET` | Protects `/api/cron/rates`. If unset, the endpoint is open |
| `EXCHANGE_RATES_URL` | optional rate provider override |
| `SEED_PASSWORD` | optional, dev seed accounts |
| `OWNER_PASSWORD` | optional, `scripts/create-owner.ts` |

`.env` is gitignored. Never copy values into docs, commits or chat.

## 11. Deployment

- Vercel, branch **`master`** (not `main`). Remote: `github.com/Omarito-3/brownsugar-hq`.
- `npm run build` = `prisma generate && next build`. The build **does not run migrations**.
- Local dev and production use different Neon branches and different Blob stores. Read
  DEPLOYMENT.md before touching either, because a mix-up has already caused one outage.
- Local preview: `.claude/launch.json` starts `npm run dev -- -p 3010`.

## 12. Commands

```bash
npm run dev            # dev server
npx tsc --noEmit       # type check (no npm script for it)
npm run lint           # eslint
npm run build          # prisma generate + next build
npm run db:migrate     # prisma migrate dev (LOCAL ONLY)
npm run db:seed        # LOCAL ONLY. Never against production
```


## 13. Supplemental verification and precise limits — 2026-09-24

Independent Codex review at the same baseline (`9c953cb`) confirms the broad architecture above. The following qualifies broad descriptions; it does not introduce new application policy:

- The locked versions are Next.js 16.3.2, React 19.2.8, Prisma 7.9.1, next-auth 5.0.0-beta.32 and next-intl 4.13.7. The schema has 23 models. Application model IDs default to cuid, but Currency uses code as its key and the stock-location migration creates some IDs using UUID text.
- The action lifecycle in section 4 is a general pattern, not a universal guarantee: setLocale is deliberately unauthenticated, scalar actions do not all use Zod, and many writes can propagate database errors. Query modules rely on caller authentication/scope; `server-only` itself does not authorize access.
- Rate refresh does not recalculate existing transactions. **Editing** a sales entry or expense does reconvert using current rates, even if only notes changed. There is no explicit rate-snapshot field.
- Managers also read organization-wide tasks/documents/campaigns/experiments. Shared campaign impact aggregates all-branch sales; warehouse-inclusive request queries can reveal other branches' requests. See the supplemental findings in CURRENT_STATE.md.
- The root sets RTL direction, but no explicit LTR direction enforcement was found in chart components or globals.css. Chart appearance is unverified, so the earlier statement that charts stay LTR should be treated as documented intent. The locale switch is also present in the mobile topbar.
- NIS is stored as `ILS`. Finance is recorded revenue minus expenses, not a full ledger/COGS calculation. Break-even treats average order value as contribution and ignores variable costs. Optional sales product quantities do not consume stock. Reporting is embedded in module pages; no dedicated report builder/export route was found.
- Uploads declare a 5 MB limit; the framework request limit is a separate constraint (see CURRENT_STATE.md). Public sounds contains instructions but no tracked MP3 assets. Responsive classes exist; browser/mobile/RTL correctness has not been tested.
- Additional configuration names used by scripts are OWNER_EMAIL and OWNER_NAME; optional AUTH_URL is discussed in README. Environment names only were inspected. Remote database/Blob separation and deployed migration/cron configuration remain unverified; DEPLOYMENT.md is the recorded operational history.
- No test script/framework or tracked CI workflow was found. Static checks do not establish production readiness. No database, Blob or production operation was performed in this review.
