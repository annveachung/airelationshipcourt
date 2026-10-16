-- Self-hosted Postgres: the pieces Supabase used to provide, so every later migration (and the
-- app's Row Level Security) works unchanged.
--   * roles anon / authenticated / service_role  -> created once per server by db/roles.sql
--   * auth.users + auth.uid()                     -> here
--   * the "extensions" schema with pgcrypto       -> here
--   * Supabase's default grants                   -> here
-- PostgREST switches to the role named in each request's JWT and puts its claims in
-- request.jwt.claims, which is where auth.uid() reads the signed-in user's id from.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;

-- What Supabase grants by default: every role may use the schemas, and table access is
-- decided by Row Level Security (every table enables it). Functions are revoked per migration.
grant usage on schema public, extensions, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Sign-in: called by the app's server (as service_role) after Google confirms who someone is.
-- Matches by email, so people who signed up on Supabase keep their id. A new row fires the
-- on_auth_user_created trigger (first migration), which creates their profile.
-- ---------------------------------------------------------------------------

create or replace function public.sign_in_user(user_email text, meta jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  the_id uuid;
begin
  insert into auth.users (email, raw_user_meta_data, last_sign_in_at)
  values (lower(user_email), coalesce(meta, '{}'::jsonb), now())
  on conflict (email) do update
    set raw_user_meta_data = auth.users.raw_user_meta_data || excluded.raw_user_meta_data,
        last_sign_in_at = now()
  returning id into the_id;
  return the_id;
end;
$$;

revoke all on function public.sign_in_user(text, jsonb) from public, anon, authenticated;
grant execute on function public.sign_in_user(text, jsonb) to service_role;
