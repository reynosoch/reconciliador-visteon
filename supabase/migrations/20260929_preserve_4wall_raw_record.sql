-- Preserve the original 4Wall export row next to the normalized fields used by the dashboard.
-- Apply with a Supabase administrator before expecting the browser to show every source column.
alter table public.escaneos_4wall
  add column if not exists raw_record jsonb,
  add column if not exists source_columns jsonb;

create or replace function public.reemplazar_escaneos(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.escaneos_4wall;

  insert into public.escaneos_4wall (
    numero_parte,
    cantidad,
    area_escaneo,
    raw_record,
    source_columns
  )
  select
    nullif(trim(row_data->>'numero_parte'), ''),
    case
      when coalesce(row_data->>'cantidad','') ~ '^-?[0-9]+$'
        then (row_data->>'cantidad')::bigint
      else null
    end,
    nullif(trim(row_data->>'area_escaneo'), ''),
    row_data->'raw_record',
    row_data->'source_columns'
  from jsonb_array_elements(coalesce(payload, '[]'::jsonb)) as row_data;
end;
$$;

revoke all on function public.reemplazar_escaneos(jsonb) from public;
revoke execute on function public.reemplazar_escaneos(jsonb) from anon, authenticated;
grant execute on function public.reemplazar_escaneos(jsonb) to service_role;

comment on column public.escaneos_4wall.raw_record is
  'Original 4Wall export row preserved as JSON for audit/excel-style inspection.';
comment on column public.escaneos_4wall.source_columns is
  'Original source column names chosen by the extractor for part number, quantity and area.';
