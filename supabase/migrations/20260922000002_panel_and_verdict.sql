-- Phase 5: three-member AI panel, the backend-computed verdict, and its texts
-- (stored per language). Apply with: npx supabase db push

alter type ai_stage add value if not exists 'translation';

do $$ begin
  create type panel_role as enum ('jury', 'family_counsellor', 'social_worker');
exception when duplicate_object then null; end $$;

-- One row per panel member. Scores are stored as the model gave them (clamped 0-100);
-- there is deliberately no "must add to 100" check — the backend normalises.
create table if not exists panel_assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  role panel_role not null,
  responsibility_partner_a numeric(5,2) not null check (responsibility_partner_a between 0 and 100),
  responsibility_partner_b numeric(5,2) not null check (responsibility_partner_b between 0 and 100),
  content jsonb not null,  -- English: primary_issue, secondary_issues, reasoning_summary, feedback, recommendations
  model text,
  created_at timestamptz not null default now(),
  unique (case_id, role)
);

-- The verdict's numbers and structure. Computed by the backend, never by a model.
create table if not exists verdicts (
  case_id uuid primary key references cases(id) on delete cascade,
  final_responsibility_a numeric(5,2) not null,
  final_responsibility_b numeric(5,2) not null,
  more_responsible text not null check (more_responsible in ('partner_a', 'partner_b')),
  decided_by text not null check (decided_by in ('percentage', 'jury', 'fallback')),
  charges jsonb not null default '{"a": [], "b": [], "both": []}'::jsonb,  -- fixed-list charge ids
  created_at timestamptz not null default now()
);

-- Everything a person reads, in one language. English is written first;
-- other languages are added by translation.
create table if not exists verdict_texts (
  case_id uuid not null references cases(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh-Hant')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (case_id, locale)
);

alter table panel_assessments enable row level security;
alter table verdicts enable row level security;
alter table verdict_texts enable row level security;

-- Readable by the couple only once the verdict is out. No client writes.
drop policy if exists panel_assessments_read on panel_assessments;
create policy panel_assessments_read on panel_assessments for select using (
  exists (select 1 from cases c where c.id = panel_assessments.case_id
          and is_couple_member(c.couple_id) and c.stage >= 'VERDICT')
);

drop policy if exists verdicts_read on verdicts;
create policy verdicts_read on verdicts for select using (
  exists (select 1 from cases c where c.id = verdicts.case_id
          and is_couple_member(c.couple_id) and c.stage >= 'VERDICT')
);

drop policy if exists verdict_texts_read on verdict_texts;
create policy verdict_texts_read on verdict_texts for select using (
  exists (select 1 from cases c where c.id = verdict_texts.case_id
          and is_couple_member(c.couple_id) and c.stage >= 'VERDICT')
);
