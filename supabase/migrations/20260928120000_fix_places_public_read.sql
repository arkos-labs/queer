-- The places policy calls is_admin() for every public listing query.
-- Anonymous visitors need EXECUTE so the function can safely return false
-- rather than failing the whole places query.
grant execute on function public.is_admin() to anon, authenticated;
