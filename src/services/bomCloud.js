import { createClient } from "@supabase/supabase-js";
import { mergeBomLibrary } from "../domain/bomLibrary.js";
const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const bomClient = url && key ? createClient(url, key, { global: { fetch: (input, init = {}) => fetch(input, { ...init, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }) } }) : null;
export function combineLibraries(remote, local) {
  const merged = mergeBomLibrary(remote, local.rows, "Respaldo local", "local-merge");
  const files = [...new Map([...remote.files, ...local.files].map(file => [file.fingerprint, file])).values()];
  return { rows: merged.rows, files };
}
function cloudError(error) {
  if (error?.code === "PGRST205" || error?.code === "42P01" || error?.code === "PGRST202")
    return new Error("Falta activar el respaldo BOM en Supabase. Tu copia local sigue guardada.");
  return new Error("No se pudo guardar el respaldo compartido. Revisa tu conexión y el acceso de tu cuenta. Tu copia local sigue guardada.");
}
export async function syncBomLibrary(local) {
  if (!bomClient) throw new Error("Falta configurar la conexión a Supabase. Tu copia local sigue guardada.");
  const { data: { session }, error: sessionError } = await bomClient.auth.getSession();
  if (sessionError || !session) throw new Error("Inicia sesión para respaldar y consultar los BOM compartidos.");
  if (session.user.app_metadata?.inventory_access !== true) throw new Error("Tu cuenta necesita acceso al respaldo de inventario. Solicítalo al administrador del proyecto.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await bomClient.from("inventory_bom_current").select("revision,library").eq("id", true).single();
    if (error) throw cloudError(error);
    const merged = combineLibraries(data.library, local);
    if (JSON.stringify(merged) === JSON.stringify(data.library)) return merged;
    const saved = await bomClient.rpc("save_inventory_bom", { expected_revision: data.revision, next_library: merged });
    if (saved.error) throw cloudError(saved.error);
    if (saved.data === true) return merged;
  }
  throw new Error("Otra computadora está agregando BOM. Reintenta; tu copia local sigue guardada.");
}
