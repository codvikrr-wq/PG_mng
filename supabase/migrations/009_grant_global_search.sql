-- Grant execute on global_search RPC to authenticated users
GRANT EXECUTE ON FUNCTION public.global_search(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(uuid, text, boolean) TO anon;
