-- Phase 7: notifications, the playful/plain wording setting, and the Court Status poll payload.
-- Apply with: npx supabase db push

alter table profiles
  add column if not exists playful_notifications boolean not null default true;

create or replace function set_my_notification_style(playful boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  update profiles set playful_notifications = playful where id = auth.uid();
end;
$$;

revoke all on function set_my_notification_style(boolean) from public, anon;
grant execute on function set_my_notification_style(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications store a TYPE and a few params (a name) — never sentences — so they can be
-- shown in each person's language and tone. Written only by the server.
-- ---------------------------------------------------------------------------

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  case_id uuid references cases(id) on delete cascade,
  type text not null check (type in (
    'partner_joined', 'case_filed', 'partner_testified', 'analysis_ready', 'partner_followed_up',
    'verdict_ready', 'partner_signed', 'case_closed', 'case_adjourned'
  )),
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- One notification of each type per person per case, so a retried step can't repeat it.
create unique index if not exists notifications_once
  on notifications (user_id, type, coalesce(case_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists notifications_user_recent on notifications (user_id, created_at desc);
create index if not exists notifications_user_unread on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

-- You can read only your own. No insert/update/delete policies: the server creates them and
-- marking them read goes through mark_notifications_read().
drop policy if exists notifications_read on notifications;
create policy notifications_read on notifications for select using (user_id = auth.uid());

create or replace function mark_notifications_read(ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  update notifications
    set read_at = now()
    where user_id = auth.uid() and read_at is null and (ids is null or id = any (ids));
end;
$$;

revoke all on function mark_notifications_read(uuid[]) from public, anon;
grant execute on function mark_notifications_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- court_status: everything the Court Status panel polls, in one row. Booleans, states and
-- COARSE labels only — never testimony, never an exact severity number.
-- ---------------------------------------------------------------------------

create or replace function court_status(the_case uuid)
returns table (
  stage case_stage,
  a_submitted boolean,
  b_submitted boolean,
  a_followed_up boolean,
  b_followed_up boolean,
  failed boolean,
  a_signed boolean,
  b_signed boolean,
  report_ready boolean,
  jury_state text,
  counsellor_state text,
  social_worker_state text,
  primary_issue text,
  secondary_issue text,
  conflict_type text,
  intensity_band text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.stage,
    exists (select 1 from testimonies t join couple_members m on m.user_id = t.user_id and m.couple_id = c.couple_id
            where t.case_id = c.id and m.role = 'partner_a'),
    exists (select 1 from testimonies t join couple_members m on m.user_id = t.user_id and m.couple_id = c.couple_id
            where t.case_id = c.id and m.role = 'partner_b'),
    exists (select 1 from follow_up_submissions s join couple_members m on m.user_id = s.user_id and m.couple_id = c.couple_id
            where s.case_id = c.id and m.role = 'partner_a'),
    exists (select 1 from follow_up_submissions s join couple_members m on m.user_id = s.user_id and m.couple_id = c.couple_id
            where s.case_id = c.id and m.role = 'partner_b'),
    c.last_error is not null,
    exists (select 1 from treaty_signatures s join couple_members m on m.user_id = s.user_id and m.couple_id = c.couple_id
            where s.case_id = c.id and m.role = 'partner_a'),
    exists (select 1 from treaty_signatures s join couple_members m on m.user_id = s.user_id and m.couple_id = c.couple_id
            where s.case_id = c.id and m.role = 'partner_b'),
    exists (select 1 from report_texts r where r.case_id = c.id and r.locale = 'en'),
    -- panel members: ready once assessed, working while their AI run is going, else waiting
    case when exists (select 1 from panel_assessments p where p.case_id = c.id and p.role = 'jury') then 'ready'
         when exists (select 1 from ai_runs r where r.case_id = c.id and r.stage = 'panel' and r.sub_key = 'jury' and r.status = 'running') then 'working'
         else 'waiting' end,
    case when exists (select 1 from panel_assessments p where p.case_id = c.id and p.role = 'family_counsellor') then 'ready'
         when exists (select 1 from ai_runs r where r.case_id = c.id and r.stage = 'panel' and r.sub_key = 'family_counsellor' and r.status = 'running') then 'working'
         else 'waiting' end,
    case when exists (select 1 from panel_assessments p where p.case_id = c.id and p.role = 'social_worker') then 'ready'
         when exists (select 1 from ai_runs r where r.case_id = c.id and r.stage = 'panel' and r.sub_key = 'social_worker' and r.status = 'running') then 'working'
         else 'waiting' end,
    -- coarse case profile, once the analysis exists
    case when c.stage >= 'FOLLOW_UP' then (select a.primary_issue from case_analyses a where a.case_id = c.id) end,
    case when c.stage >= 'FOLLOW_UP' then (select a.secondary_issue from case_analyses a where a.case_id = c.id) end,
    case when c.stage >= 'FOLLOW_UP' then (select a.conflict_type from case_analyses a where a.case_id = c.id) end,
    -- intensity as a band of the two severity ratings' average; never the number itself
    case when c.stage >= 'ANALYSIS' then (
      select case when avg(t.severity) < 4 then 'low'
                  when avg(t.severity) < 6 then 'moderate'
                  when avg(t.severity) < 8 then 'high'
                  else 'severe' end
      from testimonies t where t.case_id = c.id
      having count(*) = 2
    ) end
  from cases c
  where c.id = the_case and is_couple_member(c.couple_id);
$$;

revoke all on function court_status(uuid) from public, anon;
grant execute on function court_status(uuid) to authenticated;
