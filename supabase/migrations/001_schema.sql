-- ============================================================
-- PG Management SaaS — Full Database Schema
-- Run this in Supabase SQL Editor (Settings > SQL Editor)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  billing_info JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  tax_settings JSONB DEFAULT '{"tax_name": "GST", "tax_rate": 18}',
  subscription_tier TEXT DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. PGS (PROPERTIES)
-- ============================================================
CREATE TABLE public.pgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address JSONB DEFAULT '{}',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  capacity INTEGER DEFAULT 0,
  manager_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pgs_org ON public.pgs(organization_id);

-- ============================================================
-- 3. USERS (extends auth.users)
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  pg_ids UUID[] DEFAULT '{}',
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_org ON public.users(organization_id);

-- Add FK for pgs.manager_user_id now that users table exists
ALTER TABLE public.pgs ADD CONSTRAINT fk_pgs_manager FOREIGN KEY (manager_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ============================================================
-- 4. ROLES
-- ============================================================
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_roles_org ON public.roles(organization_id);
CREATE UNIQUE INDEX idx_roles_org_name ON public.roles(organization_id, name);

-- ============================================================
-- 5. USER_ROLES (junction)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID REFERENCES public.pgs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
CREATE UNIQUE INDEX idx_user_roles_unique ON public.user_roles(user_id, role_id, organization_id, COALESCE(pg_id, '00000000-0000-0000-0000-000000000000'));

-- ============================================================
-- 6. INVITATIONS
-- ============================================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID REFERENCES public.pgs(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);

-- ============================================================
-- 7. ROOMS
-- ============================================================
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT DEFAULT 'Single' CHECK (room_type IN ('Single', 'Double', 'Triple', 'Quad', 'Dormitory')),
  floor TEXT,
  capacity INTEGER DEFAULT 1,
  monthly_rent NUMERIC(12, 2) DEFAULT 0,
  amenities JSONB DEFAULT '[]',
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'full', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rooms_pg ON public.rooms(pg_id);
CREATE INDEX idx_rooms_org ON public.rooms(organization_id);

-- ============================================================
-- 8. BEDS
-- ============================================================
CREATE TABLE public.beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_beds_room ON public.beds(room_id);
CREATE INDEX idx_beds_org ON public.beds(organization_id);

-- ============================================================
-- 9. TENANTS
-- ============================================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  emergency_contact JSONB DEFAULT '{}',
  id_documents JSONB DEFAULT '[]',
  profile_photo_url TEXT,
  status TEXT DEFAULT 'prospective' CHECK (status IN ('prospective', 'active', 'on_leave', 'vacated', 'blacklisted')),
  move_in_date DATE,
  move_out_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenants_org ON public.tenants(organization_id);
CREATE INDEX idx_tenants_pg ON public.tenants(pg_id);
CREATE INDEX idx_tenants_user ON public.tenants(user_id);
CREATE INDEX idx_tenants_status ON public.tenants(status);

-- ============================================================
-- 10. LEASES / CONTRACTS
-- ============================================================
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  rent_amount NUMERIC(12, 2) NOT NULL,
  deposit_amount NUMERIC(12, 2) DEFAULT 0,
  deposit_status TEXT DEFAULT 'pending' CHECK (deposit_status IN ('pending', 'received', 'held', 'partial_refunded', 'fully_refunded')),
  notice_period_days INTEGER DEFAULT 30,
  terms TEXT,
  pdf_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leases_tenant ON public.leases(tenant_id);
CREATE INDEX idx_leases_org ON public.leases(organization_id);

-- ============================================================
-- 11. INVOICES
-- ============================================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  period_start DATE,
  period_end DATE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
  due_date DATE,
  invoice_number TEXT,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE UNIQUE INDEX idx_invoices_number ON public.invoices(organization_id, invoice_number);

-- ============================================================
-- 12. PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  method TEXT DEFAULT 'cash' CHECK (method IN ('online', 'cash', 'bank_transfer', 'upi', 'cheque')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_ref TEXT,
  stripe_payment_intent_id TEXT,
  receipt_url TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_org ON public.payments(organization_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id);

-- ============================================================
-- 13. EXPENSES
-- ============================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID REFERENCES public.pgs(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  vendor_name TEXT,
  receipt_url TEXT,
  date DATE DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX idx_expenses_pg ON public.expenses(pg_id);

-- ============================================================
-- 14. COMPLAINTS
-- ============================================================
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_complaints_org ON public.complaints(organization_id);
CREATE INDEX idx_complaints_tenant ON public.complaints(tenant_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);

-- ============================================================
-- 15. COMPLAINT COMMENTS
-- ============================================================
CREATE TABLE public.complaint_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_complaint_comments_complaint ON public.complaint_comments(complaint_id);

-- ============================================================
-- 16. ABSENCE REPORTS
-- ============================================================
CREATE TABLE public.absence_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_absences_org ON public.absence_reports(organization_id);
CREATE INDEX idx_absences_tenant ON public.absence_reports(tenant_id);

-- ============================================================
-- 17. NOTICES
-- ============================================================
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID REFERENCES public.pgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'general',
  pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notices_org ON public.notices(organization_id);

-- ============================================================
-- 18. EVENTS
-- ============================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID REFERENCES public.pgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  capacity INTEGER,
  rsvp_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_org ON public.events(organization_id);

-- ============================================================
-- 19. EVENT RSVPs
-- ============================================================
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'yes' CHECK (status IN ('yes', 'no', 'maybe')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_rsvps_unique ON public.event_rsvps(event_id, tenant_id);

-- ============================================================
-- 20. MEAL PLANS
-- ============================================================
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'daily' CHECK (type IN ('daily', 'weekly', 'prepaid')),
  price NUMERIC(12, 2) DEFAULT 0,
  meals_included JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meal_plans_org ON public.meal_plans(organization_id);

-- ============================================================
-- 21. TENANT MEAL PLANS
-- ============================================================
CREATE TABLE public.tenant_meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  credits_remaining INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 22. MENUS
-- ============================================================
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  items JSONB DEFAULT '[]',
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_menus_pg_date ON public.menus(pg_id, date);

-- ============================================================
-- 23. MEAL ORDERS
-- ============================================================
CREATE TABLE public.meal_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES public.menus(id) ON DELETE SET NULL,
  meal_type TEXT NOT NULL,
  date DATE NOT NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'delivered')),
  billing_method TEXT DEFAULT 'per_order' CHECK (billing_method IN ('per_order', 'per_plan', 'included_in_rent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meal_orders_pg_date ON public.meal_orders(pg_id, date);

-- ============================================================
-- 24. HOUSEKEEPING SCHEDULES
-- ============================================================
CREATE TABLE public.housekeeping_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rooms_assigned JSONB DEFAULT '[]',
  notes TEXT,
  next_due_at TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hk_schedules_pg ON public.housekeeping_schedules(pg_id);

-- ============================================================
-- 25. MAINTENANCE TICKETS
-- ============================================================
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  vendor_name TEXT,
  estimated_cost NUMERIC(12, 2),
  sla_hours INTEGER DEFAULT 48,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maintenance_org ON public.maintenance_tickets(organization_id);
CREATE INDEX idx_maintenance_status ON public.maintenance_tickets(status);

-- ============================================================
-- 26. INVENTORY ITEMS
-- ============================================================
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  reorder_threshold INTEGER DEFAULT 5,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_pg ON public.inventory_items(pg_id);

-- ============================================================
-- 27. AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_org ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- 28. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;
