alter table public.profiles
  add column if not exists linkedin_url text,
  add column if not exists external_reviews_url text;

alter table public.profiles
  drop constraint if exists profiles_linkedin_url_valid,
  add constraint profiles_linkedin_url_valid check (
    linkedin_url is null or (
      length(linkedin_url) <= 500
      and linkedin_url ~* '^https://([a-z0-9-]+\.)*linkedin\.com/'
    )
  ),
  drop constraint if exists profiles_external_reviews_url_valid,
  add constraint profiles_external_reviews_url_valid check (
    external_reviews_url is null or (
      length(external_reviews_url) <= 500
      and external_reviews_url ~* '^https://'
    )
  );
