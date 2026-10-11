-- App Store guideline 1.2: moderators must be able to remove reported content
-- (reviews, messages) and eject the offending member within 24 hours.
drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin" on public.reviews
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "messages_delete_admin" on public.messages;
create policy "messages_delete_admin" on public.messages
  for delete to authenticated
  using (public.is_admin());
