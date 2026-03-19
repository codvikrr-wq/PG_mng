-- ============================================================
-- MIGRATION 005 — Tenant Portal RLS Fixes
--
-- Problem: Tenant users have users.organization_id = NULL
-- because they never go through the org-creation signup flow.
-- get_user_org_id() returns NULL for them, blocking access to
-- notices, events, event_rsvps, tenant_meal_plans, and menus.
--
-- Fix: Add tenant-specific SELECT policies that join through
-- the tenants table (which has the correct organization_id
-- and pg_id) instead of relying on get_user_org_id().
-- ============================================================

-- ============================================================
-- NOTICES — tenants can see notices for their PG or org-wide
-- ============================================================
CREATE POLICY "Tenants can view pg notices"
  ON public.notices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.user_id = auth.uid()
      AND t.organization_id = notices.organization_id
      AND (notices.pg_id IS NULL OR notices.pg_id = t.pg_id)
  ));

-- ============================================================
-- EVENTS — tenants can see events for their PG
-- ============================================================
CREATE POLICY "Tenants can view pg events"
  ON public.events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.user_id = auth.uid()
      AND t.pg_id = events.pg_id
  ));

-- ============================================================
-- EVENT_RSVPS — tenants can view their own RSVPs
-- ============================================================
CREATE POLICY "Tenants can view own rsvps"
  ON public.event_rsvps FOR SELECT
  USING (tenant_id = public.get_tenant_id());

-- ============================================================
-- TENANT_MEAL_PLANS — tenants can view their own plan
-- ============================================================
CREATE POLICY "Tenants can view own tenant_meal_plans"
  ON public.tenant_meal_plans FOR SELECT
  USING (tenant_id = public.get_tenant_id());

-- ============================================================
-- MENUS — tenants can view menus for their PG
-- ============================================================
CREATE POLICY "Tenants can view pg menus"
  ON public.menus FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.user_id = auth.uid()
      AND t.pg_id = menus.pg_id
  ));

-- ============================================================
-- MEAL_PLANS — tenants can view meal plans for their org
-- ============================================================
CREATE POLICY "Tenants can view org meal_plans"
  ON public.meal_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.user_id = auth.uid()
      AND t.organization_id = meal_plans.organization_id
  ));

-- ============================================================
-- ABSENCE_REPORTS — ensure tenant insert works via get_tenant_id
-- (the existing policy requires tenant_id = get_tenant_id() which is correct)
-- Add a select policy just in case it was missed
-- ============================================================

-- ============================================================
-- COMPLAINTS — tenant insert: add organization_id via tenants join
-- The existing INSERT policy checks tenant_id = get_tenant_id()
-- but we also need the organization_id check to pass on INSERT.
-- Drop the existing tenant insert policy and replace with a better one.
-- ============================================================
DROP POLICY IF EXISTS "Tenants can insert own complaints" ON public.complaints;

CREATE POLICY "Tenants can insert own complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND organization_id = (
      SELECT organization_id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- ============================================================
-- ABSENCE_REPORTS — replace tenant insert policy similarly
-- ============================================================
DROP POLICY IF EXISTS "Tenants can create own absences" ON public.absence_reports;

CREATE POLICY "Tenants can create own absences"
  ON public.absence_reports FOR INSERT
  WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND organization_id = (
      SELECT organization_id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1
    )
  );
