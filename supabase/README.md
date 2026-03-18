# Supabase Database Setup

Run these SQL migrations **in order** in your Supabase SQL Editor:
**Dashboard > SQL Editor > New Query**

## Migration Order

1. `001_schema.sql` — All 28 tables with indexes
2. `002_functions_triggers.sql` — Helper functions, auto-triggers (updated_at, new user, org defaults, invoice numbers)
3. `003_rls_policies.sql` — Row Level Security on every table
4. `004_storage_realtime.sql` — Storage buckets, storage RLS, and Realtime subscriptions

## Important Notes

- Run each file as a single query (copy-paste the entire file content)
- Run them in order — later files depend on earlier ones
- If a migration fails partway, you may need to drop and re-run (the schema is idempotent where possible)
- The `handle_new_user` trigger auto-creates a `public.users` row when someone signs up via Supabase Auth
- The `create_org_default_roles` trigger auto-creates 7 system roles when an org is created
