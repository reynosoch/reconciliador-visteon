import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();

await db.exec(`
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid()
returns uuid
language sql
as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
`);

await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20261001135247_inventory_bom_public_sync_and_feedback.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);

await db.exec("set role anon");

assert.equal(
  (await db.query("select revision from public.inventory_bom_current")).rows[0]
    .revision,
  0,
);
await assert.rejects(
  db.query("update public.inventory_bom_current set revision = 99"),
  /permission denied/,
);

await db.query(
  "insert into public.development_feedback(opportunity) values ('Prueba de reporte')",
);
await assert.rejects(
  db.query("select * from public.development_feedback"),
  /permission denied/,
);

await assert.rejects(
  db.query("select public.save_inventory_bom(0, '{}')"),
  /Invalid BOM library/,
);

const value = JSON.stringify({
  rows: [{ "Parent Item": "A", Component: "B", Level: ".2", "Comp Phantom": "no", Usage: 2 }],
  files: [],
});

assert.equal(
  (await db.query("select public.save_inventory_bom(0, $1) as saved", [value]))
    .rows[0].saved,
  true,
);

assert.equal(
  (await db.query("select public.save_inventory_bom(0, $1) as saved", [value]))
    .rows[0].saved,
  false,
);

assert.equal(
  (await db.query("select public.save_inventory_bom(1, $1) as saved", [value]))
    .rows[0].saved,
  true,
);

await assert.rejects(
  db.query(
    "insert into public.inventory_bom_backups(revision, library) values (77, '{\"rows\":[],\"files\":[]}'::jsonb)",
  ),
  /permission denied/,
);

await db.exec("reset role");

assert.equal(
  (await db.query("select count(*)::int as count from public.inventory_bom_backups"))
    .rows[0].count,
  1,
);

assert.equal(
  (await db.query("select count(*)::int as count from public.development_feedback"))
    .rows[0].count,
  1,
);

await db.exec("set role authenticated");
assert.equal(
  (await db.query("select revision from public.inventory_bom_current")).rows[0]
    .revision,
  1,
);
await assert.rejects(
  db.query("delete from public.inventory_bom_current"),
  /permission denied/,
);

await db.close();

console.log(
  "Supabase SQL OK (local Postgres): no-login BOM read/sync, validated RPC, immutable history and insert-only reports",
);
