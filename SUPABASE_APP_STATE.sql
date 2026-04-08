create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null default jsonb_build_object('values', jsonb_build_object(), 'meta', jsonb_build_object()),
  updated_at timestamptz not null default now()
);

insert into public.app_state (id)
values ('global')
on conflict (id) do nothing;

alter table public.app_state disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.app_state to anon, authenticated;
