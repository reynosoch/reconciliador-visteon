-- Release 1: evolve the existing CURRENT table; no truncate, replacement or real export fixtures.
-- Run scripts/runner-preflight.sql as administrator, stop the old extractor and take a DB backup first.
begin;
create schema if not exists bot_private;
revoke all on schema bot_private from public, anon, authenticated;
grant usage on schema bot_private to anon, authenticated;

create table public.bot_user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('viewer','operator','admin')),
 active boolean not null default true, updated_at timestamptz not null default now()
);
create table public.bot_settings (
 id boolean primary key default true check(id), require_dashboard_login boolean not null default false
);
insert into public.bot_settings(id) values(true);
create table public.bot_runners (
 id text primary key check(id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
 auth_user_id uuid unique not null references auth.users(id),
 source_system text not null default '4wall' check(source_system='4wall'),
 plant text not null default 'CUU' check(plant ~ '^[A-Z0-9-]{1,30}$'),
 active boolean not null default true, enabled boolean not null default true, paused boolean not null default false,
 interval_minutes integer not null default 30 check(interval_minutes between 1 and 1440),
 next_run_at timestamptz, heartbeat_at timestamptz, state text not null default 'OFFLINE'
 check(state in ('OFFLINE','STARTING','ONLINE','IDLE','RUNNING','PAUSE_REQUESTED','PAUSED','RETRYING','ERROR')),
 version text, machine_session uuid, session_until timestamptz,
 active_run_id uuid, run_lease_until timestamptz,
 updated_at timestamptz not null default now()
);
create table public.bot_source_state (
 source_system text not null, plant text not null,
 generation bigint not null default 0, content_version bigint not null default 0,
 row_count integer not null default 0, complete boolean not null default false,
 snapshot_hash text, last_publication_run_id uuid, last_complete_run_id uuid,
 extracted_at timestamptz, published_at timestamptz,
 max_rows integer not null default 100000 check(max_rows between 1 and 250000),
 min_row_ratio numeric not null default 0.1 check(min_row_ratio between 0 and 1),
 max_quantity numeric not null default 1000000000 check(max_quantity>0 and max_quantity<=1000000000000),
 date_order text check(date_order in ('DMY','MDY')),
 primary key(source_system,plant)
);
insert into public.bot_source_state(source_system,plant,row_count)
 select '4wall','CUU',count(*) from public.escaneos_4wall;
create table public.bot_commands (
 id uuid primary key default gen_random_uuid(), runner_id text not null references public.bot_runners(id),
 action text not null check(action in ('RUN_NOW','PAUSE','RESUME')),
 actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 expires_at timestamptz, status text not null default 'PENDING' check(status in ('PENDING','CLAIMED','APPLIED','EXPIRED')),
 run_id uuid, finished_at timestamptz
);
create unique index bot_one_pending_run_now on public.bot_commands(runner_id) where action='RUN_NOW' and status='PENDING';
create index bot_commands_runner_recent on public.bot_commands(runner_id,created_at desc);
create table public.bot_runs (
 id uuid primary key, runner_id text not null references public.bot_runners(id), actor_id uuid not null references auth.users(id),
 trigger text not null check(trigger in ('AUTO_START','SCHEDULE','COMMAND','MANUAL_FULL_UPLOAD','MANUAL_PARTIAL_UPLOAD')),
 complete boolean not null, status text not null default 'RUNNING'
 check(status in ('RUNNING','RETRYING','SUCCESS','FAILED','REJECTED','INTERRUPTED')),
 started_at timestamptz not null default now(), finished_at timestamptz, duration_ms bigint,
 attempt integer not null default 1 check(attempt between 1 and 4), next_attempt_at timestamptz,
 lease_token uuid not null default gen_random_uuid(), expected_generation bigint not null,
 rows_seen integer, rows_inserted integer, rows_updated integer, rows_unchanged integer,
 rows_removed integer, rows_rejected integer not null default 0, snapshot_hash text,
 error_summary text, command_id uuid references public.bot_commands(id)
);
create index bot_runs_runner_recent on public.bot_runs(runner_id,started_at desc);
create index bot_runs_stale on public.bot_runs(started_at) where status in ('RUNNING','RETRYING');
create table public.bot_audit_log (
 id bigint generated always as identity primary key, actor_id uuid, runner_id text,
 action text not null, occurred_at timestamptz not null default now(), result text not null, run_id uuid
);
create index bot_audit_recent on public.bot_audit_log(occurred_at desc);
create table public.bot_errors (
 id bigint generated always as identity primary key, run_id uuid not null references public.bot_runs(id) on delete cascade,
 occurred_at timestamptz not null default now(), step text not null, error_type text not null,
 retry_number integer not null, duration_ms bigint, last_valid_run_id uuid
);
create table public.bot_notifications (
 id uuid primary key default gen_random_uuid(), run_id uuid not null unique references public.bot_runs(id) on delete cascade,
 runner_id text not null, created_at timestamptz not null default now(),
 message text not null default 'Falló la actualización automática de 4Wall. El último corte válido sigue activo. Puedes reintentar o cargar el archivo manualmente.'
);
create table bot_private.notification_outbox (
 id uuid primary key default gen_random_uuid(), run_id uuid not null unique references public.bot_runs(id) on delete cascade,
 runner_id text not null, created_at timestamptz not null default now(),
 status text not null default 'PENDING' check(status in ('PENDING','SENDING','SENT','FAILED')),
 attempts integer not null default 0, lease_until timestamptz, sent_at timestamptz, first_attempt_at timestamptz, last_valid_at timestamptz
);
alter table bot_private.notification_outbox enable row level security;
create table bot_private.run_rows (
 run_id uuid not null references public.bot_runs(id) on delete cascade, position integer not null check(position>=0),
 canonical jsonb not null, source_identity text not null, composite_key text not null,
 identity_mode text not null, row_hash text not null, raw_record jsonb, source_columns jsonb,
 resolved_id uuid, primary key(run_id,position)
);
create index bot_staged_identity on bot_private.run_rows(run_id,source_identity);
create index bot_staged_resolved on bot_private.run_rows(run_id,resolved_id) where resolved_id is not null;
alter table bot_private.run_rows enable row level security;

-- Existing legacy primary key remains compatible with current consumers; each CURRENT record also gets a stable UUID.
alter table public.escaneos_4wall
 add column if not exists raw_record jsonb, add column if not exists source_columns jsonb,
 add column record_id uuid not null default gen_random_uuid(),
 add column source_system text not null default '4wall', add column plant text not null default 'CUU',
 add column source_record_id text, add column source_identity text,
 add column composite_key text, add column identity_mode text not null default 'legacy'
 check(identity_mode in ('legacy','ticket','composite')),
 add column canonical jsonb, add column row_hash text,
 add column first_seen_at timestamptz not null default now(), add column last_seen_at timestamptz not null default now(),
 add column missing_count integer not null default 0 check(missing_count between 0 and 1),
 add column last_writer text not null default 'LEGACY', add column last_run_id uuid;
alter table public.escaneos_4wall alter column cantidad type numeric using cantidad::numeric;
update public.escaneos_4wall set source_record_id=nullif(trim(raw_record->>'Ticket/FIFO'),''),source_identity='legacy:'||record_id;
create unique index fourwall_record_uuid on public.escaneos_4wall(record_id);
create unique index fourwall_source_identity on public.escaneos_4wall(source_system,plant,source_identity);
create index fourwall_ticket_lookup on public.escaneos_4wall(source_system,plant,source_record_id);

create function bot_private.member_role() returns text language sql stable security definer set search_path='' as $$
 select coalesce((select role from public.bot_user_roles where user_id=auth.uid() and active),'viewer');
$$;
create function bot_private.dashboard_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select not require_dashboard_login or (auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) from public.bot_settings where id;
$$;
create function bot_private.hash_values(prefix text, vals jsonb) returns text language sql immutable set search_path='' as $$
 select encode(sha256(convert_to(prefix||coalesce(string_agg(octet_length(value)::text||':'||value,'' order by ord),''),'UTF8')),'hex')
 from jsonb_array_elements_text(vals) with ordinality a(value,ord);
$$;
create function bot_private.finish_run(run_uuid uuid, outcome text, code text default null) returns void language plpgsql security definer set search_path='' as $$
declare run public.bot_runs; r public.bot_runners;
begin
 select * into run from public.bot_runs where id=run_uuid for update;
 if run.status not in ('RUNNING','RETRYING') then return; end if;
 select * into r from public.bot_runners where id=run.runner_id;
 update public.bot_runs set status=outcome,finished_at=now(),duration_ms=(extract(epoch from now()-started_at)*1000)::bigint,error_summary=code where id=run_uuid;
 update public.bot_runners set active_run_id=null,run_lease_until=null,
 state=case when paused then 'PAUSED' when outcome='SUCCESS' then 'IDLE' else 'ERROR' end,
 next_run_at=now()+make_interval(mins=>interval_minutes),
 session_until=case when auth_user_id=run.actor_id and outcome<>'INTERRUPTED' then now()+interval '60 seconds' else session_until end,updated_at=now()
 where id=run.runner_id and active_run_id=run_uuid;
 if run.command_id is not null then update public.bot_commands set status='APPLIED',finished_at=now() where id=run.command_id; end if;
 insert into public.bot_audit_log(actor_id,runner_id,action,result,run_id) values(run.actor_id,run.runner_id,run.trigger,outcome,run_uuid);
 if outcome in ('FAILED','REJECTED','INTERRUPTED') then
  insert into public.bot_notifications(run_id,runner_id) values(run_uuid,run.runner_id) on conflict(run_id) do nothing;
  if run.trigger not like 'MANUAL_%' then insert into bot_private.notification_outbox(run_id,runner_id,last_valid_at) values(run_uuid,run.runner_id,(select s.published_at from public.bot_source_state s join public.bot_runners rb on s.source_system=rb.source_system and s.plant=rb.plant where rb.id=run.runner_id)) on conflict(run_id) do nothing; end if;
 end if;
 delete from bot_private.run_rows where run_id=run_uuid;
end;
$$;

create function bot_private.api(op text, p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); role_name text:=bot_private.member_role();
 r public.bot_runners; s public.bot_source_state; run public.bot_runs; cmd public.bot_commands;
 rid text:=p->>'runner_id'; run_uuid uuid; c record; old public.escaneos_4wall;
 n integer; hits integer; ticket_count integer; changed integer:=0; inserted integer:=0; updated integer:=0; removed integer:=0; unchanged integer:=0;
 found_id uuid; expected_hash text; calculated_snapshot_hash text; rejection text; receipt jsonb;
begin
 if p is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>2000000 then raise exception 'INVALID_REQUEST'; end if;
 if op='session' then return jsonb_build_object('role',case when uid is null then 'anon' else role_name end,'require_dashboard_login',(select require_dashboard_login from public.bot_settings where id)); end if;
 if op='state' then
  if not bot_private.dashboard_allowed() then raise exception 'LOGIN_REQUIRED'; end if;
  return jsonb_build_object('runners',coalesce((select jsonb_agg(jsonb_build_object(
   'id',id,'source_system',source_system,'plant',plant,'enabled',enabled,'paused',paused,'interval_minutes',interval_minutes,
   'heartbeat_at',heartbeat_at,'state',case when not active or heartbeat_at is null or heartbeat_at<now()-interval '45 seconds' then 'OFFLINE' else state end,
   'next_run_at',next_run_at,'active_run_id',active_run_id,'version',version)) from public.bot_runners),'[]'::jsonb),
   'sources',coalesce((select jsonb_agg(jsonb_build_object('source_system',source_system,'plant',plant,'generation',generation,'content_version',content_version,
   'row_count',row_count,'complete',complete,'snapshot_hash',snapshot_hash,'last_publication_run_id',last_publication_run_id,'last_complete_run_id',last_complete_run_id,'extracted_at',extracted_at,'published_at',published_at)) from public.bot_source_state),'[]'::jsonb),
   'last_attempts',coalesce((select jsonb_agg(a) from (select distinct on(runner_id) runner_id,id,status,started_at,finished_at,next_attempt_at,duration_ms,attempt,rows_seen,rows_inserted,rows_updated,rows_unchanged,rows_removed,rows_rejected from public.bot_runs order by runner_id,started_at desc) a),'[]'::jsonb),
   'notifications',coalesce((select jsonb_agg(a) from (select id,runner_id,created_at,message from public.bot_notifications order by created_at desc limit 10) a),'[]'::jsonb));
 end if;
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LOGIN_REQUIRED'; end if;
 if op='set_role' then
  if role_name<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if exists(select 1 from public.bot_runners where auth_user_id=(p->>'user_id')::uuid) then raise exception 'RUNNER_CANNOT_BE_HUMAN'; end if;
  if (p->>'user_id')::uuid=uid and (p->>'role'<>'admin' or coalesce((p->>'active')::boolean,true)=false) then raise exception 'CANNOT_REMOVE_OWN_ADMIN'; end if;
  insert into public.bot_user_roles(user_id,role,active) values((p->>'user_id')::uuid,p->>'role',coalesce((p->>'active')::boolean,true))
  on conflict(user_id) do update set role=excluded.role,active=excluded.active,updated_at=now();
  insert into public.bot_audit_log(actor_id,action,result) values(uid,'SET_ROLE','APPLIED'); return jsonb_build_object('status','APPLIED');
 end if;
 if op='register' then
  if role_name<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if exists(select 1 from public.bot_user_roles where user_id=(p->>'auth_user_id')::uuid) then raise exception 'DEDICATED_RUNNER_ACCOUNT_REQUIRED'; end if;
  insert into public.bot_runners(id,auth_user_id,plant) values(rid,(p->>'auth_user_id')::uuid,coalesce(p->>'plant','CUU'));
  insert into public.bot_source_state(source_system,plant) values('4wall',coalesce(p->>'plant','CUU')) on conflict do nothing;
  insert into public.bot_audit_log(actor_id,runner_id,action,result) values(uid,rid,'REGISTER_RUNNER','APPLIED'); return jsonb_build_object('status','APPLIED');
 end if;
 if op='settings' then
  if role_name<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  update public.bot_settings set require_dashboard_login=(p->>'require_dashboard_login')::boolean where id;
  insert into public.bot_audit_log(actor_id,action,result) values(uid,'DASHBOARD_POLICY','APPLIED'); return jsonb_build_object('status','APPLIED');
 end if;
 if op='history' then
  return jsonb_build_object('runs',coalesce((select jsonb_agg(a) from (select id,runner_id,trigger,status,started_at,finished_at,duration_ms,attempt,rows_seen,rows_inserted,rows_updated,rows_unchanged,rows_removed,rows_rejected from public.bot_runs where (rid is null or runner_id=rid) order by started_at desc limit 90) a),'[]'::jsonb));
 end if;
 if op='diagnostics' then
  if role_name<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  return jsonb_build_object('errors',coalesce((select jsonb_agg(a) from (select * from public.bot_errors order by occurred_at desc limit 100) a),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(a) from (select * from public.bot_audit_log order by occurred_at desc limit 100) a),'[]'::jsonb));
 end if;
 if op in ('stage','publish','retry','fail','touch_run','reset_stage','receipt') then
  run_uuid:=(p->>'run_id')::uuid;
  select * into run from public.bot_runs where id=run_uuid for update;
  if not found or run.actor_id is distinct from uid or run.lease_token is distinct from (p->>'lease_token')::uuid then raise exception 'RUN_OWNER_REQUIRED'; end if;
  rid:=run.runner_id;
 end if;
 select * into r from public.bot_runners where id=rid for update;
 if not found then raise exception 'RUNNER_NOT_REGISTERED'; end if;
 select * into s from public.bot_source_state where source_system=r.source_system and plant=r.plant;
 if op in ('config','command','begin_manual') or op='manifest' and role_name in ('operator','admin') then
  if role_name not in ('operator','admin') then raise exception 'OPERATOR_REQUIRED'; end if;
 elsif op in ('stage','publish','retry','fail','touch_run','reset_stage','receipt') and run.trigger like 'MANUAL_%' then
  if role_name not in ('operator','admin') then raise exception 'OPERATOR_REQUIRED'; end if;
 elsif r.auth_user_id<>uid or not r.active then raise exception 'RUNNER_IDENTITY_REQUIRED'; end if;
 if op='receipt' then return to_jsonb(run); end if;
 if op='config' then
  if role_name<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  update public.bot_runners set active=coalesce((p->>'active')::boolean,active),enabled=coalesce((p->>'enabled')::boolean,enabled),
  interval_minutes=coalesce((p->>'interval_minutes')::integer,interval_minutes),next_run_at=now()+make_interval(mins=>coalesce((p->>'interval_minutes')::integer,interval_minutes)),updated_at=now() where id=rid;
  update public.bot_source_state set min_row_ratio=coalesce((p->>'min_row_ratio')::numeric,min_row_ratio),
  max_rows=coalesce((p->>'max_rows')::integer,max_rows),max_quantity=coalesce((p->>'max_quantity')::numeric,max_quantity),
  date_order=case when p ? 'date_order' then p->>'date_order' else date_order end where source_system=r.source_system and plant=r.plant;
  insert into public.bot_audit_log(actor_id,runner_id,action,result) values(uid,rid,'CONFIGURE','APPLIED'); return jsonb_build_object('status','APPLIED');
 end if;
 if op='command' then
  if p->>'action' not in ('RUN_NOW','PAUSE','RESUME') then raise exception 'INVALID_COMMAND'; end if;
  select * into cmd from public.bot_commands where id=(p->>'id')::uuid;
  if found then
   if cmd.actor_id<>uid or cmd.runner_id<>rid or cmd.action<>p->>'action' then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return to_jsonb(cmd);
  end if;
  update public.bot_commands set status='EXPIRED',finished_at=now() where runner_id=rid and status='PENDING' and action='RUN_NOW' and expires_at<=now();
  if p->>'action'='RUN_NOW' then
   select * into cmd from public.bot_commands where runner_id=rid and status='PENDING' and action='RUN_NOW';
   if found then
    insert into public.bot_audit_log(actor_id,runner_id,action,result) values(uid,rid,'RUN_NOW','COALESCED'); return to_jsonb(cmd);
   end if;
  else
   update public.bot_runners set paused=p->>'action'='PAUSE',
   state=case when p->>'action'='PAUSE' then case when active_run_id is null then 'PAUSED' else 'PAUSE_REQUESTED' end
   else case when active_run_id is null then 'IDLE' else 'RUNNING' end end,
   next_run_at=case when p->>'action'='RESUME' then now()+make_interval(mins=>interval_minutes) else next_run_at end,updated_at=now() where id=rid;
  end if;
  insert into public.bot_commands(id,runner_id,action,actor_id,expires_at,status,finished_at)
  values((p->>'id')::uuid,rid,p->>'action',uid,case when p->>'action'='RUN_NOW' then now()+interval '10 minutes' end,
  case when p->>'action'='RUN_NOW' then 'PENDING' else 'APPLIED' end,case when p->>'action'<>'RUN_NOW' then now() end) returning * into cmd;
  insert into public.bot_audit_log(actor_id,runner_id,action,result) values(uid,rid,cmd.action,cmd.status); return to_jsonb(cmd);
 end if;
 if op='start' then
  if p->>'session_id' is null then raise exception 'INVALID_SESSION'; end if;
  if r.session_until>now() and r.machine_session is distinct from (p->>'session_id')::uuid then raise exception 'RUNNER_ALREADY_ONLINE'; end if;
  if r.active_run_id is not null and r.run_lease_until<=now() then perform bot_private.finish_run(r.active_run_id,'INTERRUPTED','STALE_RUN'); end if;
  update public.bot_runners set machine_session=(p->>'session_id')::uuid,session_until=now()+interval '60 seconds',heartbeat_at=now(),
  state=case when paused then 'PAUSED' else 'STARTING' end,version=left(p->>'version',40) where id=rid;
 end if;
 if op in ('heartbeat','control','begin') then
  if p->>'session_id' is null or r.session_until is null or r.machine_session is distinct from (p->>'session_id')::uuid or r.session_until<=now() then raise exception 'RUNNER_SESSION_EXPIRED'; end if;
 end if;
 if op='heartbeat' then
  update public.bot_runners set heartbeat_at=now(),session_until=case when p->>'state'='OFFLINE' then now() else now()+interval '60 seconds' end,
  run_lease_until=case when active_run_id is not null then now()+interval '120 seconds' end,
  state=case when p->>'state'='OFFLINE' then 'OFFLINE' when paused then case when active_run_id is null then 'PAUSED' else 'PAUSE_REQUESTED' end
  when active_run_id is not null then case when (select status from public.bot_runs where id=active_run_id)='RETRYING' then 'RETRYING' else 'RUNNING' end
  else case when p->>'state' in ('ERROR','STARTING') then p->>'state' else 'IDLE' end end where id=rid;
 end if;
 if op in ('start','heartbeat','control','manifest') then
  update public.bot_commands set status='EXPIRED',finished_at=now() where runner_id=rid and status='PENDING' and action='RUN_NOW' and expires_at<=now();
  select * into r from public.bot_runners where id=rid;
  if op='manifest' then
   return jsonb_build_object('generation',s.generation,'date_order',s.date_order,'min_row_ratio',s.min_row_ratio,'max_rows',s.max_rows,'max_quantity',s.max_quantity,
   'records',coalesce((select jsonb_agg(a) from (select record_id,source_record_id,source_identity,composite_key,row_hash from public.escaneos_4wall where source_system=r.source_system and plant=r.plant order by id limit 2000 offset greatest(0,coalesce((p->>'offset')::integer,0))) a),'[]'::jsonb));
  end if;
  return jsonb_build_object('runner',jsonb_build_object('id',r.id,'enabled',r.enabled,'paused',r.paused,'interval_minutes',r.interval_minutes,'next_run_at',r.next_run_at,'state',r.state,'active_run_id',r.active_run_id),
  'source',to_jsonb(s),'pending',coalesce((select jsonb_agg(jsonb_build_object('id',id,'expires_at',expires_at)) from public.bot_commands where runner_id=rid and status='PENDING' and action='RUN_NOW'),'[]'::jsonb));
 end if;
 if op in ('begin','begin_manual') then
  run_uuid:=(p->>'run_id')::uuid;
  select * into run from public.bot_runs where id=run_uuid;
  if found then
   if run.actor_id<>uid or run.runner_id<>rid or run.trigger<>p->>'trigger' then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return to_jsonb(run);
  end if;
  if r.active_run_id is not null and r.run_lease_until>now() then raise exception 'ACTIVE_RUN'; end if;
  if r.active_run_id is not null then perform bot_private.finish_run(r.active_run_id,'INTERRUPTED','STALE_RUN'); end if;
  if op='begin_manual' and p->>'trigger' not in ('MANUAL_FULL_UPLOAD','MANUAL_PARTIAL_UPLOAD') then raise exception 'INVALID_TRIGGER'; end if;
  if op='begin' and p->>'trigger' not in ('AUTO_START','SCHEDULE','COMMAND') then raise exception 'INVALID_TRIGGER'; end if;
  if op='begin' and p->>'trigger'<>'COMMAND' and (not r.enabled or r.paused) then return jsonb_build_object('status','PAUSED'); end if;
  if p->>'trigger'='COMMAND' then
   select * into cmd from public.bot_commands where id=(p->>'command_id')::uuid and runner_id=rid and status='PENDING' and expires_at>now() for update;
   if not found then return jsonb_build_object('status','EXPIRED'); end if;
   update public.bot_commands set status='CLAIMED',run_id=run_uuid where id=cmd.id;
  end if;
  insert into public.bot_runs(id,runner_id,actor_id,trigger,complete,expected_generation,command_id)
  values(run_uuid,rid,uid,p->>'trigger',p->>'trigger'<>'MANUAL_PARTIAL_UPLOAD',s.generation,cmd.id) returning * into run;
  update public.bot_runners set active_run_id=run_uuid,run_lease_until=now()+interval '120 seconds',state=case when paused then 'PAUSE_REQUESTED' else 'RUNNING' end where id=rid;
  insert into public.bot_audit_log(actor_id,runner_id,action,result,run_id) values(uid,rid,run.trigger,'ACCEPTED',run_uuid);
  return to_jsonb(run);
 end if;
 if run.status='SUCCESS' and op='publish' then return to_jsonb(run); end if;
 if run.status not in ('RUNNING','RETRYING') or r.active_run_id is distinct from run_uuid or r.run_lease_until<=now() then raise exception 'RUN_LEASE_EXPIRED'; end if;
 if op='touch_run' then update public.bot_runners set run_lease_until=now()+interval '120 seconds' where id=rid; return jsonb_build_object('status','RUNNING'); end if;
 if op='reset_stage' then delete from bot_private.run_rows where run_id=run_uuid;return jsonb_build_object('status','RESET'); end if;
 if op in ('retry','fail') then
  if p->>'error_type' not in ('LOGIN_ERROR','DOWNLOAD_ERROR','PARSER_ERROR','QUALITY_GATE','AMBIGUOUS_IDENTITY','NETWORK_ERROR','PUBLICATION_ERROR','RUNNER_ERROR') then raise exception 'INVALID_ERROR_CODE'; end if;
  insert into public.bot_errors(run_id,step,error_type,retry_number,duration_ms,last_valid_run_id)
  values(run_uuid,case when p->>'step' in ('login','download','parse','validate','publish') then p->>'step' else 'publish' end,p->>'error_type',run.attempt-1,
  (extract(epoch from now()-run.started_at)*1000)::bigint,s.last_complete_run_id);
  if op='retry' and run.attempt<4 then
   update public.bot_runs set status='RETRYING',attempt=attempt+1,next_attempt_at=now()+case run.attempt when 1 then interval '1 minute' when 2 then interval '5 minutes' else interval '10 minutes' end where id=run_uuid;
   update public.bot_runners set state=case when paused then 'PAUSE_REQUESTED' else 'RETRYING' end where id=rid;
  else perform bot_private.finish_run(run_uuid,case when p->>'error_type' in ('QUALITY_GATE','AMBIGUOUS_IDENTITY','PARSER_ERROR') then 'REJECTED' else 'FAILED' end,p->>'error_type'); end if;
  select to_jsonb(t) into receipt from public.bot_runs t where id=run_uuid; return receipt;
 end if;
 if op='stage' then
  if jsonb_typeof(p->'rows')<>'array' or jsonb_array_length(p->'rows') not between 1 and 250 or octet_length(p::text)>2000000 then raise exception 'INVALID_BATCH'; end if;
  for c in select value as data from jsonb_array_elements(p->'rows') loop
   if jsonb_typeof(c.data->'canonical')<>'array' or jsonb_array_length(c.data->'canonical')<>14 or exists(select 1 from jsonb_array_elements(c.data->'canonical') x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>512)
   or coalesce(c.data->'canonical'->>0,'')='' or coalesce(c.data->'canonical'->>1,'')='' or coalesce(c.data->'canonical'->>6,'')=''
   or coalesce(c.data->'canonical'->>7,'')!~ '^-?[0-9]+(\.[0-9]+)?$' then raise exception 'INVALID_ROW'; end if;
   if c.data->>'position' is null or (c.data->>'position')::integer not between 0 and s.max_rows-1 or c.data->>'identity_mode' is null then raise exception 'INVALID_ROW'; end if;
   expected_hash:=bot_private.hash_values('4wall-row-v1|',c.data->'canonical');
   if c.data->>'row_hash' is distinct from expected_hash then raise exception 'HASH_MISMATCH'; end if;
   if c.data->>'identity_mode' not in ('ticket','composite') then raise exception 'INVALID_IDENTITY'; end if;
   if c.data->>'composite_key' is distinct from bot_private.hash_values('4wall-composite-v1|',jsonb_build_array(c.data->'canonical'->>0,c.data->'canonical'->>6,c.data->'canonical'->>12,c.data->'canonical'->>3)) then raise exception 'IDENTITY_MISMATCH'; end if;
   if c.data->>'source_identity' is distinct from (case when c.data->>'identity_mode'='ticket' then bot_private.hash_values('4wall-ticket-v1|',jsonb_build_array(c.data->'canonical'->>0)) else c.data->>'composite_key' end) then raise exception 'IDENTITY_MISMATCH'; end if;
   if c.data->'raw_record' is not null and c.data->'raw_record'<>'null'::jsonb then
    if jsonb_typeof(c.data->'raw_record')<>'object' or octet_length((c.data->'raw_record')::text)>16384 or exists(select 1 from jsonb_object_keys(c.data->'raw_record') k where k~* 'password|passwd|contrase|cookie|authorization|token|service.?role|api.?key') or exists(select 1 from jsonb_each(c.data->'raw_record') x where jsonb_typeof(x.value) not in ('string','number','boolean','null')) then raise exception 'UNSAFE_RAW_ROW'; end if;
   end if;
   if jsonb_typeof(c.data->'source_columns') is distinct from 'object' or exists(select 1 from jsonb_each(c.data->'source_columns') x where x.key not in ('part_number','quantity','area') or jsonb_typeof(x.value) not in ('string','null') or length(x.value#>>'{}')>512) then raise exception 'INVALID_SOURCE_COLUMNS'; end if;
   insert into bot_private.run_rows(run_id,position,canonical,source_identity,composite_key,identity_mode,row_hash,raw_record,source_columns)
   values(run_uuid,(c.data->>'position')::integer,c.data->'canonical',c.data->>'source_identity',c.data->>'composite_key',c.data->>'identity_mode',expected_hash,nullif(c.data->'raw_record','null'::jsonb),c.data->'source_columns')
   on conflict(run_id,position) do update set canonical=excluded.canonical,source_identity=excluded.source_identity,composite_key=excluded.composite_key,identity_mode=excluded.identity_mode,row_hash=excluded.row_hash,raw_record=excluded.raw_record,source_columns=excluded.source_columns,resolved_id=null;
  end loop;
  update public.bot_runs set status='RUNNING',next_attempt_at=null where id=run_uuid;
  update public.bot_runners set run_lease_until=now()+interval '120 seconds' where id=rid;
  return jsonb_build_object('status','STAGED');
 end if;
 if op<>'publish' then raise exception 'UNKNOWN_OPERATION'; end if;
 if p->>'expected_generation' is null or p->>'rows_seen' is null or coalesce(p->>'snapshot_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_MANIFEST'; end if;
 select * into s from public.bot_source_state where source_system=r.source_system and plant=r.plant for update;
 if s.generation<>(p->>'expected_generation')::bigint then return jsonb_build_object('status','STALE_GENERATION','generation',s.generation); end if;
 select count(*) into n from bot_private.run_rows where run_id=run_uuid;
 select bot_private.hash_values('4wall-snapshot-v1|',jsonb_agg(source_identity||':'||row_hash order by source_identity||':'||row_hash)) into calculated_snapshot_hash from bot_private.run_rows where run_id=run_uuid;
 if n=0 or n>s.max_rows or n<>(p->>'rows_seen')::integer or calculated_snapshot_hash<>p->>'snapshot_hash'
 or (select min(position) from bot_private.run_rows where run_id=run_uuid)<>0 or (select max(position) from bot_private.run_rows where run_id=run_uuid)<>n-1 then rejection:='INVALID_MANIFEST'; end if;
 if run.complete and (coalesce((p->>'export_complete')::boolean,false)=false or s.row_count>0 and n<s.row_count*s.min_row_ratio) then rejection:='INCOMPLETE_EXPORT'; end if;
 if exists(select 1 from bot_private.run_rows where run_id=run_uuid and abs((canonical->>7)::numeric)>s.max_quantity) then rejection:='QUANTITY_LIMIT'; end if;
 if exists(select 1 from bot_private.run_rows where run_id=run_uuid group by source_identity having count(*)>1) then rejection:='AMBIGUOUS_IDENTITY'; end if;
 if exists(select 1 from bot_private.run_rows where run_id=run_uuid group by canonical->>0 having count(*)>1 and bool_or(identity_mode<>'composite' or canonical->>3='' or canonical->>12='')) then rejection:='AMBIGUOUS_IDENTITY'; end if;
 if rejection is not null then
  update public.bot_runs set rows_seen=n,rows_rejected=n where id=run_uuid;
  perform bot_private.finish_run(run_uuid,'REJECTED',rejection);select to_jsonb(t) into receipt from public.bot_runs t where id=run_uuid; return receipt;
 end if;
 -- Resolve transitions using the source composite key before any CURRENT write.
 for c in select * from bot_private.run_rows where run_id=run_uuid order by position loop
  select count(*) into ticket_count from public.escaneos_4wall where source_system=r.source_system and plant=r.plant and source_record_id=c.canonical->>0;
  select count(*),min(record_id::text)::uuid into hits,found_id from public.escaneos_4wall where source_system=r.source_system and plant=r.plant and source_record_id=c.canonical->>0 and
   (composite_key=c.composite_key or identity_mode='legacy' and upper(trim(coalesce(raw_record->>'Número Parte QAD',raw_record->>'Numero Parte QAD',numero_parte)))=c.canonical->>6
   and upper(trim(coalesce(raw_record->>'Escaneador','')))=c.canonical->>3 and trim(coalesce(raw_record->>'Fecha agregado',''))=c.canonical->>12);
  if hits>1 then rejection:='AMBIGUOUS_TRANSITION'; exit; end if;
  if hits=0 and ticket_count=1 and c.identity_mode='ticket' and exists(select 1 from public.escaneos_4wall where source_system=r.source_system and plant=r.plant and source_record_id=c.canonical->>0 and identity_mode in ('ticket','legacy')) then select record_id into found_id from public.escaneos_4wall where source_system=r.source_system and plant=r.plant and source_record_id=c.canonical->>0;
  elsif hits=0 and ticket_count>0 and c.identity_mode='composite' and not exists(select 1 from public.escaneos_4wall t where t.source_system=r.source_system and t.plant=r.plant and t.source_record_id=c.canonical->>0 and (t.composite_key is null or not exists(select 1 from bot_private.run_rows q where q.run_id=run_uuid and q.composite_key=t.composite_key))) then found_id:=null;
  elsif hits=0 and ticket_count>0 then rejection:='AMBIGUOUS_TRANSITION'; exit;
  elsif hits=0 then found_id:=null; end if;
  if found_id is null then
   -- Legacy exports without identity may be adopted only by an exact, unique normalized match.
   select count(*),min(record_id::text)::uuid into hits,found_id from public.escaneos_4wall where source_system=r.source_system and plant=r.plant and identity_mode='legacy' and source_record_id is null
   and numero_parte=c.canonical->>6 and cantidad::numeric=(c.canonical->>7)::numeric and area_escaneo=c.canonical->>1;
   if hits>1 then rejection:='AMBIGUOUS_LEGACY'; exit; end if;
  end if;
  if found_id is not null and exists(select 1 from bot_private.run_rows where run_id=run_uuid and resolved_id=found_id) then rejection:='AMBIGUOUS_TRANSITION'; exit; end if;
  if found_id is null and c.raw_record is null or found_id is not null and exists(select 1 from public.escaneos_4wall where record_id=found_id and row_hash is distinct from c.row_hash) and c.raw_record is null then rejection:='RAW_REQUIRED'; exit; end if;
  update bot_private.run_rows set resolved_id=found_id where run_id=run_uuid and position=c.position;
 end loop;
 if rejection is not null then
  update public.bot_runs set rows_seen=n,rows_rejected=n where id=run_uuid;
  perform bot_private.finish_run(run_uuid,'REJECTED',rejection);select to_jsonb(t) into receipt from public.bot_runs t where id=run_uuid;return receipt;
 end if;
 -- After all gates pass, one transaction changes CURRENT and the SUCCESS receipt together.
 for c in select * from bot_private.run_rows where run_id=run_uuid order by position loop
  if c.resolved_id is null then
   insert into public.escaneos_4wall(numero_parte,cantidad,area_escaneo,raw_record,source_columns,source_system,plant,source_record_id,source_identity,composite_key,identity_mode,canonical,row_hash,last_writer,last_run_id)
   values(c.canonical->>6,(c.canonical->>7)::numeric,c.canonical->>1,c.raw_record,c.source_columns,r.source_system,r.plant,c.canonical->>0,c.source_identity,c.composite_key,c.identity_mode,c.canonical,c.row_hash,case when run.trigger like 'MANUAL_%' then 'MANUAL' else 'AUTO' end,run_uuid);
   inserted:=inserted+1;
  else
   select * into old from public.escaneos_4wall where record_id=c.resolved_id;
   -- A partial file cannot prove that the other members of a collision group disappeared.
   if not run.complete and old.identity_mode='composite' then c.source_identity:=old.source_identity; c.identity_mode:='composite'; end if;
   if old.row_hash is distinct from c.row_hash or old.source_identity<>c.source_identity or old.missing_count<>0 then
    if old.last_writer='MANUAL' and run.trigger not like 'MANUAL_%' and old.row_hash is distinct from c.row_hash then insert into public.bot_audit_log(actor_id,runner_id,action,result,run_id) values(uid,rid,'MANUAL_REPLACED_BY_AUTO','APPLIED',run_uuid); end if;
    update public.escaneos_4wall set numero_parte=c.canonical->>6,cantidad=(c.canonical->>7)::numeric,area_escaneo=c.canonical->>1,
    raw_record=coalesce(c.raw_record,raw_record),source_columns=coalesce(c.source_columns,source_columns),source_record_id=c.canonical->>0,source_identity=c.source_identity,composite_key=c.composite_key,
    identity_mode=c.identity_mode,canonical=c.canonical,row_hash=c.row_hash,missing_count=0,last_seen_at=now(),last_writer=case when run.trigger like 'MANUAL_%' then 'MANUAL' else 'AUTO' end,last_run_id=run_uuid where record_id=c.resolved_id;
    if old.row_hash is distinct from c.row_hash then updated:=updated+1; else unchanged:=unchanged+1; end if;
   else unchanged:=unchanged+1; end if;
  end if;
 end loop;
 if run.complete then
  delete from public.escaneos_4wall t where source_system=r.source_system and plant=r.plant and missing_count=1 and not exists(select 1 from bot_private.run_rows q where q.run_id=run_uuid and (q.resolved_id=t.record_id or q.source_identity=t.source_identity));
  get diagnostics removed=row_count;
  update public.escaneos_4wall t set missing_count=1 where source_system=r.source_system and plant=r.plant and missing_count=0 and not exists(select 1 from bot_private.run_rows q where q.run_id=run_uuid and (q.resolved_id=t.record_id or q.source_identity=t.source_identity));
 end if;
 changed:=inserted+updated+removed;
 update public.bot_source_state set generation=generation+1,content_version=content_version+case when changed>0 then 1 else 0 end,
 row_count=(select count(*) from public.escaneos_4wall where source_system=r.source_system and plant=r.plant),complete=complete or run.complete,
 snapshot_hash=calculated_snapshot_hash,last_publication_run_id=run_uuid,last_complete_run_id=case when run.complete then run_uuid else last_complete_run_id end,
 extracted_at=case when run.complete then (p->>'extracted_at')::timestamptz else extracted_at end,published_at=now()
 where source_system=r.source_system and plant=r.plant;
 update public.bot_runs set rows_seen=n,rows_inserted=inserted,rows_updated=updated,rows_unchanged=unchanged,rows_removed=removed,snapshot_hash=calculated_snapshot_hash where id=run_uuid;
 perform bot_private.finish_run(run_uuid,'SUCCESS');
 select to_jsonb(t) into receipt from public.bot_runs t where id=run_uuid;return receipt;
end;
$$;

-- One invoker wrapper is the only exposed control API; privileged implementation is not in an exposed schema.
create function public.bot_api(op text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select bot_private.api(op,p); $$;
revoke all on all functions in schema bot_private from public,anon,authenticated;
grant execute on function bot_private.api(text,jsonb),bot_private.dashboard_allowed() to anon,authenticated;
revoke all on function public.bot_api(text,jsonb) from public;
grant execute on function public.bot_api(text,jsonb) to anon,authenticated;

-- Drop pre-existing permissive policies; add explicit read policies, never direct client writes.
do $$ declare t text; pol record; begin
 foreach t in array array['escaneos_4wall','bot_user_roles','bot_settings','bot_runners','bot_source_state','bot_commands','bot_runs','bot_audit_log','bot_errors','bot_notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',pol.policyname,t); end loop;
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end; $$;
grant select on public.escaneos_4wall,public.bot_source_state,public.bot_notifications to anon,authenticated;
create policy fourwall_read on public.escaneos_4wall for select to anon,authenticated using((select bot_private.dashboard_allowed()));
create policy bot_source_read on public.bot_source_state for select to anon,authenticated using((select bot_private.dashboard_allowed()));
create policy bot_notifications_read on public.bot_notifications for select to anon,authenticated using((select bot_private.dashboard_allowed()));
grant select(id,source_system,plant,enabled,paused,interval_minutes,next_run_at,heartbeat_at,state,version,active_run_id) on public.bot_runners to anon,authenticated;
create policy bot_runner_read on public.bot_runners for select to anon,authenticated using((select bot_private.dashboard_allowed()));
grant select on public.bot_commands to authenticated;
create function bot_private.owns_runner(rid text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.bot_runners where id=rid and auth_user_id=(select auth.uid()) and active); $$;
revoke all on function bot_private.owns_runner(text) from public,anon;
grant execute on function bot_private.owns_runner(text) to authenticated;
create policy bot_command_read on public.bot_commands for select to authenticated using(actor_id=(select auth.uid()) or bot_private.owns_runner(runner_id) or (select bot_private.member_role()) in('operator','admin'));
grant execute on function bot_private.member_role() to authenticated;
revoke all on all tables in schema bot_private from public,anon,authenticated;

-- Future dashboard-login flag also gates existing shared BOM/report access.
-- Restrictive policies preserve all existing BOM-specific policies and default public behavior.
create function bot_private.dashboard_write_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin if not bot_private.dashboard_allowed() then raise exception 'LOGIN_REQUIRED'; end if; return null; end; $$;
revoke all on function bot_private.dashboard_write_guard() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['inventory_bom_current','inventory_bom_backups','inventory_bom_rows','development_feedback'] loop
  if to_regclass('public.'||t) is not null then
   execute format('create policy runner_dashboard_gate on public.%I as restrictive for all to anon,authenticated using ((select bot_private.dashboard_allowed())) with check ((select bot_private.dashboard_allowed()))',t);
   execute format('create trigger runner_dashboard_write_gate before insert or update or delete on public.%I for each statement execute function bot_private.dashboard_write_guard()',t);
  end if;
 end loop;
end; $$;

-- The old destructive RPC is retired even for service_role.
create or replace function public.reemplazar_escaneos(payload jsonb) returns void language plpgsql security invoker set search_path='' as $$ begin raise exception 'RETIRED_USE_BOT_API'; end; $$;
revoke all on function public.reemplazar_escaneos(jsonb) from public,anon,authenticated,service_role;

create function bot_private.cleanup() returns void language plpgsql security definer set search_path='' as $$
declare stale record;
begin
 for stale in select t.id from public.bot_runs t join public.bot_runners r on r.active_run_id=t.id where t.status in ('RUNNING','RETRYING') and r.run_lease_until<now() for update of r skip locked loop perform bot_private.finish_run(stale.id,'INTERRUPTED','STALE_RUN'); end loop;
 update public.bot_runners set state='OFFLINE' where heartbeat_at<now()-interval '45 seconds' and state<>'OFFLINE';
 update public.bot_commands set status='EXPIRED',finished_at=now() where status='PENDING' and expires_at<now();
 delete from public.bot_commands where created_at<now()-interval '90 days' and id not in(select command_id from public.bot_runs where command_id is not null);
 delete from public.bot_audit_log where occurred_at<now()-interval '90 days';
 delete from public.bot_runs where started_at<now()-interval '90 days' and status not in ('RUNNING','RETRYING');
end;
$$;
revoke all on function bot_private.cleanup() from public,anon,authenticated;
-- pg_cron is optional locally; activation must enable it if absent. Never modify realtime's internal schema.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then execute $sql$select cron.schedule('fourwall-retention','*/5 * * * *','select bot_private.cleanup()')$sql$; end if;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  execute 'alter publication supabase_realtime add table public.bot_commands,public.bot_source_state,public.bot_notifications';
 end if;
end; $$;
-- Server notification worker only. No browser or runner can claim delivery jobs.
create function public.bot_notification_delivery(op text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if op='claim' then
  update bot_private.notification_outbox set status='FAILED' where status in ('PENDING','SENDING') and first_attempt_at<now()-interval '23 hours';
  with picked as (select id from bot_private.notification_outbox where (status='PENDING' or status='SENDING' and lease_until<now()) and attempts<5 order by created_at limit 10 for update skip locked),
  claimed as (update bot_private.notification_outbox o set status='SENDING',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '10 minutes' from picked where o.id=picked.id returning o.*)
  select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'run_id',o.run_id,'runner_id',o.runner_id,'attempt',o.attempts,'occurred_at',r.finished_at,'last_valid_at',o.last_valid_at)),'[]'::jsonb) into result from claimed o join public.bot_runs r on r.id=o.run_id join public.bot_runners b on b.id=o.runner_id join public.bot_source_state s on s.source_system=b.source_system and s.plant=b.plant;
  return result;
 elsif op='ack' then
  update bot_private.notification_outbox set status=case when (p->>'sent')::boolean then 'SENT' when attempts>=5 then 'FAILED' else 'PENDING' end,sent_at=case when (p->>'sent')::boolean then now() end,lease_until=null
  where id=(p->>'id')::uuid and status='SENDING' and attempts=(p->>'attempt')::integer;
  return jsonb_build_object('status','ACK');
 end if;
 raise exception 'INVALID_DELIVERY_OPERATION';
end;
$$;
revoke all on function public.bot_notification_delivery(text,jsonb) from public,anon,authenticated;
grant execute on function public.bot_notification_delivery(text,jsonb) to service_role;
commit;
