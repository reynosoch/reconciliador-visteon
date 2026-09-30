-- Private shared BOM library. Only accounts explicitly approved by the project
-- administrator (app_metadata.inventory_access = true) can read or save it.
create table public.inventory_bom_current (
  id boolean primary key default true check (id),
  revision bigint not null default 0,
  library jsonb not null default '{"rows":[],"files":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.inventory_bom_current(id) values (true);
create table public.inventory_bom_backups (
  revision bigint primary key,
  library jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);
alter table public.inventory_bom_current enable row level security;
alter table public.inventory_bom_backups enable row level security;
revoke all on public.inventory_bom_current, public.inventory_bom_backups from anon, authenticated;
grant select on public.inventory_bom_current, public.inventory_bom_backups to authenticated;
create policy "approved_team_read_current" on public.inventory_bom_current for select to authenticated
using ((select auth.jwt())->'app_metadata'->>'inventory_access' = 'true');
create policy "approved_team_read_backups" on public.inventory_bom_backups for select to authenticated
using ((select auth.jwt())->'app_metadata'->>'inventory_access' = 'true');
-- Definer is necessary: clients cannot update current or delete/alter history
-- directly. Claim check + row lock + revision comparison guard this one operation.
create function public.save_inventory_bom(expected_revision bigint, next_library jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_revision bigint;
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'inventory_access','false') <> 'true' then
    raise exception 'Inventory access required' using errcode = '42501';
  end if;
  if next_library is null or jsonb_typeof(next_library->'rows') is distinct from 'array'
     or jsonb_typeof(next_library->'files') is distinct from 'array'
     or octet_length(next_library::text) > 25000000 then
    raise exception 'Invalid BOM library';
  end if;
  select revision into current_revision from public.inventory_bom_current where id = true for update;
  if expected_revision is distinct from current_revision then return false; end if;
  insert into public.inventory_bom_backups(revision,library,created_by)
    values(current_revision + 1,next_library,auth.uid());
  update public.inventory_bom_current set revision=current_revision+1,library=next_library,updated_at=now() where id=true;
  return true;
end;
$$;
revoke all on function public.save_inventory_bom(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.save_inventory_bom(bigint,jsonb) to authenticated;
