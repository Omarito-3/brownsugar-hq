# Decision Log

Append-only record of architectural and business decisions. **Never rewrite or delete past
entries.** If a decision is reversed, add a new entry that supersedes it and reference the
old one.

Entries up to 2026-09-24 were **reconstructed from the code, commit history and existing docs**
during the initial context review. Their dates are the commit dates. Their stated reasons come
from code comments where available. The original authors did not state alternatives, so
"Alternatives considered" for those entries only records what the code comments mention.

Template:

```
## D-NNN: Title
Date:
Decision:
Reason:
Alternatives considered:
Affected files/modules:
```

---

## D-001: Next.js App Router + Server Actions, no separate API layer
Date: 2026-08-21 (Phase 1)
Decision: One Next.js app. Pages are Server Components that call `lib/queries/*`. All writes are
Server Actions in `lib/actions/*` that return `{ ok, error }` result objects instead of throwing.
Reason: Simplest full-stack shape for a small internal tool, and server-side auth on every
mutation.
Alternatives considered: not recorded.
Affected files/modules: `src/app/**`, `src/lib/actions/**`, `src/lib/queries/**`

## D-002: PostgreSQL (Neon) via Prisma 7 with the pg driver adapter
Date: 2026-08-21
Decision: Prisma 7 with `prisma-client` generator output to `src/generated/prisma` (gitignored),
`@prisma/adapter-pg`, config in `prisma.config.ts`.
Reason: Not recorded in code.
Alternatives considered: not recorded.
Affected files/modules: `prisma/**`, `prisma.config.ts`, `src/lib/prisma.ts`

## D-003: Credentials auth with JWT sessions and three fixed roles
Date: 2026-08-21
Decision: NextAuth v5 Credentials provider, JWT strategy, roles OWNER / MANAGER / STAFF. OWNER is
org-wide (no branch). MANAGER and STAFF are bound to one branch.
Reason: Internal tool with owner-provisioned accounts. No self sign-up.
Alternatives considered: not recorded.
Affected files/modules: `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, `prisma/schema.prisma`

## D-004: Sales are one aggregate entry per branch per day
Date: 2026-08-21 (Phase 2)
Decision: `SalesEntry` has a unique `(branchId, date)`. Product line items are optional and do
not drive totals.
Reason: The system is an operations hub, not a POS. Staff record end-of-day totals.
Alternatives considered: not recorded.
Affected files/modules: `SalesEntry`, `lib/actions/sales.ts`

## D-005: ILS is the base currency; convert at write time and freeze
Date: 2026-08-22 (Phase 2.5 / 3)
Decision: Every money record stores the original amount + currency + `amountIls` computed on the
server from the current `Currency.rateToIls`. Existing records are never recalculated when rates
change. Client-submitted ILS values are ignored.
Reason: Code comment: "Server is the source of truth for exchange rates". Historical totals must
not move.
Alternatives considered: not recorded.
Affected files/modules: `lib/actions/sales.ts`, `lib/actions/finance.ts`, `lib/exchange-rates.ts`

## D-006: Stock is a movement ledger; quantities change only via `applyMovementTx`
Date: 2026-08-22 (Phase 4), updated 2026-08-24 (Phase 8)
Decision: `StockMovement` rows are the history. `LocationStock.currentQuantity` is the running
balance, changed only by `applyMovementTx` inside a transaction. Negative stock is rejected.
Adjustments carry an explicit INCREASE/DECREASE direction. Transfers are OUT+IN pairs.
Reason: Inventory movements must be traceable.
Alternatives considered: not recorded.
Affected files/modules: `lib/stock-movements.ts`, `lib/actions/stock.ts`, `lib/actions/stock-requests.ts`

## D-007: Stock is held at locations (warehouses and branches), not branches directly
Date: 2026-08-24 (Phase 8)
Decision: Introduce `StockLocation` (WAREHOUSE or BRANCH) and `LocationStock`. Migrate old
`BranchStock` data with a hand-written, row-count-guarded migration.
Reason: Support a central warehouse, warehouse-to-branch transfers and internal stock requests.
Alternatives considered: the auto-generated migration, rejected because it would have dropped
`BranchStock` and `StockMovement.branchId` data (migration header comment).
Affected files/modules: `prisma/migrations/20260824140000_stock_locations_and_requests`, stock module

## D-008: Branch-location purchases auto-post a SUPPLIES expense; warehouse purchases do not
Date: 2026-08-22 / 2026-08-24
Decision: A PURCHASE with cost at a BRANCH location creates a linked ILS expense. At a warehouse
it does not.
Reason: Code comment: warehouse purchases "have no single branch to attribute the cost to".
Alternatives considered: not recorded.
Affected files/modules: `lib/actions/stock.ts`

## D-009: Cookie-based locale, no URL prefix; Western digits in Arabic
Date: 2026-08-23 (Phase 5)
Decision: next-intl with the `NEXT_LOCALE` cookie, `<html dir>` switched at the root layout,
logical CSS utilities, `numberingSystem: "latn"`, charts stay LTR.
Reason: README: standard for RTL dashboards, and it keeps numbers consistent.
Alternatives considered: not recorded.
Affected files/modules: `src/i18n/**`, `messages/**`, `src/app/layout.tsx`, `lib/format.ts`

## D-010: Users are deactivated, never deleted; session re-checked every request
Date: 2026-08-25
Decision: `User.isActive`. The `jwt` callback in `src/auth.ts` re-reads the user on every session
read and fails closed (signs out) on a missing or inactive user or a DB error.
Reason: Users are referenced by sales, expenses and stock history. Deactivation must take effect
immediately. The 2026-08-25 production incident showed a throwing callback takes down every page.
Alternatives considered: not recorded.
Affected files/modules: `src/auth.ts`, `lib/actions/users.ts`

## D-011: Uploads in a private Vercel Blob store, served through an authorizing proxy
Date: 2026-08-25
Decision: Files are stored privately. The DB stores `/api/files/<path>`. The route authorizes
against the owning record (expense or document), else only the uploader (id in the path).
Reason: Vercel's filesystem is ephemeral, and a private store keeps receipts from being readable
by URL alone.
Alternatives considered: public Blob store (rejected: anyone with the URL could read).
Affected files/modules: `lib/actions/upload.ts`, `src/app/api/files/[...path]/route.ts`

## D-012: Separate dev and production databases and Blob stores; manual migrations
Date: 2026-08-25
Decision: Local and production use different Neon branches and different Blob stores. `prisma
migrate deploy` is run by hand against production after pushing. The seed is never run against
production.
Reason: Production login outage (migration applied to the wrong Neon branch) and a near-miss
blob deletion. See DEPLOYMENT.md incident log.
Alternatives considered: not recorded.
Affected files/modules: `DEPLOYMENT.md`, `package.json` build script

## D-013: Live exchange rates from open.er-api.com with manual override
Date: 2026-08-24 (Phase 9)
Decision: Keyless provider, daily Vercel Cron + owner "refresh now", per-currency
`isAutoUpdated` flag, failed fetch writes nothing, 7-day staleness warning.
Reason: Code comment: exchangerate.host now requires an API key. open.er-api.com is keyless and
returns an update timestamp.
Alternatives considered: exchangerate.host (rejected, see reason).
Affected files/modules: `lib/exchange-rates.ts`, `app/api/cron/rates`, `vercel.json`, `lib/actions/currencies.ts`

## D-014: Shared multi-agent documentation in `docs/`
Date: 2026-09-24
Decision: `docs/AI_CONTEXT.md`, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md` and
`docs/AI_WORKLOG.md` are the shared source of truth for all agents (Codex/Astra and
Claude/Opus). `AGENTS.md` and `CLAUDE.md` point to them instead of each describing the project.
Reason: Two AI agents work in the same repository and need one consistent understanding and a
handoff channel.
Alternatives considered: separate per-agent notes (rejected: they drift and contradict each other).
Affected files/modules: `docs/**`, `AGENTS.md`, `CLAUDE.md`


## D-015: First-session scope and qualifications to reconstructed decisions
Date: 2026-09-24
Decision: Keep the initial review documentation-only, preserve D-001 through D-014, and distinguish existing implementation observations from newly approved policy. No feature, schema, data or authorization change is approved by this entry.
Reason: Explicit project-owner instructions; independent review found broad descriptions that need qualification without rewriting history.
Alternatives considered: Fixing issues during review or rewriting reconstructed entries; excluded to preserve task scope and shared history.
Affected files/modules: Shared docs only. Evidence comes from actions/sales.ts, actions/finance.ts, actions/stock-requests.ts, actions/locale.ts, exchange-rates.ts and chart/layout code.

Clarifications: D-001 describes the general result-object pattern, but actions can still throw database errors. D-005's frozen conversions apply to a rate refresh, while editing an existing sale/expense recomputes its ILS amount. D-006 transactions do not establish concurrency safety or request idempotency. D-009's LTR chart behavior is documented intent without explicit direction enforcement found in chart components; visual acceptance remains untested. D-013's no-write guarantee applies to provider-fetch failure; sequential currency writes could partially succeed before a later database error. These clarify observed limits, not new business requirements. Original adoption reasons/dates beyond the existing reconstructed history were not independently re-established by Codex.

## D-016: Owner permission and business rules (2026-09-24)
Date: 2026-09-24
Decision: The project owner set these rules. They supersede any conflicting behaviour described
in D-003 or in the README:
1. **STAFF** are view-only, except that they may create and edit the daily sales entry for their
   own assigned branch.
2. STAFF may not create or edit expenses.
3. STAFF may not create or edit stock movements.
4. **MANAGERs** may not view or edit individual employee salaries anywhere. This must be enforced
   on the server (queries, actions, props sent to the client) as well as in the UI.
5. **Stock items and suppliers**: only the OWNER may create, edit, deactivate or delete them.
   Managers may read them and use them operationally (movements, requests).
6. **Business timezone** is `Asia/Hebron` for every branch.
7. **Warehouse purchases** should eventually post to Finance as expenses. This reverses the
   intent of D-008. How they are attributed is not yet decided.
8. **No partial fulfilment** of stock requests for now. This matches the current all-or-nothing
   code.
9. (Implementation rule, from the same instruction.) A MANAGER or STAFF user without an assigned
   branch must **fail closed**: they get no branch-scoped data and cannot perform branch-scoped
   writes.
Reason: Owner instruction. Branch permissions must be strict, salary data is confidential, and
the app should stay simple for non-technical staff.
Alternatives considered: none recorded. These are owner business decisions.
Affected files/modules: auth/permission checks in `src/lib/actions/*`, page loaders in
`src/app/(app)/**`, `src/lib/queries/*`, the employees UI, stock items/suppliers, date handling
(future), and the stock purchase → finance flow (future).
Implementation status: to be delivered in scoped tasks. See `docs/AI_WORKLOG.md`.
