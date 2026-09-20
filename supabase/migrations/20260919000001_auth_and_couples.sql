-- Phase 2: profiles, couples, membership, invites.
-- Paste into Supabase -> SQL Editor -> Run. Safe to read top to bottom.

-- ---------------------------------------------------------------------------
-- Types and tables
-- ---------------------------------------------------------------------------

do $$ begin
  create type partner_role as enum ('partner_a', 'partner_b');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now()
);

create table if not exists couple_members (
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role partner_role not null,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (couple_id, role),   -- caps a couple at exactly two people
  unique (user_id)            -- one couple per user
);

create table if not exists couple_invites (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profile is created automatically when someone signs up
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper used by security policies (definer avoids policy self-recursion)
-- ---------------------------------------------------------------------------

create or replace function is_couple_member(c uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from couple_members
    where couple_id = c and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table couples enable row level security;
alter table couple_members enable row level security;
alter table couple_invites enable row level security;  -- no policies: invisible to clients

drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from couple_members me
    join couple_members them on them.couple_id = me.couple_id
    where me.user_id = auth.uid() and them.user_id = profiles.id
  )
);

drop policy if exists couples_read on couples;
create policy couples_read on couples for select using (is_couple_member(id));

drop policy if exists couple_members_read on couple_members;
create policy couple_members_read on couple_members for select using (is_couple_member(couple_id));

-- No insert/update/delete policies on couples or couple_members:
-- all writes go through the functions below.

-- ---------------------------------------------------------------------------
-- Write paths (each one does its own checks)
-- ---------------------------------------------------------------------------

-- Creates a couple with the caller as partner_a. Returns the couple id.
create or replace function create_couple()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if exists (select 1 from couple_members where user_id = auth.uid()) then
    raise exception 'already_in_couple';
  end if;

  insert into couples (created_by) values (auth.uid()) returning id into new_id;
  insert into couple_members (couple_id, user_id, role)
    values (new_id, auth.uid(), 'partner_a');
  return new_id;
end;
$$;

-- Creates a fresh single-use invite for the caller's pending couple.
create or replace function create_invite()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  the_couple uuid;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select c.id into the_couple
  from couples c
  join couple_members m on m.couple_id = c.id
  where m.user_id = auth.uid() and m.role = 'partner_a' and c.status = 'pending';

  if the_couple is null then
    raise exception 'no_pending_couple';
  end if;

  -- 16 random bytes -> 22-character base64url string
  new_code := translate(rtrim(encode(gen_random_bytes(16), 'base64'), '='), '+/', '-_');

  insert into couple_invites (couple_id, code, created_by)
    values (the_couple, new_code, auth.uid());
  return new_code;
end;
$$;

-- Returns the caller's still-usable invite code (if any) so the link can be shown again.
create or replace function my_open_invite()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select i.code
  from couple_invites i
  where i.created_by = auth.uid()
    and i.accepted_at is null
    and i.expires_at > now()
  order by i.created_at desc
  limit 1;
$$;

-- Returns who is inviting (name only) so the join page can say "Join X's court?"
-- Does not consume the invite. Returns no rows for bad / used / expired codes.
create or replace function invite_preview(invite_code text)
returns table (inviter_name text)
language sql
security definer
stable
set search_path = public
as $$
  select p.display_name
  from couple_invites i
  join profiles p on p.id = i.created_by
  where i.code = invite_code
    and i.accepted_at is null
    and i.expires_at > now();
$$;

-- Redeems an invite: the caller becomes partner_b.
create or replace function accept_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv couple_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select * into inv from couple_invites where code = invite_code for update;

  if not found then
    raise exception 'invite_invalid';
  end if;
  if inv.accepted_at is not null then
    raise exception 'invite_used';
  end if;
  if inv.expires_at <= now() then
    raise exception 'invite_expired';
  end if;
  if inv.created_by = auth.uid() then
    raise exception 'invite_own';
  end if;
  if exists (select 1 from couple_members where user_id = auth.uid()) then
    raise exception 'already_in_couple';
  end if;

  -- unique (couple_id, role) makes a race for the second seat fail cleanly
  insert into couple_members (couple_id, user_id, role)
    values (inv.couple_id, auth.uid(), 'partner_b');

  update couple_invites
    set accepted_at = now(), accepted_by = auth.uid()
    where id = inv.id;
  update couples set status = 'active' where id = inv.couple_id;

  return inv.couple_id;
end;
$$;

-- Only signed-in users may call these.
revoke all on function create_couple() from public, anon;
revoke all on function create_invite() from public, anon;
revoke all on function my_open_invite() from public, anon;
revoke all on function invite_preview(text) from public, anon;
revoke all on function accept_invite(text) from public, anon;
grant execute on function create_couple() to authenticated;
grant execute on function create_invite() to authenticated;
grant execute on function my_open_invite() to authenticated;
grant execute on function invite_preview(text) to authenticated;
grant execute on function accept_invite(text) to authenticated;
