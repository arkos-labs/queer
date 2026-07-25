/*
# Queer Service — Places: close the trigger-function RPC surface

1. Purpose
`moderate_place_submission()`, `moderate_place_review_submission()` and
`text_contains_blocked_keyword()` are trigger-only helpers with no
legitimate direct-call use case. Supabase grants EXECUTE on newly
created public-schema functions to `anon`/`authenticated`/`service_role`
by default, which exposes them at `/rest/v1/rpc/<fn>` — closed here the
same way the earlier `is_admin()` hardening did.

2. Notes
- Revoking EXECUTE does not affect the `before insert` triggers: trigger
  functions fire as part of the DML statement itself, not via a role's
  direct RPC call, so no grant is required for them to keep working.
- `text_contains_blocked_keyword()` in particular must not be directly
  callable: letting a client call it as an oracle would let someone
  probe the `blocked_keywords` list they otherwise can't read.
*/

revoke execute on function public.moderate_place_submission() from anon, authenticated;
revoke execute on function public.moderate_place_review_submission() from anon, authenticated;
revoke execute on function public.text_contains_blocked_keyword(text) from anon, authenticated;
