# Current State

Snapshot of what exists, what is incomplete and what is risky. Update this when the project's
state materially changes. Labels:

- **Verified**: confirmed by reading the code (and, where noted, by running a check)
- **Likely**: strongly suggested by the code but not exercised at runtime
- **Unknown**: needs confirmation from the owner or a runtime test

Last full review: 2026-09-24 at commit `9c953cb`. Nothing was run against a database during that
review. Findings come from static reading plus `tsc` and `eslint`.

---

## Owner decisions (2026-09-24)

The owner has decided the open permission and business questions. These are the **target**
rules (see `docs/DECISIONS.md` D-016). Until a task implements them, the code may still differ.
The "Known risks" list below records the code as it was reviewed.

| Topic | Target rule | Code at `9c953cb` |
| --- | --- | --- |
| STAFF writes | View-only, except creating/editing the **daily sales entry for their own branch** | STAFF can also write expenses, stock movements and per-location minimums (risk 5) |
| STAFF expenses | May not create or edit | Allowed |
| STAFF stock movements | May not create or edit | Allowed |
| Manager salaries | May not view or edit individual salaries anywhere. Enforced on the server as well as in the UI | Leaks through the edit dialog and actions (risk 1) |
| Stock items / suppliers | OWNER-only create/edit/delete. Managers read and use them in movements and requests | Managers can create/edit/delete (risk 12) |
| Business timezone | `Asia/Hebron` for every branch | Everything uses UTC (risk 4) |
| Warehouse purchases | Should **eventually** post to Finance as expenses | They do not (Missing/partial) |
| Partial fulfilment of stock requests | Not supported, for now | Matches the code (all-or-nothing) |

## Health checks (2026-09-24)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ passes, no errors |
| `npm run lint` | ✅ passes, no warnings |
| Automated tests | ❌ none existed at `9c953cb`. Vitest added 2026-09-24 (`npm test`), see update below |
| i18n key parity en/ar | ✅ 855 / 855, no missing keys |
| Working tree | clean on `master` |

## Implemented (appears complete)

Build history, from the commit log: Phase 1 schema/auth/shell → 2 sales → 2.5 multi-currency
sales → 3 finance → 4 stock → 5 Arabic/RTL → 6 employees → 7 management + marketing →
8 warehouses/locations/requests → 9 live rates + calculator. After that came Vercel/Blob
deployment prep, account management, private file serving and the owner-recovery script.

- **Auth**: login, JWT sessions, per-request deactivation/role re-check, sign-out,
  owner-managed users (create, edit, reset password, activate/deactivate, last-owner guard),
  self-service profile and password change. *Verified*
- **Dashboard**: weekly sales, finance metrics, 30-day revenue, today per branch, low stock,
  today's shift coverage gaps, expiring documents, high-priority tasks, pending stock requests.
  *Verified (code)*
- **Sales**: daily entry per branch with multi-currency amounts and optional product line
  items, edit, owner-only delete, duplicate detection, charts. *Verified (code)*
- **Finance**: expenses in any currency with receipt upload, edit, owner-only delete, profit per
  branch, 6-month trend, category breakdown. *Verified (code)*
- **Stock**: items, suppliers, warehouses, per-location levels and minimums, movements
  (purchase/consumption/waste/adjustment/transfer), low-stock alerts, stock requests with
  approve/reject/fulfil. *Verified (code)*
- **Employees**: staff records, weekly schedule grid, monthly salary-expense generation.
  *Verified (code)*
- **Management**: task board (kanban-style status), documents with expiry. *Verified (code)*
- **Marketing**: campaigns (with optional expense and before/after revenue impact), menu
  experiments, feedback log. *Verified (code)*
- **Tools**: calculator with quick calc (safe parser), margin, price setter, break-even.
  *Verified (code)*
- **Currencies**: live refresh via cron + manual refresh, manual/auto toggle, staleness
  warnings. *Verified (code)*
- **i18n/RTL**: full EN/AR with RTL `dir`, logical CSS utilities. *Verified (code). The
  visual RTL quality has not been checked in a browser.*
- **Mobile**: bottom nav + mobile top bar below `md`. *Likely works. Not checked on a device
  in this review.*

## Missing / partial

- **Branch management**: no UI or server action to create, rename or deactivate branches. The
  only sources are the seed and direct DB edits. *Verified*
- **Fresh-database setup does not create branch stock locations.** Branch-type `StockLocation`
  rows were created only by the data migration `20260824140000_...`, for branches that existed
  at that moment. `prisma/seed.ts` creates branches but no `StockLocation`, so on a new
  database (migrate, then seed) branches have no stock location and non-owners cannot record
  stock at all. Any branch added later has the same gap. *Verified (code). Not reproduced at
  runtime.*
- **Product/menu management**: no UI for `Product` / `BranchProduct`. Only seeded. *Verified*
- **Partial stock-request fulfilment**: not supported. It's all or nothing, and
  `quantityFulfilled` always equals the requested quantity. *Verified*
- **Warehouse purchase costs** never reach Finance. Only purchases at a branch location create
  an expense. That is intentional per the code comment, but it means warehouse spending is
  invisible in profit. *Verified*
- **Stock valuation / COGS**: there is none. Movements carry `costIls` only on purchases. *Verified*
- **Salary ↔ employee link**: a code comment (`lib/actions/finance.ts`) notes SALARY expenses
  should eventually link to employees. Generation is a per-branch lump sum with no proration
  for mid-month starters or leavers. *Verified*
- **Blob cleanup**: deleting a document or replacing a receipt leaves the old blob in storage.
  *Verified*
- **Audit trail** for edits and deletes (who changed a sales entry or expense, and when): none.
  Only `enteredById` / `createdAt` on creation. *Verified*
- **Tests**: only the regression tests for salary confidentiality and branch scoping (added
  2026-09-24). No coverage yet for money, stock or other modules.

## Known risks (found in review, not fixed)

Ordered by severity. Found at `9c953cb`. Unless an item is marked **FIXED**, it has not been
changed and needs an owner decision or a scoped task.

### High

1. **FIXED 2026-09-24** (see update at the end). **Managers can see and change individual salaries.** The UI hides salary columns for
   managers, but `employees-table.tsx` passes each employee's `salaryIls` into the edit dialog
   props, and `employee-form-dialog.tsx` renders an editable salary field for everyone.
   `updateEmployee` / `createEmployee` accept `salaryIls` from managers. This contradicts the
   README ("Salary amounts are hidden" for managers). *Verified (code)*
2. **FIXED 2026-09-24** (see update at the end). **Branch scoping fails open for a non-owner with no branch.** Every page computes
   `scopedBranchId = isOwner ? undefined : (branchId ?? undefined)`, and queries treat
   `undefined` as "all branches". A MANAGER/STAFF with `branchId = null` would see every
   branch's sales, finance and stock. The user actions and seed prevent creating such a user,
   but the schema allows it (`branchId` nullable, DB edits, future branch deletion). *Verified
   (code). Conditional on bad data.*
3. **Stock quantity updates are read-modify-write, not atomic.** `applyMovementTx` reads
   `currentQuantity`, computes `next` in JS, and writes the absolute value. Two concurrent
   movements on the same item and location can lose one update, and the negative-stock guard
   can be bypassed. The default Postgres isolation (READ COMMITTED) does not prevent this.
   *Likely (standard race; not reproduced)*
4. **All "today" logic is UTC**, but the business runs in Palestine (UTC+2/+3). Between
   local midnight and 02:00–03:00, "today" is still yesterday: entering today's sales is
   rejected as a future date, and dashboards/"today" cards show the previous day. Month
   boundaries shift the same way. *Verified (code)*

### Medium

5. **STAFF can create and edit sales entries, expenses, stock movements and per-location
   minimums** for their own branch. The README describes STAFF as "read-mostly". The code
   deliberately allows these writes. *Decided 2026-09-24 (D-016): only the sales entry is
   allowed. Expense, stock-movement and minimum writes are not implemented yet.*
6. **Editing a manually set rate on an auto-updated currency is overwritten by the next daily
   cron.** `updateCurrencyRate` doesn't flip `isAutoUpdated` off, and the input isn't
   disabled. *Likely*
7. **Auto-created expenses can drift from their source.** A stock-purchase or campaign expense
   can be edited or deleted independently (the FK is set to null on delete), and editing a
   campaign's budget doesn't update its expense. `createCampaign` creates the expense and the
   campaign outside a transaction. *Verified (code)*
8. **Salary generation idempotency depends on the notes text** (`salary-gen:YYYY-MM`). Editing
   those notes allows a duplicate month. The generation loop is not transactional. *Verified*
9. **`receiptUrl` / `fileUrl` are client-supplied strings** and are not checked to be the
   caller's own upload path. The file route authorizes by the record that references the path,
   so pointing a new expense at someone else's blob path would grant access to it. This is only
   exploitable if the attacker already knows the random UUID path. *Verified (code). Low
   likelihood.*
10. **Deleting a sales entry or expense with a bad id throws.** `deleteSalesEntry` has no
    existence check and no try/catch, so Prisma P2025 becomes an unhandled server error. *Verified*
11. **Login email is case-sensitive.** Users are stored lowercased, but `authorize()` looks up
    the email as typed. *Verified*
12. **Stock items and suppliers are global, and any MANAGER can rename, deactivate or delete
    them**, which affects every branch. *Verified. Decided 2026-09-24 (D-016): OWNER-only. Not
   implemented yet.*

### Low

13. Navigation shows every module to every role. STAFF clicking Marketing is silently
    redirected. The mobile bottom nav has 9 horizontally scrolling items. *Verified*
14. `getAssignableUsers` includes deactivated users, and tasks can be assigned to users of
    other branches (no server check on `assignedToId`). *Verified*
15. `updateCurrencyRate` doesn't block editing the ILS base rate server-side (the UI does).
    *Verified*
16. Some server error strings are English only (uploads, calculator, "Unknown currency").
    *Verified*
17. `@auth/prisma-adapter` is an unused dependency. *Verified*
18. The Decimal → `Number` conversion (`toNumber`) is used for money arithmetic. That's fine at
    current magnitudes with `roundCurrency`, but it is not exact decimal math. *Verified*

## Documentation vs code inconsistencies

- README "Manager: salary amounts are hidden". It was false at `9c953cb` (risk 1). It is true since
  the 2026-09-24 fix.
- README "Staff: read-mostly". Staff can write sales, expenses and stock movements (risk 5).
- README Scripts table has no type-check command, and there is no `typecheck` npm script. Use
  `npx tsc --noEmit`.
- README links `#environment-variables` from DEPLOYMENT.md, but the README heading is
  "Deployment (Vercel) → Environment variables". The anchor probably resolves to the H3.
  Minor.
- The code comment in `lib/actions/finance.ts` says SALARY expenses will link to employees
  "once that module exists". The Employees module now exists. The comment is stale.
- The `stock-locations.ts` comment says "BRANCH locations are created by the branch
  migration/seed". The seed does not create them (see Missing/partial).

## Suggested priorities

These are suggestions only. The owner decides.

1. ~~Decide STAFF/MANAGER permissions~~ (done: D-016). ~~Fix the salary leak~~ (done 2026-09-24).
2. ~~Make branch scoping fail closed for non-owners without a branch~~ (done 2026-09-24).
2a. Remove STAFF write access to expenses, stock movements and minimums, and make stock
    items/suppliers OWNER-only (D-016, not yet implemented).
3. Make stock quantity updates atomic (DB-side increment/conditional update or row lock).
4. Introduce the business timezone (`Asia/Hebron`, per D-016) for "today" and period boundaries.
5. Ensure every branch has a BRANCH stock location (seed + a branch-creation path).
6. Add a minimal test harness for money and stock primitives before larger changes.


## Supplemental independent review — 2026-09-24 (Codex)

The initial findings above were independently checked at `9c953cb`. During review, Claude's documentation appeared in the working tree; it was read and preserved. The earlier clean-tree health row describes the initial baseline, not the final documentation working tree. No application fixes were made.

### Additional priority findings

1. **Cross-branch stock request visibility — verified query construction.** In `src/lib/queries/stock.ts`, `visibleLocationWhere` includes every active warehouse for branch users. `getStockRequests` selects requests with either endpoint in that visible set, returning other branches' requests through a shared warehouse, including names, quantities and notes. Visibility of a warehouse does not necessarily authorize visibility of every requesting branch. Confirm intended policy; no live data was queried.
2. **Organization-wide campaign metrics bypass caller branch scope — verified query construction.** `getCampaignsWithImpact` returns shared campaigns to managers, then `getCampaignImpact` uses no branch filter for a null-branch campaign. Resulting revenue averages represent all branches. Evidence: `src/lib/queries/marketing.ts` and the marketing page.
3. **Request fulfilment can be submitted twice — code-confirmed missing conditional transition; concurrency outcome not reproduced.** `fulfillStockRequest` reads APPROVED outside its transaction, then moves quantities and updates status by id unconditionally. Overlapping requests can both pass the initial check and fulfil twice if enough stock remains. Approval/rejection also check before unconditional writes. Evidence: `src/lib/actions/stock-requests.ts`. Movement transactions ensure rollback, not exactly-once processing. There is no request/transfer-pair foreign key on StockMovement.
4. **Historical edit changes conversion — verified.** Both sales/expense update actions recalculate ILS from current Currency rates even for a notes-only edit. D-005 applies to rate refresh alone; it is not an immutable historical conversion policy for edits. Confirm the intended accounting behavior before changing it.
5. **Advertised upload limit exceeds framework limit — verified configuration mismatch, runtime untested.** `actions/upload.ts` permits 5 MB, but next.config.mjs has no bodySizeLimit override. Installed Next.js guide `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` documents a 1 MB default for the entire request body. Larger files can fail before action validation.
6. **Seed password instructions are inaccurate — verified.** `prisma/seed.ts` upserts existing users with role/branch only, never passwordHash. Reseeding with SEED_PASSWORD or accepting its generated-password output does not reset existing users, contrary to README/seed output guidance. `scripts/create-owner.ts` does reset the targeted account; neither script was executed.

### Qualifications and other review notes

- Salary exposure also includes salary-bearing metrics/branch totals passed to client components; finance exposes SALARY expenses to own-branch users. Decide both individual and aggregate salary permissions.
- The existing stock read/modify/write finding remains a **risk requiring a concurrent database test**, not a reproduced corruption incident. Exact locking effects depend on Prisma/PostgreSQL upsert execution; no proof of the deployed execution path was obtained.
- Decimal storage plus `Math.round(value * 100) / 100` does **not** establish rounding correctness, even for small amounts. For example, the helper's expression rounds 1.005 to 1.00 in JavaScript. The earlier description that Number arithmetic is fine at current magnitudes is not a verified financial guarantee. Adopt explicit precision/rounding acceptance cases in subsequent work.
- Attachment ownership validation deserves an authorization test. The file proxy prioritizes an expense match over a document match, so a known protected document path attached to an accessible expense can change the authorization outcome. Random paths are not an access-control substitute. No exploit was attempted.
- Salary generation also lacks a unique branch/month constraint and can race, independently of edited notes. Campaign expense creation has no transaction with campaign creation. Existing financial-integrity findings remain open.
- Cron accepts unauthenticated requests when CRON_SECRET is absent; local `.env` name inspection found no such variable, but deployed configuration is unknown. No route was invoked.
- Password changes/resets do not revoke existing JWTs through a password-version field. Deactivation does revoke access at session re-check. No application-level rate limiter/MFA found; hosting controls unknown.
- Dates generally validate format rather than real calendar validity. Task assignee branch membership is not enforced. No application error.tsx/loading.tsx boundaries found. Error handling is inconsistent across actions.
- Low-stock alerts scan existing LocationStock rows; missing rows shown as zero in the grid can be absent from alerts. Active-item/location checks vary across transfer/request actions. Zero minimum means fallback to the item threshold.
- README's broad manager/staff descriptions omit several delete and global-catalog permissions. Sales list hides non-owner edit controls although own-branch edit route/action permits access.
- README claims generation needs no DATABASE_URL, but prisma.config.ts calls required `env("DATABASE_URL")`; environment-free generation was not tested. Deployment order for incompatible schema changes needs care to avoid a code/schema mismatch window. `.env`/`.env*.local` are ignored, but not every possible `.env.*` name is covered.
- Reporting has no dedicated export route; several lists are unpaginated and campaign impact queries scale per campaign. Sound files are missing. Full RTL, touch/keyboard usability, browser dialogs and production behavior remain unverified.

### Independent check results and next task

`npm run lint` and `node node_modules/typescript/bin/tsc --noEmit --incremental false` both exited 0 without diagnostics. Parsed catalogs have 855 matching leaf keys each. Reviewed the 217-file initial tracked inventory, nine migrations, action/query/validation modules, routes, configuration and feature/UI structure. Generated dependencies/build output were not treated as authored application code. No automated test suite was available. Build, clean-install, live integration and browser tests were not run; no seed, migration, backfill, recovery, Blob write, rate refresh, deployment, commit or push was performed.

Recommended next task remains a bounded authorization pass: agree the role/branch matrix, then address salary data, null-branch fail-closed behavior, request/campaign scope and attachment binding with regression tests. Follow with request/payroll idempotency and financial atomicity. Resolve historical-rate edit behavior, warehouse cost allocation, business timezone/week boundaries and partial fulfilment as explicit business decisions rather than silently changing them.


## Update 2026-09-24: salary confidentiality and fail-closed branch scoping (Claude)

Implements D-016 items 4 and 9 (see D-017 and D-018). This is the commit after the docs commit
`4c588a2`.

**Salary (risk 1): fixed. Verified by tests.**
- `src/lib/permissions.ts` `canViewSalaries(role)`: only OWNER.
- `src/lib/queries/employees.ts`: every function that reads salary now takes
  `{ includeSalary }`. With `false`, `salaryIls` is left out of the Prisma query (`omit`, no
  `_sum`), and results carry `null`. Covers `getEmployeesTable`, `getEmployeeMetrics` (salary
  total and labor-cost %), `getEmployeeCostByBranch`, and the currently unused
  `getEmployeeForEdit`.
- `src/lib/actions/employees.ts`: only an OWNER writes `salaryIls`. A MANAGER update never
  touches it. A MANAGER create stores 0 whatever is submitted. An OWNER must still provide a
  salary.
- The UI hides the salary column, the salary field in the add/edit dialog, and salary metrics
  when salary may not be shown.

**Branch scoping (risk 2): fixed. Verified by tests.**
- `getBranchScope(user)` returns `all` / `branch` / `none`. All 15 branch-scoped pages render
  `<NoBranchAssigned />` for `none`, before any query runs. The edit pages check before loading
  the record. STAFF on `/employees` and `/marketing` are still redirected first, as before.
- `/api/files`: a MANAGER without a branch can no longer open org-wide documents.
- Server actions were re-checked. They already failed closed for a null branch (strict
  equality against a non-null branch id, or an explicit `!branchId` check), so they were not
  changed.

**Still open / not covered by this change**
- MANAGERs still see **branch-level SALARY expenses** in Finance (the lump sums from salary
  generation), and the break-even tool includes them in fixed costs. These are aggregates,
  not individual salaries. For a branch with a single employee, though, the aggregate equals
  that person's salary. Needs an owner decision.
- An employee created by a MANAGER has salary 0 until the OWNER edits it. Nothing flags these
  records yet, and monthly salary generation counts them as 0.
- Not checked in a browser: logging in needs credentials. Server-side behaviour is covered by
  `tests/` (56 tests).
- `npm audit` reports advisories in existing dependencies, including a **critical** one for
  `next@16.3.2` (fixed in 16.3.6). Not addressed here. *Resolved later on 2026-09-24: see "Update
  2026-09-24: Next.js 16.3.6 security upgrade".*

## Update 2026-09-24: Next.js 16.3.6 security upgrade (Claude)

- `next` and `eslint-config-next` went from 16.3.2 to **16.3.6** (exact pins, kept in sync). The
  lockfile changes are limited to `next`/`@next/*` and Next's `sharp` image dependency
  (0.35.3 → 0.35.4, libvips 1.3.2 → 1.3.3), plus a few small transitive shifts.
- This fixes GHSA-p293-qw3h-jr36 (unauthenticated RCE on Windows-hosted servers) and
  GHSA-2xp9-vwfh-vxw4 (RCE in the Image Optimization API with AVIF). The `sharp` high-severity
  advisory also went away with the bump.
- The bundled docs (`node_modules/next/dist/docs/`) only have major-version upgrade guides and
  no 16.3.x patch notes, so no breaking changes apply. The `AGENTS.md` managed block is still
  current for 16.3.6 (checked with `hasCurrentAgentRules`).
- Checks: `npm test` 56/56, `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass,
  with no build warnings. Not checked in a browser or on Vercel.

**`npm audit` after the upgrade: 6 high, 0 critical** (it was 1 critical + 7 high). None are
fixed here because they are outside this task:

| Package | Severity | Comes in via | Fix available |
| --- | --- | --- | --- |
| `fast-uri` ≤3.1.5 (SSRF / host confusion) | high | `@hookform/resolvers` → `ajv` (runtime dep) | `npm audit fix` (non-breaking) |
| `js-yaml` 4.0.0–4.3.1 (CPU DoS) | high | `eslint` → `@eslint/eslintrc` (dev only) | `npm audit fix` (non-breaking) |
| `deepmerge-ts` <8 (stack exhaustion) | high | `prisma` → `@prisma/config` (CLI/dev tooling) | only by downgrading to prisma 6 (breaking, **do not**) |
| `mysql2` ≤3.23.0 | high | `prisma` CLI (unused MySQL driver; the app uses Postgres) | only by downgrading to prisma 6 (breaking, **do not**) |
| `@prisma/config`, `prisma` | high | carry the two above | same |

Suggested follow-up: a separate small task to run the non-breaking `npm audit fix` for
`fast-uri`/`js-yaml`, and watch for a Prisma 7.x release that updates `deepmerge-ts`/`mysql2`.

