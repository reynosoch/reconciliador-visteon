-- Read-only preflight. Execute in the SQL editor of uukhwkywmnarcfruerpp only.
-- Stop the historical extractor and take a restorable DB backup before the migration.
select current_database(), current_user;
select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='escaneos_4wall' order by ordinal_position;
select count(*) rows, count(*) filter(where raw_record is null) missing_raw,
 count(*) filter(where numero_parte is null or area_escaneo is null or cantidad is null) missing_required
 from public.escaneos_4wall;
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='escaneos_4wall';
select conname,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.escaneos_4wall'::regclass;
select * from pg_policies where schemaname='public' and tablename='escaneos_4wall';
select grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='escaneos_4wall';
select p.oid::regprocedure signature,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='reemplazar_escaneos';
select count(*) collision_groups from (select coalesce(raw_record->>'Ticket/FIFO',raw_record->>'ticket_fifo') ticket from public.escaneos_4wall group by 1 having count(*)>1) a where ticket is not null;
select extname from pg_extension where extname in ('pg_cron','pgcrypto');
select pubname,schemaname,tablename from pg_publication_tables where pubname='supabase_realtime';
-- Abort activation if schema differs from assumptions, unknown writers remain active,
-- identifiers have a universal uniqueness constraint, or legacy data cannot be safely matched.
-- Inspect ambiguity as an administrator without copying real exports into Git.
