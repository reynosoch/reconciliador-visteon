import { createClient } from "@supabase/supabase-js";
import { mergeBomLibrary } from "../domain/bomLibrary.js";
const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const bomClient = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init = {}) => fetch(input, { ...init, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }) },
}) : null;
const metadata = ({ rows, ...file }) => ({ ...file, rowCount: file.rowCount ?? rows?.length ?? 0 });
export function combineLibraries(remote, local) {
  const merged = mergeBomLibrary(remote, local.rows, "Respaldo local", "local-merge");
  const files = [...new Map([...remote.files, ...local.files].map(file => [file.fingerprint, metadata(file)])).values()];
  return { rows: merged.rows, files };
}
export function newBomPayload(remote, local) {
  // Run the same conflict check as local imports before sending anything.
  const merged = combineLibraries(remote, local);
  const parents = new Set(remote.rows.map(row => String(row["Parent Item"]).trim().toUpperCase()));
  const rows = local.rows.filter(row => !parents.has(String(row["Parent Item"]).trim().toUpperCase()));
  const names = new Set(rows.map(row => row.__sourceFile));
  return { merged, incoming: { rows, files: local.files.filter(file => names.has(file.fileName)).map(metadata) } };
}
function cloudError(error) {
  if (error?.code === "PGRST205" || error?.code === "42P01" || error?.code === "PGRST202")
    return new Error("Falta activar el respaldo BOM en este proyecto Supabase. Tu copia local sigue guardada.");
  if (error?.message?.includes("BOM conflict"))
    return new Error("Otra computadora guardó una versión distinta de este BOM. Conservamos tu copia local; revisa qué versión usar.");
  return new Error("No se pudo guardar el respaldo compartido. Revisa la conexión y los permisos de Supabase. Tu copia local sigue guardada.");
}
export async function removeBomFileFromCloud(fingerprint, client = bomClient) {
  if (!client) throw new Error("Falta configurar la conexión a Supabase. No se borró el BOM.");
  if (!fingerprint) throw new Error("No se encontró la huella del archivo BOM. No se borró nada.");

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await client
      .from("inventory_bom_current")
      .select("revision,library")
      .eq("id", true)
      .single();
    if (error) throw cloudError(error);

    const file = (data.library?.files || []).find((item) => item?.fingerprint === fingerprint);
    if (!file) return data.library;

    const removed = await client.rpc("remove_inventory_bom", {
      expected_revision: data.revision,
      target_fingerprint: fingerprint,
    });
    if (removed.error) {
      if (removed.error?.code === "PGRST202" || removed.error?.message?.includes("remove_inventory_bom")) {
        throw new Error("Falta activar el borrado BOM en Supabase. No se borró la copia local ni la compartida.");
      }
      throw cloudError(removed.error);
    }

    if (removed.data?.status === "stale") continue;

    if (["deleted", "not_found"].includes(removed.data?.status)) {
      const refreshed = await client
        .from("inventory_bom_current")
        .select("library")
        .eq("id", true)
        .single();
      if (refreshed.error) throw cloudError(refreshed.error);
      return refreshed.data.library;
    }
  }

  throw new Error("Otra computadora cambió los BOM mientras intentabas borrar. No se borró nada; vuelve a intentarlo.");
}

export async function syncBomLibrary(local, client = bomClient) {
  if (!client) throw new Error("Falta configurar la conexión a Supabase. Tu copia local sigue guardada.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await client.from("inventory_bom_current").select("revision,library").eq("id", true).single();
    if (error) throw cloudError(error);
    const { merged, incoming } = newBomPayload(data.library, local);
    if (!incoming.rows.length) return merged;
    const saved = await client.rpc("merge_inventory_bom", { expected_revision: data.revision, incoming_library: incoming });
    if (saved.error) throw cloudError(saved.error);
    if (saved.data === true) return merged;
  }
  throw new Error("Otra computadora está agregando BOM. Reintenta; tu copia local sigue guardada.");
}
