# PG Management SaaS — Claude Code Context

> This file is read automatically by Claude Code on startup.
> It contains the full current project status and next steps.
> Always read this file AND the spec docs (PRD.md, design_doc.md, tech_stack.md) before doing any work.

---

## What This Project Is

A multi-tenant **PG (Paying Guest) Management SaaS** platform. Landlords/PG owners sign up, create their organization, add PG properties, manage rooms/beds/tenants, track finances, handle complaints, and more. Tenants get a self-service portal.

Full spec in: `PRD.md` (product requirements), `design_doc.md` (UI/UX), `tech_stack.md` (architecture decisions + 10 MVP rules).

---

## Stack

- **Next.js 16** — App Router, JavaScript only (no TypeScript), `src/` directory
- **React 19** + **Tailwind CSS 4** + **shadcn/ui** (base-nova style, CSS variables)
- **Supabase** — Auth (email+password for staff, magic link OTP for tenants), PostgreSQL, Storage, Edge Functions, Realtime
- **GitHub** — repo: `codvikrr-wq/pg-management` (private)
- **GitHub Actions** — CI on push/PR to main (pnpm install, lint, build)

---

## Environment (.env.local — already configured)

```
NEXT_PUBLIC_SUPABASE_URL=https://nkjtskiocmgbefxsbijh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  (set)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  (set)
DATABASE_URL=postgresql://postgres:NI521g4ADJnyESIh@db.nkjtskiocmgbefxsbijh.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Current Status (as of 2026-03-19)

### ✅ COMPLETE — All 44 routes build with zero errors

**Commit history (all pushed to origin/main):**
1. `bf52ab6` — Foundation: Next.js scaffold, Supabase clients, middleware, context providers, layout components, shared components, auth pages, CI
2. `a58eb7a` — Database: 4 migration SQL files (schema, functions/triggers, RLS, storage/realtime)
3. `c39c413` — All feature pages: 35 files, 12,707 lines

### What's been built

**Foundation:**
- `src/lib/supabase/` — browser + server clients, service client
- `src/lib/constants.js` — all enums, nav items, role/permission maps
- `src/lib/validations/auth.js` — Zod schemas
- `src/context/` — ThemeProvider, UserProvider (auth + profile + roles), OrgProvider (org + PGs + permissions)
- `src/middleware.js` — session refresh, auth redirects
- `src/components/layout/` — AppSidebar, TopBar, PgSwitcher, NotificationBell, ColorPicker (12 presets + hex → HSL), TenantNav
- `src/components/shared/` — PageHeader, EmptyState, ConfirmDialog, LoadingSpinner, PermissionGuard
- `src/hooks/use-permission.js`

**Auth pages** (`src/app/(auth)/`):
- `/signup` — creates auth user + org + user record + assigns Org Admin role → redirects to /onboarding
- `/login` — email+password
- `/forgot-password`, `/reset-password`
- `/tenant-login` — magic link OTP (shouldCreateUser: false)
- `src/app/auth/callback/route.js` — code exchange

**Onboarding:** `/onboarding` — 4-step wizard (org details → first PG → invite team → done)

**Admin Dashboard** (`src/app/(dashboard)/`):
- `/dashboard` — stats cards, quick actions, recent activity
- `/pgs` + `/pgs/[id]` — PG list + detail with edit/delete
- `/rooms` — rooms + beds, create/edit/add-bed dialogs
- `/tenants` + `/tenants/[id]` — tenant list + detail (tabs: overview, documents, lease, invoices, complaints, absences)
- `/payments/invoices` — create invoices with line items + tax
- `/payments/records` — record payments, auto-updates invoice status
- `/payments/expenses` — expense CRUD with categories
- `/payments/reports` — finance reports with recharts (AR aging, revenue vs expenses pie)
- `/complaints` — status workflow, comments sheet
- `/absences` — approve/reject workflow
- `/notices` — pinned notices, org/PG scope
- `/events` — RSVP tracking
- `/food/plans` — meal plan CRUD
- `/food/menus` — daily menus with dish tag input, copy previous day
- `/food/kitchen` — orders dashboard, bulk mark delivered
- `/housekeeping/schedules` — cleaning schedules
- `/housekeeping/maintenance` — maintenance tickets
- `/housekeeping/inventory` — inventory management
- `/settings/organization` — org profile edit
- `/settings/users` — user management + invite with role assignment + pending invitations
- `/settings/roles` — permission matrix (modules × actions checkboxes), create/edit/delete roles
- `/analytics/occupancy` — occupancy trends
- `/analytics/revenue` — revenue charts
- `/analytics/tenants` — tenant insights
- `/analytics/audit` — audit log viewer

**Tenant Portal** (`src/app/(tenant-portal)/`):
- `/tenant/dashboard`, `/tenant/invoices`, `/tenant/complaints`, `/tenant/absences`
- `/tenant/notices`, `/tenant/events`, `/tenant/food`, `/tenant/profile`

---

## ⚠️ BLOCKING — Must Do Before Testing

**Run DB migrations on Supabase (user must do this manually):**
1. Go to https://supabase.com/dashboard → project `nkjtskiocmgbefxsbijh` → SQL Editor
2. Run these 4 files IN ORDER (copy-paste each, click Run):
   - `supabase/migrations/001_schema.sql` — 28 tables with indexes
   - `supabase/migrations/002_functions_triggers.sql` — functions, triggers, handle_new_user
   - `supabase/migrations/003_rls_policies.sql` — RLS on all 28 tables
   - `supabase/migrations/004_storage_realtime.sql` — 6 storage buckets + realtime

---

## What To Do Next (in order)

### Phase A — Testing & Bug Fixes (do this after migrations are run)
1. Run `pnpm dev` locally, sign up at `http://localhost:3000/signup`
2. Go through onboarding wizard, create a PG, add rooms/beds
3. Test tenant check-in flow, invoice creation, payment recording
4. Fix any runtime errors found during manual testing
5. Add loading/error states anywhere they're missing

### Phase B — Invitation Flow (acceptance side)
- `/invite/[token]` — page where invited staff member accepts invite, sets password, gets redirected to dashboard
- Currently invitations are created in `/settings/users` but there's no acceptance page yet

### Phase C — Polish
- Add `<head>` metadata (title, description) to all pages
- Add 404 page (`src/app/not-found.js`)
- Add error boundary (`src/app/error.js`, `src/app/global-error.js`)
- Ensure all forms have proper validation feedback
- Ensure mobile responsiveness on all admin pages
- Add skeleton loading states to any pages missing them

### Phase D — Stripe Integration (when ready)
- Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` to `.env.local`
- Payment links for invoices
- Webhook handler for payment confirmations

### Phase E — Vercel Deployment (when ready)
- Add Vercel project, connect GitHub repo
- Set all env vars in Vercel dashboard
- Configure Supabase auth redirect URLs for production domain

---

## Key Patterns (follow these exactly)

### Supabase client usage
- Client components: `import { createClient } from "@/lib/supabase/client"`
- Server components/actions: `import { createClient } from "@/lib/supabase/server"`
- Admin operations: `import { createServiceClient } from "@/lib/supabase/server"`

### Data fetching pattern (client components)
```js
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const { organization, currentPg } = useOrg();

useEffect(() => {
  if (!organization) return;
  fetchData();
}, [organization, currentPg]);

async function fetchData() {
  setLoading(true);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  if (error) toast.error("Failed to load data");
  else setData(data || []);
  setLoading(false);
}
```

### Multi-tenancy
- EVERY query MUST include `.eq("organization_id", organization.id)` (RLS is backup, not primary)
- PG-scoped queries also include `.eq("pg_id", currentPg.id)` where appropriate

### Toast notifications
- `import { toast } from "sonner"` — `toast.success("...")` / `toast.error("...")`

### Date formatting
- `import { format } from "date-fns"` — `format(new Date(date), "MMM d, yyyy")`

### Icons
- `import { IconName } from "lucide-react"`

### Zod validation
- Use `zod/v4` import: `import { z } from "zod/v4"`

---

## File Structure

```
src/
  app/
    (auth)/           — login, signup, forgot/reset password, tenant-login
    (dashboard)/      — all admin/staff pages
    (tenant-portal)/  — tenant self-service pages
    auth/callback/    — Supabase auth code exchange
    onboarding/       — post-signup setup wizard
    layout.js         — root layout (ThemeProvider, TooltipProvider, Toaster)
  components/
    layout/           — AppSidebar, TopBar, PgSwitcher, NotificationBell, ColorPicker, TenantNav
    shared/           — PageHeader, EmptyState, ConfirmDialog, LoadingSpinner, PermissionGuard
  context/            — theme-provider, user-context, org-context
  hooks/              — use-permission
  lib/
    supabase/         — client.js, server.js
    constants.js      — all enums and nav config
    utils.js          — cn() helper
    validations/      — auth.js (Zod schemas)
  middleware.js
supabase/
  migrations/         — 001_schema.sql, 002_functions_triggers.sql, 003_rls_policies.sql, 004_storage_realtime.sql
```
