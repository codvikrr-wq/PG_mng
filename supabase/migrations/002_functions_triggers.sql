-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- 1. Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_pgs_updated BEFORE UPDATE ON public.pgs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_leases_updated BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_complaints_updated BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_maintenance_updated BEFORE UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. Auto-create user record on auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. Auto-create default roles when org is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_org_default_roles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.roles (organization_id, name, is_system_role, permissions) VALUES
    (NEW.id, 'Org Admin', true, '{
      "organization": ["view", "create", "edit", "delete"],
      "pgs": ["view", "create", "edit", "delete"],
      "rooms": ["view", "create", "edit", "delete"],
      "tenants": ["view", "create", "edit", "delete"],
      "finance": ["view", "create", "edit", "delete"],
      "complaints": ["view", "create", "edit", "delete"],
      "absences": ["view", "create", "edit", "delete"],
      "notices": ["view", "create", "edit", "delete"],
      "events": ["view", "create", "edit", "delete"],
      "food": ["view", "create", "edit", "delete"],
      "housekeeping": ["view", "create", "edit", "delete"],
      "analytics": ["view", "create", "edit", "delete"],
      "settings": ["view", "create", "edit", "delete"],
      "audit": ["view"]
    }'),
    (NEW.id, 'PG Manager', true, '{
      "pgs": ["view", "edit"],
      "rooms": ["view", "create", "edit", "delete"],
      "tenants": ["view", "create", "edit", "delete"],
      "finance": ["view", "create", "edit"],
      "complaints": ["view", "create", "edit"],
      "absences": ["view", "edit"],
      "notices": ["view", "create", "edit", "delete"],
      "events": ["view", "create", "edit", "delete"],
      "food": ["view", "create", "edit", "delete"],
      "housekeeping": ["view", "create", "edit", "delete"],
      "analytics": ["view"],
      "settings": ["view"]
    }'),
    (NEW.id, 'Frontdesk', true, '{
      "pgs": ["view"],
      "rooms": ["view"],
      "tenants": ["view", "create", "edit"],
      "finance": ["view", "create"],
      "complaints": ["view", "create", "edit"],
      "absences": ["view"],
      "notices": ["view"],
      "events": ["view"]
    }'),
    (NEW.id, 'Finance', true, '{
      "pgs": ["view"],
      "rooms": ["view"],
      "tenants": ["view"],
      "finance": ["view", "create", "edit", "delete"],
      "analytics": ["view"]
    }'),
    (NEW.id, 'Housekeeping', true, '{
      "pgs": ["view"],
      "rooms": ["view"],
      "housekeeping": ["view", "create", "edit"]
    }'),
    (NEW.id, 'Tenant', true, '{
      "complaints": ["view", "create"],
      "absences": ["view", "create"],
      "notices": ["view"],
      "events": ["view"],
      "food": ["view"]
    }'),
    (NEW.id, 'Support', true, '{
      "tenants": ["view"],
      "complaints": ["view", "create", "edit"],
      "absences": ["view", "edit"],
      "notices": ["view"]
    }');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_org_default_roles();

-- ============================================================
-- 4. Auto-generate invoice number
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE organization_id = NEW.organization_id;

  NEW.invoice_number := 'INV-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION public.generate_invoice_number();

-- ============================================================
-- 5. Helper: get current user's organization_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 6. Helper: check if user is a tenant
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_tenant_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'Tenant'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 7. Helper: get tenant_id for current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
