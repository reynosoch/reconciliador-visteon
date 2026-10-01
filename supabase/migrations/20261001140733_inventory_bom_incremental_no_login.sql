-- No login UI: read the shared collection and append new parents through one
-- controlled endpoint. Existing parent definitions cannot be replaced/deleted.
drop policy if exists "approved_team_read_current" on public.inventory_bom_current;
drop policy if exists "approved_team_read_backups" on public.inventory_bom_backups;
drop policy if exists "inventory_bom_current_read" on public.inventory_bom_current;
revoke all on public.inventory_bom_current, public.inventory_bom_backups from anon, authenticated;
grant select on public.inventory_bom_current to anon, authenticated;
create policy "inventory_bom_current_read" on public.inventory_bom_current
for select to anon, authenticated using (true);
alter table public.inventory_bom_backups alter column created_by drop not null;
revoke all on function public.save_inventory_bom(bigint,jsonb) from public, anon, authenticated;

create schema if not exists inventory_private;
revoke all on schema inventory_private from public, anon, authenticated;
-- Canonical rows match JS: ignore provenance/sequence; normalize flags and level.
create or replace function inventory_private.bom_definition(rows jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(v order by v::text), '[]'::jsonb)
  from (
    select (select jsonb_object_agg(btrim(key),
      case when btrim(key)='Level' and btrim(value) in ('.2','0.2','0,2') then '.2'
        when btrim(key) in ('Comp Phantom','Parent Phantom') then lower(btrim(value))
        else coalesce(btrim(value),'') end)
      from jsonb_each_text(row) where key not in ('Seq','Seq  ','__sourceFile')) v
    from jsonb_array_elements(rows) row
  ) definitions;
$$;

create or replace function public.merge_inventory_bom(expected_revision bigint, incoming_library jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_revision bigint;
  current_library jsonb;
  additions jsonb;
  files jsonb;
  next_library jsonb;
  parent_key text;
  parent_rows jsonb;
  old_rows jsonb;
begin
  if incoming_library is null or jsonb_typeof(incoming_library) <> 'object'
     or jsonb_typeof(incoming_library->'rows') is distinct from 'array'
     or jsonb_typeof(incoming_library->'files') is distinct from 'array'
     or octet_length(incoming_library::text) > 25000000
     or jsonb_array_length(incoming_library->'rows') > 200000
     or jsonb_array_length(incoming_library->'files') > 5000 then
    raise exception 'Invalid BOM library';
  end if;
  if exists (select 1 from jsonb_array_elements(incoming_library->'rows') r
    where jsonb_typeof(r) <> 'object' or coalesce(btrim(r->>'Parent Item'),'') = ''
      or coalesce(btrim(r->>'Component'),'') = '' or coalesce(btrim(r->>'Level'),'') = ''
      or coalesce(lower(btrim(r->>'Comp Phantom')),'') not in ('yes','no')) then
    raise exception 'Invalid BOM row';
  end if;
  if exists (select 1 from jsonb_array_elements(incoming_library->'rows') r
    where btrim(r->>'Level') in ('.2','0.2','0,2') and lower(btrim(r->>'Comp Phantom'))='no'
      and coalesce(replace(btrim(r->>'Usage'),',',''),'') !~ '^[+]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?$') then
    raise exception 'Invalid BOM usage';
  end if;
  select revision, library into current_revision, current_library
    from public.inventory_bom_current where id=true for update;
  if current_revision is null then raise exception 'BOM library not initialized'; end if;
  if expected_revision is distinct from current_revision then return false; end if;
  additions := '[]'::jsonb;
  for parent_key, parent_rows in
    select upper(btrim(r->>'Parent Item')), jsonb_agg(r)
    from jsonb_array_elements(incoming_library->'rows') r group by 1
  loop
    select jsonb_agg(r) into old_rows from jsonb_array_elements(current_library->'rows') r
      where upper(btrim(r->>'Parent Item'))=parent_key;
    if old_rows is not null then
      if inventory_private.bom_definition(old_rows) <> inventory_private.bom_definition(parent_rows) then
        raise exception 'BOM conflict: %', parent_key;
      end if;
    else
      additions := additions || parent_rows;
    end if;
  end loop;
  if jsonb_array_length(additions)=0 then return true; end if;
  -- File provenance is metadata only; normalized BOM rows are stored once.
  select coalesce(jsonb_agg(f),'[]'::jsonb) into files from (
    select distinct on (f->>'fingerprint') f - 'rows' as f
    from jsonb_array_elements((current_library->'files') || (incoming_library->'files')) f
    order by f->>'fingerprint'
  ) unique_files;
  next_library := jsonb_build_object('rows',(current_library->'rows') || additions,'files',files);
  if octet_length(next_library::text)>25000000 or jsonb_array_length(next_library->'rows')>200000
     or jsonb_array_length(files)>5000 then raise exception 'BOM library limit exceeded'; end if;
  -- Populate the real BOM source columns alongside the consolidated backup.
  insert into public.inventory_bom_rows ("Seq","Parent Item","Parent Item Description","Parent UOM","Parent Phantom","Level","Component","Component Description","Usage","Grossed up Usage","Comp UOM","Op","Comp Phantom","Start Date","End Date","Product Line","Item Type","P/M","Part Status","Cost Total","Ext Cost Total","BOH","Supplier","Name","Site",source_file)
  select r."Seq",r."Parent Item",r."Parent Item Description",r."Parent UOM",r."Parent Phantom",r."Level",r."Component",r."Component Description",r."Usage",r."Grossed up Usage",r."Comp UOM",r."Op",r."Comp Phantom",r."Start Date",r."End Date",r."Product Line",r."Item Type",r."P/M",r."Part Status",r."Cost Total",r."Ext Cost Total",r."BOH",r."Supplier",r."Name",r."Site",r."__sourceFile"
  from jsonb_to_recordset(additions) as r("Seq" text,"Parent Item" text,"Parent Item Description" text,"Parent UOM" text,"Parent Phantom" text,"Level" text,"Component" text,"Component Description" text,"Usage" text,"Grossed up Usage" text,"Comp UOM" text,"Op" text,"Comp Phantom" text,"Start Date" text,"End Date" text,"Product Line" text,"Item Type" text,"P/M" text,"Part Status" text,"Cost Total" text,"Ext Cost Total" text,"BOH" text,"Supplier" text,"Name" text,"Site" text,"__sourceFile" text);
  insert into public.inventory_bom_backups(revision,library,created_by)
    values(current_revision+1,next_library,auth.uid());
  update public.inventory_bom_current set revision=current_revision+1,library=next_library,updated_at=now() where id=true;
  return true;
end;
$$;
revoke all on function public.merge_inventory_bom(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.merge_inventory_bom(bigint,jsonb) to anon, authenticated;
