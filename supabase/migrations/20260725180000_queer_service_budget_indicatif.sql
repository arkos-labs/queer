/*
# Queer Service — indicative budget for members seeking a service

Symmetric to `indicative_rates` (what a provider charges): lets someone
looking for a service state roughly what they're willing to pay, so
providers can tell at a glance whether their pricing is a match before
reaching out.
*/

alter table public.profiles add column if not exists budget_indicatif text;
