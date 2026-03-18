-- ============================================================
-- STORAGE BUCKETS
-- Run in SQL Editor or create manually in Supabase Dashboard
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('id-documents', 'id-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('complaint-attachments', 'complaint-attachments', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('lease-documents', 'lease-documents', false, 20971520, ARRAY['application/pdf']),
  ('expense-receipts', 'expense-receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- Avatars: public read, authenticated upload own
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Private buckets: authenticated users in same org can access
-- Pattern: files stored as {org_id}/{filename}
CREATE POLICY "Org members can view private files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('id-documents', 'receipts', 'complaint-attachments', 'lease-documents', 'expense-receipts')
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Org members can upload private files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('id-documents', 'receipts', 'complaint-attachments', 'lease-documents', 'expense-receipts')
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Org members can delete private files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('id-documents', 'receipts', 'complaint-attachments', 'lease-documents', 'expense-receipts')
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

-- ============================================================
-- ENABLE REALTIME on key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tickets;
