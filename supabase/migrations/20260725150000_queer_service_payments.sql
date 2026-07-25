/*
# Queer Service — Paiements en ligne (Stripe Connect)

1. Purpose
Lets a client pay a provider directly through the app for a requested
service (e.g. "monter un meuble"), on top of the existing free messaging
flow. Money must reach the provider's own bank account, not sit in Queer
Service's — this is a Stripe Connect (Express accounts) integration:
Stripe itself handles the provider's identity verification (KYC) and
payouts, Queer Service never touches card numbers or holds client funds.

2. New columns on `profiles`
- `stripe_account_id` — the member's Stripe Connect Express account, once
  they've started onboarding as a paid provider.
- `stripe_charges_enabled` / `stripe_payouts_enabled` — mirrors Stripe's
  own account flags (synced via the `account.updated` webhook). A client
  can only request a paid service from a profile with charges enabled.

3. New table: `public.payments`
- One row per payment attempt on a `connections` thread. Deliberately a
  separate table (not extra columns on `connections`) so it can be
  locked down independently: authenticated users may only ever SELECT
  their own payments, every write happens through Supabase Edge
  Functions using the service-role key (talking to the Stripe API),
  never directly from the client. This is what stops a participant from
  forging `status = 'captured'` on their own row.
- `status` mirrors a simplified Stripe PaymentIntent lifecycle: pending
  (created, awaiting confirmation) → authorized (manual-capture hold
  placed on the card) → captured (funds actually transferred) /
  canceled / failed / refunded.
- `platform_fee_amount` is Queer Service's commission, taken via Stripe
  Connect's `application_fee_amount` on a destination charge — the
  provider is paid `amount - platform_fee_amount` directly by Stripe.

4. Security (RLS)
- `payments`: select only for payer, payee, or admin. No insert/update/
  delete policies for `authenticated` at all — every write is performed
  by Edge Functions using the service-role key, which bypasses RLS by
  design. This is intentional: payment state must only ever change as a
  result of a real Stripe API call, never a direct table write from the
  client.
- `profiles`: the three new Stripe columns are covered by the existing
  `profiles_update_own_or_admin` policy — but Edge Functions still write
  them with the service-role key so a compromised client can't self-
  report `stripe_charges_enabled = true` without Stripe ever confirming
  it. (Column-level protection is left for a later hardening pass if a
  need to trust client writes to unrelated profile fields arises.)

5. Notes
- All amounts are integers in the smallest currency unit (cents for EUR),
  matching Stripe's own convention — avoids float rounding bugs.
- `stripe_payment_intent_id` is unique so the webhook can upsert safely
  even under redelivery.
*/

alter table public.profiles add column if not exists stripe_account_id text;
alter table public.profiles add column if not exists stripe_charges_enabled boolean not null default false;
alter table public.profiles add column if not exists stripe_payouts_enabled boolean not null default false;

create index if not exists profiles_stripe_account_id_idx on public.profiles (stripe_account_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  payee_id uuid not null references public.profiles(id) on delete cascade,
  description text,
  amount integer not null check (amount > 0),
  currency text not null default 'eur',
  platform_fee_amount integer not null default 0 check (platform_fee_amount >= 0),
  stripe_payment_intent_id text unique,
  status text not null default 'pending' check (status in ('pending','authorized','captured','canceled','failed','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "payments_select_participants_or_admin" on public.payments;
create policy "payments_select_participants_or_admin"
  on public.payments for select
  to authenticated using (
    payer_id = auth.uid() or payee_id = auth.uid() or public.is_admin()
  );

-- Deliberately no insert/update/delete policy for `authenticated`: all
-- writes happen server-side (Edge Functions, service-role key) after a
-- real Stripe API call. See migration header for rationale.

create index if not exists payments_connection_id_idx on public.payments (connection_id);
create index if not exists payments_payer_id_idx on public.payments (payer_id);
create index if not exists payments_payee_id_idx on public.payments (payee_id);
create index if not exists payments_status_idx on public.payments (status);
