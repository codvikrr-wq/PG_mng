-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Every table gets RLS enabled + policies scoped to org_id
-- ============================================================

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own org"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id());

CREATE POLICY "Org admins can update their org"
  ON public.organizations FOR UPDATE
  USING (id = public.get_user_org_id());

CREATE POLICY "Anyone can insert org on signup"
  ON public.organizations FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- PGS
-- ============================================================
ALTER TABLE public.pgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view pgs"
  ON public.pgs FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert pgs"
  ON public.pgs FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update pgs"
  ON public.pgs FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete pgs"
  ON public.pgs FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- USERS
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR organization_id = public.get_user_org_id());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid() OR organization_id = public.get_user_org_id());

CREATE POLICY "Allow insert on signup"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- ROLES
-- ============================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view roles"
  ON public.roles FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can manage roles"
  ON public.roles FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can update roles"
  ON public.roles FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can delete roles"
  ON public.roles FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- USER_ROLES
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view user_roles"
  ON public.user_roles FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can manage user_roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can update user_roles"
  ON public.user_roles FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can delete user_roles"
  ON public.user_roles FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- INVITATIONS
-- ============================================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invitations"
  ON public.invitations FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can update invitations"
  ON public.invitations FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org admins can delete invitations"
  ON public.invitations FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- ROOMS
-- ============================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view rooms"
  ON public.rooms FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update rooms"
  ON public.rooms FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete rooms"
  ON public.rooms FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- BEDS
-- ============================================================
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view beds"
  ON public.beds FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert beds"
  ON public.beds FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update beds"
  ON public.beds FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete beds"
  ON public.beds FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- TENANTS
-- ============================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenants"
  ON public.tenants FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Tenant users can view own record"
  ON public.tenants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members can insert tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update tenants"
  ON public.tenants FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete tenants"
  ON public.tenants FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- LEASES
-- ============================================================
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view leases"
  ON public.leases FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Tenants can view own leases"
  ON public.leases FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Org members can insert leases"
  ON public.leases FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update leases"
  ON public.leases FOR UPDATE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- INVOICES
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invoices"
  ON public.invoices FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Tenants can view own invoices"
  ON public.invoices FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Org members can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update invoices"
  ON public.invoices FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete invoices"
  ON public.invoices FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- PAYMENTS
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view payments"
  ON public.payments FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Tenants can view own payments"
  ON public.payments FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Org members can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update payments"
  ON public.payments FOR UPDATE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- EXPENSES
-- ============================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view expenses"
  ON public.expenses FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update expenses"
  ON public.expenses FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete expenses"
  ON public.expenses FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- COMPLAINTS
-- ============================================================
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view complaints"
  ON public.complaints FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Tenants can view own complaints"
  ON public.complaints FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Org members can insert complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Tenants can insert own complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "Org members can update complaints"
  ON public.complaints FOR UPDATE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- COMPLAINT COMMENTS
-- ============================================================
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible complaints"
  ON public.complaint_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = complaint_id
    AND (c.organization_id = public.get_user_org_id() OR c.tenant_id = public.get_tenant_id())
  ));

CREATE POLICY "Users can insert comments"
  ON public.complaint_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- ABSENCE REPORTS
-- ============================================================
ALTER TABLE public.absence_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view absences"
  ON public.absence_reports FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Tenants can view own absences"
  ON public.absence_reports FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenants can create own absences"
  ON public.absence_reports FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "Org members can insert absences"
  ON public.absence_reports FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update absences"
  ON public.absence_reports FOR UPDATE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- NOTICES
-- ============================================================
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view notices"
  ON public.notices FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert notices"
  ON public.notices FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update notices"
  ON public.notices FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete notices"
  ON public.notices FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- EVENTS
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view events"
  ON public.events FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert events"
  ON public.events FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update events"
  ON public.events FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete events"
  ON public.events FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- EVENT RSVPs
-- ============================================================
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view rsvps"
  ON public.event_rsvps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organization_id = public.get_user_org_id()
  ));

CREATE POLICY "Tenants can manage own rsvps"
  ON public.event_rsvps FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenants can update own rsvps"
  ON public.event_rsvps FOR UPDATE
  USING (tenant_id = public.get_tenant_id());

-- ============================================================
-- MEAL PLANS
-- ============================================================
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meal_plans"
  ON public.meal_plans FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert meal_plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update meal_plans"
  ON public.meal_plans FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete meal_plans"
  ON public.meal_plans FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- TENANT MEAL PLANS
-- ============================================================
ALTER TABLE public.tenant_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenant_meal_plans"
  ON public.tenant_meal_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.organization_id = public.get_user_org_id()
  ));

CREATE POLICY "Org members can manage tenant_meal_plans"
  ON public.tenant_meal_plans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.organization_id = public.get_user_org_id()
  ));

CREATE POLICY "Org members can update tenant_meal_plans"
  ON public.tenant_meal_plans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.organization_id = public.get_user_org_id()
  ));

-- ============================================================
-- MENUS
-- ============================================================
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view menus"
  ON public.menus FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert menus"
  ON public.menus FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update menus"
  ON public.menus FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete menus"
  ON public.menus FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- MEAL ORDERS
-- ============================================================
ALTER TABLE public.meal_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meal_orders"
  ON public.meal_orders FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Tenants can view own meal_orders"
  ON public.meal_orders FOR SELECT
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "Tenants can insert own meal_orders"
  ON public.meal_orders FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "Org members can manage meal_orders"
  ON public.meal_orders FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update meal_orders"
  ON public.meal_orders FOR UPDATE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- HOUSEKEEPING SCHEDULES
-- ============================================================
ALTER TABLE public.housekeeping_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view hk_schedules"
  ON public.housekeeping_schedules FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert hk_schedules"
  ON public.housekeeping_schedules FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update hk_schedules"
  ON public.housekeeping_schedules FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete hk_schedules"
  ON public.housekeeping_schedules FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- MAINTENANCE TICKETS
-- ============================================================
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view maintenance_tickets"
  ON public.maintenance_tickets FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert maintenance_tickets"
  ON public.maintenance_tickets FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update maintenance_tickets"
  ON public.maintenance_tickets FOR UPDATE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- INVENTORY ITEMS
-- ============================================================
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inventory"
  ON public.inventory_items FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert inventory"
  ON public.inventory_items FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update inventory"
  ON public.inventory_items FOR UPDATE
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can delete inventory"
  ON public.inventory_items FOR DELETE
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- AUDIT LOGS (read-only for users, insert via service role)
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view audit_logs"
  ON public.audit_logs FOR SELECT
  USING (organization_id = public.get_user_org_id());

-- No INSERT policy for anon/authenticated — use service_role key to insert audit logs

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());
