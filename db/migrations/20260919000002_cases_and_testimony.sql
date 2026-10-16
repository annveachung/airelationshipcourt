-- Phase 3: cases and private testimony.
-- Paste into Supabase -> SQL Editor -> Run. Run 0001 first.

-- ---------------------------------------------------------------------------
-- Case stages. Declared in lifecycle order, so `stage >= 'VERDICT'` works in
-- policies (Postgres compares enums by declaration order).
-- ---------------------------------------------------------------------------

do $$ begin
  create type case_stage as enum (
    'CASE_OPEN', 'TESTIMONY', 'ANALYSIS', 'FOLLOW_UP', 'PANEL_JUDGEMENT',
    'VERDICT', 'RECOMMENDATIONS', 'REPORT', 'CLOSED'
  );
exception when duplicate_object then null; end $$;

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  created_by uuid not null references profiles(id),
  title text not null check (char_length(title) between 1 and 120),
  context text check (char_length(context) <= 500),
  stage case_stage not null default 'TESTIMONY',
  stage_entered_at timestamptz not null default now(),
  last_error text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cases_couple_created_idx on cases (couple_id, created_at desc);

-- One open case per couple: the database refuses a second one.
create unique index if not exists cases_one_open_per_couple
  on cases (couple_id) where stage <> 'CLOSED';

create table if not exists testimonies (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  what_happened text not null check (char_length(what_happened) between 1 and 2000),
  emotions text[] not null check (cardinality(emotions) >= 1),
  emotions_note text check (char_length(emotions_note) <= 500),
  what_caused_it text not null check (char_length(what_caused_it) between 1 and 2000),
  severity smallint not null check (severity between 1 and 10),
  wanted_instead text not null check (char_length(wanted_instead) between 1 and 2000),
  partner_did_wrong text not null check (char_length(partner_did_wrong) between 1 and 2000),
  submitted_at timestamptz not null default now(),
  unique (case_id, user_id)   -- one testimony per partner per case
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table cases enable row level security;
alter table testimonies enable row level security;

-- Cases: couple members can read. No insert/update/delete policies:
-- creation goes through create_case(), stage changes through server code.
drop policy if exists cases_read on cases;
create policy cases_read on cases for select using (is_couple_member(couple_id));

-- Testimony: you can always read your own. Your partner's is hidden until the
-- case reaches VERDICT.
drop policy if exists testimonies_read on testimonies;
create policy testimonies_read on testimonies for select using (
  user_id = auth.uid()
  or exists (
    select 1 from cases c
    where c.id = testimonies.case_id
      and is_couple_member(c.couple_id)
      and c.stage >= 'VERDICT'
  )
);

-- You can only write your own testimony, only while the case is in TESTIMONY.
-- There is deliberately no update or delete policy: testimony is final.
drop policy if exists testimonies_insert on testimonies;
create policy testimonies_insert on testimonies for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from cases c
    where c.id = testimonies.case_id
      and c.stage = 'TESTIMONY'
      and is_couple_member(c.couple_id)
  )
);

-- ---------------------------------------------------------------------------
-- Write and read helpers
-- ---------------------------------------------------------------------------

-- Files a new case for the caller's (active) couple.
create or replace function create_case(case_title text, case_context text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  the_couple uuid;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select c.id into the_couple
  from couples c
  join couple_members m on m.couple_id = c.id
  where m.user_id = auth.uid() and c.status = 'active';

  if the_couple is null then
    raise exception 'no_active_couple';
  end if;

  begin
    insert into cases (couple_id, created_by, title, context)
    values (the_couple, auth.uid(), trim(case_title), nullif(trim(case_context), ''))
    returning id into new_id;
  exception when unique_violation then
    raise exception 'case_already_open';
  end;

  return new_id;
end;
$$;

-- Who has testified? Returns only the stage and two booleans, never any testimony,
-- so the waiting screen can poll it safely. Returns nothing for non-members.
create or replace function case_submission_status(the_case uuid)
returns table (stage case_stage, a_submitted boolean, b_submitted boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.stage,
    exists (
      select 1 from testimonies t
      join couple_members m on m.user_id = t.user_id and m.couple_id = c.couple_id
      where t.case_id = c.id and m.role = 'partner_a'
    ),
    exists (
      select 1 from testimonies t
      join couple_members m on m.user_id = t.user_id and m.couple_id = c.couple_id
      where t.case_id = c.id and m.role = 'partner_b'
    )
  from cases c
  where c.id = the_case and is_couple_member(c.couple_id);
$$;

revoke all on function create_case(text, text) from public, anon;
revoke all on function case_submission_status(uuid) from public, anon;
grant execute on function create_case(text, text) to authenticated;
grant execute on function case_submission_status(uuid) to authenticated;
