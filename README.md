# Brown Sugar HQ

Internal operations hub for the Brown Sugar branches — sales, finance, stock, employees,
management, and marketing, in English and Arabic (with full RTL support).

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

`npm run db:seed` creates three accounts, one per role, so role scoping can be checked by
logging in as each. All three share the same password:

| Role | Email | Password | Branch |
| --- | --- | --- | --- |
| Owner | `owner@brownsugar.hq` | `BrownSugar123!` | All branches |
| Manager | `manager@brownsugar.hq` | `BrownSugar123!` | Batn al-Hawa |
| Staff | `staff@brownsugar.hq` | `BrownSugar123!` | Batn al-Hawa |

> These are development seed credentials only — never deploy them to a live environment.

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

## Notes

- File uploads (expense receipts, management documents) are written to `public/uploads` for
  local development. This does not survive redeploys on most hosts — swap it for object
  storage (S3/R2) before deploying.
