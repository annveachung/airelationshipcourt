-- Phase 4: AI analysis, follow-up questions and answers.
-- Apply with: npx supabase db push

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type ai_stage as enum ('analysis', 'follow_up_questions', 'panel', 'synthesis');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_status as enum ('running', 'succeeded', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_format as enum ('multiple_choice', 'true_false_unsure', 'rating_1_10', 'short_answer');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- ai_runs: the lock, the audit log and the retry gate for every AI call.
-- Server-only (no policies).
-- ---------------------------------------------------------------------------

create table if not exists ai_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  stage ai_stage not null,
  sub_key text not null default '',
  attempt smallint not null default 1,
  status ai_status not null default 'running',
  model text,
  raw_output text,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Inserting a 'running' row IS the lock. A 'succeeded' row blocks re-running for good;
-- a 'failed' row drops out of the index, so a retry can claim the slot again.
create unique index if not exists ai_runs_claim
  on ai_runs (case_id, stage, sub_key) where status <> 'failed';

alter table ai_runs enable row level security;

-- ---------------------------------------------------------------------------
-- case_analyses (one per case)
-- ---------------------------------------------------------------------------

create table if not exists case_analyses (
  case_id uuid primary key references cases(id) on delete cascade,
  topics jsonb not null,
  emotions jsonb not null,
  discrepancies jsonb not null,
  expectations jsonb not null,
  potential_causes jsonb not null,
  conflict_patterns jsonb not null,
  follow_up_topics jsonb not null,
  primary_issue text not null,
  secondary_issue text not null,
  conflict_type text not null,
  created_at timestamptz not null default now()
);

alter table case_analyses enable row level security;

drop policy if exists case_analyses_read on case_analyses;
create policy case_analyses_read on case_analyses for select using (
  exists (
    select 1 from cases c
    where c.id = case_analyses.case_id
      and is_couple_member(c.couple_id)
      and c.stage >= 'VERDICT'
  )
);

-- ---------------------------------------------------------------------------
-- Follow-up questions (written by the server) and answers (written only by
-- submit_follow_up below). One round only, enforced by CHECK (round = 1).
-- ---------------------------------------------------------------------------

create table if not exists follow_up_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  round smallint not null default 1 check (round = 1),
  position smallint not null check (position between 1 and 5),
  question_text text not null,
  format question_format not null,
  options jsonb,
  topic text,
  unique (case_id, user_id, round, position)
);

create table if not exists follow_up_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references follow_up_questions(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  answer_text text check (char_length(answer_text) <= 500),
  answer_choice text check (char_length(answer_choice) <= 100),
  answer_rating smallint check (answer_rating between 1 and 10),
  check (num_nonnulls(answer_text, answer_choice, answer_rating) = 1)
);

create table if not exists follow_up_submissions (
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  round smallint not null default 1 check (round = 1),
  submitted_at timestamptz not null default now(),
  primary key (case_id, user_id, round)
);

alter table follow_up_questions enable row level security;
alter table follow_up_answers enable row level security;
alter table follow_up_submissions enable row level security;

-- Your own questions and answers always; your partner's only from VERDICT.
drop policy if exists follow_up_questions_read on follow_up_questions;
create policy follow_up_questions_read on follow_up_questions for select using (
  user_id = auth.uid()
  or exists (
    select 1 from cases c
    where c.id = follow_up_questions.case_id
      and is_couple_member(c.couple_id)
      and c.stage >= 'VERDICT'
  )
);

drop policy if exists follow_up_answers_read on follow_up_answers;
create policy follow_up_answers_read on follow_up_answers for select using (
  user_id = auth.uid()
  or exists (
    select 1 from cases c
    where c.id = follow_up_answers.case_id
      and is_couple_member(c.couple_id)
      and c.stage >= 'VERDICT'
  )
);

-- "Has my partner answered?" is fine to show (a timestamp, never the answers).
drop policy if exists follow_up_submissions_read on follow_up_submissions;
create policy follow_up_submissions_read on follow_up_submissions for select using (
  exists (
    select 1 from cases c
    where c.id = follow_up_submissions.case_id and is_couple_member(c.couple_id)
  )
);

-- No insert/update/delete policies anywhere above: questions are written by the
-- server, answers and submissions only by submit_follow_up().

-- ---------------------------------------------------------------------------
-- submit_follow_up: one transaction, one submission, one answer per question.
-- answers = [{ "question_id": "...", "answer_text"|"answer_choice"|"answer_rating": ... }, ...]
-- ---------------------------------------------------------------------------

create or replace function submit_follow_up(the_case uuid, answers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_couple uuid;
  the_stage case_stage;
  my_questions int;
  item jsonb;
  inserted int;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select couple_id, stage into the_couple, the_stage from cases where id = the_case;
  if the_couple is null or not is_couple_member(the_couple) then
    raise exception 'not_allowed';
  end if;
  if the_stage <> 'FOLLOW_UP' then
    raise exception 'not_allowed';
  end if;

  select count(*) into my_questions
  from follow_up_questions where case_id = the_case and user_id = auth.uid();
  if my_questions = 0 or jsonb_typeof(answers) <> 'array'
     or jsonb_array_length(answers) <> my_questions then
    raise exception 'invalid';
  end if;

  -- The submission row is the commit marker: a second attempt hits the primary key.
  begin
    insert into follow_up_submissions (case_id, user_id) values (the_case, auth.uid());
  exception when unique_violation then
    raise exception 'already_answered';
  end;

  for item in select * from jsonb_array_elements(answers) loop
    insert into follow_up_answers
      (question_id, case_id, user_id, answer_text, answer_choice, answer_rating)
    select q.id, the_case, auth.uid(),
           item->>'answer_text', item->>'answer_choice', (item->>'answer_rating')::smallint
    from follow_up_questions q
    where q.id = (item->>'question_id')::uuid
      and q.case_id = the_case
      and q.user_id = auth.uid();
    get diagnostics inserted = row_count;
    if inserted <> 1 then
      raise exception 'invalid';
    end if;
  end loop;
end;
$$;

revoke all on function submit_follow_up(uuid, jsonb) from public, anon;
grant execute on function submit_follow_up(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- case_submission_status now also reports follow-up progress and AI failure.
-- Still booleans only — never any content.
-- ---------------------------------------------------------------------------

drop function if exists case_submission_status(uuid);

create function case_submission_status(the_case uuid)
returns table (
  stage case_stage,
  a_submitted boolean,
  b_submitted boolean,
  a_followed_up boolean,
  b_followed_up boolean,
  failed boolean
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
    c.last_error is not null
  from cases c
  where c.id = the_case and is_couple_member(c.couple_id);
$$;

revoke all on function case_submission_status(uuid) from public, anon;
grant execute on function case_submission_status(uuid) to authenticated;
