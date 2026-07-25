/*
# Queer Service — track who last proposed a price on a payment

Vinted-style negotiation: a client requests a price, the provider can
accept it, counter with a different price, or refuse. `proposed_by`
records who made the last offer on a `payments` row, so the UI knows
whose turn it is to respond (only the person who *didn't* make the last
offer can accept/counter/refuse it — see stripe-request-payment and
stripe-counter-payment).

Backfilled to the original requester (`payer_id`) for any existing rows,
since every payment starts life as a request from the client.
*/

alter table public.payments add column if not exists proposed_by uuid references public.profiles(id) on delete cascade;
update public.payments set proposed_by = payer_id where proposed_by is null;
alter table public.payments alter column proposed_by set not null;

create index if not exists payments_proposed_by_idx on public.payments (proposed_by);
