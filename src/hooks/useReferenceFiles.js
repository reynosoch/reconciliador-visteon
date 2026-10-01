import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseDelimitedFile } from "../parsers/parseDelimitedFile.js";
import { mergeBomLibrary } from "../domain/bomLibrary.js";
import { idbGet, idbSet } from "../services/browserStorage.js";
import { syncBomLibrary } from "../services/bomCloud.js";
import { downloadBomWorkbook } from "../services/exportBomWorkbook.js";
const BOM_KEY = "reference:bom-library.v1";
const empty = () => ({
  rows: [],
  fields: [],
  fileName: "",
  fingerprint: "",
  loaded: false,
  loading: false,
  error: null,
  warnings: [],
});
const initial = () =>
  Object.fromEntries(
    ["areas", "qad", "ispbb", "bom", "cost", "scans"].map((k) => [k, empty()]),
  );
export const REFERENCE_SOURCE_TYPES = {
  AREAS: "areas",
  QAD: "qad",
  ISPBB: "ispbb",
  BOM: "bom",
  COST: "cost",
  SCANS: "scans",
};
export const REFERENCE_SOURCE_LABELS = {
  areas: "Áreas 4Wall",
  qad: "Inventario QAD",
  ispbb: "ISPBB / Phantoms",
  bom: "BOM",
  cost: "Cost Part",
  scans: "Escaneos 4Wall",
};
const REQUIRED = {
  areas: [["Nombre"], ["Localidad QAD"]],
  qad: [
    ["Item Number"],
    ["Site"],
    ["Location"],
    ["Quantity On Hand"],
    ["Item Type"],
  ],
  ispbb: [["Item Number"], ["Site"], ["Phantom"]],
  bom: [["Parent Item"], ["Component"], ["Usage"], ["Level"], ["Comp Phantom"]],
  cost: [["Item Number"], ["Cost Total"], ["Status"]],
  scans: [
    ["Número Parte QAD", "Numero Parte QAD", "numero_parte", "Numero de parte"],
    ["Quantity", "cantidad"],
    ["AreaName", "area_escaneo"],
  ],
};
async function parseReferenceFile(type, file) {
  if (type !== 'bom' || !file.name.toLowerCase().endsWith('.json')) return parseDelimitedFile(file, { requiredFields: REQUIRED[type] });
  const value=JSON.parse(await file.text());
  if (!Array.isArray(value.rows) || value.rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('El respaldo BOM no tiene un formato válido.');
  const fields=[...new Set(value.rows.flatMap(row => Object.keys(row)))];
  return {rows:value.rows,fields,fileName:file.name,delimiter:'backup',errors:[],warnings:[],duplicateHeaders:[]};
}
async function fingerprint(file) {
  const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function bomSource(library) {
  return {
    ...empty(),
    loaded: true,
    rows: library.rows,
    files: library.files,
    fileName: library.files.length ? library.files.map((file) => file.fileName).join(", ") : "",
    fingerprint:
      library.files
        .map((f) => f.fingerprint)
        .sort()
        .join(":") || "bom-empty-v1",
    fields: Object.keys(library.rows[0] ?? {}),
    loadedAt: new Date(),
  };
}
export function useReferenceFiles() {
  const [sources, setSources] = useState(initial);
  const [cloudStatus, setCloudStatus] = useState({ state: "pending", message: "BOM guardados en esta computadora; respaldo compartido pendiente." });
  const library = useRef({ rows: [], files: [] }),
    queue = useRef(Promise.resolve()),
    mounted = useRef(false);
  const syncCloud = useCallback(() => {
    const operation = queue.current.then(async () => {
      setCloudStatus(s => ({ ...s, state: "syncing", message: "Comparando y respaldando BOM…" }));
      try {
        const local = await idbGet(BOM_KEY, { rows: [], files: [] });
        if (!local.ok) throw new Error("No se pudo abrir la copia local. Reintenta antes de respaldar.");
        const merged = await syncBomLibrary(local.value);
        const changed = bomSource(merged).fingerprint !== bomSource(library.current).fingerprint;
        const saved = changed ? await idbSet(BOM_KEY, merged) : { ok: true };
        if (!saved.ok) throw new Error("El respaldo compartido está guardado, pero no pudimos actualizar la copia local.");
        library.current = merged;
        if (mounted.current) {
          if (changed) setSources(s => ({ ...s, bom: bomSource(merged) }));
          setCloudStatus(s => ({ ...s, state: "saved", message: "BOM comparados y respaldados en Supabase." }));
        }
      } catch (error) {
        if (mounted.current) setCloudStatus(s => ({ ...s, state: "pending", message: error.message }));
      }
    });
    queue.current = operation.catch(() => {});
    return operation;
  }, []);
  useEffect(() => {
    mounted.current = true;
    queue.current = queue.current.then(async () => {
      const result = await idbGet(BOM_KEY, { rows: [], files: [] });
      if (!mounted.current) return;
      if (!result.ok) {
        setSources((s) => ({
          ...s,
          bom: {
            ...s.bom,
            error: new Error(
              "No pudimos abrir los BOM guardados. Recarga antes de agregar archivos.",
            ),
          },
        }));
        return;
      }
      library.current = result.value;
      setSources((s) => ({ ...s, bom: bomSource(result.value) }));
    });
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const retry = () => { void syncCloud(); };
    queueMicrotask(retry);
    window.addEventListener("online", retry);
    const timer = window.setInterval(retry, 120000);
    return () => { window.removeEventListener("online", retry); window.clearInterval(timer); };
  }, [syncCloud]);
  const loadFile = useCallback((type, file) => {
    const operation = queue.current.then(async () => {
      if (!REQUIRED[type] || !file)
        throw new Error("Selecciona un archivo y una fuente válida.");
      setSources((s) => ({
        ...s,
        [type]: { ...s[type], loading: true, error: null },
      }));
      try {
        const [parsed, hash] = await Promise.all([
          parseReferenceFile(type, file),
          fingerprint(file),
        ]);
        const missing = REQUIRED[type].filter(
          (g) => !g.some((k) => parsed.fields.includes(k)),
        );
        if (missing.length)
          throw new Error(
            `Faltan columnas: ${missing.map((g) => g.join(" / ")).join(", ")}.`,
          );
        const duplicates = (parsed.duplicateHeaders ?? []).filter((k) =>
          REQUIRED[type].flat().includes(k),
        );
        if (duplicates.length)
          throw new Error(`Columnas repetidas: ${duplicates.join(", ")}.`);
        if (parsed.errors.length)
          throw new Error(
            "No pudimos separar correctamente las columnas. Conservamos el archivo anterior.",
          );
        if (type === "scans") {
          const bad = parsed.rows.some((r) => {
            const q = String(r.Quantity ?? r.cantidad ?? "").trim();
            const pn = String(
              r["Número Parte QAD"] ??
                r["Numero Parte QAD"] ??
                r.numero_parte ??
                r["Numero de parte"] ??
                "",
            ).trim();
            return !pn || !q || !Number.isFinite(Number(q.replace(/,/g, "")));
          });
          if (bad)
            throw new Error(
              "Hay partes vacías o cantidades inválidas en los escaneos. Conservamos el reporte anterior.",
            );
        }
        if (type === "bom") {
          const invalid=parsed.rows.findIndex(r => !String(r['Parent Item']??'').trim() || !String(r.Component??'').trim() ||
            ([".2","0.2","0,2"].includes(String(r.Level??'').trim()) && String(r['Comp Phantom']??'').trim().toLowerCase()==='no' &&
              (!String(r.Usage??'').trim() || !Number.isFinite(Number(String(r.Usage).replace(/,/g,''))) || Number(String(r.Usage).replace(/,/g,''))<0)));
          if(invalid>=0) throw new Error(`Fila BOM ${invalid+2}: falta una parte o el Usage no es válido. Conservamos la colección anterior.`);
        }
        let source = {
          ...parsed,
          loaded: true,
          loading: false,
          error: null,
          fingerprint: hash,
          loadedAt: new Date(),
        };
        if (type === "bom") {
          const current = await idbGet(BOM_KEY, { rows: [], files: [] });
          if (!current.ok)
            throw new Error(
              "No pudimos abrir el respaldo BOM. No se modificó.",
            );
          const next = mergeBomLibrary(
            current.value,
            parsed.rows,
            file.name,
            hash,
          );
          const saved = await idbSet(BOM_KEY, next);
          if (!saved.ok)
            throw new Error(
              "No se pudo guardar el BOM. Conservamos la colección anterior; no cierres sin respaldar.",
            );
          library.current = next;
          source = bomSource(next);
          source.delimiter = parsed.delimiter;
          source.warnings = [
            {
              message: next.addedParents
                ? `Se agregaron ${next.addedParents} BOM nuevos.`
                : "Estos BOM ya estaban guardados. No se duplicaron.",
            },
          ];
        }
        setSources((s) => ({ ...s, [type]: source }));
        return source;
      } catch (error) {
        setSources((s) => ({
          ...s,
          [type]: { ...s[type], loading: false, error },
        }));
        throw error;
      }
    });
    queue.current = operation.catch(() => {});
    if (type === "bom") void operation.then(() => syncCloud(), () => {});
    return operation;
  }, [syncCloud]);
  const clearFile = useCallback((type) => {
    if (type === "bom") return;
    setSources((s) => ({ ...s, [type]: empty() }));
  }, []);
  const backupBom = useCallback(
    () => downloadBomWorkbook(library.current),
    [],
  );
  const status = useMemo(() => {
    const entries = Object.entries(sources).filter(([k]) => k !== "scans");
    const required = entries.filter(([k]) => k !== "bom");
    return {
      totalSources: 5,
      loadedCount: entries.filter(([, s]) => s.loaded).length,
      loadingCount: Object.values(sources).filter((s) => s.loading).length,
      errorCount: Object.values(sources).filter((s) => s.error).length,
      hasErrors: Object.values(sources).some((s) => s.error),
      allLoaded: required.every(([, s]) => s.loaded),
      missingSources: required.filter(([, s]) => !s.loaded).map(([k]) => k),
    };
  }, [sources]);
  return {
    sources,
    status,
    areaRows: sources.areas.rows,
    qadRows: sources.qad.rows,
    ispbbRows: sources.ispbb.rows,
    bomRows: sources.bom.rows,
    costRows: sources.cost.rows,
    manualScans: sources.scans.loaded ? sources.scans : null,
    loadFile,
    clearFile,
    backupBom,
    cloudStatus,
    syncCloud,
  };
}
