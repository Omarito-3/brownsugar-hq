<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Brown Sugar HQ: instructions for all agents

This repository is worked on by more than one AI agent (OpenAI Codex/Astra and Claude
Code/Opus) as well as humans. Everyone shares one source of truth in `docs/`:

| File | Purpose |
| --- | --- |
| `docs/AI_CONTEXT.md` | What the project is: stack, architecture, data model, auth, roles, business rules |
| `docs/CURRENT_STATE.md` | What works, what is partial or broken, known risks, priorities |
| `docs/DECISIONS.md` | Architectural and business decision log (append-only) |
| `docs/AI_WORKLOG.md` | Handoff log between agents (append-only) |
| `DEPLOYMENT.md` | Production DB/Blob, migrations, incident history. Read before any deploy or schema change |

**Before significant work:** read all four `docs/` files, check `git status` and
`git log --oneline -15`, and read the latest worklog entries.

## Working rules

1. Keep changes scoped to the assigned task. Do not refactor unrelated code.
2. Prefer small, reviewable changes.
3. Do not undo another agent's work without a concrete reason. If a change looks wrong,
   **report it** (in your response and the worklog) instead of silently reverting it.
4. Do not silently change an architectural decision. Record new or changed decisions in
   `docs/DECISIONS.md`.
5. Enforce permissions on the server (in `src/lib/actions/*` and page loaders), never only in
   the UI. Non-owners must be scoped to their own branch.
6. Money: convert to ILS on the server at write time and round with `roundCurrency`. Never
   trust client-computed ILS amounts.
7. Stock quantities change only through `applyMovementTx` (`src/lib/stock-movements.ts`).
8. Every UI string goes in **both** `messages/en.json` and `messages/ar.json`. Use logical
   Tailwind utilities (`ms-`/`me-`/`ps-`/`pe-`/`text-start`) so RTL keeps working.
9. After changes, run `npx tsc --noEmit` and `npm run lint`, and inspect your diff.
10. Update `docs/CURRENT_STATE.md` when project state materially changes, and append to
    `docs/AI_WORKLOG.md` after meaningful work. Never delete other entries.

## Safety

- Never force-push, `git reset --hard`, or rewrite history without explicit permission.
  The branch is `master`.
- Never run `prisma migrate dev`, `db:push`, or `db:seed` against production. Never modify
  production data.
- Never print, copy or commit secret values from `.env*`. Refer to variables by name only.
