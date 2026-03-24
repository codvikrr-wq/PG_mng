-- ============================================================
-- Fix avatars bucket: SVG support + org-scoped logo uploads
-- ============================================================

-- 1. Allow SVG uploads in avatars bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'
]
WHERE id = 'avatars';

-- 2. Fix UPDATE policy: allow users to update files in their own folder
--    OR files in their organization's folder (for org logos & admin-managed user photos)
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.get_user_org_id()::text = (storage.foldername(name))[1]
    )
  );

-- 3. Fix DELETE policy: same expanded condition
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.get_user_org_id()::text = (storage.foldername(name))[1]
    )
  );
