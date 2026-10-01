-- Inventory Reconciler cloud storage without visible login.
-- Browser clients use only the public/anon key.
-- Direct BOM table writes remain blocked; saves go through a validated RPC.

create table if not exists public.inventory_bom_current (
  id boolean primary key default true check (id),
  revision bigint not null default 0,
  library jsonb not null default '{"rows":[],"files":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.inventory_bom_current(id)
values (true)
on conflict (id) do nothing;

create table if not exists public.inventory_bom_backups (
  revision bigint primary key,
  library jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.inventory_bom_backups
  alter column created_by drop not null;

alter table public.inventory_bom_current enable row level security;
alter table public.inventory_bom_backups enable row level security;

revoke all on table public.inventory_bom_current, public.inventory_bom_backups
from anon, authenticated;

grant select on table public.inventory_bom_current to anon, authenticated;

drop policy if exists "approved_team_read_current" on public.inventory_bom_current;
drop policy if exists "approved_team_read_backups" on public.inventory_bom_backups;
drop policy if exists "inventory_bom_current_read" on public.inventory_bom_current;

create policy "inventory_bom_current_read"
on public.inventory_bom_current
for select
to anon, authenticated
using (true);

create or replace function public.save_inventory_bom(
  expected_revision bigint,
  next_library jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_revision bigint;
  current_library jsonb;
begin
  if next_library is null
     or jsonb_typeof(next_library) <> 'object'
     or jsonb_typeof(next_library->'rows') is distinct from 'array'
     or jsonb_typeof(next_library->'files') is distinct from 'array'
     or octet_length(next_library::text) > 25000000
     or jsonb_array_length(next_library->'rows') > 200000
     or jsonb_array_length(next_library->'files') > 5000 then
    raise exception 'Invalid BOM library';
  end if;

  select revision, library
    into current_revision, current_library
  from public.inventory_bom_current
  where id = true
  for update;

  if expected_revision is distinct from current_revision then
    return false;
  end if;

  if next_library = current_library then
    return true;
  end if;

  insert into public.inventory_bom_backups(revision, library, created_by)
  values(current_revision + 1, next_library, auth.uid());

  update public.inventory_bom_current
  set revision = current_revision + 1,
      library = next_library,
      updated_at = now()
  where id = true;

  return true;
end;
$$;

revoke all on function public.save_inventory_bom(bigint, jsonb)
from public, anon, authenticated;

grant execute on function public.save_inventory_bom(bigint, jsonb)
to anon, authenticated;

create table if not exists public.development_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  report_type text not null default 'Sin especificar'
    check (report_type in ('Sin especificar','Bug','Funcionalidad','Lógica','Datos / Fuente','Sugerencia')),
  app_area text not null default 'Sin especificar'
    check (char_length(app_area) between 1 and 80),
  opportunity text not null
    check (char_length(opportunity) between 1 and 4000),
  expected_logic text
    check (expected_logic is null or char_length(expected_logic) <= 4000),
  screenshot_data_url text
    check (
      screenshot_data_url is null
      or (
        screenshot_data_url like 'data:image/%'
        and octet_length(screenshot_data_url) <= 2800000
      )
    ),
  page_path text
    check (page_path is null or char_length(page_path) <= 500),
  inventory_id text
    check (inventory_id is null or char_length(inventory_id) <= 150),
  viewport jsonb,
  status text not null default 'new'
    check (status in ('new','reviewing','resolved','discarded'))
);

alter table public.development_feedback enable row level security;

revoke all on table public.development_feedback from anon, authenticated;
grant insert on table public.development_feedback to anon, authenticated;

drop policy if exists "development_feedback_public_insert"
on public.development_feedback;

create policy "development_feedback_public_insert"
on public.development_feedback
for insert
to anon, authenticated
with check (
  status = 'new'
  and char_length(opportunity) between 1 and 4000
  and char_length(app_area) between 1 and 80
);
