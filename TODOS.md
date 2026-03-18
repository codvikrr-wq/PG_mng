# PG Management SaaS — Master Build To-Do List

> **Stack:** Next.js (JS) · React · Tailwind CSS · shadcn/ui · Supabase (Auth, PostgreSQL, Storage, Edge Functions) · GitHub · GitHub Actions
> **Status key:** `[ ]` = pending · `[x]` = done · `[~]` = in progress
> Complete phases in order. Do not skip ahead.

---

## PHASE 0 — Prerequisites & Credential Collection

> Everything in this phase must be completed BEFORE writing any code.
> Claude will pause and prompt you for each required input.

### 0.1 — Tools & Accounts (verify these exist)
- [ ] Node.js ≥ 20 installed locally (`node -v`)
- [ ] pnpm installed globally (`npm i -g pnpm`)
- [ ] Git installed locally (`git --version`)
- [ ] GitHub account exists
- [ ] Supabase account exists (supabase.com)
- [ ] Vercel account exists (vercel.com) — for deployment
- [ ] Stripe account exists (stripe.com) — for payment gateway MVP

### 0.2 — GitHub Repository Setup (Claude + you)
- [ ] **[YOU]** Create a new GitHub repository named `pg-management` (public or private)
- [ ] **[YOU]** Provide the repo URL to Claude
- [ ] **[YOU]** Add Claude's SSH key or PAT if needed for push access
- [ ] **[Claude]** Clone the repo locally into `C:\Work_R&R\PGManagement\`
- [ ] **[Claude]** Create `.gitignore` for Next.js + env files
- [ ] **[Claude]** Create initial `README.md`
- [ ] **[Claude]** Push initial commit to `main`

### 0.3 — Supabase Project Setup (Claude + you)
- [ ] **[YOU]** Create a new Supabase project (name: `pg-management`, region closest to your users)
- [ ] **[YOU]** Provide Claude with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (kept server-side only)
- [ ] **[Claude]** Create `.env.local` and `.env.example` with all required variables
- [ ] **[Claude]** Verify Supabase connection from CLI

### 0.4 — Supabase Auth Configuration (you do in Supabase dashboard)
- [ ] **[YOU]** Enable Email provider (email + password)
- [ ] **[YOU]** Enable Phone / OTP provider (for tenant portal)
- [ ] **[YOU]** Set Site URL to `http://localhost:3000` (update to prod URL later)
- [ ] **[YOU]** Configure email templates (confirm email, magic link, invite) — use defaults for now
- [ ] **[YOU]** Set redirect URLs: `http://localhost:3000/auth/callback`

### 0.5 — Stripe Setup (you do in Stripe dashboard)
- [ ] **[YOU]** Create a Stripe account / project
- [ ] **[YOU]** Provide Claude with:
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET` (after webhook endpoint is created)
- [ ] **[YOU]** Enable test mode for development

### 0.6 — Vercel Project Setup
- [ ] **[YOU]** Create a new Vercel project linked to the GitHub repo
- [ ] **[YOU]** Provide Vercel project name / team slug to Claude (for CLI deploys)
- [ ] **[YOU]** Do NOT add env vars to Vercel yet — Claude will do this at deployment phase

### 0.7 — Final Credential Checklist (Claude verifies all are present)
- [ ] All `.env.local` keys populated
- [ ] Supabase project URL reachable
- [ ] GitHub repo accessible
- [ ] README updated with project overview

---

## PHASE 1 — Next.js Project Initialization

### 1.1 — Scaffold the App
- [ ] Run `pnpm create next-app@latest pg-management --js --tailwind --eslint --app --src-dir --import-alias "@/*"` inside the repo directory
- [ ] Verify: app runs at `localhost:3000` with `pnpm dev`
- [ ] Remove all boilerplate (default page content, global CSS reset leftovers)

### 1.2 — Install Core Dependencies
- [ ] Install Supabase client: `pnpm add @supabase/supabase-js @supabase/ssr`
- [ ] Install shadcn/ui: `pnpm dlx shadcn@latest init` (use "New York" style, CSS variables ON)
- [ ] Install shadcn components needed for MVP:
  - `button`, `card`, `input`, `label`, `select`, `textarea`, `checkbox`, `switch`
  - `dialog`, `dropdown-menu`, `popover`, `sheet`, `tabs`, `badge`, `avatar`
  - `table`, `form`, `toast` (Sonner), `skeleton`, `separator`, `tooltip`
  - `calendar`, `date-picker`, `command`, `sidebar`
- [ ] Install supporting libs:
  - `pnpm add react-hook-form zod @hookform/resolvers`
  - `pnpm add date-fns`
  - `pnpm add recharts` (for dashboard charts)
  - `pnpm add @stripe/stripe-js @stripe/react-stripe-js stripe`
  - `pnpm add react-pdf @react-pdf/renderer` (for PDF contract generation)
  - `pnpm add sonner` (toast notifications)
  - `pnpm add lucide-react` (icons — already included with shadcn)
  - `pnpm add next-themes` (dark/light mode)
  - `pnpm add clsx tailwind-merge` (if not already included)

### 1.3 — Folder Structure
- [ ] Create the following directory structure under `src/`:
  ```
  src/
  ├── app/
  │   ├── (auth)/           # login, signup, forgot-password, OTP
  │   ├── (dashboard)/      # protected admin/staff pages
  │   │   ├── dashboard/
  │   │   ├── pgs/
  │   │   ├── rooms/
  │   │   ├── tenants/
  │   │   ├── payments/
  │   │   ├── complaints/
  │   │   ├── absences/
  │   │   ├── notices/
  │   │   ├── events/
  │   │   ├── food/
  │   │   ├── housekeeping/
  │   │   ├── analytics/
  │   │   └── settings/
  │   ├── (tenant-portal)/  # tenant self-service
  │   ├── api/              # Next.js API routes
  │   │   ├── auth/
  │   │   ├── webhooks/
  │   │   └── stripe/
  │   ├── onboarding/       # org + first PG setup wizard
  │   └── layout.js
  ├── components/
  │   ├── ui/               # shadcn auto-generated
  │   ├── layout/           # Sidebar, TopBar, PageHeader
  │   ├── dashboard/        # StatCard, QuickActions, Charts
  │   ├── tenants/
  │   ├── finance/
  │   ├── complaints/
  │   ├── notices/
  │   ├── food/
  │   └── shared/           # EmptyState, LoadingSpinner, ConfirmDialog
  ├── lib/
  │   ├── supabase/
  │   │   ├── client.js     # browser client
  │   │   ├── server.js     # server client (RSC / API routes)
  │   │   └── middleware.js
  │   ├── utils.js
  │   ├── constants.js      # roles, permissions, statuses
  │   └── validations/      # Zod schemas per module
  ├── hooks/                # custom React hooks
  ├── context/              # ThemeContext, OrgContext, UserContext
  └── styles/
      └── globals.css
  ```

### 1.4 — ESLint, Prettier & Git Hooks
- [ ] Configure `.eslintrc.json` with Next.js + React rules
- [ ] Install Prettier: `pnpm add -D prettier eslint-config-prettier`
- [ ] Create `.prettierrc` with standard config (single quotes, semi: true, tabWidth: 2)
- [ ] Install Husky + lint-staged: `pnpm add -D husky lint-staged`
- [ ] Configure pre-commit hook to run ESLint + Prettier on staged files
- [ ] Add `pnpm lint` and `pnpm format` scripts to `package.json`

### 1.5 — GitHub Actions CI Pipeline
- [ ] Create `.github/workflows/ci.yml`:
  - Triggers: `push` to `main`, all `pull_request`
  - Steps: checkout → install pnpm → `pnpm install` → `pnpm lint` → `pnpm build`
- [ ] Add Supabase and other env secrets to GitHub repo secrets (for CI)
- [ ] Verify CI passes on first push

---

## PHASE 2 — Database Schema & Supabase Configuration

### 2.1 — Core Tables (SQL Migrations)
Write and apply each migration via Supabase SQL Editor or CLI:

- [ ] **organizations** table
  ```sql
  id (uuid PK), name, slug (unique), billing_info (jsonb), branding (jsonb),
  timezone, currency, tax_settings (jsonb), subscription_tier, created_at, updated_at
  ```
- [ ] **pgs** (properties) table
  ```sql
  id (uuid PK), organization_id (FK), name, address (jsonb), timezone,
  currency, manager_user_id (FK users), capacity, created_at, updated_at
  ```
- [ ] **users** table (extends Supabase auth.users)
  ```sql
  id (uuid PK = auth.users.id), organization_id (FK), pg_ids (uuid[]),
  first_name, last_name, phone, avatar_url, status, created_at, updated_at
  ```
- [ ] **roles** table
  ```sql
  id (uuid PK), organization_id (FK), name, permissions (jsonb), is_system_role (bool)
  ```
- [ ] **user_roles** table
  ```sql
  id, user_id (FK), role_id (FK), organization_id (FK), pg_id (FK nullable), created_at
  ```
- [ ] **invitations** table
  ```sql
  id, organization_id, pg_id (nullable), email, role_id, token (unique),
  status (pending/accepted/expired), invited_by, expires_at, created_at
  ```
- [ ] **rooms** table
  ```sql
  id, pg_id, organization_id, name, room_type, floor, capacity,
  monthly_rent, amenities (jsonb), status, created_at, updated_at
  ```
- [ ] **beds** table
  ```sql
  id, room_id, pg_id, organization_id, bed_number, status (available/occupied/maintenance)
  ```
- [ ] **tenants** table
  ```sql
  id, user_id (FK auth nullable), organization_id, pg_id, room_id, bed_id,
  first_name, last_name, email, phone, emergency_contact (jsonb),
  id_documents (jsonb), profile_photo_url, status (prospective/active/on_leave/vacated/blacklisted),
  move_in_date, move_out_date, created_at, updated_at
  ```
- [ ] **leases** table
  ```sql
  id, tenant_id, pg_id, organization_id, room_id, bed_id,
  start_date, end_date, rent_amount, deposit_amount, deposit_status,
  notice_period_days, terms (text), pdf_url, status (active/expired/terminated),
  created_at, updated_at
  ```
- [ ] **invoices** table
  ```sql
  id, organization_id, pg_id, tenant_id, lease_id, period_start, period_end,
  amount, tax_amount, total_amount, status (draft/sent/paid/partial/overdue/cancelled),
  due_date, invoice_number, line_items (jsonb), notes, created_at, updated_at
  ```
- [ ] **payments** table
  ```sql
  id, organization_id, invoice_id, tenant_id, amount, method (online/cash/bank_transfer/upi),
  status (pending/completed/failed/refunded), transaction_ref, stripe_payment_intent_id,
  notes, recorded_by, created_at
  ```
- [ ] **expenses** table
  ```sql
  id, organization_id, pg_id, category, description, amount, vendor_name,
  receipt_url, date, recurring (bool), recurrence_rule, created_by, created_at
  ```
- [ ] **complaints** table
  ```sql
  id, organization_id, pg_id, tenant_id, category, title, description,
  attachments (jsonb), status (open/assigned/in_progress/resolved/closed),
  priority, assigned_to, resolution_notes, sla_due_at, created_at, updated_at
  ```
- [ ] **absence_reports** table
  ```sql
  id, organization_id, pg_id, tenant_id, start_date, end_date,
  reason, status (pending/approved/rejected), approved_by, notes, created_at
  ```
- [ ] **notices** table
  ```sql
  id, organization_id, pg_id (nullable = org-wide), title, body, type,
  pinned (bool), published_at, expires_at, created_by, created_at
  ```
- [ ] **events** table
  ```sql
  id, organization_id, pg_id, title, description, location, starts_at, ends_at,
  capacity, rsvp_enabled, created_by, created_at
  ```
- [ ] **event_rsvps** table
  ```sql
  id, event_id, tenant_id, status (yes/no/maybe), created_at
  ```
- [ ] **meal_plans** table
  ```sql
  id, organization_id, pg_id, name, type (daily/weekly/prepaid), price, meals_included (jsonb)
  ```
- [ ] **tenant_meal_plans** table
  ```sql
  id, tenant_id, meal_plan_id, start_date, end_date, credits_remaining, status
  ```
- [ ] **menus** table
  ```sql
  id, pg_id, organization_id, date, meal_type (breakfast/lunch/dinner/snack), items (jsonb)
  ```
- [ ] **meal_orders** table
  ```sql
  id, pg_id, tenant_id, menu_id, meal_type, date, quantity, status, billing_method
  ```
- [ ] **housekeeping_schedules** table
  ```sql
  id, pg_id, organization_id, type, frequency, assigned_to, rooms_assigned (jsonb),
  next_due_at, last_completed_at, notes
  ```
- [ ] **maintenance_tickets** table
  ```sql
  id, organization_id, pg_id, room_id, reported_by, category, description,
  attachments (jsonb), status, priority, assigned_to, vendor_name,
  sla_hours, resolved_at, created_at, updated_at
  ```
- [ ] **inventory_items** table
  ```sql
  id, pg_id, organization_id, name, category, quantity, unit,
  reorder_threshold, last_restocked_at
  ```
- [ ] **audit_logs** table
  ```sql
  id, organization_id, user_id, action, resource_type, resource_id,
  old_value (jsonb), new_value (jsonb), ip_address, created_at
  ```
- [ ] **notifications** table
  ```sql
  id, user_id, organization_id, type, title, body, read (bool),
  action_url, created_at
  ```

### 2.2 — Insert Default Seed Data
- [ ] Insert 7 default system roles for every new org via DB function/trigger:
  `Org Admin`, `PG Manager`, `Frontdesk`, `Finance`, `Housekeeping`, `Tenant`, `Support`
- [ ] Define permissions JSON structure constant in `src/lib/constants.js`
- [ ] Seed default permissions for each system role

### 2.3 — Database Functions & Triggers
- [ ] `create_org_defaults()` — runs after INSERT on `organizations`:
  inserts 7 default roles automatically
- [ ] `generate_invoice_number()` — sequential invoice number per org
- [ ] `update_updated_at()` — generic trigger function for `updated_at` columns
  (apply to: orgs, pgs, users, tenants, leases, invoices, complaints, maintenance_tickets)
- [ ] `handle_new_user()` — runs after auth.users insert, creates record in public.users

### 2.4 — Row Level Security (RLS) Policies
Apply RLS to EVERY table. Pattern: users can only see rows where `organization_id` matches their org.

- [ ] Enable RLS on all tables
- [ ] **organizations**: member can SELECT own org; admin can UPDATE
- [ ] **pgs**: org members can SELECT pgs in their org; managers can INSERT/UPDATE
- [ ] **users / user_roles**: org members see peers; admins manage all
- [ ] **rooms / beds**: org members see own org rooms; managers CRUD
- [ ] **tenants**: org members see tenants in their pg scope
- [ ] **leases**: org members see own org leases
- [ ] **invoices**: finance role + admins full access; tenants see own invoices only
- [ ] **payments**: finance role + admins; tenants see own payments
- [ ] **complaints**: tenants see own; staff see pg-scoped; managers see all
- [ ] **absence_reports**: tenants see/create own; managers approve
- [ ] **notices**: all org members read; managers/admins write
- [ ] **events / rsvps**: all org members read; managers write; tenants RSVP own
- [ ] **audit_logs**: admins read only; INSERT via service role only
- [ ] **notifications**: users see own notifications only
- [ ] Create a helper function `get_user_org_id()` used across RLS policies

### 2.5 — Supabase Storage Buckets
- [ ] Create bucket `avatars` (public, image types only, 5MB max)
- [ ] Create bucket `id-documents` (private, PDF + images, 10MB max)
- [ ] Create bucket `receipts` (private, PDF + images, 10MB max)
- [ ] Create bucket `complaint-attachments` (private, images + PDF, 20MB max)
- [ ] Create bucket `lease-documents` (private, PDF only, 20MB max)
- [ ] Create bucket `expense-receipts` (private, PDF + images, 10MB max)
- [ ] Set RLS policies on storage objects (users access only their org's files)

### 2.6 — Supabase Realtime
- [ ] Enable Realtime on `notifications` table (for in-app live notifications)
- [ ] Enable Realtime on `complaints` table (for live status updates in tenant portal)
- [ ] Enable Realtime on `maintenance_tickets` table

---

## PHASE 3 — Global Layout, Theme System & Navigation

### 3.1 — CSS Variables & Theme Setup
- [ ] Define all CSS custom properties in `globals.css`:
  - `--color-primary` (default `#007BFF`)
  - `--color-primary-light` (10-15% opacity variant)
  - `--color-success: #00C853`
  - `--color-danger: #FF5252`
  - `--color-warning: #FFAB00`
  - Light mode: `--color-bg: #F8F9FA`, `--color-surface: #FFFFFF`, `--color-text-main: #212529`
  - Dark mode: `--color-bg: #1A1A27`, `--color-surface: #252538`, `--color-text-main: #E9ECEF`
- [ ] Configure `next-themes` provider in root layout with `defaultTheme="system"`
- [ ] Create `ThemeProvider` wrapper component

### 3.2 — Primary Color Picker (Dynamic Theming)
- [ ] Create `useTheme` hook that reads/writes `--color-primary` to `localStorage`
- [ ] Create `ColorPickerPopover` component (preset swatches + hex input)
- [ ] Apply color on mount from `localStorage` (prevents FOUC)
- [ ] Validate hex input with regex
- [ ] Persist both primary color and dark/light preference in `localStorage`

### 3.3 — Sidebar Navigation Component
- [ ] Create `Sidebar` component (fixed 240px desktop)
- [ ] Navigation items with icons (lucide-react):
  - Dashboard, PG Properties, Rooms & Beds, Tenants, Payments,
    Documents, Complaints, Absences, Notices, Events, Food, Housekeeping, Analytics, Settings
- [ ] Active state: light `--color-primary` background tint, solid `--color-primary` text/icon
- [ ] Org name + logo at top of sidebar
- [ ] Collapse to icon-only mode button (for power users)
- [ ] Mobile: hidden by default, opens as off-canvas drawer via `Sheet` component
- [ ] Role-based nav item visibility (hide items user doesn't have access to)

### 3.4 — Top App Bar Component
- [ ] Create `TopBar` component (fixed, spans content area)
- [ ] Left: Hamburger icon (mobile only) + App Name + Org Name
- [ ] Right: Notifications bell (with unread badge count) → dropdown popover
- [ ] Right: Calculator icon → slides in right-side `Sheet` overlay (functional calculator)
- [ ] Right: Theme toggle Moon/Sun icon (instant dark/light switch)
- [ ] Right: Color picker icon (primary color selector)
- [ ] Right: User avatar dropdown (Profile, Settings, Logout)

### 3.5 — Dashboard Shell Layout
- [ ] Create `(dashboard)/layout.js`:
  - Auth guard (redirect to `/login` if not authenticated)
  - Org context provider (load user's org + pg scope)
  - Sidebar + TopBar + main content area
  - Responsive: sidebar collapses on mobile
- [ ] Create `PageHeader` component (title + breadcrumbs + action buttons slot)
- [ ] Create `EmptyState` component (icon + title + description + optional CTA)
- [ ] Create `LoadingSpinner` and `Skeleton` wrappers for data fetching states
- [ ] Create `ConfirmDialog` component (reusable destructive action confirmation)
- [ ] Toast provider setup with Sonner (bottom-right, styled to match theme)

### 3.6 — Calculator Overlay
- [ ] Create `CalculatorSheet` component (slides in from right, ~300px)
  - Full numeric calculator with memory functions
  - Does not close when user clicks main content
  - Close button in header

---

## PHASE 4 — Authentication Flows

### 4.1 — Supabase Client Setup
- [ ] Create `src/lib/supabase/client.js` (browser client singleton)
- [ ] Create `src/lib/supabase/server.js` (server-side client for RSC + API routes)
- [ ] Create `src/middleware.js` (session refresh on every request using `@supabase/ssr`)
- [ ] Configure `matcher` in middleware to exclude static files and `/api/webhooks`

### 4.2 — Auth Route Group `(auth)/`
- [ ] **Sign Up page** `/signup`:
  - Full name, email, password, confirm password
  - Org name field (creates the organization on sign up)
  - Zod validation schema
  - On submit: create auth user → create organization → create user record → assign Org Admin role → redirect to `/onboarding`
- [ ] **Login page** `/login`:
  - Email + password form
  - "Forgot password?" link
  - Google SSO button (if enabled — configure in Supabase)
  - On success: redirect to `/dashboard`
- [ ] **Forgot Password page** `/forgot-password`:
  - Email input → sends Supabase password reset email
  - Success state UI
- [ ] **Reset Password page** `/auth/reset-password`:
  - New password + confirm (uses Supabase session from email link)
- [ ] **Auth callback route** `/auth/callback/route.js`:
  - Exchanges code for session (required for email confirmation + OAuth)
- [ ] **Tenant OTP login** `/tenant/login`:
  - Phone number input → send OTP
  - OTP verification input
  - On success: redirect to `/tenant/dashboard`
- [ ] Shared `AuthLayout` with centered card, logo, clean design

### 4.3 — Session & Context
- [ ] Create `UserContext` + `useUser` hook (current auth user + profile)
- [ ] Create `OrgContext` + `useOrg` hook (current organization, PGs list, user role/permissions)
- [ ] Create `usePermission(permission)` hook (returns bool)
- [ ] Create `PermissionGuard` component (renders children only if user has permission)

---

## PHASE 5 — Onboarding Wizard

- [ ] Create `/onboarding` multi-step wizard (only shown after first sign up):
  - **Step 1:** Welcome — confirm org name, upload org logo, set timezone & currency
  - **Step 2:** Create your first PG — name, address, capacity
  - **Step 3:** Invite team members (optional, skippable) — email + role select
  - **Step 4:** Done — summary + "Go to Dashboard" button
- [ ] Progress stepper component at top of wizard
- [ ] Mark onboarding complete in org record (`onboarding_completed: true`)
- [ ] Skip to dashboard if onboarding already complete

---

## PHASE 6 — Organization & PG Settings

### 6.1 — Organization Settings (`/settings/organization`)
- [ ] Org name, logo upload (Supabase Storage `avatars` bucket)
- [ ] Branding: primary color override per org (stored in `branding` jsonb)
- [ ] Timezone, default currency selection
- [ ] Tax settings (tax name, rate %)
- [ ] Billing info (address, GST/VAT number)
- [ ] Danger zone: delete organization (with confirmation)

### 6.2 — PG Management (`/pgs`)
- [ ] PG list page with cards: name, address, occupancy rate, manager
- [ ] Create PG modal/form: name, address, timezone, capacity, manager (user select)
- [ ] Edit PG page: all fields editable
- [ ] Delete PG (with confirmation, only if no active tenants)
- [ ] PG detail page: overview stats, quick links to rooms/tenants in that PG

### 6.3 — User Management (`/settings/users`)
- [ ] User list table: name, email, role, PGs assigned, status, last active
- [ ] Invite user form: email, role select, PG scope select (multi-select)
  - Generates invitation record + sends email via Supabase email
- [ ] Invitation list with resend/revoke actions
- [ ] Edit user role / PG scope
- [ ] Deactivate / reactivate user
- [ ] Invitation accept page `/invitations/[token]` (public, creates account or links existing)

### 6.4 — Role Management (`/settings/roles`)
- [ ] Roles list: system roles (read-only) + custom org roles
- [ ] Create/edit custom role: name + permission matrix (checkboxes per module)
- [ ] Permission categories: Organization, PGs, Tenants, Finance, Complaints, Notices, Events, Food, Housekeeping, Analytics, Settings
- [ ] Per-permission: View, Create, Edit, Delete granularity
- [ ] Delete custom role (only if no users assigned)
- [ ] Assign role to user from user management

---

## PHASE 7 — Rooms & Beds Management

### 7.1 — Rooms (`/rooms`)
- [ ] Room list page (filterable by PG, room type, status)
- [ ] Room card/row: room number, type, floor, capacity, current occupancy, monthly rent, status
- [ ] Create room form: PG select, room name/number, floor, room type (single/double/triple/dorm), capacity, monthly rent, amenities (multi-select tags)
- [ ] Edit room form
- [ ] Delete room (only if all beds are unoccupied)
- [ ] Room detail view: list of beds with occupant names + status

### 7.2 — Beds
- [ ] Add bed to room: bed number, status
- [ ] Bed status badge: Available (green), Occupied (blue), Maintenance (yellow)
- [ ] Edit/delete bed (can't delete if occupied)
- [ ] Visual room layout: simple grid of bed cards inside each room

### 7.3 — CSV Import for Rooms
- [ ] CSV import button on rooms page
- [ ] Accept columns: `pg_id, room_name, room_type, capacity, monthly_rent`
- [ ] Validation with error rows highlighted before import
- [ ] Confirm & import action

---

## PHASE 8 — Tenant Management

### 8.1 — Tenant List (`/tenants`)
- [ ] Tenant list table: name, photo, PG, room/bed, status badge, move-in date, rent amount, actions
- [ ] Filters: by PG, by status, by room type, search by name/phone/email
- [ ] Pagination (server-side)
- [ ] Export to CSV button

### 8.2 — Add Tenant Flow
- [ ] Multi-step "Add Tenant" modal or page:
  - **Step 1 — Personal Info:** First name, last name, email, phone, DOB, gender, profile photo upload
  - **Step 2 — ID Documents:** Upload Aadhaar/Passport/Driving License + ID number (stored in Supabase Storage private bucket)
  - **Step 3 — Emergency Contact:** Name, relationship, phone
  - **Step 4 — Room Assignment:** PG select → Room select (shows available beds) → Bed select
  - **Step 5 — Lease/Contract:** Move-in date, move-out date (optional), rent amount, deposit amount, notice period
  - **Step 6 — Review & Save**
- [ ] Zod validation at each step
- [ ] Create auth user for tenant (email invite OR just create profile if phone-only)
- [ ] Assign `Tenant` role to new user

### 8.3 — Tenant Detail Page (`/tenants/[id]`)
- [ ] Header: photo, name, status badge, PG/room/bed, quick action buttons
- [ ] Tabs: Overview, Documents, Lease, Invoices, Payments, Complaints, Absences, Activity Log
- [ ] **Overview tab:** personal details, emergency contact, move-in/out dates
- [ ] **Documents tab:** ID docs with preview + download; upload additional docs
- [ ] **Lease tab:** current lease details + history; generate/download PDF
- [ ] **Invoices tab:** all invoices with status + pay button
- [ ] **Complaints tab:** all complaints raised by this tenant
- [ ] **Absences tab:** all absence reports + approval actions
- [ ] **Activity Log tab:** audit trail for this tenant

### 8.4 — Tenant Edit
- [ ] Edit all personal info fields
- [ ] Change room/bed assignment (triggers room status updates)
- [ ] Update lease terms (creates new lease version)

### 8.5 — Tenant Status Workflows
- [ ] **Check-in workflow:**
  - Confirm lease + deposit received
  - Set status to `active`
  - Auto-generate first invoice
  - Trigger welcome email via Supabase email
- [ ] **Check-out workflow:**
  - Set move-out date
  - Calculate outstanding invoices + deposit refund amount
  - Mark bed as available
  - Set status to `vacated`
  - Generate checkout summary PDF
- [ ] **Mark as On Leave:** set status, integrate with absence module
- [ ] **Blacklist tenant:** set status with reason + confirmation

### 8.6 — Digital Contract PDF Generation
- [ ] Create lease PDF template using `@react-pdf/renderer`:
  - Org logo + name at top
  - PG address
  - Tenant details
  - Room/bed details
  - Lease terms (dates, rent, deposit, notice period)
  - Org-defined terms & conditions (fetched from org settings)
  - Signature lines at bottom
- [ ] Download PDF button on lease tab
- [ ] Auto-store generated PDF in `lease-documents` storage bucket

### 8.7 — CSV Import for Tenants
- [ ] CSV import button on tenants page
- [ ] Accept columns: `first_name, last_name, email, phone, pg_id, room_name, bed_number, start_date, end_date, rent`
- [ ] Validation + preview before import

---

## PHASE 9 — Finance Module

### 9.1 — Invoices (`/payments/invoices`)
- [ ] Invoice list table: invoice #, tenant, PG, period, amount, status badge, due date, actions
- [ ] Filters: by PG, by status, by date range, by tenant
- [ ] **Create invoice form:**
  - Tenant select, period (date range), line items (description + amount)
  - Tax calculation (auto from org tax settings)
  - Due date, notes
  - Save as draft OR send to tenant
- [ ] **Recurring invoice setup:**
  - Per-tenant toggle for monthly auto-invoice
  - Invoice generation day (e.g., 1st of month)
  - Pro-rata calculation on move-in/move-out
  - Supabase Edge Function scheduled trigger (cron) for monthly generation
- [ ] Invoice detail page: line items, payment history, download PDF
- [ ] Invoice PDF generation (`@react-pdf/renderer`): org logo, invoice number, tenant details, line items, tax, total, payment instructions
- [ ] Send invoice via email (Supabase email)
- [ ] Cancel/void invoice (with reason)

### 9.2 — Payments (`/payments/records`)
- [ ] Payment list table: date, tenant, invoice, amount, method, status, transaction ref
- [ ] **Record manual payment form:**
  - Invoice select (search by tenant), amount, payment method (cash/bank/UPI/cheque), date, reference, notes
  - Upload receipt photo
  - Updates invoice status automatically
- [ ] Payment receipt PDF (downloadable)

### 9.3 — Stripe Online Payment Integration
- [ ] Create `POST /api/stripe/create-payment-intent` route
- [ ] Create `POST /api/webhooks/stripe` route (handle `payment_intent.succeeded`, `payment_intent.failed`)
- [ ] Stripe webhook signature verification
- [ ] Tenant-facing "Pay Now" button → opens Stripe Elements modal
- [ ] On payment success: create payment record, update invoice status, send receipt email
- [ ] Store `stripe_payment_intent_id` on payment record

### 9.4 — Expenses (`/payments/expenses`)
- [ ] Expense list table: date, PG, category, description, vendor, amount, receipt
- [ ] Categories: Maintenance, Utilities, Supplies, Salaries, Food, Other
- [ ] Add expense form: PG select, category, description, vendor, amount, date, receipt upload
- [ ] Recurring expense toggle (monthly/weekly)
- [ ] Edit/delete expense

### 9.5 — Security Deposits
- [ ] Deposit tracking on lease record
- [ ] Deposit status: `received`, `held`, `partial_refunded`, `fully_refunded`
- [ ] Refund workflow: enter refund amount (with deductions breakdown), approval, record payment out

### 9.6 — Finance Dashboard & Reports (`/payments/reports`)
- [ ] **AR Aging report:** invoices by 0-30, 31-60, 61-90, 90+ days overdue (table + bar chart)
- [ ] **Revenue by PG:** monthly bar chart using Recharts
- [ ] **Cash flow:** income vs expense trend line chart
- [ ] **Rent collection rate:** % collected this month per PG
- [ ] Date range filter (this month, last month, last 3 months, custom)
- [ ] Export all reports to CSV

---

## PHASE 10 — Tenant Self-Service Portal

### 10.1 — Tenant Portal Layout (`(tenant-portal)/`)
- [ ] Separate layout from admin dashboard (simpler top nav, mobile-first)
- [ ] Auth guard: only users with `Tenant` role can access
- [ ] Responsive bottom navigation bar on mobile (Dashboard, Pay, Complaints, Notices, Profile)

### 10.2 — Tenant Dashboard (`/tenant/dashboard`)
- [ ] Welcome card: name, PG name, room/bed number
- [ ] Quick stats: outstanding balance, next due date, open complaints count
- [ ] Quick action buttons: Pay Rent, Raise Complaint, Report Absence, View Notices
- [ ] Recent invoices section (last 3)
- [ ] Recent notices section (last 3)

### 10.3 — Tenant Invoices & Payments (`/tenant/invoices`)
- [ ] List all invoices: period, amount, status, due date
- [ ] Invoice detail: line items, payment history
- [ ] "Pay Now" button → Stripe Elements payment modal
- [ ] Download receipt PDF after payment
- [ ] Payment history tab

### 10.4 — Complaints (`/tenant/complaints`)
- [ ] Complaint list: title, category, status badge, date
- [ ] **Raise complaint form:**
  - Category (electrical, plumbing, furniture, housekeeping, other)
  - Title, description
  - Photo/file attachments (up to 5 files, Supabase Storage)
  - Priority (low/medium/high)
- [ ] Complaint detail: status timeline, staff comments, resolution notes
- [ ] Realtime status update (Supabase Realtime on complaint record)
- [ ] "Add comment" on existing complaint

### 10.5 — Absence Reports (`/tenant/absences`)
- [ ] Absence list: dates, reason, status badge
- [ ] **Report absence form:**
  - Start date, end date (calendar date picker)
  - Reason (text)
- [ ] View approval status (pending / approved / rejected with reason)

### 10.6 — Notices (`/tenant/notices`)
- [ ] Notice feed: title, body, date, pinned indicator
- [ ] Filter: org-wide vs PG-specific
- [ ] Unread indicator on bell icon

### 10.7 — Events & RSVP (`/tenant/events`)
- [ ] Events list/calendar view
- [ ] Event detail: title, description, date/time, location, capacity
- [ ] RSVP buttons: Yes / No / Maybe
- [ ] User's RSVP status shown

### 10.8 — Tenant Profile (`/tenant/profile`)
- [ ] View personal info, current room/bed assignment
- [ ] Edit: profile photo, phone number, emergency contact
- [ ] View lease summary + download lease PDF
- [ ] Change password

---

## PHASE 11 — Notices & Communication Module

### 11.1 — Admin Notices (`/notices`)
- [ ] Notices list: title, scope (org/pg), published date, expiry, pinned status
- [ ] **Create notice form:**
  - Title, rich text body (use `react-quill` or simple textarea)
  - Scope: entire org OR specific PG(s)
  - Pin to top toggle
  - Schedule publish date + expiry date
- [ ] Edit / delete notice
- [ ] "Send email to all affected tenants" toggle on publish

### 11.2 — In-App Notifications
- [ ] Notification bell with unread count badge in TopBar
- [ ] Notification dropdown: list of recent notifications with mark-as-read
- [ ] "Mark all as read" button
- [ ] Realtime subscription (Supabase Realtime) on `notifications` table for current user
- [ ] Notification types: new invoice, payment received, complaint status update, new notice, new event
- [ ] Create notification records via DB trigger or Edge Function on relevant events

### 11.3 — Email Notifications (via Supabase)
- [ ] Tenant welcome email on check-in
- [ ] Invoice generated email (with PDF attachment link)
- [ ] Payment confirmation email
- [ ] Complaint status update email
- [ ] Notice broadcast email
- [ ] Use Supabase Edge Functions to send emails via Supabase's built-in email or Resend (if connected)

---

## PHASE 12 — Events Module

### 12.1 — Admin Events (`/events`)
- [ ] Events list + calendar view (month/week/list toggle)
- [ ] **Create event form:**
  - Title, description, location, start/end datetime
  - PG scope, capacity limit, RSVP enabled toggle
- [ ] Edit / cancel event
- [ ] RSVP list: who has responded (yes/no/maybe) + attendance count

### 12.2 — Event Attendance
- [ ] Mark attendance on event day (staff-side checkbox list of RSVPs)
- [ ] Export attendee list to CSV

---

## PHASE 13 — Food & Meal Management

### 13.1 — Meal Plans (`/food/plans`)
- [ ] Meal plan list: name, type, price, meals included
- [ ] Create/edit meal plan form
- [ ] Assign meal plan to tenant (on tenant profile or here)
- [ ] Tenant meal plan status: active/expired/paused

### 13.2 — Menu Management (`/food/menus`)
- [ ] Daily menu builder: select date, add items per meal type (breakfast/lunch/dinner/snack)
- [ ] Menu items: name, description, dietary tags (veg/non-veg/vegan)
- [ ] Weekly menu copy (copy last week's menu as template)
- [ ] Publish menu (makes it visible to tenants)

### 13.3 — Meal Orders
- [ ] Tenant-side: view today's + upcoming menus → pre-order meals
- [ ] Kitchen dashboard (`/food/kitchen`): orders grouped by date + meal type + count
- [ ] Auto-generate shopping list from confirmed orders + portion estimates
- [ ] Export shopping list to CSV/print

### 13.4 — Meal Billing
- [ ] Per-order billing: auto-create invoice line item per order
- [ ] Per-plan billing: include meal plan in monthly invoice
- [ ] Integration with Finance module (invoice generation)

---

## PHASE 14 — Housekeeping & Maintenance

### 14.1 — Housekeeping Schedules (`/housekeeping/schedules`)
- [ ] Schedule list: type, frequency, next due, assigned to, rooms
- [ ] **Create schedule form:**
  - Type (room cleaning, common area, laundry, etc.)
  - Frequency (daily/weekly/monthly)
  - Assign to staff member (from user list with housekeeping role)
  - Rooms/areas covered (multi-select)
  - Notes / checklist
- [ ] Mark schedule as completed → sets `last_completed_at` + calculates `next_due_at`
- [ ] Overdue schedule alert on dashboard

### 14.2 — Maintenance Tickets (`/housekeeping/maintenance`)
- [ ] Ticket list table: title, room, category, status, priority, SLA timer, assigned to
- [ ] **Create ticket form:** (staff-side; also available from tenant portal)
  - Room select, category, title, description, attachments, priority
  - Optional: vendor name, estimated cost
- [ ] **Ticket detail page:**
  - Status timeline (open → assigned → in progress → resolved)
  - Assign to staff or vendor
  - SLA countdown timer (color-coded: green/yellow/red)
  - Add update/comment
  - Mark resolved with resolution notes
- [ ] Auto-notify tenant when ticket is resolved
- [ ] SLA breach alert (highlight overdue tickets)

### 14.3 — Inventory Management (`/housekeeping/inventory`)
- [ ] Inventory list: item, category, quantity, unit, reorder threshold, last restocked
- [ ] Add/edit inventory item
- [ ] Restock action: add quantity + date + cost
- [ ] Low stock alerts: badge on sidebar when items below threshold
- [ ] Export inventory to CSV

---

## PHASE 15 — Reporting & Analytics

### 15.1 — Occupancy Dashboard (`/analytics/occupancy`)
- [ ] Current occupancy rate per PG + org-wide (donut chart)
- [ ] Bed availability grid (visual heatmap of rooms)
- [ ] Occupancy trend (last 6 months line chart)
- [ ] Move-in / move-out count this month
- [ ] Vacancy forecast (tenants with upcoming move-out dates)
- [ ] Average stay duration per PG

### 15.2 — Revenue Dashboard (`/analytics/revenue`)
- [ ] Total revenue this month (org + per PG breakdown)
- [ ] Revenue trend (12-month bar chart)
- [ ] Rent collection rate % (collected vs expected)
- [ ] Outstanding dues total
- [ ] Top 5 overdue tenants table
- [ ] Expense vs revenue comparison (P&L basic)

### 15.3 — Tenant Analytics (`/analytics/tenants`)
- [ ] Tenant lifecycle: avg stay duration, churn rate per PG
- [ ] Complaint resolution time (avg SLA performance)
- [ ] Absence report trends
- [ ] Tenant status distribution pie chart

### 15.4 — Audit Logs (`/analytics/audit`)
- [ ] Log list: timestamp, user, action, resource type + ID, old/new values
- [ ] Filters: by user, by action type, by date range, by resource
- [ ] Read-only (no edit/delete)
- [ ] Export to CSV

---

## PHASE 16 — Dashboard (Main Overview)

### 16.1 — Main Dashboard (`/dashboard`)
- [ ] Greeting: "Good [morning/evening], [first name]!"
- [ ] **Stat cards row:**
  - Active Tenants (with "X moving out soon" subtext)
  - Collected This Month (green icon, with "₹X pending" subtext)
  - Open Complaints (red icon)
  - Vacant Beds (blue icon)
- [ ] **Quick Action Buttons:** + Add Tenant, Record Payment, Add Expense, Log Complaint
- [ ] **Recent Activity feed** (last 10 audit log events)
- [ ] **Occupancy chart** (donut) for each PG in org
- [ ] **Revenue chart** (bar) last 6 months
- [ ] **Upcoming events** (next 3 events)
- [ ] **Low stock alert** (if any inventory below threshold)
- [ ] **Overdue invoices** (top 5 overdue tenants)
- [ ] PG selector dropdown (if user has access to multiple PGs — filters all widgets)

---

## PHASE 17 — Polish, UX & Accessibility

### 17.1 — Loading & Error States
- [ ] All data-fetching pages: show `Skeleton` components during load
- [ ] All forms: disable submit button during submission, show spinner
- [ ] API errors: display friendly error messages via toast
- [ ] 404 page: custom with back-to-dashboard button
- [ ] Global error boundary (`error.js`) with retry button

### 17.2 — Empty States
- [ ] Every list page: show `EmptyState` component when no data
  - Tenants, Rooms, Invoices, Complaints, Absences, Notices, Events, Inventory
- [ ] Friendly icons + contextual CTAs ("Add your first tenant")

### 17.3 — Toast Notifications
- [ ] Success toasts: every create/update/delete action
- [ ] Error toasts: every failed API call
- [ ] Info toasts: invoice generated, email sent confirmations
- [ ] Position: bottom-right, auto-dismiss 4 seconds, manual dismiss X

### 17.4 — Form UX
- [ ] All forms: inline validation on blur using Zod + react-hook-form
- [ ] Dropdown selects: include search bar for lists > 10 items
- [ ] Date pickers: clean calendar modal (shadcn Calendar)
- [ ] File upload: drag-and-drop zone with progress bar and preview
- [ ] Multi-step forms: save draft between steps (to sessionStorage)

### 17.5 — Responsive Design
- [ ] Test all pages at 320px, 768px, 1024px, 1440px
- [ ] Mobile bottom navigation for tenant portal
- [ ] Admin dashboard: sidebar collapses to drawer on < 1024px
- [ ] Tables: horizontal scroll on mobile OR card layout switch
- [ ] Modals: full-screen on mobile (bottom sheet)

### 17.6 — Accessibility
- [ ] All interactive elements keyboard-navigable
- [ ] ARIA labels on icon-only buttons
- [ ] Focus rings visible (use `--color-primary` for focus)
- [ ] Color contrast meets WCAG AA (test with browser tools)
- [ ] Screen reader-friendly table headers and form labels

---

## PHASE 18 — Testing & Quality Assurance

### 18.1 — Unit Tests
- [ ] Install Vitest: `pnpm add -D vitest @testing-library/react @testing-library/user-event`
- [ ] Test utility functions (pro-rata calc, invoice number gen, permission checks)
- [ ] Test Zod validation schemas

### 18.2 — Integration Tests
- [ ] Auth flow: sign up → org created → redirect to onboarding
- [ ] Tenant creation → room assigned → invoice generated
- [ ] Payment recorded → invoice status updated
- [ ] Complaint lifecycle: create → assign → resolve → tenant notified

### 18.3 — E2E Tests (Optional but recommended)
- [ ] Install Playwright: `pnpm add -D @playwright/test`
- [ ] E2E: full sign-up and onboarding flow
- [ ] E2E: tenant check-in to first invoice generation
- [ ] E2E: tenant portal — pay invoice with Stripe test card

### 18.4 — Manual QA Checklist
- [ ] RLS: verify org A cannot see org B's data (test with two separate org accounts)
- [ ] Role permissions: verify frontdesk cannot access billing routes
- [ ] Tenant portal: verify tenant cannot see other tenants' data
- [ ] Mobile responsiveness on real device (or BrowserStack)
- [ ] Dark mode: verify all components look correct
- [ ] Light mode: verify all components look correct

### 18.5 — CI/CD Quality Gates
- [ ] GitHub Actions: add `pnpm test` step (Vitest)
- [ ] GitHub Actions: add `pnpm build` with TypeScript/lint errors failing the build
- [ ] Add branch protection on `main`: require CI to pass before merge

---

## PHASE 19 — Deployment & Production Setup

### 19.1 — Vercel Deployment
- [ ] Connect GitHub repo to Vercel project
- [ ] Add all environment variables to Vercel (production values):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- [ ] Set `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure Vercel preview deployments for PRs

### 19.2 — Supabase Production Configuration
- [ ] Update Supabase Auth Site URL to production domain
- [ ] Add production domain to Supabase Auth redirect URLs
- [ ] Enable Supabase Point-in-Time Recovery (PITR) for production
- [ ] Enable Supabase daily backups
- [ ] Review and tighten RLS policies with production service role
- [ ] Set up Supabase alerts for DB size, connection limits

### 19.3 — Stripe Production Setup
- [ ] Switch Stripe keys from test to live mode
- [ ] Register production webhook endpoint in Stripe dashboard: `https://[domain]/api/webhooks/stripe`
- [ ] Update `STRIPE_WEBHOOK_SECRET` with live secret
- [ ] Test one real payment end-to-end

### 19.4 — Domain & DNS
- [ ] **[YOU]** Purchase/configure custom domain
- [ ] Add domain to Vercel + configure DNS records
- [ ] Verify SSL certificate auto-provisioned by Vercel
- [ ] Update Supabase + Stripe with new domain

### 19.5 — Monitoring & Observability
- [ ] Set up Vercel Analytics (built-in)
- [ ] Add Sentry for error tracking: `pnpm add @sentry/nextjs`
- [ ] Configure Sentry DSN in environment variables
- [ ] Set up Supabase logs monitoring (in Supabase dashboard)
- [ ] Create uptime monitor (UptimeRobot or BetterStack — free tier)

### 19.6 — Final Pre-Launch Checklist
- [ ] All RLS policies verified in production
- [ ] No hardcoded test keys or secrets in code
- [ ] `console.log` statements removed (or behind DEBUG flag)
- [ ] robots.txt and sitemap configured (if public-facing)
- [ ] Privacy policy page (placeholder)
- [ ] Terms of service page (placeholder)
- [ ] First production org created and tested end-to-end

---

## PHASE 20 — Post-Launch / Phase 2 Roadmap (Future)

> These are out of MVP scope. Log them here for planning.

- [ ] Advanced role customization UI (drag-and-drop permission builder)
- [ ] Refund workflow with multi-level approval
- [ ] QuickBooks / Xero accounting integration
- [ ] SAML/OIDC SSO for enterprise orgs
- [ ] Mobile app (React Native / Expo)
- [ ] Dedicated database option for Enterprise tier
- [ ] AI-assisted tenant matching and churn prediction
- [ ] Dynamic room pricing engine
- [ ] Background check / ID verification integration
- [ ] Multi-language support (start with Hindi)
- [ ] Public REST API with OAuth2 + webhooks
- [ ] White-label / custom domain per org

---

## QUICK REFERENCE — Information Claude Needs From You

| Item | Value | Status |
|------|-------|--------|
| GitHub Repo URL | | ⬜ Pending |
| `NEXT_PUBLIC_SUPABASE_URL` | | ⬜ Pending |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | | ⬜ Pending |
| `SUPABASE_SERVICE_ROLE_KEY` | | ⬜ Pending |
| `STRIPE_SECRET_KEY` | | ⬜ Pending |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | | ⬜ Pending |
| Vercel Project Name | | ⬜ Pending |
| Production Domain | | ⬜ Pending |
| Preferred Currency / Timezone (default) | | ⬜ Pending |
| Primary Color Preference (default hex) | | ⬜ Pending |

---

*Last updated: 2026-03-18 | Built for: PG Management SaaS MVP*
