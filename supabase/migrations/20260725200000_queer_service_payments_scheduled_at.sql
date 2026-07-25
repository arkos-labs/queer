/*
# Queer Service — scheduled date/time for a paid service

Lets the client specify when the prestation should happen (date + time
slot) as part of the price request, before any card is ever involved.
Nullable: existing/free-text-only requests aren't affected.
*/

alter table public.payments add column if not exists scheduled_at timestamptz;
