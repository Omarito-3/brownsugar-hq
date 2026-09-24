# AI Worklog

Handoff log between agents working on this repository (Codex/Astra and Claude/Opus) and any
human engineers.

Rules:

- **Append only.** Add new entries at the bottom. Never edit or delete another agent's entry.
  If an entry turns out to be wrong, add a new one that corrects it.
- Read the latest entries before starting significant work.
- Add an entry after meaningful work (code, schema, config or doc changes).

Template:

```
## YYYY-MM-DD HH:MM (TZ): <Agent>
Task:
Files changed:
What changed:
Tests/checks performed:
Remaining issues:
Recommended next action:
```

---

## 2026-09-24: Claude Code (Opus 5.5)
Task: Initial full-repository review and creation of the shared AI context. No feature work and
no refactoring.
Files changed:
- `docs/AI_CONTEXT.md` (new)
- `docs/CURRENT_STATE.md` (new)
- `docs/DECISIONS.md` (new; D-001…D-013 reconstructed from code/history, D-014 new)
- `docs/AI_WORKLOG.md` (new)
- `AGENTS.md`: added a "Shared project documentation" section **below** the Next.js-managed
  block (the block itself is untouched, because `next dev` re-writes it)
- `CLAUDE.md`: kept `@AGENTS.md`, added a short pointer to the same docs
What changed: Documentation only. No application code, schema, config or data was modified.
Tests/checks performed: `npx tsc --noEmit` (pass), `npm run lint` (pass), en/ar translation key
parity (855/855). No database was accessed. There are no automated tests in the repo.
Remaining issues: See `docs/CURRENT_STATE.md` → Known risks. The most important are the manager
salary visibility leak, fail-open branch scoping for branchless non-owners, non-atomic stock
quantity updates, UTC-based "today", and missing branch stock locations on a fresh database.
Recommended next action: The owner should confirm the intended STAFF and MANAGER permissions
(salary visibility and staff write access). After that, fix the salary leak and make branch
scoping fail closed as one small, reviewable task.


## 2026-09-24 11:30 UTC: OpenAI Codex
Task: Independent repository assessment and shared-context reconciliation; documentation only.
Files changed: Appended supplemental verification to docs/AI_CONTEXT.md, docs/CURRENT_STATE.md and docs/DECISIONS.md; appended this entry to docs/AI_WORKLOG.md. AGENTS.md/CLAUDE.md already satisfied the shared-reading requirement after concurrent Claude edits, so they were preserved without further changes.
What changed: Started with clean master at 9c953cb. While preparing documents, discovered Claude's concurrent creation of the same files and instruction updates. Read all of those before writing; discarded the replacement approach and appended complementary findings/qualifications. No previous worklog/decision entry or application code was altered. Added request/campaign visibility, request idempotency, historical FX edits, upload-limit and reseeding discrepancies, plus verification limits. All shared docs remain the same source of truth.
Tests/checks performed: npm run lint (exit 0); TypeScript no-emit/non-incremental check (exit 0); English/Arabic parity (855/855). Repository inventory, nine migrations, actions, queries, validation, routes and feature/config review. Environment variable names only. Pre-write file hashes checked to avoid overwriting concurrent changes. Final diff/append preservation checks recorded below after writing.
Remaining issues: All reported application risks remain unfixed. No database, Blob or production operations were run. Build, concurrency/integration, fresh-install and browser/mobile/RTL behavior remain unverified. Findings describe code or explicitly labeled inference, not confirmed live incidents.
Recommended next action: Confirm STAFF/MANAGER permission rules, then a scoped server-side authorization pass with regression tests covering salary confidentiality, null branches, stock-request/shared-campaign scope and attachment ownership. Preserve the earlier agent's findings; use later entries to qualify them when necessary.

## 2026-09-24 11:34 UTC: OpenAI Codex — verification completion
Task: Final documentation verification.
Files changed: docs/AI_WORKLOG.md (this appended completion entry).
What changed: Recorded successful verification of the shared-context reconciliation.
Tests/checks performed: git diff --check passed; inspected AGENTS.md/CLAUDE.md diffs and final status. SHA-256 checks confirmed the entire pre-existing content of all four shared docs was preserved byte-for-byte, and each supplement matched its reviewed draft exactly. Both instruction entry points point to the shared docs. Final status showed only AGENTS.md, CLAUDE.md and docs/ changes; no application/schema/config changes. TypeScript, lint and catalog checks are recorded above.
Remaining issues: Application findings remain open; runtime/build/production checks remain unperformed. Changes are uncommitted. Git reported global-ignore access and LF/CRLF notices, with no diff-check errors.
Recommended next action: Use the shared context and agree the permission acceptance matrix before a scoped authorization remediation task.

## 2026-09-24: Claude Code (Opus 5.5): owner decisions recorded
Task: Record the owner's permission and business decisions. Documentation only.
Files changed: `docs/DECISIONS.md` (appended D-016), `docs/CURRENT_STATE.md` (added an "Owner
decisions" table, marked risks 5 and 12 as decided, set the timezone priority to `Asia/Hebron`),
`docs/AI_WORKLOG.md` (this entry).
What changed: No code. Codex's concurrent supplemental sections in all four docs were preserved
unchanged.
Tests/checks performed: `git status` / staged diff reviewed so the commit contains only
`docs/`, `AGENTS.md` and `CLAUDE.md`.
Remaining issues: None of D-016 is implemented yet.
Recommended next action: Implement D-016 items 4 and 9 (manager salary confidentiality and
fail-closed branch scoping) with regression tests. Claude is starting this now.

## 2026-09-24: Claude Code (Opus 5.5): salary confidentiality + fail-closed branch scoping
Task: D-016 items 4 and 9. Managers must never see or edit salaries (enforced on the server),
MANAGER/STAFF without a branch must get no branch-scoped data, and both need regression tests.
Files changed:
- New: `src/lib/permissions.ts`, `src/components/layout/no-branch-assigned.tsx`,
  `vitest.config.mts`, `tests/` (3 test files + helpers + `server-only` stub)
- Pages (fail-closed guard): dashboard, sales, sales/new, sales/[id]/edit, finance, finance/new,
  finance/[id]/edit, employees, employees/schedule, management, marketing, stock,
  stock/movement, stock/requests, tools/calculator
- `src/app/api/files/[...path]/route.ts` (branchless MANAGER can't read org-wide docs)
- Salary: `src/lib/queries/employees.ts`, `src/lib/actions/employees.ts`,
  `src/lib/validations/employees.ts`, `src/components/employees/employees-table.tsx`,
  `src/components/employees/employee-form-dialog.tsx`
- `messages/en.json` / `messages/ar.json` (new `noBranch` namespace; still 1:1)
- `package.json` / `package-lock.json` (vitest 4.1.11, `test` script)
- Docs: AI_CONTEXT (scoping pattern, tests), CURRENT_STATE, DECISIONS (D-017, D-018), this entry
What changed: See CURRENT_STATE "Update 2026-09-24". Server actions were audited for null-branch
behaviour and already failed closed, so they were not changed.
Tests/checks performed: `npm test` 56/56 pass. Mutation check: reverting the finance page guard,
the `omit` in `getEmployeesTable` and the manager salary write made 5 tests fail, and restoring
them brought all 56 back. `npx tsc --noEmit` pass. `npm run lint` pass (0 warnings). Full diff
reviewed. Not verified in a browser (needs login credentials).
Remaining issues: branch-level SALARY expenses are still visible to managers in Finance and
break-even (an aggregate; owner decision needed). Manager-created employees have salary 0 until
the owner sets it. Critical `npm audit` advisory on `next@16.3.2` (pre-existing). The rest of
D-016 (staff write restrictions, OWNER-only stock catalog, Asia/Hebron timezone, warehouse
purchase expenses) is not started.
Recommended next action: Owner reviews the Finance SALARY-aggregate question. Next scoped task:
STAFF write restrictions + OWNER-only stock items/suppliers (D-016 items 1–3 and 5), with tests.
Separately, upgrade Next.js to fix the critical advisory.
