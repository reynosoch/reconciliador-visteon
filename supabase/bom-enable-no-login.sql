begin;
grant select on public.inventory_bom_current to anon, authenticated;
create policy "inventory_bom_current_read" on public.inventory_bom_current for select to anon, authenticated using (true);
grant execute on function public.merge_inventory_bom(bigint,jsonb) to anon, authenticated;
commit;
