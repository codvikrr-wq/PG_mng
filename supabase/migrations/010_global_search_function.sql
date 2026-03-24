-- ============================================================
-- Global Search RPC Function
-- Called from the search bar with p_org_id, p_query, p_deep
-- Returns JSONB: { tenants, rooms, pgs, invoices, complaints,
--                  notices, events, maintenance }
-- ============================================================

CREATE OR REPLACE FUNCTION public.global_search(
  p_org_id UUID,
  p_query  TEXT,
  p_deep   BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenants    JSONB := '[]'::JSONB;
  v_rooms      JSONB := '[]'::JSONB;
  v_pgs        JSONB := '[]'::JSONB;
  v_invoices   JSONB := '[]'::JSONB;
  v_complaints JSONB := '[]'::JSONB;
  v_notices    JSONB := '[]'::JSONB;
  v_events     JSONB := '[]'::JSONB;
  v_maintenance JSONB := '[]'::JSONB;
  v_pattern    TEXT  := '%' || p_query || '%';
BEGIN
  -- ── Always search: Tenants ─────────────────────────────────────────────
  SELECT COALESCE(json_agg(row_to_json(t)), '[]')::JSONB
  INTO v_tenants
  FROM (
    SELECT
      ten.id,
      ten.first_name,
      ten.last_name,
      ten.status,
      r.name  AS room_name,
      pg.name AS pg_name
    FROM tenants ten
    LEFT JOIN rooms r ON r.id = ten.room_id
    LEFT JOIN pgs   pg ON pg.id = ten.pg_id
    WHERE ten.organization_id = p_org_id
      AND (
        ten.first_name ILIKE v_pattern
        OR ten.last_name  ILIKE v_pattern
        OR ten.email      ILIKE v_pattern
        OR ten.phone      ILIKE v_pattern
      )
    ORDER BY ten.first_name, ten.last_name
    LIMIT 8
  ) t;

  -- ── Always search: Rooms ───────────────────────────────────────────────
  SELECT COALESCE(json_agg(row_to_json(r)), '[]')::JSONB
  INTO v_rooms
  FROM (
    SELECT
      rm.id,
      rm.name,
      rm.room_type,
      pg.name AS pg_name
    FROM rooms rm
    LEFT JOIN pgs pg ON pg.id = rm.pg_id
    WHERE rm.organization_id = p_org_id
      AND rm.name ILIKE v_pattern
    ORDER BY rm.name
    LIMIT 8
  ) r;

  -- ── Always search: PGs ────────────────────────────────────────────────
  SELECT COALESCE(json_agg(row_to_json(p)), '[]')::JSONB
  INTO v_pgs
  FROM (
    SELECT id, name
    FROM pgs
    WHERE organization_id = p_org_id
      AND name ILIKE v_pattern
    ORDER BY name
    LIMIT 5
  ) p;

  -- ── Deep search only ─────────────────────────────────────────────────
  IF p_deep THEN

    -- Invoices
    SELECT COALESCE(json_agg(row_to_json(i)), '[]')::JSONB
    INTO v_invoices
    FROM (
      SELECT
        inv.id,
        inv.invoice_number,
        inv.status,
        inv.total_amount,
        (ten.first_name || ' ' || ten.last_name) AS tenant_name
      FROM invoices inv
      LEFT JOIN tenants ten ON ten.id = inv.tenant_id
      WHERE inv.organization_id = p_org_id
        AND (
          inv.invoice_number ILIKE v_pattern
          OR (ten.first_name || ' ' || ten.last_name) ILIKE v_pattern
        )
      ORDER BY inv.created_at DESC
      LIMIT 8
    ) i;

    -- Complaints
    SELECT COALESCE(json_agg(row_to_json(c)), '[]')::JSONB
    INTO v_complaints
    FROM (
      SELECT
        c.id,
        c.title,
        c.status,
        c.category,
        (ten.first_name || ' ' || ten.last_name) AS tenant_name
      FROM complaints c
      LEFT JOIN tenants ten ON ten.id = c.tenant_id
      WHERE c.organization_id = p_org_id
        AND (
          c.title       ILIKE v_pattern
          OR c.category ILIKE v_pattern
        )
      ORDER BY c.created_at DESC
      LIMIT 8
    ) c;

    -- Notices
    SELECT COALESCE(json_agg(row_to_json(n)), '[]')::JSONB
    INTO v_notices
    FROM (
      SELECT id, title, type, pinned
      FROM notices
      WHERE organization_id = p_org_id
        AND (title ILIKE v_pattern OR body ILIKE v_pattern)
      ORDER BY pinned DESC, created_at DESC
      LIMIT 8
    ) n;

    -- Events
    SELECT COALESCE(json_agg(row_to_json(e)), '[]')::JSONB
    INTO v_events
    FROM (
      SELECT id, title, starts_at, status
      FROM events
      WHERE organization_id = p_org_id
        AND (title ILIKE v_pattern OR description ILIKE v_pattern)
      ORDER BY starts_at DESC
      LIMIT 8
    ) e;

    -- Maintenance tickets
    SELECT COALESCE(json_agg(row_to_json(m)), '[]')::JSONB
    INTO v_maintenance
    FROM (
      SELECT id, title, status, priority
      FROM maintenance_tickets
      WHERE organization_id = p_org_id
        AND (title ILIKE v_pattern OR description ILIKE v_pattern)
      ORDER BY created_at DESC
      LIMIT 8
    ) m;

  END IF;

  RETURN jsonb_build_object(
    'tenants',     v_tenants,
    'rooms',       v_rooms,
    'pgs',         v_pgs,
    'invoices',    v_invoices,
    'complaints',  v_complaints,
    'notices',     v_notices,
    'events',      v_events,
    'maintenance', v_maintenance
  );
END;
$$;

-- Grant to authenticated users (and anon for the GRANT in 009)
GRANT EXECUTE ON FUNCTION public.global_search(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(UUID, TEXT, BOOLEAN) TO anon;
