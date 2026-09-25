# Inventory reconciler: access review

The browser reads `escaneos_4wall` using `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. These values are public in a deployed Vite bundle.
Never put a service key or a 4Wall password in a `VITE_` variable.

The bot requires `WALL_USER`, `WALL_PASS`, `SUPABASE_URL` and
`SUPABASE_SERVICE_KEY` in its **server environment**. The bot intentionally
stops at startup if any value is absent. Configure them on the bot host, not
in Git or in the browser. Rotate the 4Wall password that appeared in Git
history. Removing it from the current file cannot revoke an exposed password.

The old `inventario.db` was removed from the current tree because it contains
internal 4Wall scans. Copies remain in previous public commits; coordinate
history removal and data handling with the data owner.

## Read-only SQL for a Supabase administrator

Run this in the Supabase SQL Editor before allowing production access. It
inspects the **actual** function signature, grants, RLS state, and policies;
it does not modify or call the destructive RPC.

```sql
select p.oid::regprocedure as function_signature,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'reemplazar_escaneos';

select c.oid::regclass as table_name, c.relrowsecurity as rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_can_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') as anon_can_update,
       has_table_privilege('anon', c.oid, 'DELETE') as anon_can_delete
from pg_class c
where c.oid = 'public.escaneos_4wall'::regclass;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'escaneos_4wall';
```

Before production, verify that `anon` and `authenticated` cannot execute
`reemplazar_escaneos`, including through the `PUBLIC` grant. Grant execution
only to the bot's server role. Verify that RLS is enabled and anonymous table
access is restricted to the intended read policy. These are database changes;
removing credentials from Python does not change existing PostgreSQL grants.
