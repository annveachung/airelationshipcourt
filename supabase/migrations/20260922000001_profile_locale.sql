-- Each person's chosen language, so the server can write AI text in it.

alter table profiles
  add column if not exists locale text not null default 'en'
  check (locale in ('en', 'zh-Hant'));

-- A person may change only their own language. There is still no general
-- "update profile" permission for clients.
create or replace function set_my_locale(new_locale text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if new_locale not in ('en', 'zh-Hant') then
    raise exception 'invalid';
  end if;
  update profiles set locale = new_locale where id = auth.uid();
end;
$$;

revoke all on function set_my_locale(text) from public, anon;
grant execute on function set_my_locale(text) to authenticated;
