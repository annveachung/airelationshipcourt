-- Phase 6: the AI-written case report, the Peace Treaty signatures, and how a case closed.
-- Apply with: npx supabase db push

alter type ai_stage add value if not exists 'report';

-- The written report, one row per language (English first, then translations).
create table if not exists report_texts (
  case_id uuid not null references cases(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh-Hant')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (case_id, locale)
);

-- Who signed the Peace Treaty and which clauses they ticked.
create table if not exists treaty_signatures (
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  clauses text[] not null check ('accept_verdict' = any (clauses)),
  signed_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

alter table cases
  add column if not exists closed_reason text check (closed_reason in ('treaty', 'adjourned'));

alter table report_texts enable row level security;
alter table treaty_signatures enable row level security;

drop policy if exists report_texts_read on report_texts;
create policy report_texts_read on report_texts for select using (
  exists (select 1 from cases c where c.id = report_texts.case_id
          and is_couple_member(c.couple_id) and c.stage >= 'VERDICT')
);

drop policy if exists treaty_signatures_read on treaty_signatures;
create policy treaty_signatures_read on treaty_signatures for select using (
  exists (select 1 from cases c where c.id = treaty_signatures.case_id
          and is_couple_member(c.couple_id) and c.stage >= 'REPORT')
);

-- No client insert/update/delete policies: signing goes through sign_treaty().

create or replace function sign_treaty(the_case uuid, agreed jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_couple uuid;
  the_stage case_stage;
  ids text[];
  known text[] := array['accept_verdict', 'hug', 'snacks', 'old_grudges', 'personal_1', 'personal_2', 'personal_3'];
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select couple_id, stage into the_couple, the_stage from cases where id = the_case;
  if the_couple is null or not is_couple_member(the_couple) or the_stage <> 'REPORT' then
    raise exception 'not_allowed';
  end if;

  if jsonb_typeof(agreed) <> 'array' then
    raise exception 'invalid';
  end if;
  select coalesce(array_agg(distinct v), '{}') into ids from jsonb_array_elements_text(agreed) as v;
  if not (ids <@ known) or not ('accept_verdict' = any (ids)) then
    raise exception 'invalid';
  end if;

  begin
    insert into treaty_signatures (case_id, user_id, clauses) values (the_case, auth.uid(), ids);
  exception when unique_violation then
    raise exception 'already_signed';
  end;
end;
$$;

revoke all on function sign_treaty(uuid, jsonb) from public, anon;
grant execute on function sign_treaty(uuid, jsonb) to authenticated;

-- The status endpoint's function now also reports signing progress and report readiness.
-- Still booleans only — never any content.
drop function if exists case_submission_status(uuid);

create function case_submission_status(the_case uuid)
returns table (
  stage case_stage,
  a_submitted boolean,
  b_submitted boolean,
  a_followed_up boolean,
  b_followed_up boolean,
  failed boolean,
  a_signed boolean,
  b_signed boolean,
  report_ready boolean
)
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
    ),
    exists (
      select 1 from follow_up_submissions s
      join couple_members m on m.user_id = s.user_id and m.couple_id = c.couple_id
      where s.case_id = c.id and m.role = 'partner_a'
    ),
    exists (
      select 1 from follow_up_submissions s
      join couple_members m on m.user_id = s.user_id and m.couple_id = c.couple_id
      where s.case_id = c.id and m.role = 'partner_b'
    ),
    c.last_error is not null,
    exists (
      select 1 from treaty_signatures s
      join couple_members m on m.user_id = s.user_id and m.couple_id = c.couple_id
      where s.case_id = c.id and m.role = 'partner_a'
    ),
    exists (
      select 1 from treaty_signatures s
      join couple_members m on m.user_id = s.user_id and m.couple_id = c.couple_id
      where s.case_id = c.id and m.role = 'partner_b'
    ),
    exists (select 1 from report_texts r where r.case_id = c.id and r.locale = 'en')
  from cases c
  where c.id = the_case and is_couple_member(c.couple_id);
$$;

revoke all on function case_submission_status(uuid) from public, anon;
grant execute on function case_submission_status(uuid) to authenticated;
