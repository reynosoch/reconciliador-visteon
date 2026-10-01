import { createClient } from "@supabase/supabase-js";
import { mergeBomLibrary } from "../domain/bomLibrary.js";

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const bomClient =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init = {}) =>
            fetch(input, {
              ...init,
              signal: init.signal
                ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
                : AbortSignal.timeout(20000),
            }),
        },
      })
    : null;

const emptyLibrary = () => ({ rows: [], files: [] });

export function combineLibraries(remote = emptyLibrary(), local = emptyLibrary()) {
  const safeRemote = {
    rows: Array.isArray(remote?.rows) ? remote.rows : [],
    files: Array.isArray(remote?.files) ? remote.files : [],
  };
  const safeLocal = {
    rows: Array.isArray(local?.rows) ? local.rows : [],
    files: Array.isArray(local?.files) ? local.files : [],
  };

  const merged = mergeBomLibrary(
    safeRemote,
    safeLocal.rows,
    "Respaldo local",
    "local-merge",
  );

  const files = [
    ...new Map(
      [...safeRemote.files, ...safeLocal.files]
        .filter((file) => file?.fingerprint)
        .map((file) => [file.fingerprint, file]),
    ).values(),
  ];

  return { rows: merged.rows, files };
}

function cloudError(error) {
  if (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    error?.code === "PGRST202"
  ) {
    return new Error(
      "El respaldo BOM todavía no está habilitado en Supabase. La copia local sigue guardada.",
    );
  }
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403) {
    return new Error(
      "Supabase rechazó el acceso al respaldo BOM. Revisa las políticas del proyecto.",
    );
  }
  return new Error(
    "No se pudo sincronizar el respaldo BOM. La copia local sigue guardada.",
  );
}

export async function syncBomLibrary(local = emptyLibrary()) {
  if (!bomClient) {
    throw new Error(
      "Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. La copia local sigue guardada.",
    );
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await bomClient
      .from("inventory_bom_current")
      .select("revision,library")
      .eq("id", true)
      .single();

    if (error) throw cloudError(error);

    const remote = data?.library ?? emptyLibrary();
    const merged = combineLibraries(remote, local);

    if (JSON.stringify(merged) === JSON.stringify(remote)) {
      return { ...merged, revision: data.revision, changed: false };
    }

    const saved = await bomClient.rpc("save_inventory_bom", {
      expected_revision: data.revision,
      next_library: merged,
    });

    if (saved.error) throw cloudError(saved.error);
    if (saved.data === true) {
      return {
        ...merged,
        revision: Number(data.revision || 0) + 1,
        changed: true,
      };
    }
  }

  throw new Error(
    "Otra computadora actualizó BOM al mismo tiempo. Reintenta; tu copia local sigue guardada.",
  );
}
