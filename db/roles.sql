-- Run ONCE per Postgres server, as a superuser (roles are server-wide, not per database).
-- These are the roles PostgREST switches into for each request, named as on Supabase so the
-- migrations' grants work unchanged. None of them can log in.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;
