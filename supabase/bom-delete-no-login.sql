-- Controlled removal of one BOM source file from the shared current library.
-- The caller must know the exact SHA-256 fingerprint and current revision.
-- Every successful deletion creates a new immutable backup revision.
create or replace function public.remove_inventory_bom(
  expected_revision bigint,
  target_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_revision bigint;
  current_library jsonb;
  target_file jsonb;
  target_file_name text;
  duplicate_name_count integer;
  old_row_count integer;
  new_row_count integer;
  next_rows jsonb;
  next_files jsonb;
  next_library jsonb;
begin
  if coalesce(btrim(target_fingerprint),'') = '' or length(target_fingerprint) > 256 then
    raise exception 'Invalid BOM fingerprint';
  end if;

  select revision, library
    into current_revision, current_library
    from public.inventory_bom_current
    where id = true
    for update;

  if current_revision is null then
    raise exception 'BOM library not initialized';
  end if;

  if expected_revision is distinct from current_revision then
    return jsonb_build_object('status','stale','revision',current_revision);
  end if;

  select f
    into target_file
    from jsonb_array_elements(current_library->'files') f
    where f->>'fingerprint' = target_fingerprint
    limit 1;

  if target_file is null then
    return jsonb_build_object('status','not_found','revision',current_revision);
  end if;

  target_file_name := target_file->>'fileName';
  if coalesce(btrim(target_file_name),'') = '' then
    raise exception 'BOM file metadata is incomplete';
  end if;

  select count(*)::int
    into duplicate_name_count
    from jsonb_array_elements(current_library->'files') f
    where f->>'fileName' = target_file_name;

  if duplicate_name_count > 1 then
    raise exception 'Ambiguous BOM filename';
  end if;

  old_row_count := jsonb_array_length(current_library->'rows');

  select coalesce(jsonb_agg(r),'[]'::jsonb)
    into next_rows
    from jsonb_array_elements(current_library->'rows') r
    where coalesce(r->>'__sourceFile','') <> target_file_name;

  select coalesce(jsonb_agg(f),'[]'::jsonb)
    into next_files
    from jsonb_array_elements(current_library->'files') f
    where f->>'fingerprint' <> target_fingerprint;

  new_row_count := jsonb_array_length(next_rows);
  next_library := jsonb_build_object('rows',next_rows,'files',next_files);

  delete from public.inventory_bom_rows
    where source_file = target_file_name;

  insert into public.inventory_bom_backups(revision,library,created_by)
    values(current_revision + 1,next_library,auth.uid());

  update public.inventory_bom_current
    set revision = current_revision + 1,
        library = next_library,
        updated_at = now()
    where id = true;

  return jsonb_build_object(
    'status','deleted',
    'revision',current_revision + 1,
    'fileName',target_file_name,
    'rowsRemoved',old_row_count - new_row_count
  );
end;
$$;

revoke all on function public.remove_inventory_bom(bigint,text)
  from public, anon, authenticated;
grant execute on function public.remove_inventory_bom(bigint,text)
  to anon, authenticated;
