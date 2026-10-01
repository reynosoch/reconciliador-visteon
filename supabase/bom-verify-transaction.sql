begin;
do $$
declare rev bigint; original_rows bigint; payload jsonb; accepted boolean;
begin
  select revision into rev from public.inventory_bom_current where id=true;
  select count(*) into original_rows from public.inventory_bom_rows;
  payload := '{"rows":[{"Parent Item":"__CHECK_BOM_A__","Component":"000123","Level":".2","Comp Phantom":"no","Usage":"0.5","__sourceFile":"verification.csv"}],"files":[{"fileName":"verification.csv","fingerprint":"verification-bom"}]}'::jsonb;
  if public.merge_inventory_bom(rev,payload) is not true then raise exception 'First save failed'; end if;
  if public.merge_inventory_bom(rev,payload) is not false then raise exception 'Stale revision accepted'; end if;
  if public.merge_inventory_bom(rev+1,payload) is not true then raise exception 'Duplicate save failed'; end if;
  if (select revision from public.inventory_bom_current where id=true) <> rev+1 then raise exception 'Duplicate created a revision'; end if;
  if (select count(*) from public.inventory_bom_rows) <> original_rows+1 then raise exception 'Duplicate added source rows'; end if;
  if (select "Usage" from public.inventory_bom_rows where "Parent Item"='__CHECK_BOM_A__') <> '0.5' then raise exception 'Fraction lost'; end if;
  begin
    accepted := public.merge_inventory_bom(rev+1,jsonb_set(payload,'{rows,0,Usage}','"9"'::jsonb));
    raise exception 'Conflicting version accepted';
  exception when others then
    if sqlerrm not like 'BOM conflict:%' then raise; end if;
  end;
end;
$$;
rollback;
select 'PASSED: incremental save, no duplicates, revision protection, fractions, conflict rejection' as bom_test,
(select count(*) from public.inventory_bom_rows) as permanent_bom_rows,
(select count(*) from public.escaneos_4wall) as existing_scans;
