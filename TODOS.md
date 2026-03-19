# PG Management SaaS — Master Build To-Do List

> **Stack:** Next.js (JS) · React · Tailwind CSS · shadcn/ui · Supabase (Auth, PostgreSQL, Storage, Edge Functions) · GitHub · GitHub Actions
> **Status key:** `[ ]` = pending · `[x]` = done · `[~]` = in progress
> Complete phases in order. Do not skip ahead.
>
> **⚡ LAST UPDATED: 2026-03-19**
> **Current commit:** `4b702ca` on `main` — All feature pages built, 44 routes, zero build errors.
> **Next task:** See PHASE 17 (Polish) → then PHASE 18 (Testing) → then PHASE 19 (Deployment)

---

## PHASE 0 — Prerequisites & Credential Collection ✅

### 0.1 — Tools & Accounts
- [x] Node.js ≥ 20 installed locally
- [x] pnpm installed globally
- [x] Git installed locally
- [x] GitHub account exists (`codvikrr-wq`)
- [x] Supabase account exists — project: `nkjtskiocmgbefxsbijh`
- [ ] Vercel account exists — **deferred to Phase 19**
- [ ] Stripe account exists — **deferred to Phase 9.3**

### 0.2 — GitHub Repository Setup
- [x] GitHub repo created: `codvikrr-wq/pg-management` (private)
- [x] `.gitignore` created (Next.js + env files)
- [x] Initial commit pushed to `main`

### 0.3 — Supabase Project Setup
- [x] Supabase project created
- [x] `.env.local` configured with URL, anon key, service role key, DB URL
- [x] `.env.example` created

### 0.4 — Supabase Auth Configuration
- [x] Email provider (email + password) enabled
- [x] Magic link / OTP for tenant login (shouldCreateUser: false)
- [x] Site URL: `http://localhost:3000`
- [x] Redirect URL: `http://localhost:3000/auth/callback`
- [ ] Email templates customized — can do later

### 0.5 — Stripe Setup
- [ ] **DEFERRED** — will add in Phase 9.3

### 0.6 — Vercel Project Setup
- [ ] **DEFERRED** — will add in Phase 19

### 0.7 — Final Credential Checklist
- [x] All `.env.local` keys populated (URL, anon, service role, DB URL, app URL)
- [x] GitHub repo accessible + 4 commits pushed
- [x] Supabase reachable

---

## PHASE 1 — Next.js Project Initialization ✅

### 1.1 — Scaffold the App
- [x] Next.js 16 app scaffolded (`--js --tailwind --eslint --app --src-dir`)
- [x] App runs at `localhost:3000` with `pnpm dev`
- [x] Boilerplate removed

### 1.2 — Install Core Dependencies
- [x] `@supabase/supabase-js` + `@supabase/ssr`
- [x] shadcn/ui initialized (base-nova style, CSS variables ON)
- [x] All shadcn components: button, card, input, label, select, textarea, checkbox, switch, dialog, dropdown-menu, popover, sheet, tabs, badge, avatar, table, form, skeleton, separator, tooltip, calendar, command, sidebar
- [x] `react-hook-form` + `zod` + `@hookform/resolvers`
- [x] `date-fns`, `recharts`, `sonner`, `lucide-react`, `next-themes`, `clsx`, `tailwind-merge`
- [ ] `@stripe/stripe-js` + `stripe` — **deferred to Phase 9.3**
- [ ] `react-pdf` / `@react-pdf/renderer` — **deferred to Phase 8.6**

### 1.3 — Folder Structure
- [x] All directories created under `src/`
- [x] Route groups: `(auth)/`, `(dashboard)/`, `(tenant-portal)/`
- [x] All subdirectories: pgs, rooms, tenants, payments, complaints, absences, notices, events, food, housekeeping, analytics, settings

### 1.4 — ESLint, Prettier & Git Hooks
- [x] `.eslintrc` configured
- [x] `.prettierrc` configured (`semi: true, singleQuote: false, tabWidth: 2`)
- [ ] Husky + lint-staged — not set up yet (optional, low priority)

### 1.5 — GitHub Actions CI Pipeline
- [x] `.github/workflows/ci.yml` — lint + build on push/PR to main
- [x] CI passes

---

## PHASE 2 — Database Schema & Supabase Configuration ✅

### 2.1 — Core Tables (SQL Migrations)
- [x] All 28 tables created in `supabase/migrations/001_schema.sql`:
  organizations, pgs, users, roles, user_roles, invitations, rooms, beds,
  tenants, leases, invoices, payments, expenses, complaints, complaint_comments,
  absence_reports, notices, events, event_rsvps, meal_plans, tenant_meal_plans,
  menus, meal_orders, housekeeping_schedules, maintenance_tickets, inventory_items,
  audit_logs, notifications

### 2.2 — Default Seed Data
- [x] `create_org_default_roles()` trigger — inserts 7 roles on org creation
- [x] Role permissions defined in `src/lib/constants.js` (`DEFAULT_ROLE_PERMISSIONS`)

### 2.3 — Database Functions & Triggers
- [x] `update_updated_at()` trigger function
- [x] `handle_new_user()` — creates `public.users` on auth signup
- [x] `create_org_default_roles()` — 7 roles on org insert
- [x] `generate_invoice_number()` — sequential INV-000001 per org
- [x] `get_user_org_id()` helper used in RLS
- [x] `is_tenant_user()`, `get_tenant_id()` helpers
- [x] All in `supabase/migrations/002_functions_triggers.sql`

### 2.4 — Row Level Security (RLS) Policies
- [x] RLS enabled on all 28 tables
- [x] Org-scoped policies on all tables
- [x] Tenant-specific policies (see own invoices, complaints, etc.)
- [x] All in `supabase/migrations/003_rls_policies.sql`

### 2.5 — Supabase Storage Buckets
- [x] 6 buckets created: avatars (public), id-documents, receipts, complaint-attachments, lease-documents, expense-receipts
- [x] Storage RLS by org_id folder path
- [x] In `supabase/migrations/004_storage_realtime.sql`

### 2.6 — Supabase Realtime
- [x] Realtime on: `notifications`, `complaints`, `maintenance_tickets`

> ⚠️ **Action required**: Run the 4 migration SQL files in Supabase SQL Editor if not done yet.
> Files are in `supabase/migrations/` — run in order: 001, 002, 003, 004.

---

## PHASE 3 — Global Layout, Theme System & Navigation ✅

### 3.1 — CSS Variables & Theme Setup
- [x] CSS custom properties defined in `globals.css`
- [x] Light + dark mode variables
- [x] `next-themes` ThemeProvider with `defaultTheme="system"`

### 3.2 — Primary Color Picker (Dynamic Theming)
- [x] `ColorPicker` component — 12 preset colors + hex input
- [x] Hex → HSL conversion, applied to `--primary` CSS variable
- [x] Persists to `localStorage`
- [x] `applyPrimaryColor()` exported utility

### 3.3 — Sidebar Navigation Component
- [x] `AppSidebar` — full sidebar with icon mapping
- [x] Collapsible sub-menus (Payments, Food, Housekeeping, Analytics, Settings)
- [x] Role-based nav item visibility
- [x] Mobile: off-canvas via shadcn SidebarProvider

### 3.4 — Top App Bar Component
- [x] `TopBar` — SidebarTrigger, org name, PgSwitcher, NotificationBell, ColorPicker, theme toggle, user dropdown + logout
- [x] `PgSwitcher` — command-based searchable, persists to localStorage
- [x] `NotificationBell` — realtime subscription, unread count badge, mark-all-read

### 3.5 — Dashboard Shell Layout
- [x] `(dashboard)/layout.js` — UserProvider → OrgProvider → SidebarProvider → AppSidebar + TopBar
- [x] `PageHeader`, `EmptyState`, `LoadingSpinner`, `ConfirmDialog`, `PermissionGuard` shared components

### 3.6 — Calculator Overlay
- [ ] `CalculatorSheet` component — **not built yet** (low priority)

---

## PHASE 4 — Authentication Flows ✅

### 4.1 — Supabase Client Setup
- [x] `src/lib/supabase/client.js` — browser client singleton
- [x] `src/lib/supabase/server.js` — server client + `createServiceClient()`
- [x] `src/middleware.js` — session refresh, redirects unauthenticated → `/login`, authenticated away from auth pages → `/dashboard`

### 4.2 — Auth Route Group `(auth)/`
- [x] `/signup` — creates auth user + org + user record + Org Admin role → `/onboarding`
- [x] `/login` — email + password → `/dashboard`
- [x] `/forgot-password` — sends reset email
- [x] `/reset-password` — updates password via session from email link
- [x] `/tenant-login` — magic link OTP (shouldCreateUser: false)
- [x] `/auth/callback/route.js` — exchanges code for session

### 4.3 — Session & Context
- [x] `UserContext` + `useUser` — auth user + profile + roles
- [x] `OrgContext` + `useOrg` — org, PGs, permissions, `switchPg()`, `hasPermission()`
- [x] `usePermission(module, action)` hook
- [x] `PermissionGuard` component

---

## PHASE 5 — Onboarding Wizard ✅

- [x] `/onboarding` 4-step wizard: org details → first PG → invite team (optional) → done
- [x] Progress stepper component
- [x] Skips onboarding if already completed

---

## PHASE 6 — Organization & PG Settings ✅

### 6.1 — Organization Settings (`/settings/organization`)
- [x] Edit: name, timezone, currency, address, phone, email, billing_email
- [ ] Logo upload (Supabase Storage) — not yet
- [ ] Tax settings — not yet
- [ ] Danger zone (delete org) — not yet

### 6.2 — PG Management (`/pgs`, `/pgs/[id]`)
- [x] PG list with occupancy cards
- [x] Create PG dialog
- [x] PG detail: stats, edit form, delete with confirmation

### 6.3 — User Management (`/settings/users`)
- [x] User list with role badges, status, joined date
- [x] Invite team member: email + role + PG select → creates `invitations` record
- [x] Role change inline
- [x] Remove user
- [x] Pending invitations list with revoke
- [ ] **Invitation acceptance page `/invite/[token]`** — **NOT BUILT YET** ⚠️

### 6.4 — Role Management (`/settings/roles`)
- [x] Roles grid with permission matrix sheet
- [x] Permission matrix: modules × actions checkboxes with bulk toggle
- [x] Create/edit/delete custom roles
- [x] System role protection (lock icon, no delete)

---

## PHASE 7 — Rooms & Beds Management ✅

- [x] Room list with inline bed display (color-coded status badges)
- [x] Create room dialog (auto-creates beds)
- [x] Edit room dialog
- [x] Add bed dialog
- [x] Delete room (with confirmation)
- [ ] CSV import for rooms — not built yet (low priority)

---

## PHASE 8 — Tenant Management ✅

### 8.1-8.4 — Tenant List + Detail
- [x] `/tenants` — list with filters (PG, status, search), pagination
- [x] `/tenants/[id]` — detail with tabs: Overview, Documents, Lease, Invoices, Complaints, Absences
- [x] Edit personal info
- [x] Room/bed assignment display

### 8.5 — Tenant Status Workflows
- [x] Check-in workflow (on tenant detail)
- [x] Check-out workflow
- [x] Mark on leave
- [ ] Blacklist tenant — not yet

### 8.6 — Digital Contract PDF Generation
- [ ] **NOT BUILT** — `@react-pdf/renderer` not installed yet
  - Needs: install `@react-pdf/renderer`, create lease PDF template, download button on lease tab

### 8.7 — CSV Import for Tenants
- [ ] Not built yet (low priority)

---

## PHASE 9 — Finance Module ✅ (except Stripe)

### 9.1 — Invoices (`/payments/invoices`)
- [x] Invoice list with filters and status badges
- [x] Create invoice with line items + tax calculation
- [ ] Recurring invoice with Edge Function cron — not yet
- [ ] Invoice PDF generation — deferred (needs react-pdf)
- [ ] Send via email — deferred

### 9.2 — Payments (`/payments/records`)
- [x] Payment list
- [x] Record manual payment (cash/bank/UPI/cheque), auto-updates invoice status

### 9.3 — Stripe Online Payment
- [ ] **NOT BUILT** — Stripe deferred
  - `POST /api/stripe/create-payment-intent`
  - `POST /api/webhooks/stripe`
  - Stripe Elements "Pay Now" button in tenant portal

### 9.4 — Expenses (`/payments/expenses`)
- [x] Expense CRUD with categories, vendor, PG filtering

### 9.5 — Security Deposits
- [ ] Refund workflow — not fully built (lease has deposit fields but no refund workflow UI)

### 9.6 — Finance Reports (`/payments/reports`)
- [x] Summary cards (revenue, expenses, net, collection rate)
- [x] AR aging bar chart (Recharts)
- [x] Revenue vs expenses pie chart
- [x] Top 5 overdue tenants
- [x] CSV export

---

## PHASE 10 — Tenant Self-Service Portal ✅

- [x] `(tenant-portal)/layout.js` — mobile-first, TenantNav, max-w-3xl
- [x] `TenantNav` — desktop horizontal + mobile bottom nav (5 items)
- [x] `/tenant/dashboard` — welcome card, stats, quick actions, recent invoices/notices
- [x] `/tenant/invoices` — invoice list, pay now placeholder (Stripe not integrated yet)
- [x] `/tenant/complaints` — raise + view complaints, status timeline
- [x] `/tenant/absences` — report + view absences
- [x] `/tenant/notices` — notice feed
- [x] `/tenant/events` — events + RSVP
- [x] `/tenant/food` — view menus + meal orders
- [x] `/tenant/profile` — view/edit personal info, emergency contact, change password

---

## PHASE 11 — Notices & Communication Module ✅ (partial)

### 11.1 — Admin Notices (`/notices`)
- [x] Notices list with pin, scope, create/edit/delete
- [ ] Rich text body (react-quill) — using plain textarea for now
- [ ] Send email to affected tenants — not yet

### 11.2 — In-App Notifications
- [x] NotificationBell with unread count badge
- [x] Dropdown with mark-as-read, mark-all-read
- [x] Realtime subscription on `notifications` table

### 11.3 — Email Notifications via Supabase Edge Functions
- [ ] **NOT BUILT** — all email triggers (check-in welcome, invoice generated, payment confirmation, complaint update, notice broadcast) need Edge Functions

---

## PHASE 12 — Events Module ✅

- [x] `/events` — list with RSVP counts, create/edit/delete, past event dimming
- [ ] Calendar view (month/week toggle) — not yet
- [ ] Mark attendance (staff-side checkbox list) — not yet
- [ ] Export attendee list CSV — not yet

---

## PHASE 13 — Food & Meal Management ✅

- [x] `/food/plans` — meal plan CRUD, active/inactive toggle, tenant counts
- [x] `/food/menus` — date navigation, per-meal tag input, copy previous day, save per meal
- [x] `/food/kitchen` — orders dashboard, bulk mark delivered, opted-out tenants

---

## PHASE 14 — Housekeeping & Maintenance ✅

- [x] `/housekeeping/schedules` — schedule list, create/edit, mark completed
- [x] `/housekeeping/maintenance` — ticket list, create, status workflow, assign, resolve
- [x] `/housekeeping/inventory` — inventory CRUD, low stock badge, restock action

---

## PHASE 15 — Reporting & Analytics ✅

- [x] `/analytics/occupancy` — occupancy rate charts, bed availability
- [x] `/analytics/revenue` — revenue charts, collection rate, outstanding dues
- [x] `/analytics/tenants` — tenant lifecycle, complaint resolution, status distribution
- [x] `/analytics/audit` — audit log viewer with filters, read-only, CSV export

---

## PHASE 16 — Dashboard (Main Overview) ✅

- [x] `/dashboard` — greeting, 4 stat cards, quick actions, recent activity + events placeholders

---

## PHASE 17 — Polish, UX & Accessibility ✅ (mostly complete)

### 17.1 — Loading & Error States
- [x] Verified all data-fetching pages show `Skeleton` during load
- [x] All forms: disable submit + show spinner during submission
- [x] Friendly error toasts on all API failures
- [x] `src/app/not-found.js` — custom 404 page with back-to-dashboard button
- [x] `src/app/error.js` — global error boundary with retry button
- [x] `src/app/global-error.js` — root error boundary

### 17.2 — Empty States
- [x] All admin list pages show `EmptyState` when no data
- [x] All tenant portal list pages show inline empty states

### 17.3 — Toast Notifications
- [x] All pages: every create/update/delete shows success/error toast
- [x] Sonner positioned bottom-right, richColors enabled

### 17.4 — Form UX
- [x] Required field validation + inline error messages on all forms
- [ ] Search on all dropdowns with > 10 items — deferred
- [ ] File upload drag-and-drop zones — deferred (Phase 19)

### 17.5 — Responsive Design
- [x] All 17 admin pages with Tables: `overflow-x-auto` added (22 tables total)
- [x] Sidebar collapses to drawer on mobile (SidebarProvider)
- [x] Tenant portal: bottom nav on mobile, desktop horizontal nav
- [x] Dashboard grids: responsive (1col → 2col → 4col)

### 17.6 — Missing Features
- [x] **Invitation acceptance page** `/invite/[token]` — built + API route
- [ ] **Lease PDF generation** — `@react-pdf/renderer` installed but template not built yet
- [ ] **Calculator overlay** `CalculatorSheet` — optional, deferred
- [x] Layout-level metadata (title template) on dashboard + tenant portal
- [x] `src/app/not-found.js` — 404 page ✅
- [x] `src/app/error.js` + `src/app/global-error.js` ✅
- [x] `predev` script: auto-kills port 3000 before `pnpm dev`

---

## PHASE 18 — Testing & Quality Assurance ✅ ← DONE

### 18.1 — Unit Tests ✅
- [x] Install Vitest + Testing Library (`vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`)
- [x] `vitest.config.js` configured with jsdom, path aliases, setup file
- [x] `src/lib/validations/auth.test.js` — 18 tests covering all 5 Zod schemas (signupSchema, loginSchema, forgotPassword, resetPassword, tenantLogin)
- [x] `src/lib/utils.test.js` — 7 tests for cn() class name utility
- [x] `src/lib/constants.test.js` — 20 tests for SYSTEM_ROLES, PERMISSION_MODULES, INVOICE_STATUS, COMPLAINT_CATEGORIES, ROOM_TYPES, etc.
- [x] `src/lib/permissions.test.js` — 25 tests for permission matrix across all 7 roles (Org Admin full access, Frontdesk blocked from analytics, Tenant blocked from finance, etc.)
- [x] `src/lib/color-utils.test.js` — 5 tests for hexToHSL conversions
- [x] `src/lib/slug.test.js` — 6 tests for org slug generation
- [x] **75/75 tests passing**

### 18.2 — Integration Tests
- [ ] Auth: sign up → org created → onboarding redirect — deferred (requires Supabase test env)
- [ ] Tenant creation → room assigned → invoice generated — deferred
- [ ] Payment recorded → invoice status updated — deferred

### 18.3 — Manual QA Checklist
- [ ] RLS: org A cannot see org B data — verify with 2 test accounts
- [ ] Role permissions: frontdesk blocked from billing routes — manual test
- [ ] Tenant portal: tenant sees only own data — manual test
- [ ] Dark mode / light mode visual check — manual
- [ ] Mobile responsiveness on real device — manual

### 18.4 — CI Quality Gates ✅
- [x] `pnpm test` step added to GitHub Actions (runs before build)
- [x] CI pipeline: install → lint → test → build
- [ ] Branch protection on `main` — configure in GitHub repo settings

---

## PHASE 19 — Deployment & Production Setup [~] ← IN PROGRESS

### 19.1 — Stripe Integration ✅
- [x] Install `@stripe/stripe-js` + `stripe`
- [x] Add keys to `.env.example` (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`)
- [x] `POST /api/stripe/create-payment-intent` route — lazy Stripe init, auth-gated
- [x] `POST /api/webhooks/stripe` — signature verification, records payment + updates invoice status
- [x] "Pay Now" button in tenant invoice detail sheet (shown for sent/partial/overdue invoices)
- [x] On success: webhook creates payment record + updates invoice to paid/partial
- [ ] Add `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` to `.env.local` **(user must do)**
- [ ] Configure Stripe webhook in Stripe Dashboard → point to `/api/webhooks/stripe` **(user must do)**

### 19.2 — Vercel Deployment
- [ ] Connect GitHub repo to Vercel **(user must do — requires Vercel account)**
- [ ] Add all env vars to Vercel (production values)
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Preview deployments for PRs

### 19.3 — Supabase Production Config
- [ ] Update Auth Site URL + redirect URLs to production domain **(user must do)**
- [ ] Enable PITR + daily backups
- [ ] Review RLS policies

### 19.4 — Email Notifications (Supabase Edge Functions) ✅
- [x] `send-welcome-email` — deployed to Supabase (ACTIVE)
- [x] `send-invoice-email` — deployed to Supabase (ACTIVE)
- [x] `send-payment-confirmation` — deployed to Supabase (ACTIVE)
- [x] `send-complaint-update` — deployed to Supabase (ACTIVE)
- [ ] Set `RESEND_API_KEY` + `FROM_EMAIL` in Supabase Edge Function secrets **(user must do)**
- [ ] Call edge functions from relevant admin pages (invoice creation, payment recording, etc.)

### 19.5 — Domain & DNS
- [ ] Purchase/configure custom domain **(user must do)**
- [ ] Add to Vercel + configure DNS
- [ ] Update Supabase + Stripe with new domain

### 19.6 — Monitoring
- [ ] Vercel Analytics (built-in — auto-enabled on Vercel deployment)
- [ ] Sentry error tracking
- [ ] Uptime monitor (UptimeRobot free tier)

### 19.7 — Final Pre-Launch Checklist [~]
- [ ] All RLS verified in production
- [x] No hardcoded test keys in code
- [x] No `console.log` in source (only `console.error` in catch blocks — appropriate)
- [x] Privacy Policy page `/privacy` ✅
- [x] Terms of Service page `/terms` ✅ (linked from signup page)
- [ ] First production org tested end-to-end

---

## PHASE 20 — Post-Launch / Phase 2 Roadmap (Future)

> Out of MVP scope. Log here for planning.

- [ ] Recurring invoice Edge Function cron (auto monthly invoices)
- [ ] Advanced role customization (drag-and-drop permission builder)
- [ ] Security deposit refund workflow with multi-level approval
- [ ] QuickBooks / Xero accounting integration
- [ ] SAML/OIDC SSO for enterprise orgs
- [ ] Mobile app (React Native / Expo)
- [ ] Dedicated DB for Enterprise tier
- [ ] AI-assisted tenant matching + churn prediction
- [ ] Dynamic room pricing engine
- [ ] Background check / ID verification
- [ ] Multi-language support (start with Hindi)
- [ ] Public REST API with OAuth2 + webhooks
- [ ] White-label / custom domain per org

---

## QUICK REFERENCE — Credentials & Config

| Item | Value | Status |
|------|-------|--------|
| GitHub Repo | `codvikrr-wq/pg-management` (private) | ✅ Done |
| Supabase URL | `https://nkjtskiocmgbefxsbijh.supabase.co` | ✅ Done |
| Supabase Anon Key | set in `.env.local` | ✅ Done |
| Supabase Service Role Key | set in `.env.local` | ✅ Done |
| Database URL | set in `.env.local` | ✅ Done |
| `STRIPE_SECRET_KEY` | not yet | ⬜ Phase 19.1 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | not yet | ⬜ Phase 19.1 |
| Vercel Project | not yet | ⬜ Phase 19.2 |
| Production Domain | not yet | ⬜ Phase 19.5 |

---
