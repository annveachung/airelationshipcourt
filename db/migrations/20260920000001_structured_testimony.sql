-- Testimony becomes mostly quick-pick answers instead of long free text.
--   feelings:   chips only (no free-text note)
--   causes:     chips + optional short note   (replaces what_caused_it)
--   needs:      chips + optional short note   (replaces wanted_instead)
--   frequency:  first_time / sometimes / often (new)
--   partner_did_wrong stays free text, capped at 1,000 characters
-- Run only while `testimonies` holds no real data (it was empty when written).

alter table testimonies
  drop column if exists emotions_note,
  drop column if exists what_caused_it,
  drop column if exists wanted_instead;

alter table testimonies
  add column causes text[] not null check (cardinality(causes) >= 1),
  add column cause_note text check (char_length(cause_note) <= 300),
  add column needs text[] not null check (cardinality(needs) >= 1),
  add column needs_note text check (char_length(needs_note) <= 300),
  add column frequency text not null check (frequency in ('first_time', 'sometimes', 'often'));

alter table testimonies drop constraint if exists testimonies_partner_did_wrong_check;
alter table testimonies
  add constraint testimonies_partner_did_wrong_check
  check (char_length(partner_did_wrong) between 1 and 1000);
