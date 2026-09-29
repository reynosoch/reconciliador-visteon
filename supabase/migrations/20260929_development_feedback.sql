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

drop policy if exists "development_feedback_public_insert" on public.development_feedback;
create policy "development_feedback_public_insert"
on public.development_feedback
for insert
to anon, authenticated
with check (
  status = 'new'
  and char_length(opportunity) between 1 and 4000
  and char_length(app_area) between 1 and 80
);

comment on table public.development_feedback is
  'Development-phase feedback submitted from the inventory reconciler. Public clients may insert only; they cannot read reports.';
